import { createReadStream, createWriteStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';
import type { Readable } from 'node:stream';
import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import {
  CreateBucketCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutBucketCorsCommand,
  PutBucketPolicyCommand,
  PutObjectCommand,
  S3Client,
  type S3ClientConfig,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { AppConfigService } from '../../config/app-config.service.js';
import {
  StorageService,
  type BucketKind,
  type PresignedUpload,
  type StoredObjectInfo,
} from './storage.service.js';

const IMMUTABLE_CACHE = 'public, max-age=31536000, immutable';

@Injectable()
export class S3StorageService extends StorageService implements OnApplicationBootstrap {
  private readonly logger = new Logger(S3StorageService.name);
  /** Cliente usado pela API para falar com o storage (rede interna). */
  private readonly client: S3Client;
  /** Cliente usado só para assinar URLs entregues aos apps (endpoint público). */
  private readonly presignClient: S3Client;

  constructor(private readonly config: AppConfigService) {
    super();
    const base: S3ClientConfig = {
      region: config.get('S3_REGION'),
      forcePathStyle: config.get('S3_FORCE_PATH_STYLE'),
      credentials: {
        accessKeyId: config.get('S3_ACCESS_KEY_ID'),
        secretAccessKey: config.get('S3_SECRET_ACCESS_KEY'),
      },
      // Servidores S3 compatíveis nem sempre aceitam o checksum padrão do SDK v3.
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    };
    this.client = new S3Client({ ...base, endpoint: config.get('S3_ENDPOINT') });
    this.presignClient = new S3Client({
      ...base,
      endpoint: config.get('S3_PUBLIC_ENDPOINT') ?? config.get('S3_ENDPOINT'),
    });
  }

  async onApplicationBootstrap(): Promise<void> {
    const auto = this.config.get('S3_AUTO_CREATE_BUCKETS') ?? !this.config.isProduction;
    if (!auto) return;
    try {
      await this.ensureBucket(this.bucketName('public'), true);
      await this.ensureBucket(this.bucketName('private'), false);
    } catch (err) {
      // Não impede a API de subir: o upload vai falhar com erro claro depois.
      this.logger.error({ err }, 'não foi possível preparar os buckets do storage');
    }
  }

  async presignUpload(
    bucket: BucketKind,
    key: string,
    contentType: string,
    contentLength: number,
  ): Promise<PresignedUpload> {
    const ttl = this.config.get('UPLOAD_URL_TTL_SECONDS');
    const cacheControl = bucket === 'public' ? IMMUTABLE_CACHE : 'private, max-age=0';
    const command = new PutObjectCommand({
      Bucket: this.bucketName(bucket),
      Key: key,
      ContentType: contentType,
      ContentLength: contentLength,
      CacheControl: cacheControl,
    });
    const url = await getSignedUrl(this.presignClient, command, {
      expiresIn: ttl,
      // Tipo e tamanho entram na assinatura: o cliente não pode trocar.
      signableHeaders: new Set(['content-type', 'content-length', 'cache-control']),
    });
    return {
      url,
      headers: { 'Content-Type': contentType, 'Cache-Control': cacheControl },
      expiresAt: new Date(Date.now() + ttl * 1000),
    };
  }

  async head(bucket: BucketKind, key: string): Promise<StoredObjectInfo | null> {
    try {
      const res = await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucketName(bucket), Key: key }),
      );
      return { sizeBytes: res.ContentLength ?? 0, contentType: res.ContentType };
    } catch (err) {
      if (isNotFound(err)) return null;
      throw err;
    }
  }

  async download(bucket: BucketKind, key: string, toPath: string): Promise<void> {
    const res = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucketName(bucket), Key: key }),
    );
    if (!res.Body) throw new Error(`Objeto vazio: ${key}`);
    await pipeline(res.Body as Readable, createWriteStream(toPath));
  }

  async upload(
    bucket: BucketKind,
    key: string,
    fromPath: string,
    contentType: string,
    cacheControl = bucket === 'public' ? IMMUTABLE_CACHE : 'private, max-age=0',
  ): Promise<void> {
    const { size } = await stat(fromPath);
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucketName(bucket),
        Key: key,
        Body: createReadStream(fromPath),
        ContentLength: size,
        ContentType: contentType,
        CacheControl: cacheControl,
      }),
    );
  }

  async delete(bucket: BucketKind, keys: string[]): Promise<void> {
    if (!keys.length) return;
    await this.client.send(
      new DeleteObjectsCommand({
        Bucket: this.bucketName(bucket),
        Delete: { Objects: keys.map((Key) => ({ Key })), Quiet: true },
      }),
    );
  }

  async readUrl(bucket: BucketKind, key: string): Promise<string> {
    if (bucket === 'public') {
      return `${this.config.get('CDN_PUBLIC_BASE_URL').replace(/\/$/, '')}/${key}`;
    }
    return getSignedUrl(
      this.presignClient,
      new GetObjectCommand({ Bucket: this.bucketName(bucket), Key: key }),
      { expiresIn: this.config.get('SIGNED_URL_TTL_SECONDS') },
    );
  }

  private bucketName(kind: BucketKind): string {
    return kind === 'public'
      ? this.config.get('S3_BUCKET_PUBLIC')
      : this.config.get('S3_BUCKET_PRIVATE');
  }

  private async ensureBucket(name: string, publicRead: boolean): Promise<void> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: name }));
    } catch (err) {
      if (!isNotFound(err)) throw err;
      await this.client.send(new CreateBucketCommand({ Bucket: name }));
      this.logger.log(`bucket criado: ${name}`);
    }
    if (publicRead) {
      await this.client.send(
        new PutBucketPolicyCommand({
          Bucket: name,
          Policy: JSON.stringify({
            Version: '2012-10-17',
            Statement: [
              {
                Sid: 'PublicRead',
                Effect: 'Allow',
                Principal: '*',
                Action: ['s3:GetObject'],
                Resource: [`arn:aws:s3:::${name}/*`],
              },
            ],
          }),
        }),
      );
    }
    await this.ensureCors(name);
  }

  /**
   * O painel envia arquivos do navegador direto para o storage (PUT
   * pré-assinado): o bucket precisa liberar CORS para a origem do painel.
   * Nem todo servidor S3 compatível suporta; nesse caso só registra o aviso.
   */
  private async ensureCors(name: string): Promise<void> {
    const origins = this.config.get('CORS_ORIGINS');
    if (!origins.length) return;
    try {
      await this.client.send(
        new PutBucketCorsCommand({
          Bucket: name,
          CORSConfiguration: {
            CORSRules: [
              {
                AllowedOrigins: origins,
                AllowedMethods: ['PUT', 'GET', 'HEAD'],
                AllowedHeaders: ['*'],
                ExposeHeaders: ['ETag'],
                MaxAgeSeconds: 3600,
              },
            ],
          },
        }),
      );
    } catch (err) {
      this.logger.warn({ err, bucket: name }, 'não foi possível configurar CORS do bucket');
    }
  }
}

function isNotFound(err: unknown): boolean {
  const e = err as { name?: string; $metadata?: { httpStatusCode?: number } };
  return (
    e?.name === 'NotFound' ||
    e?.name === 'NoSuchKey' ||
    e?.name === 'NoSuchBucket' ||
    e?.$metadata?.httpStatusCode === 404
  );
}
