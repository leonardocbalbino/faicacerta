import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import {
  NO_ADS_STORE_PRODUCT_ID,
  type AdminEntitlement,
  type AdminPaymentPage,
  type AdminPaymentQuery,
  type AdsConfig,
  type AppConfig,
  type EntitlementGrantInput,
  type EntitlementsResult,
  type GatewayInput,
  type GatewayView,
  type NoAdsSettings,
  type PixCharge,
  type StorePurchaseInput,
} from '@faixa-certa/shared';
import { safeEqual } from '../../common/crypto/tokens.js';
import type { AuthUser } from '../../common/auth/auth-user.js';
import { AppException } from '../../common/errors/app.exception.js';
import { AppConfigService } from '../../config/app-config.service.js';
import type { PaymentProviderCode, Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { activeEntitlements } from '../users/user.mapper.js';
import { AsaasClient } from './asaas.client.js';
import { RemoteConfigService } from './remote-config.service.js';
import { AppleStoreVerifier, GooglePlayVerifier } from './store-verifiers.js';

/** IDs de TESTE públicos do Google AdMob (usados até o admin cadastrar os reais). */
export const DEFAULT_ADS: AdsConfig = {
  enabled: true,
  units: {
    android: {
      banner: 'ca-app-pub-3940256099942544/6300978111',
      interstitial: 'ca-app-pub-3940256099942544/1033173712',
    },
    ios: {
      banner: 'ca-app-pub-3940256099942544/2934735716',
      interstitial: 'ca-app-pub-3940256099942544/4411468910',
    },
  },
  interstitialEveryNScreens: 5,
  interstitialMinIntervalSeconds: 120,
};

const userSelect = { select: { id: true, name: true, email: true } } as const;

interface AsaasWebhook {
  id?: string;
  event?: string;
  payment?: { id?: string; externalReference?: string | null };
}

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    private readonly remote: RemoteConfigService,
    private readonly asaas: AsaasClient,
    private readonly apple: AppleStoreVerifier,
    private readonly google: GooglePlayVerifier,
    private readonly audit: AuditService,
  ) {}

  // ---------------------------------------------------------------------------
  // Configuração pública
  // ---------------------------------------------------------------------------

  async appConfig(): Promise<AppConfig> {
    const [ads, noAds] = await Promise.all([this.adsConfig(), this.noAdsSettings()]);
    return { ads, noAds: { ...noAds, storeProductId: NO_ADS_STORE_PRODUCT_ID } };
  }

  adsConfig(): Promise<AdsConfig> {
    return this.remote.get<AdsConfig>('ads', DEFAULT_ADS).then((v) => ({ ...DEFAULT_ADS, ...v }));
  }

  async noAdsSettings(): Promise<NoAdsSettings> {
    const plan = await this.noAdsPlan();
    const price = await this.currentPrice(plan.id);
    return { salesEnabled: plan.salesEnabled, priceCents: price?.amountCents ?? 1000 };
  }

  private async noAdsPlan() {
    const plan = await this.prisma.plan.findUnique({ where: { code: 'NO_ADS' } });
    if (!plan) throw new AppException(HttpStatus.SERVICE_UNAVAILABLE, 'billing.planMissing');
    return plan;
  }

  private currentPrice(planId: string) {
    const now = new Date();
    return this.prisma.planPrice.findFirst({
      where: {
        planId,
        validFrom: { lte: now },
        OR: [{ validUntil: null }, { validUntil: { gt: now } }],
      },
      orderBy: { validFrom: 'desc' },
    });
  }

  // ---------------------------------------------------------------------------
  // Direitos
  // ---------------------------------------------------------------------------

  async entitlements(userId: string): Promise<EntitlementsResult> {
    const rows = await this.prisma.entitlement.findMany({
      where: { userId, revokedAt: null },
      select: { type: true, expiresAt: true },
    });
    return { entitlements: activeEntitlements(rows) };
  }

  /** Concede "Sem Anúncios" vitalício, se ainda não houver um ativo. */
  private async grantNoAds(
    tx: Prisma.TransactionClient,
    userId: string,
    paymentId: string | null,
  ): Promise<void> {
    const active = await tx.entitlement.findFirst({
      where: {
        userId,
        type: 'NO_ADS',
        revokedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    });
    if (active) return;
    await tx.entitlement.create({
      data: { userId, type: 'NO_ADS', source: 'PURCHASE', paymentId, expiresAt: null },
    });
  }

  // ---------------------------------------------------------------------------
  // Compras nas lojas
  // ---------------------------------------------------------------------------

  async storePurchase(user: AuthUser, input: StorePurchaseInput): Promise<EntitlementsResult> {
    const provider: PaymentProviderCode = input.platform === 'ios' ? 'APP_STORE' : 'GOOGLE_PLAY';
    const purchase =
      input.platform === 'ios'
        ? await this.apple.verify(input.signedTransaction)
        : await this.google.verify(input.productId, input.purchaseToken);
    if (purchase.productId !== NO_ADS_STORE_PRODUCT_ID) {
      throw AppException.badRequest('billing.unknownProduct');
    }

    const plan = await this.noAdsPlan();
    const price = await this.currentPrice(plan.id);
    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.payment.findUnique({
        where: { provider_gatewayChargeId: { provider, gatewayChargeId: purchase.transactionId } },
      });
      // Uma compra da loja vale para uma conta só (restaurar em outra conta não libera).
      if (existing && existing.userId !== user.id) {
        throw AppException.conflict('billing.purchaseOwnedByAnotherAccount');
      }
      const payment =
        existing ??
        (await tx.payment.create({
          data: {
            userId: user.id,
            planId: plan.id,
            planPriceId: price?.id ?? null,
            provider,
            originalAmountCents: price?.amountCents ?? 0,
            amountCents: price?.amountCents ?? 0,
            gatewayChargeId: purchase.transactionId,
            status: 'PAID',
            paidAt: purchase.purchasedAt,
            rawWebhook: { sandbox: purchase.sandbox },
          },
        }));
      await this.grantNoAds(tx, user.id, payment.id);
    });
    return this.entitlements(user.id);
  }

  // ---------------------------------------------------------------------------
  // Pix (site)
  // ---------------------------------------------------------------------------

  async pixCheckout(user: AuthUser, cpf: string): Promise<PixCharge> {
    const { entitlements } = await this.entitlements(user.id);
    if (entitlements.includes('NO_ADS')) throw AppException.conflict('billing.alreadyOwned');
    const plan = await this.noAdsPlan();
    if (!plan.salesEnabled) throw AppException.conflict('billing.salesDisabled');
    const price = await this.currentPrice(plan.id);
    if (!price) throw new AppException(HttpStatus.SERVICE_UNAVAILABLE, 'billing.planMissing');

    // Reaproveita um Pix ainda válido para não gerar cobranças repetidas.
    const pending = await this.prisma.payment.findFirst({
      where: {
        userId: user.id,
        planId: plan.id,
        provider: 'ASAAS',
        status: 'PENDING',
        amountCents: price.amountCents,
        expiresAt: { gt: new Date(Date.now() + 60_000) },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (pending?.copiaECola) return toPixCharge(pending);

    const profile = await this.prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { name: true, email: true },
    });
    const payment = await this.prisma.payment.create({
      data: {
        userId: user.id,
        planId: plan.id,
        planPriceId: price.id,
        provider: 'ASAAS',
        originalAmountCents: price.amountCents,
        amountCents: price.amountCents,
        status: 'PENDING',
      },
    });
    try {
      const charge = await this.asaas.createPixCharge({
        name: profile.name,
        email: profile.email,
        cpf,
        amountCents: price.amountCents,
        description: 'Faixa Certa — Sem Anúncios',
        externalReference: payment.id,
      });
      const updated = await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          gatewayChargeId: charge.chargeId,
          copiaECola: charge.copiaECola,
          qrCodeBase64: charge.qrCodeBase64,
          expiresAt: charge.expiresAt,
        },
      });
      return toPixCharge(updated);
    } catch (e) {
      await this.prisma.payment.update({ where: { id: payment.id }, data: { status: 'FAILED' } });
      throw e;
    }
  }

  async paymentStatus(user: AuthUser, id: string): Promise<PixCharge> {
    const payment = await this.prisma.payment.findFirst({ where: { id, userId: user.id } });
    if (!payment) throw AppException.notFound();
    if (payment.status === 'PENDING' && payment.expiresAt && payment.expiresAt < new Date()) {
      return toPixCharge(
        await this.prisma.payment.update({ where: { id }, data: { status: 'EXPIRED' } }),
      );
    }
    return toPixCharge(payment);
  }

  /**
   * Webhook do Asaas. Autenticado pelo token configurado (header
   * asaas-access-token) e idempotente pelo id do evento.
   */
  async asaasWebhook(token: string | undefined, body: AsaasWebhook): Promise<void> {
    const settings = await this.asaas.settings();
    const expected = settings?.webhookToken;
    if (!expected || !token || !safeEqual(token, expected)) throw AppException.unauthorized();

    const eventId = body.id ?? `${body.event}:${body.payment?.id}`;
    const created = await this.prisma.webhookEvent
      .create({
        data: {
          provider: 'ASAAS',
          externalEventId: eventId,
          type: body.event ?? 'UNKNOWN',
          payload: body as Prisma.InputJsonValue,
          signatureValid: true,
        },
      })
      .catch(() => null); // repetido: já processado
    if (!created) return;

    try {
      await this.applyAsaasEvent(body);
      await this.prisma.webhookEvent.update({
        where: { id: created.id },
        data: { processedAt: new Date(), attempts: 1 },
      });
      await this.prisma.paymentGatewayConfig.updateMany({
        where: { provider: 'ASAAS' },
        data: { lastWebhookAt: new Date(), lastWebhookError: null },
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      this.logger.error(`Webhook Asaas ${eventId}: ${message}`);
      await this.prisma.webhookEvent.update({
        where: { id: created.id },
        data: { attempts: 1, error: message.slice(0, 500) },
      });
      await this.prisma.paymentGatewayConfig.updateMany({
        where: { provider: 'ASAAS' },
        data: { lastWebhookError: message.slice(0, 500) },
      });
      throw e;
    }
  }

  private async applyAsaasEvent(body: AsaasWebhook): Promise<void> {
    const chargeId = body.payment?.id;
    if (!chargeId) return;
    const payment = await this.prisma.payment.findUnique({
      where: { provider_gatewayChargeId: { provider: 'ASAAS', gatewayChargeId: chargeId } },
    });
    if (!payment) return; // cobrança criada fora do app

    switch (body.event) {
      case 'PAYMENT_RECEIVED':
      case 'PAYMENT_CONFIRMED':
        await this.prisma.$transaction(async (tx) => {
          await tx.payment.update({
            where: { id: payment.id },
            data: {
              status: 'PAID',
              paidAt: payment.paidAt ?? new Date(),
              rawWebhook: body as Prisma.InputJsonValue,
            },
          });
          await this.grantNoAds(tx, payment.userId, payment.id);
        });
        break;
      case 'PAYMENT_REFUNDED':
      case 'PAYMENT_CHARGEBACK_REQUESTED':
        await this.prisma.$transaction([
          this.prisma.payment.update({
            where: { id: payment.id },
            data: { status: 'REFUNDED', refundedAt: new Date() },
          }),
          this.prisma.entitlement.updateMany({
            where: { paymentId: payment.id, revokedAt: null },
            data: { revokedAt: new Date(), reason: 'Pagamento estornado' },
          }),
        ]);
        break;
      case 'PAYMENT_OVERDUE':
        if (payment.status === 'PENDING') {
          await this.prisma.payment.update({
            where: { id: payment.id },
            data: { status: 'EXPIRED' },
          });
        }
        break;
      case 'PAYMENT_DELETED':
        if (payment.status === 'PENDING') {
          await this.prisma.payment.update({
            where: { id: payment.id },
            data: { status: 'CANCELED' },
          });
        }
        break;
      default:
        break;
    }
  }

  // ---------------------------------------------------------------------------
  // Admin
  // ---------------------------------------------------------------------------

  async setAds(actor: AuthUser, value: AdsConfig): Promise<AdsConfig> {
    const before = await this.adsConfig();
    await this.remote.set('ads', value, actor.id);
    await this.audit.record({
      actorId: actor.id,
      action: 'ads.update',
      entityType: 'REMOTE_CONFIG',
      before,
      after: value,
    });
    return this.adsConfig();
  }

  async setNoAds(actor: AuthUser, input: NoAdsSettings): Promise<NoAdsSettings> {
    const plan = await this.noAdsPlan();
    const before = await this.noAdsSettings();
    await this.prisma.$transaction(async (tx) => {
      await tx.plan.update({ where: { id: plan.id }, data: { salesEnabled: input.salesEnabled } });
      if (input.priceCents !== before.priceCents) {
        const now = new Date();
        await tx.planPrice.updateMany({
          where: { planId: plan.id, OR: [{ validUntil: null }, { validUntil: { gt: now } }] },
          data: { validUntil: now },
        });
        await tx.planPrice.create({
          data: {
            planId: plan.id,
            amountCents: input.priceCents,
            validFrom: now,
            createdByAdminId: actor.id,
          },
        });
      }
    });
    await this.audit.record({
      actorId: actor.id,
      action: 'plan.noAds.update',
      entityType: 'PLAN',
      entityId: plan.id,
      before,
      after: input,
    });
    return this.noAdsSettings();
  }

  async gateway(): Promise<GatewayView> {
    const row = await this.prisma.paymentGatewayConfig.findUnique({ where: { provider: 'ASAAS' } });
    return {
      provider: 'ASAAS',
      environment: row?.environment ?? 'SANDBOX',
      hasApiKey: Boolean(row?.credentialsEncrypted),
      hasWebhookToken: Boolean(row?.webhookSecretEncrypted),
      pixExpirationMinutes: row?.pixExpirationMinutes ?? 30,
      isActive: row?.isActive ?? false,
      lastWebhookAt: row?.lastWebhookAt?.toISOString() ?? null,
      lastWebhookError: row?.lastWebhookError ?? null,
      webhookUrl: `${this.config.get('API_PUBLIC_URL')}/v1/billing/webhooks/asaas`,
    };
  }

  async setGateway(actor: AuthUser, input: GatewayInput): Promise<GatewayView> {
    const row = await this.prisma.paymentGatewayConfig.findUnique({ where: { provider: 'ASAAS' } });
    if (!row && !input.apiKey) throw AppException.badRequest('billing.apiKeyRequired');
    const data = {
      environment: input.environment,
      pixExpirationMinutes: input.pixExpirationMinutes,
      isActive: input.isActive,
      ...(input.apiKey ? { credentialsEncrypted: this.asaas.sealSecret(input.apiKey) } : {}),
      ...(input.webhookToken
        ? { webhookSecretEncrypted: this.asaas.sealSecret(input.webhookToken) }
        : {}),
    };
    if (row) await this.prisma.paymentGatewayConfig.update({ where: { provider: 'ASAAS' }, data });
    else
      await this.prisma.paymentGatewayConfig.create({
        data: {
          provider: 'ASAAS',
          credentialsEncrypted: this.asaas.sealSecret(input.apiKey ?? ''),
          ...data,
        },
      });
    // Nunca registra as chaves na auditoria.
    await this.audit.record({
      actorId: actor.id,
      action: 'gateway.asaas.update',
      entityType: 'PAYMENT_GATEWAY',
      after: {
        environment: input.environment,
        isActive: input.isActive,
        apiKeyChanged: Boolean(input.apiKey),
        webhookTokenChanged: Boolean(input.webhookToken),
      },
    });
    return this.gateway();
  }

  async listPayments(query: AdminPaymentQuery): Promise<AdminPaymentPage> {
    const rows = await this.prisma.payment.findMany({
      where: { status: query.status, provider: query.provider },
      include: { user: userSelect, plan: { select: { name: true } } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });
    const items = rows.slice(0, query.limit);
    const since = new Date(Date.now() - 30 * 86_400_000);
    const totals = await this.prisma.payment.aggregate({
      where: { status: 'PAID', paidAt: { gte: since } },
      _count: true,
      _sum: { amountCents: true },
    });
    return {
      items: items.map((p) => ({
        id: p.id,
        provider: p.provider,
        status: p.status,
        amountCents: p.amountCents,
        plan: p.plan.name,
        user: p.user,
        createdAt: p.createdAt.toISOString(),
        paidAt: p.paidAt?.toISOString() ?? null,
      })),
      nextCursor: rows.length > query.limit ? (items.at(-1)?.id ?? null) : null,
      paidLast30Days: { count: totals._count, amountCents: totals._sum.amountCents ?? 0 },
    };
  }

  async listEntitlements(): Promise<AdminEntitlement[]> {
    const rows = await this.prisma.entitlement.findMany({
      include: { user: userSelect },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return rows.map((e) => ({
      id: e.id,
      type: e.type,
      source: e.source,
      reason: e.reason,
      user: e.user,
      startsAt: e.startsAt.toISOString(),
      expiresAt: e.expiresAt?.toISOString() ?? null,
      revokedAt: e.revokedAt?.toISOString() ?? null,
    }));
  }

  async grant(actor: AuthUser, input: EntitlementGrantInput): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: { email: input.email, deletedAt: null },
    });
    if (!user) throw AppException.notFound();
    const row = await this.prisma.entitlement.create({
      data: {
        userId: user.id,
        type: input.type,
        source: 'ADMIN_GRANT',
        grantedById: actor.id,
        reason: input.reason,
      },
    });
    await this.audit.record({
      actorId: actor.id,
      action: 'entitlement.grant',
      entityType: 'ENTITLEMENT',
      entityId: row.id,
      after: { userId: user.id, type: input.type, reason: input.reason },
    });
  }

  async revoke(actor: AuthUser, id: string): Promise<void> {
    const row = await this.prisma.entitlement.findUnique({ where: { id } });
    if (!row) throw AppException.notFound();
    if (row.revokedAt) return;
    await this.prisma.entitlement.update({ where: { id }, data: { revokedAt: new Date() } });
    await this.audit.record({
      actorId: actor.id,
      action: 'entitlement.revoke',
      entityType: 'ENTITLEMENT',
      entityId: id,
      before: row,
    });
  }
}

function toPixCharge(p: {
  id: string;
  status: PixCharge['status'];
  amountCents: number;
  copiaECola: string | null;
  qrCodeBase64: string | null;
  expiresAt: Date | null;
}): PixCharge {
  return {
    paymentId: p.id,
    status: p.status,
    amountCents: p.amountCents,
    copiaECola: p.status === 'PENDING' ? p.copiaECola : null,
    qrCodeBase64: p.status === 'PENDING' ? p.qrCodeBase64 : null,
    expiresAt: p.expiresAt?.toISOString() ?? null,
  };
}
