import { copyFile, mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import {
  StorageService,
  type BucketKind,
  type PresignedUpload,
  type StoredObjectInfo,
} from '../../src/infra/storage/storage.service.js';

/**
 * Storage em disco para os testes E2E. O "upload do cliente" é simulado com
 * `clientPut`, que faz o papel do PUT na URL pré-assinada.
 */
export class LocalStorageService extends StorageService {
  private root = '';
  private readonly types = new Map<string, string>();

  async init(): Promise<this> {
    this.root = await mkdtemp(join(tmpdir(), 'faixa-storage-'));
    return this;
  }

  async dispose(): Promise<void> {
    await rm(this.root, { recursive: true, force: true });
  }

  /** Simula o app enviando o arquivo para a URL pré-assinada. */
  async clientPut(bucket: BucketKind, key: string, body: Buffer, contentType: string) {
    const path = this.path(bucket, key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, body);
    this.types.set(path, contentType);
  }

  async read(bucket: BucketKind, key: string): Promise<Buffer> {
    return readFile(this.path(bucket, key));
  }

  async presignUpload(
    bucket: BucketKind,
    key: string,
    contentType: string,
  ): Promise<PresignedUpload> {
    return {
      url: `local://${bucket}/${key}`,
      headers: { 'Content-Type': contentType },
      expiresAt: new Date(Date.now() + 900_000),
    };
  }

  async head(bucket: BucketKind, key: string): Promise<StoredObjectInfo | null> {
    const path = this.path(bucket, key);
    try {
      const s = await stat(path);
      return { sizeBytes: s.size, contentType: this.types.get(path) };
    } catch {
      return null;
    }
  }

  async download(bucket: BucketKind, key: string, toPath: string): Promise<void> {
    await copyFile(this.path(bucket, key), toPath);
  }

  async upload(bucket: BucketKind, key: string, fromPath: string, contentType: string) {
    const path = this.path(bucket, key);
    await mkdir(dirname(path), { recursive: true });
    await copyFile(fromPath, path);
    this.types.set(path, contentType);
  }

  async delete(bucket: BucketKind, keys: string[]): Promise<void> {
    await Promise.all(keys.map((k) => rm(this.path(bucket, k), { force: true })));
  }

  async readUrl(bucket: BucketKind, key: string): Promise<string> {
    return bucket === 'public'
      ? `http://cdn.test/${key}`
      : `http://storage.test/${bucket}/${key}?signed=1`;
  }

  private path(bucket: BucketKind, key: string): string {
    return join(this.root, bucket, key);
  }
}
