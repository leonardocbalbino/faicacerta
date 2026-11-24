import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

/**
 * Preferências e progresso guardados no aparelho. Sem login (Etapa 5), é aqui
 * que ficam a faixa do aluno e as técnicas que ele marcou como dominadas.
 */
interface StoredPrefs {
  programId: string | null;
  /** Faixa que o aluno tem hoje (a apostila mostra a próxima). */
  currentBeltId: string | null;
  onboarded: boolean;
  mastered: string[];
  /** Técnicas já abertas: viram "Estudando" na apostila. */
  seen: string[];
}

const KEY = 'faixacerta:prefs:v1';
const EMPTY: StoredPrefs = {
  programId: null,
  currentBeltId: null,
  onboarded: false,
  mastered: [],
  seen: [],
};

interface PrefsContextValue extends StoredPrefs {
  ready: boolean;
  isMastered: (techniqueId: string) => boolean;
  isSeen: (techniqueId: string) => boolean;
  chooseBelt: (programId: string, beltId: string) => void;
  toggleMastered: (techniqueId: string) => void;
  markSeen: (techniqueId: string) => void;
}

const PrefsContext = createContext<PrefsContextValue | null>(null);

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<StoredPrefs>(EMPTY);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (raw) setPrefs({ ...EMPTY, ...(JSON.parse(raw) as Partial<StoredPrefs>) });
      })
      .catch(() => undefined)
      .finally(() => setReady(true));
  }, []);

  const update = useCallback((fn: (p: StoredPrefs) => StoredPrefs) => {
    setPrefs((prev) => {
      const next = fn(prev);
      AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => undefined);
      return next;
    });
  }, []);

  const value = useMemo<PrefsContextValue>(() => {
    const mastered = new Set(prefs.mastered);
    const seen = new Set(prefs.seen);
    return {
      ...prefs,
      ready,
      isMastered: (id) => mastered.has(id),
      isSeen: (id) => seen.has(id),
      chooseBelt: (programId, beltId) =>
        update((p) => ({ ...p, programId, currentBeltId: beltId, onboarded: true })),
      toggleMastered: (id) =>
        update((p) => ({
          ...p,
          mastered: p.mastered.includes(id)
            ? p.mastered.filter((m) => m !== id)
            : [...p.mastered, id],
        })),
      markSeen: (id) => update((p) => (p.seen.includes(id) ? p : { ...p, seen: [...p.seen, id] })),
    };
  }, [prefs, ready, update]);

  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}

export function usePrefs(): PrefsContextValue {
  const ctx = useContext(PrefsContext);
  if (!ctx) throw new Error('usePrefs fora do PrefsProvider');
  return ctx;
}
