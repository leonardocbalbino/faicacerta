import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import {
  Environment,
  SignedDataVerifier,
  type JWSTransactionDecodedPayload,
} from '@apple/app-store-server-library';
import { JWT } from 'google-auth-library';
import { AppException } from '../../common/errors/app.exception.js';
import { AppConfigService } from '../../config/app-config.service.js';

/** Compra confirmada pela loja, pronta para virar direito de acesso. */
export interface VerifiedStorePurchase {
  productId: string;
  /** Id único da transação/pedido na loja (idempotência). */
  transactionId: string;
  purchasedAt: Date;
  sandbox: boolean;
}

/**
 * Certificados raiz da Apple usados para validar a cadeia do JWS (StoreKit 2).
 * Baixados por HTTPS do site oficial e mantidos em memória.
 */
const APPLE_ROOT_CERT_URLS = [
  'https://www.apple.com/certificateauthority/AppleRootCA-G3.cer',
  'https://www.apple.com/certificateauthority/AppleRootCA-G2.cer',
  'https://www.apple.com/appleca/AppleIncRootCertificate.cer',
];

@Injectable()
export class AppleStoreVerifier {
  private readonly logger = new Logger(AppleStoreVerifier.name);
  private roots: Promise<Buffer[]> | null = null;

  constructor(private readonly config: AppConfigService) {}

  private loadRoots(): Promise<Buffer[]> {
    this.roots ??= Promise.all(
      APPLE_ROOT_CERT_URLS.map(async (url) => {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Falha ao baixar ${url}: ${res.status}`);
        return Buffer.from(await res.arrayBuffer());
      }),
    ).catch((e: unknown) => {
      this.roots = null; // tenta de novo na próxima compra
      throw e;
    });
    return this.roots;
  }

  /**
   * Valida o JWS da transação: assinatura e cadeia até a raiz da Apple, bundle
   * do app e ambiente. Compras do TestFlight vêm do ambiente Sandbox.
   */
  async verify(signedTransaction: string): Promise<VerifiedStorePurchase> {
    let roots: Buffer[];
    try {
      roots = await this.loadRoots();
    } catch (e) {
      this.logger.error(`Certificados da Apple indisponíveis: ${String(e)}`);
      throw new AppException(HttpStatus.SERVICE_UNAVAILABLE, 'billing.storeUnavailable');
    }
    const bundleId = this.config.get('APPLE_BUNDLE_ID');
    const appId = this.config.get('APPLE_APP_ID');

    let payload: JWSTransactionDecodedPayload | null = null;
    let sandbox = false;
    for (const env of [Environment.PRODUCTION, Environment.SANDBOX]) {
      try {
        const verifier = new SignedDataVerifier(
          roots,
          true,
          env,
          bundleId,
          env === Environment.PRODUCTION ? appId : undefined,
        );
        payload = await verifier.verifyAndDecodeTransaction(signedTransaction);
        sandbox = env === Environment.SANDBOX;
        break;
      } catch {
        /* tenta o outro ambiente */
      }
    }
    if (!payload?.productId || !payload.transactionId) {
      throw AppException.badRequest('billing.invalidPurchase');
    }
    if (payload.revocationDate) throw AppException.badRequest('billing.purchaseRevoked');
    return {
      productId: payload.productId,
      transactionId: payload.originalTransactionId ?? payload.transactionId,
      purchasedAt: new Date(payload.purchaseDate ?? Date.now()),
      sandbox,
    };
  }
}

interface GooglePurchase {
  purchaseState?: number; // 0 comprado, 1 cancelado, 2 pendente
  orderId?: string;
  purchaseTimeMillis?: string;
  purchaseType?: number; // 0 = teste
}

/** Consulta a compra na Google Play Developer API (conta de serviço). */
@Injectable()
export class GooglePlayVerifier {
  private client: JWT | null = null;

  constructor(private readonly config: AppConfigService) {}

  private auth(): JWT {
    if (this.client) return this.client;
    const raw = this.config.get('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON');
    if (!raw) throw new AppException(HttpStatus.SERVICE_UNAVAILABLE, 'billing.storeNotConfigured');
    const json = JSON.parse(
      raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8'),
    ) as { client_email: string; private_key: string };
    this.client = new JWT({
      email: json.client_email,
      key: json.private_key,
      scopes: ['https://www.googleapis.com/auth/androidpublisher'],
    });
    return this.client;
  }

  async verify(productId: string, purchaseToken: string): Promise<VerifiedStorePurchase> {
    const pkg = this.config.get('ANDROID_PACKAGE');
    const url =
      `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(pkg)}` +
      `/purchases/products/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(purchaseToken)}`;
    let data: GooglePurchase;
    try {
      const res = await this.auth().request<GooglePurchase>({ url });
      data = res.data;
    } catch (e) {
      if (e instanceof AppException) throw e;
      throw AppException.badRequest('billing.invalidPurchase');
    }
    if (data.purchaseState !== 0) throw AppException.badRequest('billing.purchasePending');
    return {
      productId,
      // Compras de teste não têm orderId; o token também é único.
      transactionId: data.orderId ?? purchaseToken,
      purchasedAt: new Date(Number(data.purchaseTimeMillis ?? Date.now())),
      sandbox: data.purchaseType === 0,
    };
  }
}
