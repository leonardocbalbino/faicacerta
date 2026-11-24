import { z } from 'zod';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../constants.js';

export const uuidSchema = z.uuid();

export const paginationQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

/** Corpo de erro no formato RFC 7807 (application/problem+json). */
export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  /** Código estável para o cliente decidir o que fazer (ex.: "auth.invalidCredentials"). */
  code: string;
  /** Erros de validação por campo. */
  errors?: { path: string; message: string }[];
  requestId?: string;
}
