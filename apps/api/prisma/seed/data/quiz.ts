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
  {
    prompt: 'O que significa "Hiza-guruma"?',
    belt: 'Cinza',
    technique: 'hiza-guruma',
    options: [
      { text: 'Roda pelo joelho', correct: true },
      { text: 'Roda pelo quadril' },
      { text: 'Ceifada no joelho' },
      { text: 'Varrida no pé avançado' },
    ],
  },
  {
    prompt: 'Em Sasae-tsurikomi-ashi, onde tori apoia a sola do pé?',
    belt: 'Cinza',
    technique: 'sasae-tsurikomi-ashi',
    options: [
      { text: 'Na frente do tornozelo de uke', correct: true },
      { text: 'Atrás do joelho de uke' },
      { text: 'Na coxa de uke' },
      { text: 'No quadril de uke' },
    ],
  },
  {
    prompt: 'Qual é a primeira técnica do 1º grupo do Gokyo?',
    belt: 'Cinza',
    technique: 'de-ashi-harai',
    options: [
      { text: 'De-ashi-harai', correct: true },
      { text: 'O-soto-gari' },
      { text: 'Seoi-nage' },
      { text: 'Uki-goshi' },
    ],
    explanation: 'O 1º grupo começa com De-ashi-harai.',
  },
  {
    prompt: 'Mae-mawari-ukemi é:',
    belt: 'Cinza',
    technique: 'mae-mawari-ukemi',
    options: [
      { text: 'Rolamento para a frente terminando em queda lateral', correct: true },
      { text: 'Queda para trás' },
      { text: 'Queda frontal com os antebraços' },
      { text: 'Queda de lado sem rolar' },
    ],
  },
  {
    prompt: 'O que significa "O-goshi"?',
    belt: 'Azul',
    technique: 'o-goshi',
    options: [
      { text: 'Grande quadril', correct: true },
      { text: 'Pequeno quadril' },
      { text: 'Quadril flutuante' },
      { text: 'Quadril que salta' },
    ],
  },
  {
    prompt: 'O-uchi-gari ceifa a perna de uke:',
    belt: 'Azul',
    technique: 'o-uchi-gari',
    options: [
      { text: 'Por dentro', correct: true },
      { text: 'Por fora' },
      { text: 'Pela frente do tornozelo' },
      { text: 'Pelas duas pernas ao mesmo tempo' },
    ],
  },
  {
    prompt: 'Qual imobilização prende a cabeça e um braço de uke juntos?',
    belt: 'Azul',
    technique: 'kata-gatame',
    options: [
      { text: 'Kata-gatame', correct: true },
      { text: 'Kesa-gatame' },
      { text: 'Tate-shiho-gatame' },
      { text: 'Kami-shiho-gatame' },
    ],
  },
  {
    prompt: 'Quantas técnicas há em cada grupo do Gokyo?',
    belt: 'Amarela',
    options: [{ text: '8', correct: true }, { text: '5' }, { text: '10' }, { text: '12' }],
    explanation: 'São 5 grupos de 8 técnicas, 40 no total.',
  },
  {
    prompt: 'Em Okuri-ashi-harai, tori varre:',
    belt: 'Amarela',
    technique: 'okuri-ashi-harai',
    options: [
      { text: 'Os dois pés de uke juntos, de lado', correct: true },
      { text: 'Um pé de uke por trás' },
      { text: 'A coxa de uke' },
      { text: 'O joelho de uke' },
    ],
  },
  {
    prompt: 'O que significa "Tai-otoshi"?',
    belt: 'Amarela',
    technique: 'tai-otoshi',
    options: [
      { text: 'Queda do corpo', correct: true },
      { text: 'Queda pelo canto' },
      { text: 'Queda flutuante' },
      { text: 'Queda lateral' },
    ],
  },
  {
    prompt: 'Em Harai-goshi, a perna de tori:',
    belt: 'Amarela',
    technique: 'harai-goshi',
    options: [
      { text: 'Varre a coxa de uke, estendida', correct: true },
      { text: 'Ceifa o calcanhar de uke' },
      { text: 'Fica dobrada como uma mola' },
      { text: 'Bloqueia o tornozelo de uke' },
    ],
  },
  {
    prompt: 'Kami-shiho-gatame controla uke:',
    belt: 'Amarela',
    technique: 'kami-shiho-gatame',
    options: [
      { text: 'Pela cabeça, segurando a faixa pelos lados', correct: true },
      { text: 'Pela lateral, perpendicular ao corpo' },
      { text: 'Montado sobre o tronco' },
      { text: 'Sentado ao lado, em diagonal' },
    ],
  },
  {
    prompt: 'Qual é a diferença entre Ko-soto-gari e Ko-soto-gake?',
    belt: 'Laranja',
    technique: 'ko-soto-gake',
    options: [
      { text: 'No gake tori engancha o calcanhar; no gari ele ceifa', correct: true },
      { text: 'Não há diferença' },
      { text: 'O gake é feito só com as mãos' },
      { text: 'O gari é uma técnica de sacrifício' },
    ],
  },
  {
    prompt: 'Tomoe-nage é uma técnica de:',
    belt: 'Laranja',
    technique: 'tomoe-nage',
    options: [
      { text: 'Sacrifício para trás (ma-sutemi-waza)', correct: true },
      { text: 'Quadril (koshi-waza)' },
      { text: 'Braço (te-waza)' },
      { text: 'Sacrifício lateral (yoko-sutemi-waza)' },
    ],
  },
  {
    prompt: 'O que significa "Hane-goshi"?',
    belt: 'Laranja',
    technique: 'hane-goshi',
    options: [
      { text: 'Quadril que salta', correct: true },
      { text: 'Quadril que varre' },
      { text: 'Grande quadril' },
      { text: 'Quadril que levanta' },
    ],
  },
  {
    prompt: 'Em Nami-juji-jime, as palmas das mãos de tori ficam:',
    belt: 'Laranja',
    technique: 'nami-juji-jime',
    options: [
      { text: 'Viradas para baixo', correct: true },
      { text: 'Viradas para cima' },
      { text: 'Uma para cima e outra para baixo' },
      { text: 'Fechadas, sem segurar a gola' },
    ],
  },
  {
    prompt: 'Hadaka-jime é aplicado:',
    belt: 'Laranja',
    technique: 'hadaka-jime',
    options: [
      { text: 'Sem usar a gola, com o antebraço no pescoço', correct: true },
      { text: 'Segurando as duas golas cruzadas' },
      { text: 'Com as pernas em triângulo' },
      { text: 'Com o joelho na barriga' },
    ],
  },
  {
    prompt: 'O que significa "Tani-otoshi"?',
    belt: 'Verde',
    technique: 'tani-otoshi',
    options: [
      { text: 'Queda no vale', correct: true },
      { text: 'Queda lateral' },
      { text: 'Queda pelo canto' },
      { text: 'Queda flutuante' },
    ],
  },
  {
    prompt: 'No judô, as chaves de articulação (kansetsu-waza) só podem ser aplicadas:',
    belt: 'Verde',
    technique: 'ude-hishigi-juji-gatame',
    options: [
      { text: 'No cotovelo', correct: true },
      { text: 'No joelho' },
      { text: 'No punho' },
      { text: 'No ombro e no tornozelo' },
    ],
    explanation: 'Pelas regras, chave de articulação só no cotovelo.',
  },
  {
    prompt: 'Sankaku-jime usa:',
    belt: 'Verde',
    technique: 'sankaku-jime',
    options: [
      { text: 'As pernas em forma de triângulo', correct: true },
      { text: 'Só uma mão na gola' },
      { text: 'A manga do próprio judogi' },
      { text: 'O antebraço, sem gola' },
    ],
  },
  {
    prompt: 'Uki-otoshi é uma projeção feita principalmente com:',
    belt: 'Verde',
    technique: 'uki-otoshi',
    options: [
      { text: 'As mãos', correct: true },
      { text: 'O quadril' },
      { text: 'A perna, ceifando' },
      { text: 'Um sacrifício para trás' },
    ],
  },
  {
    prompt: 'O que significa "Yoko-guruma"?',
    belt: 'Roxa',
    technique: 'yoko-guruma',
    options: [
      { text: 'Roda lateral', correct: true },
      { text: 'Gancho lateral' },
      { text: 'Separação lateral' },
      { text: 'Queda lateral' },
    ],
  },
  {
    prompt: 'Ura-nage é uma técnica de:',
    belt: 'Roxa',
    technique: 'ura-nage',
    options: [
      { text: 'Sacrifício para trás', correct: true },
      { text: 'Quadril' },
      { text: 'Perna' },
      { text: 'Braço' },
    ],
  },
  {
    prompt: 'Ushiro-goshi é usado como:',
    belt: 'Roxa',
    technique: 'ushiro-goshi',
    options: [
      { text: 'Contra-ataque a um golpe de quadril', correct: true },
      { text: 'Ataque inicial pela frente' },
      { text: 'Imobilização' },
      { text: 'Estrangulamento' },
    ],
  },
  {
    prompt: 'Qual grupo reúne as técnicas retiradas do Gokyo em 1920?',
    belt: 'Marrom',
    options: [
      { text: 'Habukareta-waza', correct: true },
      { text: 'Shinmeisho-no-waza' },
      { text: 'Dai-ikkyo' },
      { text: 'Kinshi-waza' },
    ],
  },
  {
    prompt: 'Por que Kani-basami é proibida em competição?',
    belt: 'Marrom',
    technique: 'kani-basami',
    options: [
      { text: 'Pelo alto risco de lesão no joelho de uke', correct: true },
      { text: 'Porque é fácil demais' },
      { text: 'Porque é um estrangulamento' },
      { text: 'Porque só vale no Nage-no-kata' },
    ],
  },
  {
    prompt: '"Jita-kyoei" significa:',
    belt: 'Marrom',
    options: [
      { text: 'Prosperidade mútua', correct: true },
      { text: 'Máxima eficiência' },
      { text: 'Caminho suave' },
      { text: 'Respeito ao professor' },
    ],
  },
  {
    prompt: '"Seiryoku-zen\'yo" significa:',
    options: [
      { text: 'Máxima eficiência com o mínimo esforço', correct: true },
      { text: 'Prosperidade mútua' },
      { text: 'Cumprimento ajoelhado' },
      { text: 'Desequilíbrio' },
    ],
  },
  {
    prompt: 'O que significa a palavra "Judô"?',
    options: [
      { text: 'Caminho suave', correct: true },
      { text: 'Arte da guerra' },
      { text: 'Mão vazia' },
      { text: 'Luta de chão' },
    ],
  },
  {
    prompt: 'Em que ano o Instituto Kodokan foi fundado?',
    options: [
      { text: '1882', correct: true },
      { text: '1964' },
      { text: '1900' },
      { text: '1945' },
    ],
  },
  {
    prompt: 'Qual comando do árbitro anuncia o início de uma imobilização?',
    options: [
      { text: 'Osaekomi', correct: true },
      { text: 'Toketa' },
      { text: 'Matte' },
      { text: 'Hajime' },
    ],
  },
  {
    prompt: '"Toketa" indica que:',
    options: [
      { text: 'A imobilização foi desfeita', correct: true },
      { text: 'A luta terminou' },
      { text: 'Os atletas devem parar sem se mexer' },
      { text: 'Houve punição' },
    ],
  },
  {
    prompt: 'Hikite é:',
    options: [
      { text: 'A mão que puxa, geralmente na manga', correct: true },
      { text: 'A mão que levanta, na gola' },
      { text: 'A postura defensiva' },
      { text: 'O passo sem cruzar os pés' },
    ],
  },
];
