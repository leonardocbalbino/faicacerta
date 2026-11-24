import {
  TECHNIQUE_MEDIA_ROLES,
  type Media,
  type TechniqueDetail,
  type TechniqueMediaRole,
} from '@faixa-certa/shared';
import { useMutation } from '@tanstack/react-query';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { MediaPickerDialog } from '@/components/media/media-picker';
import { MediaThumb } from '@/components/media/media-thumb';
import { SortableList } from '@/components/sortable-list';
import { MediaStatusBadge } from '@/components/status';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useMessages } from '@/i18n';
import { api, errorMessage, unwrap } from '@/lib/api';

interface Row {
  media: Media;
  role: TechniqueMediaRole;
  caption: string;
}

/** Vídeo principal, passo a passo e galeria, na ordem exibida no app. */
export function TechniqueMediaTab({
  technique,
  onSaved,
}: {
  technique: TechniqueDetail;
  onSaved: (t: TechniqueDetail) => void;
}) {
  const m = useMessages();
  const fromServer = () =>
    technique.media.map((x) => ({ media: x.media, role: x.role, caption: x.caption ?? '' }));
  const [rows, setRows] = useState<Row[]>(fromServer);
  const [dirty, setDirty] = useState(false);

  // Recebe o status atualizado do processamento sem perder edições locais.
  useEffect(() => {
    if (!dirty) setRows(fromServer());
    else {
      const fresh = new Map(technique.media.map((x) => [x.media.id, x.media]));
      setRows((r) => r.map((row) => ({ ...row, media: fresh.get(row.media.id) ?? row.media })));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [technique]);

  const update = (next: Row[]) => {
    setRows(next);
    setDirty(true);
  };

  const save = useMutation({
    mutationFn: async () =>
      unwrap<TechniqueDetail>(
        await api.PUT('/v1/admin/techniques/{id}/media', {
          params: { path: { id: technique.id } },
          body: {
            items: rows.map((r) => ({
              mediaId: r.media.id,
              role: r.role,
              caption: r.caption || null,
            })),
          },
        }),
      ),
    onSuccess: (t) => {
      setDirty(false);
      toast.success(m.techniques.mediaSaved);
      onSaved(t);
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  const add = (media: Media) => {
    if (rows.some((r) => r.media.id === media.id)) return;
    const hasMain = rows.some((r) => r.role === 'MAIN_VIDEO');
    const role: TechniqueMediaRole = media.type === 'VIDEO' && !hasMain ? 'MAIN_VIDEO' : 'STEP';
    update([...rows, { media, role, caption: '' }]);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{m.techniques.mediaHint}</p>
      <SortableList
        items={rows}
        getId={(r) => r.media.id}
        onReorder={update}
        renderItem={(row, i) => (
          <div className="flex flex-wrap items-center gap-3">
            <MediaThumb media={row.media} className="w-28" />
            <div className="flex min-w-48 flex-1 flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <Select
                  value={row.role}
                  onValueChange={(role) =>
                    update(
                      rows.map((r, j) =>
                        j === i ? { ...r, role: role as TechniqueMediaRole } : r,
                      ),
                    )
                  }
                >
                  <SelectTrigger className="h-8 w-44" aria-label={m.common.status}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TECHNIQUE_MEDIA_ROLES.filter(
                      (r) => r !== 'MAIN_VIDEO' || row.media.type === 'VIDEO',
                    ).map((r) => (
                      <SelectItem key={r} value={r}>
                        {m.mediaRole[r]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <MediaStatusBadge status={row.media.status} />
                {row.media.processingError && (
                  <span className="text-xs text-destructive">{row.media.processingError}</span>
                )}
              </div>
              <Input
                className="h-8"
                value={row.caption}
                placeholder={m.techniques.caption}
                aria-label={m.techniques.caption}
                maxLength={300}
                onChange={(e) =>
                  update(rows.map((r, j) => (j === i ? { ...r, caption: e.target.value } : r)))
                }
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label={m.common.remove}
              onClick={() => update(rows.filter((_, j) => j !== i))}
            >
              <Trash2 aria-hidden />
            </Button>
          </div>
        )}
      />
      <div className="flex flex-wrap gap-2">
        <MediaPickerDialog
          accept={['VIDEO', 'IMAGE']}
          onPick={add}
          trigger={
            <Button variant="outline">
              <Plus aria-hidden /> {m.techniques.addMedia}
            </Button>
          }
        />
        <Button onClick={() => save.mutate()} disabled={!dirty || save.isPending}>
          {save.isPending && <Loader2 className="animate-spin" aria-hidden />}
          {m.common.save}
        </Button>
      </div>
    </div>
  );
}
