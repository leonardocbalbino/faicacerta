import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  createUploadSchema,
  mediaListQuerySchema,
  mediaPageSchema,
  mediaSchema,
  Role,
  uploadTicketSchema,
  uuidSchema,
  type CreateUploadInput,
  type Media,
  type MediaListQuery,
  type MediaPage,
  type UploadTicket,
} from '@faixa-certa/shared';
import type { AuthUser } from '../../common/auth/auth-user.js';
import { CurrentUser, Public, Roles } from '../../common/auth/decorators.js';
import { MediaService } from './media.service.js';

@ApiTags('Mídia')
@ApiBearerAuth()
@Controller('media')
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Post('upload-url')
  @ApiCreatedResponse({
    description: 'Mídia registrada e URL pré-assinada para enviar o arquivo (PUT)',
    standardSchema: uploadTicketSchema,
  })
  createUpload(
    @CurrentUser() user: AuthUser,
    @Body({ schema: createUploadSchema }) body: CreateUploadInput,
  ): Promise<UploadTicket> {
    return this.media.createUpload(user, body);
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    description: 'Envio confirmado; a mídia entrou na fila',
    standardSchema: mediaSchema,
  })
  complete(
    @CurrentUser() user: AuthUser,
    @Param('id', { schema: uuidSchema }) id: string,
  ): Promise<Media> {
    return this.media.complete(user, id);
  }

  @Public()
  @Get(':id')
  @ApiOkResponse({ standardSchema: mediaSchema })
  get(
    @CurrentUser() user: AuthUser | undefined,
    @Param('id', { schema: uuidSchema }) id: string,
  ): Promise<Media> {
    return this.media.get(user, id);
  }
}

@ApiTags('Admin: mídia')
@ApiBearerAuth()
@Roles(Role.CONTENT_EDITOR)
@Controller('admin/media')
export class AdminMediaController {
  constructor(private readonly media: MediaService) {}

  @Get()
  @ApiOkResponse({ standardSchema: mediaPageSchema })
  list(@Query({ schema: mediaListQuerySchema }) query: MediaListQuery): Promise<MediaPage> {
    return this.media.list(query);
  }

  @Post(':id/reprocess')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ standardSchema: mediaSchema })
  reprocess(@Param('id', { schema: uuidSchema }) id: string): Promise<Media> {
    return this.media.reprocess(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  async remove(@Param('id', { schema: uuidSchema }) id: string): Promise<void> {
    await this.media.remove(id);
  }
}
