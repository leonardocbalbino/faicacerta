import { formatCpf, type AppConfig, type Me, type PixCharge } from '@faixa-certa/shared';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Copy, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMessages } from '@/i18n';
import { api, errorMessage, unwrap } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { AuthShell } from '../auth/auth-shell';

const brl = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fill = (s: string, vars: Record<string, string>) =>
  s.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? '');

/**
 * Compra do Sem Anúncios por Pix no site (/sem-anuncios). O app não menciona
 * esta página (regras das lojas); a compra vale para a conta inteira.
 */
export function BuyPage() {
  const m = useMessages().buy;
  const { status, user, logout } = useAuth();
  const config = useQuery({
    queryKey: ['config'],
    queryFn: async () => unwrap<AppConfig>(await api.GET('/v1/config')),
  });
  const price = config.data ? brl(config.data.noAds.priceCents) : '';

  return (
    <AuthShell title={m.title} subtitle={m.subtitle}>
      {status === 'loading' || config.isLoading ? (
        <Loader2 className="animate-spin" aria-label="Carregando" />
      ) : status !== 'authenticated' || !user ? (
        <InlineLogin />
      ) : (
        <div className="space-y-5">
          <p className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
            {fill(m.account, { email: user.email ?? user.name })}
            <button type="button" className="font-medium underline" onClick={() => void logout()}>
              {m.logout}
            </button>
          </p>
          {user.entitlements.includes('NO_ADS') ? (
            <Done text={m.owned} />
          ) : !config.data?.noAds.salesEnabled ? (
            <p className="text-muted-foreground">{m.salesOff}</p>
          ) : (
            <Checkout user={user} price={price} />
          )}
        </div>
      )}
    </AuthShell>
  );
}

function Done({ text, title }: { text: string; title?: string }) {
  return (
    <div className="space-y-2 rounded-2xl border border-primary bg-card p-5">
      <CheckCircle2 className="size-8 text-primary" aria-hidden />
      {title && <h2 className="text-xl font-extrabold">{title}</h2>}
      <p className="text-muted-foreground">{text}</p>
    </div>
  );
}

function InlineLogin() {
  const m = useMessages();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
          await login(email, password);
        } catch (err) {
          setError(errorMessage(err));
        } finally {
          setBusy(false);
        }
      }}
    >
      <p className="text-sm text-muted-foreground">{m.buy.loginHint}</p>
      <div className="space-y-2">
        <Label htmlFor="email">{m.auth.email}</Label>
        <Input
          id="email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">{m.auth.password}</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full" disabled={busy || !email || !password}>
        {busy && <Loader2 className="animate-spin" aria-hidden />} {m.auth.login}
      </Button>
      <p className="text-xs text-muted-foreground">
        {m.buy.loginWithApple}{' '}
        <Link to="/esqueci-senha" className="underline">
          {m.auth.forgot}
        </Link>
      </p>
    </form>
  );
}

function Checkout({ user, price }: { user: Me; price: string }) {
  const m = useMessages().buy;
  const { refreshUser } = useAuthRefresh();
  const [cpf, setCpf] = useState('');
  const [charge, setCharge] = useState<PixCharge | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());

  // Acompanha o pagamento enquanto o Pix está pendente.
  useEffect(() => {
    if (charge?.status !== 'PENDING') return;
    const tick = setInterval(() => setNow(Date.now()), 1000);
    const poll = setInterval(async () => {
      try {
        const next = unwrap<PixCharge>(
          await api.GET('/v1/billing/payments/{id}', {
            params: { path: { id: charge.paymentId } },
          }),
        );
        setCharge(next);
        if (next.status === 'PAID') void refreshUser();
      } catch {
        /* tenta de novo no próximo ciclo */
      }
    }, 4000);
    return () => {
      clearInterval(tick);
      clearInterval(poll);
    };
  }, [charge?.status, charge?.paymentId, refreshUser]);

  if (charge?.status === 'PAID') return <Done title={m.paidTitle} text={m.paidBody} />;

  if (charge?.status === 'PENDING' && charge.copiaECola) {
    const left = charge.expiresAt ? Math.max(0, new Date(charge.expiresAt).getTime() - now) : null;
    const mmss =
      left === null
        ? ''
        : `${Math.floor(left / 60000)}:${String(Math.floor((left % 60000) / 1000)).padStart(2, '0')}`;
    return (
      <div className="flex flex-col items-center gap-4">
        {charge.qrCodeBase64 && (
          <img
            src={`data:image/png;base64,${charge.qrCodeBase64}`}
            alt="QR code Pix"
            className="size-60 rounded-3xl bg-white p-4"
          />
        )}
        <span className="text-3xl font-extrabold">{brl(charge.amountCents)}</span>
        <Button
          variant="outline"
          className="w-full"
          onClick={async () => {
            await navigator.clipboard.writeText(charge.copiaECola ?? '');
            toast.success(m.copied);
          }}
        >
          <Copy aria-hidden /> {m.copy}
        </Button>
        <div className="flex w-full items-center gap-3 rounded-2xl bg-card p-4" role="status">
          <span className="size-2.5 animate-pulse rounded-full bg-primary" aria-hidden />
          <span className="flex-1 text-sm">{m.waiting}</span>
          {mmss && (
            <span className="text-sm tabular-nums text-muted-foreground">
              {fill(m.expiresIn, { time: mmss })}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
          setCharge(unwrap<PixCharge>(await api.POST('/v1/billing/pix', { body: { cpf } })));
        } catch (err) {
          setError(errorMessage(err));
        } finally {
          setBusy(false);
        }
      }}
    >
      {charge && charge.status !== 'PENDING' && (
        <p className="text-sm text-muted-foreground">{m.expired}</p>
      )}
      <div className="space-y-2">
        <Label htmlFor="cpf">{m.cpf}</Label>
        <Input
          id="cpf"
          inputMode="numeric"
          autoComplete="off"
          value={cpf}
          onChange={(e) => setCpf(formatCpf(e.target.value.replace(/\D/g, '').slice(0, 11)))}
          placeholder="000.000.000-00"
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button
        type="submit"
        className="h-12 w-full text-base"
        disabled={busy || cpf.replace(/\D/g, '').length !== 11}
      >
        {busy && <Loader2 className="animate-spin" aria-hidden />} {fill(m.generate, { price })}
      </Button>
      <p className="sr-only">{user.name}</p>
    </form>
  );
}

/** Recarrega o usuário (para refletir o Sem Anúncios recém-comprado). */
function useAuthRefresh() {
  const { refresh } = useAuth();
  return { refreshUser: refresh };
}
