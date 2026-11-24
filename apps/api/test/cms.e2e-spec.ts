import request from 'supertest';
import type { App } from 'supertest/types.js';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp, createUser, resetDatabase, type TestContext } from './utils/test-app.js';

let ctx: TestContext;
const api = () => request(ctx.app.getHttpServer() as App);

type Auth = { Authorization: string };
let admin: Auth;
let editor: Auth;
let editorId: string;
let user: Auth;

beforeAll(async () => {
  ctx = await createTestApp();
});

afterAll(async () => {
  await ctx?.app.close();
  await ctx?.storage.dispose();
});

beforeEach(async () => {
  await resetDatabase(ctx.prisma);
  admin = (await createUser(ctx, ['USER', 'ADMIN'])).auth;
  const ed = await createUser(ctx, ['USER', 'CONTENT_EDITOR']);
  editor = ed.auth;
  editorId = ed.id;
  user = (await createUser(ctx, ['USER'])).auth;
});

async function createCategory(slug = 'nage-waza', parentId?: string) {
  const res = await api()
    .post('/v1/admin/categories')
    .set(editor)
    .send({ slug, name: `Categoria ${slug}`, parentId })
    .expect(201);
  return res.body.id as string;
}

async function createTechnique(categoryId: string, slug = 'o-soto-gari') {
  const res = await api()
    .post('/v1/admin/techniques')
    .set(editor)
    .send({
      slug,
      categoryId,
      japaneseName: 'O-soto-gari',
      translation: 'Grande ceifada por fora',
      keyPoints: ['Desequilibrar para trás'],
    })
    .expect(201);
  return res.body.id as string;
}

describe('permissões do CMS', () => {
  it('exige login, papel de editor ou admin', async () => {
    await api().get('/v1/admin/techniques').expect(401);
    const res = await api().get('/v1/admin/techniques').set(user).expect(403);
    expect(res.body.code).toBe('errors.forbidden');
    await api().get('/v1/admin/techniques').set(editor).expect(200);
    await api().get('/v1/admin/techniques').set(admin).expect(200);
  });
});

describe('categorias', () => {
  it('monta a árvore e impede ciclos', async () => {
    const parent = await createCategory('nage-waza');
    const child = await createCategory('te-waza', parent);

    const list = await api().get('/v1/admin/categories').set(editor).expect(200);
    expect(list.body).toHaveLength(2);

    const res = await api()
      .patch(`/v1/admin/categories/${parent}`)
      .set(editor)
      .send({ parentId: child })
      .expect(400);
    expect(res.body.code).toBe('content.categoryCycle');
  });

  it('não apaga categoria com conteúdo', async () => {
    const cat = await createCategory();
    await createTechnique(cat);
    const res = await api().delete(`/v1/admin/categories/${cat}`).set(editor).expect(409);
    expect(res.body.code).toBe('content.categoryNotEmpty');
  });

  it('valida o slug', async () => {
    const res = await api()
      .post('/v1/admin/categories')
      .set(editor)
      .send({ slug: 'Com Espaço', name: 'X' })
      .expect(400);
    expect(res.body.errors.map((e: { path: string }) => e.path)).toContain('slug');
  });
});

describe('programas, faixas e requisitos', () => {
  it('cria faixas, reordena e define o checklist', async () => {
    const program = await api()
      .post('/v1/admin/programs')
      .set(editor)
      .send({ name: 'Programa Teste', federation: 'FTJ' })
      .expect(201);
    const pid = program.body.id;

    const branca = await api()
      .post(`/v1/admin/programs/${pid}/belts`)
      .set(editor)
      .send({ name: 'Branca', colors: ['#FFFFFF'] })
      .expect(201);
    const cinzaAzul = await api()
      .post(`/v1/admin/programs/${pid}/belts`)
      .set(editor)
      .send({ name: 'Cinza e azul', colors: ['#9E9E9E', '#1E5BC6'], minAge: 7 })
      .expect(201);
    expect(cinzaAzul.body.order).toBe(1);

    // No máximo duas cores.
    await api()
      .post(`/v1/admin/programs/${pid}/belts`)
      .set(editor)
      .send({ name: 'Tricolor', colors: ['#000000', '#FFFFFF', '#FF0000'] })
      .expect(400);

    const reordered = await api()
      .put(`/v1/admin/programs/${pid}/belts/order`)
      .set(editor)
      .send({ ids: [cinzaAzul.body.id, branca.body.id] })
      .expect(200);
    expect(reordered.body.map((b: { name: string }) => b.name)).toEqual(['Cinza e azul', 'Branca']);

    const cat = await createCategory();
    const t1 = await createTechnique(cat, 'o-soto-gari');
    const t2 = await createTechnique(cat, 'o-goshi');
    const reqs = await api()
      .put(`/v1/admin/belts/${branca.body.id}/requirements`)
      .set(editor)
      .send({
        items: [
          { techniqueId: t2, type: 'MANDATORY' },
          { techniqueId: t1, type: 'OPTIONAL' },
        ],
      })
      .expect(200);
    expect(reqs.body.map((r: { technique: { slug: string } }) => r.technique.slug)).toEqual([
      'o-goshi',
      'o-soto-gari',
    ]);

    const detail = await api().get(`/v1/admin/programs/${pid}`).set(editor).expect(200);
    expect(
      detail.body.belts.find((b: { id: string }) => b.id === branca.body.id).requirementCount,
    ).toBe(2);

    // Ao remover uma faixa, a ordem continua 0..n-1.
    await api().delete(`/v1/admin/belts/${cinzaAzul.body.id}`).set(editor).expect(204);
    const after = await api().get(`/v1/admin/programs/${pid}`).set(editor).expect(200);
    expect(after.body.belts.map((b: { order: number }) => b.order)).toEqual([0]);
  });

  it('não remove faixa em uso por usuários', async () => {
    const program = await api()
      .post('/v1/admin/programs')
      .set(editor)
      .send({ name: 'Programa em uso' })
      .expect(201);
    const belt = await api()
      .post(`/v1/admin/programs/${program.body.id}/belts`)
      .set(editor)
      .send({ name: 'Branca', colors: ['#FFFFFF'] })
      .expect(201);
    await ctx.prisma.user.update({
      where: { id: editorId },
      data: { currentBeltId: belt.body.id },
    });
    const res = await api().delete(`/v1/admin/belts/${belt.body.id}`).set(editor).expect(409);
    expect(res.body.code).toBe('content.beltInUse');
  });
});

