import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

/** Token opaco aleatório, seguro para URL (256 bits). */
export function generateOpaqueToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

/** SHA-256 em hex. Usado para guardar tokens no banco sem o valor original. */
export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}
