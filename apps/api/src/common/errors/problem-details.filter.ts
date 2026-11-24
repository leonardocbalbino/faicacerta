import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { t, type MessageKey, type ProblemDetails } from '@faixa-certa/shared';
import type { Request, Response } from 'express';
import { Prisma } from '../../generated/prisma/client.js';
import { AppException } from './app.exception.js';

const DEFAULT_CODE_BY_STATUS: Partial<Record<number, MessageKey>> = {
  400: 'errors.validation',
  401: 'errors.unauthorized',
  403: 'errors.forbidden',
  404: 'errors.notFound',
  409: 'errors.conflict',
  429: 'errors.tooManyRequests',
};

const TITLE_BY_STATUS: Partial<Record<number, string>> = {
  400: 'Requisição inválida',
  401: 'Não autenticado',
  403: 'Acesso negado',
  404: 'Não encontrado',
  409: 'Conflito',
  422: 'Não processável',
  429: 'Muitas requisições',
  500: 'Erro interno',
  503: 'Serviço indisponível',
};

/** Converte qualquer erro em `application/problem+json` (RFC 7807). */
@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ProblemDetails');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request & { id?: string }>();
    const res = ctx.getResponse<Response>();

    const problem = this.toProblem(exception);
    problem.instance = req.originalUrl ?? req.url;
    if (req.id) problem.requestId = String(req.id);

    if (problem.status >= 500) {
      this.logger.error({ err: exception, requestId: problem.requestId }, 'erro não tratado');
    }

    res.status(problem.status).type('application/problem+json').json(problem);
  }

  private toProblem(exception: unknown): ProblemDetails {
    if (exception instanceof AppException) {
      return this.build(exception.getStatus(), exception.code, exception.message, exception.errors);
    }

    if (exception instanceof ThrottlerException) {
      return this.build(HttpStatus.TOO_MANY_REQUESTS, 'errors.tooManyRequests');
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') return this.build(HttpStatus.CONFLICT, 'errors.conflict');
      if (exception.code === 'P2025') return this.build(HttpStatus.NOT_FOUND, 'errors.notFound');
      // Chave estrangeira inválida: o cliente mandou um id que não existe.
      if (exception.code === 'P2003') {
        return this.build(HttpStatus.BAD_REQUEST, 'content.referenceNotFound');
      }
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const code = DEFAULT_CODE_BY_STATUS[status] ?? 'errors.internal';
      // Mensagens de HttpException genéricas (do Nest) não vazam para o cliente em 5xx.
      const detail = status < 500 ? t(code) : undefined;
      return this.build(status, code, detail);
    }

    return this.build(HttpStatus.INTERNAL_SERVER_ERROR, 'errors.internal');
  }

  private build(
    status: number,
    code: MessageKey,
    detail?: string,
    errors?: ProblemDetails['errors'],
  ): ProblemDetails {
    return {
      type: `urn:faixa-certa:problem:${code}`,
      title: TITLE_BY_STATUS[status] ?? 'Erro',
      status,
      code,
      detail: detail ?? t(code),
      ...(errors?.length ? { errors } : {}),
    };
  }
}
