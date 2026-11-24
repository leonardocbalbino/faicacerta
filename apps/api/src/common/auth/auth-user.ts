import type { Role } from '@faixa-certa/shared';

/** Usuário autenticado anexado à requisição pelo JwtAuthGuard. */
export interface AuthUser {
  id: string;
  roles: Role[];
}

/** Claims do access token. */
export interface AccessTokenPayload {
  sub: string;
  roles: Role[];
  typ: 'access';
}

declare module 'express' {
  interface Request {
    user?: AuthUser;
  }
}
