import type { Category, Program, ProgramDetail } from '@faixa-certa/shared';
import { useQueries, useQuery } from '@tanstack/react-query';
import { api, unwrap } from './api';

export const keys = {
  categories: ['categories'] as const,
  programs: ['programs'] as const,
  program: (id: string) => ['programs', id] as const,
  techniques: ['techniques'] as const,
  technique: (id: string) => ['techniques', id] as const,
  glossary: ['glossary'] as const,
  quiz: ['quiz'] as const,
  articles: ['articles'] as const,
  article: (id: string) => ['articles', id] as const,
};

export function useCategories() {
  return useQuery({
    queryKey: keys.categories,
    queryFn: async () => unwrap<Category[]>(await api.GET('/v1/admin/categories')),
  });
}

/** Categorias com o caminho completo no nome ("Nage-waza › Ashi-waza"), ordenadas. */
export function useCategoryOptions() {
  const q = useCategories();
  const byId = new Map((q.data ?? []).map((c) => [c.id, c]));
  const path = (c: Category): string => {
    const parent = c.parentId ? byId.get(c.parentId) : undefined;
    return parent ? `${path(parent)} › ${c.name}` : c.name;
  };
  const options = (q.data ?? [])
    .map((c) => ({ id: c.id, label: path(c) }))
    .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
  return { ...q, options };
}

export function usePrograms() {
  return useQuery({
    queryKey: keys.programs,
    queryFn: async () => unwrap<Program[]>(await api.GET('/v1/admin/programs')),
  });
}

/** Todas as faixas de todos os programas (para filtros e selects). */
export function useAllBelts() {
  const programs = usePrograms();
  const details = useQueries({
    queries: (programs.data ?? []).map((p) => ({
      queryKey: keys.program(p.id),
      queryFn: async () =>
        unwrap<ProgramDetail>(
          await api.GET('/v1/admin/programs/{id}', { params: { path: { id: p.id } } }),
        ),
    })),
  });
  return details.flatMap((d) =>
    (d.data?.belts ?? []).map((b) => ({ ...b, programName: d.data!.name })),
  );
}

/** "Ō-soto-gari" → "o-soto-gari" */
export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}
