import type {
  AuthTokens,
  Me,
  ProfileUpdateInput,
  RegisterInput,
  SyncState,
} from '@faixa-certa/shared';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQueryClient } from '@tanstack/react-query';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState, Platform } from 'react-native';
import { api, refreshSession, session, unwrap } from './http';
import { usePrefs } from './prefs';

const ME_CACHE_KEY = 'faixacerta:me';
const DEVICE = `App ${Platform.OS === 'ios' ? 'iOS' : 'Android'}`;
const SYNC_DEBOUNCE_MS = 1500;

type Status = 'loading' | 'signedOut' | 'signedIn';

interface AuthContextValue {
  status: Status;
  user: Me | null;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  register: (input: Omit<RegisterInput, 'deviceName'>) => Promise<void>;
  /** Devolve false se o usuário cancelou a janela da Apple. */
  signInWithApple: () => Promise<boolean>;
  signOut: () => Promise<void>;
  updateProfile: (input: ProfileUpdateInput) => Promise<void>;
  deleteAccount: () => Promise<void>;
  syncNow: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Sessão do aluno e sincronização do progresso. Fica dentro do PrefsProvider:
 * ao entrar, junta o que já estava no aparelho com o que está na conta.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const prefs = usePrefs();
  const qc = useQueryClient();
  const [status, setStatus] = useState<Status>('loading');
  const [user, setUser] = useState<Me | null>(null);
  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;
  const syncing = useRef<Promise<void> | null>(null);

  const rememberUser = useCallback((me: Me | null) => {
    setUser(me);
    if (me) AsyncStorage.setItem(ME_CACHE_KEY, JSON.stringify(me)).catch(() => undefined);
    else AsyncStorage.removeItem(ME_CACHE_KEY).catch(() => undefined);
  }, []);

  /** Envia o progresso local e aplica o estado da conta. */
  const syncNow = useCallback(async () => {
    if (!session.accessToken && !(await session.refreshToken())) return;
    syncing.current ??= (async () => {
      try {
        const { input, takenAt } = prefsRef.current.snapshot();
        const state = await unwrap<SyncState>(api.POST('/v1/me/sync', { body: input }));
        prefsRef.current.applyServer(state, takenAt);
      } catch {
        /* sem rede: tenta de novo na próxima mudança ou ao voltar para o app */
      } finally {
        syncing.current = null;
      }
    })();
    return syncing.current;
  }, []);

  /** Depois do login: decide a faixa (conta x aparelho) e sincroniza. */
  const afterSignIn = useCallback(
    async (tokens: AuthTokens) => {
      await session.set(tokens);
      const me = tokens.user;
      const p = prefsRef.current;
      if (me.currentBeltId) {
        prefsRef.current.adoptBelt(me.programId, me.currentBeltId);
        rememberUser(me);
      } else if (p.currentBeltId) {
        const updated = await unwrap<Me>(
          api.PATCH('/v1/me', {
            body: { programId: p.programId, currentBeltId: p.currentBeltId },
          }),
        ).catch(() => me);
        rememberUser(updated);
      } else {
        rememberUser(me);
      }
      setStatus('signedIn');
      await syncNow();
    },
    [rememberUser, syncNow],
  );

  // Restaura a sessão ao abrir o app.
  useEffect(() => {
    if (!prefs.ready) return;
    (async () => {
      const token = await session.refreshToken();
      if (!token) {
        setStatus('signedOut');
        return;
      }
      const tokens = await refreshSession();
      if (tokens) {
        rememberUser(tokens.user);
        if (tokens.user.currentBeltId) {
          prefsRef.current.adoptBelt(tokens.user.programId, tokens.user.currentBeltId);
        }
        setStatus('signedIn');
        void syncNow();
        return;
      }
      // Sem rede: segue logado com os dados do último acesso, se o token ainda existe.
      const cached = await AsyncStorage.getItem(ME_CACHE_KEY).catch(() => null);
      if (cached && (await session.refreshToken())) {
        setUser(JSON.parse(cached) as Me);
        setStatus('signedIn');
      } else {
        setStatus('signedOut');
      }
    })();
  }, [prefs.ready, rememberUser, syncNow]);

