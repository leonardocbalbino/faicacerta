import { describe, expect, it } from 'vitest';
import { parseYoutubeId, youtubeThumbUrl, youtubeWatchUrl } from './youtube.js';

describe('parseYoutubeId', () => {
  it.each([
    ['https://www.youtube.com/watch?v=4BUUvqxi_Kk', '4BUUvqxi_Kk'],
    [
      'https://youtube.com/watch?v=4BUUvqxi_Kk&list=PLtz539PTepc16H2iu5F3Q3D7_He1EYlIQ',
      '4BUUvqxi_Kk',
    ],
    ['https://m.youtube.com/watch?v=-L8QseWf4pE', '-L8QseWf4pE'],
    ['https://youtu.be/VoktcQAxEPg?t=23', 'VoktcQAxEPg'],
    ['youtu.be/VoktcQAxEPg', 'VoktcQAxEPg'],
    ['https://www.youtube.com/shorts/4BUUvqxi_Kk', '4BUUvqxi_Kk'],
    ['https://www.youtube-nocookie.com/embed/4BUUvqxi_Kk', '4BUUvqxi_Kk'],
    ['4BUUvqxi_Kk', '4BUUvqxi_Kk'],
  ])('%s', (input, id) => {
    expect(parseYoutubeId(input)).toBe(id);
  });

  it.each([
    '',
    '   ',
    'https://vimeo.com/123',
    'https://www.youtube.com/watch?v=curto',
    'https://www.youtube.com/@KODOKAN',
    'não é link',
  ])('rejeita %j', (input) => {
    expect(parseYoutubeId(input)).toBeNull();
  });

  it('monta links e miniaturas', () => {
    expect(youtubeWatchUrl('4BUUvqxi_Kk')).toBe('https://www.youtube.com/watch?v=4BUUvqxi_Kk');
    expect(youtubeThumbUrl('4BUUvqxi_Kk')).toBe('https://i.ytimg.com/vi/4BUUvqxi_Kk/hqdefault.jpg');
  });
});
