import { zodResolver } from '@hookform/resolvers/zod';
import {
  QUIZ_QUESTION_TYPES,
  quizQuestionInputSchema,
  type ContentVersionSummary,
  type Media,
  type PublicationStatus,
  type QuizQuestion,
  type QuizQuestionInput,
  type TechniqueDetail,
} from '@faixa-certa/shared';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Plus, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { ConfirmAction } from '@/components/confirm-button';
import { MediaField } from '@/components/media/media-picker';
import { PageHeader } from '@/components/page-header';
import { StatusActions, StatusBadge } from '@/components/status';
import { TechniquePicker } from '@/components/technique-picker';
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
import { keys, useAllBelts } from '@/lib/queries';

const ANY = '__any__';
type Page = { items: QuizQuestion[]; nextCursor: string | null };

export function QuizPage() {
  const m = useMessages();
  const belts = useAllBelts();
  const [beltId, setBeltId] = useState(ANY);
  const [editing, setEditing] = useState<QuizQuestion | 'new' | null>(null);

  const list = useInfiniteQuery({
    queryKey: [...keys.quiz, beltId],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) =>
      unwrap<Page>(
        await api.GET('/v1/admin/quiz-questions', {
          params: {
            query: { beltId: beltId === ANY ? undefined : beltId, cursor: pageParam, limit: 30 },
          },
        }),
      ),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
  const items = list.data?.pages.flatMap((p) => p.items) ?? [];
  const beltName = (id: string | null) => belts.find((b) => b.id === id)?.name ?? '—';

  return (
    <>
      <PageHeader
        title={m.quiz.title}
        subtitle={m.quiz.subtitle}
        actions={
          <Button onClick={() => setEditing('new')}>
            <Plus aria-hidden /> {m.quiz.new}
          </Button>
        }
      />
      <div className="mb-4">
        <Select value={beltId} onValueChange={setBeltId}>
          <SelectTrigger className="w-64" aria-label={m.quiz.belt}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>{m.quiz.noBelt}</SelectItem>
            {belts.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.name} · {b.programName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{m.quiz.prompt}</TableHead>
              <TableHead className="hidden md:table-cell">{m.quiz.type}</TableHead>
              <TableHead className="hidden md:table-cell">{m.quiz.belt}</TableHead>
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
            {items.map((q) => (
              <TableRow key={q.id}>
                <TableCell>
                  <button
                    type="button"
                    className="text-left font-medium hover:underline"
                    onClick={() => setEditing(q)}
                  >
                    {q.prompt}
                  </button>
                </TableCell>
                <TableCell className="hidden md:table-cell">{m.quiz.types[q.type]}</TableCell>
                <TableCell className="hidden md:table-cell">{beltName(q.beltId)}</TableCell>
                <TableCell>
                  <StatusBadge status={q.status} />
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
      <QuestionDialog
        question={editing === 'new' ? undefined : (editing ?? undefined)}
        open={editing !== null}
        onClose={() => setEditing(null)}
        onSaved={setEditing}
        belts={belts}
      />
    </>
  );
}

type FormIn = z.input<typeof quizQuestionInputSchema>;

function QuestionDialog({
  question,
  open,
  onClose,
  onSaved,
  belts,
}: {
  question?: QuizQuestion;
  open: boolean;
  onClose: () => void;
  onSaved: (q: QuizQuestion) => void;
  belts: { id: string; name: string; programName: string }[];
}) {
  const m = useMessages();
  const qc = useQueryClient();
  const [media, setMedia] = useState<Media | null>(null);
  const form = useForm<FormIn, unknown, QuizQuestionInput>({
    resolver: zodResolver(quizQuestionInputSchema),
  });
  const options = useFieldArray({ control: form.control, name: 'options' });
  const type = useWatch({ control: form.control, name: 'type' });
  const optionValues = useWatch({ control: form.control, name: 'options' }) ?? [];
  const techniqueId = useWatch({ control: form.control, name: 'techniqueId' });
  const technique = useQuery({
    queryKey: keys.technique(techniqueId ?? ''),
    enabled: !!techniqueId,
    queryFn: async () =>
      unwrap<TechniqueDetail>(
        await api.GET('/v1/admin/techniques/{id}', { params: { path: { id: techniqueId! } } }),
      ),
  });

  useEffect(() => {
    if (!open) return;
    setMedia(question?.media ?? null);
    form.reset({
      type: question?.type ?? 'MULTIPLE_CHOICE',
      prompt: question?.prompt ?? '',
      explanation: question?.explanation ?? '',
      beltId: question?.beltId ?? null,
      techniqueId: question?.techniqueId ?? null,
      mediaId: question?.media?.id ?? null,
      difficulty: question?.difficulty ?? 1,
      options: question?.options.map((o) => ({
        text: o.text,
        isCorrect: o.isCorrect,
        mediaId: o.media?.id ?? null,
      })) ?? [
        { text: '', isCorrect: true },
        { text: '', isCorrect: false },
      ],
    });
  }, [open, question, form]);

  const done = (q: QuizQuestion) => {
    void qc.invalidateQueries({ queryKey: keys.quiz });
    onSaved(q);
  };

  const save = useMutation({
    mutationFn: async (body: QuizQuestionInput) =>
      question
        ? unwrap<QuizQuestion>(
            await api.PUT('/v1/admin/quiz-questions/{id}', {
              params: { path: { id: question.id } },
              body,
            }),
          )
        : unwrap<QuizQuestion>(await api.POST('/v1/admin/quiz-questions', { body })),
    onSuccess: (q) => {
      toast.success(m.common.saved);
      done(q);
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  const remove = async () => {
    try {
      unwrap(
        await api.DELETE('/v1/admin/quiz-questions/{id}', {
          params: { path: { id: question!.id } },
        }),
      );
      void qc.invalidateQueries({ queryKey: keys.quiz });
      toast.success(m.common.deleted);
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const changeStatus = async (status: PublicationStatus) =>
    done(
      unwrap<QuizQuestion>(
        await api.POST('/v1/admin/quiz-questions/{id}/status', {
          params: { path: { id: question!.id } },
          body: { status },
        }),
      ),
    );

  const needsMedia = type === 'IDENTIFY_BY_VIDEO' || type === 'IDENTIFY_BY_IMAGE';
  const correctIndex = optionValues.findIndex((o) => o?.isCorrect);
  const { errors } = form.formState;

  const fields = (
    <form
      id="quiz-form"
      onSubmit={form.handleSubmit((v) => save.mutate(v))}
      className="space-y-4"
      noValidate
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="q-type">{m.quiz.type}</Label>
          <Controller
            control={form.control}
            name="type"
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={(v) => {
                  field.onChange(v);
                  if (v === 'TRUE_FALSE') {
                    options.replace([
                      { text: 'Verdadeiro', isCorrect: true },
                      { text: 'Falso', isCorrect: false },
                    ]);
                  }
                }}
              >
                <SelectTrigger id="q-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {QUIZ_QUESTION_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {m.quiz.types[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="q-belt">{m.quiz.belt}</Label>
          <Controller
            control={form.control}
            name="beltId"
            render={({ field }) => (
              <Select
                value={field.value ?? ANY}
                onValueChange={(v) => field.onChange(v === ANY ? null : v)}
              >
                <SelectTrigger id="q-belt">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY}>{m.quiz.noBelt}</SelectItem>
                  {belts.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name} · {b.programName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="q-prompt">{m.quiz.prompt}</Label>
        <Textarea
          id="q-prompt"
          rows={2}
          aria-invalid={!!errors.prompt}
          {...form.register('prompt')}
        />
        {errors.prompt && <p className="text-sm text-destructive">{errors.prompt.message}</p>}
      </div>
      {needsMedia && (
        <div className="space-y-2">
          <Label>{m.quiz.media}</Label>
          <MediaField
            label={m.quiz.media}
            accept={type === 'IDENTIFY_BY_VIDEO' ? ['VIDEO'] : ['IMAGE']}
            value={media}
            onChange={(md) => {
              setMedia(md);
              form.setValue('mediaId', md?.id ?? null, { shouldDirty: true });
            }}
          />
          {errors.mediaId && <p className="text-sm text-destructive">{errors.mediaId.message}</p>}
        </div>
      )}
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">{m.quiz.options}</legend>
        <div role="radiogroup" aria-label={m.quiz.correct} className="space-y-2">
          {options.fields.map((f, i) => (
            <div key={f.id} className="flex items-center gap-2">
              <input
                type="radio"
                name="correct"
                className="size-4 accent-[var(--primary)]"
                aria-label={`${m.quiz.correct}: ${i + 1}`}
                checked={correctIndex === i}
                onChange={() =>
                  optionValues.forEach((_, j) =>
                    form.setValue(`options.${j}.isCorrect`, j === i, { shouldDirty: true }),
                  )
                }
              />
              <Input
                placeholder={m.quiz.optionText}
                aria-label={`${m.quiz.optionText} ${i + 1}`}
                readOnly={type === 'TRUE_FALSE'}
                {...form.register(`options.${i}.text`)}
              />
              {type !== 'TRUE_FALSE' && options.fields.length > 2 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={m.common.remove}
                  onClick={() => options.remove(i)}
                >
                  <X aria-hidden />
                </Button>
              )}
            </div>
          ))}
        </div>
        {errors.options && (
          <p className="text-sm text-destructive">
            {errors.options.message ?? errors.options.root?.message}
          </p>
        )}
        {type !== 'TRUE_FALSE' && options.fields.length < 6 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => options.append({ text: '', isCorrect: false })}
          >
            <Plus aria-hidden /> {m.quiz.addOption}
          </Button>
        )}
      </fieldset>
      <div className="space-y-2">
        <Label htmlFor="q-expl">{m.quiz.explanation}</Label>
        <Textarea id="q-expl" rows={2} {...form.register('explanation')} />
      </div>
      <div className="space-y-2">
        <Label>{m.quiz.technique}</Label>
        <div className="flex items-center gap-2">
          <span className="text-sm">
            {techniqueId ? (technique.data?.japaneseName ?? m.common.loading) : m.quiz.noTechnique}
          </span>
          <TechniquePicker
            label={techniqueId ? m.media.change : m.common.add}
            onPick={(t) => form.setValue('techniqueId', t.id, { shouldDirty: true })}
          />
          {techniqueId && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => form.setValue('techniqueId', null, { shouldDirty: true })}
            >
              {m.media.clear}
            </Button>
          )}
        </div>
      </div>
    </form>
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {question ? m.common.edit : m.quiz.new}
            {question && <StatusBadge status={question.status} />}
          </DialogTitle>
        </DialogHeader>
        {question ? (
          <Tabs defaultValue="form">
            <TabsList>
              <TabsTrigger value="form">{m.techniques.tabs.content}</TabsTrigger>
              <TabsTrigger value="history">{m.techniques.tabs.history}</TabsTrigger>
            </TabsList>
            <TabsContent value="form" className="pt-2">
              {fields}
            </TabsContent>
            <TabsContent value="history" className="pt-2">
              <VersionHistory
                queryKey={[...keys.quiz, question.id, 'versions', question.updatedAt]}
                load={async () =>
                  unwrap<ContentVersionSummary[]>(
                    await api.GET('/v1/admin/quiz-questions/{id}/versions', {
                      params: { path: { id: question.id } },
                    }),
                  )
                }
                restore={async (version) =>
                  done(
                    unwrap<QuizQuestion>(
                      await api.POST('/v1/admin/quiz-questions/{id}/versions/{version}/restore', {
                        params: { path: { id: question.id, version } },
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
            {question && (
              <ConfirmAction
                onConfirm={remove}
                trigger={
                  <Button variant="outline" aria-label={m.common.delete}>
                    <Trash2 aria-hidden />
                  </Button>
                }
              />
            )}
            {question && <StatusActions status={question.status} onChange={changeStatus} />}
          </div>
          <Button
            type="submit"
            form="quiz-form"
            variant={question ? 'outline' : 'default'}
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
