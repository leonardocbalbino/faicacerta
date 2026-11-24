import request from 'supertest';
import type { App } from 'supertest/types.js';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp, createUser, resetDatabase, type TestContext } from './utils/test-app.js';

let ctx: TestContext;
const api = () => request(ctx.app.getHttpServer() as App);

type Auth = { Authorization: string };
let me: Auth;
let meId: string;
let other: Auth;
let techA: string;
let techB: string;
let programId: string;
let beltId: string;

beforeAll(async () => {
  ctx = await createTestApp();
});

afterAll(async () => {
  await ctx?.app.close();
  await ctx?.storage.dispose();
});

beforeEach(async () => {
  await resetDatabase(ctx.prisma);
  const u = await createUser(ctx);
  me = u.auth;
  meId = u.id;
  other = (await createUser(ctx)).auth;

  const db = ctx.prisma;
  const cat = await db.category.create({ data: { slug: 'nage-waza', name: 'Nage-waza' } });
  const t = (slug: string) =>
    db.technique.create({
      data: {
        slug,
        japaneseName: slug,
        translation: slug,
        categoryId: cat.id,
        status: 'PUBLISHED',
      },
    });
  techA = (await t('o-soto-gari')).id;
  techB = (await t('o-uchi-gari')).id;
  const program = await db.program.create({
    data: { name: 'Base', status: 'PUBLISHED', isBase: true },
  });
  programId = program.id;
  beltId = (
    await db.belt.create({ data: { programId, name: 'Amarela', colors: ['#FACC15'], order: 1 } })
  ).id;
});

describe('perfil', () => {
  it('atualiza nome e faixa (o programa vem da faixa)', async () => {
    const res = await api()
      .patch('/v1/me')
      .set(me)
      .send({ name: 'Ana Judoca', currentBeltId: beltId })
      .expect(200);
    expect(res.body).toMatchObject({ name: 'Ana Judoca', currentBeltId: beltId, programId });
  });

  it('recusa faixa que não existe', async () => {
    await api()
      .patch('/v1/me')
      .set(me)
      .send({ currentBeltId: '01a20d60-0000-7000-8000-000000000000' })
      .expect(400);
  });
});

describe('sincronização', () => {
  it('guarda progresso e favoritos e devolve o estado', async () => {
    const res = await api()
      .post('/v1/me/sync')
      .set(me)
      .send({
        progress: [
          { techniqueId: techA, status: 'MASTERED', updatedAt: '2026-11-20T10:00:00.000Z' },
        ],
        favorites: [{ techniqueId: techB, favorite: true, updatedAt: '2026-11-20T10:00:00.000Z' }],
      })
      .expect(200);
    expect(res.body.progress).toEqual([
      expect.objectContaining({ techniqueId: techA, status: 'MASTERED', approvedAt: null }),
    ]);
    expect(res.body.favorites.map((f: { techniqueId: string }) => f.techniqueId)).toEqual([techB]);

    // Outro usuário não vê nada.
    const state = await api().get('/v1/me/sync').set(other).expect(200);
    expect(state.body).toMatchObject({ progress: [], favorites: [] });
  });

  it('vale a escrita mais recente (last-write-wins)', async () => {
    const send = (status: string, updatedAt: string) =>
      api()
        .post('/v1/me/sync')
        .set(me)
        .send({ progress: [{ techniqueId: techA, status, updatedAt }] })
        .expect(200);

    await send('MASTERED', '2026-11-20T10:00:00.000Z');
    // Aparelho com dado mais antigo não sobrescreve.
    const stale = await send('STUDYING', '2026-11-19T10:00:00.000Z');
    expect(stale.body.progress[0].status).toBe('MASTERED');
    // Mais novo vence.
    const newer = await send('NOT_STARTED', '2026-11-21T10:00:00.000Z');
    expect(newer.body.progress[0].status).toBe('NOT_STARTED');
  });

  it('desfavoritar remove da lista', async () => {
    const fav = (favorite: boolean, updatedAt: string) =>
      api()
        .post('/v1/me/sync')
        .set(me)
        .send({ favorites: [{ techniqueId: techA, favorite, updatedAt }] })
        .expect(200);
    await fav(true, '2026-11-20T10:00:00.000Z');
    const res = await fav(false, '2026-11-20T11:00:00.000Z');
    expect(res.body.favorites).toEqual([]);
  });

  it('não mexe na aprovação do professor', async () => {
    await ctx.prisma.progressItem.create({
      data: {
        userId: meId,
        techniqueId: techA,
        status: 'MASTERED',
        statusUpdatedAt: new Date('2026-11-01T00:00:00Z'),
        approvedAt: new Date('2026-11-02T00:00:00Z'),
      },
    });
    const res = await api()
      .post('/v1/me/sync')
      .set(me)
      .send({
        progress: [
          { techniqueId: techA, status: 'STUDYING', updatedAt: '2026-11-20T10:00:00.000Z' },
        ],
      })
      .expect(200);
    expect(res.body.progress[0]).toMatchObject({
      status: 'STUDYING',
      approvedAt: '2026-11-02T00:00:00.000Z',
    });
  });

  it('exige login', async () => {
    await api().get('/v1/me/sync').expect(401);
  });
});

