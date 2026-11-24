import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import type { Role } from '@faixa-certa/shared';
import type { Request } from 'express';
import type { AuthUser } from './auth-user.js';

export const IS_PUBLIC_KEY = 'auth:isPublic';
export const ROLES_KEY = 'auth:roles';

/**
 * Rota acessível sem login. Se vier um token válido, o usuário ainda é
 * anexado (útil para conteúdo público que muda com o login, ex.: anúncios).
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/** Exige pelo menos um dos papéis. ADMIN sempre passa. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

/** Usuário autenticado. Em rotas @Public pode ser `undefined`. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser | undefined =>
    ctx.switchToHttp().getRequest<Request>().user,
);
