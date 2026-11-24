import { describe, expect, it } from 'vitest';
import {
  DISPLAY_RENDITION,
  OFFLINE_RENDITION,
  parseProbe,
  videoArgs,
  videoBox,
  videoThumbArgs,
} from './ffmpeg-args.js';

const probeJson = (stream: object, duration = '12.5') =>
  JSON.stringify({
    streams: [{ codec_type: 'video', ...stream }, { codec_type: 'audio' }],
    format: { duration },
  });

describe('parseProbe', () => {
  it('lê duração e dimensões', () => {
    expect(parseProbe(probeJson({ width: 1920, height: 1080 }))).toEqual({
      durationMs: 12_500,
      width: 1920,
      height: 1080,
      hasVideo: true,
      hasAudio: true,
    });
  });

  it('considera a rotação de vídeo gravado em pé no celular', () => {
    const r = parseProbe(
      probeJson({ width: 1920, height: 1080, side_data_list: [{ rotation: -90 }] }),
    );
    expect({ w: r.width, h: r.height }).toEqual({ w: 1080, h: 1920 });
  });

  it('aceita a rotação antiga em tags', () => {
    const r = parseProbe(probeJson({ width: 1280, height: 720, tags: { rotate: '270' } }));
    expect({ w: r.width, h: r.height }).toEqual({ w: 720, h: 1280 });
  });

  it('áudio sem vídeo', () => {
    const r = parseProbe(
      JSON.stringify({ streams: [{ codec_type: 'audio' }], format: { duration: '2' } }),
    );
    expect(r).toMatchObject({ hasVideo: false, hasAudio: true, durationMs: 2000, width: null });
  });
});

describe('videoBox', () => {
  it('limita o lado menor: paisagem', () => {
    expect(videoBox({ width: 1920, height: 1080 }, 720)).toEqual({ w: 1280, h: 720 });
  });
  it('limita o lado menor: retrato', () => {
    expect(videoBox({ width: 1080, height: 1920 }, 720)).toEqual({ w: 720, h: 1280 });
  });
  it('versão offline', () => {
    expect(videoBox({ width: 1920, height: 1080 }, 360)).toEqual({ w: 640, h: 360 });
  });
});

describe('videoArgs', () => {
  const probe = parseProbe(probeJson({ width: 1080, height: 1920 }));

  it('gera H.264 com faststart e áudio opcional', () => {
    const args = videoArgs('in.mov', 'out.mp4', probe, DISPLAY_RENDITION);
    expect(args).toContain('libx264');
    expect(args.join(' ')).toContain('-movflags +faststart');
    expect(args.join(' ')).toContain('-map 0:a:0?');
    expect(args.at(-1)).toBe('out.mp4');
    expect(args[args.indexOf('-vf') + 1]).toContain('min(720,iw)');
  });

  it('a versão offline é mais leve', () => {
    const args = videoArgs('in.mov', 'out.mp4', probe, OFFLINE_RENDITION);
    expect(args[args.indexOf('-crf') + 1]).toBe('30');
    expect(args[args.indexOf('-vf') + 1]).toContain('min(360,iw)');
  });
});

describe('videoThumbArgs', () => {
  it('pega o quadro em 1s, ou no meio de vídeos curtos', () => {
    const long = videoThumbArgs('a', 'b', { ...parseProbe(probeJson({})), durationMs: 30_000 });
    const short = videoThumbArgs('a', 'b', { ...parseProbe(probeJson({})), durationMs: 800 });
    expect(long[long.indexOf('-ss') + 1]).toBe('1.00');
    expect(short[short.indexOf('-ss') + 1]).toBe('0.40');
  });
});
