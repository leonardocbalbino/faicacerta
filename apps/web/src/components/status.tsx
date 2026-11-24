import { allowedTransitions, type MediaStatus, type PublicationStatus } from '@faixa-certa/shared';
import { useMutation } from '@tanstack/react-query';
import { ChevronDown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { fmt, useMessages } from '@/i18n';
import { errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';

const STATUS_STYLE: Record<PublicationStatus, string> = {
  DRAFT: 'bg-accent text-accent-foreground border-transparent',
  REVIEW: 'bg-transparent text-warning border-warning/50',
  PUBLISHED: 'bg-brand text-brand-foreground border-transparent',
  ARCHIVED: 'bg-transparent text-muted-foreground border-border line-through',
};

export function StatusBadge({ status }: { status: PublicationStatus }) {
  const m = useMessages();
  return (
    <Badge variant="outline" className={cn('px-2.5 font-semibold', STATUS_STYLE[status])}>
      {m.status[status]}
    </Badge>
  );
}

const MEDIA_STATUS_STYLE: Record<MediaStatus, string> = {
  PENDING_UPLOAD: 'bg-muted text-muted-foreground',
  UPLOADED: 'bg-accent text-accent-foreground',
  PROCESSING: 'bg-accent text-accent-foreground',
  READY: 'bg-success/15 text-success',
  FAILED: 'bg-destructive/15 text-destructive',
};

export function MediaStatusBadge({ status }: { status: MediaStatus }) {
  const m = useMessages();
  const busy = status === 'UPLOADED' || status === 'PROCESSING';
  return (
    <Badge variant="outline" className={cn('gap-1 border-transparent', MEDIA_STATUS_STYLE[status])}>
      {busy && <Loader2 className="size-3 animate-spin" aria-hidden />}
      {m.media.status[status]}
    </Badge>
  );
}

/**
 * Botão com as transições válidas do fluxo de publicação para o usuário atual
 * (a regra vem do `shared`, a mesma que a API aplica).
 */
export function StatusActions({
  status,
  onChange,
}: {
  status: PublicationStatus;
  onChange: (next: PublicationStatus) => Promise<unknown>;
}) {
  const m = useMessages();
  const { user } = useAuth();
  const options = allowedTransitions(status, user?.roles ?? []);
  const mutation = useMutation({
    mutationFn: onChange,
    onSuccess: (_d, next) => toast.success(fmt(m.statusChanged, { status: m.status[next] })),
    onError: (err) => toast.error(errorMessage(err)),
  });

  if (!options.length) return null;
  const primary = options.includes('PUBLISHED')
    ? 'PUBLISHED'
    : options.includes('REVIEW')
      ? 'REVIEW'
      : options[0]!;
  const others = options.filter((o) => o !== primary);

  return (
    <div className="flex">
      <Button
        onClick={() => mutation.mutate(primary)}
        disabled={mutation.isPending}
        className={cn(others.length && 'rounded-r-none')}
      >
        {mutation.isPending && <Loader2 className="animate-spin" aria-hidden />}
        {m.statusAction[primary]}
      </Button>
      {others.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="default"
              className="rounded-l-none border-l border-primary-foreground/20 px-2"
              aria-label={m.common.actions}
              disabled={mutation.isPending}
            >
              <ChevronDown aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {others.map((o) => (
              <DropdownMenuItem key={o} onSelect={() => mutation.mutate(o)}>
                {m.statusAction[o]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
