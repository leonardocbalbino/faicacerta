import { zodResolver } from '@hookform/resolvers/zod';
import {
  articleInputSchema,
  type Article,
  type ArticleInput,
  type ContentVersionSummary,
  type Media,
  type PublicationStatus,
} from '@faixa-certa/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { ConfirmAction } from '@/components/confirm-button';
import { MediaField } from '@/components/media/media-picker';
import { PageHeader } from '@/components/page-header';
import { RichTextEditor } from '@/components/rich-text-editor';
import { StatusActions, StatusBadge } from '@/components/status';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { VersionHistory } from '@/components/version-history';
import { useMessages } from '@/i18n';
import { api, errorMessage, unwrap } from '@/lib/api';
import { keys, slugify, useCategoryOptions } from '@/lib/queries';

export function ArticleEditPage() {
  const m = useMessages();
  const { id } = useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const article = useQuery({
    queryKey: keys.article(id ?? 'novo'),
    enabled: !!id,
    queryFn: async () =>
      unwrap<Article>(await api.GET('/v1/admin/articles/{id}', { params: { path: { id: id! } } })),
  });

  const setArticle = (a: Article) => {
    qc.setQueryData(keys.article(a.id), a);
    void qc.invalidateQueries({ queryKey: keys.articles });
  };

  const back = (
    <Button asChild variant="link" className="h-auto p-0 text-muted-foreground">
      <Link to="/textos">
        <ArrowLeft aria-hidden /> {m.articles.title}
      </Link>
    </Button>
  );

  if (id && article.isLoading) return <Skeleton className="h-96" />;
  if (id && !article.data) return <p className="text-destructive">{errorMessage(article.error)}</p>;
  const a = article.data;

  const submit = async (values: ArticleInput) => {
    try {
      if (a) {
        setArticle(
          unwrap<Article>(
            await api.PATCH('/v1/admin/articles/{id}', {
              params: { path: { id: a.id } },
              body: values,
            }),
          ),
        );
        toast.success(m.common.saved);
      } else {
        const created = unwrap<Article>(await api.POST('/v1/admin/articles', { body: values }));
        setArticle(created);
        toast.success(m.articles.created);
        void navigate(`/textos/${created.id}`, { replace: true });
      }
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const changeStatus = async (status: PublicationStatus) =>
    setArticle(
      unwrap<Article>(
        await api.POST('/v1/admin/articles/{id}/status', {
          params: { path: { id: a!.id } },
          body: { status },
        }),
      ),
    );

  const remove = async () => {
    try {
      unwrap(await api.DELETE('/v1/admin/articles/{id}', { params: { path: { id: a!.id } } }));
      void qc.invalidateQueries({ queryKey: keys.articles });
      toast.success(m.common.deleted);
      void navigate('/textos');
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const form = <ArticleForm key={a?.updatedAt ?? 'new'} article={a} onSubmit={submit} />;

  return (
    <>
      <PageHeader
        backTo={back}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {a?.title ?? m.articles.new}
            {a && <StatusBadge status={a.status} />}
          </span>
        }
        actions={
          a && (
            <>
              <ConfirmAction
                onConfirm={remove}
                trigger={
                  <Button variant="outline" aria-label={m.common.delete}>
                    <Trash2 aria-hidden />
                  </Button>
                }
              />
              <StatusActions status={a.status} onChange={changeStatus} />
            </>
          )
        }
      />
      {a ? (
        <Tabs defaultValue="content" className="max-w-4xl">
          <TabsList>
            <TabsTrigger value="content">{m.techniques.tabs.content}</TabsTrigger>
            <TabsTrigger value="history">{m.techniques.tabs.history}</TabsTrigger>
          </TabsList>
          <div className="mt-4 rounded-lg border bg-card p-4 md:p-6">
            <TabsContent value="content">{form}</TabsContent>
            <TabsContent value="history">
              <VersionHistory
                queryKey={[...keys.article(a.id), 'versions', a.updatedAt]}
                load={async () =>
                  unwrap<ContentVersionSummary[]>(
                    await api.GET('/v1/admin/articles/{id}/versions', {
                      params: { path: { id: a.id } },
                    }),
                  )
                }
                restore={async (version) =>
                  setArticle(
                    unwrap<Article>(
                      await api.POST('/v1/admin/articles/{id}/versions/{version}/restore', {
                        params: { path: { id: a.id, version } },
                      }),
                    ),
                  )
                }
                onRestored={() => undefined}
              />
            </TabsContent>
          </div>
        </Tabs>
      ) : (
        <div className="max-w-4xl rounded-lg border bg-card p-4 md:p-6">{form}</div>
      )}
    </>
  );
}

function ArticleForm({
  article,
  onSubmit,
}: {
  article?: Article;
  onSubmit: (v: ArticleInput) => Promise<void>;
}) {
  const m = useMessages();
  const categories = useCategoryOptions();
  const [cover, setCover] = useState<Media | null>(article?.cover ?? null);
  const [slugTouched, setSlugTouched] = useState(!!article);
  const form = useForm<ArticleInput>({
    resolver: zodResolver(articleInputSchema),
    defaultValues: article
      ? {
          categoryId: article.categoryId,
          slug: article.slug,
          title: article.title,
          richContent: article.richContent,
          coverMediaId: article.cover?.id ?? null,
          order: article.order,
        }
      : { slug: '', title: '', richContent: { type: 'doc', content: [{ type: 'paragraph' }] } },
  });
  const { errors, isSubmitting } = form.formState;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="a-title">{m.articles.titleField}</Label>
          <Input
            id="a-title"
            aria-invalid={!!errors.title}
            {...form.register('title', {
              onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                if (!slugTouched) form.setValue('slug', slugify(e.target.value));
              },
            })}
          />
          {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="a-cat">{m.articles.category}</Label>
          <Controller
            control={form.control}
            name="categoryId"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="a-cat" aria-invalid={!!errors.categoryId}>
                  <SelectValue placeholder={m.articles.category} />
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
          {errors.categoryId && (
            <p className="text-sm text-destructive">{errors.categoryId.message}</p>
          )}
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="a-slug">{m.categories.slug}</Label>
          <Input
            id="a-slug"
            className="font-mono"
            aria-invalid={!!errors.slug}
            {...form.register('slug', { onChange: () => setSlugTouched(true) })}
          />
          {errors.slug && <p className="text-sm text-destructive">{errors.slug.message}</p>}
        </div>
      </div>
      <div className="space-y-2">
        <Label>{m.articles.cover}</Label>
        <MediaField
          label={m.articles.cover}
          accept={['IMAGE']}
          value={cover}
          onChange={(media) => {
            setCover(media);
            form.setValue('coverMediaId', media?.id ?? null, { shouldDirty: true });
          }}
        />
      </div>
      <div className="space-y-2">
        <Label id="a-body-label">{m.articles.body}</Label>
        <Controller
          control={form.control}
          name="richContent"
          render={({ field }) => (
            <RichTextEditor
              aria-labelledby="a-body-label"
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
      </div>
      <div className="border-t pt-4">
        <Button type="submit" disabled={isSubmitting || (!!article && !form.formState.isDirty)}>
          {isSubmitting && <Loader2 className="animate-spin" aria-hidden />}
          {isSubmitting ? m.common.saving : article ? m.common.save : m.common.create}
        </Button>
      </div>
    </form>
  );
}
