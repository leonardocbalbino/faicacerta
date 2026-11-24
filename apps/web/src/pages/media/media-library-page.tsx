import type { Media, MediaType } from '@faixa-certa/shared';
import { MEDIA_TYPES } from '@faixa-certa/shared';
import { useMutation } from '@tanstack/react-query';
import { Copy, RefreshCw, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { ConfirmAction } from '@/components/confirm-button';
import { MediaThumb } from '@/components/media/media-thumb';
import { UploadDropzone } from '@/components/media/upload-dropzone';
import { useInvalidateMedia, useMediaLibrary } from '@/components/media/use-media';
import { PageHeader } from '@/components/page-header';
import { MediaStatusBadge } from '@/components/status';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMessages } from '@/i18n';
import { api, errorMessage, unwrap } from '@/lib/api';
import { formatBytes, formatDateTime, formatDuration } from '@/lib/utils';

const ALL = 'ALL';

export function MediaLibraryPage() {
  const m = useMessages();
  const [type, setType] = useState<MediaType | typeof ALL>(ALL);
  const [selected, setSelected] = useState<Media | null>(null);
  const library = useMediaLibrary(type === ALL ? undefined : type);
  const invalidate = useInvalidateMedia();
  const items = library.data?.pages.flatMap((p) => p.items) ?? [];
  // Mantém o painel de detalhes com o status mais recente.
  const current = selected ? (items.find((i) => i.id === selected.id) ?? selected) : null;

  return (
    <>
      <PageHeader title={m.media.title} subtitle={m.media.subtitle} />
      <div className="mb-6 max-w-3xl">
        <UploadDropzone accept={['VIDEO', 'IMAGE', 'AUDIO']} onUploaded={() => void invalidate()} />
      </div>

      <Tabs
        value={type}
        onValueChange={(v) => setType(v as MediaType | typeof ALL)}
        className="mb-4"
      >
        <TabsList>
          <TabsTrigger value={ALL}>{m.common.all}</TabsTrigger>
          {MEDIA_TYPES.filter((t) => t !== 'DOCUMENT').map((t) => (
            <TabsTrigger key={t} value={t}>
              {m.media.type[t]}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {library.isLoading && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 10 }, (_, i) => (
            <Skeleton key={i} className="aspect-video" />
          ))}
        </div>
      )}
      {!library.isLoading && items.length === 0 && (
        <p className="text-muted-foreground">{m.media.empty}</p>
      )}
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {items.map((media) => (
          <li key={media.id}>
            <button
              type="button"
              onClick={() => setSelected(media)}
              className="w-full space-y-1.5 rounded-md p-1 text-left hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring"
            >
              <MediaThumb media={media} />
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs text-muted-foreground">{m.media.type[media.type]}</span>
                <MediaStatusBadge status={media.status} />
              </div>
            </button>
          </li>
        ))}
      </ul>
      {library.hasNextPage && (
        <div className="mt-4 text-center">
          <Button variant="outline" onClick={() => library.fetchNextPage()}>
            {m.common.loadMore}
          </Button>
        </div>
      )}

      <MediaDetails
        media={current}
        onClose={() => setSelected(null)}
        onChanged={() => void invalidate()}
      />
    </>
  );
}

function MediaDetails({
  media,
  onClose,
  onChanged,
}: {
  media: Media | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const m = useMessages();
  const reprocess = useMutation({
    mutationFn: async (id: string) =>
      unwrap<Media>(await api.POST('/v1/admin/media/{id}/reprocess', { params: { path: { id } } })),
    onSuccess: () => {
      toast.success(m.media.reprocessing);
      onChanged();
    },
    onError: (err) => toast.error(errorMessage(err)),
  });
  const remove = useMutation({
    mutationFn: async (id: string) =>
      unwrap(await api.DELETE('/v1/admin/media/{id}', { params: { path: { id } } })),
    onSuccess: () => {
      toast.success(m.common.deleted);
      onChanged();
      onClose();
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  const url = media?.urls.display ?? media?.urls.original;
  const rows: [string, string][] = media
    ? [
        [m.media.size, formatBytes(media.sizeBytes)],
        [m.media.offlineSize, formatBytes(media.offlineSizeBytes)],
        [m.media.duration, formatDuration(media.durationMs)],
        [m.media.dimensions, media.width ? `${media.width} × ${media.height}` : '—'],
        [m.common.updatedAt, formatDateTime(media.updatedAt)],
      ]
    : [];

  return (
    <Sheet open={!!media} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        {media && (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                {m.media.type[media.type]} <MediaStatusBadge status={media.status} />
              </SheetTitle>
            </SheetHeader>
            <div className="space-y-4 px-4 pb-6">
              {media.status === 'READY' && media.type === 'VIDEO' && media.urls.display ? (
                <video
                  controls
                  src={media.urls.display}
                  poster={media.urls.thumb ?? undefined}
                  className="w-full rounded-md bg-black"
                  aria-label={m.media.preview}
                />
              ) : media.status === 'READY' && media.type === 'AUDIO' && media.urls.display ? (
                <audio
                  controls
                  src={media.urls.display}
                  className="w-full"
                  aria-label={m.media.preview}
                />
              ) : (
                <MediaThumb media={media} />
              )}
              {media.processingError && (
                <p
                  role="alert"
                  className="rounded-md bg-destructive/10 p-2 text-sm text-destructive"
                >
                  <strong>{m.media.error}:</strong> {media.processingError}
                </p>
              )}
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                {rows.map(([k, v]) => (
                  <div key={k} className="contents">
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
              <div className="flex flex-wrap gap-2">
                {url && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      void navigator.clipboard
                        .writeText(url)
                        .then(() => toast.success(m.media.linkCopied))
                    }
                  >
                    <Copy aria-hidden /> {m.media.copyLink}
                  </Button>
                )}
                {(media.status === 'FAILED' || media.status === 'READY') && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => reprocess.mutate(media.id)}
                    disabled={reprocess.isPending}
                  >
                    <RefreshCw aria-hidden /> {m.media.reprocess}
                  </Button>
                )}
                <ConfirmAction
                  onConfirm={() => remove.mutate(media.id)}
                  trigger={
                    <Button variant="outline" size="sm" className="text-destructive">
                      <Trash2 aria-hidden /> {m.common.delete}
                    </Button>
                  }
                />
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
