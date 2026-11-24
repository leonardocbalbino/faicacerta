import type { ProgressStatus, SyncInput, SyncState } from '@faixa-certa/shared';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

/**
 * Preferências e progresso do aluno, guardados no aparelho. Sem login, ficam só
 * aqui; com login, são sincronizados com a API (last-write-wins por item, pelo
 * horário `at` de cada mudança).
 */
interface StoredPrefs {
  programId: string | null;
  /** Faixa que o aluno tem hoje (a apostila mostra a próxima). */
  currentBeltId: string | null;
  /** Quando a faixa mudou neste aparelho (para decidir com a do servidor). */
  beltAt: string | null;
  onboarded: boolean;
  progress: Record<string, { status: ProgressStatus; at: string }>;
  favorites: Record<string, { on: boolean; at: string }>;
  /** Há mudanças ainda não enviadas ao servidor. */
  dirty: boolean;
}

const KEY = 'faixacerta:prefs:v2';
const LEGACY_KEY = 'faixacerta:prefs:v1';
const EMPTY: StoredPrefs = {
  programId: null,
  currentBeltId: null,
  beltAt: null,
  onboarded: false,
  progress: {},
  favorites: {},
  dirty: false,
};

const now = () => new Date().toISOString();

/** v1 guardava só listas de ids (sem horário). */
function migrateV1(raw: string): StoredPrefs {
  const v1 = JSON.parse(raw) as {
    programId?: string | null;
    currentBeltId?: string | null;
    onboarded?: boolean;
    mastered?: string[];
    seen?: string[];
  };
  const at = now();
  const progress: StoredPrefs['progress'] = {};
  for (const id of v1.seen ?? []) progress[id] = { status: 'STUDYING', at };
  for (const id of v1.mastered ?? []) progress[id] = { status: 'MASTERED', at };
  return {
    ...EMPTY,
    programId: v1.programId ?? null,
    currentBeltId: v1.currentBeltId ?? null,
    beltAt: v1.currentBeltId ? at : null,
    onboarded: Boolean(v1.onboarded),
    progress,
    dirty: Object.keys(progress).length > 0,
  };
}

interface PrefsContextValue {
  ready: boolean;
  programId: string | null;
  currentBeltId: string | null;
  beltAt: string | null;
  onboarded: boolean;
  dirty: boolean;
  /** Muda a cada alteração local (gatilho da sincronização). */
  revision: number;
  favoriteIds: string[];
  masteredIds: string[];
  isMastered: (techniqueId: string) => boolean;
  isSeen: (techniqueId: string) => boolean;
  isFavorite: (techniqueId: string) => boolean;
  chooseBelt: (programId: string, beltId: string) => void;
  toggleMastered: (techniqueId: string) => void;
  markSeen: (techniqueId: string) => void;
  toggleFavorite: (techniqueId: string) => void;
  /** Para a sincronização: o que enviar e o horário do retrato. */
  snapshot: () => { input: SyncInput; takenAt: string };
  /** Aplica o estado do servidor, preservando mudanças locais feitas depois do retrato. */
  applyServer: (state: SyncState, takenAt: string) => void;
  /** Adota a faixa salva na conta (outro aparelho). */
  adoptBelt: (programId: string | null, beltId: string | null) => void;
  /** Ao sair da conta: apaga progresso e favoritos sincronizados deste aparelho. */
  clearSynced: () => void;
}

