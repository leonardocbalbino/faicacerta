import { describe, expect, it } from 'vitest';
import { ageOn, isMinor } from './age.js';

describe('ageOn', () => {
  const ref = new Date('2026-11-23T12:00:00Z');

  it('conta anos completos', () => {
    expect(ageOn('2000-01-01', ref)).toBe(26);
  });

  it('não completa o ano antes do aniversário', () => {
    expect(ageOn('2008-11-24', ref)).toBe(17);
  });

  it('completa o ano no dia do aniversário', () => {
    expect(ageOn('2008-11-23', ref)).toBe(18);
  });

  it('aceita Date', () => {
    expect(ageOn(new Date('2010-05-10T00:00:00Z'), ref)).toBe(16);
  });
});

describe('isMinor', () => {
  const ref = new Date('2026-11-23T12:00:00Z');
  it('menor de 18', () => expect(isMinor('2008-11-24', ref)).toBe(true));
  it('18 completos', () => expect(isMinor('2008-11-23', ref)).toBe(false));
});
