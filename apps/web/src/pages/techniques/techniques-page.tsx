import type { PublicationStatus, TechniquePage } from '@faixa-certa/shared';
import { PUBLICATION_STATUSES } from '@faixa-certa/shared';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Plus, Search, Swords } from 'lucide-react';
import { useDeferredValue, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { PageHeader } from '@/components/page-header';
import { StatusBadge } from '@/components/status';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { fmt, useMessages } from '@/i18n';
import { api, errorMessage, unwrap } from '@/lib/api';
import { keys, useCategoryOptions } from '@/lib/queries';
import { formatDateTime } from '@/lib/utils';

const ALL = '__all__';

export function TechniquesPage() {
  const m = useMessages();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<string>(ALL);
  const [categoryId, setCategoryId] = useState<string>(ALL);
  const query = useDeferredValue(q);
  const categories = useCategoryOptions();

  const list = useInfiniteQuery({
    queryKey: [...keys.techniques, 'list', query, status, categoryId],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) =>
      unwrap<TechniquePage>(
        await api.GET('/v1/admin/techniques', {
          params: {
            query: {
              q: query || undefined,
              status: status === ALL ? undefined : (status as PublicationStatus),
              categoryId: categoryId === ALL ? undefined : categoryId,
              cursor: pageParam,
              limit: 30,
            },
          },
        }),
      ),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
  const items = list.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <>
      <PageHeader
        title={m.techniques.title}
        subtitle={m.techniques.subtitle}
        actions={
          <Button asChild>
            <Link to="/tecnicas/nova">
              <Plus aria-hidden /> {m.techniques.new}
            </Link>
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2" role="search">
        <div className="relative min-w-60 flex-1">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" aria-hidden />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={m.techniques.searchPlaceholder}
            aria-label={m.common.search}
            className="pl-8"
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-44" aria-label={m.common.status}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{m.common.all}</SelectItem>
            {PUBLICATION_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {m.status[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={categoryId} onValueChange={setCategoryId}>
          <SelectTrigger className="w-64" aria-label={m.techniques.category}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{m.techniques.allCategories}</SelectItem>
            {categories.options.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {list.isError && <p className="text-destructive">{errorMessage(list.error)}</p>}

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20" />
              <TableHead>{m.techniques.japaneseName}</TableHead>
              <TableHead className="hidden md:table-cell">{m.techniques.category}</TableHead>
              <TableHead>{m.common.status}</TableHead>
              <TableHead className="hidden lg:table-cell">{m.common.updatedAt}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.isLoading &&
              Array.from({ length: 6 }, (_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={5}>
                    <Skeleton className="h-10" />
                  </TableCell>
                </TableRow>
              ))}
            {!list.isLoading && items.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  {m.common.noResults}
                </TableCell>
              </TableRow>
            )}
            {items.map((t) => (
              <TableRow
                key={t.id}
                className="cursor-pointer"
                onClick={() => void navigate(`/tecnicas/${t.id}`)}
              >
                <TableCell>
                  {t.thumbUrl ? (
                    <img
                      src={t.thumbUrl}
                      alt=""
                      className="h-10 w-16 rounded object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-10 w-16 items-center justify-center rounded bg-muted">
                      <Swords className="size-4 text-muted-foreground" aria-hidden />
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <Link
                    to={`/tecnicas/${t.id}`}
                    className="font-medium hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {t.japaneseName}
                  </Link>
                  {t.japaneseScript && (
                    <span className="ml-2 text-muted-foreground">{t.japaneseScript}</span>
                  )}
                  <div className="text-sm text-muted-foreground">{t.translation}</div>
                </TableCell>
                <TableCell className="hidden md:table-cell">{t.category.name}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={t.status} />
                    <span className="text-xs text-muted-foreground">
                      {fmt(m.techniques.version, { n: t.version })}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                  {formatDateTime(t.updatedAt)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {list.hasNextPage && (
        <div className="mt-4 text-center">
          <Button
            variant="outline"
            onClick={() => list.fetchNextPage()}
            disabled={list.isFetchingNextPage}
          >
            {m.common.loadMore}
          </Button>
        </div>
      )}
    </>
  );
}
