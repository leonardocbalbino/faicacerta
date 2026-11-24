// Processo só de worker (sem HTTP). Em produção: API com WORKERS_ENABLED=false
// e este processo com WORKERS_ENABLED=true, a partir da mesma imagem.
import 'dotenv/config';
import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Logger as PinoLogger } from 'nestjs-pino';
import { AppModule } from './app.module.js';
import { FfmpegService } from './modules/media/processing/ffmpeg.service.js';

process.env.WORKERS_ENABLED = 'true';

const app = await NestFactory.createApplicationContext(AppModule, { bufferLogs: true });
app.useLogger(app.get(PinoLogger));
app.enableShutdownHooks();

if (!(await app.get(FfmpegService).isAvailable())) {
  new Logger('Worker').warn(
    'ffmpeg não encontrado: o processamento de vídeo vai falhar (FFMPEG_PATH).',
  );
}
new Logger('Worker').log('worker iniciado');
