import { StandardSchemaValidationPipe } from '@nestjs/common';
import { AppException } from '../errors/app.exception.js';

type IssuePath = ReadonlyArray<PropertyKey | { key: PropertyKey }> | undefined;

function formatPath(path: IssuePath): string {
  if (!path?.length) return '';
  return path
    .map((p) => (typeof p === 'object' && p !== null ? String(p.key) : String(p)))
    .join('.');
}

/**
 * Validação global com Standard Schema (Zod 4), ativada por
 * `@Body({ schema })`, `@Query({ schema })` e `@Param(..., { schema })`.
 * Erros viram RFC 7807 com a lista de campos.
 */
export function createValidationPipe(): StandardSchemaValidationPipe {
  return new StandardSchemaValidationPipe({
    transform: true,
    exceptionFactory: (issues) =>
      AppException.badRequest(
        'errors.validation',
        issues.map((i) => ({ path: formatPath(i.path), message: i.message })),
      ),
  });
}
