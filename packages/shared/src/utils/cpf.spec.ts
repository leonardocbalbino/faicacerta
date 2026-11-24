import { describe, expect, it } from 'vitest';
import { formatCpf, isValidCpf } from './cpf.js';

describe('CPF', () => {
  it('aceita CPFs válidos', () => {
    expect(isValidCpf('52998224725')).toBe(true);
    expect(isValidCpf('11144477735')).toBe(true);
  });

  it('recusa dígito verificador errado, sequência repetida e tamanho errado', () => {
    expect(isValidCpf('52998224724')).toBe(false);
    expect(isValidCpf('11111111111')).toBe(false);
    expect(isValidCpf('1234567890')).toBe(false);
  });

  it('formata', () => {
    expect(formatCpf('52998224725')).toBe('529.982.247-25');
  });
});
