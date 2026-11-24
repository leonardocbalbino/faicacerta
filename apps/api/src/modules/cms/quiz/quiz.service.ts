import { HttpStatus, Injectable } from '@nestjs/common';
import {
  ContentEntityType,
  type ContentVersionDetail,
  type ContentVersionSummary,
  type QuizListQuery,
  type QuizQuestion,
  type QuizQuestionInput,
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

const ENTITY = ContentEntityType.QUIZ_QUESTION;
const include = {
  media: true,
  options: { include: { media: true }, orderBy: { order: 'asc' } },
} satisfies Prisma.QuizQuestionInclude;
type Row = Prisma.QuizQuestionGetPayload<{ include: typeof include }>;

const snapshotOf = (q: Row): QuizQuestionInput => ({
  type: q.type,
  prompt: q.prompt,
  explanation: q.explanation,
  beltId: q.beltId,
  techniqueId: q.techniqueId,
  mediaId: q.mediaId,
  difficulty: q.difficulty,
  options: q.options.map((o) => ({ text: o.text, mediaId: o.mediaId, isCorrect: o.isCorrect })),
});

@Injectable()
export class QuizService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly media: MediaService,
    private readonly lifecycle: ContentLifecycleService,
  ) {}

  async list(query: QuizListQuery) {
    const where: Prisma.QuizQuestionWhereInput = {
      deletedAt: null,
      status: query.status,
      beltId: query.beltId,
    };
    const q = query.q?.trim();
    if (q) where.prompt = { contains: q, mode: 'insensitive' };
    const rows = await this.prisma.quizQuestion.findMany({
      where,
      include,
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
      ...cursorArgs(query.cursor),
    });
    const page = paginate(rows, query.limit);
    return {
      items: await Promise.all(page.items.map((r) => this.toDto(r))),
      nextCursor: page.nextCursor,
    };
  }

  async get(id: string): Promise<QuizQuestion> {
    return this.toDto(await this.find(id));
  }

  async create(actor: AuthUser, input: QuizQuestionInput): Promise<QuizQuestion> {
    await this.assertMedia(input);
    const id = await this.prisma.$transaction(async (tx) => {
      const row = await tx.quizQuestion.create({
        data: { ...this.fields(input), options: { create: this.options(input) } },
      });
      await this.recordVersion(tx, actor, row.id, 'quiz.create');
      return row.id;
    });
    return this.get(id);
  }

  /** Substitui a pergunta inteira, opções incluídas. */
  async replace(actor: AuthUser, id: string, input: QuizQuestionInput): Promise<QuizQuestion> {
    const before = await this.find(id);
    await this.assertMedia(input);
    await this.prisma.$transaction(async (tx) => {
      await tx.quizOption.deleteMany({ where: { questionId: id } });
      await tx.quizQuestion.update({
        where: { id },
        data: { ...this.fields(input), options: { create: this.options(input) } },
      });
      await this.recordVersion(tx, actor, id, 'quiz.update', snapshotOf(before));
    });
    return this.get(id);
  }

  async changeStatus(actor: AuthUser, id: string, input: StatusChangeInput): Promise<QuizQuestion> {
    const before = await this.find(id);
    this.lifecycle.assertTransition(before.status, input.status, actor);
    if (input.status === 'PUBLISHED') {
      const media = [before.media, ...before.options.map((o) => o.media)].filter((m) => m !== null);
      if (media.some((m) => m.status !== 'READY' || m.deletedAt)) {
        throw new AppException(HttpStatus.CONFLICT, 'content.mediaNotReady');
      }
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.quizQuestion.update({ where: { id }, data: { status: input.status } });
      await this.recordVersion(
        tx,
        actor,
        id,
        `quiz.status.${input.status.toLowerCase()}`,
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

  async restore(actor: AuthUser, id: string, version: number): Promise<QuizQuestion> {
    const before = await this.find(id);
    const s = (await this.lifecycle.getVersion(ENTITY, id, version)).snapshot as QuizQuestionInput;
    await this.prisma.$transaction(async (tx) => {
      await tx.quizOption.deleteMany({ where: { questionId: id } });
      await tx.quizQuestion.update({
        where: { id },
        data: { ...this.fields(s), status: 'DRAFT', options: { create: this.options(s) } },
      });
      await this.recordVersion(
        tx,
        actor,
        id,
        'quiz.restore',
        snapshotOf(before),
        `Restaurada a partir da versão ${version}`,
      );
    });
    return this.get(id);
  }

  async remove(actor: AuthUser, id: string): Promise<void> {
    const before = await this.find(id);
    await this.prisma.$transaction(async (tx) => {
      await tx.quizQuestion.update({ where: { id }, data: { deletedAt: new Date() } });
      await this.recordVersion(tx, actor, id, 'quiz.delete', snapshotOf(before), 'Removida');
    });
  }

  // ---------------------------------------------------------------------------

  private fields(input: QuizQuestionInput) {
    return {
      type: input.type,
      prompt: input.prompt,
      explanation: input.explanation ?? null,
      beltId: input.beltId ?? null,
      techniqueId: input.techniqueId ?? null,
      mediaId: input.mediaId ?? null,
      difficulty: input.difficulty,
    };
  }

  private options(input: QuizQuestionInput) {
    return input.options.map((o, order) => ({
      text: o.text,
      mediaId: o.mediaId ?? null,
      isCorrect: o.isCorrect,
      order,
    }));
  }

  /** Vídeo para "identifique pelo vídeo", foto para "pela foto"; opções só com imagem. */
  private async assertMedia(input: QuizQuestionInput): Promise<void> {
    if (input.mediaId) {
      const type = input.type === 'IDENTIFY_BY_VIDEO' ? 'VIDEO' : 'IMAGE';
      await this.media.assertAttachable([input.mediaId], [type]);
    }
    const optionMedia = input.options.map((o) => o.mediaId).filter((m): m is string => !!m);
    await this.media.assertAttachable(optionMedia, ['IMAGE']);
  }

  private async recordVersion(
    tx: Prisma.TransactionClient,
    actor: AuthUser,
    id: string,
    action: string,
    before?: unknown,
    comment?: string,
  ) {
    const row = await tx.quizQuestion.findUniqueOrThrow({ where: { id }, include });
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
    const row = await this.prisma.quizQuestion.findFirst({
      where: { id, deletedAt: null },
      include,
    });
    if (!row) throw AppException.notFound();
    return row;
  }

  private async toDto(q: Row): Promise<QuizQuestion> {
    const dto = (m: Row['media']) => (m && !m.deletedAt ? this.media.toDto(m) : null);
    return {
      id: q.id,
      type: q.type,
      prompt: q.prompt,
      explanation: q.explanation,
      beltId: q.beltId,
      techniqueId: q.techniqueId,
      difficulty: q.difficulty,
      status: q.status,
      media: await dto(q.media),
      options: await Promise.all(
        q.options.map(async (o) => ({
          id: o.id,
          text: o.text,
          isCorrect: o.isCorrect,
          order: o.order,
          media: await dto(o.media),
        })),
      ),
      updatedAt: q.updatedAt.toISOString(),
    };
  }
}
