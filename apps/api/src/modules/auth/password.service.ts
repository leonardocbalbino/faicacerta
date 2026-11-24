import { Injectable } from '@nestjs/common';
import argon2 from 'argon2';

/** Parâmetros Argon2id (OWASP 2024+: m=19 MiB, t=2, p=1 como mínimo). */
const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

@Injectable()
export class PasswordService {
  /** Hash usado para gastar o mesmo tempo quando o usuário não existe. */
  private dummyHash: Promise<string> | undefined;

  hash(password: string): Promise<string> {
    return argon2.hash(password, ARGON2_OPTIONS);
  }

  async verify(hash: string | null | undefined, password: string): Promise<boolean> {
    if (!hash) {
      // Evita enumeração de contas por diferença de tempo.
      this.dummyHash ??= this.hash('faixa-certa-dummy-password-0');
      await argon2.verify(await this.dummyHash, password).catch(() => false);
      return false;
    }
    try {
      return await argon2.verify(hash, password);
    } catch {
      return false;
    }
  }

  needsRehash(hash: string): boolean {
    return argon2.needsRehash(hash, ARGON2_OPTIONS);
  }
}
