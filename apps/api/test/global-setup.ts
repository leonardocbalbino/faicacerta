import { execSync } from 'node:child_process';
import { loadTestEnv } from './load-test-env.js';

/** Aplica as migrations no banco de teste antes da suíte. */
export default function setup(): void {
  loadTestEnv();
  execSync('pnpm exec prisma migrate deploy', {
    stdio: 'inherit',
    env: process.env,
    cwd: new URL('..', import.meta.url),
  });
}
