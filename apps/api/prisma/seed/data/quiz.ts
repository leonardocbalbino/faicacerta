export interface QuizSeed {
  prompt: string;
  explanation?: string;
  belt?: string;
  technique?: string;
  options: { text: string; correct?: boolean }[];
}

export const quiz: QuizSeed[] = [
  {
    prompt: 'O que significa "O-soto-gari"?',
    belt: 'Azul',
    technique: 'o-soto-gari',
    options: [
      { text: 'Grande ceifada por fora', correct: true },
      { text: 'Grande ceifada por dentro' },
      { text: 'Pequena ceifada por fora' },
      { text: 'Grande quadril' },
    ],
  },
  {
    prompt:
      'Em qual queda o judoca deve manter o queixo encostado no peito para proteger a cabeça?',
    belt: 'Cinza',
    technique: 'ushiro-ukemi',
    options: [
      { text: 'Ushiro-ukemi', correct: true },
      { text: 'Em nenhuma queda' },
      { text: 'Só no rolamento' },
    ],
    explanation: 'Em todas as quedas para trás o queixo fica no peito.',
  },
  {
    prompt: 'Quem aplica a técnica é chamado de:',
    options: [
      { text: 'Tori', correct: true },
      { text: 'Uke' },
      { text: 'Sensei' },
      { text: 'Rei' },
    ],
  },
  {
    prompt: 'Qual comando do árbitro interrompe a luta?',
    options: [
      { text: 'Matte', correct: true },
      { text: 'Hajime' },
      { text: 'Yoshi' },
      { text: 'Osaekomi' },
    ],
  },
  {
    prompt: '"Kuzushi" é:',
    options: [
      { text: 'O desequilíbrio do adversário', correct: true },
      { text: 'A execução final da técnica' },
      { text: 'Um tipo de imobilização' },
    ],
  },
  {
    prompt: 'De-ashi-harai é uma técnica de:',
    belt: 'Cinza',
    technique: 'de-ashi-harai',
    options: [
      { text: 'Perna (ashi-waza)', correct: true },
      { text: 'Quadril (koshi-waza)' },
      { text: 'Braço (te-waza)' },
      { text: 'Sacrifício (sutemi-waza)' },
    ],
  },
  {
    prompt: 'Na imobilização Kesa-gatame, as pernas de tori devem ficar:',
    belt: 'Cinza',
    technique: 'kesa-gatame',
    options: [
      { text: 'Abertas, para dar base', correct: true },
      { text: 'Juntas e esticadas' },
      { text: 'Cruzadas por cima de uke' },
    ],
  },
  {
    prompt: 'Quem fundou o judô?',
    options: [
      { text: 'Jigoro Kano', correct: true },
      { text: 'Morihei Ueshiba' },
      { text: 'Gichin Funakoshi' },
    ],
    explanation: 'Jigoro Kano fundou o Instituto Kodokan em 1882, em Tóquio.',
  },
];
