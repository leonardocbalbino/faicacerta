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
  articleInputSchema,
  articlePageSchema,
  articleSchema,
  articleUpdateSchema,
  contentListQuerySchema,
  Role,
  statusChangeSchema,
  uuidSchema,
  versionDetailSchema,
  versionSchema,
  type Article,
  type ArticleInput,
  type ArticleUpdateInput,
  type ContentListQuery,
  type ContentVersionDetail,
  type ContentVersionSummary,
  type StatusChangeInput,
} from '@faixa-certa/shared';
import { z } from 'zod';
import type { AuthUser } from '../../../common/auth/auth-user.js';
import { CurrentUser, Roles } from '../../../common/auth/decorators.js';
import { ArticlesService } from './articles.service.js';

const id = { schema: uuidSchema };
const version = { schema: z.coerce.number().int().positive() };

@ApiTags('Admin: textos')
@ApiBearerAuth()
@Roles(Role.CONTENT_EDITOR)
@Controller('admin/articles')
export class ArticlesController {
  constructor(private readonly articles: ArticlesService) {}

  @Get()
  @ApiOkResponse({ standardSchema: articlePageSchema })
  list(@Query({ schema: contentListQuerySchema }) query: ContentListQuery) {
    return this.articles.list(query);
  }

  @Post()
  @ApiCreatedResponse({ standardSchema: articleSchema })
  create(
    @CurrentUser() user: AuthUser,
    @Body({ schema: articleInputSchema }) body: ArticleInput,
  ): Promise<Article> {
    return this.articles.create(user, body);
  }

  @Get(':id')
  @ApiOkResponse({ standardSchema: articleSchema })
  get(@Param('id', id) articleId: string): Promise<Article> {
    return this.articles.get(articleId);
  }

  @Patch(':id')
  @ApiOkResponse({ standardSchema: articleSchema })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', id) articleId: string,
    @Body({ schema: articleUpdateSchema }) body: ArticleUpdateInput,
  ): Promise<Article> {
    return this.articles.update(user, articleId, body);
  }

  @Post(':id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ standardSchema: articleSchema })
  changeStatus(
    @CurrentUser() user: AuthUser,
    @Param('id', id) articleId: string,
    @Body({ schema: statusChangeSchema }) body: StatusChangeInput,
  ): Promise<Article> {
    return this.articles.changeStatus(user, articleId, body);
  }

  @Get(':id/versions')
  @ApiOkResponse({ standardSchema: z.array(versionSchema) })
  versions(@Param('id', id) articleId: string): Promise<ContentVersionSummary[]> {
    return this.articles.listVersions(articleId);
  }

  @Get(':id/versions/:version')
  @ApiOkResponse({ standardSchema: versionDetailSchema })
  getVersion(
    @Param('id', id) articleId: string,
    @Param('version', version) v: number,
  ): Promise<ContentVersionDetail> {
    return this.articles.getVersion(articleId, v);
  }

  @Post(':id/versions/:version/restore')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ standardSchema: articleSchema })
  restore(
    @CurrentUser() user: AuthUser,
    @Param('id', id) articleId: string,
    @Param('version', version) v: number,
  ): Promise<Article> {
    return this.articles.restore(user, articleId, v);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  async remove(@CurrentUser() user: AuthUser, @Param('id', id) articleId: string): Promise<void> {
    await this.articles.remove(user, articleId);
  }
}
