import { BELT_PALETTE, BRAND_COLORS } from '@faixa-certa/shared';
import type { ReactNode } from 'react';
import { BrandLogo } from '@/components/brand';
import { useMessages } from '@/i18n';

/** Faixas na diagonal do topo, como na tela de login do app. */
const STRIPES = [
  { color: BELT_PALETTE.amarela, top: '-2.5rem', left: '-10%' },
  { color: BELT_PALETTE.laranja, top: '2.75rem', left: '4%' },
  { color: BRAND_COLORS.lime, top: '8rem', left: '20%' },
];

/** Moldura das páginas públicas (login, e-mail, senha). */
export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const m = useMessages();
  return (
    <main className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden bg-background p-4 pt-48">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-60">
        {STRIPES.map((s) => (
          <span
            key={s.color}
            className="absolute h-14 w-[130%] -rotate-[8deg] rounded-2xl"
            style={{ background: s.color, top: s.top, left: s.left }}
          />
        ))}
      </div>
      <div className="relative w-full max-w-sm space-y-6">
        <BrandLogo label={m.app.name} />
        <div className="space-y-2">
          <h1 className="text-4xl font-extrabold leading-[1.05] tracking-[-0.02em]">{title}</h1>
          {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="rounded-3xl border bg-card p-5">{children}</div>
      </div>
    </main>
  );
}
