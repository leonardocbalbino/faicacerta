import type { Belt, BeltRequirement, RequirementType } from '@faixa-certa/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { BeltSwatch } from '@/components/belt-swatch';
import { SortableList } from '@/components/sortable-list';
import { StatusBadge } from '@/components/status';
import { TechniquePicker } from '@/components/technique-picker';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { useMessages } from '@/i18n';
import { api, errorMessage, unwrap } from '@/lib/api';
import { keys } from '@/lib/queries';

/** Checklist do exame da faixa: técnicas obrigatórias e opcionais, em ordem. */
export function RequirementsSheet({ belt, onClose }: { belt: Belt | null; onClose: () => void }) {
  const m = useMessages();
  const qc = useQueryClient();
  const [items, setItems] = useState<BeltRequirement[]>([]);
  const [dirty, setDirty] = useState(false);

  const current = useQuery({
    queryKey: ['belts', belt?.id, 'requirements'],
    enabled: !!belt,
    queryFn: async () =>
      unwrap<BeltRequirement[]>(
        await api.GET('/v1/admin/belts/{id}/requirements', { params: { path: { id: belt!.id } } }),
      ),
  });

  useEffect(() => {
    if (current.data) {
      setItems(current.data);
      setDirty(false);
    }
  }, [current.data]);

  const update = (next: BeltRequirement[]) => {
    setItems(next);
    setDirty(true);
  };

  const save = useMutation({
    mutationFn: async () =>
      unwrap<BeltRequirement[]>(
        await api.PUT('/v1/admin/belts/{id}/requirements', {
          params: { path: { id: belt!.id } },
          body: { items: items.map((i) => ({ techniqueId: i.technique.id, type: i.type })) },
        }),
      ),
    onSuccess: (data) => {
      qc.setQueryData(['belts', belt?.id, 'requirements'], data);
      void qc.invalidateQueries({ queryKey: keys.program(belt!.programId) });
      toast.success(m.programs.requirementsSaved);
      setDirty(false);
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  return (
    <Sheet open={!!belt} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="flex w-full flex-col gap-0 sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {belt && <BeltSwatch colors={belt.colors} />}
            {m.programs.requirements} · {belt?.name}
          </SheetTitle>
          <SheetDescription>{m.common.dragToReorder}</SheetDescription>
        </SheetHeader>
        <div className="flex-1 space-y-4 overflow-y-auto px-4">
          {current.isLoading ? (
            <Skeleton className="h-40" />
          ) : (
            <SortableList
              items={items}
              getId={(r) => r.technique.id}
              onReorder={update}
              renderItem={(r, i) => (
                <div className="flex flex-wrap items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{r.technique.japaneseName}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {r.technique.translation}
                    </div>
                  </div>
                  {r.technique.status !== 'PUBLISHED' && (
                    <StatusBadge status={r.technique.status} />
                  )}
                  <Select
                    value={r.type}
                    onValueChange={(type) =>
                      update(
                        items.map((x, j) =>
                          j === i ? { ...x, type: type as RequirementType } : x,
                        ),
                      )
                    }
                  >
                    <SelectTrigger className="h-8 w-32" aria-label={m.common.status}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MANDATORY">{m.requirementType.MANDATORY}</SelectItem>
                      <SelectItem value="OPTIONAL">{m.requirementType.OPTIONAL}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`${m.common.remove}: ${r.technique.japaneseName}`}
                    onClick={() => update(items.filter((_, j) => j !== i))}
                  >
                    <Trash2 aria-hidden />
                  </Button>
                </div>
              )}
            />
          )}
          <TechniquePicker
            exclude={items.map((i) => i.technique.id)}
            onPick={(t) =>
              update([...items, { technique: t, type: 'MANDATORY', order: items.length }])
            }
          />
        </div>
        <SheetFooter>
          <Button onClick={() => save.mutate()} disabled={!dirty || save.isPending}>
            {save.isPending && <Loader2 className="animate-spin" aria-hidden />}
            {m.common.save}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
