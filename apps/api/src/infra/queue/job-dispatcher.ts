import { Injectable, Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import {
  JOB_HANDLERS,
  QUEUES,
  type JobHandler,
  type JobPayloads,
  type QueueName,
} from './queues.js';

/** Enfileira trabalho em segundo plano. */
export abstract class JobDispatcher {
  abstract dispatch<Q extends QueueName>(queue: Q, data: JobPayloads[Q]): Promise<void>;
}

const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 10_000 },
  removeOnComplete: { age: 24 * 3600, count: 1000 },
  removeOnFail: { age: 7 * 24 * 3600 },
} as const;

@Injectable()
export class BullJobDispatcher extends JobDispatcher {
  private readonly queues: Record<QueueName, Queue>;

  constructor(@InjectQueue(QUEUES.media) media: Queue, @InjectQueue(QUEUES.mail) mail: Queue) {
    super();
    this.queues = { media, mail };
  }

  async dispatch<Q extends QueueName>(queue: Q, data: JobPayloads[Q]): Promise<void> {
    await this.queues[queue].add(queue, data, DEFAULT_JOB_OPTIONS);
  }
}

/**
 * Executa o job na hora, no mesmo processo (testes e scripts). Erros do
 * handler são registrados e não chegam a quem enfileirou, como numa fila real.
 */
@Injectable()
export class InlineJobDispatcher extends JobDispatcher {
  private readonly logger = new Logger(InlineJobDispatcher.name);

  constructor(private readonly moduleRef: ModuleRef) {
    super();
  }

  async dispatch<Q extends QueueName>(queue: Q, data: JobPayloads[Q]): Promise<void> {
    const handler = this.moduleRef.get<JobHandler<Q>>(JOB_HANDLERS[queue], { strict: false });
    try {
      await handler.handle(data);
    } catch (err) {
      this.logger.error({ err, queue }, 'job inline falhou');
    }
  }
}
