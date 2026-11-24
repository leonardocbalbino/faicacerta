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
  Put,
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
  contentListQuerySchema,
  Role,
  statusChangeSchema,
  techniqueDetailSchema,
  techniqueInputSchema,
  techniqueMediaInputSchema,
  techniquePageSchema,
  techniqueRelatedInputSchema,
  techniqueUpdateSchema,
  uuidSchema,
  versionDetailSchema,
  versionSchema,
  type ContentListQuery,
  type ContentVersionDetail,
  type ContentVersionSummary,
  type StatusChangeInput,
  type TechniqueDetail,
  type TechniqueInput,
  type TechniqueMediaInput,
  type TechniquePage,
  type TechniqueRelatedInput,
  type TechniqueUpdateInput,
} from '@faixa-certa/shared';
import { z } from 'zod';
import type { AuthUser } from '../../../common/auth/auth-user.js';
import { CurrentUser, Roles } from '../../../common/auth/decorators.js';
import { TechniquesService } from './techniques.service.js';

const id = { schema: uuidSchema };
const version = { schema: z.coerce.number().int().positive() };

@ApiTags('Admin: técnicas')
@ApiBearerAuth()
@Roles(Role.CONTENT_EDITOR)
@Controller('admin/techniques')
export class TechniquesController {
  constructor(private readonly techniques: TechniquesService) {}

  @Get()
  @ApiOkResponse({ standardSchema: techniquePageSchema })
  list(@Query({ schema: contentListQuerySchema }) query: ContentListQuery): Promise<TechniquePage> {
    return this.techniques.list(query);
  }

  @Post()
  @ApiCreatedResponse({ standardSchema: techniqueDetailSchema })
  create(
    @CurrentUser() user: AuthUser,
    @Body({ schema: techniqueInputSchema }) body: TechniqueInput,
  ): Promise<TechniqueDetail> {
    return this.techniques.create(user, body);
  }

  @Get(':id')
  @ApiOkResponse({ standardSchema: techniqueDetailSchema })
  get(@Param('id', id) techniqueId: string): Promise<TechniqueDetail> {
    return this.techniques.get(techniqueId);
  }

  @Patch(':id')
  @ApiOkResponse({ standardSchema: techniqueDetailSchema })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', id) techniqueId: string,
    @Body({ schema: techniqueUpdateSchema }) body: TechniqueUpdateInput,
  ): Promise<TechniqueDetail> {
    return this.techniques.update(user, techniqueId, body);
  }

  @Put(':id/media')
  @ApiOkResponse({ standardSchema: techniqueDetailSchema })
  setMedia(
    @CurrentUser() user: AuthUser,
    @Param('id', id) techniqueId: string,
    @Body({ schema: techniqueMediaInputSchema }) body: TechniqueMediaInput,
  ): Promise<TechniqueDetail> {
    return this.techniques.setMedia(user, techniqueId, body);
  }

  @Put(':id/related')
  @ApiOkResponse({ standardSchema: techniqueDetailSchema })
  setRelated(
    @CurrentUser() user: AuthUser,
    @Param('id', id) techniqueId: string,
    @Body({ schema: techniqueRelatedInputSchema }) body: TechniqueRelatedInput,
  ): Promise<TechniqueDetail> {
    return this.techniques.setRelated(user, techniqueId, body);
  }

  @Post(':id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ standardSchema: techniqueDetailSchema })
  changeStatus(
    @CurrentUser() user: AuthUser,
    @Param('id', id) techniqueId: string,
    @Body({ schema: statusChangeSchema }) body: StatusChangeInput,
  ): Promise<TechniqueDetail> {
    return this.techniques.changeStatus(user, techniqueId, body);
  }

  @Get(':id/versions')
  @ApiOkResponse({ standardSchema: z.array(versionSchema) })
  versions(@Param('id', id) techniqueId: string): Promise<ContentVersionSummary[]> {
    return this.techniques.listVersions(techniqueId);
  }

  @Get(':id/versions/:version')
  @ApiOkResponse({ standardSchema: versionDetailSchema })
  getVersion(
    @Param('id', id) techniqueId: string,
    @Param('version', version) v: number,
  ): Promise<ContentVersionDetail> {
    return this.techniques.getVersion(techniqueId, v);
  }

  @Post(':id/versions/:version/restore')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ standardSchema: techniqueDetailSchema })
  restore(
    @CurrentUser() user: AuthUser,
    @Param('id', id) techniqueId: string,
    @Param('version', version) v: number,
  ): Promise<TechniqueDetail> {
    return this.techniques.restore(user, techniqueId, v);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  async remove(@CurrentUser() user: AuthUser, @Param('id', id) techniqueId: string): Promise<void> {
    await this.techniques.remove(user, techniqueId);
  }
}
