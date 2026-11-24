import { ptBR, type MessageKey } from './pt-BR.js';

export type Locale = 'pt-BR';
export const DEFAULT_LOCALE: Locale = 'pt-BR';

const catalogs: Record<Locale, Record<MessageKey, string>> = {
  'pt-BR': ptBR,
};

/** Traduz uma chave. Interpolação simples com `{nome}`. */
export function t(
  key: MessageKey,
  params?: Record<string, string | number>,
  locale: Locale = DEFAULT_LOCALE,
): string {
  const template = catalogs[locale]?.[key] ?? ptBR[key] ?? key;
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) => String(params[name] ?? `{${name}}`));
}

export { ptBR, type MessageKey };
