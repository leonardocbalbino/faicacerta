import {
  adsConfigSchema,
  type AdminEntitlement,
  type AdminPaymentPage,
  type AdsConfig,
  type EntitlementType,
  type GatewayInput,
  type GatewayView,
  type NoAdsSettings,
} from '@faixa-certa/shared';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMessages } from '@/i18n';
import { api, errorMessage, unwrap } from '@/lib/api';

const brl = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dateTime = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—';

/** Monetização (Etapa 6): anúncios, Sem Anúncios, pagamentos, acessos e Pix. Só ADMIN. */
export function MonetizationPage() {
  const m = useMessages().monetization;
  return (
    <>
      <PageHeader title={m.title} subtitle={m.subtitle} />
      <Tabs defaultValue="ads">
        <TabsList className="mb-4 flex-wrap">
          <TabsTrigger value="ads">{m.tabs.ads}</TabsTrigger>
          <TabsTrigger value="no-ads">{m.tabs.noAds}</TabsTrigger>
          <TabsTrigger value="payments">{m.tabs.payments}</TabsTrigger>
          <TabsTrigger value="access">{m.tabs.access}</TabsTrigger>
          <TabsTrigger value="gateway">{m.tabs.gateway}</TabsTrigger>
        </TabsList>
        <TabsContent value="ads">
          <AdsTab />
        </TabsContent>
        <TabsContent value="no-ads">
          <NoAdsTab />
        </TabsContent>
        <TabsContent value="payments">
          <PaymentsTab />
        </TabsContent>
        <TabsContent value="access">
          <AccessTab />
        </TabsContent>
        <TabsContent value="gateway">
          <GatewayTab />
        </TabsContent>
      </Tabs>
    </>
  );
}

function Panel({ children }: { children: ReactNode }) {
  return (
    <section className="max-w-2xl space-y-5 rounded-2xl border bg-card p-6">{children}</section>
  );
}

