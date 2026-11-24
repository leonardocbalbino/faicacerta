import type { ContentVersionSummary } from '@faixa-certa/shared';
import { useMutation, useQuery } from '@tanstack/react-query';
import { History, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmAction } from '@/components/confirm-button';
import { StatusBadge } from '@/components/status';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { fmt, useMessages } from '@/i18n';
import { errorMessage } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';

/** Linha do tempo de versões com restauração. */
export function VersionHistory({
  queryKey,
  load,
  restore,
  onRestored,
}: {
  queryKey: unknown[];
  load: () => Promise<ContentVersionSummary[]>;
  restore: (version: number) => Promise<unknown>;
  onRestored: () => void;
}) {
  const m = useMessages();
  const versions = useQuery({ queryKey, queryFn: load });
  const mutation = useMutation({
    mutationFn: restore,
    onSuccess: (_d, v) => {
      toast.success(fmt(m.versions.restored, { n: v }));
      onRestored();
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  if (versions.isLoading) return <Skeleton className="h-40" />;
  if (!versions.data?.length)
    return <p className="text-sm text-muted-foreground">{m.versions.empty}</p>;

  const [latest] = versions.data;
  return (
    <ol className="relative space-y-4 border-l pl-6" aria-label={m.versions.title}>
      {versions.data.map((v) => (
        <li key={v.version} className="relative">
          <span
            className="absolute -left-[31px] top-1 flex size-4 items-center justify-center rounded-full border bg-background"
            aria-hidden
          >
            <History className="size-2.5 text-muted-foreground" />
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{fmt(m.versions.version, { n: v.version })}</span>
            <StatusBadge status={v.status} />
            <span className="text-xs text-muted-foreground">
              {formatDateTime(v.createdAt)} ·{' '}
              {fmt(m.versions.by, { name: v.author?.name ?? m.versions.system })}
            </span>
            {v.version !== latest?.version && (
              <ConfirmAction
                destructive={false}
                title={fmt(m.versions.restoreTitle, { n: v.version })}
                description={m.versions.restoreBody}
                confirmLabel={m.versions.restore}
                onConfirm={() => mutation.mutate(v.version)}
                trigger={
                  <Button variant="ghost" size="sm" disabled={mutation.isPending}>
                    <RotateCcw aria-hidden /> {m.versions.restore}
                  </Button>
                }
              />
            )}
          </div>
          {v.comment && <p className="mt-1 text-sm text-muted-foreground">{v.comment}</p>}
        </li>
      ))}
    </ol>
  );
}
