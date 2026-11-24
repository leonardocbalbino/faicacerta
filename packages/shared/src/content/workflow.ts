import { PublicationStatus, Role } from '../enums.js';

/**
 * Fluxo de publicação do CMS:
 *   Rascunho → Revisão → Publicado → (Arquivado)
 * Editores e admins publicam a partir da revisão. Só o admin publica direto
 * do rascunho. Fica no `shared` para o painel mostrar só os botões válidos.
 */
const TRANSITIONS: Record<PublicationStatus, PublicationStatus[]> = {
  DRAFT: ['REVIEW', 'ARCHIVED'],
  REVIEW: ['DRAFT', 'PUBLISHED'],
  PUBLISHED: ['DRAFT', 'ARCHIVED'],
  ARCHIVED: ['DRAFT'],
};

export function allowedTransitions(
  from: PublicationStatus,
  roles: readonly Role[],
): PublicationStatus[] {
  const next = [...TRANSITIONS[from]];
  if (from === PublicationStatus.DRAFT && roles.includes(Role.ADMIN)) {
    next.push(PublicationStatus.PUBLISHED);
  }
  return next;
}

export function canTransition(
  from: PublicationStatus,
  to: PublicationStatus,
  roles: readonly Role[],
): boolean {
  return allowedTransitions(from, roles).includes(to);
}

export const PUBLICATION_STATUS_LABEL: Record<PublicationStatus, string> = {
  DRAFT: 'Rascunho',
  REVIEW: 'Em revisão',
  PUBLISHED: 'Publicado',
  ARCHIVED: 'Arquivado',
};