describe('linha do tempo', () => {
  it('cria, lista em ordem de data, edita e apaga marcos', async () => {
    const grad = await api()
      .post('/v1/me/timeline')
      .set(me)
      .send({ type: 'GRADUATION', date: '2026-03-12', title: 'Virei faixa amarela', beltId })
      .expect(201);
    expect(grad.body.belt).toMatchObject({ id: beltId, name: 'Amarela' });

    const comp = await api()
      .post('/v1/me/timeline')
      .set(me)
      .send({
        type: 'COMPETITION',
        date: '2025-10-18',
        title: 'Bronze no 1º campeonato',
        extra: { medal: 'BRONZE', category: 'sub-18', fights: 3 },
      })
      .expect(201);
    expect(comp.body.extra).toEqual({ medal: 'BRONZE', category: 'sub-18', fights: 3 });

    const list = await api().get('/v1/me/timeline').set(me).expect(200);
    expect(list.body.map((e: { date: string }) => e.date)).toEqual(['2026-03-12', '2025-10-18']);

    const edited = await api()
      .patch(`/v1/me/timeline/${comp.body.id}`)
      .set(me)
      .send({ title: 'Bronze no estadual' })
      .expect(200);
    expect(edited.body.title).toBe('Bronze no estadual');

    // Outro usuário não acessa.
    await api().delete(`/v1/me/timeline/${comp.body.id}`).set(other).expect(404);
    await api().delete(`/v1/me/timeline/${comp.body.id}`).set(me).expect(204);
    const after = await api().get('/v1/me/timeline').set(me).expect(200);
    expect(after.body).toHaveLength(1);
  });

  it('valida a data', async () => {
    await api()
      .post('/v1/me/timeline')
      .set(me)
      .send({ type: 'SEMINAR', date: '12/03/2026', title: 'Seminário' })
      .expect(400);
  });
});

describe('exclusão de conta', () => {
  it('exige confirmação, apaga os dados e encerra o acesso', async () => {
    await api()
      .post('/v1/me/sync')
      .set(me)
      .send({
        progress: [
          { techniqueId: techA, status: 'MASTERED', updatedAt: '2026-11-20T10:00:00.000Z' },
        ],
      })
      .expect(200);
    await api()
      .post('/v1/me/timeline')
      .set(me)
      .send({ type: 'MILESTONE', date: '2024-01-20', title: 'Primeiro treino' })
      .expect(201);

    await api().post('/v1/me/delete').set(me).send({ confirm: 'sim' }).expect(400);
    await api().post('/v1/me/delete').set(me).send({ confirm: 'EXCLUIR' }).expect(204);

    const user = await ctx.prisma.user.findUniqueOrThrow({ where: { id: meId } });
    expect(user).toMatchObject({ email: null, passwordHash: null, name: 'Conta excluída' });
    expect(user.deletedAt).not.toBeNull();
    expect(await ctx.prisma.progressItem.count({ where: { userId: meId } })).toBe(0);
    expect(await ctx.prisma.timelineEvent.count({ where: { userId: meId } })).toBe(0);
    await api().get('/v1/me').set(me).expect(401);
  });
});

describe('técnicas por id (catálogo)', () => {
  it('devolve só as publicadas', async () => {
    const draft = await ctx.prisma.technique.update({
      where: { id: techB },
      data: { status: 'DRAFT' },
    });
    const res = await api()
      .get('/v1/catalog/techniques')
      .query({ ids: `${techA},${draft.id}` })
      .expect(200);
    expect(res.body.map((t: { id: string }) => t.id)).toEqual([techA]);
  });
});
