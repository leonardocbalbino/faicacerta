import { HttpException, HttpStatus } from '@nestjs/common';
import { t, type MessageKey } from '@faixa-certa/shared';

export interface FieldError {
  path: string;
  message: string;
}

/**
 * Exceção de domínio com código estável (chave de i18n). O filtro global
 * converte em `application/problem+json` (RFC 7807).
 */
export class AppException extends HttpException {
  constructor(
    status: HttpStatus,
    public readonly code: MessageKey,
    public readonly errors?: FieldError[],
    detail?: string,
  ) {
    super(detail ?? t(code), status);
  }

  static badRequest(code: MessageKey = 'errors.validation', errors?: FieldError[]) {
    return new AppException(HttpStatus.BAD_REQUEST, code, errors);
  }
  static unauthorized(code: MessageKey = 'errors.unauthorized') {
    return new AppException(HttpStatus.UNAUTHORIZED, code);
  }
  static forbidden(code: MessageKey = 'errors.forbidden') {
    return new AppException(HttpStatus.FORBIDDEN, code);
  }
  static notFound(code: MessageKey = 'errors.notFound') {
    return new AppException(HttpStatus.NOT_FOUND, code);
  }
  static conflict(code: MessageKey = 'errors.conflict') {
    return new AppException(HttpStatus.CONFLICT, code);
  }
}
