export interface CategorySeed {
  slug: string;
  name: string;
  parent?: string;
  order: number;
}

export const categories: CategorySeed[] = [
  { slug: 'ukemi', name: 'Ukemi (quedas)', order: 0 },

  { slug: 'nage-waza', name: 'Nage-waza (projeções)', order: 1 },
  { slug: 'te-waza', name: 'Te-waza (técnicas de braço)', parent: 'nage-waza', order: 0 },
  { slug: 'koshi-waza', name: 'Koshi-waza (técnicas de quadril)', parent: 'nage-waza', order: 1 },
  { slug: 'ashi-waza', name: 'Ashi-waza (técnicas de perna)', parent: 'nage-waza', order: 2 },
  {
    slug: 'ma-sutemi-waza',
    name: 'Ma-sutemi-waza (sacrifício para trás)',
    parent: 'nage-waza',
    order: 3,
  },
  {
    slug: 'yoko-sutemi-waza',
    name: 'Yoko-sutemi-waza (sacrifício lateral)',
    parent: 'nage-waza',
    order: 4,
  },

  { slug: 'katame-waza', name: 'Katame-waza (controle no solo)', order: 2 },
  { slug: 'osaekomi-waza', name: 'Osaekomi-waza (imobilizações)', parent: 'katame-waza', order: 0 },
  { slug: 'shime-waza', name: 'Shime-waza (estrangulamentos)', parent: 'katame-waza', order: 1 },
  {
    slug: 'kansetsu-waza',
    name: 'Kansetsu-waza (chaves de articulação)',
    parent: 'katame-waza',
    order: 2,
  },

  { slug: 'kata', name: 'Kata', order: 3 },
  { slug: 'terminologia', name: 'Terminologia', order: 4 },
  { slug: 'historia', name: 'História', order: 5 },
  { slug: 'etiqueta', name: 'Etiqueta', order: 6 },
  { slug: 'regras', name: 'Regras', order: 7 },
];
