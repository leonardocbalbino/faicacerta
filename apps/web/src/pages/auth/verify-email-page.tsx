import { useMutation } from '@tanstack/react-query';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { useMessages } from '@/i18n';
import { api, errorMessage, unwrap } from '@/lib/api';
import { AuthShell } from './auth-shell';

export function VerifyEmailPage() {
  const m = useMessages();
  const [params] = useSearchParams();
  const token = params.get('token');
  const verify = useMutation({
    mutationFn: async (t: string) =>
      unwrap(await api.POST('/v1/auth/verify-email', { body: { token: t } })),
  });

  useEffect(() => {
    if (token && verify.isIdle) verify.mutate(token);
  }, [token, verify]);

  return (
    <AuthShell title={m.auth.verifyTitle}>
      <div role="status" aria-live="polite" className="space-y-2 text-sm">
        {!token && <p className="text-destructive">{m.auth.missingToken}</p>}
        {verify.isPending && (
          <p className="flex items-center gap-2">
            <Loader2 className="size-4 animate-spin" aria-hidden /> {m.auth.verifying}
          </p>
        )}
        {verify.isSuccess && (
          <p className="flex items-center gap-2 text-success">
            <CheckCircle2 className="size-4" aria-hidden /> {m.auth.verified}
          </p>
        )}
        {verify.isError && <p className="text-destructive">{errorMessage(verify.error)}</p>}
      </div>
    </AuthShell>
  );
}
