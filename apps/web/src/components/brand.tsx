import { cn } from '@/lib/utils';

/**
 * Símbolo do Faixa Certa: o nó da faixa de judô. Desenhado num quadrado
 * 100×100; o fundo arredondado fica por conta de quem usa.
 */
export function BrandMark({
  className,
  inverted = false,
}: {
  className?: string;
  inverted?: boolean;
}) {
  const ink = inverted ? 'var(--brand)' : '#0B0B0F';
  const knotStroke = inverted ? '#0B0B0F' : 'var(--brand)';
  return (
    <svg viewBox="0 0 100 100" fill="none" strokeLinecap="round" aria-hidden className={className}>
      <path d="M45 56 33 84" stroke={ink} strokeWidth="12" />
      <path d="M55 56 67 84" stroke={ink} strokeWidth="12" />
      <path d="M14 44h72" stroke={ink} strokeWidth="16" />
      <rect
        x="38"
        y="29"
        width="24"
        height="31"
        rx="6"
        fill={ink}
        stroke={knotStroke}
        strokeWidth="5"
      />
    </svg>
  );
}

/** Ícone do app: símbolo preto sobre o quadrado lima. */
export function BrandIcon({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex size-9 shrink-0 items-center justify-center rounded-[26%] bg-brand',
        className,
      )}
    >
      <BrandMark className="size-[72%]" />
    </span>
  );
}

/**
 * Logo horizontal. No fundo escuro "certa" fica lima; no claro, tudo preto
 * (as duas versões do layout).
 */
export function BrandLogo({ className, label }: { className?: string; label: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <BrandIcon />
      <span
        role="img"
        aria-label={label}
        className="font-display text-xl font-extrabold leading-none tracking-[-0.03em]"
      >
        <span aria-hidden>
          faixa<span className="dark:text-brand">certa</span>
        </span>
      </span>
    </span>
  );
}
