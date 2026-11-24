import type { INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule, type OpenAPIObject } from '@nestjs/swagger';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { AppConfigService } from './config/app-config.service.js';

/** Rotas fora do prefixo /v1. */
const UNVERSIONED = ['health', 'health/ready'];

/**
 * Configuração comum ao servidor, aos testes E2E e à exportação do OpenAPI.
 * Mantém tudo num lugar só para os testes rodarem com o mesmo pipeline.
 */
export function configureApp(app: NestExpressApplication): void {
  const config = app.get(AppConfigService);

  app.useLogger(app.get(Logger));
  app.set('trust proxy', 1);
  app.setGlobalPrefix('v1', { exclude: UNVERSIONED });
  app.use(helmet());
  app.enableCors({
    origin: config.get('CORS_ORIGINS'),
    credentials: false,
    exposedHeaders: ['x-request-id', 'etag'],
  });
  app.enableShutdownHooks();
}

export function buildOpenApiDocument(app: INestApplication): OpenAPIObject {
  const doc = new DocumentBuilder()
    .setTitle('Faixa Certa API')
    .setDescription('API do app Faixa Certa (apostila digital por faixa para exames de judô).')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  return SwaggerModule.createDocument(app, doc, {
    operationIdFactory: (controllerKey, methodKey) =>
      `${controllerKey.replace(/Controller$/, '')}_${methodKey}`,
  });
}

export function setupSwagger(app: INestApplication): void {
  SwaggerModule.setup('docs', app, () => buildOpenApiDocument(app), {
    jsonDocumentUrl: 'docs/openapi.json',
  });
}
