import { zodResolver } from '@hookform/resolvers/zod';
import { techniqueInputSchema, type Media, type TechniqueDetail } from '@faixa-certa/shared';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { MediaField } from '@/components/media/media-picker';
import { RichTextEditor } from '@/components/rich-text-editor';
import { StringListEditor } from '@/components/string-list-editor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useMessages } from '@/i18n';
import { ApiError } from '@/lib/api';
import { slugify, useCategoryOptions } from '@/lib/queries';

const formSchema = techniqueInputSchema.extend({ comment: z.string().max(500).optional() });
type FormIn = z.input<typeof formSchema>;
export type TechniqueFormValues = z.output<typeof formSchema>;

/** Formulário do conteúdo da técnica, usado na criação e na edição. */
export function TechniqueForm({
  technique,
  onSubmit,
}: {
  technique?: TechniqueDetail;
  onSubmit: (values: TechniqueFormValues) => Promise<unknown>;
}) {
  const m = useMessages();
  const categories = useCategoryOptions();
  const [audio, setAudio] = useState<Media | null>(technique?.pronunciationAudio ?? null);
  const [slugTouched, setSlugTouched] = useState(!!technique);

  const form = useForm<FormIn, unknown, TechniqueFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: technique
      ? {
          slug: technique.slug,
          categoryId: technique.categoryId,
          japaneseName: technique.japaneseName,
          japaneseScript: technique.japaneseScript ?? '',
          translation: technique.translation,
          pronunciationAudioId: technique.pronunciationAudio?.id ?? null,
          richContent: technique.richContent,
          keyPoints: technique.keyPoints,
          commonMistakes: technique.commonMistakes,
          examinerCriteria: technique.examinerCriteria ?? '',
          comment: '',
        }
      : { slug: '', japaneseName: '', translation: '', keyPoints: [], commonMistakes: [] },
  });
  const { errors, isSubmitting } = form.formState;

  const submit = form.handleSubmit(async (values) => {
    try {
      await onSubmit(values);
      form.reset({ ...values, comment: '' });
    } catch (err) {
      // Erros de campo da API aparecem no próprio campo.
      if (err instanceof ApiError) {
        Object.entries(err.fieldErrors()).forEach(([path, message]) =>
          form.setError(path as keyof FormIn, { message }),
        );
      }
      throw err;
    }
  });

  const field = (name: keyof FormIn) => ({
    id: `t-${name}`,
    'aria-invalid': !!errors[name],
    'aria-describedby': errors[name] ? `t-${name}-error` : undefined,
  });
  const error = (name: keyof FormIn) =>
    errors[name] ? (
      <p id={`t-${name}-error`} className="text-sm text-destructive">
        {String(errors[name]?.message ?? '')}
      </p>
    ) : null;

  return (
    <form onSubmit={(e) => void submit(e).catch(() => undefined)} className="space-y-6" noValidate>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="t-japaneseName">{m.techniques.japaneseName}</Label>
          <Input
            {...field('japaneseName')}
            {...form.register('japaneseName', {
              onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                if (!slugTouched) form.setValue('slug', slugify(e.target.value));
              },
            })}
          />
          {error('japaneseName')}
        </div>
        <div className="space-y-2">
          <Label htmlFor="t-japaneseScript">
            {m.techniques.japaneseScript}{' '}
            <span className="text-muted-foreground">({m.common.optional})</span>
          </Label>
          <Input lang="ja" {...field('japaneseScript')} {...form.register('japaneseScript')} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="t-translation">{m.techniques.translation}</Label>
          <Input {...field('translation')} {...form.register('translation')} />
          {error('translation')}
        </div>
        <div className="space-y-2">
          <Label htmlFor="t-categoryId">{m.techniques.category}</Label>
          <Controller
            control={form.control}
            name="categoryId"
            render={({ field: f }) => (
              <Select value={f.value} onValueChange={f.onChange}>
                <SelectTrigger id="t-categoryId" aria-invalid={!!errors.categoryId}>
                  <SelectValue placeholder={m.techniques.category} />
                </SelectTrigger>
                <SelectContent>
                  {categories.options.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {error('categoryId')}
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="t-slug">{m.categories.slug}</Label>
          <Input
            {...field('slug')}
            {...form.register('slug', { onChange: () => setSlugTouched(true) })}
            className="font-mono"
          />
          <p className="text-xs text-muted-foreground">{m.categories.slugHint}</p>
          {error('slug')}
        </div>
      </div>

      <div className="space-y-2">
        <Label>{m.techniques.pronunciation}</Label>
        <MediaField
          label={m.techniques.pronunciation}
          accept={['AUDIO']}
          value={audio}
          onChange={(media) => {
            setAudio(media);
            form.setValue('pronunciationAudioId', media?.id ?? null, { shouldDirty: true });
          }}
        />
      </div>

      <div className="space-y-2">
        <Label id="t-content-label">{m.techniques.content}</Label>
        <Controller
          control={form.control}
          name="richContent"
          render={({ field: f }) => (
            <RichTextEditor
              aria-labelledby="t-content-label"
              value={f.value ?? null}
              onChange={f.onChange}
              placeholder={m.techniques.contentPlaceholder}
            />
          )}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="t-keyPoints">{m.techniques.keyPoints}</Label>
          <Controller
            control={form.control}
            name="keyPoints"
            render={({ field: f }) => (
              <StringListEditor id="t-keyPoints" value={f.value ?? []} onChange={f.onChange} />
            )}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="t-commonMistakes">{m.techniques.commonMistakes}</Label>
          <Controller
            control={form.control}
            name="commonMistakes"
            render={({ field: f }) => (
              <StringListEditor id="t-commonMistakes" value={f.value ?? []} onChange={f.onChange} />
            )}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="t-examinerCriteria">{m.techniques.examinerCriteria}</Label>
        <Textarea rows={3} {...field('examinerCriteria')} {...form.register('examinerCriteria')} />
      </div>

      <div className="flex flex-wrap items-end gap-3 border-t pt-4">
        {technique && (
          <div className="min-w-60 flex-1 space-y-2">
            <Label htmlFor="t-comment">{m.techniques.comment}</Label>
            <Input
              {...field('comment')}
              placeholder={m.techniques.commentPlaceholder}
              {...form.register('comment')}
            />
          </div>
        )}
        <Button type="submit" disabled={isSubmitting || (!!technique && !form.formState.isDirty)}>
          {isSubmitting && <Loader2 className="animate-spin" aria-hidden />}
          {isSubmitting ? m.common.saving : technique ? m.common.save : m.common.create}
        </Button>
      </div>
    </form>
  );
}
