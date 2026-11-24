import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@faixa-certa/shared';
import { describe, expect, it, vi } from 'vitest';
import type { AuthUser } from './auth-user.js';
import { hasAnyRole, RolesGuard } from './roles.guard.js';

function ctx(user?: AuthUser): ExecutionContext {
  return {
    getHandler: () => () => undefined,
    getClass: () => Object,
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

function guardRequiring(roles?: Role[]) {
  const reflector = new Reflector();
  vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(roles);
  return new RolesGuard(reflector);
}

/** Status HTTP da exceção lançada (ou undefined se não lançou). */
function statusOf(fn: () => unknown): number | undefined {
  try {
    fn();
    return undefined;
  } catch (e) {
    return (e as { getStatus?: () => number }).getStatus?.();
  }
}

describe('hasAnyRole', () => {
  it('ADMIN passa em qualquer exigência', () => {
    expect(hasAnyRole([Role.ADMIN], [Role.CONTENT_EDITOR])).toBe(true);
  });
  it('exige ao menos um papel', () => {
    expect(hasAnyRole([Role.USER], [Role.CONTENT_EDITOR])).toBe(false);
    expect(hasAnyRole([Role.USER, Role.CONTENT_EDITOR], [Role.CONTENT_EDITOR])).toBe(true);
  });
});

describe('RolesGuard', () => {
  it('libera rotas sem @Roles', () => {
    expect(guardRequiring(undefined).canActivate(ctx())).toBe(true);
  });

  it('401 sem usuário', () => {
    expect(statusOf(() => guardRequiring([Role.ADMIN]).canActivate(ctx()))).toBe(401);
  });

  it('403 sem o papel', () => {
    const user = { id: 'u', roles: [Role.USER] };
    expect(statusOf(() => guardRequiring([Role.CONTENT_EDITOR]).canActivate(ctx(user)))).toBe(403);
  });

  it('libera com o papel', () => {
    const user = { id: 'u', roles: [Role.CONTENT_EDITOR] };
    expect(guardRequiring([Role.CONTENT_EDITOR]).canActivate(ctx(user))).toBe(true);
  });
});
