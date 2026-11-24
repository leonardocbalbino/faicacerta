import type {
  CatalogBeltDetail,
  CatalogCategory,
  CatalogGlossaryTerm,
  CatalogProgram,
  CatalogSearchResult,
  CatalogTechnique,
  CatalogTechniqueItem,
  TimelineEvent,
  TimelineEventInput,
} from '@faixa-certa/shared';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from './http';

export { API_URL, ApiError, errorMessage } from './http';

const HOUR = 60 * 60 * 1000;

// -----------------------------------------------------------------------------
// Catálogo (público)
// -----------------------------------------------------------------------------

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

/** Técnicas por id (lista de favoritas). */
export function useTechniquesById(ids: string[]) {
  const key = [...ids].sort().join(',');
  return useQuery({
    queryKey: ['catalog', 'techniques', key],
    queryFn: () =>
      unwrap<CatalogTechniqueItem[]>(
        api.GET('/v1/catalog/techniques', { params: { query: { ids: key } } }),
      ),
    enabled: ids.length > 0,
    placeholderData: keepPreviousData,
    staleTime: 10 * 60 * 1000,
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

// -----------------------------------------------------------------------------
// Linha do tempo (logado)
// -----------------------------------------------------------------------------

const TIMELINE_KEY = ['me', 'timeline'] as const;

export function useTimeline(enabled: boolean) {
  return useQuery({
    queryKey: TIMELINE_KEY,
    queryFn: () => unwrap<TimelineEvent[]>(api.GET('/v1/me/timeline')),
    enabled,
  });
}

export function useSaveTimelineEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: TimelineEventInput }) =>
      id
        ? unwrap<TimelineEvent>(
            api.PATCH('/v1/me/timeline/{id}', { params: { path: { id } }, body: input }),
          )
        : unwrap<TimelineEvent>(api.POST('/v1/me/timeline', { body: input })),
    onSuccess: () => qc.invalidateQueries({ queryKey: TIMELINE_KEY }),
  });
}

export function useDeleteTimelineEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      unwrap<void>(api.DELETE('/v1/me/timeline/{id}', { params: { path: { id } } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: TIMELINE_KEY }),
  });
}
