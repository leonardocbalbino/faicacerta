import type { AuthTokens, ProblemDetails } from '@faixa-certa/shared';
import { createApiClient } from '@faixa-certa/shared/api';
import * as SecureStore from 'expo-secure-store';

/** Em desenvolvimento, aponte para a API local com EXPO_PUBLIC_API_URL (ex.: http://192.168.0.10:3000). */
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://app-faixacerta.com.br';

const REFRESH_KEY = 'faixacerta.refreshToken';

type Listener = (tokens: AuthTokens | null) => void;

/**
 * Sessão do app: o access token (15 min) fica só em memória; o refresh token
 * fica no chaveiro do aparelho (Keychain / Keystore) via SecureStore.
 */
class Session {
  private access: string | null = null;
  private listeners = new Set<Listener>();

  get accessToken(): string | null {
    return this.access;
  }

  async refreshToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(REFRESH_KEY);
    } catch {
      return null;
    }
  }

  async set(tokens: AuthTokens): Promise<void> {
    this.access = tokens.accessToken;
    await SecureStore.setItemAsync(REFRESH_KEY, tokens.refreshToken).catch(() => undefined);
    this.listeners.forEach((l) => l(tokens));
  }

  async clear(): Promise<void> {
    this.access = null;
    await SecureStore.deleteItemAsync(REFRESH_KEY).catch(() => undefined);
    this.listeners.forEach((l) => l(null));
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export const session = new Session();

let refreshing: Promise<AuthTokens | null> | null = null;

/** Troca o refresh token por um novo par. Chamadas simultâneas compartilham a mesma troca. */
export function refreshSession(): Promise<AuthTokens | null> {
  refreshing ??= (async () => {
    try {
      const token = await session.refreshToken();
      if (!token) return null;
      const res = await fetch(`${API_URL}/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: token }),
      });
      if (res.status === 401 || res.status === 400) {
        await session.clear();
        return null;
      }
      if (!res.ok) return null; // erro de rede/servidor: mantém o token para tentar depois
      const tokens = (await res.json()) as AuthTokens;
      await session.set(tokens);
      return tokens;
    } catch {
      return null;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

/**
 * fetch com o access token. Num 401, renova a sessão uma vez e repete a
 * chamada (o corpo é clonado antes, porque um Request só pode ser lido uma vez).
 */
function withToken(req: Request, token: string | null): Request {
  if (token) req.headers.set('Authorization', `Bearer ${token}`);
  return req;
}

async function authFetch(input: Request): Promise<Response> {
  const retry = input.clone();
  const res = await fetch(withToken(input, session.accessToken));
  if (res.status !== 401 || !(await session.refreshToken())) return res;
  const tokens = await refreshSession();
  if (!tokens) return res;
  return fetch(withToken(retry, tokens.accessToken));
}

export const api = createApiClient({ baseUrl: API_URL, fetch: authFetch });

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code?: string,
    readonly fields?: { path: string; message: string }[],
  ) {
    super(message);
  }
}

/** Converte a resposta do openapi-fetch em valor ou erro (para o React Query e formulários). */
export async function unwrap<T>(
  call: Promise<{ data?: unknown; error?: unknown; response: Response }>,
): Promise<T> {
  let result: { data?: unknown; error?: unknown; response: Response };
  try {
    result = await call;
  } catch {
    throw new ApiError(0, 'Sem conexão. Confira sua internet e tente de novo.');
  }
  const { data, error, response } = result;
  if (error !== undefined) {
    const p = error as Partial<ProblemDetails>;
    throw new ApiError(
      response.status,
      p.detail ?? p.title ?? `Erro ${response.status}`,
      p.code,
      p.errors,
    );
  }
  // 204 No Content: sem corpo.
  return data as T;
}

/** Mensagem amigável de qualquer erro. */
export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.fields?.[0]?.message ?? err.message;
  return 'Algo deu errado. Tente de novo.';
}
