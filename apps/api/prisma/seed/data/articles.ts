import { doc } from '../tiptap.js';

export const articles = [
  {
    slug: 'origem-do-judo',
    category: 'historia',
    title: 'A origem do judô',
    order: 0,
    richContent: doc(
      'O judô foi criado por Jigoro Kano, que fundou o Instituto Kodokan em 1882, em Tóquio, a partir do estudo de escolas antigas de jiu-jitsu.',
      "Kano retirou as técnicas mais perigosas e organizou o treino em torno de dois princípios: o melhor uso da energia (seiryoku zen'yo) e a prosperidade mútua (jita kyoei).",
      'O judô entrou nos Jogos Olímpicos em 1964, em Tóquio.',
    ),
  },
  {
    slug: 'cumprimento-rei',
    category: 'etiqueta',
    title: 'O cumprimento (rei)',
    order: 0,
    richContent: doc(
      'O cumprimento expressa respeito pelo local de treino, pelo professor e pelo parceiro.',
      { list: ['Ritsurei: cumprimento em pé.', 'Zarei: cumprimento ajoelhado.'] },
      'Cumprimente ao entrar e sair do tatame e antes e depois de treinar com cada parceiro.',
    ),
  },
  {
    slug: 'pontuacao-basica',
    category: 'regras',
    title: 'Pontuação básica',
    order: 0,
    richContent: doc(
      'Este é um resumo para iniciantes. As regras oficiais mudam de tempos em tempos: confira sempre a versão vigente da federação.',
      {
        list: [
          'Ippon: ponto completo, encerra a luta.',
          'Waza-ari: meio ponto.',
          'Shido: punição leve. O acúmulo de punições leva à desclassificação (hansoku-make).',
        ],
      },
    ),
  },
];
