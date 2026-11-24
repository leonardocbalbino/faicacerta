import { z } from 'zod';

const csv = z
  .string()
  .default('')
  .transform((v) =>
    v
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  );

const boolWithDefault = (fallback: boolean) =>
  z
    .enum(['true', 'false', '1', '0'])
    .optional()
    .transform((v) => (v === undefined ? fallback : v === 'true' || v === '1'));

const bool = boolWithDefault(false);
const optionalBool = z
  .enum(['true', 'false', '1', '0'])
  .optional()
  .transform((v) => (v === undefined ? undefined : v === 'true' || v === '1'));

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().default(3000),
  API_PUBLIC_URL: z.url().default('http://localhost:3000'),
  CORS_ORIGINS: csv,
  WEB_APP_URL: z.url().default('http://localhost:5173'),
  MOBILE_DEEP_LINK_SCHEME: z.string().default('faixacerta'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),

  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  /** `bullmq` (Redis) ou `inline` (executa na hora, usado nos testes). */
  QUEUE_DRIVER: z.enum(['bullmq', 'inline']).default('bullmq'),
  /** Se esta instância processa jobs. Em produção: API=false, worker=true. */
  WORKERS_ENABLED: boolWithDefault(true),

  S3_ENDPOINT: z.url().optional(),
  /** Endpoint usado nas URLs assinadas entregues aos clientes (ex.: IP da máquina para o celular). */
  S3_PUBLIC_ENDPOINT: z.url().optional(),
  S3_REGION: z.string().default('us-east-1'),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),
  S3_FORCE_PATH_STYLE: bool,
  S3_BUCKET_PUBLIC: z.string().default('faixa-certa-public'),
  S3_BUCKET_PRIVATE: z.string().default('faixa-certa-private'),
  /** Cria os buckets (e a policy de leitura pública) ao subir. Padrão: ligado fora de produção. */
  S3_AUTO_CREATE_BUCKETS: optionalBool,
  SIGNED_URL_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  UPLOAD_URL_TTL_SECONDS: z.coerce.number().int().positive().default(900),

  FFMPEG_PATH: z.string().default('ffmpeg'),
  FFPROBE_PATH: z.string().default('ffprobe'),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET precisa ter pelo menos 32 caracteres'),
  JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
  JWT_ISSUER: z.string().default('faixa-certa-api'),
  JWT_AUDIENCE: z.string().default('faixa-certa'),

  GOOGLE_CLIENT_IDS: csv,
  APPLE_CLIENT_IDS: csv,

  SMTP_HOST: z.string().default('localhost'),
  SMTP_PORT: z.coerce.number().int().default(1025),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_SECURE: bool,
  MAIL_FROM: z.string().default('Faixa Certa <nao-responda@faixacerta.local>'),

  CDN_PUBLIC_BASE_URL: z.url().default('http://localhost:9000/faixa-certa-public'),

  DATA_ENCRYPTION_KEY: z.string().refine((v) => Buffer.from(v, 'base64').length === 32, {
    message: 'DATA_ENCRYPTION_KEY precisa ter 32 bytes em base64',
  }),

  SENTRY_DSN: z.string().optional(),
  /** Desliga o rate limit (usado nos testes E2E). */
  THROTTLE_DISABLED: bool,
});

export type Env = z.infer<typeof envSchema>;

/** Usado pelo ConfigModule: valida no boot e falha com mensagem legível. */
export function validateEnv(raw: Record<string, unknown>): Env {
  // Variáveis vazias no .env viram undefined para os defaults funcionarem.
  const cleaned = Object.fromEntries(
    Object.entries(raw).map(([k, v]) => [k, v === '' ? undefined : v]),
  );
  const parsed = envSchema.safeParse(cleaned);
  if (!parsed.success) {
    const lines = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`);
    throw new Error(`Variáveis de ambiente inválidas:\n${lines.join('\n')}`);
  }
  return parsed.data;
}
