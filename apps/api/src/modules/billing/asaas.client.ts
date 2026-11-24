import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { SecretBox } from '../../common/crypto/secret-box.js';
import { AppException } from '../../common/errors/app.exception.js';
import { AppConfigService } from '../../config/app-config.service.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';

export interface AsaasSettings {
  apiKey: string;
  sandbox: boolean;
  webhookToken: string | null;
  pixExpirationMinutes: number;
}

export interface AsaasPixCharge {
  chargeId: string;
  copiaECola: string;
  qrCodeBase64: string;
  expiresAt: Date | null;
}

/**
 * Cliente mínimo da API v3 do Asaas para cobranças Pix.
 * Credenciais: configuração ativa no painel (cifrada) ou, na falta dela, o .env.
 */
@Injectable()
export class AsaasClient {
  private readonly logger = new Logger(AsaasClient.name);
  private readonly box: SecretBox;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
  ) {
    this.box = new SecretBox(config.get('DATA_ENCRYPTION_KEY'));
  }

  sealSecret(value: string): string {
    return this.box.seal(value);
  }

  async settings(): Promise<AsaasSettings | null> {
    const row = await this.prisma.paymentGatewayConfig.findUnique({ where: { provider: 'ASAAS' } });
    if (row?.isActive) {
      return {
        apiKey: this.box.open(row.credentialsEncrypted),
        sandbox: row.environment === 'SANDBOX',
        webhookToken: row.webhookSecretEncrypted ? this.box.open(row.webhookSecretEncrypted) : null,
        pixExpirationMinutes: row.pixExpirationMinutes,
      };
    }
    const apiKey = this.config.get('ASAAS_API_KEY');
    if (!apiKey) return null;
    return {
      apiKey,
      sandbox: this.config.get('ASAAS_ENVIRONMENT') !== 'production',
      webhookToken: this.config.get('ASAAS_WEBHOOK_TOKEN') ?? null,
      pixExpirationMinutes: 30,
    };
  }

  private async request<T>(s: AsaasSettings, path: string, init: RequestInit = {}): Promise<T> {
    const base = s.sandbox ? 'https://api-sandbox.asaas.com/v3' : 'https://api.asaas.com/v3';
    const res = await fetch(`${base}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'FaixaCerta',
        access_token: s.apiKey,
        ...init.headers,
      },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      this.logger.warn(`Asaas ${path} → ${res.status}: ${body.slice(0, 300)}`);
      throw new AppException(HttpStatus.BAD_GATEWAY, 'billing.gatewayError');
    }
    return (await res.json()) as T;
  }

  /** Cria (ou reaproveita) o cliente e uma cobrança Pix com QR code. */
  async createPixCharge(input: {
    name: string;
    email: string | null;
    cpf: string;
    amountCents: number;
    description: string;
    externalReference: string;
  }): Promise<AsaasPixCharge> {
    const s = await this.settings();
    if (!s) throw new AppException(HttpStatus.SERVICE_UNAVAILABLE, 'billing.gatewayNotConfigured');

    const found = await this.request<{ data: { id: string }[] }>(
      s,
      `/customers?cpfCnpj=${encodeURIComponent(input.cpf)}`,
    );
    const customerId =
      found.data[0]?.id ??
      (
        await this.request<{ id: string }>(s, '/customers', {
          method: 'POST',
          body: JSON.stringify({
            name: input.name,
            cpfCnpj: input.cpf,
            email: input.email ?? undefined,
            notificationDisabled: true,
          }),
        })
      ).id;

    const today = new Date().toISOString().slice(0, 10);
    const payment = await this.request<{ id: string }>(s, '/payments', {
      method: 'POST',
      body: JSON.stringify({
        customer: customerId,
        billingType: 'PIX',
        value: input.amountCents / 100,
        dueDate: today,
        description: input.description,
        externalReference: input.externalReference,
      }),
    });
    const qr = await this.request<{
      encodedImage: string;
      payload: string;
      expirationDate?: string;
    }>(s, `/payments/${payment.id}/pixQrCode`);
    const expiresAt = qr.expirationDate
      ? new Date(qr.expirationDate.replace(' ', 'T') + '-03:00')
      : new Date(Date.now() + s.pixExpirationMinutes * 60_000);
    return {
      chargeId: payment.id,
      copiaECola: qr.payload,
      qrCodeBase64: qr.encodedImage,
      expiresAt,
    };
  }
}
