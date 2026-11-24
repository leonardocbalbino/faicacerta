import { config } from 'dotenv';

let loaded = false;

/**
 * Carrega o .env e aponta para o banco de teste. Usado pelo globalSetup
 * (migrations) e pelo setupFiles (cada arquivo de teste).
 */
export function loadTestEnv(): void {
  if (loaded) return;
  loaded = true;

  config({ quiet: true });
  const testUrl = process.env.DATABASE_URL_TEST;
  if (!testUrl) {
    throw new Error('Defina DATABASE_URL_TEST no .env para rodar os testes E2E.');
  }
  // Proteção: os testes apagam todas as tabelas.
  // (O worker herda o DATABASE_URL já trocado pelo globalSetup, então a
  // checagem é pelo nome do banco.)
  if (!/test/i.test(new URL(testUrl).pathname)) {
    throw new Error('DATABASE_URL_TEST precisa ser um banco separado, com "test" no nome.');
  }
  process.env.DATABASE_URL = testUrl;
  process.env.NODE_ENV = 'test';
  process.env.THROTTLE_DISABLED = 'true';
  process.env.QUEUE_DRIVER = 'inline';
  process.env.GOOGLE_CLIENT_IDS ||= 'test-google-client';
  process.env.APPLE_CLIENT_IDS ||= 'test.apple.client';
}
