import { z } from 'zod';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../constants.js';
import { MEDIA_STATUSES, MEDIA_TYPES, MEDIA_VISIBILITIES, type MediaType } from '../enums.js';

const MB = 1024 * 1024;

/** Tipos e tamanhos aceitos por tipo de mídia. A API e o painel usam a mesma regra. */
export const MEDIA_RULES: Record<MediaType, { maxBytes: number; mimeTypes: string[] }> = {
  VIDEO: { maxBytes: 500 * MB, mimeTypes: ['video/mp4', 'video/quicktime', 'video/webm'] },
  IMAGE: { maxBytes: 15 * MB, mimeTypes: ['image/jpeg', 'image/png', 'image/webp'] },
  AUDIO: {
    maxBytes: 10 * MB,
    mimeTypes: ['audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/aac', 'audio/wav', 'audio/webm'],
  },
  DOCUMENT: { maxBytes: 10 * MB, mimeTypes: ['application/pdf'] },
};

/** Descobre o tipo de mídia pelo MIME, ou undefined se não for aceito. */
export function mediaTypeForMime(mimeType: string): MediaType | undefined {
  return (Object.keys(MEDIA_RULES) as MediaType[]).find((t) =>
    MEDIA_RULES[t].mimeTypes.includes(mimeType),
  );
}

export const createUploadSchema = z
  .object({
    type: z.enum(MEDIA_TYPES),
    mimeType: z.string().min(3).max(100),
    sizeBytes: z.number().int().positive(),
    filename: z.string().trim().min(1).max(200),
    visibility: z.enum(MEDIA_VISIBILITIES).default('PRIVATE'),
  })
  .superRefine((v, ctx) => {
    const rule = MEDIA_RULES[v.type];
    if (!rule.mimeTypes.includes(v.mimeType)) {
      ctx.addIssue({
        code: 'custom',
        path: ['mimeType'],
        message: `Formato não aceito para ${v.type}. Use: ${rule.mimeTypes.join(', ')}.`,
      });
    }
    if (v.sizeBytes > rule.maxBytes) {
      ctx.addIssue({
        code: 'custom',
        path: ['sizeBytes'],
        message: `Arquivo grande demais. Limite: ${Math.round(rule.maxBytes / MB)} MB.`,
      });
    }
  });
export type CreateUploadInput = z.infer<typeof createUploadSchema>;

export const mediaSchema = z.object({
  id: z.uuid(),
  type: z.enum(MEDIA_TYPES),
  status: z.enum(MEDIA_STATUSES),
  visibility: z.enum(MEDIA_VISIBILITIES),
  mimeType: z.string(),
  sizeBytes: z.number().nullable(),
  offlineSizeBytes: z.number().nullable(),
  durationMs: z.number().nullable(),
  width: z.number().nullable(),
  height: z.number().nullable(),
  processingError: z.string().nullable(),
  urls: z.object({
    /** Arquivo enviado. */
    original: z.string().nullable(),
    /** Versão para exibir: vídeo 720p, imagem redimensionada. */
    display: z.string().nullable(),
    /** Versão leve para download offline (vídeo 360p, áudio AAC). */
    offline: z.string().nullable(),
    thumb: z.string().nullable(),
  }),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Media = z.infer<typeof mediaSchema>;

export const uploadTicketSchema = z.object({
  media: mediaSchema,
  upload: z.object({
    method: z.literal('PUT'),
    url: z.string(),
    /** Cabeçalhos que o cliente PRECISA enviar no PUT (fazem parte da assinatura). */
    headers: z.record(z.string(), z.string()),
    expiresAt: z.string(),
  }),
});
export type UploadTicket = z.infer<typeof uploadTicketSchema>;

export const mediaListQuerySchema = z.object({
  type: z.enum(MEDIA_TYPES).optional(),
  status: z.enum(MEDIA_STATUSES).optional(),
  cursor: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});
export type MediaListQuery = z.infer<typeof mediaListQuerySchema>;

export const mediaPageSchema = z.object({
  items: z.array(mediaSchema),
  nextCursor: z.string().nullable(),
});
export type MediaPage = z.infer<typeof mediaPageSchema>;
