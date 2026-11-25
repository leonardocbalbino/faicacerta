import request from 'supertest';
import type { App } from 'supertest/types.js';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp, resetDatabase, type TestContext } from './utils/test-app.js';

let ctx: TestContext;
const api = () => request(ctx.app.getHttpServer() as App);

let programId: string;
let beltId: string;
let draftProgramBeltId: string;

beforeAll(async () => {
  ctx = await createTestApp();
});

afterAll(async () => {
  await ctx?.app.close();
  await ctx?.storage.dispose();
});

beforeEach(async () => {
  await resetDatabase(ctx.prisma);
  const db = ctx.prisma;

  const nage = await db.category.create({ data: { slug: 'nage-waza', name: 'Nage-waza' } });
  const ashi = await db.category.create({
    data: { slug: 'ashi-waza', name: 'Ashi-waza', parentId: nage.id },
  });

  const technique = (
    slug: string,
    japaneseName: string,
    translation: string,
    status = 'PUBLISHED',
  ) =>
    db.technique.create({
      data: {
        slug,
        japaneseName,
        translation,
        categoryId: ashi.id,
        keyPoints: ['Desequilibrar'],
        status: status as 'PUBLISHED' | 'DRAFT',
      },
    });
  const osoto = await technique('o-soto-gari', 'O-soto-gari', 'Grande ceifada por fora');
  const ouchi = await technique('o-uchi-gari', 'O-uchi-gari', 'Grande ceifada por dentro');
  const draft = await technique(
    'de-ashi-harai',
    'De-ashi-harai',
    'Varrida do pé avançado',
    'DRAFT',
  );
  await db.technique.update({
    where: { id: ouchi.id },
    data: { youtubeUrl: 'https://youtu.be/0itJFhV9pDQ?t=3' },
  });
  const removed = await technique('ko-uchi-gari', 'Ko-uchi-gari', 'Pequena ceifada por dentro');
  await db.technique.update({ where: { id: removed.id }, data: { deletedAt: new Date() } });
  await db.techniqueRelation.createMany({
    data: [
      { techniqueId: osoto.id, relatedId: ouchi.id, order: 0 },
      { techniqueId: osoto.id, relatedId: draft.id, order: 1 },
    ],
  });

  const video = await db.media.create({
    data: {
      type: 'VIDEO',
      status: 'READY',
      mimeType: 'video/mp4',
      originalKey: 'media/v/original.mp4',
      key720p: 'media/v/720p.mp4',
      keyOffline: 'media/v/360p.mp4',
      keyThumb: 'media/v/thumb.jpg',
      durationMs: 42_000,
    },
  });
  const processing = await db.media.create({
    data: {
      type: 'IMAGE',
      status: 'PROCESSING',
      mimeType: 'image/jpeg',
      originalKey: 'media/i/original.jpg',
    },
  });
  await db.techniqueMedia.createMany({
    data: [
      { techniqueId: osoto.id, mediaId: video.id, role: 'MAIN_VIDEO', order: 0 },
      { techniqueId: osoto.id, mediaId: processing.id, role: 'STEP', order: 0 },
    ],
  });

  const program = await db.program.create({
    data: { name: 'Programa base', isBase: true, status: 'PUBLISHED' },
  });
  programId = program.id;
  const belt = await db.belt.create({
    data: { programId, name: 'Amarela', colors: ['#FACC15'], order: 0 },
  });
  beltId = belt.id;
  await db.beltRequirement.createMany({
    data: [osoto, ouchi, draft, removed].map((t, order) => ({
      beltId,
      techniqueId: t.id,
      order,
    })),
  });

  const draftProgram = await db.program.create({ data: { name: 'Rascunho', status: 'DRAFT' } });
  const hidden = await db.belt.create({
    data: { programId: draftProgram.id, name: 'Oculta', colors: ['#000000'], order: 0 },
  });
  draftProgramBeltId = hidden.id;

  await db.glossaryTerm.createMany({
    data: [
      { japanese: 'Hajime', translation: 'Começar', status: 'PUBLISHED' },
      { japanese: 'Mate', translation: 'Parar', status: 'PUBLISHED' },
      { japanese: 'Sono-mama', translation: 'Não se mexam', status: 'DRAFT' },
    ],
  });
});

