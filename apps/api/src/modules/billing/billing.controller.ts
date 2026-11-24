import { Body, Controller, Get, Headers, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiExcludeEndpoint, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import {
  appConfigSchema,
  entitlementsSchema,
  pixChargeSchema,
  pixCheckoutInputSchema,
  storePurchaseInputSchema,
  uuidSchema,
  type AppConfig,
  type EntitlementsResult,
  type PixCharge,
  type PixCheckoutInput,
  type StorePurchaseInput,
} from '@faixa-certa/shared';
import { SkipThrottle } from '@nestjs/throttler';
import type { AuthUser } from '../../common/auth/auth-user.js';
import { CurrentUser, Public } from '../../common/auth/decorators.js';
import { BillingService } from './billing.service.js';

@ApiTags('Cobrança')
@Controller()
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  /** Configuração pública do app: anúncios e oferta do Sem Anúncios. */
  @Public()
  @Get('config')
  @ApiOkResponse({ standardSchema: appConfigSchema })
  config(): Promise<AppConfig> {
    return this.billing.appConfig();
  }

  @ApiBearerAuth()
  @Get('billing/entitlements')
  @ApiOkResponse({ standardSchema: entitlementsSchema })
  entitlements(@CurrentUser() user: AuthUser): Promise<EntitlementsResult> {
    return this.billing.entitlements(user.id);
  }

  /** Confirma uma compra (ou restauração) feita na App Store ou no Google Play. */
  @ApiBearerAuth()
  @Post('billing/store')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ standardSchema: entitlementsSchema })
  store(
    @CurrentUser() user: AuthUser,
    @Body({ schema: storePurchaseInputSchema }) body: StorePurchaseInput,
  ): Promise<EntitlementsResult> {
    return this.billing.storePurchase(user, body);
  }

  /** Gera o Pix do Sem Anúncios (site). */
  @ApiBearerAuth()
  @Post('billing/pix')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ standardSchema: pixChargeSchema })
  pix(
    @CurrentUser() user: AuthUser,
    @Body({ schema: pixCheckoutInputSchema }) body: PixCheckoutInput,
  ): Promise<PixCharge> {
    return this.billing.pixCheckout(user, body.cpf);
  }

  @ApiBearerAuth()
  @Get('billing/payments/:id')
  @ApiOkResponse({ standardSchema: pixChargeSchema })
  payment(
    @CurrentUser() user: AuthUser,
    @Param('id', { schema: uuidSchema }) id: string,
  ): Promise<PixCharge> {
    return this.billing.paymentStatus(user, id);
  }

  /** Webhook do Asaas (autenticado pelo token configurado no painel do Asaas). */
  @Public()
  @SkipThrottle()
  @Post('billing/webhooks/asaas')
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint()
  async asaas(
    @Headers('asaas-access-token') token: string | undefined,
    @Body() body: Record<string, unknown>,
  ): Promise<{ received: true }> {
    await this.billing.asaasWebhook(token, body);
    return { received: true };
  }
}
