import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { PasswordService } from './password.service.js';
import { AppleIdentityTokenVerifier } from './social/apple.verifier.js';
import { GoogleIdTokenVerifier } from './social/google.verifier.js';
import { AppleTokenVerifier, GoogleTokenVerifier } from './social/social-identity.js';
import { TokenService } from './token.service.js';

@Module({
  imports: [UsersModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordService,
    TokenService,
    { provide: GoogleTokenVerifier, useClass: GoogleIdTokenVerifier },
    { provide: AppleTokenVerifier, useClass: AppleIdentityTokenVerifier },
  ],
  exports: [TokenService, PasswordService],
})
export class AuthModule {}
