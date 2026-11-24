import type { Article } from '@faixa-certa/shared';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { Link } from 'react-router';
import { PageHeader } from '@/components/page-header';
import { StatusBadge } from '@/components/status';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useMessages } from '@/i18n';
import { api, errorMessage, unwrap } from '@/lib/api';
import { keys, useCategoryOptions } from '@/lib/queries';
import { formatDateTime } from '@/lib/utils';

export function ArticlesPage() {
  const m = useMessages();
  const categories = useCategoryOptions();
  const list = useQuery({
    queryKey: keys.articles,
    queryFn: async () =>
      unwrap<{ items: Article[] }>(
        await api.GET('/v1/admin/articles', { params: { query: { limit: 100 } } }),
      ),
  });

  // Agrupa por seção (história, etiqueta, regras…).
  const groups = new Map<string, Article[]>();
  for (const a of list.data?.items ?? []) {
    groups.set(a.categoryId, [...(groups.get(a.categoryId) ?? []), a]);
  }
  const label = (id: string) => categories.options.find((c) => c.id === id)?.label ?? '—';

  return (
    <>
      <PageHeader
        title={m.articles.title}
        subtitle={m.articles.subtitle}
        actions={
          <Button asChild>
            <Link to="/textos/novo">
              <Plus aria-hidden /> {m.articles.new}
            </Link>
          </Button>
        }
      />
      {list.isLoading && <Skeleton className="h-40" />}
      {list.isError && <p className="text-destructive">{errorMessage(list.error)}</p>}
      {!list.isLoading && groups.size === 0 && (
        <p className="text-muted-foreground">{m.common.noResults}</p>
      )}
      <div className="max-w-3xl space-y-6">
        {[...groups.entries()].map(([categoryId, articles]) => (
          <section key={categoryId} aria-label={label(categoryId)}>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {label(categoryId)}
            </h2>
            <ul className="divide-y rounded-lg border bg-card">
              {articles.map((a) => (
                <li key={a.id}>
                  <Link
                    to={`/textos/${a.id}`}
                    className="flex items-center gap-3 p-3 hover:bg-accent/40"
                  >
                    <span className="flex-1 font-medium">{a.title}</span>
                    <span className="hidden text-xs text-muted-foreground sm:inline">
                      {formatDateTime(a.updatedAt)}
                    </span>
                    <StatusBadge status={a.status} />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
