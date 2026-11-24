import { execFile, spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { FfmpegService } from '../src/modules/media/processing/ffmpeg.service.js';
import { createTestApp, createUser, resetDatabase, type TestContext } from './utils/test-app.js';

const run = promisify(execFile);

/**
 * `it.runIf` é avaliado na coleta, antes do beforeAll: checa o ffmpeg de forma
 * síncrona, pelo mesmo binário que a API usa.
 */
const HAS_FFMPEG =
  spawnSync(process.env.FFMPEG_PATH ?? 'ffmpeg', ['-version'], { stdio: 'ignore' }).status === 0;

let ctx: TestContext;
const api = () => request(ctx.app.getHttpServer() as App);
let editor: { Authorization: string };
let user: { Authorization: string };
let sampleVideo: Buffer;
let workdir: string;

beforeAll(async () => {
  ctx = await createTestApp();
  // O serviço da API tem que concordar com a checagem síncrona.
  const serviceSees = await ctx.app.get(FfmpegService).isAvailable();
  if (serviceSees !== HAS_FFMPEG) {
    throw new Error(
      `FfmpegService.isAvailable()=${serviceSees}, mas a checagem síncrona deu ${HAS_FFMPEG}.`,
    );
  }
  workdir = await mkdtemp(join(tmpdir(), 'faixa-media-test-'));
  if (HAS_FFMPEG) {
    // Vídeo de 2 s gerado na hora (barras coloridas + tom de 440 Hz).
    const out = join(workdir, 'sample.mp4');
    await run(process.env.FFMPEG_PATH ?? 'ffmpeg', [
      '-y',
      '-f',
      'lavfi',
      '-i',
      'testsrc=size=1280x720:rate=25',
      '-f',
      'lavfi',
      '-i',
      'sine=frequency=440',
      '-t',
      '2',
      '-c:v',
      'libx264',
      '-pix_fmt',
      'yuv420p',
      '-c:a',
      'aac',
      '-shortest',
      out,
    ]);
    sampleVideo = await readFile(out);
  } else {
    sampleVideo = Buffer.from('não é um vídeo de verdade');
  }
});

afterAll(async () => {
  await ctx?.app.close();
  await ctx?.storage.dispose();
  await rm(workdir, { recursive: true, force: true });
});

beforeEach(async () => {
  await resetDatabase(ctx.prisma);
  editor = (await createUser(ctx, ['USER', 'CONTENT_EDITOR'])).auth;
  user = (await createUser(ctx, ['USER'])).auth;
});

function ticket(auth: Record<string, string>, body: Record<string, unknown>) {
  return api().post('/v1/media/upload-url').set(auth).send(body);
}

/** Simula o app enviando o arquivo para a URL pré-assinada. */
async function putFromTicket(url: string, body: Buffer, contentType: string) {
  const [, bucket, ...key] = url.replace('local://', '/').split('/');
  await ctx.storage.clientPut(bucket as 'public' | 'private', key.join('/'), body, contentType);
}

describe('upload em dois passos', () => {
  it('valida tipo e tamanho antes de gerar a URL', async () => {
    const wrongType = await ticket(editor, {
      type: 'VIDEO',
      mimeType: 'image/png',
      sizeBytes: 10,
      filename: 'a.png',
    }).expect(400);
    expect(wrongType.body.errors[0].path).toBe('mimeType');

    const tooBig = await ticket(editor, {
      type: 'IMAGE',
      mimeType: 'image/jpeg',
      sizeBytes: 50 * 1024 * 1024,
      filename: 'a.jpg',
    }).expect(400);
    expect(tooBig.body.errors[0].path).toBe('sizeBytes');
  });

  it('só a equipe de conteúdo envia mídia pública', async () => {
    const res = await ticket(user, {
      type: 'IMAGE',
      mimeType: 'image/jpeg',
      sizeBytes: 100,
      filename: 'a.jpg',
      visibility: 'PUBLIC',
    }).expect(403);
    expect(res.body.code).toBe('media.publicRequiresEditor');

    const priv = await ticket(user, {
      type: 'IMAGE',
      mimeType: 'image/jpeg',
      sizeBytes: 100,
      filename: 'a.jpg',
    }).expect(201);
    expect(priv.body.media).toMatchObject({ visibility: 'PRIVATE', status: 'PENDING_UPLOAD' });
    expect(priv.body.upload).toMatchObject({
      method: 'PUT',
      headers: { 'Content-Type': 'image/jpeg' },
    });
  });

  it('confere se o arquivo chegou e se confere com o declarado', async () => {
    const body = Buffer.from('%PDF-1.4 regras');
    const t = await ticket(editor, {
      type: 'DOCUMENT',
      mimeType: 'application/pdf',
      sizeBytes: body.length,
      filename: 'regras.pdf',
      visibility: 'PUBLIC',
    }).expect(201);
    const id = t.body.media.id;

    const notYet = await api().post(`/v1/media/${id}/complete`).set(editor).expect(409);
    expect(notYet.body.code).toBe('media.notUploaded');

    await putFromTicket(
      t.body.upload.url,
      Buffer.concat([body, Buffer.from('extra')]),
      'application/pdf',
    );
    const mismatch = await api().post(`/v1/media/${id}/complete`).set(editor).expect(400);
    expect(mismatch.body.code).toBe('media.uploadMismatch');

    await putFromTicket(t.body.upload.url, body, 'application/pdf');
    const done = await api().post(`/v1/media/${id}/complete`).set(editor).expect(200);
    // Documento não passa pelo ffmpeg: fica pronto na hora.
    expect(done.body).toMatchObject({ status: 'READY', type: 'DOCUMENT' });
    expect(done.body.urls.original).toMatch(/^http:\/\/cdn\.test\/media\/.+\/original\.pdf$/);

    await api().post(`/v1/media/${id}/complete`).set(editor).expect(409);
  });

  it('mídia de outro usuário não é visível nem pode ser confirmada', async () => {
    const t = await ticket(user, {
      type: 'IMAGE',
      mimeType: 'image/jpeg',
      sizeBytes: 3,
      filename: 'a.jpg',
    }).expect(201);
    const other = (await createUser(ctx, ['USER'])).auth;
    await api().get(`/v1/media/${t.body.media.id}`).set(other).expect(404);
    await api().post(`/v1/media/${t.body.media.id}/complete`).set(other).expect(404);
    await api().get(`/v1/media/${t.body.media.id}`).set(user).expect(200);
  });
});

describe('processamento de vídeo', () => {
  async function uploadVideo() {
    const t = await ticket(editor, {
      type: 'VIDEO',
      mimeType: 'video/mp4',
      sizeBytes: sampleVideo.length,
      filename: 'tecnica.mp4',
      visibility: 'PUBLIC',
    }).expect(201);
    await putFromTicket(t.body.upload.url, sampleVideo, 'video/mp4');
    return api().post(`/v1/media/${t.body.media.id}/complete`).set(editor).expect(200);
  }

  it.runIf(HAS_FFMPEG)('gera thumbnail, 720p e versão offline', async () => {
    const res = await uploadVideo();
    expect(res.body).toMatchObject({ status: 'READY', width: 1280, height: 720 });
    expect(res.body.durationMs).toBeGreaterThan(1500);
    expect(res.body.urls.display).toMatch(/display\.mp4$/);
    expect(res.body.urls.offline).toMatch(/offline\.mp4$/);
    expect(res.body.urls.thumb).toMatch(/thumb\.jpg$/);
    expect(res.body.offlineSizeBytes).toBeGreaterThan(0);
  });

  it.skipIf(HAS_FFMPEG)('sem ffmpeg, a mídia fica com erro e o motivo aparece', async () => {
    const res = await uploadVideo();
    expect(res.body.status).toBe('FAILED');
    expect(res.body.processingError).toContain('ffprobe');

    // O admin pode mandar processar de novo.
    const again = await api()
      .post(`/v1/admin/media/${res.body.id}/reprocess`)
      .set(editor)
      .expect(200);
    expect(again.body.status).toBe('FAILED');
  });
});

describe('biblioteca do CMS', () => {
  it('lista só mídia pública já enviada, filtrando por tipo', async () => {
    await ctx.prisma.media.createMany({
      data: [
        {
          type: 'IMAGE',
          visibility: 'PUBLIC',
          status: 'READY',
          mimeType: 'image/jpeg',
          originalKey: 'media/a/original.jpg',
        },
        {
          type: 'VIDEO',
          visibility: 'PUBLIC',
          status: 'PROCESSING',
          mimeType: 'video/mp4',
          originalKey: 'media/b/original.mp4',
        },
        {
          type: 'IMAGE',
          visibility: 'PRIVATE',
          status: 'READY',
          mimeType: 'image/jpeg',
          originalKey: 'media/c/original.jpg',
        },
        {
          type: 'IMAGE',
          visibility: 'PUBLIC',
          status: 'PENDING_UPLOAD',
          mimeType: 'image/jpeg',
          originalKey: 'media/d/original.jpg',
        },
      ],
    });
    const all = await api().get('/v1/admin/media').set(editor).expect(200);
    expect(all.body.items).toHaveLength(2);
    const images = await api().get('/v1/admin/media?type=IMAGE').set(editor).expect(200);
    expect(images.body.items).toHaveLength(1);
    await api().get('/v1/admin/media').set(user).expect(403);
  });
});
