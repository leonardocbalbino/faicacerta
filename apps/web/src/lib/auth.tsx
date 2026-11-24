import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Role, type AuthTokens, type Me } from '@faixa-certa/shared';
import { api, refreshSession, session, unwrap } from './api';

type Status = 'loading' | 'anonymous' | 'authenticated';

interface AuthContextValue {
  status: Status;
  user: Me | null;
  isStaff: boolean;
  login(email: string, password: string): Promise<Me>;
  logout(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [user, setUser] = useState<Me | null>(null);

  useEffect(() => {
    // A sessão pode cair a qualquer momento (refresh recusado).
    const unsubscribe = session.subscribe((tokens) => {
      setUser(tokens?.user ?? null);
      setStatus(tokens ? 'authenticated' : 'anonymous');
    });
    void refreshSession().then((tokens) => {
      if (!tokens) setStatus('anonymous');
    });
    return () => {
      unsubscribe();
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const tokens = unwrap<AuthTokens>(
      await api.POST('/v1/auth/login', { body: { email, password, deviceName: 'Painel web' } }),
    );
    session.set(tokens);
    return tokens.user;
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = session.refreshToken;
    if (refreshToken) {
      await api.POST('/v1/auth/logout', { body: { refreshToken } }).catch(() => undefined);
    }
    session.clear();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      isStaff: !!user?.roles.some((r) => r === Role.ADMIN || r === Role.CONTENT_EDITOR),
      login,
      logout,
    }),
    [status, user, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth fora do AuthProvider');
  return ctx;
}
