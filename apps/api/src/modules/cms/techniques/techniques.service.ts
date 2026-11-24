import { HttpStatus, Injectable } from '@nestjs/common';
import {
  ContentEntityType,
  type ContentListQuery,
  type ContentVersionDetail,
  type ContentVersionSummary,
  type StatusChangeInput,
  type TechniqueDetail,
  type TechniqueInput,
  type TechniqueListItem,
  type TechniqueMediaInput,
  type TechniquePage,
  type TechniqueRelatedInput,
  type TechniqueUpdateInput,
} from '@faixa-certa/shared';
import type { AuthUser } from '../../../common/auth/auth-user.js';
import { AppException } from '../../../common/errors/app.exception.js';
import { Prisma, type TechniqueMediaRole } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../../infra/prisma/prisma.service.js';
import { StorageService } from '../../../infra/storage/storage.service.js';
import { MediaService } from '../../media/media.service.js';
import { bucketFor } from '../../media/media-keys.js';
import {
  ContentLifecycleService,
  cursorArgs,
  paginate,
} from '../common/content-lifecycle.service.js';

const ENTITY = ContentEntityType.TECHNIQUE;

const listInclude = {
  category: { select: { id: true, name: true } },
  // Enum em ordem: MAIN_VIDEO, STEP, GALLERY → o primeiro item serve de capa.
  media: { include: { media: true }, orderBy: [{ role: 'asc' }, { order: 'asc' }], take: 1 },
} satisfies Prisma.TechniqueInclude;

const detailInclude = {
  category: { select: { id: true, name: true } },
  pronunciationAudio: true,
  media: { include: { media: true }, orderBy: { order: 'asc' } },
  relatedTo: {
    orderBy: { order: 'asc' },
    include: {
      related: {
        select: {
          id: true,
          slug: true,
          japaneseName: true,
          translation: true,
          status: true,
          deletedAt: true,
        },
      },
    },
  },
  requirements: {
    include: { belt: { select: { id: true, name: true, program: { select: { name: true } } } } },
  },
} satisfies Prisma.TechniqueInclude;

type ListRow = Prisma.TechniqueGetPayload<{ include: typeof listInclude }>;
type DetailRow = Prisma.TechniqueGetPayload<{ include: typeof detailInclude }>;

/** Estado completo salvo em cada versão (e usado para restaurar). */
interface TechniqueSnapshot {
  slug: string;
  categoryId: string;
  japaneseName: string;
  japaneseScript: string | null;
  translation: string;
  pronunciationAudioId: string | null;
  richContent: unknown;
  keyPoints: string[];
  commonMistakes: string[];
  examinerCriteria: string | null;
  media: { mediaId: string; role: TechniqueMediaRole; caption: string | null }[];
  related: string[];
}

function snapshotOf(t: DetailRow): TechniqueSnapshot {
  return {
    slug: t.slug,
    categoryId: t.categoryId,
    japaneseName: t.japaneseName,
    japaneseScript: t.japaneseScript,
    translation: t.translation,
    pronunciationAudioId: t.pronunciationAudioId,
    richContent: t.richContent,
    keyPoints: t.keyPoints,
    commonMistakes: t.commonMistakes,
    examinerCriteria: t.examinerCriteria,
    media: t.media.map((m) => ({ mediaId: m.mediaId, role: m.role, caption: m.caption })),
    related: t.relatedTo.map((r) => r.relatedId),
  };
}

const jsonOrNull = (v: unknown) =>
  v === null || v === undefined ? Prisma.DbNull : (v as Prisma.InputJsonValue);

