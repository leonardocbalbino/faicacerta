export interface TechniqueSeed {
  slug: string;
  category: string;
  japaneseName: string;
  japaneseScript: string;
  translation: string;
  summary: string;
  keyPoints?: string[];
  commonMistakes?: string[];
  examinerCriteria?: string;
  related?: string[];
}

/**
 * Conteúdo de exemplo. As técnicas mais detalhadas servem de modelo para o
 * editor de conteúdo completar as demais pelo CMS.
 */
export const techniques: TechniqueSeed[] = [
  // --- Ukemi ---------------------------------------------------------------
  {
    slug: 'ushiro-ukemi',
    category: 'ukemi',
    japaneseName: 'Ushiro-ukemi',
    japaneseScript: '後受身',
    translation: 'Queda para trás',
    summary:
      'Queda para trás amortecida com os braços. É a primeira queda ensinada e protege a cabeça e a coluna.',
    keyPoints: [
      'Queixo encostado no peito durante toda a queda.',
      'Os braços batem no tatame ao mesmo tempo, a cerca de 45° do corpo.',
      'Rolar pelas costas arredondadas, sem bater a lombar de uma vez.',
    ],
    commonMistakes: [
      'Soltar o queixo e deixar a cabeça bater no tatame.',
      'Apoiar as mãos no chão em vez de bater com o braço inteiro.',
    ],
    examinerCriteria: 'Proteção da cabeça, batida simultânea dos braços e retorno equilibrado.',
    related: ['yoko-ukemi'],
  },
  {
    slug: 'yoko-ukemi',
    category: 'ukemi',
    japaneseName: 'Yoko-ukemi',
    japaneseScript: '横受身',
    translation: 'Queda lateral',
    summary:
      'Queda de lado, batendo com o braço do lado da queda. É a queda mais usada nas projeções.',
    related: ['ushiro-ukemi', 'mae-mawari-ukemi'],
  },
  {
    slug: 'mae-ukemi',
    category: 'ukemi',
    japaneseName: 'Mae-ukemi',
    japaneseScript: '前受身',
    translation: 'Queda para a frente',
    summary: 'Queda frontal amortecida com os antebraços, mantendo o rosto virado de lado.',
  },
  {
    slug: 'mae-mawari-ukemi',
    category: 'ukemi',
    japaneseName: 'Mae-mawari-ukemi',
    japaneseScript: '前回り受身',
    translation: 'Rolamento para a frente',
    summary: 'Rolamento sobre o ombro terminando em queda lateral.',
    related: ['yoko-ukemi'],
  },

  // --- Nage-waza: grupo 1 do Gokyo ------------------------------------------
  {
    slug: 'de-ashi-harai',
    category: 'ashi-waza',
    japaneseName: 'De-ashi-harai',
    japaneseScript: '出足払',
    translation: 'Varrida no pé avançado',
    summary:
      'Tori varre o pé de uke no momento em que ele avança e coloca o peso, com a sola do pé, no tempo certo.',
    keyPoints: [
      'Varrer no instante em que uke vai apoiar o peso no pé.',
      'Usar a sola do pé, não a canela.',
      'Puxar com as mãos na direção da varrida.',
    ],
    commonMistakes: ['Chutar em vez de varrer.', 'Varrer depois que o peso já está no pé.'],
    examinerCriteria: 'Sincronia (tempo), uso da sola do pé e kuzushi com as mãos.',
    related: ['okuri-ashi-harai', 'sasae-tsurikomi-ashi'],
  },
  {
    slug: 'hiza-guruma',
    category: 'ashi-waza',
    japaneseName: 'Hiza-guruma',
    japaneseScript: '膝車',
    translation: 'Roda no joelho',
    summary: 'Tori bloqueia o joelho de uke com a sola do pé e o faz girar em volta desse ponto.',
    related: ['sasae-tsurikomi-ashi'],
  },
  {
    slug: 'sasae-tsurikomi-ashi',
    category: 'ashi-waza',
    japaneseName: 'Sasae-tsurikomi-ashi',
    japaneseScript: '支釣込足',
    translation: 'Bloqueio do pé levantando e puxando',
    summary: 'Tori bloqueia o tornozelo de uke enquanto levanta e puxa com as mãos.',
    related: ['hiza-guruma', 'de-ashi-harai'],
  },
  {
    slug: 'uki-goshi',
    category: 'koshi-waza',
    japaneseName: 'Uki-goshi',
    japaneseScript: '浮腰',
    translation: 'Quadril flutuante',
    summary: 'Projeção de quadril com giro, abraçando a cintura de uke.',
    related: ['o-goshi'],
  },
  {
    slug: 'o-soto-gari',
    category: 'ashi-waza',
    japaneseName: 'O-soto-gari',
    japaneseScript: '大外刈',
    translation: 'Grande ceifada por fora',
    summary:
      'Tori desequilibra uke para trás, sobre o calcanhar, e ceifa a perna de apoio por fora com a parte de trás da coxa.',
    keyPoints: [
      'Kuzushi para trás, colocando o peso de uke no calcanhar.',
      'Pé de apoio de tori ao lado do pé de uke.',
      'Ceifar com a parte de trás da coxa, não com o calcanhar.',
      'Manter o peito colado no de uke.',
    ],
    commonMistakes: [
      'Ceifar sem desequilibrar antes.',
      'Inclinar o tronco para trás, perdendo o contato.',
      'Ceifar com o calcanhar, o que pode machucar uke.',
    ],
    examinerCriteria:
      'Kuzushi claro, entrada sem hesitação, ceifada ampla e controle de uke na queda.',
    related: ['o-uchi-gari', 'ko-soto-gari'],
  },
  {
    slug: 'o-goshi',
    category: 'koshi-waza',
    japaneseName: 'O-goshi',
    japaneseScript: '大腰',
    translation: 'Grande quadril',
    summary: 'Tori encaixa o quadril abaixo do de uke e o projeta por cima, abraçando as costas.',
    keyPoints: [
      'Quadril de tori mais baixo que o de uke.',
      'Joelhos flexionados na entrada e estendidos na projeção.',
      'Braço abraçando as costas de uke na altura da cintura.',
    ],
    commonMistakes: ['Entrar com o quadril alto.', 'Puxar uke só com os braços.'],
    related: ['uki-goshi', 'tsurikomi-goshi', 'koshi-guruma'],
  },
  {
    slug: 'o-uchi-gari',
    category: 'ashi-waza',
    japaneseName: 'O-uchi-gari',
    japaneseScript: '大内刈',
    translation: 'Grande ceifada por dentro',
    summary: 'Tori ceifa por dentro a perna de uke, desequilibrando-o para trás.',
    related: ['o-soto-gari', 'ko-uchi-gari'],
  },
  {
    slug: 'seoi-nage',
    category: 'te-waza',
    japaneseName: 'Seoi-nage',
    japaneseScript: '背負投',
    translation: 'Projeção pelas costas',
    summary: 'Tori gira, carrega uke nas costas e o projeta por cima do ombro.',
    related: ['tai-otoshi'],
  },

  // --- Nage-waza: grupo 2 do Gokyo ------------------------------------------
  {
    slug: 'ko-soto-gari',
    category: 'ashi-waza',
    japaneseName: 'Ko-soto-gari',
    japaneseScript: '小外刈',
    translation: 'Pequena ceifada por fora',
    summary: 'Tori ceifa o calcanhar de uke por fora, na direção dos dedos do pé dele.',
    related: ['o-soto-gari'],
  },
  {
    slug: 'ko-uchi-gari',
    category: 'ashi-waza',
    japaneseName: 'Ko-uchi-gari',
    japaneseScript: '小内刈',
    translation: 'Pequena ceifada por dentro',
    summary: 'Tori ceifa por dentro o calcanhar de uke.',
    related: ['o-uchi-gari'],
  },
  {
    slug: 'koshi-guruma',
    category: 'koshi-waza',
    japaneseName: 'Koshi-guruma',
    japaneseScript: '腰車',
    translation: 'Roda de quadril',
    summary: 'Projeção de quadril com o braço envolvendo o pescoço de uke.',
    related: ['o-goshi'],
  },
  {
    slug: 'tsurikomi-goshi',
    category: 'koshi-waza',
    japaneseName: 'Tsurikomi-goshi',
    japaneseScript: '釣込腰',
    translation: 'Quadril levantando e puxando',
    summary: 'Projeção de quadril em que a mão da gola levanta e puxa uke.',
    related: ['o-goshi'],
  },
  {
    slug: 'okuri-ashi-harai',
    category: 'ashi-waza',
    japaneseName: 'Okuri-ashi-harai',
    japaneseScript: '送足払',
    translation: 'Varrida dos dois pés',
    summary: 'Tori acompanha o deslocamento lateral de uke e varre os dois pés juntos.',
    related: ['de-ashi-harai'],
  },
  {
    slug: 'tai-otoshi',
    category: 'te-waza',
    japaneseName: 'Tai-otoshi',
    japaneseScript: '体落',
    translation: 'Queda do corpo',
    summary: 'Tori bloqueia a perna de uke com a sua e o projeta pela ação das mãos.',
    related: ['seoi-nage'],
  },
  {
    slug: 'harai-goshi',
    category: 'koshi-waza',
    japaneseName: 'Harai-goshi',
    japaneseScript: '払腰',
    translation: 'Varrida de quadril',
    summary: 'Tori encaixa o quadril e varre a coxa de uke com a perna estendida.',
    related: ['uchi-mata'],
  },
  {
    slug: 'uchi-mata',
    category: 'ashi-waza',
    japaneseName: 'Uchi-mata',
    japaneseScript: '内股',
    translation: 'Por dentro da coxa',
    summary: 'Tori levanta uke pela parte interna da coxa e o projeta à frente.',
    related: ['harai-goshi'],
  },

  // --- Osaekomi-waza --------------------------------------------------------
  {
    slug: 'kesa-gatame',
    category: 'osaekomi-waza',
    japaneseName: 'Kesa-gatame',
    japaneseScript: '袈裟固',
    translation: 'Imobilização em diagonal (como a faixa do monge)',
    summary:
      'Tori controla uke pela lateral, prendendo o braço dele sob a axila e envolvendo o pescoço.',
    keyPoints: [
      'Quadril de tori encostado nas costelas de uke.',
      'Pernas abertas para dar base.',
      'Braço de uke preso firmemente sob a axila.',
    ],
    commonMistakes: [
      'Ficar com as pernas juntas e perder a base.',
      'Deixar espaço entre o quadril e uke.',
    ],
    examinerCriteria: 'Controle estável, base larga e capacidade de manter a imobilização.',
    related: ['kuzure-kesa-gatame', 'kata-gatame'],
  },
  {
    slug: 'kuzure-kesa-gatame',
    category: 'osaekomi-waza',
    japaneseName: 'Kuzure-kesa-gatame',
    japaneseScript: '崩袈裟固',
    translation: 'Variação da imobilização em diagonal',
    summary: 'Variação de kesa-gatame com o braço passando por baixo da axila de uke.',
    related: ['kesa-gatame'],
  },
  {
    slug: 'kata-gatame',
    category: 'osaekomi-waza',
    japaneseName: 'Kata-gatame',
    japaneseScript: '肩固',
    translation: 'Imobilização pelo ombro',
    summary: 'Tori prende a cabeça e o braço de uke juntos.',
    related: ['kesa-gatame'],
  },
  {
    slug: 'kami-shiho-gatame',
    category: 'osaekomi-waza',
    japaneseName: 'Kami-shiho-gatame',
    japaneseScript: '上四方固',
    translation: 'Imobilização pelos quatro cantos, por cima',
    summary: 'Tori controla uke pela cabeça, segurando a faixa pelos lados.',
  },
  {
    slug: 'yoko-shiho-gatame',
    category: 'osaekomi-waza',
    japaneseName: 'Yoko-shiho-gatame',
    japaneseScript: '横四方固',
    translation: 'Imobilização pelos quatro cantos, de lado',
    summary: 'Tori controla uke pela lateral, perpendicular ao corpo dele.',
  },
  {
    slug: 'tate-shiho-gatame',
    category: 'osaekomi-waza',
    japaneseName: 'Tate-shiho-gatame',
    japaneseScript: '縦四方固',
    translation: 'Imobilização pelos quatro cantos, montado',
    summary: 'Tori monta sobre uke e controla a cabeça e um dos braços.',
  },
];
