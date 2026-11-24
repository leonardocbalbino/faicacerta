// Precisa ser o primeiro import: o QueueModule lê o .env quando o AppModule é carregado.
import 'dotenv/config';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { configureApp, setupSwagger } from './bootstrap.js';
import { AppConfigService } from './config/app-config.service.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });
  configureApp(app);

  const config = app.get(AppConfigService);
  if (!config.isProduction) setupSwagger(app);

  await app.listen(config.get('PORT'));
}

await bootstrap();
