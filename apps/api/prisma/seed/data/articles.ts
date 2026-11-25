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
    slug: 'jigoro-kano',
    category: 'historia',
    title: 'Jigoro Kano, o fundador',
    order: 1,
    richContent: doc(
      "Jigoro Kano (1860–1938) era um jovem franzino que começou a estudar jiu-jitsu para se fortalecer. Treinou nas escolas Tenjin Shin'yo-ryu e Kito-ryu e percebeu que podia reunir o melhor delas num método mais seguro e educativo.",
      'Em 1882, aos 22 anos, fundou o Kodokan num pequeno templo budista em Tóquio, com poucos alunos e um tatame de 12 lugares.',
      'Educador, Kano dirigiu escolas, foi o primeiro membro asiático do Comitê Olímpico Internacional e defendia o judô como forma de educação física, intelectual e moral.',
      { heading: 'Os dois princípios' },
      {
        list: [
          "Seiryoku-zen'yo: usar a energia do corpo e da mente da forma mais eficiente.",
          'Jita-kyoei: buscar o progresso próprio junto com o dos outros.',
        ],
      },
    ),
  },
  {
    slug: 'kodokan-e-gokyo',
    category: 'historia',
    title: 'O Kodokan e o Gokyo',
    order: 2,
    richContent: doc(
      'O Instituto Kodokan, em Tóquio, é a sede mundial do judô. É ele que define os nomes e a classificação oficial das técnicas.',
      'Em 1895 o Kodokan organizou as projeções num programa de ensino chamado Gokyo-no-waza ("técnicas dos cinco ensinamentos"). Em 1920 o Gokyo foi revisado e ficou com 40 técnicas, em 5 grupos de 8, da mais simples para a mais complexa.',
      { heading: 'A lista oficial hoje' },
      {
        list: [
          'Gokyo-no-waza: as 40 projeções básicas.',
          'Habukareta-waza: 8 técnicas que saíram do Gokyo em 1920 e foram reintegradas em 1982.',
          'Shinmeisho-no-waza: técnicas reconhecidas depois, como morote-gari e uchi-mata-sukashi.',
          'Ao todo, a Kodokan reconhece 68 projeções (nage-waza) e 32 técnicas de solo (katame-waza).',
        ],
      },
      'Os vídeos das técnicas neste app são do canal oficial da Kodokan no YouTube.',
    ),
  },
  {
    slug: 'judo-no-brasil',
    category: 'historia',
    title: 'O judô no Brasil',
    order: 3,
    richContent: doc(
      'O judô chegou ao Brasil com a imigração japonesa, no início do século XX, e se espalhou principalmente a partir de São Paulo.',
      'A Confederação Brasileira de Judô (CBJ) foi fundada em 1969. O judô é o esporte que mais deu medalhas olímpicas ao Brasil, desde o bronze de Chiaki Ishii em Munique 1972.',
    ),
  },
  {
    slug: 'regras-do-dojo',
    category: 'etiqueta',
    title: 'Regras de convivência no dojo',
    order: 1,
    richContent: doc(
      'O dojo é um lugar de aprendizado e respeito. Algumas regras valem em quase todas as academias:',
      {
        list: [
          'Chegue no horário. Se atrasar, espere o professor autorizar a entrada no tatame.',
          'Cumprimente ao entrar e sair do dojo e do tatame.',
          'Use chinelo fora do tatame e nunca pise nele calçado.',
          'Unhas das mãos e dos pés curtas e limpas; cabelo comprido preso.',
          'Tire brincos, anéis, relógios e outros acessórios.',
          'Judogi limpo e sem rasgos. A faixa é amarrada com nó direito na frente.',
          'Não saia do tatame sem avisar o professor.',
          'Bata (tap) no tatame ou no parceiro para desistir. Quem aplica a técnica solta na hora.',
        ],
      },
    ),
  },
  {
    slug: 'como-amarrar-a-faixa',
    category: 'etiqueta',
    title: 'Como amarrar a faixa',
    order: 2,
    richContent: doc({
      list: [
        'Coloque o meio da faixa na frente da barriga, um pouco abaixo do umbigo.',
        'Dê a volta pelas costas e traga as duas pontas para a frente.',
        'Passe a ponta de cima por baixo das duas voltas, de baixo para cima.',
        'Faça um nó direito (o mesmo do cadarço, sem laço): as pontas ficam do mesmo tamanho, apontando para os lados.',
      ],
    }),
  },
  {
    slug: 'graduacao',
    category: 'etiqueta',
    title: 'Como funciona a graduação',
    order: 3,
    richContent: doc(
      'As faixas coloridas são os graus kyu e a faixa preta começa no 1º dan. No Brasil, a sequência mais comum é: branca, cinza, azul, amarela, laranja, verde, roxa, marrom e preta. As faixas cinza e azul costumam ser usadas por crianças.',
      'Para mudar de faixa, além do tempo mínimo de treino e da idade, o aluno faz um exame com as técnicas do seu programa, a terminologia e, nas faixas mais altas, os kata.',
      'Cada federação estadual e academia tem as suas regras. O programa deste app segue a ordem do Gokyo da Kodokan; confirme com o seu professor o que vai ser cobrado.',
    ),
  },
  {
    slug: 'punicoes',
    category: 'regras',
    title: 'Punições (shido)',
    order: 1,
    richContent: doc(
      'O shido é uma punição leve. Alguns exemplos de atitudes que levam a shido:',
      {
        list: [
          'Falta de combatividade (passividade).',
          'Sair da área de luta sem estar aplicando uma técnica.',
          'Fazer pegadas não permitidas ou ficar só se defendendo.',
          'Falsos ataques para ganhar tempo.',
        ],
      },
      'Acumular punições leva ao hansoku-make (desclassificação). Atitudes perigosas, como derrubar o adversário de cabeça, também podem dar hansoku-make direto.',
      'Os detalhes mudam a cada ciclo olímpico: confira as regras vigentes da Federação Internacional de Judô (IJF).',
    ),
  },
  {
    slug: 'tecnicas-proibidas',
    category: 'regras',
    title: 'Técnicas proibidas em competição',
    order: 2,
    richContent: doc(
      'Algumas técnicas da lista da Kodokan não podem ser usadas em competição pelo risco de lesão. Elas são estudadas como parte do judô tradicional:',
      {
        list: [
          'Kani-basami e Kawazu-gake: risco alto para o joelho.',
          'Do-jime (aperto do tronco com as pernas) e Ashi-garami (chave de perna).',
          'Chaves em qualquer articulação que não seja o cotovelo.',
          'Waki-gatame aplicado em pé, derrubando o adversário.',
        ],
      },
      'Nas regras atuais da IJF, as pegadas diretas nas pernas (como morote-gari e kuchiki-taoshi) também são punidas.',
    ),
  },
  {
    slug: 'nage-no-kata',
    category: 'kata',
    title: 'Nage-no-kata',
    order: 0,
    richContent: doc(
      'O Nage-no-kata ("forma das projeções") reúne 15 técnicas em 5 séries de 3, executadas para os dois lados. Costuma ser cobrado no exame de faixa preta.',
      {
        list: [
          'Te-waza: uki-otoshi, seoi-nage, kata-guruma.',
          'Koshi-waza: uki-goshi, harai-goshi, tsurikomi-goshi.',
          'Ashi-waza: okuri-ashi-harai, sasae-tsurikomi-ashi, uchi-mata.',
          'Ma-sutemi-waza: tomoe-nage, ura-nage, sumi-gaeshi.',
          'Yoko-sutemi-waza: yoko-gake, yoko-guruma, uki-waza.',
        ],
      },
    ),
  },
  {
    slug: 'katame-no-kata',
    category: 'kata',
    title: 'Katame-no-kata',
    order: 1,
    richContent: doc(
      'O Katame-no-kata ("forma do controle") reúne 15 técnicas de solo em 3 séries de 5.',
      {
        list: [
          'Osaekomi-waza: kesa-gatame, kata-gatame, kami-shiho-gatame, kuzure-kami-shiho-gatame, yoko-shiho-gatame.',
          'Shime-waza: kata-juji-jime, hadaka-jime, okuri-eri-jime, kata-ha-jime, gyaku-juji-jime.',
          'Kansetsu-waza: ude-garami, ude-hishigi-juji-gatame, ude-hishigi-ude-gatame, ude-hishigi-hiza-gatame, ashi-garami.',
        ],
      },
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
