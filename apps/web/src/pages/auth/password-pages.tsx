import { zodResolver } from '@hookform/resolvers/zod';
import { emailSchema, passwordSchema } from '@faixa-certa/shared';
import { useMutation } from '@tanstack/react-query';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useSearchParams } from 'react-router';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMessages } from '@/i18n';
import { api, errorMessage, unwrap } from '@/lib/api';
import { AuthShell } from './auth-shell';

export function ForgotPasswordPage() {
  const m = useMessages();
  const form = useForm<{ email: string }>({
    resolver: zodResolver(z.object({ email: emailSchema })),
  });
  const send = useMutation({
    mutationFn: async (email: string) =>
      unwrap<{ message: string }>(await api.POST('/v1/auth/password/forgot', { body: { email } })),
  });

  return (
    <AuthShell title={m.auth.forgotTitle}>
      {send.isSuccess ? (
        <p role="status" className="text-sm">
          {send.data.message}
        </p>
      ) : (
        <form
          onSubmit={form.handleSubmit(({ email }) => send.mutate(email))}
          className="space-y-4"
          noValidate
        >
          <div className="space-y-2">
            <Label htmlFor="email">{m.auth.email}</Label>
            <Input id="email" type="email" autoComplete="email" {...form.register('email')} />
            {form.formState.errors.email && (
              <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
            )}
          </div>
          {send.isError && (
            <p role="alert" className="text-sm text-destructive">
              {errorMessage(send.error)}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={send.isPending}>
            {send.isPending && <Loader2 className="animate-spin" aria-hidden />}
            {m.auth.forgotSubmit}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}

export function ResetPasswordPage() {
  const m = useMessages();
  const [params] = useSearchParams();
  const token = params.get('token');
  const schema = z
    .object({ password: passwordSchema, confirm: z.string() })
    .refine((v) => v.password === v.confirm, { path: ['confirm'], message: m.auth.resetMismatch });
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });
  const reset = useMutation({
    mutationFn: async (password: string) =>
      unwrap(await api.POST('/v1/auth/password/reset', { body: { token: token ?? '', password } })),
  });
  const { errors } = form.formState;

  return (
    <AuthShell title={m.auth.resetTitle}>
      {!token ? (
        <p className="text-sm text-destructive">{m.auth.missingToken}</p>
      ) : reset.isSuccess ? (
        <p role="status" className="flex items-center gap-2 text-sm text-success">
          <CheckCircle2 className="size-4" aria-hidden /> {m.auth.resetDone}
        </p>
      ) : (
        <form
          onSubmit={form.handleSubmit(({ password }) => reset.mutate(password))}
          className="space-y-4"
          noValidate
        >
          <div className="space-y-2">
            <Label htmlFor="password">{m.auth.resetNewPassword}</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              {...form.register('password')}
            />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">{m.auth.resetConfirm}</Label>
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              {...form.register('confirm')}
            />
            {errors.confirm && <p className="text-sm text-destructive">{errors.confirm.message}</p>}
          </div>
          {reset.isError && (
            <p role="alert" className="text-sm text-destructive">
              {errorMessage(reset.error)}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={reset.isPending}>
            {reset.isPending && <Loader2 className="animate-spin" aria-hidden />}
            {m.auth.resetSubmit}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
