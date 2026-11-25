import type { TechniqueSeed } from './techniques.js';

/**
 * Restante das 100 técnicas oficiais da Kodokan (68 nage-waza e 32 katame-waza),
 * além das que já estão em techniques.ts. Classificação e nomes seguem a lista
 * oficial da Kodokan (Gokyo-no-waza, Habukareta-waza e Shinmeisho-no-waza).
 */
export const kodokanTechniques: TechniqueSeed[] = [
  // --- Te-waza ---------------------------------------------------------------
  {
    slug: 'ippon-seoi-nage',
    category: 'te-waza',
    japaneseName: 'Ippon-seoi-nage',
    japaneseScript: '一本背負投',
    translation: 'Projeção pelas costas segurando um braço',
    summary:
      'Tori gira de costas, prende o braço de uke na dobra do cotovelo e o projeta por cima do ombro.',
    keyPoints: [
      'O cotovelo de tori encaixa firme na axila de uke.',
      'Os joelhos dobram para baixar o quadril abaixo do de uke.',
      'Puxar com a mão da manga antes de girar, levando uke para a frente.',
    ],
    commonMistakes: ['Girar sem desequilibrar uke antes.', 'Ficar com o quadril alto e longe.'],
    related: ['seoi-nage', 'seoi-otoshi'],
  },
  {
    slug: 'seoi-otoshi',
    category: 'te-waza',
    japaneseName: 'Seoi-otoshi',
    japaneseScript: '背負落',
    translation: 'Queda pelas costas',
    summary:
      'Parecida com seoi-nage, mas tori desce sobre um ou os dois joelhos ou estende a perna para bloquear e derrubar uke à frente.',
    related: ['seoi-nage', 'ippon-seoi-nage'],
  },
  {
    slug: 'kata-guruma',
    category: 'te-waza',
    japaneseName: 'Kata-guruma',
    japaneseScript: '肩車',
    translation: 'Roda pelos ombros',
    summary: 'Tori coloca uke sobre os ombros, como numa carga, e o projeta à frente pelo lado.',
    keyPoints: [
      'Desequilibrar uke para a frente antes de entrar por baixo.',
      'Levantar com as pernas, não com as costas.',
    ],
  },
  {
    slug: 'sukui-nage',
    category: 'te-waza',
    japaneseName: 'Sukui-nage',
    japaneseScript: '掬投',
    translation: 'Projeção em concha',
    summary: 'Tori passa por trás de uke, apanha suas pernas por baixo e o projeta para trás.',
  },
  {
    slug: 'obi-otoshi',
    category: 'te-waza',
    japaneseName: 'Obi-otoshi',
    japaneseScript: '帯落',
    translation: 'Queda pela faixa',
    summary:
      'Tori segura a faixa de uke pela frente, passa para trás dele e o derruba para trás. Técnica do grupo Habukareta-waza.',
  },
  {
    slug: 'uki-otoshi',
    category: 'te-waza',
    japaneseName: 'Uki-otoshi',
    japaneseScript: '浮落',
    translation: 'Queda flutuante',
    summary:
      'Projeção só com as mãos: tori aproveita o avanço de uke, desce sobre um joelho e o faz girar no ar à frente. Abre o Nage-no-kata.',
  },
  {
    slug: 'sumi-otoshi',
    category: 'te-waza',
    japaneseName: 'Sumi-otoshi',
    japaneseScript: '隅落',
    translation: 'Queda pelo canto',
    summary:
      'Tori empurra e torce uke para o canto de trás dele, sem contato das pernas. Também chamada de "kuki-nage" (projeção no ar).',
  },
  {
    slug: 'yama-arashi',
    category: 'te-waza',
    japaneseName: 'Yama-arashi',
    japaneseScript: '山嵐',
    translation: 'Tempestade na montanha',
    summary:
      'Tori segura gola e manga do mesmo lado, encaixa como num seoi-nage e varre a perna de uke. Técnica do grupo Habukareta-waza.',
  },
  {
    slug: 'obi-tori-gaeshi',
    category: 'te-waza',
    japaneseName: 'Obi-tori-gaeshi',
    japaneseScript: '帯取返',
    translation: 'Reversão segurando a faixa',
    summary:
      'Contra uke que se abaixa, tori segura a faixa por cima das costas dele e o vira para trás. Técnica do Shinmeisho-no-waza.',
  },
  {
    slug: 'morote-gari',
    category: 'te-waza',
    japaneseName: 'Morote-gari',
    japaneseScript: '双手刈',
    translation: 'Ceifada com as duas mãos',
    summary:
      'Tori agarra as duas pernas de uke por trás dos joelhos e o derruba de costas. Proibida em competição (pegada direta nas pernas).',
  },
  {
    slug: 'kuchiki-taoshi',
    category: 'te-waza',
    japaneseName: 'Kuchiki-taoshi',
    japaneseScript: '朽木倒',
    translation: 'Derrubada da árvore podre',
    summary:
      'Tori segura uma perna de uke por trás do joelho e o derruba para trás, empurrando com a outra mão. Proibida em competição.',
  },
  {
    slug: 'kibisu-gaeshi',
    category: 'te-waza',
    japaneseName: 'Kibisu-gaeshi',
    japaneseScript: '踵返',
    translation: 'Reversão pelo calcanhar',
    summary:
      'Tori puxa o calcanhar de uke com a mão enquanto empurra o tronco dele para trás. Proibida em competição.',
  },
  {
    slug: 'uchi-mata-sukashi',
    category: 'te-waza',
    japaneseName: 'Uchi-mata-sukashi',
    japaneseScript: '内股すかし',
    translation: 'Esquiva do uchi-mata',
    summary:
      'Contra-ataque: tori desvia a perna do uchi-mata de uke, deixando-a passar no vazio, e o projeta com as mãos.',
    related: ['uchi-mata'],
  },
  {
    slug: 'ko-uchi-gaeshi',
    category: 'te-waza',
    japaneseName: 'Ko-uchi-gaeshi',
    japaneseScript: '小内返',
    translation: 'Reversão do ko-uchi-gari',
    summary:
      'Contra-ataque: quando uke ataca com ko-uchi-gari, tori tira a perna e gira uke no sentido do ataque com as mãos.',
    related: ['ko-uchi-gari'],
  },

  // --- Koshi-waza ------------------------------------------------------------
  {
    slug: 'sode-tsurikomi-goshi',
    category: 'koshi-waza',
    japaneseName: 'Sode-tsurikomi-goshi',
    japaneseScript: '袖釣込腰',
    translation: 'Projeção de quadril puxando pela manga',
    summary:
      'Tori segura as duas mangas, levanta um dos braços de uke para cima e entra com o quadril por baixo para projetá-lo.',
    related: ['tsurikomi-goshi'],
  },
  {
    slug: 'tsuri-goshi',
    category: 'koshi-waza',
    japaneseName: 'Tsuri-goshi',
    japaneseScript: '釣腰',
    translation: 'Quadril que levanta',
    summary:
      'Tori segura a faixa de uke (por cima do ombro em o-tsuri-goshi, por baixo do braço em ko-tsuri-goshi), levanta e projeta pelo quadril.',
  },
  {
    slug: 'hane-goshi',
    category: 'koshi-waza',
    japaneseName: 'Hane-goshi',
    japaneseScript: '跳腰',
    translation: 'Quadril que salta',
    summary:
      'Tori encaixa o quadril e, com a perna dobrada, levanta a coxa de uke em movimento de mola para projetá-lo.',
    keyPoints: [
      'A perna de ataque fica dobrada, como uma mola, encostada na coxa de uke.',
      'Manter uke colado ao corpo durante todo o giro.',
    ],
    related: ['harai-goshi'],
  },
  {
    slug: 'utsuri-goshi',
    category: 'koshi-waza',
    japaneseName: 'Utsuri-goshi',
    japaneseScript: '移腰',
    translation: 'Troca de quadril',
    summary:
      'Contra-ataque: tori levanta uke que tentou um golpe de quadril e troca o próprio quadril para a frente, projetando-o.',
  },
  {
    slug: 'ushiro-goshi',
    category: 'koshi-waza',
    japaneseName: 'Ushiro-goshi',
    japaneseScript: '後腰',
    translation: 'Quadril por trás',
    summary:
      'Contra-ataque: tori levanta uke por trás com o quadril, quando ele tenta um golpe de quadril, e o derruba à frente.',
  },

  // --- Ashi-waza -------------------------------------------------------------
  {
    slug: 'ko-soto-gake',
    category: 'ashi-waza',
    japaneseName: 'Ko-soto-gake',
    japaneseScript: '小外掛',
    translation: 'Pequeno gancho por fora',
    summary:
      'Tori engancha o calcanhar de uke por fora, por trás, e o derruba para trás enquanto empurra com as mãos.',
    related: ['ko-soto-gari'],
  },
  {
    slug: 'ashi-guruma',
    category: 'ashi-waza',
    japaneseName: 'Ashi-guruma',
    japaneseScript: '足車',
    translation: 'Roda pela perna',
    summary:
      'Tori estende a perna na altura do joelho de uke e o faz girar por cima dela com as mãos.',
    related: ['o-guruma', 'hiza-guruma'],
  },
  {
    slug: 'harai-tsurikomi-ashi',
    category: 'ashi-waza',
    japaneseName: 'Harai-tsurikomi-ashi',
    japaneseScript: '払釣込足',
    translation: 'Varrida no pé levantando e puxando',
    summary:
      'Tori puxa uke para a frente e varre a canela dele com a sola do pé, na frente do tornozelo.',
    related: ['sasae-tsurikomi-ashi'],
  },
  {
    slug: 'o-guruma',
    category: 'ashi-waza',
    japaneseName: 'O-guruma',
    japaneseScript: '大車',
    translation: 'Grande roda',
    summary:
      'Tori estende a perna na altura do quadril de uke e o faz girar por cima dela, como uma roda.',
    related: ['ashi-guruma'],
  },
  {
    slug: 'o-soto-guruma',
    category: 'ashi-waza',
    japaneseName: 'O-soto-guruma',
    japaneseScript: '大外車',
    translation: 'Grande roda por fora',
    summary: 'Como o-soto-gari, mas tori varre as duas pernas de uke de uma vez, por trás.',
    related: ['o-soto-gari'],
  },
  {
    slug: 'o-soto-otoshi',
    category: 'ashi-waza',
    japaneseName: 'O-soto-otoshi',
    japaneseScript: '大外落',
    translation: 'Grande queda por fora',
    summary:
      'Tori coloca a perna por trás de uke e o derruba para trás sem ceifar, apenas bloqueando. Técnica do grupo Habukareta-waza.',
    related: ['o-soto-gari'],
  },
  {
    slug: 'tsubame-gaeshi',
    category: 'ashi-waza',
    japaneseName: 'Tsubame-gaeshi',
    japaneseScript: '燕返',
    translation: 'Voo da andorinha',
    summary: 'Contra-ataque: tori esquiva o de-ashi-harai de uke e devolve uma varrida no pé dele.',
    related: ['de-ashi-harai'],
  },
  {
    slug: 'o-soto-gaeshi',
    category: 'ashi-waza',
    japaneseName: 'O-soto-gaeshi',
    japaneseScript: '大外返',
    translation: 'Reversão do o-soto-gari',
    summary: 'Contra-ataque: tori resiste ao o-soto-gari de uke e o ceifa de volta.',
    related: ['o-soto-gari'],
  },
  {
    slug: 'o-uchi-gaeshi',
    category: 'ashi-waza',
    japaneseName: 'O-uchi-gaeshi',
    japaneseScript: '大内返',
    translation: 'Reversão do o-uchi-gari',
    summary:
      'Contra-ataque: tori tira a perna do o-uchi-gari de uke e o projeta para o lado com as mãos.',
    related: ['o-uchi-gari'],
  },
  {
    slug: 'hane-goshi-gaeshi',
    category: 'ashi-waza',
    japaneseName: 'Hane-goshi-gaeshi',
    japaneseScript: '跳腰返',
    translation: 'Reversão do hane-goshi',
    summary: 'Contra-ataque: tori ceifa a perna de apoio de uke durante o hane-goshi dele.',
    related: ['hane-goshi'],
  },
  {
    slug: 'harai-goshi-gaeshi',
    category: 'ashi-waza',
    japaneseName: 'Harai-goshi-gaeshi',
    japaneseScript: '払腰返',
    translation: 'Reversão do harai-goshi',
    summary: 'Contra-ataque: tori ceifa a perna de apoio de uke durante o harai-goshi dele.',
    related: ['harai-goshi'],
  },
  {
    slug: 'uchi-mata-gaeshi',
    category: 'ashi-waza',
    japaneseName: 'Uchi-mata-gaeshi',
    japaneseScript: '内股返',
    translation: 'Reversão do uchi-mata',
    summary: 'Contra-ataque: tori ceifa a perna de apoio de uke durante o uchi-mata dele.',
    related: ['uchi-mata', 'uchi-mata-sukashi'],
  },

  // --- Ma-sutemi-waza --------------------------------------------------------
  {
    slug: 'tomoe-nage',
    category: 'ma-sutemi-waza',
    japaneseName: 'Tomoe-nage',
    japaneseScript: '巴投',
    translation: 'Projeção em círculo',
    summary:
      'Tori se deixa cair de costas, apoia o pé na barriga de uke e o projeta por cima da cabeça.',
    keyPoints: [
      'Desequilibrar uke para a frente antes de sentar.',
      'Sentar perto dos calcanhares, bem embaixo de uke.',
      'O pé empurra no abdômen, abaixo da faixa, enquanto as mãos puxam.',
    ],
  },
  {
    slug: 'sumi-gaeshi',
    category: 'ma-sutemi-waza',
    japaneseName: 'Sumi-gaeshi',
    japaneseScript: '隅返',
    translation: 'Reversão pelo canto',
    summary:
      'Tori cai de costas, levanta uke com o peito do pé por dentro da coxa e o projeta pelo canto da frente.',
  },
  {
    slug: 'hikikomi-gaeshi',
    category: 'ma-sutemi-waza',
    japaneseName: 'Hikikomi-gaeshi',
    japaneseScript: '引込返',
    translation: 'Reversão puxando',
    summary:
      'Tori segura a faixa de uke por cima das costas, cai de costas puxando-o e o projeta com o pé. Técnica do grupo Habukareta-waza.',
  },
  {
    slug: 'tawara-gaeshi',
    category: 'ma-sutemi-waza',
    japaneseName: 'Tawara-gaeshi',
    japaneseScript: '俵返',
    translation: 'Reversão do saco de arroz',
    summary:
      'Contra uke que se abaixa, tori abraça o tronco dele por cima, cai de costas e o projeta por cima da cabeça. Técnica do grupo Habukareta-waza.',
  },
  {
    slug: 'ura-nage',
    category: 'ma-sutemi-waza',
    japaneseName: 'Ura-nage',
    japaneseScript: '裏投',
    translation: 'Projeção para trás',
    summary:
      'Tori abraça uke pela cintura, levanta e cai de costas, projetando-o por cima do ombro.',
  },

  // --- Yoko-sutemi-waza ------------------------------------------------------
  {
    slug: 'yoko-otoshi',
    category: 'yoko-sutemi-waza',
    japaneseName: 'Yoko-otoshi',
    japaneseScript: '横落',
    translation: 'Queda lateral',
    summary:
      'Tori desliza a perna por fora do pé de uke, cai de lado e o derruba lateralmente com as mãos.',
  },
  {
    slug: 'tani-otoshi',
    category: 'yoko-sutemi-waza',
    japaneseName: 'Tani-otoshi',
    japaneseScript: '谷落',
    translation: 'Queda no vale',
    summary:
      'Tori coloca a perna por trás das duas pernas de uke e cai de lado, levando-o para o canto de trás.',
  },
  {
    slug: 'hane-makikomi',
    category: 'yoko-sutemi-waza',
    japaneseName: 'Hane-makikomi',
    japaneseScript: '跳巻込',
    translation: 'Enrolamento saltando',
    summary:
      'Tori solta a gola, passa o braço por cima do de uke, enrola-o no corpo e cai junto, como num hane-goshi.',
    related: ['hane-goshi'],
  },
  {
    slug: 'soto-makikomi',
    category: 'yoko-sutemi-waza',
    japaneseName: 'Soto-makikomi',
    japaneseScript: '外巻込',
    translation: 'Enrolamento por fora',
    summary:
      'Tori prende o braço de uke debaixo da axila, gira e cai, enrolando-o por cima do corpo.',
  },
  {
    slug: 'uchi-makikomi',
    category: 'yoko-sutemi-waza',
    japaneseName: 'Uchi-makikomi',
    japaneseScript: '内巻込',
    translation: 'Enrolamento por dentro',
    summary:
      'Tori passa o braço por baixo do braço de uke, gira e cai, enrolando-o. Técnica do grupo Habukareta-waza.',
  },
  {
    slug: 'uki-waza',
    category: 'yoko-sutemi-waza',
    japaneseName: 'Uki-waza',
    japaneseScript: '浮技',
    translation: 'Técnica flutuante',
    summary:
      'Tori estende a perna à frente do pé de uke, cai de lado e o projeta por cima do próprio corpo.',
  },
  {
    slug: 'yoko-wakare',
    category: 'yoko-sutemi-waza',
    japaneseName: 'Yoko-wakare',
    japaneseScript: '横分',
    translation: 'Separação lateral',
    summary:
      'Tori se lança de lado à frente de uke, com o corpo atravessado, e o faz girar por cima.',
  },
  {
    slug: 'yoko-guruma',
    category: 'yoko-sutemi-waza',
    japaneseName: 'Yoko-guruma',
    japaneseScript: '横車',
    translation: 'Roda lateral',
    summary:
      'Contra uke que se inclina para a frente, tori desliza entre as pernas dele e o faz girar de lado.',
  },
  {
    slug: 'yoko-gake',
    category: 'yoko-sutemi-waza',
    japaneseName: 'Yoko-gake',
    japaneseScript: '横掛',
    translation: 'Gancho lateral',
    summary: 'Tori varre o pé de uke pela lateral enquanto cai de lado, derrubando-o junto.',
  },
  {
    slug: 'daki-wakare',
    category: 'yoko-sutemi-waza',
    japaneseName: 'Daki-wakare',
    japaneseScript: '抱分',
    translation: 'Separação abraçando',
    summary:
      'Contra uke que se abaixa de quatro, tori abraça o tronco dele por trás e o projeta girando de lado. Técnica do Shinmeisho-no-waza.',
  },
  {
    slug: 'o-soto-makikomi',
    category: 'yoko-sutemi-waza',
    japaneseName: 'O-soto-makikomi',
    japaneseScript: '大外巻込',
    translation: 'Grande enrolamento por fora',
    summary: 'Tori entra como num o-soto-gari, enrola o braço de uke e cai junto com ele.',
    related: ['o-soto-gari'],
  },
  {
    slug: 'uchi-mata-makikomi',
    category: 'yoko-sutemi-waza',
    japaneseName: 'Uchi-mata-makikomi',
    japaneseScript: '内股巻込',
    translation: 'Enrolamento com uchi-mata',
    summary: 'Tori entra com uchi-mata, enrola o braço de uke e cai junto com ele.',
    related: ['uchi-mata'],
  },
  {
    slug: 'harai-makikomi',
    category: 'yoko-sutemi-waza',
    japaneseName: 'Harai-makikomi',
    japaneseScript: '払巻込',
    translation: 'Enrolamento varrendo',
    summary: 'Tori entra com harai-goshi, enrola o braço de uke e cai junto com ele.',
    related: ['harai-goshi'],
  },
  {
    slug: 'ko-uchi-makikomi',
    category: 'yoko-sutemi-waza',
    japaneseName: 'Ko-uchi-makikomi',
    japaneseScript: '小内巻込',
    translation: 'Enrolamento com ko-uchi',
    summary:
      'Tori ceifa por dentro como num ko-uchi-gari, prende a perna de uke com o braço e cai sobre ele.',
    related: ['ko-uchi-gari'],
  },
  {
    slug: 'kani-basami',
    category: 'yoko-sutemi-waza',
    japaneseName: 'Kani-basami',
    japaneseScript: '蟹挟',
    translation: 'Tesoura de caranguejo',
    summary:
      'Tori prende uke entre as pernas, como uma tesoura, e o derruba para trás. Proibida em competição pelo risco de lesão no joelho.',
  },
  {
    slug: 'kawazu-gake',
    category: 'yoko-sutemi-waza',
    japaneseName: 'Kawazu-gake',
    japaneseScript: '河津掛',
    translation: 'Gancho de Kawazu',
    summary:
      'Tori enrola a perna na perna de uke por trás e cai junto, derrubando-o para trás. Proibida em competição pelo risco de lesão no joelho.',
  },

  // --- Osaekomi-waza ---------------------------------------------------------
  {
    slug: 'ushiro-kesa-gatame',
    category: 'osaekomi-waza',
    japaneseName: 'Ushiro-kesa-gatame',
    japaneseScript: '後袈裟固',
    translation: 'Imobilização em diagonal invertida',
    summary:
      'Tori senta ao lado de uke virado para as pernas dele, prende o braço de uke e segura a faixa pelo outro lado.',
    related: ['kesa-gatame'],
  },
  {
    slug: 'kuzure-kami-shiho-gatame',
    category: 'osaekomi-waza',
    japaneseName: 'Kuzure-kami-shiho-gatame',
    japaneseScript: '崩上四方固',
    translation: 'Variação da imobilização pelos quatro cantos por cima',
    summary:
      'Variação de kami-shiho-gatame em que tori prende um dos braços de uke e fica ligeiramente na diagonal.',
    related: ['kami-shiho-gatame'],
  },
  {
    slug: 'uki-gatame',
    category: 'osaekomi-waza',
    japaneseName: 'Uki-gatame',
    japaneseScript: '浮固',
    translation: 'Imobilização flutuante',
    summary:
      'Tori apoia o joelho na barriga de uke, puxa o braço dele e mantém o controle de lado, com a outra perna estendida.',
  },
  {
    slug: 'ura-gatame',
    category: 'osaekomi-waza',
    japaneseName: 'Ura-gatame',
    japaneseScript: '裏固',
    translation: 'Imobilização invertida',
    summary: 'Tori fica de lado sobre uke, virado para as pernas dele, e o controla com as costas.',
  },

  // --- Shime-waza ------------------------------------------------------------
  {
    slug: 'nami-juji-jime',
    category: 'shime-waza',
    japaneseName: 'Nami-juji-jime',
    japaneseScript: '並十字絞',
    translation: 'Estrangulamento cruzado normal',
    summary:
      'Tori cruza os braços e segura as duas golas de uke com as palmas para baixo, estrangulando pelos lados do pescoço.',
    keyPoints: [
      'Mãos bem fundo na gola, perto da nuca.',
      'Fechar os cotovelos como uma tesoura.',
      'Soltar imediatamente quando uke bater.',
    ],
    related: ['gyaku-juji-jime', 'kata-juji-jime'],
  },
  {
    slug: 'gyaku-juji-jime',
    category: 'shime-waza',
    japaneseName: 'Gyaku-juji-jime',
    japaneseScript: '逆十字絞',
    translation: 'Estrangulamento cruzado invertido',
    summary: 'Como o nami-juji-jime, mas com as duas palmas para cima.',
    related: ['nami-juji-jime', 'kata-juji-jime'],
  },
  {
    slug: 'kata-juji-jime',
    category: 'shime-waza',
    japaneseName: 'Kata-juji-jime',
    japaneseScript: '片十字絞',
    translation: 'Estrangulamento meio cruzado',
    summary: 'Estrangulamento cruzado com uma palma para cima e a outra para baixo.',
    related: ['nami-juji-jime', 'gyaku-juji-jime'],
  },
  {
    slug: 'hadaka-jime',
    category: 'shime-waza',
    japaneseName: 'Hadaka-jime',
    japaneseScript: '裸絞',
    translation: 'Estrangulamento nu',
    summary:
      'Por trás de uke, tori passa o antebraço pela frente do pescoço dele e aperta sem usar a gola.',
    keyPoints: ['Cabeça de tori colada à de uke.', 'Puxar uke para trás, tirando o equilíbrio.'],
  },
  {
    slug: 'okuri-eri-jime',
    category: 'shime-waza',
    japaneseName: 'Okuri-eri-jime',
    japaneseScript: '送襟絞',
    translation: 'Estrangulamento deslizando a gola',
    summary:
      'Por trás de uke, tori segura as duas golas dele, uma por baixo de cada braço, e estrangula puxando-as em sentidos opostos.',
  },
  {
    slug: 'kata-ha-jime',
    category: 'shime-waza',
    japaneseName: 'Kata-ha-jime',
    japaneseScript: '片羽絞',
    translation: 'Estrangulamento de uma asa',
    summary:
      'Por trás de uke, tori segura a gola, levanta um dos braços dele e empurra a nuca com a mão livre.',
  },
  {
    slug: 'katate-jime',
    category: 'shime-waza',
    japaneseName: 'Katate-jime',
    japaneseScript: '片手絞',
    translation: 'Estrangulamento com uma mão',
    summary: 'Tori estrangula segurando a gola de uke com uma só mão, girando o antebraço.',
  },
  {
    slug: 'ryote-jime',
    category: 'shime-waza',
    japaneseName: 'Ryote-jime',
    japaneseScript: '両手絞',
    translation: 'Estrangulamento com as duas mãos',
    summary:
      'Tori segura as duas golas de uke sem cruzar os braços e estrangula apertando para dentro.',
  },
  {
    slug: 'sode-guruma-jime',
    category: 'shime-waza',
    japaneseName: 'Sode-guruma-jime',
    japaneseScript: '袖車絞',
    translation: 'Estrangulamento em roda com a manga',
    summary:
      'Tori passa um braço por trás do pescoço de uke e o outro pela frente, segurando a própria manga, e estrangula como uma roda.',
  },
  {
    slug: 'tsukkomi-jime',
    category: 'shime-waza',
    japaneseName: 'Tsukkomi-jime',
    japaneseScript: '突込絞',
    translation: 'Estrangulamento empurrando',
    summary: 'Tori segura as golas de uke e empurra uma delas contra o pescoço, como uma estocada.',
  },
  {
    slug: 'sankaku-jime',
    category: 'shime-waza',
    japaneseName: 'Sankaku-jime',
    japaneseScript: '三角絞',
    translation: 'Estrangulamento em triângulo',
    summary:
      'Tori prende a cabeça e um braço de uke entre as pernas, formando um triângulo, e estrangula.',
  },
  {
    slug: 'do-jime',
    category: 'shime-waza',
    japaneseName: 'Do-jime',
    japaneseScript: '胴絞',
    translation: 'Estrangulamento do tronco',
    summary:
      'Tori aperta o tronco de uke entre as pernas. Proibida em competição; é estudada apenas como técnica tradicional.',
  },

  // --- Kansetsu-waza ---------------------------------------------------------
  {
    slug: 'ude-garami',
    category: 'kansetsu-waza',
    japaneseName: 'Ude-garami',
    japaneseScript: '腕緘',
    translation: 'Chave de braço enroscado',
    summary:
      'Tori dobra o braço de uke em forma de "4" e gira o ombro dele, segurando o punho e o próprio punho.',
    keyPoints: [
      'Prender o braço de uke no chão antes de girar.',
      'Girar devagar e soltar ao primeiro sinal.',
    ],
  },
  {
    slug: 'ude-hishigi-juji-gatame',
    category: 'kansetsu-waza',
    japaneseName: 'Ude-hishigi-juji-gatame',
    japaneseScript: '腕挫十字固',
    translation: 'Chave de braço em cruz',
    summary:
      'Tori deita perpendicular a uke, prende o braço dele entre as pernas e estende o cotovelo contra o quadril.',
    keyPoints: [
      'Os joelhos apertam o braço de uke; as pernas controlam o tronco e a cabeça.',
      'O polegar de uke aponta para cima.',
      'Elevar o quadril devagar; soltar quando uke bater.',
    ],
  },
  {
    slug: 'ude-hishigi-ude-gatame',
    category: 'kansetsu-waza',
    japaneseName: 'Ude-hishigi-ude-gatame',
    japaneseScript: '腕挫腕固',
    translation: 'Chave de braço com o braço',
    summary:
      'Tori prende o punho de uke no ombro ou no pescoço e estende o cotovelo dele com as duas mãos.',
  },
  {
    slug: 'ude-hishigi-hiza-gatame',
    category: 'kansetsu-waza',
    japaneseName: 'Ude-hishigi-hiza-gatame',
    japaneseScript: '腕挫膝固',
    translation: 'Chave de braço com o joelho',
    summary: 'Tori prende o braço de uke e estende o cotovelo dele usando o joelho como apoio.',
  },
  {
    slug: 'ude-hishigi-waki-gatame',
    category: 'kansetsu-waza',
    japaneseName: 'Ude-hishigi-waki-gatame',
    japaneseScript: '腕挫腋固',
    translation: 'Chave de braço com a axila',
    summary:
      'Tori prende o braço estendido de uke debaixo da axila e força o cotovelo. Em competição, não pode ser aplicada em pé derrubando uke.',
  },
  {
    slug: 'ude-hishigi-hara-gatame',
    category: 'kansetsu-waza',
    japaneseName: 'Ude-hishigi-hara-gatame',
    japaneseScript: '腕挫腹固',
    translation: 'Chave de braço com a barriga',
    summary: 'Tori prende o braço de uke e força o cotovelo usando o abdômen.',
  },
  {
    slug: 'ude-hishigi-ashi-gatame',
    category: 'kansetsu-waza',
    japaneseName: 'Ude-hishigi-ashi-gatame',
    japaneseScript: '腕挫脚固',
    translation: 'Chave de braço com a perna',
    summary: 'Tori prende o braço de uke e força o cotovelo usando a perna.',
  },
  {
    slug: 'ude-hishigi-te-gatame',
    category: 'kansetsu-waza',
    japaneseName: 'Ude-hishigi-te-gatame',
    japaneseScript: '腕挫手固',
    translation: 'Chave de braço com as mãos',
    summary: 'Tori prende o punho de uke e força o cotovelo usando as mãos e o corpo.',
  },
  {
    slug: 'ude-hishigi-sankaku-gatame',
    category: 'kansetsu-waza',
    japaneseName: 'Ude-hishigi-sankaku-gatame',
    japaneseScript: '腕挫三角固',
    translation: 'Chave de braço em triângulo',
    summary:
      'Com a cabeça e o braço de uke presos no triângulo das pernas, tori estende o cotovelo dele.',
    related: ['sankaku-jime'],
  },
  {
    slug: 'ashi-garami',
    category: 'kansetsu-waza',
    japaneseName: 'Ashi-garami',
    japaneseScript: '足緘',
    translation: 'Chave de perna enroscada',
    summary:
      'Tori enrosca a perna de uke e força o joelho. Proibida em competição; é estudada apenas como técnica tradicional.',
  },
];
