import type { Media as MediaDto } from '@faixa-certa/shared';
import type { Media } from '../../generated/prisma/client.js';
import type { StorageService } from '../../infra/storage/storage.service.js';
import { bucketFor } from './media-keys.js';

/** Monta o DTO com URLs prontas (CDN para pública, assinada para privada). */
export async function toMediaDto(media: Media, storage: StorageService): Promise<MediaDto> {
  const bucket = bucketFor(media.visibility);
  const url = (key: string | null) => (key ? storage.readUrl(bucket, key) : Promise.resolve(null));
  const ready = media.status === 'READY';

  const [original, display, offline, thumb] = await Promise.all([
    media.status === 'PENDING_UPLOAD' ? null : url(media.originalKey),
    ready ? url(media.key720p) : null,
    ready ? url(media.keyOffline) : null,
    ready ? url(media.keyThumb) : null,
  ]);

  return {
    id: media.id,
    type: media.type,
    status: media.status,
    visibility: media.visibility,
    mimeType: media.mimeType,
    sizeBytes: media.sizeBytes === null ? null : Number(media.sizeBytes),
    offlineSizeBytes: media.offlineSizeBytes === null ? null : Number(media.offlineSizeBytes),
    durationMs: media.durationMs,
    width: media.width,
    height: media.height,
    processingError: media.processingError,
    urls: { original, display, offline, thumb },
    createdAt: media.createdAt.toISOString(),
    updatedAt: media.updatedAt.toISOString(),
  };
}
