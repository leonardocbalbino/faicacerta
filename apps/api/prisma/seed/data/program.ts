import { BELT_PALETTE } from '@faixa-certa/shared';

/** Nome antigo do programa base (o seed renomeia em vez de criar outro). */
export const LEGACY_PROGRAM_NAME = 'Programa de exemplo (Gokyo da Kodokan)';

/**
 * Programa base: sequência de faixas usada no Brasil com as técnicas do Gokyo da
 * Kodokan (5 grupos de 8 projeções), as técnicas de solo e, na faixa marrom, os
 * grupo Habukareta-waza e as demais técnicas da lista oficial. Cada federação e academia tem a
 * sua distribuição; o app avisa para confirmar com o professor.
 */
export const program = {
  name: 'Gokyo da Kodokan',
  federation: null,
  description:
    'Técnicas oficiais da Kodokan distribuídas pelas faixas, na ordem do Gokyo. A cobrança no exame varia entre federações e academias: confirme com o seu professor.',
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
    // Quedas e a primeira metade do 1º grupo (Dai-ikkyo).
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
      'sasae-tsurikomi-ashi',
      'kesa-gatame',
    ],
  },
  {
    // Segunda metade do 1º grupo.
    name: 'Azul',
    colors: [BELT_PALETTE.azul],
    order: 2,
    mandatory: [
      'uki-goshi',
      'o-soto-gari',
      'o-goshi',
      'o-uchi-gari',
      'seoi-nage',
      'kuzure-kesa-gatame',
      'ushiro-kesa-gatame',
      'kata-gatame',
    ],
  },
  {
    // 2º grupo (Dai-nikyo).
    name: 'Amarela',
    colors: [BELT_PALETTE.amarela],
    order: 3,
    mandatory: [
      'ko-soto-gari',
      'ko-uchi-gari',
      'koshi-guruma',
      'tsurikomi-goshi',
      'okuri-ashi-harai',
      'tai-otoshi',
      'harai-goshi',
      'uchi-mata',
      'kami-shiho-gatame',
      'kuzure-kami-shiho-gatame',
      'yoko-shiho-gatame',
      'tate-shiho-gatame',
    ],
  },
  {
    // 3º grupo (Dai-sankyo).
    name: 'Laranja',
    colors: [BELT_PALETTE.laranja],
    order: 4,
    mandatory: [
      'ko-soto-gake',
      'tsuri-goshi',
      'yoko-otoshi',
      'ashi-guruma',
      'hane-goshi',
      'harai-tsurikomi-ashi',
      'tomoe-nage',
      'kata-guruma',
      'uki-gatame',
      'ura-gatame',
      'nami-juji-jime',
      'gyaku-juji-jime',
      'kata-juji-jime',
      'hadaka-jime',
    ],
  },
  {
    // 4º grupo (Dai-yonkyo).
    name: 'Verde',
    colors: [BELT_PALETTE.verde],
    order: 5,
    mandatory: [
      'sumi-gaeshi',
      'tani-otoshi',
      'hane-makikomi',
      'sukui-nage',
      'utsuri-goshi',
      'o-guruma',
      'soto-makikomi',
      'uki-otoshi',
      'okuri-eri-jime',
      'kata-ha-jime',
      'katate-jime',
      'ryote-jime',
      'sode-guruma-jime',
      'tsukkomi-jime',
      'sankaku-jime',
      'ude-garami',
      'ude-hishigi-juji-gatame',
    ],
  },
  {
    // 5º grupo (Dai-gokyo).
    name: 'Roxa',
    colors: [BELT_PALETTE.roxa],
    order: 6,
    mandatory: [
      'o-soto-guruma',
      'uki-waza',
      'yoko-wakare',
      'yoko-guruma',
      'ushiro-goshi',
      'ura-nage',
      'sumi-otoshi',
      'yoko-gake',
      'ude-hishigi-ude-gatame',
      'ude-hishigi-hiza-gatame',
      'ude-hishigi-waki-gatame',
      'ude-hishigi-hara-gatame',
      'ude-hishigi-ashi-gatame',
      'ude-hishigi-te-gatame',
      'ude-hishigi-sankaku-gatame',
    ],
  },
  {
    // Habukareta-waza (obrigatórias) e as demais técnicas da lista da Kodokan (complementares).
    name: 'Marrom',
    colors: [BELT_PALETTE.marrom],
    order: 7,
    mandatory: [
      'obi-otoshi',
      'seoi-otoshi',
      'yama-arashi',
      'o-soto-otoshi',
      'daki-wakare',
      'hikikomi-gaeshi',
      'tawara-gaeshi',
      'uchi-makikomi',
    ],
    optional: [
      'morote-gari',
      'kuchiki-taoshi',
      'kibisu-gaeshi',
      'uchi-mata-sukashi',
      'tsubame-gaeshi',
      'o-soto-gaeshi',
      'o-uchi-gaeshi',
      'hane-goshi-gaeshi',
      'harai-goshi-gaeshi',
      'uchi-mata-gaeshi',
      'ko-uchi-gaeshi',
      'obi-tori-gaeshi',
      'o-soto-makikomi',
      'uchi-mata-makikomi',
      'harai-makikomi',
      'ko-uchi-makikomi',
      'kani-basami',
      'kawazu-gake',
      'ippon-seoi-nage',
      'sode-tsurikomi-goshi',
      'do-jime',
      'ashi-garami',
    ],
  },
  { name: 'Preta', colors: [BELT_PALETTE.preta], order: 8, mandatory: [] },
];