describe('técnicas: publicação e versões', () => {
  it('segue o fluxo rascunho → revisão → publicado e guarda versões', async () => {
    const cat = await createCategory();
    const id = await createTechnique(cat);

    const updated = await api()
      .patch(`/v1/admin/techniques/${id}`)
      .set(editor)
      .send({ translation: 'Grande ceifa externa', comment: 'ajuste de tradução' })
      .expect(200);
    expect(updated.body).toMatchObject({ status: 'DRAFT', version: 2 });

    // Editor não publica direto do rascunho.
    const denied = await api()
      .post(`/v1/admin/techniques/${id}/status`)
      .set(editor)
      .send({ status: 'PUBLISHED' })
      .expect(409);
    expect(denied.body.code).toBe('content.invalidTransition');

    await api()
      .post(`/v1/admin/techniques/${id}/status`)
      .set(editor)
      .send({ status: 'REVIEW' })
      .expect(200);
    const published = await api()
      .post(`/v1/admin/techniques/${id}/status`)
      .set(editor)
      .send({ status: 'PUBLISHED' })
      .expect(200);
    expect(published.body.status).toBe('PUBLISHED');
    expect(published.body.publishedAt).toBeTypeOf('string');

    const versions = await api().get(`/v1/admin/techniques/${id}/versions`).set(editor).expect(200);
    expect(versions.body.map((v: { version: number }) => v.version)).toEqual([4, 3, 2, 1]);
    expect(versions.body[2]).toMatchObject({
      comment: 'ajuste de tradução',
      author: { id: editorId },
    });

    // Restaurar volta o texto e coloca em rascunho de novo.
    const restored = await api()
      .post(`/v1/admin/techniques/${id}/versions/1/restore`)
      .set(editor)
      .expect(200);
    expect(restored.body).toMatchObject({
      translation: 'Grande ceifada por fora',
      status: 'DRAFT',
    });

    const audit = await ctx.prisma.auditLog.findMany({
      where: { entityId: id },
      orderBy: { createdAt: 'asc' },
    });
    expect(audit.map((a) => a.action)).toEqual([
      'technique.create',
      'technique.update',
      'technique.status.review',
      'technique.status.published',
      'technique.restore',
    ]);
    expect(audit.every((a) => a.actorId === editorId)).toBe(true);
  });

  it('admin publica direto do rascunho', async () => {
    const id = await createTechnique(await createCategory());
    await api()
      .post(`/v1/admin/techniques/${id}/status`)
      .set(admin)
      .send({ status: 'PUBLISHED' })
      .expect(200);
  });

  it('não publica com mídia em processamento', async () => {
    const id = await createTechnique(await createCategory());
    const media = await ctx.prisma.media.create({
      data: {
        type: 'VIDEO',
        visibility: 'PUBLIC',
        status: 'PROCESSING',
        mimeType: 'video/mp4',
        originalKey: 'media/teste/original.mp4',
      },
    });
    await api()
      .put(`/v1/admin/techniques/${id}/media`)
      .set(editor)
      .send({ items: [{ mediaId: media.id, role: 'MAIN_VIDEO' }] })
      .expect(200);

    const res = await api()
      .post(`/v1/admin/techniques/${id}/status`)
      .set(admin)
      .send({ status: 'PUBLISHED' })
      .expect(409);
    expect(res.body.code).toBe('content.mediaNotReady');

    await ctx.prisma.media.update({ where: { id: media.id }, data: { status: 'READY' } });
    await api()
      .post(`/v1/admin/techniques/${id}/status`)
      .set(admin)
      .send({ status: 'PUBLISHED' })
      .expect(200);

    // Mídia em uso não pode ser apagada.
    const del = await api().delete(`/v1/admin/media/${media.id}`).set(editor).expect(409);
    expect(del.body.code).toBe('media.inUse');
  });

  it('valida tipo da mídia e relacionadas', async () => {
    const cat = await createCategory();
    const id = await createTechnique(cat, 'o-soto-gari');
    const other = await createTechnique(cat, 'ko-soto-gari');
    const image = await ctx.prisma.media.create({
      data: {
        type: 'IMAGE',
        visibility: 'PUBLIC',
        status: 'READY',
        mimeType: 'image/jpeg',
        originalKey: 'media/x/original.jpg',
      },
    });

    const wrong = await api()
      .put(`/v1/admin/techniques/${id}/media`)
      .set(editor)
      .send({ items: [{ mediaId: image.id, role: 'MAIN_VIDEO' }] })
      .expect(400);
    expect(wrong.body.code).toBe('media.wrongType');

    const self = await api()
      .put(`/v1/admin/techniques/${id}/related`)
      .set(editor)
      .send({ ids: [id] })
      .expect(400);
    expect(self.body.code).toBe('content.relatedSelf');

    const ok = await api()
      .put(`/v1/admin/techniques/${id}/related`)
      .set(editor)
      .send({ ids: [other] })
      .expect(200);
    expect(ok.body.related.map((r: { slug: string }) => r.slug)).toEqual(['ko-soto-gari']);
  });

  it('slug duplicado e categoria inexistente', async () => {
    const cat = await createCategory();
    await createTechnique(cat, 'o-goshi');
    await api()
      .post('/v1/admin/techniques')
      .set(editor)
      .send({
        slug: 'o-goshi',
        categoryId: cat,
        japaneseName: 'O-goshi',
        translation: 'Grande quadril',
      })
      .expect(409);
    const fk = await api()
      .post('/v1/admin/techniques')
      .set(editor)
      .send({
        slug: 'uki-goshi',
        categoryId: '0195f0c0-0000-7000-8000-000000000000',
        japaneseName: 'Uki-goshi',
        translation: 'Quadril flutuante',
      })
      .expect(400);
    expect(fk.body.code).toBe('content.referenceNotFound');
  });
});

