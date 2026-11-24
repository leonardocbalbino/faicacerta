import createClient, { type ClientOptions, type Middleware } from 'openapi-fetch';
import type { paths } from './schema.js';

export type { components, paths } from './schema.js';

export interface ApiClientOptions extends ClientOptions {
  /** Devolve o access token atual (ou undefined para chamadas anônimas). */
  getAccessToken?: () => string | undefined | Promise<string | undefined>;
}

/**
 * Cliente tipado da API, gerado a partir do OpenAPI (`pnpm api:openapi`).
 * Usado pelo app mobile e pelo painel web.
 *
 * @example
 * const api = createApiClient({ baseUrl: 'https://api.faixacerta.app', getAccessToken });
 * const { data, error } = await api.POST('/v1/auth/login', { body: { email, password } });
 */
export function createApiClient({ getAccessToken, ...options }: ApiClientOptions) {
  const client = createClient<paths>(options);
  if (getAccessToken) {
    const auth: Middleware = {
      async onRequest({ request }) {
        const token = await getAccessToken();
        if (token) request.headers.set('Authorization', `Bearer ${token}`);
        return request;
      },
    };
    client.use(auth);
  }
  return client;
}

export type ApiClient = ReturnType<typeof createApiClient>;
