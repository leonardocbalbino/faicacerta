import { z } from 'zod';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../constants.js';
import {
  PUBLICATION_STATUSES,
  QUIZ_QUESTION_TYPES,
  REQUIREMENT_TYPES,
  TECHNIQUE_MEDIA_ROLES,
} from '../enums.js';
import { parseYoutubeId } from '../utils/youtube.js';
import { mediaSchema } from './media.js';

// -----------------------------------------------------------------------------
// Blocos reutilizáveis
// -----------------------------------------------------------------------------

export const slugSchema = z
  .string()
  .trim()
  .min(2)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    error: 'Use só letras minúsculas, números e hífens (ex.: o-soto-gari).',
  });

export const hexColorSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, { error: 'Cor inválida (use #RRGGBB).' });

/** Documento do Tiptap (ProseMirror JSON). A estrutura interna é validada pelo editor. */
export const richTextSchema = z.looseObject({
  type: z.literal('doc'),
  content: z.array(z.unknown()).optional(),
});
export type RichText = z.infer<typeof richTextSchema>;

const optionalText = (max: number) => z.string().trim().max(max).nullable().optional();
const textList = z.array(z.string().trim().min(1).max(300)).max(20);

export const publicationStatusSchema = z.enum(PUBLICATION_STATUSES);

export const statusChangeSchema = z.object({
  status: publicationStatusSchema,
  comment: z.string().trim().max(500).optional(),
});
export type StatusChangeInput = z.infer<typeof statusChangeSchema>;

export const reorderSchema = z.object({
  ids: z.array(z.uuid()).min(1).max(500),
});
export type ReorderInput = z.infer<typeof reorderSchema>;

export const contentListQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  status: publicationStatusSchema.optional(),
  categoryId: z.uuid().optional(),
  cursor: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});
export type ContentListQuery = z.infer<typeof contentListQuerySchema>;

export function pageSchema<T extends z.ZodType>(item: T) {
  return z.object({ items: z.array(item), nextCursor: z.string().nullable() });
}

export const versionSchema = z.object({
  version: z.number().int(),
  status: publicationStatusSchema,
  comment: z.string().nullable(),
  author: z.object({ id: z.uuid(), name: z.string() }).nullable(),
  createdAt: z.string(),
});
export type ContentVersionSummary = z.infer<typeof versionSchema>;

export const versionDetailSchema = versionSchema.extend({ snapshot: z.unknown() });
export type ContentVersionDetail = z.infer<typeof versionDetailSchema>;

// -----------------------------------------------------------------------------
// Categorias
// -----------------------------------------------------------------------------

export const categoryInputSchema = z.object({
  parentId: z.uuid().nullable().optional(),
  slug: slugSchema,
  name: z.string().trim().min(2).max(80),
  icon: optionalText(50),
  order: z.number().int().min(0).optional(),
});
export type CategoryInput = z.infer<typeof categoryInputSchema>;

export const categorySchema = z.object({
  id: z.uuid(),
  parentId: z.uuid().nullable(),
  slug: z.string(),
  name: z.string(),
  icon: z.string().nullable(),
  order: z.number().int(),
  techniqueCount: z.number().int(),
});
export type Category = z.infer<typeof categorySchema>;

// -----------------------------------------------------------------------------
// Programas e faixas
// -----------------------------------------------------------------------------

export const programInputSchema = z.object({
  name: z.string().trim().min(2).max(120),
  federation: optionalText(80),
  description: optionalText(1000),
});
export type ProgramInput = z.infer<typeof programInputSchema>;

export const programSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  federation: z.string().nullable(),
  description: z.string().nullable(),
  isBase: z.boolean(),
  status: publicationStatusSchema,
  beltCount: z.number().int(),
  updatedAt: z.string(),
});
export type Program = z.infer<typeof programSchema>;

export const beltInputSchema = z.object({
  name: z.string().trim().min(2).max(60),
  colors: z.array(hexColorSchema).min(1).max(2),
  minAge: z.number().int().min(3).max(99).nullable().optional(),
  description: optionalText(1000),
});
export type BeltInput = z.infer<typeof beltInputSchema>;

export const beltSchema = z.object({
  id: z.uuid(),
  programId: z.uuid(),
  name: z.string(),
  colors: z.array(z.string()),
  order: z.number().int(),
  minAge: z.number().int().nullable(),
  description: z.string().nullable(),
  requirementCount: z.number().int(),
});
export type Belt = z.infer<typeof beltSchema>;

export const programDetailSchema = programSchema.extend({ belts: z.array(beltSchema) });
export type ProgramDetail = z.infer<typeof programDetailSchema>;

