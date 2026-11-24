import type {
  ContentVersionSummary,
  PublicationStatus,
  TechniqueDetail,
} from '@faixa-certa/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { ConfirmAction } from '@/components/confirm-button';
import { PageHeader } from '@/components/page-header';
import { StatusActions, StatusBadge } from '@/components/status';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { VersionHistory } from '@/components/version-history';
import { fmt, useMessages } from '@/i18n';
import { api, errorMessage, unwrap } from '@/lib/api';
import { keys } from '@/lib/queries';
import { TechniqueForm, type TechniqueFormValues } from './technique-form';
import { TechniqueMediaTab } from './technique-media-tab';
import { TechniqueRelatedTab } from './technique-related-tab';

const isBusy = (t: TechniqueDetail) =>
  t.media.some((x) => x.media.status === 'UPLOADED' || x.media.status === 'PROCESSING');

export function TechniqueEditPage() {
  const m = useMessages();
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const technique = useQuery({
    queryKey: keys.technique(id ?? 'nova'),
    enabled: !!id,
    queryFn: async () =>
      unwrap<TechniqueDetail>(
        await api.GET('/v1/admin/techniques/{id}', { params: { path: { id: id! } } }),
      ),
    // Acompanha o processamento dos vídeos enviados.
    refetchInterval: (q) => (q.state.data && isBusy(q.state.data) ? 3000 : false),
  });

  const setDetail = (t: TechniqueDetail) => {
    qc.setQueryData(keys.technique(t.id), t);
    void qc.invalidateQueries({ queryKey: [...keys.techniques, 'list'] });
    void qc.invalidateQueries({ queryKey: [...keys.technique(t.id), 'versions'] });
  };

  const back = (
    <Button asChild variant="link" className="h-auto p-0 text-muted-foreground">
      <Link to="/tecnicas">
        <ArrowLeft aria-hidden /> {m.techniques.title}
      </Link>
    </Button>
  );

  // ---------------------------------------------------------------------------
  // Criação
  // ---------------------------------------------------------------------------
  if (!id) {
    const create = async ({ comment: _c, ...values }: TechniqueFormValues) => {
      try {
        const t = unwrap<TechniqueDetail>(await api.POST('/v1/admin/techniques', { body: values }));
        toast.success(m.techniques.created);
        setDetail(t);
        void navigate(`/tecnicas/${t.id}`, { replace: true });
      } catch (err) {
        toast.error(errorMessage(err));
        throw err;
      }
    };
    return (
      <>
        <PageHeader title={m.techniques.new} backTo={back} />
        <div className="max-w-4xl rounded-lg border bg-card p-4 md:p-6">
          <TechniqueForm onSubmit={create} />
        </div>
      </>
    );
  }

  // ---------------------------------------------------------------------------
  // Edição
  // ---------------------------------------------------------------------------
  if (technique.isLoading) return <Skeleton className="h-96" />;
  if (technique.isError || !technique.data) {
    return <p className="text-destructive">{errorMessage(technique.error)}</p>;
  }
  const t = technique.data;

  const save = async (values: TechniqueFormValues) => {
    try {
      setDetail(
        unwrap<TechniqueDetail>(
          await api.PATCH('/v1/admin/techniques/{id}', {
            params: { path: { id: t.id } },
            body: { ...values, comment: values.comment || undefined },
          }),
        ),
      );
      toast.success(m.common.saved);
    } catch (err) {
      toast.error(errorMessage(err));
      throw err;
    }
  };

  const changeStatus = async (status: PublicationStatus) =>
    setDetail(
      unwrap<TechniqueDetail>(
        await api.POST('/v1/admin/techniques/{id}/status', {
          params: { path: { id: t.id } },
          body: { status },
        }),
      ),
    );

  const remove = async () => {
    try {
      unwrap(await api.DELETE('/v1/admin/techniques/{id}', { params: { path: { id: t.id } } }));
      toast.success(m.common.deleted);
      void qc.invalidateQueries({ queryKey: keys.techniques });
      void navigate('/tecnicas');
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <>
      <PageHeader
        backTo={back}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {t.japaneseName}
            {t.japaneseScript && (
              <span lang="ja" className="text-xl font-normal text-muted-foreground">
                {t.japaneseScript}
              </span>
            )}
            <StatusBadge status={t.status} />
            <span className="text-sm font-normal text-muted-foreground">
              {fmt(m.techniques.version, { n: t.version })}
            </span>
          </span>
        }
        subtitle={t.translation}
        actions={
          <>
            <ConfirmAction
              onConfirm={remove}
              trigger={
                <Button variant="outline" aria-label={m.common.delete}>
                  <Trash2 aria-hidden />
                </Button>
              }
            />
            <StatusActions status={t.status} onChange={changeStatus} />
          </>
        }
      />

      {t.belts.length > 0 && (
        <p className="mb-4 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          {m.techniques.usedInBelts}:
          {t.belts.map((b) => (
            <span key={b.id} className="rounded-full border px-2 py-0.5">
              {b.name} · {b.programName}
            </span>
          ))}
        </p>
      )}

      <Tabs defaultValue="content" className="max-w-5xl">
        <TabsList>
          <TabsTrigger value="content">{m.techniques.tabs.content}</TabsTrigger>
          <TabsTrigger value="media">
            {m.techniques.tabs.media} ({t.media.length})
          </TabsTrigger>
          <TabsTrigger value="related">
            {m.techniques.tabs.related} ({t.related.length})
          </TabsTrigger>
          <TabsTrigger value="history">{m.techniques.tabs.history}</TabsTrigger>
        </TabsList>
        <div className="mt-4 rounded-lg border bg-card p-4 md:p-6">
          <TabsContent value="content">
            <TechniqueForm key={t.version} technique={t} onSubmit={save} />
          </TabsContent>
          <TabsContent value="media">
            <TechniqueMediaTab technique={t} onSaved={setDetail} />
          </TabsContent>
          <TabsContent value="related">
            <TechniqueRelatedTab key={t.version} technique={t} onSaved={setDetail} />
          </TabsContent>
          <TabsContent value="history">
            <VersionHistory
              queryKey={[...keys.technique(t.id), 'versions', t.version]}
              load={async () =>
                unwrap<ContentVersionSummary[]>(
                  await api.GET('/v1/admin/techniques/{id}/versions', {
                    params: { path: { id: t.id } },
                  }),
                )
              }
              restore={async (version) =>
                setDetail(
                  unwrap<TechniqueDetail>(
                    await api.POST('/v1/admin/techniques/{id}/versions/{version}/restore', {
                      params: { path: { id: t.id, version } },
                    }),
                  ),
                )
              }
              onRestored={() => undefined}
            />
          </TabsContent>
        </div>
      </Tabs>
    </>
  );
}
