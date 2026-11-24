import { HttpStatus, Injectable } from '@nestjs/common';
import {
  ContentEntityType,
  type ContentListQuery,
  type ContentVersionDetail,
  type ContentVersionSummary,
  type GlossaryTerm,
  type GlossaryTermInput,
  type GlossaryTermUpdateInput,
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

const ENTITY = ContentEntityType.GLOSSARY_TERM;
const include = { audio: true } satisfies Prisma.GlossaryTermInclude;
type Row = Prisma.GlossaryTermGetPayload<{ include: typeof include }>;

type Snapshot = Omit<GlossaryTermInput, never> & { status?: string };

const snapshotOf = (t: Row) => ({
  japanese: t.japanese,
  kanji: t.kanji,
  translation: t.translation,
  description: t.description,
  categoryId: t.categoryId,
  audioId: t.audioId,
});

@Injectable()
export class GlossaryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly media: MediaService,
    private readonly lifecycle: ContentLifecycleService,
  ) {}

  async list(query: ContentListQuery) {
    const where: Prisma.GlossaryTermWhereInput = {
      deletedAt: null,
      status: query.status,
      categoryId: query.categoryId,
    };
    const q = query.q?.trim();
    if (q) {
      where.OR = [
        { japanese: { contains: q, mode: 'insensitive' } },
        { translation: { contains: q, mode: 'insensitive' } },
      ];
    }
    const rows = await this.prisma.glossaryTerm.findMany({
      where,
      include,
      orderBy: [{ japanese: 'asc' }, { id: 'asc' }],
      take: query.limit + 1,
      ...cursorArgs(query.cursor),
    });
    const page = paginate(rows, query.limit);
    return {
      items: await Promise.all(page.items.map((t) => this.toDto(t))),
      nextCursor: page.nextCursor,
    };
  }

  async get(id: string): Promise<GlossaryTerm> {
    return this.toDto(await this.find(id));
  }

  async create(actor: AuthUser, input: GlossaryTermInput): Promise<GlossaryTerm> {
    if (input.audioId) await this.media.assertAttachable([input.audioId], ['AUDIO']);
    const id = await this.prisma.$transaction(async (tx) => {
      const row = await tx.glossaryTerm.create({
        data: {
          japanese: input.japanese,
          kanji: input.kanji ?? null,
          translation: input.translation,
          description: input.description ?? null,
          categoryId: input.categoryId ?? null,
          audioId: input.audioId ?? null,
        },
      });
      await this.recordVersion(tx, actor, row.id, 'glossary.create');
      return row.id;
    });
    return this.get(id);
  }

  async update(actor: AuthUser, id: string, input: GlossaryTermUpdateInput): Promise<GlossaryTerm> {
    const before = await this.find(id);
    if (input.audioId) await this.media.assertAttachable([input.audioId], ['AUDIO']);
    const { comment, ...data } = input;
    await this.prisma.$transaction(async (tx) => {
      await tx.glossaryTerm.update({ where: { id }, data });
      await this.recordVersion(tx, actor, id, 'glossary.update', snapshotOf(before), comment);
    });
    return this.get(id);
  }

  async changeStatus(actor: AuthUser, id: string, input: StatusChangeInput): Promise<GlossaryTerm> {
    const before = await this.find(id);
    this.lifecycle.assertTransition(before.status, input.status, actor);
    if (input.status === 'PUBLISHED' && before.audio && before.audio.status !== 'READY') {
      throw new AppException(HttpStatus.CONFLICT, 'content.mediaNotReady');
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.glossaryTerm.update({ where: { id }, data: { status: input.status } });
      await this.recordVersion(
        tx,
        actor,
        id,
        `glossary.status.${input.status.toLowerCase()}`,
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

  async restore(actor: AuthUser, id: string, version: number): Promise<GlossaryTerm> {
    const before = await this.find(id);
    const s = (await this.lifecycle.getVersion(ENTITY, id, version)).snapshot as Snapshot;
    const audio = s.audioId
      ? await this.prisma.media.findFirst({ where: { id: s.audioId, deletedAt: null } })
      : null;
    await this.prisma.$transaction(async (tx) => {
      await tx.glossaryTerm.update({
        where: { id },
        data: {
          japanese: s.japanese,
          kanji: s.kanji ?? null,
          translation: s.translation,
          description: s.description ?? null,
          categoryId: s.categoryId ?? null,
          audioId: audio?.id ?? null,
          status: 'DRAFT',
        },
      });
      await this.recordVersion(
        tx,
        actor,
        id,
        'glossary.restore',
        snapshotOf(before),
        `Restaurado a partir da versão ${version}`,
      );
    });
    return this.get(id);
  }

  async remove(actor: AuthUser, id: string): Promise<void> {
    const before = await this.find(id);
    await this.prisma.$transaction(async (tx) => {
      await tx.glossaryTerm.update({ where: { id }, data: { deletedAt: new Date() } });
      await this.recordVersion(tx, actor, id, 'glossary.delete', snapshotOf(before), 'Removido');
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
    const row = await tx.glossaryTerm.findUniqueOrThrow({ where: { id }, include });
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
    const row = await this.prisma.glossaryTerm.findFirst({
      where: { id, deletedAt: null },
      include,
    });
    if (!row) throw AppException.notFound();
    return row;
  }

  private async toDto(t: Row): Promise<GlossaryTerm> {
    return {
      id: t.id,
      japanese: t.japanese,
      kanji: t.kanji,
      translation: t.translation,
      description: t.description,
      categoryId: t.categoryId,
      status: t.status,
      audio: t.audio && !t.audio.deletedAt ? await this.media.toDto(t.audio) : null,
      updatedAt: t.updatedAt.toISOString(),
    };
  }
}
