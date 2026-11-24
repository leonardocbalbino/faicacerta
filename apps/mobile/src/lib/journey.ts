import type { CatalogBelt, CatalogProgram } from '@faixa-certa/shared';
import { usePrograms } from './api';
import { usePrefs } from './prefs';

export interface Journey {
  program: CatalogProgram;
  current: CatalogBelt;
  /** Próxima faixa (a da apostila). Na última faixa, é a própria. */
  target: CatalogBelt;
  isLastBelt: boolean;
}

/** Programa base (ou o escolhido) e as faixas atual e alvo do aluno. */
export function useJourney() {
  const programs = usePrograms();
  const { programId, currentBeltId } = usePrefs();

  const list = programs.data ?? [];
  const program = list.find((p) => p.id === programId) ?? list.find((p) => p.isBase) ?? list[0];
  let journey: Journey | null = null;
  if (program && program.belts.length > 0) {
    const belts = program.belts;
    const index = Math.max(
      0,
      belts.findIndex((b) => b.id === currentBeltId),
    );
    const current = belts[index] ?? belts[0]!;
    const target = belts[index + 1] ?? current;
    journey = { program, current, target, isLastBelt: target.id === current.id };
  }
  return { journey, programs };
}

/** "Amarela" → "Faixa amarela". */
export function beltLabel(name: string): string {
  return `Faixa ${name.charAt(0).toLowerCase()}${name.slice(1)}`;
}

/** Saudação pela hora local. */
export function greeting(date = new Date()): string {
  const h = date.getHours();
  if (h < 5 || h >= 18) return 'Boa noite,';
  if (h < 12) return 'Bom dia,';
  return 'Boa tarde,';
}

/** Escolha estável por dia (a mesma técnica o dia todo). */
export function pickOfTheDay<T>(items: T[], date = new Date()): T | undefined {
  if (items.length === 0) return undefined;
  const day = Math.floor(date.getTime() / 86_400_000);
  return items[day % items.length];
}

export function formatDuration(ms: number | null | undefined): string | null {
  if (!ms) return null;
  const total = Math.round(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}
