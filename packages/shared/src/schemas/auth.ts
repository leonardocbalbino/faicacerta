import { z } from 'zod';
import {
  NAME_MAX_LENGTH,
  NAME_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from '../constants.js';
import { AUTH_PROVIDER_TYPES, ROLES } from '../enums.js';
import { ageOn, isMinor } from '../utils/age.js';

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .pipe(z.email({ error: 'E-mail inválido.' }));

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, {
    error: `A senha precisa ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`,
  })
  .max(PASSWORD_MAX_LENGTH)
  .refine((v) => /\p{L}/u.test(v) && /\d/.test(v), {
    error: 'A senha precisa ter letras e números.',
  });

export const personNameSchema = z.string().trim().min(NAME_MIN_LENGTH).max(NAME_MAX_LENGTH);

export const birthDateSchema = z.iso
  .date({ error: 'Data de nascimento inválida (use AAAA-MM-DD).' })
  .refine(
    (v) => {
      const age = ageOn(v);
      return age >= 3 && age <= 120;
    },
    { error: 'Data de nascimento fora do intervalo aceito.' },
  );

export const guardianSchema = z.object({
  name: personNameSchema,
  email: emailSchema,
  /** O responsável declarou consentimento (marcado no cadastro). */
  consent: z.literal(true, { error: 'É preciso o consentimento do responsável.' }),
});

const deviceNameSchema = z.string().trim().max(100).optional();

export const registerSchema = z
  .object({
    name: personNameSchema,
    email: emailSchema,
    password: passwordSchema,
    birthDate: birthDateSchema,
    guardian: guardianSchema.optional(),
    deviceName: deviceNameSchema,
  })
  .superRefine((data, ctx) => {
    if (isMinor(data.birthDate) && !data.guardian) {
      ctx.addIssue({
        code: 'custom',
        path: ['guardian'],
        message: 'Menores de 18 anos precisam informar um responsável e o consentimento dele.',
      });
    }
  });
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(PASSWORD_MAX_LENGTH),
  deviceName: deviceNameSchema,
});
export type LoginInput = z.infer<typeof loginSchema>;

export const refreshSchema = z.object({
  refreshToken: z.string().min(20).max(200),
});
export type RefreshInput = z.infer<typeof refreshSchema>;

export const logoutSchema = refreshSchema;
export type LogoutInput = RefreshInput;

export const googleLoginSchema = z.object({
  idToken: z.string().min(20),
  deviceName: deviceNameSchema,
});
export type GoogleLoginInput = z.infer<typeof googleLoginSchema>;

export const appleLoginSchema = z.object({
  identityToken: z.string().min(20),
  /** Nonce em texto puro enviado ao Apple (o token traz o SHA-256 dele). */
  nonce: z.string().min(8).max(200).optional(),
  /** A Apple só manda o nome no primeiro login; o app repassa aqui. */
  fullName: z.string().trim().max(NAME_MAX_LENGTH).optional(),
  deviceName: deviceNameSchema,
});
export type AppleLoginInput = z.infer<typeof appleLoginSchema>;

export const verifyEmailSchema = z.object({ token: z.string().min(20).max(200) });
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;

export const passwordResetRequestSchema = z.object({ email: emailSchema });
export type PasswordResetRequestInput = z.infer<typeof passwordResetRequestSchema>;

export const passwordResetConfirmSchema = z.object({
  token: z.string().min(20).max(200),
  password: passwordSchema,
});
export type PasswordResetConfirmInput = z.infer<typeof passwordResetConfirmSchema>;

export const meSchema = z.object({
  id: z.uuid(),
  email: z.string().nullable(),
  emailVerified: z.boolean(),
  name: z.string(),
  avatarUrl: z.string().nullable(),
  birthDate: z.string().nullable(),
  isMinor: z.boolean().nullable(),
  roles: z.array(z.enum(ROLES)),
  currentBeltId: z.uuid().nullable(),
  programId: z.uuid().nullable(),
  hasPassword: z.boolean(),
  providers: z.array(z.enum(AUTH_PROVIDER_TYPES)),
  createdAt: z.string(),
});
export type Me = z.infer<typeof meSchema>;

export const authTokensSchema = z.object({
  accessToken: z.string(),
  accessTokenExpiresIn: z.number().int(),
  refreshToken: z.string(),
  refreshTokenExpiresAt: z.string(),
  user: meSchema,
});
export type AuthTokens = z.infer<typeof authTokensSchema>;
