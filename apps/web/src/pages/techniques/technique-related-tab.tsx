import type { TechniqueDetail, TechniqueRef } from '@faixa-certa/shared';
import { useMutation } from '@tanstack/react-query';
import { Loader2, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { SortableList } from '@/components/sortable-list';
import { StatusBadge } from '@/components/status';
import { TechniquePicker } from '@/components/technique-picker';
import { Button } from '@/components/ui/button';
import { useMessages } from '@/i18n';
import { api, errorMessage, unwrap } from '@/lib/api';

export function TechniqueRelatedTab({
  technique,
  onSaved,
}: {
  technique: TechniqueDetail;
  onSaved: (t: TechniqueDetail) => void;
}) {
  const m = useMessages();
  const [items, setItems] = useState<TechniqueRef[]>(technique.related);
  const [dirty, setDirty] = useState(false);
  const update = (next: TechniqueRef[]) => {
    setItems(next);
    setDirty(true);
  };

  const save = useMutation({
    mutationFn: async () =>
      unwrap<TechniqueDetail>(
        await api.PUT('/v1/admin/techniques/{id}/related', {
          params: { path: { id: technique.id } },
          body: { ids: items.map((i) => i.id) },
        }),
      ),
    onSuccess: (t) => {
      setDirty(false);
      toast.success(m.techniques.relatedSaved);
      onSaved(t);
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{m.techniques.relatedHint}</p>
      <SortableList
        items={items}
        getId={(t) => t.id}
        onReorder={update}
        renderItem={(t) => (
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <Link to={`/tecnicas/${t.id}`} className="font-medium hover:underline">
                {t.japaneseName}
              </Link>
              <span className="ml-2 text-sm text-muted-foreground">{t.translation}</span>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={t.status} />
              <Button
                variant="ghost"
                size="icon"
                aria-label={m.common.remove}
                onClick={() => update(items.filter((x) => x.id !== t.id))}
              >
                <Trash2 aria-hidden />
              </Button>
            </div>
          </div>
        )}
      />
      <div className="flex gap-2">
        <TechniquePicker
          label={m.common.add}
          exclude={[technique.id, ...items.map((i) => i.id)]}
          onPick={(t) => update([...items, t])}
        />
        <Button onClick={() => save.mutate()} disabled={!dirty || save.isPending}>
          {save.isPending && <Loader2 className="animate-spin" aria-hidden />}
          {m.common.save}
        </Button>
      </div>
    </div>
  );
}
