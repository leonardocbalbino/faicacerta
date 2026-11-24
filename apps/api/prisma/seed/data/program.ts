import { BELT_PALETTE } from '@faixa-certa/shared';

/**
 * Programa de EXEMPLO para desenvolvimento. A sequência de faixas segue a usada
 * no Brasil e as técnicas seguem o Gokyo da Kodokan (grupos 1 e 2), mas a
 * distribuição por faixa é ilustrativa: o admin deve revisar com um professor
 * antes de publicar.
 */
export const program = {
  name: 'Programa de exemplo (Gokyo da Kodokan)',
  federation: null,
  description:
    'Programa de demonstração. A distribuição das técnicas por faixa é ilustrativa e deve ser revisada.',
};

export interface BeltSeed {
  name: string;
  colors: string[];
  order: number;
  /** Técnicas exigidas para receber esta faixa (slugs). */
  mandatory: string[];
  optional?: string[];
}

export const belts: BeltSeed[] = [
  { name: 'Branca', colors: [BELT_PALETTE.branca], order: 0, mandatory: [] },
  {
    name: 'Cinza',
    colors: [BELT_PALETTE.cinza],
    order: 1,
    mandatory: [
      'ushiro-ukemi',
      'yoko-ukemi',
      'mae-ukemi',
      'mae-mawari-ukemi',
      'de-ashi-harai',
      'hiza-guruma',
      'kesa-gatame',
    ],
  },
  {
    name: 'Azul',
    colors: [BELT_PALETTE.azul],
    order: 2,
    mandatory: ['sasae-tsurikomi-ashi', 'uki-goshi', 'o-soto-gari', 'kuzure-kesa-gatame'],
  },
  {
    name: 'Amarela',
    colors: [BELT_PALETTE.amarela],
    order: 3,
    mandatory: ['o-goshi', 'o-uchi-gari', 'seoi-nage', 'kata-gatame'],
  },
  {
    name: 'Laranja',
    colors: [BELT_PALETTE.laranja],
    order: 4,
    mandatory: ['ko-soto-gari', 'ko-uchi-gari', 'koshi-guruma', 'kami-shiho-gatame'],
  },
  {
    name: 'Verde',
    colors: [BELT_PALETTE.verde],
    order: 5,
    mandatory: ['tsurikomi-goshi', 'okuri-ashi-harai', 'yoko-shiho-gatame'],
    optional: ['tai-otoshi'],
  },
  {
    name: 'Roxa',
    colors: [BELT_PALETTE.roxa],
    order: 6,
    mandatory: ['tai-otoshi', 'harai-goshi', 'tate-shiho-gatame'],
  },
  { name: 'Marrom', colors: [BELT_PALETTE.marrom], order: 7, mandatory: ['uchi-mata'] },
  { name: 'Preta', colors: [BELT_PALETTE.preta], order: 8, mandatory: [] },
];
