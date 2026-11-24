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
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  beltInputSchema,
  beltRequirementSchema,
  beltRequirementsInputSchema,
  beltSchema,
  programDetailSchema,
  programInputSchema,
  programSchema,
  reorderSchema,
  Role,
  statusChangeSchema,
  uuidSchema,
  type Belt,
  type BeltInput,
  type BeltRequirement,
  type BeltRequirementsInput,
  type Program,
  type ProgramDetail,
  type ProgramInput,
  type ReorderInput,
  type StatusChangeInput,
} from '@faixa-certa/shared';
import { z } from 'zod';
import type { AuthUser } from '../../../common/auth/auth-user.js';
import { CurrentUser, Roles } from '../../../common/auth/decorators.js';
import { ProgramsService } from './programs.service.js';

const id = { schema: uuidSchema };

@ApiTags('Admin: programas e faixas')
@ApiBearerAuth()
@Roles(Role.CONTENT_EDITOR)
@Controller('admin')
export class ProgramsController {
  constructor(private readonly programs: ProgramsService) {}

  @Get('programs')
  @ApiOkResponse({ standardSchema: z.array(programSchema) })
  list(): Promise<Program[]> {
    return this.programs.list();
  }

  @Post('programs')
  @ApiCreatedResponse({ standardSchema: programSchema })
  create(
    @CurrentUser() user: AuthUser,
    @Body({ schema: programInputSchema }) body: ProgramInput,
  ): Promise<Program> {
    return this.programs.create(user, body);
  }

  @Get('programs/:id')
  @ApiOkResponse({ standardSchema: programDetailSchema })
  get(@Param('id', id) programId: string): Promise<ProgramDetail> {
    return this.programs.get(programId);
  }

  @Patch('programs/:id')
  @ApiOkResponse({ standardSchema: programSchema })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', id) programId: string,
    @Body({ schema: programInputSchema.partial() }) body: Partial<ProgramInput>,
  ): Promise<Program> {
    return this.programs.update(user, programId, body);
  }

  @Post('programs/:id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ standardSchema: programSchema })
  changeStatus(
    @CurrentUser() user: AuthUser,
    @Param('id', id) programId: string,
    @Body({ schema: statusChangeSchema }) body: StatusChangeInput,
  ): Promise<Program> {
    return this.programs.changeStatus(user, programId, body);
  }

  @Delete('programs/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  async remove(@CurrentUser() user: AuthUser, @Param('id', id) programId: string): Promise<void> {
    await this.programs.remove(user, programId);
  }

  @Post('programs/:id/belts')
  @ApiCreatedResponse({ standardSchema: beltSchema })
  createBelt(
    @CurrentUser() user: AuthUser,
    @Param('id', id) programId: string,
    @Body({ schema: beltInputSchema }) body: BeltInput,
  ): Promise<Belt> {
    return this.programs.createBelt(user, programId, body);
  }

  @Put('programs/:id/belts/order')
  @ApiOkResponse({ standardSchema: z.array(beltSchema) })
  reorderBelts(
    @CurrentUser() user: AuthUser,
    @Param('id', id) programId: string,
    @Body({ schema: reorderSchema }) body: ReorderInput,
  ): Promise<Belt[]> {
    return this.programs.reorderBelts(user, programId, body);
  }

  @Patch('belts/:id')
  @ApiOkResponse({ standardSchema: beltSchema })
  updateBelt(
    @CurrentUser() user: AuthUser,
    @Param('id', id) beltId: string,
    @Body({ schema: beltInputSchema.partial() }) body: Partial<BeltInput>,
  ): Promise<Belt> {
    return this.programs.updateBelt(user, beltId, body);
  }

  @Delete('belts/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  async removeBelt(@CurrentUser() user: AuthUser, @Param('id', id) beltId: string): Promise<void> {
    await this.programs.removeBelt(user, beltId);
  }

  @Get('belts/:id/requirements')
  @ApiOkResponse({ standardSchema: z.array(beltRequirementSchema) })
  getRequirements(@Param('id', id) beltId: string): Promise<BeltRequirement[]> {
    return this.programs.getRequirements(beltId);
  }

  @Put('belts/:id/requirements')
  @ApiOkResponse({ standardSchema: z.array(beltRequirementSchema) })
  setRequirements(
    @CurrentUser() user: AuthUser,
    @Param('id', id) beltId: string,
    @Body({ schema: beltRequirementsInputSchema }) body: BeltRequirementsInput,
  ): Promise<BeltRequirement[]> {
    return this.programs.setRequirements(user, beltId, body);
  }
}
