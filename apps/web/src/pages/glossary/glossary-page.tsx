import { zodResolver } from '@hookform/resolvers/zod';
import {
  glossaryTermInputSchema,
  type ContentVersionSummary,
  type GlossaryTerm,
  type GlossaryTermInput,
  type Media,
  type PublicationStatus,
} from '@faixa-certa/shared';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Plus, Search, Trash2, Volume2 } from 'lucide-react';
import { useDeferredValue, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { ConfirmAction } from '@/components/confirm-button';
import { MediaField } from '@/components/media/media-picker';
import { PageHeader } from '@/components/page-header';
import { StatusActions, StatusBadge } from '@/components/status';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { VersionHistory } from '@/components/version-history';
import { useMessages } from '@/i18n';
import { api, errorMessage, unwrap } from '@/lib/api';
import { keys } from '@/lib/queries';

type Page = { items: GlossaryTerm[]; nextCursor: string | null };

export function GlossaryPage() {
  const m = useMessages();
  const [q, setQ] = useState('');
  const query = useDeferredValue(q);
  const [editing, setEditing] = useState<GlossaryTerm | 'new' | null>(null);

  const list = useInfiniteQuery({
    queryKey: [...keys.glossary, query],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) =>
      unwrap<Page>(
        await api.GET('/v1/admin/glossary', {
          params: { query: { q: query || undefined, cursor: pageParam, limit: 50 } },
        }),
      ),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
  const items = list.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <>
      <PageHeader
        title={m.glossary.title}
        subtitle={m.glossary.subtitle}
        actions={
          <Button onClick={() => setEditing('new')}>
            <Plus aria-hidden /> {m.glossary.new}
          </Button>
        }
      />
      <div className="relative mb-4 max-w-md" role="search">
        <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" aria-hidden />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label={m.common.search}
          placeholder={m.common.search}
          className="pl-8"
        />
      </div>
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{m.glossary.japanese}</TableHead>
              <TableHead>{m.glossary.translation}</TableHead>
              <TableHead className="w-12" />
              <TableHead>{m.common.status}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 && !list.isLoading && (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                  {m.common.noResults}
                </TableCell>
              </TableRow>
            )}
            {items.map((term) => (
              <TableRow key={term.id}>
                <TableCell>
                  <button
                    type="button"
                    className="font-medium hover:underline"
                    onClick={() => setEditing(term)}
                  >
                    {term.japanese}
                  </button>
                  {term.kanji && (
                    <span lang="ja" className="ml-2 text-muted-foreground">
                      {term.kanji}
                    </span>
                  )}
                </TableCell>
                <TableCell>{term.translation}</TableCell>
                <TableCell>
                  {term.audio && (
                    <Volume2
                      className="size-4 text-muted-foreground"
                      aria-label={m.glossary.audio}
                    />
                  )}
                </TableCell>
                <TableCell>
                  <StatusBadge status={term.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {list.hasNextPage && (
        <div className="mt-4 text-center">
          <Button variant="outline" onClick={() => list.fetchNextPage()}>
            {m.common.loadMore}
          </Button>
        </div>
      )}
      <GlossaryDialog
        term={editing === 'new' ? undefined : (editing ?? undefined)}
        open={editing !== null}
        onClose={() => setEditing(null)}
        onSaved={setEditing}
      />
    </>
  );
}

function GlossaryDialog({
  term,
  open,
  onClose,
  onSaved,
}: {
  term?: GlossaryTerm;
  open: boolean;
  onClose: () => void;
  onSaved: (t: GlossaryTerm) => void;
}) {
  const m = useMessages();
  const qc = useQueryClient();
  const [audio, setAudio] = useState<Media | null>(null);
  const form = useForm<GlossaryTermInput>({ resolver: zodResolver(glossaryTermInputSchema) });

  useEffect(() => {
    if (!open) return;
    setAudio(term?.audio ?? null);
    form.reset({
      japanese: term?.japanese ?? '',
      kanji: term?.kanji ?? '',
      translation: term?.translation ?? '',
      description: term?.description ?? '',
      audioId: term?.audio?.id ?? null,
    });
  }, [open, term, form]);

  const done = (t: GlossaryTerm) => {
    void qc.invalidateQueries({ queryKey: keys.glossary });
    onSaved(t);
  };

  const save = useMutation({
    mutationFn: async (body: GlossaryTermInput) =>
      term
        ? unwrap<GlossaryTerm>(
            await api.PATCH('/v1/admin/glossary/{id}', { params: { path: { id: term.id } }, body }),
          )
        : unwrap<GlossaryTerm>(await api.POST('/v1/admin/glossary', { body })),
    onSuccess: (t) => {
      toast.success(m.common.saved);
      done(t);
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  const remove = async () => {
    try {
      unwrap(await api.DELETE('/v1/admin/glossary/{id}', { params: { path: { id: term!.id } } }));
      void qc.invalidateQueries({ queryKey: keys.glossary });
      toast.success(m.common.deleted);
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const changeStatus = async (status: PublicationStatus) =>
    done(
      unwrap<GlossaryTerm>(
        await api.POST('/v1/admin/glossary/{id}/status', {
          params: { path: { id: term!.id } },
          body: { status },
        }),
      ),
    );

  const { errors } = form.formState;
  const fields = (
    <form
      id="glossary-form"
      onSubmit={form.handleSubmit((v) => save.mutate(v))}
      className="space-y-4"
      noValidate
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="g-jp">{m.glossary.japanese}</Label>
          <Input id="g-jp" aria-invalid={!!errors.japanese} {...form.register('japanese')} />
          {errors.japanese && <p className="text-sm text-destructive">{errors.japanese.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="g-kanji">{m.glossary.kanji}</Label>
          <Input id="g-kanji" lang="ja" {...form.register('kanji')} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="g-tr">{m.glossary.translation}</Label>
        <Input id="g-tr" aria-invalid={!!errors.translation} {...form.register('translation')} />
        {errors.translation && (
          <p className="text-sm text-destructive">{errors.translation.message}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="g-desc">{m.glossary.description}</Label>
        <Textarea id="g-desc" rows={3} {...form.register('description')} />
      </div>
      <div className="space-y-2">
        <Label>{m.glossary.audio}</Label>
        <MediaField
          label={m.glossary.audio}
          accept={['AUDIO']}
          value={audio}
          onChange={(media) => {
            setAudio(media);
            form.setValue('audioId', media?.id ?? null, { shouldDirty: true });
          }}
        />
      </div>
    </form>
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {term ? term.japanese : m.glossary.new}
            {term && <StatusBadge status={term.status} />}
          </DialogTitle>
        </DialogHeader>
        {term ? (
          <Tabs defaultValue="form">
            <TabsList>
              <TabsTrigger value="form">{m.techniques.tabs.content}</TabsTrigger>
              <TabsTrigger value="history">{m.techniques.tabs.history}</TabsTrigger>
            </TabsList>
            <TabsContent value="form" className="pt-2">
              {fields}
            </TabsContent>
            <TabsContent value="history" className="max-h-96 overflow-y-auto pt-2">
              <VersionHistory
                queryKey={[...keys.glossary, term.id, 'versions', term.updatedAt]}
                load={async () =>
                  unwrap<ContentVersionSummary[]>(
                    await api.GET('/v1/admin/glossary/{id}/versions', {
                      params: { path: { id: term.id } },
                    }),
                  )
                }
                restore={async (version) =>
                  done(
                    unwrap<GlossaryTerm>(
                      await api.POST('/v1/admin/glossary/{id}/versions/{version}/restore', {
                        params: { path: { id: term.id, version } },
                      }),
                    ),
                  )
                }
                onRestored={() => undefined}
              />
            </TabsContent>
          </Tabs>
        ) : (
          fields
        )}
        <DialogFooter className="flex-wrap gap-2 sm:justify-between">
          <div className="flex gap-2">
            {term && (
              <ConfirmAction
                onConfirm={remove}
                trigger={
                  <Button variant="outline" aria-label={m.common.delete}>
                    <Trash2 aria-hidden />
                  </Button>
                }
              />
            )}
            {term && <StatusActions status={term.status} onChange={changeStatus} />}
          </div>
          <Button
            type="submit"
            form="glossary-form"
            variant={term ? 'outline' : 'default'}
            disabled={save.isPending}
          >
            {save.isPending && <Loader2 className="animate-spin" aria-hidden />}
            {m.common.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
