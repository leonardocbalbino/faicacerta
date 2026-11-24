import type { Media, MediaType } from '@faixa-certa/shared';
import { ImagePlus, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { MediaStatusBadge } from '@/components/status';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMessages } from '@/i18n';
import { MediaThumb } from './media-thumb';
import { UploadDropzone } from './upload-dropzone';
import { useInvalidateMedia, useMediaLibrary } from './use-media';

/** Diálogo para escolher uma mídia da biblioteca ou enviar uma nova. */
export function MediaPickerDialog({
  accept,
  onPick,
  trigger,
}: {
  accept: MediaType[];
  onPick: (media: Media) => void;
  trigger: ReactNode;
}) {
  const m = useMessages();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('library');
  const type = accept.length === 1 ? accept[0] : undefined;
  const library = useMediaLibrary(type);
  const invalidate = useInvalidateMedia();
  const items = (library.data?.pages.flatMap((p) => p.items) ?? []).filter((i) =>
    accept.includes(i.type),
  );

  const pick = (media: Media) => {
    onPick(media);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{m.media.choose}</DialogTitle>
          <DialogDescription>{accept.map((t) => m.media.type[t]).join(' · ')}</DialogDescription>
        </DialogHeader>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="library">{m.media.title}</TabsTrigger>
            <TabsTrigger value="upload">{m.media.upload}</TabsTrigger>
          </TabsList>
          <TabsContent value="library">
            <ScrollArea className="h-[420px] pr-3">
              {items.length === 0 && !library.isLoading && (
                <p className="py-10 text-center text-sm text-muted-foreground">{m.media.empty}</p>
              )}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {items.map((media) => (
                  <button
                    key={media.id}
                    type="button"
                    onClick={() => pick(media)}
                    className="space-y-1 rounded-md p-1 text-left hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <MediaThumb media={media} />
                    <MediaStatusBadge status={media.status} />
                  </button>
                ))}
              </div>
              {library.hasNextPage && (
                <div className="mt-3 text-center">
                  <Button variant="outline" onClick={() => library.fetchNextPage()}>
                    {m.common.loadMore}
                  </Button>
                </div>
              )}
            </ScrollArea>
          </TabsContent>
          <TabsContent value="upload">
            <UploadDropzone
              accept={accept}
              multiple={false}
              onUploaded={(media) => {
                void invalidate();
                pick(media);
              }}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

/** Campo de formulário que guarda uma mídia (ex.: áudio da pronúncia, capa). */
export function MediaField({
  value,
  accept,
  onChange,
  label,
}: {
  value: Media | null;
  accept: MediaType[];
  onChange: (media: Media | null) => void;
  label: string;
}) {
  const m = useMessages();
  return (
    <div className="flex items-center gap-3">
      {value ? (
        <>
          {value.type === 'AUDIO' && value.urls.display ? (
            <audio controls src={value.urls.display} className="h-10" aria-label={label} />
          ) : (
            <MediaThumb media={value} className="w-32" />
          )}
          <MediaStatusBadge status={value.status} />
        </>
      ) : (
        <span className="text-sm text-muted-foreground">{m.common.none}</span>
      )}
      <MediaPickerDialog
        accept={accept}
        onPick={onChange}
        trigger={
          <Button type="button" variant="outline" size="sm">
            <ImagePlus aria-hidden /> {value ? m.media.change : m.media.choose}
          </Button>
        }
      />
      {value && (
        <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
          <X aria-hidden /> {m.media.clear}
        </Button>
      )}
    </div>
  );
}
