import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

/**
 * Cifra segredos guardados no banco (credenciais do gateway) com AES-256-GCM.
 * Formato: base64url(iv[12] | tag[16] | texto cifrado), prefixado com "v1.".
 * A chave (32 bytes) vem de DATA_ENCRYPTION_KEY.
 */
export class SecretBox {
  private readonly key: Buffer;

  constructor(base64Key: string) {
    this.key = Buffer.from(base64Key, 'base64');
    if (this.key.length !== 32) throw new Error('DATA_ENCRYPTION_KEY precisa ter 32 bytes');
  }

  seal(plain: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    return `v1.${Buffer.concat([iv, cipher.getAuthTag(), data]).toString('base64url')}`;
  }

  open(sealed: string): string {
    if (!sealed.startsWith('v1.')) throw new Error('Formato de segredo desconhecido');
    const raw = Buffer.from(sealed.slice(3), 'base64url');
    const decipher = createDecipheriv('aes-256-gcm', this.key, raw.subarray(0, 12));
    decipher.setAuthTag(raw.subarray(12, 28));
    return Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString('utf8');
  }
}