const PrefsContext = createContext<PrefsContextValue | null>(null);

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<StoredPrefs>(EMPTY);
  const [ready, setReady] = useState(false);
  const [revision, setRevision] = useState(0);
  const latest = useRef(prefs);
  latest.current = prefs;

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        if (raw) {
          setPrefs({ ...EMPTY, ...(JSON.parse(raw) as Partial<StoredPrefs>) });
          return;
        }
        const legacy = await AsyncStorage.getItem(LEGACY_KEY);
        if (legacy) {
          const migrated = migrateV1(legacy);
          setPrefs(migrated);
          await AsyncStorage.setItem(KEY, JSON.stringify(migrated));
          await AsyncStorage.removeItem(LEGACY_KEY);
        }
      } catch {
        /* armazenamento indisponível: começa vazio */
      } finally {
        setReady(true);
      }
    })();
  }, []);

  /** `local` = mudança feita pelo usuário (marca para sincronizar). */
  const update = useCallback((fn: (p: StoredPrefs) => StoredPrefs, local = true) => {
    setPrefs((prev) => {
      const next = fn(prev);
      if (next === prev) return prev;
      const stored = local ? { ...next, dirty: true } : next;
      AsyncStorage.setItem(KEY, JSON.stringify(stored)).catch(() => undefined);
      return stored;
    });
    if (local) setRevision((r) => r + 1);
  }, []);

  const value = useMemo<PrefsContextValue>(() => {
    const { progress, favorites } = prefs;
    return {
      ready,
      revision,
      programId: prefs.programId,
      currentBeltId: prefs.currentBeltId,
      beltAt: prefs.beltAt,
      onboarded: prefs.onboarded,
      dirty: prefs.dirty,
      favoriteIds: Object.entries(favorites)
        .filter(([, f]) => f.on)
        .sort((a, b) => (a[1].at < b[1].at ? 1 : -1))
        .map(([id]) => id),
      masteredIds: Object.entries(progress)
        .filter(([, p]) => p.status === 'MASTERED')
        .map(([id]) => id),
      isMastered: (id) => progress[id]?.status === 'MASTERED',
      isSeen: (id) => progress[id] !== undefined && progress[id].status !== 'NOT_STARTED',
      isFavorite: (id) => favorites[id]?.on === true,
      chooseBelt: (programId, beltId) =>
        update((p) => ({ ...p, programId, currentBeltId: beltId, beltAt: now(), onboarded: true })),
      toggleMastered: (id) =>
        update((p) => ({
          ...p,
          progress: {
            ...p.progress,
            [id]: {
              status: p.progress[id]?.status === 'MASTERED' ? 'STUDYING' : 'MASTERED',
              at: now(),
            },
          },
        })),
      markSeen: (id) => {
        const current = latest.current.progress[id];
        if (current && current.status !== 'NOT_STARTED') return;
        update((p) => ({
          ...p,
          progress: { ...p.progress, [id]: { status: 'STUDYING', at: now() } },
        }));
      },
      toggleFavorite: (id) =>
        update((p) => ({
          ...p,
          favorites: { ...p.favorites, [id]: { on: !p.favorites[id]?.on, at: now() } },
        })),
      snapshot: () => {
        const p = latest.current;
        return {
          takenAt: now(),
          input: {
            progress: Object.entries(p.progress).map(([techniqueId, v]) => ({
              techniqueId,
              status: v.status,
              updatedAt: v.at,
            })),
            favorites: Object.entries(p.favorites).map(([techniqueId, v]) => ({
              techniqueId,
              favorite: v.on,
              updatedAt: v.at,
            })),
          },
        };
      },
      applyServer: (state, takenAt) =>
        update((p) => {
          const nextProgress: StoredPrefs['progress'] = {};
          for (const s of state.progress)
            nextProgress[s.techniqueId] = { status: s.status, at: s.updatedAt };
          const nextFavorites: StoredPrefs['favorites'] = {};
          for (const f of state.favorites)
            nextFavorites[f.techniqueId] = { on: true, at: f.updatedAt };
          // Mudanças feitas enquanto a sincronização estava no ar continuam valendo.
          let pending = false;
          for (const [id, v] of Object.entries(p.progress)) {
            if (v.at > takenAt) {
              nextProgress[id] = v;
              pending = true;
            }
          }
          for (const [id, v] of Object.entries(p.favorites)) {
            if (v.at > takenAt) {
              nextFavorites[id] = v;
              pending = true;
            }
          }
          return { ...p, progress: nextProgress, favorites: nextFavorites, dirty: pending };
        }, false),
      adoptBelt: (programId, beltId) =>
        update(
          (p) => ({
            ...p,
            programId: programId ?? p.programId,
            currentBeltId: beltId ?? p.currentBeltId,
            onboarded: p.onboarded || Boolean(beltId),
          }),
          false,
        ),
      clearSynced: () =>
        update((p) => ({ ...p, progress: {}, favorites: {}, dirty: false }), false),
    };
  }, [prefs, ready, revision, update]);

  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}

export function usePrefs(): PrefsContextValue {
  const ctx = useContext(PrefsContext);
  if (!ctx) throw new Error('usePrefs fora do PrefsProvider');
  return ctx;
}
