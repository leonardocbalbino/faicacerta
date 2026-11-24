import {
  BookOpenText,
  FolderTree,
  Images,
  Languages,
  ListChecks,
  LogOut,
  Moon,
  Medal,
  Sun,
  Swords,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import type { ReactNode } from 'react';
import { Navigate, NavLink, Outlet, useLocation } from 'react-router';
import { BrandLogo } from '@/components/brand';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useMessages } from '@/i18n';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';

/** Só a equipe de conteúdo (CONTENT_EDITOR) e admins entram no painel. */
export function RequireStaff({ children }: { children: ReactNode }) {
  const m = useMessages();
  const { status, isStaff, logout } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return (
      <div className="flex min-h-svh items-center justify-center p-8">
        <Skeleton className="h-8 w-48" aria-label={m.common.loading} />
      </div>
    );
  }
  if (status === 'anonymous') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (!isStaff) {
    return (
      <main className="mx-auto flex min-h-svh max-w-md flex-col items-center justify-center gap-4 p-8 text-center">
        <h1 className="text-xl font-semibold">{m.auth.noAccessTitle}</h1>
        <p className="text-muted-foreground">{m.auth.noAccessBody}</p>
        <Button variant="outline" onClick={() => void logout()}>
          {m.nav.logout}
        </Button>
      </main>
    );
  }
  return <>{children}</>;
}

export function AdminLayout() {
  const m = useMessages();
  const { user, logout, isAdmin } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();

  const nav: { to: string; label: string; icon: LucideIcon }[] = [
    { to: '/tecnicas', label: m.nav.techniques, icon: Swords },
    { to: '/programas', label: m.nav.programs, icon: Medal },
    { to: '/categorias', label: m.nav.categories, icon: FolderTree },
    { to: '/glossario', label: m.nav.glossary, icon: Languages },
    { to: '/quiz', label: m.nav.quiz, icon: ListChecks },
    { to: '/textos', label: m.nav.articles, icon: BookOpenText },
    { to: '/midia', label: m.nav.media, icon: Images },
    ...(isAdmin ? [{ to: '/monetizacao', label: m.nav.monetization, icon: Wallet }] : []),
  ];

  return (
    <div className="flex min-h-svh flex-col md:flex-row">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
      >
        {m.nav.skipToContent}
      </a>
      <aside className="flex shrink-0 flex-col border-b bg-sidebar text-sidebar-foreground md:w-60 md:border-b-0 md:border-r">
        <div className="flex flex-col gap-1 px-4 pb-4 pt-5">
          <BrandLogo label={m.app.name} />
          <span className="pl-[46px] text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {m.app.panel}
          </span>
        </div>
        <nav
          aria-label={m.nav.content}
          className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-col md:overflow-visible"
        >
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground',
                  isActive &&
                    'bg-sidebar-accent font-semibold text-sidebar-foreground [&>svg]:text-primary',
                )
              }
            >
              <Icon className="size-[18px]" aria-hidden />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto hidden items-center gap-1 border-t border-sidebar-border p-3 md:flex">
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{user?.name}</div>
            <div className="truncate text-xs text-muted-foreground">{user?.email}</div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label={m.common.theme}
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          >
            {resolvedTheme === 'dark' ? <Sun aria-hidden /> : <Moon aria-hidden />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={m.nav.logout}
            onClick={() => void logout()}
          >
            <LogOut aria-hidden />
          </Button>
        </div>
      </aside>
      <main id="conteudo" tabIndex={-1} className="min-w-0 flex-1 p-4 md:p-10">
        <Outlet />
      </main>
    </div>
  );
}
