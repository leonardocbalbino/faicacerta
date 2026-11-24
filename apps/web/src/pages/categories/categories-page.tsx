import { zodResolver } from '@hookform/resolvers/zod';
import { categoryInputSchema, type Category, type CategoryInput } from '@faixa-certa/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { ConfirmAction } from '@/components/confirm-button';
import { PageHeader } from '@/components/page-header';
import { SortableList } from '@/components/sortable-list';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { fmt, useMessages } from '@/i18n';
import { api, errorMessage, unwrap } from '@/lib/api';
import { keys, slugify, useCategories } from '@/lib/queries';

const ROOT = '__root__';

export function CategoriesPage() {
  const m = useMessages();
  const qc = useQueryClient();
  const categories = useCategories();
  const [editing, setEditing] = useState<Category | 'new' | null>(null);
  const all = categories.data ?? [];
  const childrenOf = (parentId: string | null) =>
    all.filter((c) => c.parentId === parentId).sort((a, b) => a.order - b.order);

  const reorder = useMutation({
    mutationFn: async (ids: string[]) =>
      unwrap<Category[]>(await api.PUT('/v1/admin/categories/order', { body: { ids } })),
    onSuccess: (data) => {
      qc.setQueryData(keys.categories, data);
      toast.success(m.categories.reordered);
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  const remove = useMutation({
    mutationFn: async (id: string) =>
      unwrap(await api.DELETE('/v1/admin/categories/{id}', { params: { path: { id } } })),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.categories });
      toast.success(m.common.deleted);
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  const renderLevel = (parentId: string | null, depth: number) => {
    const items = childrenOf(parentId);
    if (!items.length) return null;
    return (
      <SortableList
        className={depth ? 'mt-2 ml-6' : undefined}
        items={items}
        getId={(c) => c.id}
        onReorder={(next) => {
          qc.setQueryData<Category[]>(keys.categories, (old) =>
            old?.map((c) => {
              const idx = next.findIndex((n) => n.id === c.id);
              return idx >= 0 ? { ...c, order: idx } : c;
            }),
          );
          reorder.mutate(next.map((c) => c.id));
        }}
        renderItem={(c) => (
          <div>
            <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <span className="font-medium">{c.name}</span>
                <span className="ml-2 font-mono text-xs text-muted-foreground">{c.slug}</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {fmt(m.categories.techniques, { n: c.techniqueCount })}
              </span>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`${m.common.edit}: ${c.name}`}
                onClick={() => setEditing(c)}
              >
                <Pencil aria-hidden />
              </Button>
              <ConfirmAction
                onConfirm={() => remove.mutate(c.id)}
                trigger={
                  <Button variant="ghost" size="icon" aria-label={`${m.common.delete}: ${c.name}`}>
                    <Trash2 aria-hidden />
                  </Button>
                }
              />
            </div>
            {renderLevel(c.id, depth + 1)}
          </div>
        )}
      />
    );
  };

  return (
    <>
      <PageHeader
        title={m.categories.title}
        subtitle={m.categories.subtitle}
        actions={
          <Button onClick={() => setEditing('new')}>
            <Plus aria-hidden /> {m.categories.new}
          </Button>
        }
      />
      <div className="max-w-3xl">
        {categories.isLoading ? <Skeleton className="h-64" /> : renderLevel(null, 0)}
      </div>
      <CategoryDialog
        category={editing === 'new' ? undefined : (editing ?? undefined)}
        open={editing !== null}
        onClose={() => setEditing(null)}
        all={all}
      />
    </>
  );
}

function CategoryDialog({
  category,
  open,
  onClose,
  all,
}: {
  category?: Category;
  open: boolean;
  onClose: () => void;
  all: Category[];
}) {
  const m = useMessages();
  const qc = useQueryClient();
  const form = useForm<CategoryInput>({ resolver: zodResolver(categoryInputSchema) });
  const [slugTouched, setSlugTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSlugTouched(!!category);
    form.reset({
      name: category?.name ?? '',
      slug: category?.slug ?? '',
      parentId: category?.parentId ?? null,
      icon: category?.icon ?? '',
    });
  }, [open, category, form]);

  const save = useMutation({
    mutationFn: async (body: CategoryInput) =>
      category
        ? unwrap<Category>(
            await api.PATCH('/v1/admin/categories/{id}', {
              params: { path: { id: category.id } },
              body,
            }),
          )
        : unwrap<Category>(await api.POST('/v1/admin/categories', { body })),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.categories });
      toast.success(m.common.saved);
      onClose();
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  const { errors } = form.formState;
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{category ? m.common.edit : m.categories.new}</DialogTitle>
        </DialogHeader>
        <form
          id="category-form"
          onSubmit={form.handleSubmit((v) => save.mutate(v))}
          className="space-y-4"
          noValidate
        >
          <div className="space-y-2">
            <Label htmlFor="c-name">{m.categories.name}</Label>
            <Input
              id="c-name"
              aria-invalid={!!errors.name}
              {...form.register('name', {
                onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                  if (!slugTouched) form.setValue('slug', slugify(e.target.value));
                },
              })}
            />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="c-slug">{m.categories.slug}</Label>
            <Input
              id="c-slug"
              className="font-mono"
              aria-invalid={!!errors.slug}
              {...form.register('slug', { onChange: () => setSlugTouched(true) })}
            />
            <p className="text-xs text-muted-foreground">{m.categories.slugHint}</p>
            {errors.slug && <p className="text-sm text-destructive">{errors.slug.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="c-parent">{m.categories.parent}</Label>
            <Controller
              control={form.control}
              name="parentId"
              render={({ field }) => (
                <Select
                  value={field.value ?? ROOT}
                  onValueChange={(v) => field.onChange(v === ROOT ? null : v)}
                >
                  <SelectTrigger id="c-parent">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ROOT}>{m.categories.root}</SelectItem>
                    {all
                      .filter((c) => c.id !== category?.id)
                      .map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </form>
        <DialogFooter>
          <Button type="submit" form="category-form" disabled={save.isPending}>
            {save.isPending && <Loader2 className="animate-spin" aria-hidden />}
            {m.common.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
