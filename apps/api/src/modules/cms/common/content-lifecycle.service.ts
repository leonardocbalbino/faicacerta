import { HttpStatus, Injectable } from '@nestjs/common';
import {
  canTransition,
  type ContentEntityType,
  type ContentVersionDetail,
  type ContentVersionSummary,
  type PublicationStatus,
} from '@faixa-certa/shared';
import type { AuthUser } from '../../../common/auth/auth-user.js';
import { AppException } from '../../../common/errors/app.exception.js';
import type { Prisma } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../../infra/prisma/prisma.service.js';
import { AuditService } from '../../audit/audit.service.js';

export interface ChangeRecord {
  entityType: ContentEntityType;
  entityId: string;
  status: PublicationStatus;
  snapshot: unknown;
  actor: AuthUser;
  /** Ação de auditoria, ex.: `technique.update`. */
  action: string;
  before?: unknown;
  comment?: string;
}

/**
 * Regras comuns do conteúdo versionado: fluxo de publicação, histórico de
 * versões (ContentVersion) e auditoria.
 */
@Injectable()
export class ContentLifecycleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  assertTransition(from: PublicationStatus, to: PublicationStatus, actor: AuthUser): void {
    if (!canTransition(from, to, actor.roles)) {
      throw new AppException(HttpStatus.CONFLICT, 'content.invalidTransition');
    }
  }

  /** Grava a nova versão e o log de auditoria. Devolve o número da versão. */
  async record(tx: Prisma.TransactionClient, change: ChangeRecord): Promise<number> {
    const last = await tx.contentVersion.findFirst({
      where: { entityType: change.entityType, entityId: change.entityId },
      orderBy: { version: 'desc' },
      select: { version: true },
    });
    const version = (last?.version ?? 0) + 1;
    await tx.contentVersion.create({
      data: {
        entityType: change.entityType,
        entityId: change.entityId,
        version,
        status: change.status,
        snapshot: toJson(change.snapshot),
        comment: change.comment ?? null,
        authorId: change.actor.id,
      },
    });
    await this.audit.record(
      {
        actorId: change.actor.id,
        action: change.action,
        entityType: change.entityType,
        entityId: change.entityId,
        before: change.before,
        after: change.snapshot,
      },
      tx,
    );
    return version;
  }

  async listVersions(
    entityType: ContentEntityType,
    entityId: string,
  ): Promise<ContentVersionSummary[]> {
    const rows = await this.prisma.contentVersion.findMany({
      where: { entityType, entityId },
      orderBy: { version: 'desc' },
      include: { author: { select: { id: true, name: true } } },
      take: 200,
    });
    return rows.map((v) => ({
      version: v.version,
      status: v.status,
      comment: v.comment,
      author: v.author,
      createdAt: v.createdAt.toISOString(),
    }));
  }

  async getVersion(
    entityType: ContentEntityType,
    entityId: string,
    version: number,
  ): Promise<ContentVersionDetail> {
    const v = await this.prisma.contentVersion.findUnique({
      where: { entityType_entityId_version: { entityType, entityId, version } },
      include: { author: { select: { id: true, name: true } } },
    });
    if (!v) throw AppException.notFound('content.versionNotFound');
    return {
      version: v.version,
      status: v.status,
      comment: v.comment,
      author: v.author,
      createdAt: v.createdAt.toISOString(),
      snapshot: v.snapshot,
    };
  }
}

function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
}

/** Paginação por cursor: busca `limit + 1` para saber se há próxima página. */
export function paginate<T extends { id: string }>(rows: T[], limit: number) {
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  return { items, nextCursor: hasMore ? (items.at(-1)?.id ?? null) : null };
}

export function cursorArgs(cursor: string | undefined): { cursor?: { id: string }; skip?: number } {
  return cursor ? { cursor: { id: cursor }, skip: 1 } : {};
}
