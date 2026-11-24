import { HttpStatus, Injectable } from '@nestjs/common';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { AppConfigService } from '../../../config/app-config.service.js';
import { safeEqual, sha256 } from '../../../common/crypto/tokens.js';
import { AppException } from '../../../common/errors/app.exception.js';
import { AppleTokenVerifier, type SocialIdentity } from './social-identity.js';

const APPLE_ISSUER = 'https://appleid.apple.com';
const APPLE_JWKS = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));

/**
 * Valida o `identityToken` do Sign in with Apple. O app envia ao Apple o
 * SHA-256 do nonce e manda o nonce puro para a API, que confere o hash.
 */
@Injectable()
export class AppleIdentityTokenVerifier extends AppleTokenVerifier {
  constructor(private readonly config: AppConfigService) {
    super();
  }

  async verify(identityToken: string, rawNonce?: string): Promise<SocialIdentity> {
    const audience = this.config.get('APPLE_CLIENT_IDS');
    if (!audience.length) {
      throw new AppException(HttpStatus.SERVICE_UNAVAILABLE, 'auth.socialNotConfigured');
    }

    let payload;
    try {
      ({ payload } = await jwtVerify(identityToken, APPLE_JWKS, {
        issuer: APPLE_ISSUER,
        audience,
      }));
    } catch {
      throw AppException.unauthorized('auth.invalidSocialToken');
    }

    if (!payload.sub) throw AppException.unauthorized('auth.invalidSocialToken');
    if (rawNonce !== undefined) {
      const tokenNonce = typeof payload.nonce === 'string' ? payload.nonce : '';
      if (!safeEqual(tokenNonce, sha256(rawNonce))) {
        throw AppException.unauthorized('auth.invalidSocialToken');
      }
    }

    const email = typeof payload.email === 'string' ? payload.email.toLowerCase() : null;
    // A Apple manda `email_verified` como boolean ou como a string "true".
    const verified = payload.email_verified === true || payload.email_verified === 'true';

    return { providerUserId: payload.sub, email, emailVerified: verified, name: null };
  }
}
