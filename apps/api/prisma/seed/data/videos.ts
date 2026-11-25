/**
 * Vídeos oficiais do canal KODOKAN no YouTube, um por técnica.
 * Fonte: playlist "KODOKAN × IJF ACADEMY 100 Techniques"
 * (https://www.youtube.com/playlist?list=PLtz539PTepc16H2iu5F3Q3D7_He1EYlIQ),
 * e o vídeo "Ukemi" do mesmo canal.
 */
const ID: Record<string, string> = {
  // Ukemi (um vídeo para as quatro quedas)
  'ushiro-ukemi': 'VoktcQAxEPg',
  'yoko-ukemi': 'VoktcQAxEPg',
  'mae-ukemi': 'VoktcQAxEPg',
  'mae-mawari-ukemi': 'VoktcQAxEPg',

  // Te-waza
  'seoi-nage': 'zIq0xI0ogxk',
  'ippon-seoi-nage': 'FQnOlCxo4oI',
  'seoi-otoshi': 'vu1TMVNnq34',
  'tai-otoshi': '4x6S3Q-Ktv8',
  'kata-guruma': 'cnHRhSy8yi4',
  'sukui-nage': 'vU6aJ2kFxoI',
  'obi-otoshi': 'ff8U2TVZIYI',
  'uki-otoshi': '6H5tmncOY4Q',
  'sumi-otoshi': 'lLU9wv52ni0',
  'yama-arashi': 'MGlyKmSuzdc',
  'obi-tori-gaeshi': 'bpc82SrunUU',
  'morote-gari': 'BHLQS4K85bs',
  'kuchiki-taoshi': 'ZNL47q1aJNY',
  'kibisu-gaeshi': 'tJylJYfBliA',
  'uchi-mata-sukashi': 'V-RS3uhtVWM',
  'ko-uchi-gaeshi': '_MWAdYi_LC4',

  // Koshi-waza
  'uki-goshi': 'bPKwtB4lyOQ',
  'o-goshi': 'yhu1mfy2vJ4',
  'koshi-guruma': 'SU7Id6uVJ44',
  'tsurikomi-goshi': 'McfzA0yRVt4',
  'sode-tsurikomi-goshi': 'QsmAxpmYLOI',
  'harai-goshi': 'qTo8HlAAkOo',
  'tsuri-goshi': '51Htlp7xEvE',
  'hane-goshi': 'M9_7De6A1kk',
  'utsuri-goshi': '4pQd_bEnlf0',
  'ushiro-goshi': 'ORIYstuxYT8',

  // Ashi-waza
  'de-ashi-harai': '4BUUvqxi_Kk',
  'hiza-guruma': 'JPJx9-oAVns',
  'sasae-tsurikomi-ashi': '699i--pvYmE',
  'o-soto-gari': 'c-A_nP7mKAc',
  'o-uchi-gari': '0itJFhV9pDQ',
  'ko-soto-gari': 'jeQ541ScLB4',
  'ko-uchi-gari': '3Jb3tZvr9Ng',
  'okuri-ashi-harai': 'nw1ZdRjrdRI',
  'uchi-mata': 'iUpSu5J-bgw',
  'ko-soto-gake': '8b6kY4s4zH4',
  'ashi-guruma': 'ROeayhvom9U',
  'harai-tsurikomi-ashi': 'gGPXvWL8VbE',
  'o-guruma': 'SnZciTAY9vc',
  'o-soto-guruma': '92KbCm6pQeI',
  'o-soto-otoshi': '2DsVvDw7b8g',
  'tsubame-gaeshi': 'GwweWqqFB5g',
  'o-soto-gaeshi': '8ZjM3X_EANo',
  'o-uchi-gaeshi': 'dCyZTXyjIXE',
  'hane-goshi-gaeshi': '9bZAZSBtnGs',
  'harai-goshi-gaeshi': '4U3It-7PPsc',
  'uchi-mata-gaeshi': 'Sy6sLWxkWYw',

  // Ma-sutemi-waza
  'tomoe-nage': '880WbHvHv6A',
  'sumi-gaeshi': '5VhduA5xkbA',
  'hikikomi-gaeshi': '92zUYWBp5N8',
  'tawara-gaeshi': 'TmTWgrmViZc',
  'ura-nage': 'Fgi9b8DJ5sQ',

  // Yoko-sutemi-waza
  'yoko-otoshi': 'MnNG67pF_a0',
  'tani-otoshi': '3b9Me3Fohpk',
  'hane-makikomi': '6CRBGLGz9j8',
  'soto-makikomi': 'bWG9O1BVKtQ',
  'uchi-makikomi': '5BowcjduxVc',
  'uki-waza': 'weVOpJ63gII',
  'yoko-wakare': 'bp1tscHlePI',
  'yoko-guruma': 'MehP6I5cY2c',
  'yoko-gake': 'tP1Sj1uDfSo',
  'daki-wakare': 'Hr0cOMGBDYo',
  'o-soto-makikomi': 'DGDv2oMwmas',
  'uchi-mata-makikomi': 'jZXENTLpJCI',
  'harai-makikomi': 'VBaHzKaCXss',
  'ko-uchi-makikomi': '_1eygIXLD_w',
  'kani-basami': 'OR-HGHnarYc',
  'kawazu-gake': 'w6G57bWACi0',

  // Osaekomi-waza
  'kesa-gatame': 'NDaQuJOFBYk',
  'kuzure-kesa-gatame': 'Q2fb9jaoUFQ',
  'ushiro-kesa-gatame': 'SBapox2M2dE',
  'kata-gatame': 'zQR3IOXxO_Q',
  'kami-shiho-gatame': 'HFuMjOv0WN8',
  'kuzure-kami-shiho-gatame': 'YUrogQWdwiY',
  'yoko-shiho-gatame': 'TT7XJVSEQxA',
  'tate-shiho-gatame': '55-rFmBx53g',
  'uki-gatame': 'e_lAjik1SUM',
  'ura-gatame': 'eeAHZB0v3XY',

  // Shime-waza
  'nami-juji-jime': 'k2cHry9HByQ',
  'gyaku-juji-jime': 't3tQriIPdlI',
  'kata-juji-jime': '3VZVUAmiMD8',
  'hadaka-jime': '9f0n8jez7iA',
  'okuri-eri-jime': 'EiqyoVcIAi8',
  'kata-ha-jime': 'yaTGgRjnwB8',
  'katate-jime': 'cHeIs-fSqwE',
  'ryote-jime': '-RHC4V7TQiY',
  'sode-guruma-jime': 'E3nvQzClcAU',
  'tsukkomi-jime': 'dKKpnD3eLcY',
  'sankaku-jime': 'lq1CUBRAm7s',
  'do-jime': 'D_0fFcoIbvY',

  // Kansetsu-waza
  'ude-garami': 'AIlTvZb4RlE',
  'ude-hishigi-juji-gatame': 'OWgSOlCuMXw',
  'ude-hishigi-ude-gatame': 'SBf0aTma1VI',
  'ude-hishigi-hiza-gatame': 'H2HtAJdiJcE',
  'ude-hishigi-waki-gatame': '8F5p1zuJRG0',
  'ude-hishigi-hara-gatame': 'ZzEycg8R_9M',
  'ude-hishigi-ashi-gatame': 'ClY7g_pX-4s',
  'ude-hishigi-te-gatame': '6DnvhY0tQVM',
  'ude-hishigi-sankaku-gatame': 'WefAmW4azhk',
  'ashi-garami': 'BWWb0GoAtZw',
};

export function videoUrlFor(slug: string): string | null {
  const id = ID[slug];
  return id ? `https://www.youtube.com/watch?v=${id}` : null;
}

export const videoSlugs = Object.keys(ID);
