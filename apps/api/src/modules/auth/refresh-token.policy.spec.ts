import { describe, expect, it } from 'vitest';
import { classifyRefreshToken } from './refresh-token.policy.js';

const now = new Date('2026-11-23T12:00:00Z');
const future = new Date('2026-12-23T12:00:00Z');
const past = new Date('2026-11-01T12:00:00Z');

describe('classifyRefreshToken', () => {
  it('válido quando não revogado e dentro da validade', () => {
    expect(
      classifyRefreshToken({ expiresAt: future, revokedAt: null, replacedById: null }, now),
    ).toBe('valid');
  });

  it('vencido', () => {
    expect(
      classifyRefreshToken({ expiresAt: past, revokedAt: null, replacedById: null }, now),
    ).toBe('expired');
  });

  it('vence exatamente no instante de expiração', () => {
    expect(classifyRefreshToken({ expiresAt: now, revokedAt: null, replacedById: null }, now)).toBe(
      'expired',
    );
  });

  it('revogado por logout', () => {
    expect(
      classifyRefreshToken({ expiresAt: future, revokedAt: past, replacedById: null }, now),
    ).toBe('revoked');
  });

  it('reuso de token já rotacionado tem prioridade sobre a expiração', () => {
    expect(classifyRefreshToken({ expiresAt: past, revokedAt: past, replacedById: 'x' }, now)).toBe(
      'reused',
    );
  });
});