  // Sessão encerrada por fora (refresh recusado).
  useEffect(
    () =>
      session.subscribe((tokens) => {
        if (!tokens) {
          setStatus('signedOut');
          setUser(null);
        }
      }),
    [],
  );

  // Sincroniza depois de mudanças locais (com espera) e ao voltar para o app.
  useEffect(() => {
    if (status !== 'signedIn' || !prefs.dirty) return;
    const timer = setTimeout(() => void syncNow(), SYNC_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [status, prefs.revision, prefs.dirty, syncNow]);

  useEffect(() => {
    if (status !== 'signedIn') return;
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void syncNow();
    });
    return () => sub.remove();
  }, [status, syncNow]);

  // Troca de faixa no aparelho vai para a conta (a faixa vinda da conta já é igual e não reenvia).
  useEffect(() => {
    if (status !== 'signedIn' || !user || !prefs.currentBeltId) return;
    if (user.currentBeltId === prefs.currentBeltId) return;
    unwrap<Me>(
      api.PATCH('/v1/me', {
        body: { programId: prefs.programId, currentBeltId: prefs.currentBeltId },
      }),
    )
      .then(rememberUser)
      .catch(() => undefined);
  }, [status, user, prefs.currentBeltId, prefs.programId, rememberUser]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      syncNow,
      signInWithEmail: async (email, password) => {
        const tokens = await unwrap<AuthTokens>(
          api.POST('/v1/auth/login', { body: { email, password, deviceName: DEVICE } }),
        );
        await afterSignIn(tokens);
      },
      register: async (input) => {
        const tokens = await unwrap<AuthTokens>(
          api.POST('/v1/auth/register', { body: { ...input, deviceName: DEVICE } }),
        );
        await afterSignIn(tokens);
      },
      signInWithApple: async () => {
        // O token da Apple traz o SHA-256 do nonce; a API confere com o texto puro.
        const nonce = Crypto.randomUUID();
        const hashed = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, nonce);
        let credential: AppleAuthentication.AppleAuthenticationCredential;
        try {
          credential = await AppleAuthentication.signInAsync({
            requestedScopes: [
              AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
              AppleAuthentication.AppleAuthenticationScope.EMAIL,
            ],
            nonce: hashed,
          });
        } catch (e) {
          if ((e as { code?: string }).code === 'ERR_REQUEST_CANCELED') return false;
          throw e;
        }
        if (!credential.identityToken) throw new Error('A Apple não devolveu o token.');
        const fullName = [credential.fullName?.givenName, credential.fullName?.familyName]
          .filter(Boolean)
          .join(' ');
        const tokens = await unwrap<AuthTokens>(
          api.POST('/v1/auth/apple', {
            body: {
              identityToken: credential.identityToken,
              nonce,
              fullName: fullName || undefined,
              deviceName: DEVICE,
            },
          }),
        );
        await afterSignIn(tokens);
        return true;
      },
      signOut: async () => {
        await syncNow();
        const token = await session.refreshToken();
        if (token) {
          await api
            .POST('/v1/auth/logout', { body: { refreshToken: token } })
            .catch(() => undefined);
        }
        await session.clear();
        prefsRef.current.clearSynced();
        rememberUser(null);
        qc.removeQueries({ queryKey: ['me'] });
        setStatus('signedOut');
      },
      updateProfile: async (input) => {
        rememberUser(await unwrap<Me>(api.PATCH('/v1/me', { body: input })));
      },
      deleteAccount: async () => {
        await unwrap<void>(api.POST('/v1/me/delete', { body: { confirm: 'EXCLUIR' } }));
        await session.clear();
        prefsRef.current.clearSynced();
        rememberUser(null);
        qc.removeQueries({ queryKey: ['me'] });
        setStatus('signedOut');
      },
    }),
    [status, user, syncNow, afterSignIn, rememberUser, qc],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth fora do AuthProvider');
  return ctx;
}

/** Login com Apple só existe no iOS. */
export function useAppleAvailable(): boolean {
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    AppleAuthentication.isAvailableAsync()
      .then(setAvailable)
      .catch(() => setAvailable(false));
  }, []);
  return available;
}
