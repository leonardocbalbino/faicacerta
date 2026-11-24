import { Module } from '@nestjs/common';
import { AdminMonetizationController } from './admin-monetization.controller.js';
import { AsaasClient } from './asaas.client.js';
import { BillingController } from './billing.controller.js';
import { BillingService } from './billing.service.js';
import { RemoteConfigService } from './remote-config.service.js';
import { AppleStoreVerifier, GooglePlayVerifier } from './store-verifiers.js';

/** Etapa 6: Sem Anúncios (lojas + Pix no site), anúncios e monetização no painel. */
@Module({
  controllers: [BillingController, AdminMonetizationController],
  providers: [
    BillingService,
    RemoteConfigService,
    AsaasClient,
    AppleStoreVerifier,
    GooglePlayVerifier,
  ],
  exports: [AppleStoreVerifier, GooglePlayVerifier, AsaasClient],
})
export class BillingModule {}
