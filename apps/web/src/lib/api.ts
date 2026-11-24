import { t, type AuthTokens, type MessageKey, type ProblemDetails } from '@faixa-certa/shared';
import { createApiClient } from '@faixa-certa/shared/api';

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? '';
const REFRESH_KEY = 'fc.refreshToken';

type Listener = (tokens: AuthTokens | null) => void;

/**
 * Sessão do painel. O access token fica só em memória; o refresh token fica
 * no localStorage para sobreviver ao recarregamento da página.
 */
class Session {
  private accessToken: string | null = null;
  private listeners = new Set<Listener>();

  get access(): string | null {
    return this.accessToken;
  }

  get refreshToken(): string | null {
    try {
      return localStorage.getItem(REFRESH_KEY);
    } catch {
      return null;
    }
  }

  set(tokens: AuthTokens): void {
    this.accessToken = tokens.accessToken;
    try {
      localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
    } catch {
      /* navegação privada: a sessão vale só nesta aba */
    }
    this.listeners.forEach((l) => l(tokens));
  }

  clear(): void {
    this.accessToken = null;
    try {
      localStorage.removeItem(REFRESH_KEY);
    } catch {
      /* ignora */
    }
    this.listeners.forEach((l) => l(null));
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export const session = new Session();

let refreshing: Promise<AuthTokens | null> | null = null;

/** Troca o refresh token por um novo par. Várias chamadas simultâneas compartilham a mesma troca. */
export function refreshSession(): Promise<AuthTokens | null> {
  const token = session.refreshToken;
  if (!token) return Promise.resolve(null);
  refreshing ??= (async () => {
    try {
      const res = await fetch(`${BASE_URL}/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: token }),
      });
      if (!res.ok) {
        session.clear();
        return null;
      }
      const tokens = (await res.json()) as AuthTokens;
      session.set(tokens);
      return tokens;
    } catch {
      return null;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

function withAuth(request: Request): Request {
  const req = new Request(request);
  if (session.access) req.headers.set('Authorization', `Bearer ${session.access}`);
  return req;
}

/** fetch com token e uma nova tentativa após renovar a sessão em caso de 401. */
async function authFetch(request: Request): Promise<Response> {
  const retry = request.clone();
  const res = await fetch(withAuth(request));
  const isAuthRoute = new URL(request.url, location.origin).pathname.startsWith('/v1/auth/');
  if (res.status !== 401 || isAuthRoute || !session.refreshToken) return res;
  const tokens = await refreshSession();
  return tokens ? fetch(withAuth(retry)) : res;
}

export const api = createApiClient({ baseUrl: BASE_URL, fetch: authFetch });

/** Erro da API no formato RFC 7807. */
export class ApiError extends Error {
  constructor(
    public readonly problem: ProblemDetails,
    public readonly status: number,
  ) {
    super(problem.detail ?? problem.title);
  }

  fieldErrors(): Record<string, string> {
    return Object.fromEntries((this.problem.errors ?? []).map((e) => [e.path, e.message]));
  }
}

/** Extrai o `data` de uma resposta do openapi-fetch ou lança `ApiError`. */
export function unwrap<T>(result: { data?: unknown; error?: unknown; response: Response }): T {
  if (result.error !== undefined || !result.response.ok) {
    const problem = (result.error ?? {}) as Partial<ProblemDetails>;
    throw new ApiError(
      {
        type: problem.type ?? 'about:blank',
        title: problem.title ?? 'Erro',
        status: result.response.status,
        code: problem.code ?? 'errors.internal',
        detail: problem.detail ?? t('errors.internal'),
        errors: problem.errors,
      },
      result.response.status,
    );
  }
  return result.data as T;
}

/** Mensagem amigável para qualquer erro. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const key = error.problem.code as MessageKey;
    return error.problem.detail ?? t(key);
  }
  if (error instanceof TypeError) return 'Sem conexão com o servidor. Verifique sua internet.';
  return t('errors.internal');
}
