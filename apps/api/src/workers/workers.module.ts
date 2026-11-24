import { Inject, Logger, Module } from '@nestjs/common';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { JOB_HANDLERS, QUEUES, type JobHandler } from '../infra/queue/queues.js';
import { MediaModule } from '../modules/media/media.module.js';

@Processor(QUEUES.media, { concurrency: 2 })
export class MediaWorker extends WorkerHost {
  private readonly logger = new Logger(MediaWorker.name);

  constructor(@Inject(JOB_HANDLERS.media) private readonly handler: JobHandler<'media'>) {
    super();
  }

  process(job: Job<{ mediaId: string }>): Promise<void> {
    return this.handler.handle(job.data);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job | undefined, err: Error) {
    this.logger.warn(
      { jobId: job?.id, attempts: job?.attemptsMade, err },
      'processamento de mídia falhou',
    );
  }
}

@Processor(QUEUES.mail, { concurrency: 5 })
export class MailWorker extends WorkerHost {
  constructor(@Inject(JOB_HANDLERS.mail) private readonly handler: JobHandler<'mail'>) {
    super();
  }

  process(job: Job): Promise<void> {
    return this.handler.handle(job.data);
  }
}

/**
 * Workers do BullMQ. Só é carregado com QUEUE_DRIVER=bullmq e
 * WORKERS_ENABLED=true (ver AppModule), o que permite rodar API e worker
 * em processos separados com a mesma imagem.
 */
@Module({
  imports: [MediaModule],
  providers: [MediaWorker, MailWorker],
})
export class WorkersModule {}
