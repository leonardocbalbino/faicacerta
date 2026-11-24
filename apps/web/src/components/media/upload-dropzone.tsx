import type { Media, MediaType } from '@faixa-certa/shared';
import { UploadCloud } from 'lucide-react';
import { useId, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';
import { fmt, useMessages } from '@/i18n';
import { errorMessage } from '@/lib/api';
import { uploadMedia, UploadValidationError } from '@/lib/upload';
import { cn } from '@/lib/utils';

interface Pending {
  id: string;
  name: string;
  progress: number;
}

/** Área de envio com arrastar e soltar e barra de progresso por arquivo. */
export function UploadDropzone({
  accept,
  multiple = true,
  onUploaded,
}: {
  accept?: MediaType[];
  multiple?: boolean;
  onUploaded?: (media: Media) => void;
}) {
  const m = useMessages();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [pending, setPending] = useState<Pending[]>([]);

  const acceptAttr = (accept ?? ['VIDEO', 'IMAGE', 'AUDIO'])
    .map(
      (t) =>
        ({ VIDEO: 'video/*', IMAGE: 'image/*', AUDIO: 'audio/*', DOCUMENT: 'application/pdf' })[t],
    )
    .join(',');

  const send = async (files: File[]) => {
    for (const file of files) {
      const id = `${file.name}-${file.size}-${Date.now()}`;
      setPending((p) => [...p, { id, name: file.name, progress: 0 }]);
      try {
        const media = await uploadMedia(file, {
          accept,
          onProgress: (progress) =>
            setPending((p) => p.map((x) => (x.id === id ? { ...x, progress } : x))),
        });
        toast.success(fmt(m.media.uploaded, { name: file.name }));
        onUploaded?.(media);
      } catch (err) {
        toast.error(err instanceof UploadValidationError ? err.message : errorMessage(err), {
          description: file.name,
        });
      } finally {
        setPending((p) => p.filter((x) => x.id !== id));
      }
    }
  };

  return (
    <div className="space-y-3">
      <label
        htmlFor={inputId}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void send(Array.from(e.dataTransfer.files));
        }}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center transition-colors',
          'hover:border-primary/60 hover:bg-accent/40 focus-within:ring-2 focus-within:ring-ring',
          dragging && 'border-primary bg-accent/50',
        )}
      >
        <UploadCloud className="size-8 text-muted-foreground" aria-hidden />
        <span className="font-medium">{m.media.dropHere}</span>
        <span className="text-xs text-muted-foreground">{m.media.limits}</span>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          className="sr-only"
          multiple={multiple}
          accept={acceptAttr}
          onChange={(e) => {
            void send(Array.from(e.target.files ?? []));
            e.target.value = '';
          }}
        />
      </label>
      {pending.map((p) => (
        <div key={p.id} className="space-y-1" aria-live="polite">
          <div className="flex justify-between text-sm">
            <span className="truncate">{fmt(m.media.uploading, { name: p.name })}</span>
            <span className="tabular-nums text-muted-foreground">
              {Math.round(p.progress * 100)}%
            </span>
          </div>
          <Progress value={p.progress * 100} aria-label={p.name} />
        </div>
      ))}
    </div>
  );
}