describe('quiz, glossário e textos', () => {
  it('quiz exige exatamente uma resposta certa', async () => {
    const bad = await api()
      .post('/v1/admin/quiz-questions')
      .set(editor)
      .send({
        type: 'MULTIPLE_CHOICE',
        prompt: 'O que é kuzushi?',
        options: [
          { text: 'Desequilíbrio', isCorrect: true },
          { text: 'Queda', isCorrect: true },
        ],
      })
      .expect(400);
    expect(bad.body.errors[0].path).toBe('options');

    const created = await api()
      .post('/v1/admin/quiz-questions')
      .set(editor)
      .send({
        type: 'MULTIPLE_CHOICE',
        prompt: 'O que é kuzushi?',
        options: [
          { text: 'Desequilíbrio', isCorrect: true },
          { text: 'Queda', isCorrect: false },
        ],
      })
      .expect(201);

    const replaced = await api()
      .put(`/v1/admin/quiz-questions/${created.body.id}`)
      .set(editor)
      .send({
        type: 'TRUE_FALSE',
        prompt: 'Kuzushi é o desequilíbrio?',
        options: [
          { text: 'Verdadeiro', isCorrect: true },
          { text: 'Falso', isCorrect: false },
        ],
      })
      .expect(200);
    expect(replaced.body.options.map((o: { text: string }) => o.text)).toEqual([
      'Verdadeiro',
      'Falso',
    ]);

    const versions = await api()
      .get(`/v1/admin/quiz-questions/${created.body.id}/versions`)
      .set(editor)
      .expect(200);
    expect(versions.body).toHaveLength(2);
  });

  it('glossário e textos passam pelo mesmo fluxo', async () => {
    const term = await api()
      .post('/v1/admin/glossary')
      .set(editor)
      .send({ japanese: 'Hajime', translation: 'Comecem' })
      .expect(201);
    await api()
      .post(`/v1/admin/glossary/${term.body.id}/status`)
      .set(admin)
      .send({ status: 'PUBLISHED' })
      .expect(200);

    const list = await api().get('/v1/admin/glossary?q=haji').set(editor).expect(200);
    expect(list.body.items).toHaveLength(1);

    const cat = await createCategory('historia');
    const article = await api()
      .post('/v1/admin/articles')
      .set(editor)
      .send({
        categoryId: cat,
        slug: 'origem',
        title: 'A origem do judô',
        richContent: { type: 'doc', content: [{ type: 'paragraph' }] },
      })
      .expect(201);
    await api()
      .patch(`/v1/admin/articles/${article.body.id}`)
      .set(editor)
      .send({ title: 'Origem do judô' })
      .expect(200);
    const restored = await api()
      .post(`/v1/admin/articles/${article.body.id}/versions/1/restore`)
      .set(editor)
      .expect(200);
    expect(restored.body.title).toBe('A origem do judô');
  });
});