export const beltRequirementsInputSchema = z.object({
  /** A ordem do array é a ordem exibida no checklist. */
  items: z
    .array(z.object({ techniqueId: z.uuid(), type: z.enum(REQUIREMENT_TYPES) }))
    .max(200)
    .refine((items) => new Set(items.map((i) => i.techniqueId)).size === items.length, {
      error: 'Técnica repetida na lista.',
    }),
});
export type BeltRequirementsInput = z.infer<typeof beltRequirementsInputSchema>;

export const techniqueRefSchema = z.object({
  id: z.uuid(),
  slug: z.string(),
  japaneseName: z.string(),
  translation: z.string(),
  status: publicationStatusSchema,
});
export type TechniqueRef = z.infer<typeof techniqueRefSchema>;

export const beltRequirementSchema = z.object({
  type: z.enum(REQUIREMENT_TYPES),
  order: z.number().int(),
  technique: techniqueRefSchema,
});
export type BeltRequirement = z.infer<typeof beltRequirementSchema>;

// -----------------------------------------------------------------------------
// Técnicas
// -----------------------------------------------------------------------------

export const techniqueInputSchema = z.object({
  slug: slugSchema,
  categoryId: z.uuid(),
  japaneseName: z.string().trim().min(2).max(80),
  japaneseScript: optionalText(40),
  translation: z.string().trim().min(2).max(160),
  pronunciationAudioId: z.uuid().nullable().optional(),
  richContent: richTextSchema.nullable().optional(),
  keyPoints: textList.default([]),
  commonMistakes: textList.default([]),
  examinerCriteria: optionalText(2000),
  /** Link do vídeo no YouTube (ex.: canal oficial da Kodokan). Vazio remove. */
  youtubeUrl: z
    .string()
    .trim()
    .max(300)
    .nullable()
    .optional()
    .transform((v) => (v === '' ? null : v))
    .refine((v) => v == null || parseYoutubeId(v) !== null, {
      error: 'Link do YouTube inválido.',
    }),
});
export type TechniqueInput = z.infer<typeof techniqueInputSchema>;

export const techniqueUpdateSchema = techniqueInputSchema.partial().extend({
  comment: z.string().trim().max(500).optional(),
});
export type TechniqueUpdateInput = z.infer<typeof techniqueUpdateSchema>;

export const techniqueMediaInputSchema = z.object({
  /** A ordem do array define a ordem de exibição (passo a passo). */
  items: z
    .array(
      z.object({
        mediaId: z.uuid(),
        role: z.enum(TECHNIQUE_MEDIA_ROLES),
        caption: z.string().trim().max(300).nullable().optional(),
      }),
    )
    .max(40)
    .refine((items) => items.filter((i) => i.role === 'MAIN_VIDEO').length <= 1, {
      error: 'Só pode haver um vídeo principal.',
    })
    .refine((items) => new Set(items.map((i) => i.mediaId)).size === items.length, {
      error: 'Mídia repetida na lista.',
    }),
});
export type TechniqueMediaInput = z.infer<typeof techniqueMediaInputSchema>;

export const techniqueRelatedInputSchema = z.object({
  ids: z.array(z.uuid()).max(20),
});
export type TechniqueRelatedInput = z.infer<typeof techniqueRelatedInputSchema>;

export const techniqueListItemSchema = techniqueRefSchema.extend({
  japaneseScript: z.string().nullable(),
  category: z.object({ id: z.uuid(), name: z.string() }),
  version: z.number().int(),
  thumbUrl: z.string().nullable(),
  updatedAt: z.string(),
});
export type TechniqueListItem = z.infer<typeof techniqueListItemSchema>;

export const techniquePageSchema = pageSchema(techniqueListItemSchema);
export type TechniquePage = z.infer<typeof techniquePageSchema>;

export const techniqueDetailSchema = techniqueListItemSchema.extend({
  categoryId: z.uuid(),
  richContent: richTextSchema.nullable(),
  keyPoints: z.array(z.string()),
  commonMistakes: z.array(z.string()),
  examinerCriteria: z.string().nullable(),
  youtubeUrl: z.string().nullable(),
  publishedAt: z.string().nullable(),
  pronunciationAudio: mediaSchema.nullable(),
  media: z.array(
    z.object({
      role: z.enum(TECHNIQUE_MEDIA_ROLES),
      order: z.number().int(),
      caption: z.string().nullable(),
      media: mediaSchema,
    }),
  ),
  related: z.array(techniqueRefSchema),
  belts: z.array(z.object({ id: z.uuid(), name: z.string(), programName: z.string() })),
});
export type TechniqueDetail = z.infer<typeof techniqueDetailSchema>;

// -----------------------------------------------------------------------------
// Glossário
// -----------------------------------------------------------------------------

export const glossaryTermInputSchema = z.object({
  japanese: z.string().trim().min(1).max(80),
  kanji: optionalText(40),
  translation: z.string().trim().min(1).max(160),
  description: optionalText(1000),
  categoryId: z.uuid().nullable().optional(),
  audioId: z.uuid().nullable().optional(),
});
export type GlossaryTermInput = z.infer<typeof glossaryTermInputSchema>;

