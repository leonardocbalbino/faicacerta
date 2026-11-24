import { isMinor, type Me } from '@faixa-certa/shared';
import type { Prisma } from '../../generated/prisma/client.js';

/** Campos de User necessários para montar o `Me`. */
export const meInclude = {
  authProviders: { select: { provider: true } },
  avatar: { select: { keyThumb: true, originalKey: true } },
  // Filtro de validade (expiresAt) feito em toMe: o "agora" muda a cada chamada.
  entitlements: { where: { revokedAt: null }, select: { type: true, expiresAt: true } },
} satisfies Prisma.UserInclude;

export type UserWithMeRelations = Prisma.UserGetPayload<{ include: typeof meInclude }>;

export function toMe(user: UserWithMeRelations, cdnBaseUrl?: string): Me {
  const birthDate = user.birthDate ? user.birthDate.toISOString().slice(0, 10) : null;
  const avatarKey = user.avatar?.keyThumb ?? user.avatar?.originalKey;
  return {
    id: user.id,
    email: user.email,
    emailVerified: user.emailVerifiedAt !== null,
    name: user.name,
    avatarUrl: avatarKey && cdnBaseUrl ? `${cdnBaseUrl}/${avatarKey}` : null,
    birthDate,
    isMinor: birthDate ? isMinor(birthDate) : null,
    roles: user.roles,
    currentBeltId: user.currentBeltId,
    programId: user.programId,
    academyName: user.academyName,
    entitlements: activeEntitlements(user.entitlements),
    hasPassword: user.passwordHash !== null,
    providers: user.authProviders.map((p) => p.provider),
    createdAt: user.createdAt.toISOString(),
  };
}

/** Direitos válidos agora (sem repetição). */
export function activeEntitlements(
  rows: { type: Me['entitlements'][number]; expiresAt: Date | null }[],
  now = new Date(),
): Me['entitlements'] {
  return [...new Set(rows.filter((e) => !e.expiresAt || e.expiresAt > now).map((e) => e.type))];
}
