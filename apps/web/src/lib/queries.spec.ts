import { describe, expect, it } from 'vitest';
import { slugify } from './queries';

describe('slugify', () => {
  it('remove acentos e macron, e usa hífens', () => {
    expect(slugify('Ō-soto-gari')).toBe('o-soto-gari');
    expect(slugify('  Kuzure Kesa  Gatame ')).toBe('kuzure-kesa-gatame');
    expect(slugify('História & Etiqueta')).toBe('historia-etiqueta');
  });
});
