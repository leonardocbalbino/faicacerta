import type { MailMessage } from '../mail/mail.types.js';

/** Nomes das filas do BullMQ. */
export const QUEUES = {
  media: 'media',
  mail: 'mail',
} as const;
export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];

/** Dados de cada job, por fila. */
export interface JobPayloads {
  media: { mediaId: string };
  mail: MailMessage;
}

/** Quem executa os jobs de uma fila (usado pelo worker e pelo driver inline). */
export interface JobHandler<Q extends QueueName> {
  handle(data: JobPayloads[Q]): Promise<void>;
}

/** Tokens de injeção dos handlers de cada fila. */
export const JOB_HANDLERS: Record<QueueName, symbol> = {
  media: Symbol('MEDIA_JOB_HANDLER'),
  mail: Symbol('MAIL_JOB_HANDLER'),
};