export const glossaryTermUpdateSchema = glossaryTermInputSchema.partial().extend({
  comment: z.string().trim().max(500).optional(),
});
export type GlossaryTermUpdateInput = z.infer<typeof glossaryTermUpdateSchema>;

export const glossaryTermSchema = z.object({
  id: z.uuid(),
  japanese: z.string(),
  kanji: z.string().nullable(),
  translation: z.string(),
  description: z.string().nullable(),
  categoryId: z.uuid().nullable(),
  status: publicationStatusSchema,
  audio: mediaSchema.nullable(),
  updatedAt: z.string(),
});
export type GlossaryTerm = z.infer<typeof glossaryTermSchema>;
export const glossaryPageSchema = pageSchema(glossaryTermSchema);

// -----------------------------------------------------------------------------
// Quiz
// -----------------------------------------------------------------------------

export const quizOptionInputSchema = z.object({
  text: z.string().trim().min(1).max(300),
  mediaId: z.uuid().nullable().optional(),
  isCorrect: z.boolean(),
});

export const quizQuestionInputSchema = z
  .object({
    type: z.enum(QUIZ_QUESTION_TYPES),
    prompt: z.string().trim().min(5).max(500),
    explanation: optionalText(1000),
    beltId: z.uuid().nullable().optional(),
    techniqueId: z.uuid().nullable().optional(),
    mediaId: z.uuid().nullable().optional(),
    difficulty: z.number().int().min(1).max(5).default(1),
    options: z.array(quizOptionInputSchema).min(2).max(6),
  })
  .superRefine((q, ctx) => {
    const correct = q.options.filter((o) => o.isCorrect).length;
    if (correct !== 1) {
      ctx.addIssue({
        code: 'custom',
        path: ['options'],
        message: 'Marque exatamente uma resposta certa.',
      });
    }
    if (q.type === 'TRUE_FALSE' && q.options.length !== 2) {
      ctx.addIssue({
        code: 'custom',
        path: ['options'],
        message: 'Verdadeiro ou falso tem duas opções.',
      });
    }
    if ((q.type === 'IDENTIFY_BY_VIDEO' || q.type === 'IDENTIFY_BY_IMAGE') && !q.mediaId) {
      ctx.addIssue({
        code: 'custom',
        path: ['mediaId'],
        message: 'Escolha o vídeo ou a foto da pergunta.',
      });
    }
  });
export type QuizQuestionInput = z.infer<typeof quizQuestionInputSchema>;

export const quizQuestionSchema = z.object({
  id: z.uuid(),
  type: z.enum(QUIZ_QUESTION_TYPES),
  prompt: z.string(),
  explanation: z.string().nullable(),
  beltId: z.uuid().nullable(),
  techniqueId: z.uuid().nullable(),
  difficulty: z.number().int(),
  status: publicationStatusSchema,
  media: mediaSchema.nullable(),
  options: z.array(
    z.object({
      id: z.uuid(),
      text: z.string(),
      isCorrect: z.boolean(),
      order: z.number().int(),
      media: mediaSchema.nullable(),
    }),
  ),
  updatedAt: z.string(),
});
export type QuizQuestion = z.infer<typeof quizQuestionSchema>;
export const quizPageSchema = pageSchema(quizQuestionSchema);

export const quizListQuerySchema = contentListQuerySchema.omit({ categoryId: true }).extend({
  beltId: z.uuid().optional(),
});
export type QuizListQuery = z.infer<typeof quizListQuerySchema>;

// -----------------------------------------------------------------------------
// Artigos (história, etiqueta, regras)
// -----------------------------------------------------------------------------

export const articleInputSchema = z.object({
  categoryId: z.uuid(),
  slug: slugSchema,
  title: z.string().trim().min(2).max(160),
  richContent: richTextSchema,
  coverMediaId: z.uuid().nullable().optional(),
  order: z.number().int().min(0).optional(),
});
export type ArticleInput = z.infer<typeof articleInputSchema>;

export const articleUpdateSchema = articleInputSchema.partial().extend({
  comment: z.string().trim().max(500).optional(),
});
export type ArticleUpdateInput = z.infer<typeof articleUpdateSchema>;

export const articleSchema = z.object({
  id: z.uuid(),
  categoryId: z.uuid(),
  slug: z.string(),
  title: z.string(),
  richContent: richTextSchema,
  cover: mediaSchema.nullable(),
  order: z.number().int(),
  status: publicationStatusSchema,
  publishedAt: z.string().nullable(),
  updatedAt: z.string(),
});
export type Article = z.infer<typeof articleSchema>;
export const articlePageSchema = pageSchema(articleSchema);
