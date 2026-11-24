/**
 * Seed idempotente: pode rodar várias vezes sem duplicar dados.
 *   pnpm db:seed
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  AuthProviderType,
  BillingInterval,
  PlanCode,
  PlanKind,
  Prisma,
  PrismaClient,
  PublicationStatus,
  QuizQuestionType,
  RequirementType,
  Role,
} from '../../src/generated/prisma/client.js';
import { PasswordService } from '../../src/modules/auth/password.service.js';
import { doc } from './tiptap.js';
import { articles } from './data/articles.js';
import { categories } from './data/categories.js';
import { glossary } from './data/glossary.js';
import { plans, remoteConfig } from './data/monetization.js';
import { belts, program as programSeed } from './data/program.js';
import { quiz } from './data/quiz.js';
import { techniques } from './data/techniques.js';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL não definida');

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
const PUBLISHED = PublicationStatus.PUBLISHED;

async function seedAdmin() {
  const email = (process.env.SEED_ADMIN_EMAIL ?? 'admin@faixacerta.local').toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'Admin@12345';
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return existing;

  const passwordHash = await new PasswordService().hash(password);
  return prisma.user.create({
    data: {
      email,
      name: 'Administrador',
      passwordHash,
      emailVerifiedAt: new Date(),
      roles: [Role.USER, Role.ADMIN],
      authProviders: { create: { provider: AuthProviderType.EMAIL, providerUserId: email } },
    },
  });
}

async function seedCategories() {
  const ids = new Map<string, string>();
  // Pais primeiro (a lista já vem ordenada assim).
  for (const c of categories) {
    const parentId = c.parent ? ids.get(c.parent) : null;
    const row = await prisma.category.upsert({
      where: { slug: c.slug },
      create: { slug: c.slug, name: c.name, order: c.order, parentId },
      update: { name: c.name, order: c.order, parentId },
    });
    ids.set(c.slug, row.id);
  }
  return ids;
}

async function seedTechniques(categoryIds: Map<string, string>) {
  const ids = new Map<string, string>();
  for (const t of techniques) {
    const categoryId = categoryIds.get(t.category);
    if (!categoryId) throw new Error(`Categoria desconhecida: ${t.category}`);
    const data = {
      categoryId,
      japaneseName: t.japaneseName,
      japaneseScript: t.japaneseScript,
      translation: t.translation,
      richContent: doc(t.summary),
      keyPoints: t.keyPoints ?? [],
      commonMistakes: t.commonMistakes ?? [],
      examinerCriteria: t.examinerCriteria ?? null,
      status: PUBLISHED,
      publishedAt: new Date(),
    };
    const row = await prisma.technique.upsert({
      where: { slug: t.slug },
      create: { slug: t.slug, ...data },
      update: data,
    });
    ids.set(t.slug, row.id);
  }

  for (const t of techniques) {
    for (const [order, relatedSlug] of (t.related ?? []).entries()) {
      const techniqueId = ids.get(t.slug)!;
      const relatedId = ids.get(relatedSlug);
      if (!relatedId) throw new Error(`Técnica relacionada desconhecida: ${relatedSlug}`);
      await prisma.techniqueRelation.upsert({
        where: { techniqueId_relatedId: { techniqueId, relatedId } },
        create: { techniqueId, relatedId, order },
        update: { order },
      });
    }
  }
  return ids;
}

async function seedProgram(techniqueIds: Map<string, string>) {
  let program = await prisma.program.findFirst({
    where: { name: programSeed.name, isBase: true, deletedAt: null },
  });
  program ??= await prisma.program.create({
    data: { ...programSeed, isBase: true, status: PUBLISHED },
  });

  const beltIds = new Map<string, string>();
  for (const b of belts) {
    const belt = await prisma.belt.upsert({
      where: { programId_order: { programId: program.id, order: b.order } },
      create: { programId: program.id, name: b.name, colors: b.colors, order: b.order },
      update: { name: b.name, colors: b.colors },
    });
    beltIds.set(b.name, belt.id);

    const reqs = [
      ...b.mandatory.map((slug) => ({ slug, type: RequirementType.MANDATORY })),
      ...(b.optional ?? []).map((slug) => ({ slug, type: RequirementType.OPTIONAL })),
    ];
    for (const [order, r] of reqs.entries()) {
      const techniqueId = techniqueIds.get(r.slug);
      if (!techniqueId) throw new Error(`Técnica desconhecida na faixa ${b.name}: ${r.slug}`);
      await prisma.beltRequirement.upsert({
        where: { beltId_techniqueId: { beltId: belt.id, techniqueId } },
        create: { beltId: belt.id, techniqueId, type: r.type, order },
        update: { type: r.type, order },
      });
    }
  }
  return { programId: program.id, beltIds };
}

async function seedGlossary(categoryIds: Map<string, string>) {
  const categoryId = categoryIds.get('terminologia')!;
  for (const g of glossary) {
    const existing = await prisma.glossaryTerm.findFirst({
      where: { japanese: g.japanese, deletedAt: null },
    });
    const data = {
      japanese: g.japanese,
      kanji: g.kanji ?? null,
      translation: g.translation,
      description: g.description ?? null,
      categoryId,
      status: PUBLISHED,
    };
    if (existing) await prisma.glossaryTerm.update({ where: { id: existing.id }, data });
    else await prisma.glossaryTerm.create({ data });
  }
}

async function seedQuiz(beltIds: Map<string, string>, techniqueIds: Map<string, string>) {
  for (const q of quiz) {
    const exists = await prisma.quizQuestion.findFirst({
      where: { prompt: q.prompt, deletedAt: null },
      select: { id: true },
    });
    if (exists) continue;
    await prisma.quizQuestion.create({
      data: {
        type: QuizQuestionType.MULTIPLE_CHOICE,
        prompt: q.prompt,
        explanation: q.explanation ?? null,
        beltId: q.belt ? beltIds.get(q.belt) : null,
        techniqueId: q.technique ? techniqueIds.get(q.technique) : null,
        status: PUBLISHED,
        options: {
          create: q.options.map((o, order) => ({ text: o.text, isCorrect: !!o.correct, order })),
        },
      },
    });
  }
}

async function seedArticles(categoryIds: Map<string, string>) {
  for (const a of articles) {
    const data = {
      categoryId: categoryIds.get(a.category)!,
      title: a.title,
      richContent: a.richContent,
      order: a.order,
      status: PUBLISHED,
      publishedAt: new Date(),
    };
    await prisma.article.upsert({
      where: { slug: a.slug },
      create: { slug: a.slug, ...data },
      update: data,
    });
  }
}

async function seedPlans(adminId: string) {
  for (const p of plans) {
    const plan = await prisma.plan.upsert({
      where: { code: p.code as PlanCode },
      create: {
        code: p.code as PlanCode,
        kind: p.kind as PlanKind,
        interval: p.interval as BillingInterval | null,
        name: p.name,
        offerText: p.offerText,
        trialDays: p.trialDays,
        graceDays: p.graceDays,
        limits: p.limits ?? Prisma.JsonNull,
      },
      // Não sobrescreve o que o admin já configurou.
      update: {},
    });
    const hasPrice = await prisma.planPrice.count({ where: { planId: plan.id } });
    if (!hasPrice) {
      await prisma.planPrice.create({
        data: {
          planId: plan.id,
          amountCents: p.initialPriceCents,
          validFrom: new Date(),
          createdByAdminId: adminId,
        },
      });
    }
  }
}

async function seedRemoteConfig(adminId: string) {
  for (const [key, value] of Object.entries(remoteConfig)) {
    const current = await prisma.remoteConfig.findFirst({ where: { key, isCurrent: true } });
    if (current) continue;
    await prisma.remoteConfig.create({
      data: { key, value: value as Prisma.InputJsonValue, version: 1, updatedById: adminId },
    });
  }
}

async function main() {
  const admin = await seedAdmin();
  const categoryIds = await seedCategories();
  const techniqueIds = await seedTechniques(categoryIds);
  const { beltIds } = await seedProgram(techniqueIds);
  await seedGlossary(categoryIds);
  await seedQuiz(beltIds, techniqueIds);
  await seedArticles(categoryIds);
  await seedPlans(admin.id);
  await seedRemoteConfig(admin.id);

  const counts = {
    usuarios: await prisma.user.count(),
    categorias: await prisma.category.count(),
    tecnicas: await prisma.technique.count(),
    faixas: await prisma.belt.count(),
    requisitos: await prisma.beltRequirement.count(),
    glossario: await prisma.glossaryTerm.count(),
    quiz: await prisma.quizQuestion.count(),
    artigos: await prisma.article.count(),
    planos: await prisma.plan.count(),
    config: await prisma.remoteConfig.count(),
  };
  console.log('Seed concluído:', counts);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
