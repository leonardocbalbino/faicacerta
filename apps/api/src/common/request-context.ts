import { AsyncLocalStorage } from 'node:async_hooks';
import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

export interface RequestContext {
  requestId?: string;
  ip?: string;
  userAgent?: string;
}

const storage = new AsyncLocalStorage<RequestContext>();

/** Dados da requisição atual, acessíveis em qualquer serviço (ex.: auditoria). */
export function currentRequest(): RequestContext {
  return storage.getStore() ?? {};
}

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(req: Request & { id?: unknown }, _res: Response, next: NextFunction): void {
    storage.run(
      {
        requestId: req.id ? String(req.id) : undefined,
        ip: req.ip,
        userAgent: req.get('user-agent')?.slice(0, 500),
      },
      next,
    );
  }
}
