# Faixa Certa

Apostila digital por faixa para exames de graduação no judô: técnicas com fotos, vídeos e texto, simulados, flashcards, linha do tempo do atleta, turmas de professores e lojinha.

| Pasta               | O que é                                                | Status       |
| ------------------- | ------------------------------------------------------ | ------------ |
| `apps/api`          | API REST (NestJS 12 + Prisma 7 + PostgreSQL)           | Etapas 1 a 3 |
| `apps/web`          | Painel web (admin e professor) — React + Vite          | Etapa 2: CMS |
| `apps/mobile`       | App mobile (Expo SDK 58 + Expo Router)                 | Etapa 3      |
| `packages/shared`   | Schemas Zod, enums, i18n pt-BR e cliente da API gerado | Em uso       |
| `packages/tsconfig` | Configurações base do TypeScript                       | Em uso       |
| `docs/design`       | Layout aprovado, tokens e padrões de tela              | Referência   |

## Requisitos

- Node.js 24 LTS (`.nvmrc`). Node 22.12+ também funciona.
- pnpm 12 (`corepack enable` ou `npm i -g pnpm@12`).
- Docker Desktop (Postgres, Redis, RustFS e Mailpit).
- ffmpeg no PATH para processar vídeos (Windows: `winget install Gyan.FFmpeg`; macOS: `brew install ffmpeg`). Sem ele a API sobe, mas os vídeos ficam com status "Falhou".

## Primeiros passos

```bash
pnpm install                     # instala e gera o Prisma Client
cp .env.example apps/api/.env    # depois gere JWT_ACCESS_SECRET e DATA_ENCRYPTION_KEY (comandos no arquivo)
pnpm infra:up                    # sobe Postgres, Redis, RustFS (S3) e Mailpit
pnpm db:migrate                  # aplica as migrations
pnpm db:seed                     # admin + conteúdo de exemplo (idempotente)
pnpm dev                         # API em :3000 e painel em :5173
```

| Serviço           | Endereço                                                            |
| ----------------- | ------------------------------------------------------------------- |
| API               | http://localhost:3000/v1                                            |
| Swagger           | http://localhost:3000/docs                                          |
| OpenAPI (JSON)    | http://localhost:3000/docs/openapi.json                             |
| Health            | http://localhost:3000/health e `/health/ready`                      |
| Mailpit (e-mails) | http://localhost:8025                                               |
| Painel web        | http://localhost:5173                                               |
| RustFS (console)  | http://localhost:9001 (faixacerta-dev / faixacerta-dev-secret-2026) |

Login do admin criado pelo seed: `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` do `.env` (padrão `admin@faixacerta.local` / `Admin@12345`). **Troque em produção.**

A fila de vídeos usa BullMQ (Redis). Com `WORKERS_ENABLED=true` (padrão em desenvolvimento) a própria API processa a fila. Em produção, deixe `WORKERS_ENABLED=false` na API e rode o worker separado (`pnpm --filter @faixa-certa/api start:worker`). Sem Redis, use `QUEUE_DRIVER=inline`.

## Painel web

CMS da equipe de conteúdo (`CONTENT_EDITOR` e `ADMIN`): técnicas (`/tecnicas`), programas e faixas (`/programas`), categorias, glossário, quiz, textos e biblioteca de mídia (`/midia`). Todo conteúdo segue rascunho → revisão → publicado, com histórico de versões e restauração. O envio de arquivos vai direto do navegador para o S3 (URL pré-assinada), com barra de progresso; o vídeo é processado em segundo plano (720p, 360p para offline e miniatura) e o status aparece na tela.

O visual segue o layout aprovado: veja [`docs/design`](docs/design/README.md).

## Comandos

| Comando            | O que faz                                                          |
| ------------------ | ------------------------------------------------------------------ |
| `pnpm build`       | Build de todos os pacotes (Turborepo)                              |
| `pnpm lint`        | oxlint                                                             |
| `pnpm typecheck`   | TypeScript sem emitir                                              |
| `pnpm test`        | Testes unitários (Vitest)                                          |
| `pnpm test:e2e`    | Testes E2E da API no banco `faixacerta_test` (precisa do Postgres) |
| `pnpm format`      | Prettier                                                           |
| `pnpm api:openapi` | Exporta o OpenAPI e regenera o cliente tipado em `packages/shared` |
| `pnpm db:reset`    | Apaga e recria o banco de desenvolvimento                          |

## Decisões de arquitetura

- **ESM em todo o monorepo.** O NestJS 12 só publica ESM: imports relativos terminam em `.js`.
- **Validação com Zod 4 (Standard Schema).** Os schemas ficam em `packages/shared` e são usados no app, no painel e na API (`@Body({ schema })`). O Swagger gera a documentação direto deles, sem DTO duplicado.
- **Erros no formato RFC 7807** (`application/problem+json`) com um `code` estável que é chave de i18n (`auth.invalidCredentials` etc.).
- **Autenticação:** access token JWT de 15 min + refresh token opaco (guardado como SHA-256) com rotação a cada uso. Todos os tokens de uma sessão compartilham uma família: se um token já trocado for reutilizado, a sessão inteira é revogada. Senhas com Argon2id.
- **RBAC:** guards globais. Toda rota exige login, exceto as marcadas com `@Public()`. `@Roles()` restringe por papel; `ADMIN` passa em tudo. "Pro" não é papel: é um direito de acesso (`Entitlement`).
- **Prisma 7:** URL de conexão em `apps/api/prisma.config.ts`, client gerado em `apps/api/src/generated` com o driver adapter `@prisma/adapter-pg`.
- **SQL manual:** busca com `pg_trgm` + `unaccent`, índices únicos parciais e CHECKs ficam em `prisma/migrations/*_manual_constraints`. A busca deve usar `word_similarity` (`<%`) com a expressão `f_unaccent(lower(...))` igual à do índice.
- **Colunas em camelCase** (padrão do Prisma) e tabelas em snake_case (`@@map`).

## Variáveis de ambiente

Todas estão documentadas em [`.env.example`](.env.example). A API valida o ambiente no boot e não sobe se faltar algo obrigatório.

## Conteúdo de exemplo

O seed cria um programa **de demonstração** baseado no Gokyo da Kodokan (grupos 1 e 2), com 9 faixas, 26 técnicas, glossário, quiz e textos. A distribuição das técnicas por faixa é ilustrativa e precisa ser revisada por um professor antes de ir para produção. Os preços do Pro (R$ 29,90/mês e R$ 299,00/ano) são provisórios; o Sem Anúncios começa em R$ 10,00, como especificado.
