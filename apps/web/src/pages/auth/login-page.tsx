import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput } from '@faixa-certa/shared';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useLocation, useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMessages } from '@/i18n';
import { errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { AuthShell } from './auth-shell';

export function LoginPage() {
  const m = useMessages();
  const { status, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });
  const from = (location.state as { from?: string } | null)?.from ?? '/';

  if (status === 'authenticated') return <Navigate to={from} replace />;

  const onSubmit = form.handleSubmit(async ({ email, password }) => {
    setError(null);
    try {
      await login(email, password);
      void navigate(from, { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    }
  });

  const { errors, isSubmitting } = form.formState;
  return (
    <AuthShell title={m.auth.loginTitle} subtitle={m.auth.loginSubtitle}>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="email">{m.auth.email}</Label>
          <Input
            id="email"
            type="email"
            autoComplete="username"
            aria-invalid={!!errors.email}
            {...form.register('email')}
          />
          {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">{m.auth.password}</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            aria-invalid={!!errors.password}
            {...form.register('password')}
          />
        </div>
        {error && (
          <p role="alert" className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="animate-spin" aria-hidden />}
          {isSubmitting ? m.auth.loggingIn : m.auth.login}
        </Button>
        <p className="text-center text-sm">
          <Link to="/esqueci-senha" className="text-primary underline-offset-4 hover:underline">
            {m.auth.forgot}
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
