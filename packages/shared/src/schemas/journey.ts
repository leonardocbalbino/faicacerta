import { z } from 'zod';
import { NAME_MAX_LENGTH } from '../constants.js';
import { PROGRESS_STATUSES, TIMELINE_EVENT_TYPES } from '../enums.js';
import { personNameSchema } from './auth.js';
import { catalogTechniqueItemSchema } from './catalog.js';

// -----------------------------------------------------------------------------
// Perfil do aluno (PATCH /v1/me)
// -----------------------------------------------------------------------------

export const profileUpdateSchema = z
  .object({
    name: personNameSchema,
    academyName: z.string().trim().max(NAME_MAX_LENGTH).nullable(),
    teacherName: z.string().trim().max(NAME_MAX_LENGTH).nullable(),
    programId: z.uuid().nullable(),
    currentBeltId: z.uuid().nullable(),
  })
  .partial();
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

export const accountDeleteSchema = z.object({
  /** Confirmação explícita digitada pelo usuário no app. */
  confirm: z.literal('EXCLUIR', { error: 'Digite EXCLUIR para confirmar.' }),
});
export type AccountDeleteInput = z.infer<typeof accountDeleteSchema>;

// -----------------------------------------------------------------------------
// Sincronização de progresso e favoritos (POST /v1/me/sync)
// Last-write-wins por item: vale o `updatedAt` mais recente (relógio do aparelho).
// -----------------------------------------------------------------------------

const clientTimestamp = z.iso.datetime({ offset: true });

export const syncInputSchema = z.object({
  progress: z
    .array(
      z.object({
        techniqueId: z.uuid(),
        status: z.enum(PROGRESS_STATUSES),
        updatedAt: clientTimestamp,
      }),
    )
    .max(2000)
    .default([]),
  favorites: z
    .array(
      z.object({
        techniqueId: z.uuid(),
        favorite: z.boolean(),
        updatedAt: clientTimestamp,
      }),
    )
    .max(2000)
    .default([]),
});
export type SyncInput = z.infer<typeof syncInputSchema>;

export const syncStateSchema = z.object({
  progress: z.array(
    z.object({
      techniqueId: z.uuid(),
      status: z.enum(PROGRESS_STATUSES),
      updatedAt: z.string(),
      /** Aprovação do professor (Etapa 7); o aluno não altera. */
      approvedAt: z.string().nullable(),
    }),
  ),
  favorites: z.array(z.object({ techniqueId: z.uuid(), updatedAt: z.string() })),
  serverTime: z.string(),
});
export type SyncState = z.infer<typeof syncStateSchema>;

// -----------------------------------------------------------------------------
// Linha do tempo (Minha jornada)
// -----------------------------------------------------------------------------

export const MEDALS = ['GOLD', 'SILVER', 'BRONZE'] as const;
export type Medal = (typeof MEDALS)[number];

/** Dados extras por tipo: competição (medalha, categoria, lutas), academia (de/para). */
export const timelineExtraSchema = z
  .object({
    medal: z.enum(MEDALS).nullable(),
    category: z.string().trim().max(80).nullable(),
    fights: z.number().int().min(0).max(50).nullable(),
    fromAcademy: z.string().trim().max(120).nullable(),
    toAcademy: z.string().trim().max(120).nullable(),
  })
  .partial();
export type TimelineExtra = z.infer<typeof timelineExtraSchema>;

export const timelineEventInputSchema = z.object({
  type: z.enum(TIMELINE_EVENT_TYPES),
  date: z.iso.date({ error: 'Data inválida (use AAAA-MM-DD).' }),
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1000).nullable().optional(),
  /** Faixa conquistada (graduação). */
  beltId: z.uuid().nullable().optional(),
  extra: timelineExtraSchema.nullable().optional(),
});
export type TimelineEventInput = z.infer<typeof timelineEventInputSchema>;

export const timelineEventUpdateSchema = timelineEventInputSchema.partial();
export type TimelineEventUpdateInput = z.infer<typeof timelineEventUpdateSchema>;

export const timelineEventSchema = z.object({
  id: z.uuid(),
  type: z.enum(TIMELINE_EVENT_TYPES),
  date: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  belt: z.object({ id: z.uuid(), name: z.string(), colors: z.array(z.string()) }).nullable(),
  extra: timelineExtraSchema.nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type TimelineEvent = z.infer<typeof timelineEventSchema>;

// -----------------------------------------------------------------------------
// Técnicas por id (favoritos vindos de outro aparelho)
// -----------------------------------------------------------------------------

export const catalogTechniquesByIdQuerySchema = z.object({
  ids: z
    .string()
    .transform((v) => v.split(',').filter(Boolean))
    .pipe(z.array(z.uuid()).min(1).max(200)),
});
export type CatalogTechniquesByIdQuery = z.infer<typeof catalogTechniquesByIdQuerySchema>;

export const catalogTechniqueListSchema = z.array(catalogTechniqueItemSchema);
