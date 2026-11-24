import { HttpStatus, Injectable } from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';
import { AppConfigService } from '../../../config/app-config.service.js';
import { AppException } from '../../../common/errors/app.exception.js';
import { GoogleTokenVerifier, type SocialIdentity } from './social-identity.js';

/** Valida o `id_token` do Google (assinatura, emissor, audience e validade). */
@Injectable()
export class GoogleIdTokenVerifier extends GoogleTokenVerifier {
  private readonly client = new OAuth2Client();

  constructor(private readonly config: AppConfigService) {
    super();
  }

  async verify(idToken: string): Promise<SocialIdentity> {
    const audience = this.config.get('GOOGLE_CLIENT_IDS');
    if (!audience.length) {
      throw new AppException(HttpStatus.SERVICE_UNAVAILABLE, 'auth.socialNotConfigured');
    }

    let payload;
    try {
      const ticket = await this.client.verifyIdToken({ idToken, audience });
      payload = ticket.getPayload();
    } catch {
      throw AppException.unauthorized('auth.invalidSocialToken');
    }
    if (!payload?.sub) throw AppException.unauthorized('auth.invalidSocialToken');

    return {
      providerUserId: payload.sub,
      email: payload.email?.toLowerCase() ?? null,
      emailVerified: payload.email_verified === true,
      name: payload.name ?? null,
    };
  }
}
