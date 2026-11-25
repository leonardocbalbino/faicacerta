import { z } from 'zod';
import { REQUIREMENT_TYPES } from '../enums.js';
import { richTextSchema } from './content.js';

// -----------------------------------------------------------------------------
// Catálogo público (rotas /v1/catalog/*): só conteúdo publicado, sem login.
// Usado pelo app mobile. As URLs de mídia já vêm prontas (CDN ou assinadas).
// -----------------------------------------------------------------------------

export const catalogCategorySchema = z.object({
  id: z.uuid(),
  slug: z.string(),
  name: z.string(),
  icon: z.string().nullable(),
  parent: z.object({ id: z.uuid(), name: z.string() }).nullable(),
});
export type CatalogCategory = z.infer<typeof catalogCategorySchema>;

export const catalogBeltSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  /** Hex; duas cores = faixa bicolor. */
  colors: z.array(z.string()),
  order: z.number().int(),
  minAge: z.number().int().nullable(),
  description: z.string().nullable(),
  techniqueCount: z.number().int(),
});
export type CatalogBelt = z.infer<typeof catalogBeltSchema>;

export const catalogProgramSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  federation: z.string().nullable(),
  description: z.string().nullable(),
  isBase: z.boolean(),
  belts: z.array(catalogBeltSchema),
});
export type CatalogProgram = z.infer<typeof catalogProgramSchema>;

export const catalogTechniqueItemSchema = z.object({
  id: z.uuid(),
  slug: z.string(),
  japaneseName: z.string(),
  japaneseScript: z.string().nullable(),
  translation: z.string(),
  category: catalogCategorySchema,
  thumbUrl: z.string().nullable(),
  /** Duração do vídeo principal, se houver. */
  videoDurationMs: z.number().int().nullable(),
});
export type CatalogTechniqueItem = z.infer<typeof catalogTechniqueItemSchema>;

export const catalogBeltDetailSchema = catalogBeltSchema.extend({
  program: z.object({ id: z.uuid(), name: z.string() }),
  requirements: z.array(
    z.object({
      type: z.enum(REQUIREMENT_TYPES),
      order: z.number().int(),
      technique: catalogTechniqueItemSchema,
    }),
  ),
});
export type CatalogBeltDetail = z.infer<typeof catalogBeltDetailSchema>;

export const catalogMediaSchema = z.object({
  type: z.enum(['VIDEO', 'IMAGE']),
  /** Versão para exibir (vídeo 720p ou imagem). */
  url: z.string(),
  /** Versão leve para download offline (vídeo 360p). */
  offlineUrl: z.string().nullable(),
  thumbUrl: z.string().nullable(),
  durationMs: z.number().int().nullable(),
  width: z.number().int().nullable(),
  height: z.number().int().nullable(),
  caption: z.string().nullable(),
});
export type CatalogMedia = z.infer<typeof catalogMediaSchema>;

export const catalogTechniqueSchema = catalogTechniqueItemSchema.extend({
  richContent: richTextSchema.nullable(),
  keyPoints: z.array(z.string()),
  commonMistakes: z.array(z.string()),
  examinerCriteria: z.string().nullable(),
  pronunciationAudioUrl: z.string().nullable(),
  video: catalogMediaSchema.nullable(),
  /** Vídeo no YouTube (usado quando não há vídeo próprio enviado). */
  youtube: z
    .object({ id: z.string(), url: z.string(), thumbUrl: z.string() })
    .nullable()
    .optional(),
  steps: z.array(catalogMediaSchema),
  gallery: z.array(catalogMediaSchema),
  related: z.array(catalogTechniqueItemSchema),
  belts: z.array(
    z.object({
      id: z.uuid(),
      name: z.string(),
      colors: z.array(z.string()),
      programId: z.uuid(),
    }),
  ),
  updatedAt: z.string(),
});
export type CatalogTechnique = z.infer<typeof catalogTechniqueSchema>;

export const catalogGlossaryTermSchema = z.object({
  id: z.uuid(),
  japanese: z.string(),
  kanji: z.string().nullable(),
  translation: z.string(),
  description: z.string().nullable(),
  category: z.object({ id: z.uuid(), name: z.string() }).nullable(),
  audioUrl: z.string().nullable(),
});
export type CatalogGlossaryTerm = z.infer<typeof catalogGlossaryTermSchema>;

export const catalogGlossaryQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  categoryId: z.uuid().optional(),
});
export type CatalogGlossaryQuery = z.infer<typeof catalogGlossaryQuerySchema>;

export const catalogSearchQuerySchema = z.object({
  q: z.string().trim().min(2).max(100),
});
export type CatalogSearchQuery = z.infer<typeof catalogSearchQuerySchema>;

export const catalogSearchResultSchema = z.object({
  techniques: z.array(catalogTechniqueItemSchema),
  glossary: z.array(catalogGlossaryTermSchema),
});
export type CatalogSearchResult = z.infer<typeof catalogSearchResultSchema>;
