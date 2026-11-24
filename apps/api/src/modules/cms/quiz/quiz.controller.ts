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
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  quizListQuerySchema,
  quizPageSchema,
  quizQuestionInputSchema,
  quizQuestionSchema,
  Role,
  statusChangeSchema,
  uuidSchema,
  versionDetailSchema,
  versionSchema,
  type ContentVersionDetail,
  type ContentVersionSummary,
  type QuizListQuery,
  type QuizQuestion,
  type QuizQuestionInput,
  type StatusChangeInput,
} from '@faixa-certa/shared';
import { z } from 'zod';
import type { AuthUser } from '../../../common/auth/auth-user.js';
import { CurrentUser, Roles } from '../../../common/auth/decorators.js';
import { QuizService } from './quiz.service.js';

const id = { schema: uuidSchema };
const version = { schema: z.coerce.number().int().positive() };

@ApiTags('Admin: quiz')
@ApiBearerAuth()
@Roles(Role.CONTENT_EDITOR)
@Controller('admin/quiz-questions')
export class QuizController {
  constructor(private readonly quiz: QuizService) {}

  @Get()
  @ApiOkResponse({ standardSchema: quizPageSchema })
  list(@Query({ schema: quizListQuerySchema }) query: QuizListQuery) {
    return this.quiz.list(query);
  }

  @Post()
  @ApiCreatedResponse({ standardSchema: quizQuestionSchema })
  create(
    @CurrentUser() user: AuthUser,
    @Body({ schema: quizQuestionInputSchema }) body: QuizQuestionInput,
  ): Promise<QuizQuestion> {
    return this.quiz.create(user, body);
  }

  @Get(':id')
  @ApiOkResponse({ standardSchema: quizQuestionSchema })
  get(@Param('id', id) questionId: string): Promise<QuizQuestion> {
    return this.quiz.get(questionId);
  }

  @Put(':id')
  @ApiOkResponse({ standardSchema: quizQuestionSchema })
  replace(
    @CurrentUser() user: AuthUser,
    @Param('id', id) questionId: string,
    @Body({ schema: quizQuestionInputSchema }) body: QuizQuestionInput,
  ): Promise<QuizQuestion> {
    return this.quiz.replace(user, questionId, body);
  }

  @Post(':id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ standardSchema: quizQuestionSchema })
  changeStatus(
    @CurrentUser() user: AuthUser,
    @Param('id', id) questionId: string,
    @Body({ schema: statusChangeSchema }) body: StatusChangeInput,
  ): Promise<QuizQuestion> {
    return this.quiz.changeStatus(user, questionId, body);
  }

  @Get(':id/versions')
  @ApiOkResponse({ standardSchema: z.array(versionSchema) })
  versions(@Param('id', id) questionId: string): Promise<ContentVersionSummary[]> {
    return this.quiz.listVersions(questionId);
  }

  @Get(':id/versions/:version')
  @ApiOkResponse({ standardSchema: versionDetailSchema })
  getVersion(
    @Param('id', id) questionId: string,
    @Param('version', version) v: number,
  ): Promise<ContentVersionDetail> {
    return this.quiz.getVersion(questionId, v);
  }

  @Post(':id/versions/:version/restore')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ standardSchema: quizQuestionSchema })
  restore(
    @CurrentUser() user: AuthUser,
    @Param('id', id) questionId: string,
    @Param('version', version) v: number,
  ): Promise<QuizQuestion> {
    return this.quiz.restore(user, questionId, v);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  async remove(@CurrentUser() user: AuthUser, @Param('id', id) questionId: string): Promise<void> {
    await this.quiz.remove(user, questionId);
  }
}
