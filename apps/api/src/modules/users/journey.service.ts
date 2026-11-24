import { Injectable } from '@nestjs/common';
import type {
  SyncInput,
  SyncState,
  TimelineEvent,
  TimelineEventInput,
  TimelineEventUpdateInput,
  TimelineExtra,
} from '@faixa-certa/shared';
import { AppException } from '../../common/errors/app.exception.js';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';

const eventInclude = {
  belt: { select: { id: true, name: true, colors: true } },
} satisfies Prisma.TimelineEventInclude;
type EventRow = Prisma.TimelineEventGetPayload<{ include: typeof eventInclude }>;

/**
 * Progresso, favoritos e linha do tempo do aluno.
 *
 * Sincronização: last-write-wins por item, comparando o `updatedAt` enviado
 * pelo aparelho com o `statusUpdatedAt` (progresso) ou `updatedAt` (favorito)
 * salvo. A aprovação do professor fica em outro campo e nunca é sobrescrita.
 */
@Injectable()
export class JourneyService {
  constructor(private readonly prisma: PrismaService) {}

  async sync(userId: string, input: SyncInput): Promise<SyncState> {
    const ids = [...new Set([...input.progress, ...input.favorites].map((i) => i.techniqueId))];
    // Ignora técnicas que não existem mais (removidas no CMS).
    const existing = new Set(
      (
        await this.prisma.technique.findMany({
          where: { id: { in: ids }, deletedAt: null },
          select: { id: true },
        })
      ).map((t) => t.id),
    );

    await this.prisma.$transaction(async (tx) => {
      if (input.progress.length > 0) {
        const current = new Map(
          (
            await tx.progressItem.findMany({
              where: { userId, techniqueId: { in: input.progress.map((p) => p.techniqueId) } },
              select: { techniqueId: true, statusUpdatedAt: true },
            })
          ).map((p) => [p.techniqueId, p.statusUpdatedAt]),
        );
        for (const item of input.progress) {
          if (!existing.has(item.techniqueId)) continue;
          const at = new Date(item.updatedAt);
          const saved = current.get(item.techniqueId);
          if (saved && saved >= at) continue;
          await tx.progressItem.upsert({
            where: { userId_techniqueId: { userId, techniqueId: item.techniqueId } },
            create: {
              userId,
              techniqueId: item.techniqueId,
              status: item.status,
              statusUpdatedAt: at,
            },
            update: { status: item.status, statusUpdatedAt: at, deletedAt: null },
          });
        }
      }

      if (input.favorites.length > 0) {
        const current = new Map(
          (
            await tx.favorite.findMany({
              where: { userId, techniqueId: { in: input.favorites.map((f) => f.techniqueId) } },
              select: { techniqueId: true, updatedAt: true },
            })
          ).map((f) => [f.techniqueId, f.updatedAt]),
        );
        for (const item of input.favorites) {
          if (!existing.has(item.techniqueId)) continue;
          const at = new Date(item.updatedAt);
          const saved = current.get(item.techniqueId);
          if (saved && saved >= at) continue;
          const deletedAt = item.favorite ? null : at;
          await tx.favorite.upsert({
            where: { userId_techniqueId: { userId, techniqueId: item.techniqueId } },
            create: { userId, techniqueId: item.techniqueId, updatedAt: at, deletedAt },
            update: { updatedAt: at, deletedAt },
          });
        }
      }
    });

    return this.state(userId);
  }

  async state(userId: string): Promise<SyncState> {
    const [progress, favorites] = await Promise.all([
      this.prisma.progressItem.findMany({
        where: { userId, deletedAt: null, technique: { deletedAt: null } },
        select: { techniqueId: true, status: true, statusUpdatedAt: true, approvedAt: true },
      }),
      this.prisma.favorite.findMany({
        where: { userId, deletedAt: null, technique: { deletedAt: null } },
        select: { techniqueId: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
      }),
    ]);
    return {
      progress: progress.map((p) => ({
        techniqueId: p.techniqueId,
        status: p.status,
        updatedAt: p.statusUpdatedAt.toISOString(),
        approvedAt: p.approvedAt?.toISOString() ?? null,
      })),
      favorites: favorites.map((f) => ({
        techniqueId: f.techniqueId,
        updatedAt: f.updatedAt.toISOString(),
      })),
      serverTime: new Date().toISOString(),
    };
  }

  // ---------------------------------------------------------------------------
  // Linha do tempo
  // ---------------------------------------------------------------------------

  async listTimeline(userId: string): Promise<TimelineEvent[]> {
    const rows = await this.prisma.timelineEvent.findMany({
      where: { userId, deletedAt: null },
      include: eventInclude,
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    });
    return rows.map(toEvent);
  }

  async createEvent(userId: string, input: TimelineEventInput): Promise<TimelineEvent> {
    await this.assertBelt(input.beltId);
    const row = await this.prisma.timelineEvent.create({
      data: {
        userId,
        type: input.type,
        date: new Date(`${input.date}T00:00:00Z`),
        title: input.title,
        description: input.description ?? null,
        beltId: input.type === 'GRADUATION' ? (input.beltId ?? null) : null,
        extra: jsonOrNull(input.extra),
      },
      include: eventInclude,
    });
    return toEvent(row);
  }

  async updateEvent(
    userId: string,
    id: string,
    input: TimelineEventUpdateInput,
  ): Promise<TimelineEvent> {
    await this.findEvent(userId, id);
    if (input.beltId) await this.assertBelt(input.beltId);
    const row = await this.prisma.timelineEvent.update({
      where: { id },
      data: {
        type: input.type,
        date: input.date ? new Date(`${input.date}T00:00:00Z`) : undefined,
        title: input.title,
        description: input.description,
        beltId: input.beltId,
        extra: input.extra === undefined ? undefined : jsonOrNull(input.extra),
      },
      include: eventInclude,
    });
    return toEvent(row);
  }

  async deleteEvent(userId: string, id: string): Promise<void> {
    await this.findEvent(userId, id);
    await this.prisma.timelineEvent.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  private async findEvent(userId: string, id: string) {
    const row = await this.prisma.timelineEvent.findFirst({
      where: { id, userId, deletedAt: null },
    });
    if (!row) throw AppException.notFound();
    return row;
  }

  private async assertBelt(beltId: string | null | undefined): Promise<void> {
    if (!beltId) return;
    const belt = await this.prisma.belt.findFirst({ where: { id: beltId, deletedAt: null } });
    if (!belt) throw AppException.badRequest('content.referenceNotFound');
  }
}

const jsonOrNull = (v: TimelineExtra | null | undefined) =>
  v ? (v as Prisma.InputJsonValue) : Prisma.DbNull;

function toEvent(e: EventRow): TimelineEvent {
  return {
    id: e.id,
    type: e.type,
    date: e.date.toISOString().slice(0, 10),
    title: e.title,
    description: e.description,
    belt: e.belt,
    extra: (e.extra as TimelineExtra | null) ?? null,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  };
}
