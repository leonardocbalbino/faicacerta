import { Injectable, Logger } from '@nestjs/common';
import nodemailer, { type Transporter } from 'nodemailer';
import { AppConfigService } from '../../config/app-config.service.js';
import { JobDispatcher } from '../queue/job-dispatcher.js';
import type { JobHandler } from '../queue/queues.js';
import type { MailMessage } from './mail.types.js';

export type { MailMessage } from './mail.types.js';

/** Enfileira e-mails. A entrega acontece no worker, com retentativas. */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly jobs: JobDispatcher) {}

  async send(message: MailMessage): Promise<void> {
    try {
      await this.jobs.dispatch('mail', message);
    } catch (err) {
      // Falha ao enfileirar (ex.: Redis fora) não derruba a requisição.
      this.logger.error(
        { err, to: message.to, subject: message.subject },
        'falha ao enfileirar e-mail',
      );
    }
  }
}

/** Entrega por SMTP (Mailpit em desenvolvimento). Executado pelo worker. */
@Injectable()
export class MailDeliveryService implements JobHandler<'mail'> {
  private readonly transporter: Transporter;

  constructor(private readonly config: AppConfigService) {
    const user = config.get('SMTP_USER');
    this.transporter = nodemailer.createTransport({
      host: config.get('SMTP_HOST'),
      port: config.get('SMTP_PORT'),
      secure: config.get('SMTP_SECURE'),
      auth: user ? { user, pass: config.get('SMTP_PASSWORD') ?? '' } : undefined,
    });
  }

  async handle(message: MailMessage): Promise<void> {
    await this.transporter.sendMail({ from: this.config.get('MAIL_FROM'), ...message });
  }
}
