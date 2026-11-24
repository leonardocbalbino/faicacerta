import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { AppException } from '../errors/app.exception.js';
import type { AccessTokenPayload } from './auth-user.js';
import { IS_PUBLIC_KEY } from './decorators.js';

/**
 * Guard global. Valida o access token (Bearer) e anexa `req.user`.
 * Rotas com @Public() não exigem token, mas aproveitam um token válido.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const req = context.switchToHttp().getRequest<Request>();
    const token = extractBearer(req);

    if (!token) {
      if (isPublic) return true;
      throw AppException.unauthorized();
    }

    try {
      const payload = await this.jwt.verifyAsync<AccessTokenPayload>(token);
      if (payload.typ !== 'access') throw new Error('tipo de token inválido');
      req.user = { id: payload.sub, roles: payload.roles ?? [] };
      return true;
    } catch {
      // Em rota pública, um token vencido não impede o acesso ao conteúdo.
      if (isPublic) return true;
      throw AppException.unauthorized();
    }
  }
}

function extractBearer(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (!header) return undefined;
  const [scheme, value] = header.split(' ');
  return scheme?.toLowerCase() === 'bearer' && value ? value : undefined;
}
