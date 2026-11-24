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
  glossaryPageSchema,
  glossaryTermInputSchema,
  glossaryTermSchema,
  glossaryTermUpdateSchema,
  Role,
  statusChangeSchema,
  uuidSchema,
  versionDetailSchema,
  versionSchema,
  type ContentListQuery,
  type ContentVersionDetail,
  type ContentVersionSummary,
  type GlossaryTerm,
  type GlossaryTermInput,
  type GlossaryTermUpdateInput,
  type StatusChangeInput,
} from '@faixa-certa/shared';
import { z } from 'zod';
import type { AuthUser } from '../../../common/auth/auth-user.js';
import { CurrentUser, Roles } from '../../../common/auth/decorators.js';
import { GlossaryService } from './glossary.service.js';

const id = { schema: uuidSchema };
const version = { schema: z.coerce.number().int().positive() };

@ApiTags('Admin: glossário')
@ApiBearerAuth()
@Roles(Role.CONTENT_EDITOR)
@Controller('admin/glossary')
export class GlossaryController {
  constructor(private readonly glossary: GlossaryService) {}

  @Get()
  @ApiOkResponse({ standardSchema: glossaryPageSchema })
  list(@Query({ schema: contentListQuerySchema }) query: ContentListQuery) {
    return this.glossary.list(query);
  }

  @Post()
  @ApiCreatedResponse({ standardSchema: glossaryTermSchema })
  create(
    @CurrentUser() user: AuthUser,
    @Body({ schema: glossaryTermInputSchema }) body: GlossaryTermInput,
  ): Promise<GlossaryTerm> {
    return this.glossary.create(user, body);
  }

  @Get(':id')
  @ApiOkResponse({ standardSchema: glossaryTermSchema })
  get(@Param('id', id) termId: string): Promise<GlossaryTerm> {
    return this.glossary.get(termId);
  }

  @Patch(':id')
  @ApiOkResponse({ standardSchema: glossaryTermSchema })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', id) termId: string,
    @Body({ schema: glossaryTermUpdateSchema }) body: GlossaryTermUpdateInput,
  ): Promise<GlossaryTerm> {
    return this.glossary.update(user, termId, body);
  }

  @Post(':id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ standardSchema: glossaryTermSchema })
  changeStatus(
    @CurrentUser() user: AuthUser,
    @Param('id', id) termId: string,
    @Body({ schema: statusChangeSchema }) body: StatusChangeInput,
  ): Promise<GlossaryTerm> {
    return this.glossary.changeStatus(user, termId, body);
  }

  @Get(':id/versions')
  @ApiOkResponse({ standardSchema: z.array(versionSchema) })
  versions(@Param('id', id) termId: string): Promise<ContentVersionSummary[]> {
    return this.glossary.listVersions(termId);
  }

  @Get(':id/versions/:version')
  @ApiOkResponse({ standardSchema: versionDetailSchema })
  getVersion(
    @Param('id', id) termId: string,
    @Param('version', version) v: number,
  ): Promise<ContentVersionDetail> {
    return this.glossary.getVersion(termId, v);
  }

  @Post(':id/versions/:version/restore')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ standardSchema: glossaryTermSchema })
  restore(
    @CurrentUser() user: AuthUser,
    @Param('id', id) termId: string,
    @Param('version', version) v: number,
  ): Promise<GlossaryTerm> {
    return this.glossary.restore(user, termId, v);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  async remove(@CurrentUser() user: AuthUser, @Param('id', id) termId: string): Promise<void> {
    await this.glossary.remove(user, termId);
  }
}
