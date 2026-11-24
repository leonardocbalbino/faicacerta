import { zodResolver } from '@hookform/resolvers/zod';
import { BELT_PALETTE, beltInputSchema, type Belt, type BeltInput } from '@faixa-certa/shared';
import { Loader2 } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { BeltSwatch } from '@/components/belt-swatch';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useMessages } from '@/i18n';

/** Formulário da faixa: o campo de idade fica vazio como string e vira null. */
const formSchema = beltInputSchema.extend({
  minAge: z.union([z.literal(''), z.coerce.number().int().min(3).max(99)]).optional(),
  twoColors: z.boolean(),
});
type FormIn = z.input<typeof formSchema>;
type FormOut = z.output<typeof formSchema>;

export function BeltDialog({
  open,
  onOpenChange,
  belt,
  onSubmit,
  pending,
  title,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  belt?: Belt;
  onSubmit: (input: BeltInput) => void;
  pending: boolean;
  title: ReactNode;
}) {
  const m = useMessages();
  const form = useForm<FormIn, unknown, FormOut>({ resolver: zodResolver(formSchema) });

  useEffect(() => {
    if (!open) return;
    form.reset({
      name: belt?.name ?? '',
      colors: belt?.colors.length ? belt.colors : ['#FFFFFF'],
      minAge: belt?.minAge ?? '',
      description: belt?.description ?? '',
      twoColors: (belt?.colors.length ?? 1) > 1,
    });
  }, [open, belt, form]);

  const colors = useWatch({ control: form.control, name: 'colors' }) ?? [];
  const twoColors = useWatch({ control: form.control, name: 'twoColors' });

  const submit = form.handleSubmit(({ twoColors: two, minAge, colors: c, ...rest }) =>
    onSubmit({
      ...rest,
      colors: two ? c.slice(0, 2) : c.slice(0, 1),
      minAge: minAge === '' || minAge === undefined ? null : minAge,
    }),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form id="belt-form" onSubmit={submit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="b-name">{m.programs.beltName}</Label>
            <Input
              id="b-name"
              {...form.register('name')}
              aria-invalid={!!form.formState.errors.name}
            />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">{m.programs.colors}</legend>
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="color"
                aria-label={`${m.programs.colors} 1`}
                className="h-9 w-14 cursor-pointer rounded border bg-transparent"
                value={colors[0] ?? '#FFFFFF'}
                onChange={(e) =>
                  form.setValue('colors.0', e.target.value.toUpperCase(), { shouldDirty: true })
                }
              />
              {twoColors && (
                <input
                  type="color"
                  aria-label={`${m.programs.colors} 2`}
                  className="h-9 w-14 cursor-pointer rounded border bg-transparent"
                  value={colors[1] ?? '#000000'}
                  onChange={(e) =>
                    form.setValue('colors.1', e.target.value.toUpperCase(), { shouldDirty: true })
                  }
                />
              )}
              <BeltSwatch
                colors={twoColors ? colors.slice(0, 2) : colors.slice(0, 1)}
                className="h-4 w-20"
              />
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={!!twoColors}
                  onCheckedChange={(v) => {
                    form.setValue('twoColors', v);
                    if (v && !colors[1]) form.setValue('colors.1', '#000000');
                  }}
                />
                {m.programs.twoColors}
              </label>
            </div>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label={m.programs.palette}>
              {Object.entries(BELT_PALETTE).map(([name, hex]) => (
                <button
                  key={name}
                  type="button"
                  title={name}
                  aria-label={name}
                  onClick={() => form.setValue('colors.0', hex, { shouldDirty: true })}
                  className="size-6 rounded-md border border-foreground/20 focus-visible:ring-2 focus-visible:ring-ring"
                  style={{ background: hex }}
                />
              ))}
            </div>
          </fieldset>
          <div className="space-y-2">
            <Label htmlFor="b-age">
              {m.programs.minAge}{' '}
              <span className="text-muted-foreground">({m.common.optional})</span>
            </Label>
            <Input
              id="b-age"
              type="number"
              min={3}
              max={99}
              className="w-28"
              {...form.register('minAge')}
            />
            {form.formState.errors.minAge && (
              <p className="text-sm text-destructive">{form.formState.errors.minAge.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="b-desc">{m.programs.description}</Label>
            <Textarea id="b-desc" rows={2} {...form.register('description')} />
          </div>
        </form>
        <DialogFooter>
          <Button type="submit" form="belt-form" disabled={pending}>
            {pending && <Loader2 className="animate-spin" aria-hidden />}
            {m.common.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
