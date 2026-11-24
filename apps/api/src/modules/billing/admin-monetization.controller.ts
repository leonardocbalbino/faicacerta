import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiNoContentResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import {
  adminEntitlementSchema,
  adminPaymentPageSchema,
  adminPaymentQuerySchema,
  adsConfigSchema,
  entitlementGrantSchema,
  gatewayInputSchema,
  gatewayViewSchema,
  noAdsSettingsSchema,
  Role,
  uuidSchema,
  type AdminEntitlement,
  type AdminPaymentPage,
  type AdminPaymentQuery,
  type AdsConfig,
  type EntitlementGrantInput,
  type GatewayInput,
  type GatewayView,
  type NoAdsSettings,
} from '@faixa-certa/shared';
import { z } from 'zod';
import type { AuthUser } from '../../common/auth/auth-user.js';
import { CurrentUser, Roles } from '../../common/auth/decorators.js';
import { BillingService } from './billing.service.js';

/** Monetização no painel: anúncios, Sem Anúncios, gateway Pix, pagamentos e acessos. Só ADMIN. */
@ApiTags('Admin: monetização')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('admin/monetization')
export class AdminMonetizationController {
  constructor(private readonly billing: BillingService) {}

  @Get('ads')
  @ApiOkResponse({ standardSchema: adsConfigSchema })
  ads(): Promise<AdsConfig> {
    return this.billing.adsConfig();
  }

  @Put('ads')
  @ApiOkResponse({ standardSchema: adsConfigSchema })
  setAds(
    @CurrentUser() user: AuthUser,
    @Body({ schema: adsConfigSchema }) body: AdsConfig,
  ): Promise<AdsConfig> {
    return this.billing.setAds(user, body);
  }

  @Get('no-ads')
  @ApiOkResponse({ standardSchema: noAdsSettingsSchema })
  noAds(): Promise<NoAdsSettings> {
    return this.billing.noAdsSettings();
  }

  @Put('no-ads')
  @ApiOkResponse({ standardSchema: noAdsSettingsSchema })
  setNoAds(
    @CurrentUser() user: AuthUser,
    @Body({ schema: noAdsSettingsSchema }) body: NoAdsSettings,
  ): Promise<NoAdsSettings> {
    return this.billing.setNoAds(user, body);
  }

  @Get('gateway')
  @ApiOkResponse({ standardSchema: gatewayViewSchema })
  gateway(): Promise<GatewayView> {
    return this.billing.gateway();
  }

  @Put('gateway')
  @ApiOkResponse({ standardSchema: gatewayViewSchema })
  setGateway(
    @CurrentUser() user: AuthUser,
    @Body({ schema: gatewayInputSchema }) body: GatewayInput,
  ): Promise<GatewayView> {
    return this.billing.setGateway(user, body);
  }

  @Get('payments')
  @ApiOkResponse({ standardSchema: adminPaymentPageSchema })
  payments(
    @Query({ schema: adminPaymentQuerySchema }) query: AdminPaymentQuery,
  ): Promise<AdminPaymentPage> {
    return this.billing.listPayments(query);
  }

  @Get('entitlements')
  @ApiOkResponse({ standardSchema: z.array(adminEntitlementSchema) })
  entitlements(): Promise<AdminEntitlement[]> {
    return this.billing.listEntitlements();
  }

  @Post('entitlements')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  async grant(
    @CurrentUser() user: AuthUser,
    @Body({ schema: entitlementGrantSchema }) body: EntitlementGrantInput,
  ): Promise<void> {
    await this.billing.grant(user, body);
  }

  @Delete('entitlements/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  async revoke(
    @CurrentUser() user: AuthUser,
    @Param('id', { schema: uuidSchema }) id: string,
  ): Promise<void> {
    await this.billing.revoke(user, id);
  }
}
