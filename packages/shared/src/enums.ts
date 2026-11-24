/**
 * Enums espelhados do Prisma para uso no app e no painel, sem depender do
 * client gerado. Um teste na API garante que os valores continuam iguais.
 */
export const Role = {
  USER: 'USER',
  CONTENT_EDITOR: 'CONTENT_EDITOR',
  ADMIN: 'ADMIN',
} as const;
export type Role = (typeof Role)[keyof typeof Role];
export const ROLES = Object.values(Role) as [Role, ...Role[]];

export const AuthProviderType = {
  EMAIL: 'EMAIL',
  GOOGLE: 'GOOGLE',
  APPLE: 'APPLE',
} as const;
export type AuthProviderType = (typeof AuthProviderType)[keyof typeof AuthProviderType];
export const AUTH_PROVIDER_TYPES = Object.values(AuthProviderType) as [
  AuthProviderType,
  ...AuthProviderType[],
];

export const PublicationStatus = {
  DRAFT: 'DRAFT',
  REVIEW: 'REVIEW',
  PUBLISHED: 'PUBLISHED',
  ARCHIVED: 'ARCHIVED',
} as const;
export type PublicationStatus = (typeof PublicationStatus)[keyof typeof PublicationStatus];
export const PUBLICATION_STATUSES = Object.values(PublicationStatus) as [
  PublicationStatus,
  ...PublicationStatus[],
];

export const MediaType = {
  VIDEO: 'VIDEO',
  IMAGE: 'IMAGE',
  AUDIO: 'AUDIO',
  DOCUMENT: 'DOCUMENT',
} as const;
export type MediaType = (typeof MediaType)[keyof typeof MediaType];
export const MEDIA_TYPES = Object.values(MediaType) as [MediaType, ...MediaType[]];

export const MediaStatus = {
  PENDING_UPLOAD: 'PENDING_UPLOAD',
  UPLOADED: 'UPLOADED',
  PROCESSING: 'PROCESSING',
  READY: 'READY',
  FAILED: 'FAILED',
} as const;
export type MediaStatus = (typeof MediaStatus)[keyof typeof MediaStatus];
export const MEDIA_STATUSES = Object.values(MediaStatus) as [MediaStatus, ...MediaStatus[]];

export const MediaVisibility = {
  PUBLIC: 'PUBLIC',
  PRIVATE: 'PRIVATE',
} as const;
export type MediaVisibility = (typeof MediaVisibility)[keyof typeof MediaVisibility];
export const MEDIA_VISIBILITIES = Object.values(MediaVisibility) as [
  MediaVisibility,
  ...MediaVisibility[],
];

export const TechniqueMediaRole = {
  MAIN_VIDEO: 'MAIN_VIDEO',
  STEP: 'STEP',
  GALLERY: 'GALLERY',
} as const;
export type TechniqueMediaRole = (typeof TechniqueMediaRole)[keyof typeof TechniqueMediaRole];
export const TECHNIQUE_MEDIA_ROLES = Object.values(TechniqueMediaRole) as [
  TechniqueMediaRole,
  ...TechniqueMediaRole[],
];

export const RequirementType = {
  MANDATORY: 'MANDATORY',
  OPTIONAL: 'OPTIONAL',
} as const;
export type RequirementType = (typeof RequirementType)[keyof typeof RequirementType];
export const REQUIREMENT_TYPES = Object.values(RequirementType) as [
  RequirementType,
  ...RequirementType[],
];

export const QuizQuestionType = {
  MULTIPLE_CHOICE: 'MULTIPLE_CHOICE',
  TRUE_FALSE: 'TRUE_FALSE',
  IDENTIFY_BY_VIDEO: 'IDENTIFY_BY_VIDEO',
  IDENTIFY_BY_IMAGE: 'IDENTIFY_BY_IMAGE',
} as const;
export type QuizQuestionType = (typeof QuizQuestionType)[keyof typeof QuizQuestionType];
export const QUIZ_QUESTION_TYPES = Object.values(QuizQuestionType) as [
  QuizQuestionType,
  ...QuizQuestionType[],
];

export const ContentEntityType = {
  PROGRAM: 'PROGRAM',
  BELT: 'BELT',
  CATEGORY: 'CATEGORY',
  TECHNIQUE: 'TECHNIQUE',
  GLOSSARY_TERM: 'GLOSSARY_TERM',
  QUIZ_QUESTION: 'QUIZ_QUESTION',
  ARTICLE: 'ARTICLE',
} as const;
export type ContentEntityType = (typeof ContentEntityType)[keyof typeof ContentEntityType];

export const EntitlementType = {
  NO_ADS: 'NO_ADS',
  PRO: 'PRO',
} as const;
export type EntitlementType = (typeof EntitlementType)[keyof typeof EntitlementType];

export const EntitlementSource = {
  PURCHASE: 'PURCHASE',
  SUBSCRIPTION: 'SUBSCRIPTION',
  ADMIN_GRANT: 'ADMIN_GRANT',
  CLASS_MEMBERSHIP: 'CLASS_MEMBERSHIP',
} as const;
export type EntitlementSource = (typeof EntitlementSource)[keyof typeof EntitlementSource];

export const PlanCode = {
  NO_ADS: 'NO_ADS',
  PRO_MONTHLY: 'PRO_MONTHLY',
  PRO_YEARLY: 'PRO_YEARLY',
} as const;
export type PlanCode = (typeof PlanCode)[keyof typeof PlanCode];
