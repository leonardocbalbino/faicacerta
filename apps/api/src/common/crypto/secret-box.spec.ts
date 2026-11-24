import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { SecretBox } from './secret-box.js';

describe('SecretBox', () => {
  const key = randomBytes(32).toString('base64');

  it('cifra e decifra', () => {
    const box = new SecretBox(key);
    const sealed = box.seal('$aact_chave_secreta');
    expect(sealed).toMatch(/^v1\./);
    expect(sealed).not.toContain('chave');
    expect(box.open(sealed)).toBe('$aact_chave_secreta');
  });

  it('gera um texto diferente a cada vez (IV aleatório)', () => {
    const box = new SecretBox(key);
    expect(box.seal('x')).not.toBe(box.seal('x'));
  });

  it('recusa texto adulterado ou chave errada', () => {
    const sealed = new SecretBox(key).seal('segredo');
    const tampered = `${sealed.slice(0, -2)}AA`;
    expect(() => new SecretBox(key).open(tampered)).toThrow(/auth/i);
    expect(() => new SecretBox(randomBytes(32).toString('base64')).open(sealed)).toThrow(/auth/i);
  });

  it('exige chave de 32 bytes', () => {
    expect(() => new SecretBox(randomBytes(16).toString('base64'))).toThrow(/32 bytes/);
  });
});
