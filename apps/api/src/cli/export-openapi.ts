/**
 * Gera packages/shared/openapi.json a partir dos controllers, sem subir o
 * servidor nem conectar no banco. Roda a partir do build (dist/cli), porque
 * o Nest precisa dos metadados de decorators que o tsc emite. Depois, `openapi-typescript` gera os tipos
 * do cliente (pnpm api:openapi na raiz faz os dois passos).
 */
import './cli-env.js';
import 'reflect-metadata';
import { writeFileSync } from 'node:fs';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from '../app.module.js';
import { buildOpenApiDocument, configureApp } from '../bootstrap.js';

const app = await NestFactory.create<NestExpressApplication>(AppModule, { logger: false });
configureApp(app);
await app.init();

const document = buildOpenApiDocument(app);
const target = new URL('../../../../packages/shared/openapi.json', import.meta.url);
writeFileSync(target, `${JSON.stringify(document, null, 2)}\n`);
await app.close();

console.log(`OpenAPI exportado: ${Object.keys(document.paths).length} rotas → ${target.pathname}`);
