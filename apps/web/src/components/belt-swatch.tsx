import { cn } from '@/lib/utils';

/** Amostra da faixa; faixas de duas cores aparecem divididas no comprimento. */
export function BeltSwatch({
  colors,
  className,
  label,
}: {
  colors: string[];
  className?: string;
  label?: string;
}) {
  const [a = '#cccccc', b] = colors;
  return (
    <span
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn(
        'inline-block h-3.5 w-8 shrink-0 rounded-[4px] border border-foreground/15',
        className,
      )}
      style={{ background: b ? `linear-gradient(to bottom, ${a} 50%, ${b} 50%)` : a }}
    />
  );
}
