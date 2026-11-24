import { describe, expect, it } from 'vitest';
import { registerSchema } from './auth.js';

const base = {
  name: 'Ana Souza',
  email: '  Ana@Example.com ',
  password: 'judo2026',
  birthDate: '1995-04-10',
};

describe('registerSchema', () => {
  it('normaliza o e-mail', () => {
    const r = registerSchema.parse(base);
    expect(r.email).toBe('ana@example.com');
  });

  it('exige letras e números na senha', () => {
    expect(registerSchema.safeParse({ ...base, password: 'somenteletras' }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, password: '12345678' }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, password: 'faixaçã0' }).success).toBe(true);
  });

  it('exige responsável para menores', () => {
    const minor = { ...base, birthDate: '2015-01-01' };
    const r = registerSchema.safeParse(minor);
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.path).toEqual(['guardian']);

    const ok = registerSchema.safeParse({
      ...minor,
      guardian: { name: 'Maria Souza', email: 'maria@example.com', consent: true },
    });
    expect(ok.success).toBe(true);
  });

  it('recusa consentimento falso', () => {
    const r = registerSchema.safeParse({
      ...base,
      birthDate: '2015-01-01',
      guardian: { name: 'Maria Souza', email: 'maria@example.com', consent: false },
    });
    expect(r.success).toBe(false);
  });
});
