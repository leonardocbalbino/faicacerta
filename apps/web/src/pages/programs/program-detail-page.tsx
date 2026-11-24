import type {
  Belt,
  BeltInput,
  Program,
  ProgramDetail,
  PublicationStatus,
} from '@faixa-certa/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ListChecks, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { toast } from 'sonner';
import { BeltSwatch } from '@/components/belt-swatch';
import { ConfirmAction } from '@/components/confirm-button';
import { PageHeader } from '@/components/page-header';
import { SortableList } from '@/components/sortable-list';
import { StatusActions, StatusBadge } from '@/components/status';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { fmt, useMessages } from '@/i18n';
import { api, errorMessage, unwrap } from '@/lib/api';
import { keys } from '@/lib/queries';
import { BeltDialog } from './belt-dialog';
import { RequirementsSheet } from './requirements-sheet';

export function ProgramDetailPage() {
  const m = useMessages();
  const { id = '' } = useParams();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Belt | 'new' | null>(null);
  const [requirementsOf, setRequirementsOf] = useState<Belt | null>(null);

  const program = useQuery({
    queryKey: keys.program(id),
    queryFn: async () =>
      unwrap<ProgramDetail>(await api.GET('/v1/admin/programs/{id}', { params: { path: { id } } })),
  });
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: keys.program(id) });
    void qc.invalidateQueries({ queryKey: keys.programs });
  };
  const onError = (err: unknown) => toast.error(errorMessage(err));

  const saveBelt = useMutation({
    mutationFn: async (input: BeltInput) =>
      editing === 'new'
        ? unwrap<Belt>(
            await api.POST('/v1/admin/programs/{id}/belts', {
              params: { path: { id } },
              body: input,
            }),
          )
        : unwrap<Belt>(
            await api.PATCH('/v1/admin/belts/{id}', {
              params: { path: { id: (editing as Belt).id } },
              body: input,
            }),
          ),
    onSuccess: () => {
      setEditing(null);
      toast.success(m.common.saved);
      refresh();
    },
    onError,
  });

  const reorder = useMutation({
    mutationFn: async (belts: Belt[]) =>
      unwrap<Belt[]>(
        await api.PUT('/v1/admin/programs/{id}/belts/order', {
          params: { path: { id } },
          body: { ids: belts.map((b) => b.id) },
        }),
      ),
    onMutate: (belts) => {
      // Atualiza a tela na hora; desfaz se a API recusar.
      const previous = qc.getQueryData<ProgramDetail>(keys.program(id));
      if (previous) qc.setQueryData(keys.program(id), { ...previous, belts });
      return { previous };
    },
    onError: (err, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(keys.program(id), ctx.previous);
      onError(err);
    },
    onSuccess: () => toast.success(m.programs.beltsReordered),
  });

  const removeBelt = useMutation({
    mutationFn: async (beltId: string) =>
      unwrap(await api.DELETE('/v1/admin/belts/{id}', { params: { path: { id: beltId } } })),
    onSuccess: () => {
      toast.success(m.common.deleted);
      refresh();
    },
    onError,
  });

  if (program.isLoading) return <Skeleton className="h-96" />;
  if (!program.data) return <p className="text-destructive">{errorMessage(program.error)}</p>;
  const p = program.data;

  const changeStatus = async (status: PublicationStatus) => {
    unwrap<Program>(
      await api.POST('/v1/admin/programs/{id}/status', {
        params: { path: { id } },
        body: { status },
      }),
    );
    refresh();
  };

  return (
    <>
      <PageHeader
        backTo={
          <Button asChild variant="link" className="h-auto p-0 text-muted-foreground">
            <Link to="/programas">
              <ArrowLeft aria-hidden /> {m.programs.title}
            </Link>
          </Button>
        }
        title={
          <span className="flex flex-wrap items-center gap-3">
            {p.name} <StatusBadge status={p.status} />
          </span>
        }
        subtitle={[p.federation, p.description].filter(Boolean).join(' · ')}
        actions={<StatusActions status={p.status} onChange={changeStatus} />}
      />

      <section aria-labelledby="belts-title" className="max-w-3xl space-y-3">
        <div className="flex items-center justify-between">
          <h2 id="belts-title" className="text-lg font-semibold">
            {m.programs.belts}
          </h2>
          <Button onClick={() => setEditing('new')}>
            <Plus aria-hidden /> {m.programs.newBelt}
          </Button>
        </div>
        {p.belts.length === 0 ? (
          <p className="text-sm text-muted-foreground">{m.programs.noBelts}</p>
        ) : (
          <SortableList
            items={p.belts}
            getId={(b) => b.id}
            onReorder={(next) => reorder.mutate(next)}
            renderItem={(b) => (
              <div className="flex flex-wrap items-center gap-3">
                <BeltSwatch colors={b.colors} className="h-4 w-14" label={b.name} />
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{b.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {fmt(m.programs.requirementCount, { n: b.requirementCount })}
                    {b.minAge ? ` · ${m.programs.minAge}: ${b.minAge}` : ''}
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => setRequirementsOf(b)}>
                  <ListChecks aria-hidden /> {m.programs.editRequirements}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`${m.common.edit}: ${b.name}`}
                  onClick={() => setEditing(b)}
                >
                  <Pencil aria-hidden />
                </Button>
                <ConfirmAction
                  onConfirm={() => removeBelt.mutate(b.id)}
                  trigger={
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`${m.common.delete}: ${b.name}`}
                    >
                      <Trash2 aria-hidden />
                    </Button>
                  }
                />
              </div>
            )}
          />
        )}
      </section>

      <BeltDialog
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
        belt={editing && editing !== 'new' ? editing : undefined}
        title={editing === 'new' ? m.programs.newBelt : m.common.edit}
        pending={saveBelt.isPending}
        onSubmit={(input) => saveBelt.mutate(input)}
      />
      <RequirementsSheet belt={requirementsOf} onClose={() => setRequirementsOf(null)} />
    </>
  );
}
