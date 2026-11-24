import { DynamicModule, Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AppConfigService } from '../../config/app-config.service.js';
import { BullJobDispatcher, InlineJobDispatcher, JobDispatcher } from './job-dispatcher.js';
import { QUEUES } from './queues.js';

/** Converte `redis://[:senha@]host:porta[/db]` nas opções do ioredis. */
export function redisOptionsFromUrl(url: string) {
  const u = new URL(url);
  return {
    host: u.hostname,
    port: Number(u.port || 6379),
    username: u.username || undefined,
    password: u.password ? decodeURIComponent(u.password) : undefined,
    db: u.pathname.length > 1 ? Number(u.pathname.slice(1)) : undefined,
    tls: u.protocol === 'rediss:' ? {} : undefined,
    // Exigido pelo BullMQ para conexões de workers.
    maxRetriesPerRequest: null,
  };
}

/**
 * Fila de jobs. O driver é lido de QUEUE_DRIVER no boot (o main.ts carrega o
 * .env antes): `bullmq` usa Redis; `inline` executa na hora, sem Redis.
 */
@Global()
@Module({})
export class QueueModule {
  static forRoot(): DynamicModule {
    if (process.env.QUEUE_DRIVER === 'inline') {
      return {
        module: QueueModule,
        providers: [
          InlineJobDispatcher,
          { provide: JobDispatcher, useExisting: InlineJobDispatcher },
        ],
        exports: [JobDispatcher],
      };
    }
    return {
      module: QueueModule,
      imports: [
        BullModule.forRootAsync({
          inject: [AppConfigService],
          useFactory: (config: AppConfigService) => ({
            connection: redisOptionsFromUrl(config.get('REDIS_URL')),
            prefix: 'faixa-certa',
          }),
        }),
        BullModule.registerQueue({ name: QUEUES.media }, { name: QUEUES.mail }),
      ],
      providers: [BullJobDispatcher, { provide: JobDispatcher, useExisting: BullJobDispatcher }],
      exports: [JobDispatcher, BullModule],
    };
  }
}
