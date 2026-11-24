import type { Media, MediaPage, MediaType } from '@faixa-certa/shared';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from '@/lib/api';

const isBusy = (m: Media) => m.status === 'UPLOADED' || m.status === 'PROCESSING';

/**
 * Biblioteca de mídia paginada. Enquanto houver mídia em processamento,
 * atualiza a cada 3 s para mostrar o status em tempo real.
 */
export function useMediaLibrary(type?: MediaType) {
  return useInfiniteQuery({
    queryKey: ['media', 'library', type ?? 'all'],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) =>
      unwrap<MediaPage>(
        await api.GET('/v1/admin/media', {
          params: { query: { type, cursor: pageParam, limit: 24 } },
        }),
      ),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    refetchInterval: (query) =>
      query.state.data?.pages.some((p) => p.items.some(isBusy)) ? 3000 : false,
  });
}

export function useInvalidateMedia() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['media'] });
}
