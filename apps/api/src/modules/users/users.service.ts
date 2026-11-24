import { Injectable } from '@nestjs/common';
import type { Me, ProfileUpdateInput } from '@faixa-certa/shared';
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

  async updateProfile(userId: string, input: ProfileUpdateInput): Promise<Me> {
    await this.getMe(userId);

    // Faixa precisa pertencer ao programa (o informado ou o já salvo).
    if (input.currentBeltId) {
      const belt = await this.prisma.belt.findFirst({
        where: { id: input.currentBeltId, deletedAt: null },
        select: { programId: true },
      });
      if (!belt) throw AppException.badRequest('content.referenceNotFound');
      const programId =
        input.programId ??
        (await this.prisma.user.findUniqueOrThrow({ where: { id: userId } })).programId;
      if (programId && programId !== belt.programId) {
        throw AppException.badRequest('content.referenceNotFound');
      }
      input = { ...input, programId: belt.programId };
    } else if (input.programId) {
      const program = await this.prisma.program.findFirst({
        where: { id: input.programId, deletedAt: null },
      });
      if (!program) throw AppException.badRequest('content.referenceNotFound');
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        name: input.name,
        academyName: input.academyName,
        teacherName: input.teacherName,
        programId: input.programId,
        currentBeltId: input.currentBeltId,
      },
      include: meInclude,
    });
    return this.toMe(user);
  }

  /**
   * Exclusão da conta pelo próprio usuário (exigida pela App Store e pela LGPD).
   * Apaga os dados pessoais e de estudo, revoga as sessões e anonimiza o
   * registro (mantido só para integridade de pagamentos e auditoria).
   */
  async deleteAccount(userId: string): Promise<void> {
    await this.getMe(userId);
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: now },
      }),
      this.prisma.authProvider.deleteMany({ where: { userId } }),
      this.prisma.verificationToken.deleteMany({ where: { userId } }),
      this.prisma.pushToken.deleteMany({ where: { userId } }),
      this.prisma.progressItem.deleteMany({ where: { userId } }),
      this.prisma.favorite.deleteMany({ where: { userId } }),
      this.prisma.timelineEvent.deleteMany({ where: { userId } }),
      this.prisma.user.update({
        where: { id: userId },
        data: {
          email: null,
          emailVerifiedAt: null,
          passwordHash: null,
          name: 'Conta excluída',
          avatarMediaId: null,
          birthDate: null,
          cpf: null,
          phone: null,
          academyName: null,
          teacherName: null,
          guardianName: null,
          guardianEmail: null,
          deletedAt: now,
          anonymizedAt: now,
        },
      }),
    ]);
  }

  toMe(user: UserWithMeRelations): Me {
    return toMe(user, this.config.get('CDN_PUBLIC_BASE_URL'));
  }
}
