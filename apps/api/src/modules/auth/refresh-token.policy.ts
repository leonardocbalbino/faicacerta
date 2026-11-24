/** Estado mínimo de um refresh token para decidir o que fazer com ele. */
export interface RefreshTokenState {
  expiresAt: Date;
  revokedAt: Date | null;
  replacedById: string | null;
}

export type RefreshTokenVerdict =
  /** Pode ser trocado por um novo par. */
  | 'valid'
  /** Venceu: o usuário precisa entrar de novo. */
  | 'expired'
  /** Foi revogado por logout ou por segurança. */
  | 'revoked'
  /**
   * Já tinha sido trocado e alguém tentou usar de novo: sinal de token
   * vazado. A família inteira deve ser revogada.
   */
  | 'reused';

export function classifyRefreshToken(
  token: RefreshTokenState,
  now: Date = new Date(),
): RefreshTokenVerdict {
  if (token.revokedAt) return token.replacedById ? 'reused' : 'revoked';
  if (token.expiresAt.getTime() <= now.getTime()) return 'expired';
  return 'valid';
}
