import { HttpStatus, Injectable } from '@nestjs/common';
import {
  isMinor,
  t,
  type AuthTokens,
  type LoginInput,
  type RegisterInput,
} from '@faixa-certa/shared';
import { AppConfigService } from '../../config/app-config.service.js';
import { generateOpaqueToken, sha256 } from '../../common/crypto/tokens.js';
import { AppException } from '../../common/errors/app.exception.js';
import { AuthProviderType, Prisma, VerificationTokenType } from '../../generated/prisma/client.js';
import { MailService } from '../../infra/mail/mail.service.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { meInclude, type UserWithMeRelations } from '../users/user.mapper.js';
import { UsersService } from '../users/users.service.js';
import { PasswordService } from './password.service.js';
import {
  AppleTokenVerifier,
  GoogleTokenVerifier,
  type SocialIdentity,
} from './social/social-identity.js';
import { TokenService, type SessionMeta } from './token.service.js';

const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;
const DEFAULT_DISPLAY_NAME = 'Judoca';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly tokens: TokenService,
    private readonly users: UsersService,
    private readonly mail: MailService,
    private readonly config: AppConfigService,
    private readonly google: GoogleTokenVerifier,
    private readonly apple: AppleTokenVerifier,
  ) {}

  // ---------------------------------------------------------------------------
  // E-mail e senha
  // ---------------------------------------------------------------------------

  async register(input: RegisterInput, meta: SessionMeta): Promise<AuthTokens> {
    const exists = await this.prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true },
    });
    if (exists) throw AppException.conflict('auth.emailInUse');

    const minor = isMinor(input.birthDate);
    const passwordHash = await this.passwords.hash(input.password);

    let user: UserWithMeRelations;
    try {
      user = await this.prisma.user.create({
        data: {
          email: input.email,
          name: input.name,
          passwordHash,
          birthDate: new Date(`${input.birthDate}T00:00:00.000Z`),
          guardianName: minor ? input.guardian?.name : null,
          guardianEmail: minor ? input.guardian?.email : null,
          guardianConsentAt: minor ? new Date() : null,
          authProviders: {
            create: { provider: AuthProviderType.EMAIL, providerUserId: input.email },
          },
        },
        include: meInclude,
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw AppException.conflict('auth.emailInUse');
      }
      throw err;
    }

    await this.sendEmailVerification(user.id, input.email, user.name);
    if (minor && input.guardian) {
      await this.mail.send({
        to: input.guardian.email,
        subject: t('mail.guardianNotice.subject', { name: user.name }),
        text: t('mail.guardianNotice.body', { name: user.name, guardian: input.guardian.name }),
      });
    }

    return this.startSession(user, meta);
  }

  async login(input: LoginInput, meta: SessionMeta): Promise<AuthTokens> {
    const user = await this.prisma.user.findFirst({
      where: { email: input.email, deletedAt: null },
      include: meInclude,
    });
    const ok = await this.passwords.verify(user?.passwordHash, input.password);
    if (!user || !ok) throw AppException.unauthorized('auth.invalidCredentials');
    this.assertNotBlocked(user);

    if (user.passwordHash && this.passwords.needsRehash(user.passwordHash)) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: await this.passwords.hash(input.password) },
      });
    }

    return this.startSession(user, meta);
  }

  async refresh(refreshToken: string, meta: SessionMeta): Promise<AuthTokens> {
    const rotated = await this.tokens.rotate(refreshToken, meta);
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: rotated.userId },
      include: meInclude,
    });
    return {
      accessToken: rotated.accessToken,
      accessTokenExpiresIn: rotated.accessTokenExpiresIn,
      refreshToken: rotated.refreshToken,
      refreshTokenExpiresAt: rotated.refreshTokenExpiresAt.toISOString(),
      user: this.users.toMe(user),
    };
  }

  logout(refreshToken: string): Promise<void> {
    return this.tokens.revoke(refreshToken);
  }

  // ---------------------------------------------------------------------------
  // Login social
  // ---------------------------------------------------------------------------

  async loginWithGoogle(idToken: string, meta: SessionMeta): Promise<AuthTokens> {
    const identity = await this.google.verify(idToken);
    return this.loginWithIdentity(AuthProviderType.GOOGLE, identity, meta);
  }

  async loginWithApple(
    identityToken: string,
    rawNonce: string | undefined,
    fullName: string | undefined,
    meta: SessionMeta,
  ): Promise<AuthTokens> {
    const identity = await this.apple.verify(identityToken, rawNonce);
    return this.loginWithIdentity(
      AuthProviderType.APPLE,
      { ...identity, name: identity.name ?? fullName ?? null },
      meta,
    );
  }

  /**
   * 1. Já existe vínculo com o provedor → entra.
   * 2. E-mail verificado pelo provedor e já cadastrado → vincula à conta existente.
   * 3. Caso contrário → cria uma conta nova.
   * Um e-mail NÃO verificado pelo provedor nunca é vinculado a uma conta existente.
   */
  private async loginWithIdentity(
    provider: AuthProviderType,
    identity: SocialIdentity,
    meta: SessionMeta,
  ): Promise<AuthTokens> {
    const link = await this.prisma.authProvider.findUnique({
      where: {
        provider_providerUserId: { provider, providerUserId: identity.providerUserId },
      },
      include: { user: { include: meInclude } },
    });

    let user = link?.user;
    if (user?.deletedAt) throw AppException.unauthorized('auth.invalidSocialToken');

    if (!user && identity.email) {
      const byEmail = await this.prisma.user.findUnique({
        where: { email: identity.email },
        include: meInclude,
      });
      if (byEmail) {
        if (!identity.emailVerified || byEmail.deletedAt) {
          throw new AppException(HttpStatus.CONFLICT, 'auth.socialEmailNotVerified');
        }
        user = await this.prisma.user.update({
          where: { id: byEmail.id },
          data: {
            emailVerifiedAt: byEmail.emailVerifiedAt ?? new Date(),
            authProviders: { create: { provider, providerUserId: identity.providerUserId } },
          },
          include: meInclude,
        });
      }
    }

    user ??= await this.prisma.user.create({
      data: {
        email: identity.email,
        emailVerifiedAt: identity.email && identity.emailVerified ? new Date() : null,
        name: identity.name?.trim() || DEFAULT_DISPLAY_NAME,
        authProviders: { create: { provider, providerUserId: identity.providerUserId } },
      },
      include: meInclude,
    });

    this.assertNotBlocked(user);
    return this.startSession(user, meta);
  }

  // ---------------------------------------------------------------------------
  // Verificação de e-mail e redefinição de senha
  // ---------------------------------------------------------------------------

  async resendEmailVerification(userId: string): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { id: true, email: true, name: true, emailVerifiedAt: true },
    });
    if (!user?.email || user.emailVerifiedAt) return;
    await this.sendEmailVerification(user.id, user.email, user.name);
  }

  async verifyEmail(rawToken: string): Promise<void> {
    const token = await this.consumeToken(rawToken, VerificationTokenType.EMAIL_VERIFICATION);
    await this.prisma.user.update({
      where: { id: token.userId },
      data: { emailVerifiedAt: new Date() },
    });
  }

  /** Sempre responde igual, exista ou não a conta (evita enumeração). */
  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: { email, deletedAt: null, isBlocked: false },
      select: { id: true, email: true, name: true },
    });
    if (!user?.email) return;

    const raw = await this.createToken(
      user.id,
      VerificationTokenType.PASSWORD_RESET,
      PASSWORD_RESET_TTL_MS,
    );
    const link = `${this.config.get('WEB_APP_URL')}/redefinir-senha?token=${raw}`;
    await this.mail.send({
      to: user.email,
      subject: t('mail.passwordReset.subject'),
      text: t('mail.passwordReset.body', { name: user.name, link }),
    });
  }

  async confirmPasswordReset(rawToken: string, newPassword: string): Promise<void> {
    const token = await this.consumeToken(rawToken, VerificationTokenType.PASSWORD_RESET);
    const passwordHash = await this.passwords.hash(newPassword);
    const user = await this.prisma.user.update({
      where: { id: token.userId },
      // Quem recebeu o link no e-mail comprovou que o e-mail é dele.
      data: { passwordHash, emailVerifiedAt: new Date() },
      select: { id: true, email: true },
    });
    if (user.email) {
      await this.prisma.authProvider.upsert({
        where: { userId_provider: { userId: user.id, provider: AuthProviderType.EMAIL } },
        create: { userId: user.id, provider: AuthProviderType.EMAIL, providerUserId: user.email },
        update: {},
      });
    }
    await this.tokens.revokeAllForUser(user.id);
  }

  // ---------------------------------------------------------------------------
  // Auxiliares
  // ---------------------------------------------------------------------------

  private async startSession(user: UserWithMeRelations, meta: SessionMeta): Promise<AuthTokens> {
    const issued = await this.tokens.issue(user, meta);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastActiveAt: new Date() },
    });
    return {
      accessToken: issued.accessToken,
      accessTokenExpiresIn: issued.accessTokenExpiresIn,
      refreshToken: issued.refreshToken,
      refreshTokenExpiresAt: issued.refreshTokenExpiresAt.toISOString(),
      user: this.users.toMe(user),
    };
  }

  private assertNotBlocked(user: { isBlocked: boolean }): void {
    if (user.isBlocked) throw new AppException(HttpStatus.FORBIDDEN, 'auth.accountBlocked');
  }

  private async sendEmailVerification(userId: string, email: string, name: string) {
    const raw = await this.createToken(
      userId,
      VerificationTokenType.EMAIL_VERIFICATION,
      EMAIL_VERIFICATION_TTL_MS,
    );
    const link = `${this.config.get('WEB_APP_URL')}/verificar-email?token=${raw}`;
    await this.mail.send({
      to: email,
      subject: t('mail.verifyEmail.subject'),
      text: t('mail.verifyEmail.body', { name, link }),
    });
  }

  /** Cria um token de uso único e invalida os anteriores do mesmo tipo. */
  private async createToken(
    userId: string,
    type: VerificationTokenType,
    ttlMs: number,
  ): Promise<string> {
    const raw = generateOpaqueToken();
    await this.prisma.$transaction([
      this.prisma.verificationToken.updateMany({
        where: { userId, type, usedAt: null },
        data: { usedAt: new Date() },
      }),
      this.prisma.verificationToken.create({
        data: { userId, type, tokenHash: sha256(raw), expiresAt: new Date(Date.now() + ttlMs) },
      }),
    ]);
    return raw;
  }

  /** Marca o token como usado de forma atômica (não pode ser usado duas vezes). */
  private async consumeToken(raw: string, type: VerificationTokenType) {
    const token = await this.prisma.verificationToken.findUnique({
      where: { tokenHash: sha256(raw) },
    });
    if (!token || token.type !== type || token.usedAt || token.expiresAt <= new Date()) {
      throw AppException.badRequest('auth.invalidOrExpiredToken');
    }
    const { count } = await this.prisma.verificationToken.updateMany({
      where: { id: token.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    if (count === 0) throw AppException.badRequest('auth.invalidOrExpiredToken');
    return token;
  }
}
