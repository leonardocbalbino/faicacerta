import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  accountDeleteSchema,
  meSchema,
  profileUpdateSchema,
  syncInputSchema,
  syncStateSchema,
  timelineEventInputSchema,
  timelineEventSchema,
  timelineEventUpdateSchema,
  uuidSchema,
  type AccountDeleteInput,
  type Me,
  type ProfileUpdateInput,
  type SyncInput,
  type SyncState,
  type TimelineEvent,
  type TimelineEventInput,
  type TimelineEventUpdateInput,
} from '@faixa-certa/shared';
import { z } from 'zod';
import type { AuthUser } from '../../common/auth/auth-user.js';
import { CurrentUser } from '../../common/auth/decorators.js';
import { JourneyService } from './journey.service.js';
import { UsersService } from './users.service.js';

const id = { schema: uuidSchema };

@ApiTags('Conta')
@ApiBearerAuth()
@Controller('me')
export class MeController {
  constructor(
    private readonly users: UsersService,
    private readonly journey: JourneyService,
  ) {}

  @Get()
  @ApiOkResponse({ description: 'Dados do usuário logado', standardSchema: meSchema })
  getMe(@CurrentUser() user: AuthUser): Promise<Me> {
    return this.users.getMe(user.id);
  }

  @Patch()
  @ApiOkResponse({ standardSchema: meSchema })
  update(
    @CurrentUser() user: AuthUser,
    @Body({ schema: profileUpdateSchema }) body: ProfileUpdateInput,
  ): Promise<Me> {
    return this.users.updateProfile(user.id, body);
  }

  /** Exclui a conta e os dados pessoais (irreversível). */
  @Post('delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  async remove(
    @CurrentUser() user: AuthUser,
    @Body({ schema: accountDeleteSchema }) _body: AccountDeleteInput,
  ): Promise<void> {
    await this.users.deleteAccount(user.id);
  }

  // --- Progresso e favoritos --------------------------------------------------

  @Get('sync')
  @ApiOkResponse({ standardSchema: syncStateSchema })
  state(@CurrentUser() user: AuthUser): Promise<SyncState> {
    return this.journey.state(user.id);
  }

  @Post('sync')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ standardSchema: syncStateSchema })
  sync(
    @CurrentUser() user: AuthUser,
    @Body({ schema: syncInputSchema }) body: SyncInput,
  ): Promise<SyncState> {
    return this.journey.sync(user.id, body);
  }

  // --- Linha do tempo ---------------------------------------------------------

  @Get('timeline')
  @ApiOkResponse({ standardSchema: z.array(timelineEventSchema) })
  timeline(@CurrentUser() user: AuthUser): Promise<TimelineEvent[]> {
    return this.journey.listTimeline(user.id);
  }

  @Post('timeline')
  @ApiCreatedResponse({ standardSchema: timelineEventSchema })
  createEvent(
    @CurrentUser() user: AuthUser,
    @Body({ schema: timelineEventInputSchema }) body: TimelineEventInput,
  ): Promise<TimelineEvent> {
    return this.journey.createEvent(user.id, body);
  }

  @Patch('timeline/:id')
  @ApiOkResponse({ standardSchema: timelineEventSchema })
  updateEvent(
    @CurrentUser() user: AuthUser,
    @Param('id', id) eventId: string,
    @Body({ schema: timelineEventUpdateSchema }) body: TimelineEventUpdateInput,
  ): Promise<TimelineEvent> {
    return this.journey.updateEvent(user.id, eventId, body);
  }

  @Delete('timeline/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  async deleteEvent(
    @CurrentUser() user: AuthUser,
    @Param('id', id) eventId: string,
  ): Promise<void> {
    await this.journey.deleteEvent(user.id, eventId);
  }
}
