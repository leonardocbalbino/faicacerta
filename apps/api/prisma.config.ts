import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed/index.ts',
  },
  datasource: {
    // Sem `env()`: o `prisma generate` (postinstall) roda sem banco — no build
    // do Docker, no CI e no EAS, que instala o monorepo inteiro. Comandos que
    // conectam (migrate, seed) falham com mensagem clara se faltar a variável.
    url: process.env.DATABASE_URL ?? '',
  },
});
