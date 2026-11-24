import { BRAND_COLORS, RADII } from '@faixa-certa/shared';

/** Cores do layout aprovado (docs/design/README.md). Lima + preto; faixas só no conteúdo. */
export const colors = {
  ...BRAND_COLORS,
  nav: '#111117',
  navBorder: '#23232D',
  navInactive: '#8B8B98',
  number: '#6E6E7A',
  overlay: '#0B0B0FCC',
  dangerText: '#FFC2CF',
  dangerStrong: '#FF8FA8',
  heroPattern: '#2A2A35',
  heroBackground: '#1A1A22',
} as const;

export const radii = RADII;

/** Famílias carregadas em src/app/_layout.tsx (@expo-google-fonts). */
export const fonts = {
  display: 'BricolageGrotesque_800ExtraBold',
  displaySemi: 'BricolageGrotesque_600SemiBold',
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

/** Margem lateral padrão das telas. */
export const GUTTER = 20;
