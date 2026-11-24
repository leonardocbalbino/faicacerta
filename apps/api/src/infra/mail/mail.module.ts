import { Global, Module } from '@nestjs/common';
import { JOB_HANDLERS } from '../queue/queues.js';
import { MailDeliveryService, MailService } from './mail.service.js';

@Global()
@Module({
  providers: [
    MailService,
    MailDeliveryService,
    { provide: JOB_HANDLERS.mail, useExisting: MailDeliveryService },
  ],
  exports: [MailService, JOB_HANDLERS.mail],
})
export class MailModule {}
