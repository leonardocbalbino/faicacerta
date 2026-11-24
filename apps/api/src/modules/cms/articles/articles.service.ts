import { HttpStatus, Injectable } from '@nestjs/common';
import {
  ContentEntityType,
  type Article,
  type ArticleInput,
  type ArticleUpdateInput,
  type ContentListQuery,
  type ContentVersionDetail,
  type ContentVersionSummary,
  type StatusChangeInput,
} from '@faixa-certa/shared';
import type { AuthUser } from '../../../common/auth/auth-user.js';
import { AppException } from '../../../common/errors/app.exception.js';
import type { Prisma } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../../infra/prisma/prisma.service.js';
import { MediaService } from '../../media/media.service.js';
import {
  ContentLifecycleService,
  cursorArgs,
  paginate,
} from '../common/content-lifecycle.service.js';

const ENTITY = ContentEntityType.ARTICLE;
const include = { cover: true } satisfies Prisma.ArticleInclude;
type Row = Prisma.ArticleGetPayload<{ include: typeof include }>;

const snapshotOf = (a: Row): ArticleInput => ({
  categoryId: a.categoryId,
  slug: a.slug,
  title: a.title,
  richContent: a.richContent as ArticleInput['richContent'],
  coverMediaId: a.coverMediaId,
  order: a.order,
});

/** Textos de história, etiqueta e regras. */
@Injectable()
export class ArticlesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly media: MediaService,
    private readonly lifecycle: ContentLifecycleService,
  ) {}

  async list(query: ContentListQuery) {
    const where: Prisma.ArticleWhereInput = {
      deletedAt: null,
      status: query.status,
      categoryId: query.categoryId,
    };
    const q = query.q?.trim();
    if (q) where.title = { contains: q, mode: 'insensitive' };
    const rows = await this.prisma.article.findMany({
      where,
      include,
      orderBy: [{ order: 'asc' }, { id: 'asc' }],
      take: query.limit + 1,
      ...cursorArgs(query.cursor),
    });
    const page = paginate(rows, query.limit);
    return {
      items: await Promise.all(page.items.map((a) => this.toDto(a))),
      nextCursor: page.nextCursor,
    };
  }

  async get(id: string): Promise<Article> {
    return this.toDto(await this.find(id));
  }

  async create(actor: AuthUser, input: ArticleInput): Promise<Article> {
    if (input.coverMediaId) await this.media.assertAttachable([input.coverMediaId], ['IMAGE']);
    const id = await this.prisma.$transaction(async (tx) => {
      const row = await tx.article.create({
        data: {
          categoryId: input.categoryId,
          slug: input.slug,
          title: input.title,
          richContent: input.richContent as Prisma.InputJsonValue,
          coverMediaId: input.coverMediaId ?? null,
          order: input.order ?? 0,
        },
      });
      await this.recordVersion(tx, actor, row.id, 'article.create');
      return row.id;
    });
    return this.get(id);
  }

  async update(actor: AuthUser, id: string, input: ArticleUpdateInput): Promise<Article> {
    const before = await this.find(id);
    if (input.coverMediaId) await this.media.assertAttachable([input.coverMediaId], ['IMAGE']);
    const { comment, richContent, ...rest } = input;
    await this.prisma.$transaction(async (tx) => {
      await tx.article.update({
        where: { id },
        data: { ...rest, richContent: richContent as Prisma.InputJsonValue | undefined },
      });
      await this.recordVersion(tx, actor, id, 'article.update', snapshotOf(before), comment);
    });
    return this.get(id);
  }

  async changeStatus(actor: AuthUser, id: string, input: StatusChangeInput): Promise<Article> {
    const before = await this.find(id);
    this.lifecycle.assertTransition(before.status, input.status, actor);
    if (input.status === 'PUBLISHED' && before.cover && before.cover.status !== 'READY') {
      throw new AppException(HttpStatus.CONFLICT, 'content.mediaNotReady');
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.article.update({
        where: { id },
        data: {
          status: input.status,
          publishedAt: input.status === 'PUBLISHED' ? new Date() : undefined,
        },
      });
      await this.recordVersion(
        tx,
        actor,
        id,
        `article.status.${input.status.toLowerCase()}`,
        { status: before.status },
        input.comment,
      );
    });
    return this.get(id);
  }

  listVersions(id: string): Promise<ContentVersionSummary[]> {
    return this.lifecycle.listVersions(ENTITY, id);
  }

  getVersion(id: string, version: number): Promise<ContentVersionDetail> {
    return this.lifecycle.getVersion(ENTITY, id, version);
  }

  async restore(actor: AuthUser, id: string, version: number): Promise<Article> {
    const before = await this.find(id);
    const s = (await this.lifecycle.getVersion(ENTITY, id, version)).snapshot as ArticleInput;
    const cover = s.coverMediaId
      ? await this.prisma.media.findFirst({ where: { id: s.coverMediaId, deletedAt: null } })
      : null;
    await this.prisma.$transaction(async (tx) => {
      await tx.article.update({
        where: { id },
        data: {
          categoryId: s.categoryId,
          slug: s.slug,
          title: s.title,
          richContent: s.richContent as Prisma.InputJsonValue,
          coverMediaId: cover?.id ?? null,
          order: s.order ?? 0,
          status: 'DRAFT',
        },
      });
      await this.recordVersion(
        tx,
        actor,
        id,
        'article.restore',
        snapshotOf(before),
        `Restaurado a partir da versão ${version}`,
      );
    });
    return this.get(id);
  }

  async remove(actor: AuthUser, id: string): Promise<void> {
    const before = await this.find(id);
    await this.prisma.$transaction(async (tx) => {
      await tx.article.update({ where: { id }, data: { deletedAt: new Date() } });
      await this.recordVersion(tx, actor, id, 'article.delete', snapshotOf(before), 'Removido');
    });
  }

  private async recordVersion(
    tx: Prisma.TransactionClient,
    actor: AuthUser,
    id: string,
    action: string,
    before?: unknown,
    comment?: string,
  ) {
    const row = await tx.article.findUniqueOrThrow({ where: { id }, include });
    await this.lifecycle.record(tx, {
      entityType: ENTITY,
      entityId: id,
      status: row.status,
      snapshot: snapshotOf(row),
      actor,
      action,
      before,
      comment,
    });
  }

  private async find(id: string): Promise<Row> {
    const row = await this.prisma.article.findFirst({ where: { id, deletedAt: null }, include });
    if (!row) throw AppException.notFound();
    return row;
  }

  private async toDto(a: Row): Promise<Article> {
    return {
      id: a.id,
      categoryId: a.categoryId,
      slug: a.slug,
      title: a.title,
      richContent: a.richContent as Article['richContent'],
      cover: a.cover && !a.cover.deletedAt ? await this.media.toDto(a.cover) : null,
      order: a.order,
      status: a.status,
      publishedAt: a.publishedAt?.toISOString() ?? null,
      updatedAt: a.updatedAt.toISOString(),
    };
  }
}
