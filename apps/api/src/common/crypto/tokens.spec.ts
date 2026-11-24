import { describe, expect, it } from 'vitest';
import { generateOpaqueToken, safeEqual, sha256 } from './tokens.js';

describe('tokens', () => {
  it('gera tokens distintos e url-safe', () => {
    const a = generateOpaqueToken();
    const b = generateOpaqueToken();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it('sha256 é determinístico', () => {
    expect(sha256('faixa')).toBe(sha256('faixa'));
    expect(sha256('faixa')).toHaveLength(64);
  });

  it('safeEqual compara com tamanhos diferentes sem lançar erro', () => {
    expect(safeEqual('abc', 'abc')).toBe(true);
    expect(safeEqual('abc', 'abcd')).toBe(false);
  });
});
