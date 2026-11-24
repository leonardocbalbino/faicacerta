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
} from '@nestjs/common';
import { ApiBearerAuth, ApiNoContentResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import {
  categoryInputSchema,
  categorySchema,
  reorderSchema,
  Role,
  uuidSchema,
  type Category,
  type CategoryInput,
  type ReorderInput,
} from '@faixa-certa/shared';
import { z } from 'zod';
import type { AuthUser } from '../../../common/auth/auth-user.js';
import { CurrentUser, Roles } from '../../../common/auth/decorators.js';
import { CategoriesService } from './categories.service.js';

const categoryListSchema = z.array(categorySchema);

@ApiTags('Admin: categorias')
@ApiBearerAuth()
@Roles(Role.CONTENT_EDITOR)
@Controller('admin/categories')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Get()
  @ApiOkResponse({ standardSchema: categoryListSchema })
  list(): Promise<Category[]> {
    return this.categories.list();
  }

  @Post()
  @ApiOkResponse({ standardSchema: categorySchema })
  create(
    @CurrentUser() user: AuthUser,
    @Body({ schema: categoryInputSchema }) body: CategoryInput,
  ): Promise<Category> {
    return this.categories.create(user, body);
  }

  @Put('order')
  @ApiOkResponse({ standardSchema: categoryListSchema })
  reorder(
    @CurrentUser() user: AuthUser,
    @Body({ schema: reorderSchema }) body: ReorderInput,
  ): Promise<Category[]> {
    return this.categories.reorder(user, body);
  }

  @Patch(':id')
  @ApiOkResponse({ standardSchema: categorySchema })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', { schema: uuidSchema }) id: string,
    @Body({ schema: categoryInputSchema.partial() }) body: Partial<CategoryInput>,
  ): Promise<Category> {
    return this.categories.update(user, id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  async remove(
    @CurrentUser() user: AuthUser,
    @Param('id', { schema: uuidSchema }) id: string,
  ): Promise<void> {
    await this.categories.remove(user, id);
  }
}