describe('catálogo público', () => {
  it('não exige login', async () => {
    await api().get('/v1/catalog/programs').expect(200);
  });

  it('lista só programas publicados, com a contagem de técnicas publicadas', async () => {
    const res = await api().get('/v1/catalog/programs').expect(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({ id: programId, isBase: true });
    expect(res.body[0].belts).toEqual([
      expect.objectContaining({ id: beltId, name: 'Amarela', techniqueCount: 2 }),
    ]);
  });

  it('monta a apostila da faixa só com técnicas publicadas, na ordem do exame', async () => {
    const res = await api().get(`/v1/catalog/belts/${beltId}`).expect(200);
    expect(res.body.program).toEqual({ id: programId, name: 'Programa base' });
    expect(
      res.body.requirements.map((r: { technique: { slug: string } }) => r.technique.slug),
    ).toEqual(['o-soto-gari', 'o-uchi-gari']);
    const osoto = res.body.requirements[0].technique;
    expect(osoto.category).toMatchObject({ name: 'Ashi-waza', parent: { name: 'Nage-waza' } });
    expect(osoto.videoDurationMs).toBe(42_000);
    expect(osoto.thumbUrl).toContain('media/v/thumb.jpg');
  });

  it('esconde faixa de programa não publicado', async () => {
    await api().get(`/v1/catalog/belts/${draftProgramBeltId}`).expect(404);
  });

  it('abre a técnica pelo slug ou pelo id, só com mídia pronta e relacionadas publicadas', async () => {
    const res = await api().get('/v1/catalog/techniques/o-soto-gari').expect(200);
    expect(res.body.video).toMatchObject({ type: 'VIDEO', durationMs: 42_000 });
    expect(res.body.video.url).toContain('media/v/720p.mp4');
    expect(res.body.video.offlineUrl).toContain('media/v/360p.mp4');
    expect(res.body.steps).toEqual([]); // imagem ainda processando
    expect(res.body.related.map((t: { slug: string }) => t.slug)).toEqual(['o-uchi-gari']);
    expect(res.body.belts).toEqual([expect.objectContaining({ id: beltId, name: 'Amarela' })]);

    await api().get(`/v1/catalog/techniques/${res.body.id}`).expect(200);
    await api().get('/v1/catalog/techniques/de-ashi-harai').expect(404);
    await api().get('/v1/catalog/techniques/ko-uchi-gari').expect(404);
  });

  it('entrega o vídeo do YouTube (e a miniatura dele na lista) quando não há vídeo próprio', async () => {
    const res = await api().get('/v1/catalog/techniques/o-uchi-gari').expect(200);
    expect(res.body.video).toBeNull();
    expect(res.body.youtube).toEqual({
      id: '0itJFhV9pDQ',
      url: 'https://www.youtube.com/watch?v=0itJFhV9pDQ',
      thumbUrl: 'https://i.ytimg.com/vi/0itJFhV9pDQ/hqdefault.jpg',
    });
    expect(res.body.thumbUrl).toBe('https://i.ytimg.com/vi/0itJFhV9pDQ/hqdefault.jpg');

    const osoto = await api().get('/v1/catalog/techniques/o-soto-gari').expect(200);
    expect(osoto.body.youtube).toBeNull();
  });

  it('lista o glossário publicado e filtra pela busca', async () => {
    const all = await api().get('/v1/catalog/glossary').expect(200);
    expect(all.body.map((g: { japanese: string }) => g.japanese)).toEqual(['Hajime', 'Mate']);

    const found = await api().get('/v1/catalog/glossary').query({ q: 'começar' }).expect(200);
    expect(found.body.map((g: { japanese: string }) => g.japanese)).toEqual(['Hajime']);
  });

  it('busca sem acento, sem hífen e tolerante a erro de digitação', async () => {
    const byName = await api().get('/v1/catalog/search').query({ q: 'osoto' }).expect(200);
    expect(byName.body.techniques[0].slug).toBe('o-soto-gari');

    const noAccent = await api().get('/v1/catalog/search').query({ q: 'comecar' }).expect(200);
    expect(noAccent.body.glossary.map((g: { japanese: string }) => g.japanese)).toContain('Hajime');

    const typo = await api().get('/v1/catalog/search').query({ q: 'ceifada por fra' }).expect(200);
    expect(typo.body.techniques.map((t: { slug: string }) => t.slug)).toContain('o-soto-gari');

    const hidden = await api().get('/v1/catalog/search').query({ q: 'de-ashi' }).expect(200);
    expect(hidden.body.techniques).toEqual([]);

    await api().get('/v1/catalog/search').query({ q: 'a' }).expect(400);
  });
});
