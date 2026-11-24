import { z } from 'zod';
import { EntitlementType } from '../enums.js';
import { isValidCpf } from '../utils/cpf.js';
import { emailSchema } from './auth.js';

export const ENTITLEMENT_TYPES = Object.values(EntitlementType) as [
  EntitlementType,
  ...EntitlementType[],
];

/** Id do produto "Sem Anúncios" nas duas lojas (App Store Connect e Play Console). */
export const NO_ADS_STORE_PRODUCT_ID = 'sem_anuncios';

// -----------------------------------------------------------------------------
// Anúncios (remote config "ads")
// -----------------------------------------------------------------------------

const adUnitId = z
  .string()
  .trim()
  .regex(/^ca-app-pub-\d{16}\/\d{10}$/, { error: 'ID de bloco do AdMob inválido.' });

export const adsConfigSchema = z.object({
  enabled: z.boolean(),
  units: z.object({
    ios: z.object({ banner: adUnitId, interstitial: adUnitId }),
    android: z.object({ banner: adUnitId, interstitial: adUnitId }),
  }),
  /** Intersticial a cada N técnicas abertas (0 = desligado). */
  interstitialEveryNScreens: z.number().int().min(0).max(50),
  /** Intervalo mínimo entre intersticiais. */
  interstitialMinIntervalSeconds: z.number().int().min(30).max(3600),
});
export type AdsConfig = z.infer<typeof adsConfigSchema>;

// -----------------------------------------------------------------------------
// Configuração pública do app (GET /v1/config)
// -----------------------------------------------------------------------------

export const appConfigSchema = z.object({
  ads: adsConfigSchema,
  noAds: z.object({
    salesEnabled: z.boolean(),
    /** Preço de referência (Pix no site). Nas lojas vale o preço configurado em cada uma. */
    priceCents: z.number().int(),
    storeProductId: z.string(),
  }),
});
export type AppConfig = z.infer<typeof appConfigSchema>;

// -----------------------------------------------------------------------------
// Compras nas lojas
// -----------------------------------------------------------------------------

export const storePurchaseInputSchema = z.discriminatedUnion('platform', [
  z.object({
    platform: z.literal('ios'),
    /** JWS da transação do StoreKit 2 (verificado com os certificados da Apple). */
    signedTransaction: z.string().min(100).max(20_000),
  }),
  z.object({
    platform: z.literal('android'),
    productId: z.string().min(1).max(150),
    purchaseToken: z.string().min(10).max(1000),
  }),
]);
export type StorePurchaseInput = z.infer<typeof storePurchaseInputSchema>;

export const entitlementsSchema = z.object({
  entitlements: z.array(z.enum(ENTITLEMENT_TYPES)),
});
export type EntitlementsResult = z.infer<typeof entitlementsSchema>;

// -----------------------------------------------------------------------------
// Pix (site)
// -----------------------------------------------------------------------------

export const cpfSchema = z
  .string()
  .transform((v) => v.replace(/\D/g, ''))
  .refine(isValidCpf, { error: 'CPF inválido.' });

export const pixCheckoutInputSchema = z.object({ cpf: cpfSchema });
export type PixCheckoutInput = z.infer<typeof pixCheckoutInputSchema>;

export const PAYMENT_STATUSES = [
  'PENDING',
  'PAID',
  'EXPIRED',
  'CANCELED',
  'REFUNDED',
  'FAILED',
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const pixChargeSchema = z.object({
  paymentId: z.uuid(),
  status: z.enum(PAYMENT_STATUSES),
  amountCents: z.number().int(),
  copiaECola: z.string().nullable(),
  qrCodeBase64: z.string().nullable(),
  expiresAt: z.string().nullable(),
});
export type PixCharge = z.infer<typeof pixChargeSchema>;

// -----------------------------------------------------------------------------
// Admin: monetização
// -----------------------------------------------------------------------------

export const noAdsSettingsSchema = z.object({
  salesEnabled: z.boolean(),
  priceCents: z.number().int().min(100).max(100_000),
});
export type NoAdsSettings = z.infer<typeof noAdsSettingsSchema>;

export const GATEWAY_ENVIRONMENTS = ['SANDBOX', 'PRODUCTION'] as const;

export const gatewayInputSchema = z.object({
  environment: z.enum(GATEWAY_ENVIRONMENTS),
  /** Vazio = mantém a chave salva. */
  apiKey: z.string().trim().max(500).optional(),
  webhookToken: z.string().trim().max(200).optional(),
  pixExpirationMinutes: z.number().int().min(5).max(1440),
  isActive: z.boolean(),
});
export type GatewayInput = z.infer<typeof gatewayInputSchema>;

export const gatewayViewSchema = z.object({
  provider: z.literal('ASAAS'),
  environment: z.enum(GATEWAY_ENVIRONMENTS),
  hasApiKey: z.boolean(),
  hasWebhookToken: z.boolean(),
  pixExpirationMinutes: z.number().int(),
  isActive: z.boolean(),
  lastWebhookAt: z.string().nullable(),
  lastWebhookError: z.string().nullable(),
  /** URL para cadastrar no painel do Asaas. */
  webhookUrl: z.string(),
});
export type GatewayView = z.infer<typeof gatewayViewSchema>;

export const PAYMENT_PROVIDERS = [
  'MERCADO_PAGO',
  'ASAAS',
  'EFI',
  'APP_STORE',
  'GOOGLE_PLAY',
] as const;

export const adminPaymentSchema = z.object({
  id: z.uuid(),
  provider: z.enum(PAYMENT_PROVIDERS),
  status: z.enum(PAYMENT_STATUSES),
  amountCents: z.number().int(),
  plan: z.string(),
  user: z.object({ id: z.uuid(), name: z.string(), email: z.string().nullable() }),
  createdAt: z.string(),
  paidAt: z.string().nullable(),
});
export type AdminPayment = z.infer<typeof adminPaymentSchema>;

export const adminPaymentPageSchema = z.object({
  items: z.array(adminPaymentSchema),
  nextCursor: z.uuid().nullable(),
  /** Totais pagos (todas as fontes) nos últimos 30 dias. */
  paidLast30Days: z.object({ count: z.number().int(), amountCents: z.number().int() }),
});
export type AdminPaymentPage = z.infer<typeof adminPaymentPageSchema>;

export const adminPaymentQuerySchema = z.object({
  status: z.enum(PAYMENT_STATUSES).optional(),
  provider: z.enum(PAYMENT_PROVIDERS).optional(),
  cursor: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});
export type AdminPaymentQuery = z.infer<typeof adminPaymentQuerySchema>;

export const entitlementGrantSchema = z.object({
  email: emailSchema,
  type: z.enum(ENTITLEMENT_TYPES),
  reason: z.string().trim().min(3).max(300),
});
export type EntitlementGrantInput = z.infer<typeof entitlementGrantSchema>;

export const adminEntitlementSchema = z.object({
  id: z.uuid(),
  type: z.enum(ENTITLEMENT_TYPES),
  source: z.string(),
  reason: z.string().nullable(),
  user: z.object({ id: z.uuid(), name: z.string(), email: z.string().nullable() }),
  startsAt: z.string(),
  expiresAt: z.string().nullable(),
  revokedAt: z.string().nullable(),
});
export type AdminEntitlement = z.infer<typeof adminEntitlementSchema>;
