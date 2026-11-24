import { ptBR, type Messages } from './pt-BR';

const catalogs: Record<string, Messages> = { 'pt-BR': ptBR };

/** Idioma ativo. Hoje só pt-BR; a troca entra aqui (ex.: preferência do usuário). */
export const locale = 'pt-BR';

export function useMessages(): Messages {
  return catalogs[locale] ?? ptBR;
}

/** Interpolação simples: fmt('Versão {n}', { n: 3 }). */
export function fmt(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => String(params[k] ?? `{${k}}`));
}
