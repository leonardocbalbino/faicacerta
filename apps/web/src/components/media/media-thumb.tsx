import type { Media } from '@faixa-certa/shared';
import { AlertTriangle, FileText, Film, ImageIcon, Loader2, Music } from 'lucide-react';
import { useMessages } from '@/i18n';
import { cn, formatDuration } from '@/lib/utils';

const ICON = { VIDEO: Film, IMAGE: ImageIcon, AUDIO: Music, DOCUMENT: FileText };

/** Miniatura com o estado do processamento. */
export function MediaThumb({ media, className }: { media: Media; className?: string }) {
  const m = useMessages();
  const Icon = ICON[media.type];
  const busy = media.status === 'UPLOADED' || media.status === 'PROCESSING';
  const thumb = media.urls.thumb;

  return (
    <div
      className={cn(
        'relative flex aspect-video items-center justify-center overflow-hidden rounded-md bg-muted text-muted-foreground',
        className,
      )}
    >
      {thumb ? (
        <img src={thumb} alt="" className="size-full object-cover" loading="lazy" />
      ) : (
        <Icon className="size-8" aria-hidden />
      )}
      {busy && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/70">
          <Loader2 className="size-6 animate-spin" aria-label={m.media.status.PROCESSING} />
        </div>
      )}
      {media.status === 'FAILED' && (
        <div className="absolute inset-0 flex items-center justify-center bg-destructive/15 text-destructive">
          <AlertTriangle className="size-6" aria-label={m.media.error} />
        </div>
      )}
      {media.durationMs && media.type === 'VIDEO' && (
        <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1.5 text-xs text-white">
          {formatDuration(media.durationMs)}
        </span>
      )}
    </div>
  );
}
