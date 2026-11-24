import { ADULT_AGE } from '../constants.js';

/**
 * Idade em anos completos numa data de referência.
 * `birthDate` no formato ISO `YYYY-MM-DD` ou Date (só a parte UTC da data é usada).
 */
export function ageOn(birthDate: string | Date, reference: Date = new Date()): number {
  const iso = typeof birthDate === 'string' ? birthDate : birthDate.toISOString().slice(0, 10);
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  const refY = reference.getUTCFullYear();
  const refM = reference.getUTCMonth() + 1;
  const refD = reference.getUTCDate();
  let age = refY - y;
  if (refM < m || (refM === m && refD < d)) age -= 1;
  return age;
}

export function isMinor(birthDate: string | Date, reference: Date = new Date()): boolean {
  return ageOn(birthDate, reference) < ADULT_AGE;
}
