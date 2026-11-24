import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import {
  Role,
  type CreateUploadInput,
  type Media as MediaDto,
  type MediaListQuery,
  type MediaPage,
  type MediaType,
  type UploadTicket,
} from '@faixa-certa/shared';
import type { AuthUser } from '../../common/auth/auth-user.js';
import { hasAnyRole } from '../../common/auth/roles.guard.js';
import { AppException } from '../../common/errors/app.exception.js';
import type { Media } from '../../generated/prisma/client.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { JobDispatcher } from '../../infra/queue/job-dispatcher.js';
import { StorageService } from '../../infra/storage/storage.service.js';
import { bucketFor, newOriginalKey } from './media-keys.js';
import { toMediaDto } from './media.mapper.js';

const isEditor = (user: AuthUser) => hasAnyRole(user.roles, [Role.CONTENT_EDITOR]);

/** Relações que impedem apagar uma mídia em uso. */
const USAGE_COUNTS = {
  userAvatars: true,
  techniquePronunciations: true,
  techniqueMedia: true,
  glossaryAudios: true,
  articleCovers: true,
  quizQuestions: true,
  quizOptions: true,
  timelineEventMedia: true,
  lessonItems: true,
  videoSubmissions: true,
  storeLogos: true,
  productImages: true,
  orderReceipts: true,
} as const;

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly jobs: JobDispatcher,
  ) {}

  /** 1º passo do upload: registra a mídia e devolve a URL pré-assinada. */
  async createUpload(user: AuthUser, input: CreateUploadInput): Promise<UploadTicket> {
    if (input.visibility === 'PUBLIC' && !isEditor(user)) {
      throw AppException.forbidden('media.publicRequiresEditor');
    }
    const media = await this.prisma.media.create({
      data: {
        type: input.type,
        visibility: input.visibility,
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
        originalKey: newOriginalKey(input.mimeType),
        ownerId: user.id,
        status: 'PENDING_UPLOAD',
      },
    });
    const upload = await this.storage.presignUpload(
      bucketFor(media.visibility),
      media.originalKey,
      media.mimeType,
      input.sizeBytes,
    );
    return {
      media: await this.toDto(media),
      upload: {
        method: 'PUT',
        url: upload.url,
        headers: upload.headers,
        expiresAt: upload.expiresAt.toISOString(),
      },
    };
  }

  /** 2º passo: o cliente avisa que terminou o envio; a mídia entra na fila. */
  async complete(user: AuthUser, id: string): Promise<MediaDto> {
    const media = await this.findOwnedOrEditable(user, id);
    if (media.status !== 'PENDING_UPLOAD') {
      throw new AppException(HttpStatus.CONFLICT, 'media.invalidState');
    }

    const bucket = bucketFor(media.visibility);
    const stored = await this.storage.head(bucket, media.originalKey);
    if (!stored) throw new AppException(HttpStatus.CONFLICT, 'media.notUploaded');

    const sizeOk = media.sizeBytes === null || BigInt(stored.sizeBytes) === media.sizeBytes;
    const typeOk = !stored.contentType || stored.contentType === media.mimeType;
    if (!sizeOk || !typeOk) {
      await this.storage.delete(bucket, [media.originalKey]).catch(() => undefined);
      throw AppException.badRequest('media.uploadMismatch');
    }

    await this.prisma.media.update({ where: { id }, data: { status: 'UPLOADED' } });
    await this.jobs.dispatch('media', { mediaId: id });
    return this.get(user, id);
  }

  async get(user: AuthUser | undefined, id: string): Promise<MediaDto> {
    const media = await this.prisma.media.findFirst({ where: { id, deletedAt: null } });
    if (!media) throw AppException.notFound('media.notFound');
    const canSeeAnyState = user && (media.ownerId === user.id || isEditor(user));
    const publiclyVisible = media.visibility === 'PUBLIC' && media.status === 'READY';
    if (!canSeeAnyState && !publiclyVisible) throw AppException.notFound('media.notFound');
    return this.toDto(media);
  }

  /** Biblioteca de mídia do CMS (só mídia pública, a do conteúdo base). */
  async list(query: MediaListQuery): Promise<MediaPage> {
    const rows = await this.prisma.media.findMany({
      where: {
        deletedAt: null,
        visibility: 'PUBLIC',
        type: query.type,
        status: query.status ?? { not: 'PENDING_UPLOAD' },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });
    const hasMore = rows.length > query.limit;
    const items = hasMore ? rows.slice(0, query.limit) : rows;
    return {
      items: await Promise.all(items.map((m) => this.toDto(m))),
      nextCursor: hasMore ? (items.at(-1)?.id ?? null) : null,
    };
  }

  async reprocess(id: string): Promise<MediaDto> {
    const media = await this.prisma.media.findFirst({ where: { id, deletedAt: null } });
    if (!media) throw AppException.notFound('media.notFound');
    if (!['FAILED', 'READY'].includes(media.status)) {
      throw new AppException(HttpStatus.CONFLICT, 'media.invalidState');
    }
    await this.prisma.media.update({ where: { id }, data: { status: 'UPLOADED' } });
    await this.jobs.dispatch('media', { mediaId: id });
    return this.toDto(await this.prisma.media.findUniqueOrThrow({ where: { id } }));
  }

  /** Remove (soft delete) e apaga os arquivos, se a mídia não estiver em uso. */
  async remove(id: string): Promise<void> {
    const media = await this.prisma.media.findFirst({
      where: { id, deletedAt: null },
      include: { _count: { select: USAGE_COUNTS } },
    });
    if (!media) throw AppException.notFound('media.notFound');
    const inUse = Object.values(media._count).some((n) => n > 0);
    if (inUse) throw AppException.conflict('media.inUse');

    await this.prisma.media.update({ where: { id }, data: { deletedAt: new Date() } });
    const keys = [media.originalKey, media.key720p, media.keyOffline, media.keyThumb].filter(
      (k): k is string => !!k,
    );
    await this.storage
      .delete(bucketFor(media.visibility), [...new Set(keys)])
      .catch((err) => this.logger.warn({ err, id }, 'falha ao apagar arquivos da mídia'));
  }

  /**
   * Confere se as mídias podem ser usadas no conteúdo base: existem, são
   * públicas e do tipo esperado. Devolve os registros para checagens extras.
   */
  async assertAttachable(ids: string[], allowed?: MediaType[]): Promise<Media[]> {
    const unique = [...new Set(ids)];
    if (!unique.length) return [];
    const rows = await this.prisma.media.findMany({
      where: { id: { in: unique }, deletedAt: null },
    });
    if (rows.length !== unique.length) throw AppException.badRequest('content.referenceNotFound');
    for (const m of rows) {
      if (m.visibility !== 'PUBLIC') throw AppException.badRequest('media.mustBePublic');
      if (allowed && !allowed.includes(m.type)) throw AppException.badRequest('media.wrongType');
    }
    return rows;
  }

  toDto(media: Media): Promise<MediaDto> {
    return toMediaDto(media, this.storage);
  }

  private async findOwnedOrEditable(user: AuthUser, id: string): Promise<Media> {
    const media = await this.prisma.media.findFirst({ where: { id, deletedAt: null } });
    if (!media || (media.ownerId !== user.id && !isEditor(user))) {
      throw AppException.notFound('media.notFound');
    }
    return media;
  }
}
