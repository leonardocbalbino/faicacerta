import type {
  CatalogBeltDetail,
  CatalogCategory,
  CatalogGlossaryTerm,
  CatalogProgram,
  CatalogSearchResult,
  CatalogTechnique,
} from '@faixa-certa/shared';
import { createApiClient } from '@faixa-certa/shared/api';
import { keepPreviousData, useQuery } from '@tanstack/react-query';

/** Em desenvolvimento, aponte para a API local com EXPO_PUBLIC_API_URL (ex.: http://192.168.0.10:3000). */
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://app-faixacerta.com.br';

export const api = createApiClient({ baseUrl: API_URL });

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Converte a resposta do openapi-fetch em valor ou erro (para o React Query). */
async function unwrap<T>(
  call: Promise<{ data?: unknown; error?: unknown; response: Response }>,
): Promise<T> {
  const { data, error, response } = await call;
  if (error !== undefined || data === undefined) {
    const detail =
      error && typeof error === 'object' && 'detail' in error ? String(error.detail) : undefined;
    throw new ApiError(response.status, detail ?? `Erro ${response.status}`);
  }
  return data as T;
}

const HOUR = 60 * 60 * 1000;

export function usePrograms() {
  return useQuery({
    queryKey: ['catalog', 'programs'],
    queryFn: () => unwrap<CatalogProgram[]>(api.GET('/v1/catalog/programs')),
    staleTime: HOUR,
  });
}

export function useBelt(id: string | undefined) {
  return useQuery({
    queryKey: ['catalog', 'belt', id],
    queryFn: () =>
      unwrap<CatalogBeltDetail>(
        api.GET('/v1/catalog/belts/{id}', { params: { path: { id: id ?? '' } } }),
      ),
    enabled: Boolean(id),
    staleTime: 10 * 60 * 1000,
  });
}

export function useTechnique(slug: string | undefined) {
  return useQuery({
    queryKey: ['catalog', 'technique', slug],
    queryFn: () =>
      unwrap<CatalogTechnique>(
        api.GET('/v1/catalog/techniques/{slugOrId}', {
          params: { path: { slugOrId: slug ?? '' } },
        }),
      ),
    enabled: Boolean(slug),
    // As URLs assinadas de mídia expiram; recarrega com folga.
    staleTime: 5 * 60 * 1000,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ['catalog', 'categories'],
    queryFn: () => unwrap<CatalogCategory[]>(api.GET('/v1/catalog/categories')),
    staleTime: HOUR,
  });
}

export function useGlossary(q: string, categoryId: string | undefined) {
  const query = q.trim();
  return useQuery({
    queryKey: ['catalog', 'glossary', query, categoryId],
    queryFn: () =>
      unwrap<CatalogGlossaryTerm[]>(
        api.GET('/v1/catalog/glossary', {
          params: { query: { q: query || undefined, categoryId } },
        }),
      ),
    placeholderData: keepPreviousData,
    staleTime: 10 * 60 * 1000,
  });
}

export function useSearch(q: string) {
  const query = q.trim();
  return useQuery({
    queryKey: ['catalog', 'search', query],
    queryFn: () =>
      unwrap<CatalogSearchResult>(
        api.GET('/v1/catalog/search', { params: { query: { q: query } } }),
      ),
    enabled: query.length >= 2,
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
  });
}
