/**
 * Tokens visuais do Faixa Certa, tirados do layout aprovado
 * (docs/design/README.md). Mesma fonte para o painel web e o app Expo.
 *
 * Regra da marca: lima + preto. As cores das faixas só aparecem no conteúdo
 * (amostras de faixa, cards de conquista), nunca na interface.
 */
export const BRAND_COLORS = {
  /** Cor de destaque: botões principais, item ativo, progresso. */
  lime: '#D4FF3A',
  limeSoft: '#E8FF8A',
  /** Fundo do app. */
  ink: '#0B0B0F',
  /** Cartões, campos e botões secundários. */
  surface: '#16161D',
  surfaceRaised: '#1F1F29',
  border: '#26262F',
  borderStrong: '#3A3A46',
  text: '#F5F5F7',
  textMuted: '#A1A1AA',
  textSubtle: '#8B8B98',
  /** Erros, "revise estas", gravação. */
  danger: '#FF5C8A',
  dangerSurface: '#2A1A1E',
  /** Pix, "0% de taxa", sucesso. */
  success: '#2EE6A8',
  successSurface: '#10251E',
  info: '#5B8CFF',
  warning: '#FB923C',
} as const;

/** Paleta das faixas usada no onboarding, na apostila e nos cards. */
export const BELT_PALETTE = {
  branca: '#F5F5F7',
  cinza: '#9CA3AF',
  azul: '#3B82F6',
  amarela: '#FACC15',
  laranja: '#FB923C',
  verde: '#22C55E',
  roxa: '#A855F7',
  marrom: '#92400E',
  preta: '#0B0B0F',
} as const;

export type BeltPaletteKey = keyof typeof BELT_PALETTE;

/** Cores das medalhas nos marcos de competição. */
export const MEDAL_COLORS = {
  gold: '#FACC15',
  silver: '#C8C8D0',
  bronze: '#C08457',
} as const;

/** Raios em px: chips e badges são pílulas; cartões grandes usam 28. */
export const RADII = {
  xs: 4,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 22,
  card: 28,
  pill: 999,
} as const;

export const FONTS = {
  /** Títulos e logo, peso 800 (600 em subtítulos de card). */
  display: 'Bricolage Grotesque',
  /** Textos e interface, pesos 400 a 700. */
  body: 'Inter',
} as const;