@Injectable()
export class TechniquesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly media: MediaService,
    private readonly lifecycle: ContentLifecycleService,
  ) {}

  async list(query: ContentListQuery): Promise<TechniquePage> {
    const q = query.q?.trim();
    const where: Prisma.TechniqueWhereInput = {
      deletedAt: null,
      status: query.status,
      categoryId: query.categoryId,
    };
    if (q) {
      where.OR = [
        { japaneseName: { contains: q, mode: 'insensitive' } },
        { translation: { contains: q, mode: 'insensitive' } },
        { slug: { contains: q, mode: 'insensitive' } },
      ];
    }
    const rows = await this.prisma.technique.findMany({
      where,
      include: listInclude,
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
      ...cursorArgs(query.cursor),
    });
    const page = paginate(rows, query.limit);
    return {
      items: await Promise.all(page.items.map((t) => this.toListItem(t))),
      nextCursor: page.nextCursor,
    };
  }

  async get(id: string): Promise<TechniqueDetail> {
    return this.toDetail(await this.findDetail(id));
  }

  async create(actor: AuthUser, input: TechniqueInput): Promise<TechniqueDetail> {
    await this.assertAudio(input.pronunciationAudioId);
    const id = await this.prisma.$transaction(async (tx) => {
      const created = await tx.technique.create({
        data: {
          slug: input.slug,
          categoryId: input.categoryId,
          japaneseName: input.japaneseName,
          japaneseScript: input.japaneseScript ?? null,
          translation: input.translation,
          pronunciationAudioId: input.pronunciationAudioId ?? null,
          richContent: jsonOrNull(input.richContent),
          keyPoints: input.keyPoints,
          commonMistakes: input.commonMistakes,
          examinerCriteria: input.examinerCriteria ?? null,
          status: 'DRAFT',
        },
      });
      await this.recordVersion(tx, actor, created.id, 'technique.create');
      return created.id;
    });
    return this.get(id);
  }

  async update(actor: AuthUser, id: string, input: TechniqueUpdateInput): Promise<TechniqueDetail> {
    const before = await this.findDetail(id);
    if (input.pronunciationAudioId) await this.assertAudio(input.pronunciationAudioId);
    await this.prisma.$transaction(async (tx) => {
      await tx.technique.update({
        where: { id },
        data: {
          slug: input.slug,
          categoryId: input.categoryId,
          japaneseName: input.japaneseName,
          japaneseScript: input.japaneseScript,
          translation: input.translation,
          pronunciationAudioId: input.pronunciationAudioId,
          richContent: input.richContent === undefined ? undefined : jsonOrNull(input.richContent),
          keyPoints: input.keyPoints,
          commonMistakes: input.commonMistakes,
          examinerCriteria: input.examinerCriteria,
          version: { increment: 1 },
        },
      });
      await this.recordVersion(
        tx,
        actor,
        id,
        'technique.update',
        snapshotOf(before),
        input.comment,
      );
    });
    return this.get(id);
  }

  /** Substitui as mídias (vídeo principal, passos e galeria) na ordem enviada. */
  async setMedia(
    actor: AuthUser,
    id: string,
    input: TechniqueMediaInput,
  ): Promise<TechniqueDetail> {
    const before = await this.findDetail(id);
    const rows = await this.media.assertAttachable(input.items.map((i) => i.mediaId));
    const typeById = new Map(rows.map((m) => [m.id, m.type]));
    for (const item of input.items) {
      const type = typeById.get(item.mediaId);
      const ok =
        item.role === 'MAIN_VIDEO' ? type === 'VIDEO' : type === 'IMAGE' || type === 'VIDEO';
      if (!ok) throw AppException.badRequest('media.wrongType');
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.techniqueMedia.deleteMany({ where: { techniqueId: id } });
      await tx.techniqueMedia.createMany({
        data: input.items.map((item, order) => ({
          techniqueId: id,
          mediaId: item.mediaId,
          role: item.role,
          caption: item.caption ?? null,
          order,
        })),
      });
      await tx.technique.update({ where: { id }, data: { version: { increment: 1 } } });
      await this.recordVersion(tx, actor, id, 'technique.media.update', snapshotOf(before));
    });
    return this.get(id);
  }

  async setRelated(
    actor: AuthUser,
    id: string,
    input: TechniqueRelatedInput,
  ): Promise<TechniqueDetail> {
    const before = await this.findDetail(id);
    const ids = [...new Set(input.ids)];
    if (ids.includes(id)) throw AppException.badRequest('content.relatedSelf');
    const found = await this.prisma.technique.count({
      where: { id: { in: ids }, deletedAt: null },
    });
    if (found !== ids.length) throw AppException.badRequest('content.referenceNotFound');

    await this.prisma.$transaction(async (tx) => {
      await tx.techniqueRelation.deleteMany({ where: { techniqueId: id } });
      await tx.techniqueRelation.createMany({
        data: ids.map((relatedId, order) => ({ techniqueId: id, relatedId, order })),
      });
      await tx.technique.update({ where: { id }, data: { version: { increment: 1 } } });
      await this.recordVersion(tx, actor, id, 'technique.related.update', snapshotOf(before));
    });
    return this.get(id);
  }

  async changeStatus(
    actor: AuthUser,
    id: string,
    input: StatusChangeInput,
  ): Promise<TechniqueDetail> {
    const before = await this.findDetail(id);
    this.lifecycle.assertTransition(before.status, input.status, actor);

    if (input.status === 'PUBLISHED') {
      const media = [...before.media.map((m) => m.media), before.pronunciationAudio].filter(
        (m) => m !== null,
      );
      if (media.some((m) => m.status !== 'READY' || m.deletedAt)) {
        throw new AppException(HttpStatus.CONFLICT, 'content.mediaNotReady');
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.technique.update({
        where: { id },
        data: {
          status: input.status,
          publishedAt: input.status === 'PUBLISHED' ? new Date() : undefined,
          version: { increment: 1 },
        },
      });
      await this.recordVersion(
        tx,
        actor,
        id,
        `technique.status.${input.status.toLowerCase()}`,
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

  /**
   * Restaura o conteúdo de uma versão anterior. Volta para rascunho, para
   * passar de novo pela revisão. Mídias e técnicas que não existem mais são
   * ignoradas.
   */
  async restore(actor: AuthUser, id: string, version: number): Promise<TechniqueDetail> {
    const before = await this.findDetail(id);
    const { snapshot } = await this.lifecycle.getVersion(ENTITY, id, version);
    const s = snapshot as TechniqueSnapshot;

    const [liveMedia, liveRelated, audio] = await Promise.all([
      this.prisma.media.findMany({
        where: { id: { in: s.media.map((m) => m.mediaId) }, deletedAt: null },
        select: { id: true },
      }),
      this.prisma.technique.findMany({
        where: { id: { in: s.related }, deletedAt: null },
        select: { id: true },
      }),
      s.pronunciationAudioId
        ? this.prisma.media.findFirst({ where: { id: s.pronunciationAudioId, deletedAt: null } })
        : null,
    ]);
    const mediaOk = new Set(liveMedia.map((m) => m.id));
    const relatedOk = new Set(liveRelated.map((t) => t.id));

    await this.prisma.$transaction(async (tx) => {
      await tx.technique.update({
        where: { id },
        data: {
          slug: s.slug,
          categoryId: s.categoryId,
          japaneseName: s.japaneseName,
          japaneseScript: s.japaneseScript,
          translation: s.translation,
          pronunciationAudioId: audio ? audio.id : null,
          richContent: jsonOrNull(s.richContent),
          keyPoints: s.keyPoints,
          commonMistakes: s.commonMistakes,
          examinerCriteria: s.examinerCriteria,
          status: 'DRAFT',
          version: { increment: 1 },
        },
      });
      await tx.techniqueMedia.deleteMany({ where: { techniqueId: id } });
      await tx.techniqueMedia.createMany({
        data: s.media
          .filter((m) => mediaOk.has(m.mediaId))
          .map((m, order) => ({
            techniqueId: id,
            mediaId: m.mediaId,
            role: m.role,
            caption: m.caption,
            order,
          })),
      });
      await tx.techniqueRelation.deleteMany({ where: { techniqueId: id } });
      await tx.techniqueRelation.createMany({
        data: s.related
          .filter((r) => relatedOk.has(r) && r !== id)
          .map((relatedId, order) => ({ techniqueId: id, relatedId, order })),
      });
      await this.recordVersion(
        tx,
        actor,
        id,
        'technique.restore',
        snapshotOf(before),
        `Restaurada a partir da versão ${version}`,
      );
    });
    return this.get(id);
  }

  async remove(actor: AuthUser, id: string): Promise<void> {
    const before = await this.findDetail(id);
    await this.prisma.$transaction(async (tx) => {
      await tx.technique.update({ where: { id }, data: { deletedAt: new Date() } });
      await this.recordVersion(tx, actor, id, 'technique.delete', snapshotOf(before), 'Removida');
    });
  }

  // ---------------------------------------------------------------------------

  private async recordVersion(
    tx: Prisma.TransactionClient,
    actor: AuthUser,
    id: string,
    action: string,
    before?: unknown,
    comment?: string,
  ): Promise<void> {
    const current = await tx.technique.findUniqueOrThrow({ where: { id }, include: detailInclude });
    await this.lifecycle.record(tx, {
      entityType: ENTITY,
      entityId: id,
      status: current.status,
      snapshot: snapshotOf(current),
      actor,
      action,
      before,
      comment,
    });
  }

  private async assertAudio(id: string | null | undefined): Promise<void> {
    if (id) await this.media.assertAttachable([id], ['AUDIO']);
  }

  private async findDetail(id: string): Promise<DetailRow> {
    const t = await this.prisma.technique.findFirst({
      where: { id, deletedAt: null },
      include: detailInclude,
    });
    if (!t) throw AppException.notFound();
    return t;
  }

  private async thumbUrl(row: ListRow): Promise<string | null> {
    const media = row.media[0]?.media;
    if (!media || media.status !== 'READY' || !media.keyThumb) return null;
    return this.storage.readUrl(bucketFor(media.visibility), media.keyThumb);
  }

  private async toListItem(t: ListRow): Promise<TechniqueListItem> {
    return {
      id: t.id,
      slug: t.slug,
      japaneseName: t.japaneseName,
      japaneseScript: t.japaneseScript,
      translation: t.translation,
      status: t.status,
      category: t.category,
      version: t.version,
      thumbUrl: await this.thumbUrl(t),
      updatedAt: t.updatedAt.toISOString(),
    };
  }

  private async toDetail(t: DetailRow): Promise<TechniqueDetail> {
    const [media, audio] = await Promise.all([
      Promise.all(
        t.media.map(async (m) => ({
          role: m.role,
          order: m.order,
          caption: m.caption,
          media: await this.media.toDto(m.media),
        })),
      ),
      t.pronunciationAudio ? this.media.toDto(t.pronunciationAudio) : null,
    ]);
    const cover = t.media.slice().sort((a, b) => (a.role < b.role ? -1 : 1))[0]?.media;
    return {
      id: t.id,
      slug: t.slug,
      categoryId: t.categoryId,
      category: t.category,
      japaneseName: t.japaneseName,
      japaneseScript: t.japaneseScript,
      translation: t.translation,
      status: t.status,
      version: t.version,
      richContent: (t.richContent as TechniqueDetail['richContent']) ?? null,
      keyPoints: t.keyPoints,
      commonMistakes: t.commonMistakes,
      examinerCriteria: t.examinerCriteria,
      publishedAt: t.publishedAt?.toISOString() ?? null,
      updatedAt: t.updatedAt.toISOString(),
      thumbUrl:
        cover?.status === 'READY' && cover.keyThumb
          ? await this.storage.readUrl(bucketFor(cover.visibility), cover.keyThumb)
          : null,
      pronunciationAudio: audio,
      media,
      related: t.relatedTo
        .filter((r) => !r.related.deletedAt)
        .map(({ related: { deletedAt: _d, ...ref } }) => ref),
      belts: t.requirements.map((r) => ({
        id: r.belt.id,
        name: r.belt.name,
        programName: r.belt.program.name,
      })),
    };
  }
}
