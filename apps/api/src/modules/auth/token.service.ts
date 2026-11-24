import { randomUUID } from 'node:crypto';
import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Role } from '@faixa-certa/shared';
import { AppConfigService } from '../../config/app-config.service.js';
import type { AccessTokenPayload } from '../../common/auth/auth-user.js';
import { generateOpaqueToken, sha256 } from '../../common/crypto/tokens.js';
import { AppException } from '../../common/errors/app.exception.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { classifyRefreshToken } from './refresh-token.policy.js';

export interface SessionMeta {
  deviceName?: string;
  ip?: string;
  userAgent?: string;
}

export interface IssuedTokens {
  accessToken: string;
  accessTokenExpiresIn: number;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}

/**
 * Access token: JWT curto (HS256).
 * Refresh token: valor opaco, guardado como SHA-256, com rotação a cada uso.
 * Todos os tokens de uma sessão compartilham o `familyId`: se um token já
 * trocado for reutilizado, a família inteira é revogada.
 */
@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: AppConfigService,
  ) {}

  async issue(
    user: { id: string; roles: Role[] },
    meta: SessionMeta,
    familyId: string = randomUUID(),
  ): Promise<IssuedTokens & { refreshTokenId: string }> {
    const accessToken = await this.signAccess(user);
    const refreshToken = generateOpaqueToken();
    const refreshTokenExpiresAt = this.refreshExpiry();

    const record = await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: sha256(refreshToken),
        familyId,
        deviceName: meta.deviceName,
        ip: meta.ip,
        userAgent: meta.userAgent?.slice(0, 500),
        expiresAt: refreshTokenExpiresAt,
      },
      select: { id: true },
    });

    return {
      accessToken,
      accessTokenExpiresIn: this.config.get('JWT_ACCESS_TTL_SECONDS'),
      refreshToken,
      refreshTokenExpiresAt,
      refreshTokenId: record.id,
    };
  }

  /** Troca um refresh token por um novo par. Devolve também o id do usuário. */
  async rotate(rawToken: string, meta: SessionMeta): Promise<IssuedTokens & { userId: string }> {
    const current = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: sha256(rawToken) },
      include: {
        user: { select: { id: true, roles: true, isBlocked: true, deletedAt: true } },
      },
    });
    if (!current) throw AppException.unauthorized('auth.invalidRefreshToken');

    const verdict = classifyRefreshToken(current);
    if (verdict === 'reused') {
      await this.revokeFamily(current.familyId);
      this.logger.warn(
        { userId: current.userId, familyId: current.familyId },
        'reuso de refresh token: família revogada',
      );
      throw AppException.unauthorized('auth.refreshTokenReuse');
    }
    if (verdict !== 'valid') throw AppException.unauthorized('auth.invalidRefreshToken');

    const { user } = current;
    if (user.deletedAt) throw AppException.unauthorized('auth.invalidRefreshToken');
    if (user.isBlocked) {
      await this.revokeFamily(current.familyId);
      throw new AppException(HttpStatus.FORBIDDEN, 'auth.accountBlocked');
    }

    // "Reserva" atômica do token: só uma requisição concorrente consegue.
    const claimed = await this.prisma.refreshToken.updateMany({
      where: { id: current.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (claimed.count === 0) {
      await this.revokeFamily(current.familyId);
      throw AppException.unauthorized('auth.refreshTokenReuse');
    }

    const issued = await this.issue(
      user,
      { ...meta, deviceName: meta.deviceName ?? current.deviceName ?? undefined },
      current.familyId,
    );
    await this.prisma.refreshToken.update({
      where: { id: current.id },
      data: { replacedById: issued.refreshTokenId },
    });

    const { refreshTokenId: _ignored, ...tokens } = issued;
    return { ...tokens, userId: user.id };
  }

  /** Logout: revoga a sessão (família) do token informado. Idempotente. */
  async revoke(rawToken: string): Promise<void> {
    const token = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: sha256(rawToken) },
      select: { familyId: true },
    });
    if (token) await this.revokeFamily(token.familyId);
  }

  /** Encerra todas as sessões do usuário (troca de senha, bloqueio, exclusão). */
  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async revokeFamily(familyId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private signAccess(user: { id: string; roles: Role[] }): Promise<string> {
    const payload: AccessTokenPayload = { sub: user.id, roles: user.roles, typ: 'access' };
    return this.jwt.signAsync(payload);
  }

  private refreshExpiry(): Date {
    const days = this.config.get('REFRESH_TOKEN_TTL_DAYS');
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }
}
