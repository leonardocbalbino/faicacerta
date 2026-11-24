import type { Medal, TimelineEvent, TimelineEventType } from '@faixa-certa/shared';
import { MEDAL_COLORS } from '@faixa-certa/shared';

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** "2026-03-12" → "12 mar 2026". */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d} ${MONTHS[Number(m) - 1] ?? m} ${y}`;
}

/** "2026-03-12" → "12.03.2026" (cards). */
export function formatDateDots(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}.${m}.${y}`;
}

/** Data local de hoje em AAAA-MM-DD. */
export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function fromIsoDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y ?? 2000, (m ?? 1) - 1, d ?? 1);
}

/** Intervalo curto: "2a 10m", "9 m", "15 d". */
export function shortSpan(fromIso: string, to = new Date()): string {
  const from = fromIsoDate(fromIso);
  let months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  if (to.getDate() < from.getDate()) months -= 1;
  if (months < 1) {
    const days = Math.max(0, Math.floor((to.getTime() - from.getTime()) / 86_400_000));
    return `${days} d`;
  }
  const years = Math.floor(months / 12);
  const rest = months % 12;
  if (years === 0) return `${rest} m`;
  return rest ? `${years}a ${rest}m` : `${years} ${years === 1 ? 'ano' : 'anos'}`;
}

/** Intervalo por extenso para os cards: "2 anos de tatame". */
export function longSpan(fromIso: string, to = new Date()): string {
  const from = fromIsoDate(fromIso);
  let months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  if (to.getDate() < from.getDate()) months -= 1;
  const years = Math.floor(months / 12);
  if (years >= 1) return `${years} ${years === 1 ? 'ano' : 'anos'}`;
  if (months >= 1) return `${months} ${months === 1 ? 'mês' : 'meses'}`;
  return 'menos de 1 mês';
}

export const EVENT_LABEL: Record<TimelineEventType, string> = {
  GRADUATION: 'Graduação',
  COMPETITION: 'Competição',
  ACADEMY_CHANGE: 'Academia',
  SEMINAR: 'Seminário',
  MILESTONE: 'Marco',
};

export const MEDAL_LABEL: Record<Medal, string> = {
  GOLD: 'Ouro',
  SILVER: 'Prata',
  BRONZE: 'Bronze',
};
export const MEDAL_PLACE: Record<Medal, string> = { GOLD: '1º', SILVER: '2º', BRONZE: '3º' };
export const MEDAL_HEX: Record<Medal, string> = {
  GOLD: MEDAL_COLORS.gold,
  SILVER: MEDAL_COLORS.silver,
  BRONZE: MEDAL_COLORS.bronze,
};

export interface JourneyStats {
  /** Desde o marco mais antigo (ex.: primeiro treino). */
  sinceIso: string | null;
  graduations: number;
  medals: number;
}

export function journeyStats(events: TimelineEvent[]): JourneyStats {
  const oldest = events.reduce<string | null>(
    (acc, e) => (acc === null || e.date < acc ? e.date : acc),
    null,
  );
  return {
    sinceIso: oldest,
    graduations: events.filter((e) => e.type === 'GRADUATION').length,
    medals: events.filter((e) => e.type === 'COMPETITION' && e.extra?.medal).length,
  };
}

/** "Lucas Martins" → "Lucas M." (cards). */
export function shortName(name: string): string {
  const [first, ...rest] = name.trim().split(/\s+/);
  const last = rest.at(-1);
  return last ? `${first} ${last.charAt(0).toUpperCase()}.` : (first ?? '');
}

/** Iniciais para o avatar. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return (
    (parts[0]?.[0] ?? '') + (parts.length > 1 ? (parts.at(-1)?.[0] ?? '') : '')
  ).toUpperCase();
}
