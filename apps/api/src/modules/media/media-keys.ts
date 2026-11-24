import { randomUUID } from 'node:crypto';
import type { MediaVisibility } from '../../generated/prisma/client.js';
import type { BucketKind } from '../../infra/storage/storage.service.js';

const EXT_BY_MIME: Record<string, string> = {
  'video/mp4': '.mp4',
  'video/quicktime': '.mov',
  'video/webm': '.webm',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'audio/mpeg': '.mp3',
  'audio/mp4': '.m4a',
  'audio/x-m4a': '.m4a',
  'audio/aac': '.aac',
  'audio/wav': '.wav',
  'audio/webm': '.weba',
  'application/pdf': '.pdf',
};

export function extensionFor(mimeType: string): string {
  return EXT_BY_MIME[mimeType] ?? '';
}

/**
 * Cada mídia ganha uma pasta própria com nome aleatório (não adivinhável),
 * e as versões processadas ficam ao lado do original.
 */
export function newOriginalKey(mimeType: string): string {
  return `media/${randomUUID()}/original${extensionFor(mimeType)}`;
}

export function derivedKey(originalKey: string, name: string): string {
  return `${originalKey.slice(0, originalKey.lastIndexOf('/'))}/${name}`;
}

export function bucketFor(visibility: MediaVisibility): BucketKind {
  return visibility === 'PUBLIC' ? 'public' : 'private';
}
