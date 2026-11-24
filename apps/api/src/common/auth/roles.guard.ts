import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@faixa-certa/shared';
import type { Request } from 'express';
import { AppException } from '../errors/app.exception.js';
import { ROLES_KEY } from './decorators.js';

/** RBAC: verifica os papéis exigidos por @Roles(). ADMIN tem acesso total. */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required?.length) return true;

    const user = context.switchToHttp().getRequest<Request>().user;
    if (!user) throw AppException.unauthorized();
    if (hasAnyRole(user.roles, required)) return true;
    throw AppException.forbidden();
  }
}

export function hasAnyRole(userRoles: readonly Role[], required: readonly Role[]): boolean {
  if (userRoles.includes(Role.ADMIN)) return true;
  return required.some((r) => userRoles.includes(r));
}
