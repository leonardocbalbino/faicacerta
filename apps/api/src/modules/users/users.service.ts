import { Injectable } from '@nestjs/common';
import type { Me } from '@faixa-certa/shared';
import { AppConfigService } from '../../config/app-config.service.js';
import { AppException } from '../../common/errors/app.exception.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { meInclude, toMe, type UserWithMeRelations } from './user.mapper.js';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
  ) {}

  async getMe(userId: string): Promise<Me> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      include: meInclude,
    });
    if (!user) throw AppException.unauthorized();
    return this.toMe(user);
  }

  toMe(user: UserWithMeRelations): Me {
    return toMe(user, this.config.get('CDN_PUBLIC_BASE_URL'));
  }
}
