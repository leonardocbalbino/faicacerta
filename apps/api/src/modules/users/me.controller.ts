import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { meSchema, type Me } from '@faixa-certa/shared';
import type { AuthUser } from '../../common/auth/auth-user.js';
import { CurrentUser } from '../../common/auth/decorators.js';
import { UsersService } from './users.service.js';

@ApiTags('Conta')
@ApiBearerAuth()
@Controller('me')
export class MeController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @ApiOkResponse({ description: 'Dados do usuário logado', standardSchema: meSchema })
  getMe(@CurrentUser() user: AuthUser): Promise<Me> {
    return this.users.getMe(user.id);
  }
}