function Field({
  label,
  hint,
  children,
  id,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  id: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function SwitchRow({
  id,
  label,
  hint,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <Label htmlFor={id}>{label}</Label>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

// -----------------------------------------------------------------------------

function AdsTab() {
  const m = useMessages().monetization;
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['admin', 'ads'],
    queryFn: async () => unwrap<AdsConfig>(await api.GET('/v1/admin/monetization/ads')),
  });
  const [form, setForm] = useState<AdsConfig | null>(null);
  useEffect(() => {
    if (query.data) setForm(query.data);
  }, [query.data]);

  const save = useMutation({
    mutationFn: async (value: AdsConfig) =>
      unwrap<AdsConfig>(await api.PUT('/v1/admin/monetization/ads', { body: value })),
    onSuccess: (data) => {
      qc.setQueryData(['admin', 'ads'], data);
      toast.success(m.saved);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  if (!form) return <Loader2 className="animate-spin" aria-label="Carregando" />;
  const parsed = adsConfigSchema.safeParse(form);
  const isTest = JSON.stringify(form.units).includes('3940256099942544');
  const unit = (platform: 'ios' | 'android', kind: 'banner' | 'interstitial') => (
    <Input
      id={`${platform}-${kind}`}
      value={form.units[platform][kind]}
      onChange={(e) =>
        setForm({
          ...form,
          units: { ...form.units, [platform]: { ...form.units[platform], [kind]: e.target.value } },
        })
      }
      className="font-mono text-xs"
    />
  );

  return (
    <Panel>
      {isTest && (
        <p className="flex gap-2 rounded-lg bg-amber-500/10 p-3 text-sm text-amber-600 dark:text-amber-400">
          <AlertTriangle className="size-4 shrink-0" aria-hidden /> {m.testIdsWarning}
        </p>
      )}
      <SwitchRow
        id="ads-enabled"
        label={m.adsEnabled}
        hint={m.adsEnabledHint}
        checked={form.enabled}
        onChange={(v) => setForm({ ...form, enabled: v })}
      />
      <div className="space-y-1">
        <h2 className="font-semibold">{m.adUnits}</h2>
        <p className="text-xs text-muted-foreground">{m.adUnitsHint}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="ios-banner" label={`iOS · ${m.banner}`}>
          {unit('ios', 'banner')}
        </Field>
        <Field id="ios-interstitial" label={`iOS · ${m.interstitial}`}>
          {unit('ios', 'interstitial')}
        </Field>
        <Field id="android-banner" label={`Android · ${m.banner}`}>
          {unit('android', 'banner')}
        </Field>
        <Field id="android-interstitial" label={`Android · ${m.interstitial}`}>
          {unit('android', 'interstitial')}
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="every-n" label={m.everyN}>
          <Input
            id="every-n"
            type="number"
            min={0}
            max={50}
            value={form.interstitialEveryNScreens}
            onChange={(e) =>
              setForm({ ...form, interstitialEveryNScreens: Number(e.target.value) })
            }
          />
        </Field>
        <Field id="min-interval" label={m.minInterval}>
          <Input
            id="min-interval"
            type="number"
            min={30}
            max={3600}
            value={form.interstitialMinIntervalSeconds}
            onChange={(e) =>
              setForm({ ...form, interstitialMinIntervalSeconds: Number(e.target.value) })
            }
          />
        </Field>
      </div>
      {!parsed.success && (
        <p className="text-sm text-destructive">{parsed.error.issues[0]?.message}</p>
      )}
      <Button
        disabled={!parsed.success || save.isPending}
        onClick={() => parsed.success && save.mutate(parsed.data)}
      >
        {save.isPending && <Loader2 className="animate-spin" aria-hidden />} {m.save}
      </Button>
    </Panel>
  );
}

// -----------------------------------------------------------------------------

function NoAdsTab() {
  const m = useMessages().monetization;
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['admin', 'no-ads'],
    queryFn: async () => unwrap<NoAdsSettings>(await api.GET('/v1/admin/monetization/no-ads')),
  });
  const [sales, setSales] = useState(true);
  const [price, setPrice] = useState('10,00');
  useEffect(() => {
    if (!query.data) return;
    setSales(query.data.salesEnabled);
    setPrice((query.data.priceCents / 100).toFixed(2).replace('.', ','));
  }, [query.data]);

  const cents = Math.round(Number(price.replace(/\./g, '').replace(',', '.')) * 100);
  const save = useMutation({
    mutationFn: async () =>
      unwrap<NoAdsSettings>(
        await api.PUT('/v1/admin/monetization/no-ads', {
          body: { salesEnabled: sales, priceCents: cents },
        }),
      ),
    onSuccess: (data) => {
      qc.setQueryData(['admin', 'no-ads'], data);
      toast.success(m.saved);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <Panel>
      <SwitchRow id="sales" label={m.salesEnabled} checked={sales} onChange={setSales} />
      <Field id="price" label={m.price} hint={m.priceHint}>
        <Input
          id="price"
          inputMode="decimal"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="max-w-40"
        />
      </Field>
      <Button
        disabled={!Number.isFinite(cents) || cents < 100 || save.isPending}
        onClick={() => save.mutate()}
      >
        {save.isPending && <Loader2 className="animate-spin" aria-hidden />} {m.save}
      </Button>
    </Panel>
  );
}

// -----------------------------------------------------------------------------

function PaymentsTab() {
  const m = useMessages().monetization;
  const list = useInfiniteQuery({
    queryKey: ['admin', 'payments'],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) =>
      unwrap<AdminPaymentPage>(
        await api.GET('/v1/admin/monetization/payments', {
          params: { query: { cursor: pageParam, limit: 30 } },
        }),
      ),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
  const items = list.data?.pages.flatMap((p) => p.items) ?? [];
  const totals = list.data?.pages[0]?.paidLast30Days;

  return (
    <div className="space-y-4">
      {totals && (
        <div className="inline-flex flex-col rounded-2xl border bg-card px-5 py-4">
          <span className="text-xs text-muted-foreground">{m.paid30}</span>
          <span className="font-display text-2xl font-extrabold">
            {brl(totals.amountCents)}{' '}
            <span className="text-base font-medium text-muted-foreground">· {totals.count}</span>
          </span>
        </div>
      )}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{m.date}</TableHead>
              <TableHead>{m.user}</TableHead>
              <TableHead>{m.provider}</TableHead>
              <TableHead>{m.amount}</TableHead>
              <TableHead>{m.status}</TableHead>
              <TableHead>{m.paidAt}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="whitespace-nowrap">{dateTime(p.createdAt)}</TableCell>
                <TableCell>
                  <div className="font-medium">{p.user.name}</div>
                  <div className="text-xs text-muted-foreground">{p.user.email ?? '—'}</div>
                </TableCell>
                <TableCell>{m.providers[p.provider]}</TableCell>
                <TableCell>{brl(p.amountCents)}</TableCell>
                <TableCell>
                  <Badge variant={p.status === 'PAID' ? 'default' : 'outline'}>
                    {m.statuses[p.status]}
                  </Badge>
                </TableCell>
                <TableCell className="whitespace-nowrap">{dateTime(p.paidAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {list.hasNextPage && (
        <Button
          variant="outline"
          onClick={() => void list.fetchNextPage()}
          disabled={list.isFetchingNextPage}
        >
          {m.loadMore}
        </Button>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------

function AccessTab() {
  const m = useMessages().monetization;
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ['admin', 'entitlements'],
    queryFn: async () =>
      unwrap<AdminEntitlement[]>(await api.GET('/v1/admin/monetization/entitlements')),
  });
  const [email, setEmail] = useState('');
  const [type, setType] = useState<EntitlementType>('NO_ADS');
  const [reason, setReason] = useState('');

  const grant = useMutation({
    mutationFn: async () =>
      unwrap<void>(
        await api.POST('/v1/admin/monetization/entitlements', { body: { email, type, reason } }),
      ),
    onSuccess: () => {
      toast.success(m.granted);
      setEmail('');
      setReason('');
      void qc.invalidateQueries({ queryKey: ['admin', 'entitlements'] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const revoke = useMutation({
    mutationFn: async (id: string) =>
      unwrap<void>(
        await api.DELETE('/v1/admin/monetization/entitlements/{id}', { params: { path: { id } } }),
      ),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin', 'entitlements'] }),
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <div className="space-y-6">
      <Panel>
        <div>
          <h2 className="font-semibold">{m.grantTitle}</h2>
          <p className="text-xs text-muted-foreground">{m.grantHint}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
          <Field id="grant-email" label={m.email}>
            <Input
              id="grant-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field id="grant-type" label={m.type}>
            <select
              id="grant-type"
              value={type}
              onChange={(e) => setType(e.target.value as EntitlementType)}
              className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
            >
              <option value="NO_ADS">{m.entitlementTypes.NO_ADS}</option>
              <option value="PRO">{m.entitlementTypes.PRO}</option>
            </select>
          </Field>
        </div>
        <Field id="grant-reason" label={m.reason}>
          <Input id="grant-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
        <Button
          disabled={!email || reason.trim().length < 3 || grant.isPending}
          onClick={() => grant.mutate()}
        >
          {m.grant}
        </Button>
      </Panel>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{m.user}</TableHead>
              <TableHead>{m.type}</TableHead>
              <TableHead>{m.source}</TableHead>
              <TableHead>{m.reason}</TableHead>
              <TableHead>{m.date}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {(list.data ?? []).map((e) => (
              <TableRow key={e.id}>
                <TableCell>
                  <div className="font-medium">{e.user.name}</div>
                  <div className="text-xs text-muted-foreground">{e.user.email ?? '—'}</div>
                </TableCell>
                <TableCell>{m.entitlementTypes[e.type]}</TableCell>
                <TableCell>{m.sources[e.source as keyof typeof m.sources] ?? e.source}</TableCell>
                <TableCell className="max-w-60 truncate">{e.reason ?? '—'}</TableCell>
                <TableCell className="whitespace-nowrap">{dateTime(e.startsAt)}</TableCell>
                <TableCell className="text-right">
                  {e.revokedAt ? (
                    <Badge variant="outline">{m.revoked}</Badge>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => revoke.mutate(e.id)}
                      disabled={revoke.isPending}
                    >
                      {m.revoke}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------

function GatewayTab() {
  const m = useMessages().monetization;
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['admin', 'gateway'],
    queryFn: async () => unwrap<GatewayView>(await api.GET('/v1/admin/monetization/gateway')),
  });
  const [form, setForm] = useState<GatewayInput>({
    environment: 'SANDBOX',
    apiKey: '',
    webhookToken: '',
    pixExpirationMinutes: 30,
    isActive: false,
  });
  useEffect(() => {
    if (!query.data) return;
    setForm((f) => ({
      ...f,
      environment: query.data.environment,
      pixExpirationMinutes: query.data.pixExpirationMinutes,
      isActive: query.data.isActive,
    }));
  }, [query.data]);

  const save = useMutation({
    mutationFn: async () =>
      unwrap<GatewayView>(
        await api.PUT('/v1/admin/monetization/gateway', {
          body: {
            ...form,
            apiKey: form.apiKey || undefined,
            webhookToken: form.webhookToken || undefined,
          },
        }),
      ),
    onSuccess: (data) => {
      qc.setQueryData(['admin', 'gateway'], data);
      setForm((f) => ({ ...f, apiKey: '', webhookToken: '' }));
      toast.success(m.saved);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const view = query.data;

  return (
    <Panel>
      <Field id="gw-env" label={m.environment}>
        <select
          id="gw-env"
          value={form.environment}
          onChange={(e) =>
            setForm({ ...form, environment: e.target.value as GatewayInput['environment'] })
          }
          className="h-9 w-full max-w-60 rounded-md border bg-transparent px-3 text-sm"
        >
          <option value="SANDBOX">{m.sandbox}</option>
          <option value="PRODUCTION">{m.production}</option>
        </select>
      </Field>
      <Field id="gw-key" label={`${m.apiKey}${view?.hasApiKey ? ' ✓' : ''}`} hint={m.apiKeyHint}>
        <Input
          id="gw-key"
          type="password"
          autoComplete="off"
          value={form.apiKey}
          onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
        />
      </Field>
      <Field id="gw-token" label={`${m.webhookToken}${view?.hasWebhookToken ? ' ✓' : ''}`}>
        <Input
          id="gw-token"
          type="password"
          autoComplete="off"
          value={form.webhookToken}
          onChange={(e) => setForm({ ...form, webhookToken: e.target.value })}
        />
      </Field>
      {view && (
        <Field id="gw-url" label={m.webhookUrl}>
          <Input
            id="gw-url"
            readOnly
            value={view.webhookUrl}
            className="font-mono text-xs"
            onFocus={(e) => e.target.select()}
          />
        </Field>
      )}
      <Field id="gw-minutes" label={m.pixMinutes}>
        <Input
          id="gw-minutes"
          type="number"
          min={5}
          max={1440}
          value={form.pixExpirationMinutes}
          onChange={(e) => setForm({ ...form, pixExpirationMinutes: Number(e.target.value) })}
          className="max-w-40"
        />
      </Field>
      <SwitchRow
        id="gw-active"
        label={m.gatewayActive}
        checked={form.isActive}
        onChange={(v) => setForm({ ...form, isActive: v })}
      />
      {view && (
        <p className="text-xs text-muted-foreground">
          {m.lastWebhook}: {view.lastWebhookAt ? dateTime(view.lastWebhookAt) : m.never}
          {view.lastWebhookError && (
            <span className="block text-destructive">{view.lastWebhookError}</span>
          )}
        </p>
      )}
      <Button disabled={save.isPending} onClick={() => save.mutate()}>
        {save.isPending && <Loader2 className="animate-spin" aria-hidden />} {m.save}
      </Button>
    </Panel>
  );
}
