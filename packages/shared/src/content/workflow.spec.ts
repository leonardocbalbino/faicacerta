import { describe, expect, it } from 'vitest';
import { allowedTransitions, canTransition } from './workflow.js';

const editor = ['USER', 'CONTENT_EDITOR'] as const;
const admin = ['USER', 'ADMIN'] as const;

describe('fluxo de publicação', () => {
  it('editor envia rascunho para revisão e publica a partir da revisão', () => {
    expect(canTransition('DRAFT', 'REVIEW', editor)).toBe(true);
    expect(canTransition('REVIEW', 'PUBLISHED', editor)).toBe(true);
  });

  it('editor não publica direto do rascunho; admin publica', () => {
    expect(canTransition('DRAFT', 'PUBLISHED', editor)).toBe(false);
    expect(canTransition('DRAFT', 'PUBLISHED', admin)).toBe(true);
  });

  it('arquivado só volta para rascunho', () => {
    expect(allowedTransitions('ARCHIVED', admin)).toEqual(['DRAFT']);
  });

  it('não permite transição para o mesmo estado', () => {
    expect(canTransition('PUBLISHED', 'PUBLISHED', admin)).toBe(false);
  });
});
