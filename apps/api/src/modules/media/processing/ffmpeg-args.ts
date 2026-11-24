/**
 * Montagem dos argumentos do ffmpeg/ffprobe. Funções puras para poderem ser
 * testadas sem o binário.
 */

export interface ProbeResult {
  durationMs: number | null;
  /** Dimensões já considerando a rotação (como o vídeo aparece na tela). */
  width: number | null;
  height: number | null;
  hasVideo: boolean;
  hasAudio: boolean;
}

interface FfprobeStream {
  codec_type?: string;
  width?: number;
  height?: number;
  tags?: { rotate?: string };
  side_data_list?: { rotation?: number }[];
}

interface FfprobeOutput {
  streams?: FfprobeStream[];
  format?: { duration?: string };
}

export const PROBE_ARGS = (input: string) => [
  '-v',
  'error',
  '-print_format',
  'json',
  '-show_format',
  '-show_streams',
  input,
];

export function parseProbe(json: string): ProbeResult {
  const data = JSON.parse(json) as FfprobeOutput;
  const streams = data.streams ?? [];
  const video = streams.find((s) => s.codec_type === 'video');
  const audio = streams.find((s) => s.codec_type === 'audio');

  const rotation = Math.abs(
    Number(
      video?.side_data_list?.find((d) => d.rotation !== undefined)?.rotation ??
        video?.tags?.rotate ??
        0,
    ),
  );
  const rotated = rotation % 180 === 90;
  const width = video?.width ?? null;
  const height = video?.height ?? null;

  const seconds = Number(data.format?.duration);
  return {
    durationMs: Number.isFinite(seconds) ? Math.round(seconds * 1000) : null,
    width: rotated ? height : width,
    height: rotated ? width : height,
    hasVideo: !!video,
    hasAudio: !!audio,
  };
}

/**
 * Caixa de redimensionamento em que o LADO MENOR fica limitado a `shortSide`
 * (vídeo vertical de celular não encolhe demais).
 */
export function videoBox(
  dims: { width: number | null; height: number | null },
  shortSide: number,
): { w: number; h: number } {
  const longSide = Math.round((shortSide * 16) / 9);
  const portrait = (dims.height ?? 0) > (dims.width ?? 0);
  return portrait ? { w: shortSide, h: longSide } : { w: longSide, h: shortSide };
}

function scaleFilter(box: { w: number; h: number }, evenDims: boolean): string {
  // Nunca aumenta o tamanho original; mantém a proporção.
  const base = `scale='min(${box.w},iw)':'min(${box.h},ih)':force_original_aspect_ratio=decrease`;
  return evenDims ? `${base}:force_divisible_by=2` : base;
}

export interface VideoRendition {
  shortSide: number;
  crf: number;
  audioBitrate: string;
  audioChannels: number;
}

/** 720p para assistir em streaming. */
export const DISPLAY_RENDITION: VideoRendition = {
  shortSide: 720,
  crf: 23,
  audioBitrate: '128k',
  audioChannels: 2,
};

/** Versão leve para baixar e estudar offline. */
export const OFFLINE_RENDITION: VideoRendition = {
  shortSide: 360,
  crf: 30,
  audioBitrate: '64k',
  audioChannels: 1,
};

export function videoArgs(
  input: string,
  output: string,
  probe: ProbeResult,
  r: VideoRendition,
): string[] {
  return [
    '-y',
    '-i',
    input,
    '-map',
    '0:v:0',
    '-map',
    '0:a:0?',
    '-vf',
    scaleFilter(videoBox(probe, r.shortSide), true),
    '-c:v',
    'libx264',
    '-preset',
    'veryfast',
    '-crf',
    String(r.crf),
    '-profile:v',
    'main',
    '-pix_fmt',
    'yuv420p',
    '-c:a',
    'aac',
    '-b:a',
    r.audioBitrate,
    '-ac',
    String(r.audioChannels),
    // moov no início: o vídeo começa a tocar antes de baixar inteiro.
    '-movflags',
    '+faststart',
    output,
  ];
}

export function videoThumbArgs(input: string, output: string, probe: ProbeResult): string[] {
  const seek = probe.durationMs ? Math.min(1, probe.durationMs / 2000) : 0;
  return [
    '-y',
    '-ss',
    seek.toFixed(2),
    '-i',
    input,
    '-frames:v',
    '1',
    '-vf',
    scaleFilter({ w: 640, h: 640 }, true),
    '-q:v',
    '3',
    output,
  ];
}

export function imageArgs(input: string, output: string, maxSide: number): string[] {
  return [
    '-y',
    '-i',
    input,
    '-frames:v',
    '1',
    '-vf',
    scaleFilter({ w: maxSide, h: maxSide }, false),
    '-q:v',
    '3',
    output,
  ];
}

export function audioArgs(input: string, output: string): string[] {
  return [
    '-y',
    '-i',
    input,
    '-vn',
    '-c:a',
    'aac',
    '-b:a',
    '96k',
    '-movflags',
    '+faststart',
    output,
  ];
}
