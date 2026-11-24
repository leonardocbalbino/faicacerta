import { mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Injectable, Logger } from '@nestjs/common';
import type { Media, Prisma } from '../../../generated/prisma/client.js';
import type { JobHandler } from '../../../infra/queue/queues.js';
import { PrismaService } from '../../../infra/prisma/prisma.service.js';
import { StorageService, type BucketKind } from '../../../infra/storage/storage.service.js';
import { bucketFor, derivedKey } from '../media-keys.js';
import {
  audioArgs,
  DISPLAY_RENDITION,
  imageArgs,
  OFFLINE_RENDITION,
  videoArgs,
  videoThumbArgs,
} from './ffmpeg-args.js';
import { FfmpegService } from './ffmpeg.service.js';

type Outputs = Pick<
  Prisma.MediaUpdateInput,
  'key720p' | 'keyOffline' | 'keyThumb' | 'offlineSizeBytes' | 'durationMs' | 'width' | 'height'
>;

/**
 * Processa uma mídia enviada:
 * - vídeo: thumbnail, versão 720p (streaming) e versão leve (offline);
 * - imagem: versão de exibição e thumbnail;
 * - áudio: AAC leve (pronúncia);
 * - documento: só marca como pronto.
 */
@Injectable()
export class MediaProcessingService implements JobHandler<'media'> {
  private readonly logger = new Logger(MediaProcessingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly ffmpeg: FfmpegService,
  ) {}

  async handle({ mediaId }: { mediaId: string }): Promise<void> {
    const media = await this.prisma.media.findUnique({ where: { id: mediaId } });
    if (!media || media.deletedAt) return;
    if (!['UPLOADED', 'PROCESSING', 'FAILED'].includes(media.status)) return;

    await this.prisma.media.update({
      where: { id: media.id },
      data: { status: 'PROCESSING', processingError: null },
    });

    const workdir = await mkdtemp(join(tmpdir(), 'faixa-media-'));
    try {
      const outputs = await this.process(media, workdir);
      await this.prisma.media.update({
        where: { id: media.id },
        data: { ...outputs, status: 'READY', processingError: null },
      });
      this.logger.log({ mediaId, type: media.type }, 'mídia processada');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await this.prisma.media.update({
        where: { id: media.id },
        data: { status: 'FAILED', processingError: message.slice(0, 1000) },
      });
      // Relança para o BullMQ tentar de novo (até o limite de tentativas).
      throw err;
    } finally {
      await rm(workdir, { recursive: true, force: true });
    }
  }

  private async process(media: Media, dir: string): Promise<Outputs> {
    if (media.type === 'DOCUMENT') return {};

    const bucket = bucketFor(media.visibility);
    const input = join(dir, 'original');
    await this.storage.download(bucket, media.originalKey, input);
    const probe = await this.ffmpeg.probe(input);

    switch (media.type) {
      case 'VIDEO': {
        if (!probe.hasVideo) throw new Error('o arquivo não tem faixa de vídeo');
        const display = join(dir, 'display.mp4');
        const offline = join(dir, 'offline.mp4');
        const thumb = join(dir, 'thumb.jpg');
        await this.ffmpeg.run(videoThumbArgs(input, thumb, probe));
        await this.ffmpeg.run(videoArgs(input, display, probe, DISPLAY_RENDITION));
        await this.ffmpeg.run(videoArgs(input, offline, probe, OFFLINE_RENDITION));
        const keys = await this.uploadAll(bucket, media.originalKey, [
          [display, 'display.mp4', 'video/mp4'],
          [offline, 'offline.mp4', 'video/mp4'],
          [thumb, 'thumb.jpg', 'image/jpeg'],
        ]);
        return {
          key720p: keys[0],
          keyOffline: keys[1],
          keyThumb: keys[2],
          offlineSizeBytes: (await stat(offline)).size,
          durationMs: probe.durationMs,
          width: probe.width,
          height: probe.height,
        };
      }
      case 'IMAGE': {
        if (!probe.hasVideo) throw new Error('não foi possível ler a imagem');
        // PNG/WebP podem ter transparência: continuam PNG. JPEG continua JPEG.
        const isJpeg = media.mimeType === 'image/jpeg';
        const ext = isJpeg ? 'jpg' : 'png';
        const mime = isJpeg ? 'image/jpeg' : 'image/png';
        const display = join(dir, `display.${ext}`);
        const thumb = join(dir, `thumb.${ext}`);
        await this.ffmpeg.run(imageArgs(input, display, 1600));
        await this.ffmpeg.run(imageArgs(input, thumb, 400));
        const keys = await this.uploadAll(bucket, media.originalKey, [
          [display, `display.${ext}`, mime],
          [thumb, `thumb.${ext}`, mime],
        ]);
        return {
          key720p: keys[0],
          // A versão de exibição já é leve o bastante para o modo offline.
          keyOffline: keys[0],
          keyThumb: keys[1],
          offlineSizeBytes: (await stat(display)).size,
          width: probe.width,
          height: probe.height,
        };
      }
      case 'AUDIO': {
        if (!probe.hasAudio) throw new Error('o arquivo não tem faixa de áudio');
        const out = join(dir, 'audio.m4a');
        await this.ffmpeg.run(audioArgs(input, out));
        const [key] = await this.uploadAll(bucket, media.originalKey, [
          [out, 'audio.m4a', 'audio/mp4'],
        ]);
        return {
          key720p: key,
          keyOffline: key,
          offlineSizeBytes: (await stat(out)).size,
          durationMs: probe.durationMs,
        };
      }
    }
  }

  private async uploadAll(
    bucket: BucketKind,
    originalKey: string,
    files: [path: string, name: string, contentType: string][],
  ): Promise<string[]> {
    return Promise.all(
      files.map(async ([path, name, contentType]) => {
        const key = derivedKey(originalKey, name);
        await this.storage.upload(bucket, key, path, contentType);
        return key;
      }),
    );
  }
}
