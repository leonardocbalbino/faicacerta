/** Identidade confirmada por um provedor externo (Google ou Apple). */
export interface SocialIdentity {
  providerUserId: string;
  email: string | null;
  emailVerified: boolean;
  name: string | null;
}

export abstract class GoogleTokenVerifier {
  abstract verify(idToken: string): Promise<SocialIdentity>;
}

export abstract class AppleTokenVerifier {
  abstract verify(identityToken: string, rawNonce?: string): Promise<SocialIdentity>;
}
