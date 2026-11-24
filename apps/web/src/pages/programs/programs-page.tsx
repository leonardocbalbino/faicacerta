import { zodResolver } from '@hookform/resolvers/zod';
import { programInputSchema, type Program, type ProgramInput } from '@faixa-certa/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronRight, Loader2, Plus } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { PageHeader } from '@/components/page-header';
import { StatusBadge } from '@/components/status';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { fmt, useMessages } from '@/i18n';
import { api, errorMessage, unwrap } from '@/lib/api';
import { keys, usePrograms } from '@/lib/queries';

export function ProgramsPage() {
  const m = useMessages();
  const programs = usePrograms();

  return (
    <>
      <PageHeader
        title={m.programs.title}
        subtitle={m.programs.subtitle}
        actions={<NewProgramDialog />}
      />
      {programs.isLoading && <Skeleton className="h-32" />}
      {programs.isError && <p className="text-destructive">{errorMessage(programs.error)}</p>}
      <ul className="grid gap-3 md:grid-cols-2">
        {programs.data?.map((p) => (
          <li key={p.id}>
            <Link
              to={`/programas/${p.id}`}
              className="flex items-center gap-4 rounded-lg border bg-card p-4 transition-colors hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{p.name}</span>
                  <StatusBadge status={p.status} />
                </div>
                <div className="text-sm text-muted-foreground">
                  {[p.federation, fmt(m.programs.beltCount, { n: p.beltCount })]
                    .filter(Boolean)
                    .join(' · ')}
                </div>
              </div>
              <ChevronRight className="text-muted-foreground" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

function NewProgramDialog() {
  const m = useMessages();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const form = useForm<ProgramInput>({ resolver: zodResolver(programInputSchema) });
  const create = useMutation({
    mutationFn: async (body: ProgramInput) =>
      unwrap<Program>(await api.POST('/v1/admin/programs', { body })),
    onSuccess: (p) => {
      void qc.invalidateQueries({ queryKey: keys.programs });
      setOpen(false);
      void navigate(`/programas/${p.id}`);
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus aria-hidden /> {m.programs.new}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{m.programs.new}</DialogTitle>
        </DialogHeader>
        <form
          id="new-program"
          onSubmit={form.handleSubmit((v) => create.mutate(v))}
          className="space-y-4"
          noValidate
        >
          <div className="space-y-2">
            <Label htmlFor="p-name">{m.programs.name}</Label>
            <Input
              id="p-name"
              {...form.register('name')}
              aria-invalid={!!form.formState.errors.name}
            />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="p-fed">{m.programs.federation}</Label>
            <Input id="p-fed" {...form.register('federation')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="p-desc">{m.programs.description}</Label>
            <Textarea id="p-desc" rows={3} {...form.register('description')} />
          </div>
        </form>
        <DialogFooter>
          <Button type="submit" form="new-program" disabled={create.isPending}>
            {create.isPending && <Loader2 className="animate-spin" aria-hidden />}
            {m.common.create}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
