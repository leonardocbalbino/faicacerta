/** Bucket lógico: público (atrás da CDN) ou privado (só URL assinada). */
export type BucketKind = 'public' | 'private';

export interface PresignedUpload {
  url: string;
  /** Cabeçalhos assinados que o cliente precisa reenviar no PUT. */
  headers: Record<string, string>;
  expiresAt: Date;
}

export interface StoredObjectInfo {
  sizeBytes: number;
  contentType: string | undefined;
}

/**
 * Porta de armazenamento de objetos. A implementação de produção é S3
 * (RustFS em desenvolvimento); os testes usam uma em disco.
 */
export abstract class StorageService {
  /** URL pré-assinada para o cliente enviar o arquivo direto ao storage (PUT). */
  abstract presignUpload(
    bucket: BucketKind,
    key: string,
    contentType: string,
    contentLength: number,
  ): Promise<PresignedUpload>;

  /** Metadados do objeto, ou null se ele não existir. */
  abstract head(bucket: BucketKind, key: string): Promise<StoredObjectInfo | null>;

  abstract download(bucket: BucketKind, key: string, toPath: string): Promise<void>;

  abstract upload(
    bucket: BucketKind,
    key: string,
    fromPath: string,
    contentType: string,
    cacheControl?: string,
  ): Promise<void>;

  abstract delete(bucket: BucketKind, keys: string[]): Promise<void>;

  /** URL de leitura: pública (CDN) ou assinada com expiração (privada). */
  abstract readUrl(bucket: BucketKind, key: string): Promise<string>;
}
