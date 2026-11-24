import { Body, Controller, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import {
  ApiAcceptedResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  appleLoginSchema,
  authTokensSchema,
  googleLoginSchema,
  loginSchema,
  logoutSchema,
  passwordResetConfirmSchema,
  passwordResetRequestSchema,
  refreshSchema,
  registerSchema,
  verifyEmailSchema,
  type AppleLoginInput,
  type AuthTokens,
  type GoogleLoginInput,
  type LoginInput,
  type LogoutInput,
  type PasswordResetConfirmInput,
  type PasswordResetRequestInput,
  type RefreshInput,
  type RegisterInput,
  type VerifyEmailInput,
} from '@faixa-certa/shared';
import type { Request } from 'express';
import type { AuthUser } from '../../common/auth/auth-user.js';
import { CurrentUser, Public } from '../../common/auth/decorators.js';
import { AuthService } from './auth.service.js';
import type { SessionMeta } from './token.service.js';

/** Limite mais rígido para rotas sensíveis a força bruta. */
const AUTH_THROTTLE = { default: { limit: 10, ttl: 60_000 } };

function sessionMeta(req: Request, deviceName?: string): SessionMeta {
  return { deviceName, ip: req.ip, userAgent: req.get('user-agent') };
}

@ApiTags('Autenticação')
@Controller('auth')
@Throttle(AUTH_THROTTLE)
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('register')
  @ApiCreatedResponse({
    description: 'Conta criada e sessão iniciada',
    standardSchema: authTokensSchema,
  })
  register(
    @Body({ schema: registerSchema }) body: RegisterInput,
    @Req() req: Request,
  ): Promise<AuthTokens> {
    return this.auth.register(body, sessionMeta(req, body.deviceName));
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ standardSchema: authTokensSchema })
  login(@Body({ schema: loginSchema }) body: LoginInput, @Req() req: Request): Promise<AuthTokens> {
    return this.auth.login(body, sessionMeta(req, body.deviceName));
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiOkResponse({ description: 'Novo par de tokens (rotação)', standardSchema: authTokensSchema })
  refresh(
    @Body({ schema: refreshSchema }) body: RefreshInput,
    @Req() req: Request,
  ): Promise<AuthTokens> {
    return this.auth.refresh(body.refreshToken, sessionMeta(req));
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Sessão encerrada' })
  async logout(@Body({ schema: logoutSchema }) body: LogoutInput): Promise<void> {
    await this.auth.logout(body.refreshToken);
  }

  @Public()
  @Post('google')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ standardSchema: authTokensSchema })
  google(
    @Body({ schema: googleLoginSchema }) body: GoogleLoginInput,
    @Req() req: Request,
  ): Promise<AuthTokens> {
    return this.auth.loginWithGoogle(body.idToken, sessionMeta(req, body.deviceName));
  }

  @Public()
  @Post('apple')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ standardSchema: authTokensSchema })
  apple(
    @Body({ schema: appleLoginSchema }) body: AppleLoginInput,
    @Req() req: Request,
  ): Promise<AuthTokens> {
    return this.auth.loginWithApple(
      body.identityToken,
      body.nonce,
      body.fullName,
      sessionMeta(req, body.deviceName),
    );
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'E-mail confirmado' })
  async verifyEmail(@Body({ schema: verifyEmailSchema }) body: VerifyEmailInput): Promise<void> {
    await this.auth.verifyEmail(body.token);
  }

  @Post('verify-email/resend')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiNoContentResponse({ description: 'Novo e-mail de confirmação enviado' })
  async resendVerification(@CurrentUser() user: AuthUser): Promise<void> {
    await this.auth.resendEmailVerification(user.id);
  }

  @Public()
  @Post('password/forgot')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiAcceptedResponse({ description: 'Instruções enviadas, se o e-mail existir' })
  async forgotPassword(
    @Body({ schema: passwordResetRequestSchema }) body: PasswordResetRequestInput,
  ): Promise<{ message: string }> {
    await this.auth.requestPasswordReset(body.email);
    return {
      message: 'Se o e-mail estiver cadastrado, enviamos as instruções para redefinir a senha.',
    };
  }

  @Public()
  @Post('password/reset')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Senha redefinida; todas as sessões foram encerradas' })
  async resetPassword(
    @Body({ schema: passwordResetConfirmSchema }) body: PasswordResetConfirmInput,
  ): Promise<void> {
    await this.auth.confirmPasswordReset(body.token, body.password);
  }
}
