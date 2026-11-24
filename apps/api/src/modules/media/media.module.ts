import { Module } from '@nestjs/common';
import { JOB_HANDLERS } from '../../infra/queue/queues.js';
import { AdminMediaController, MediaController } from './media.controller.js';
import { MediaService } from './media.service.js';
import { FfmpegService } from './processing/ffmpeg.service.js';
import { MediaProcessingService } from './processing/media-processing.service.js';

@Module({
  controllers: [MediaController, AdminMediaController],
  providers: [
    MediaService,
    FfmpegService,
    MediaProcessingService,
    { provide: JOB_HANDLERS.media, useExisting: MediaProcessingService },
  ],
  exports: [MediaService, FfmpegService, JOB_HANDLERS.media],
})
export class MediaModule {}
