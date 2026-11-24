# syntax=docker/dockerfile:1
# Imagens de produção do Faixa Certa (monorepo pnpm).
#   target "api": API e worker (mesma imagem, comandos diferentes). Inclui ffmpeg.
#   target "web": painel web estático servido por nginx.

FROM node:24-bookworm-slim AS build
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH TURBO_TELEMETRY_DISABLED=1
RUN corepack enable
WORKDIR /repo
COPY . .
# O prisma.config.ts exige DATABASE_URL até para o `prisma generate` (postinstall); valor fictício.
RUN DATABASE_URL=postgresql://build:build@localhost:5432/build pnpm install --frozen-lockfile
# VITE_API_URL vazio: o painel chama /v1 no mesmo domínio (o nginx encaminha para a API).
RUN pnpm --filter @faixa-certa/shared build \
 && pnpm --filter @faixa-certa/api build \
 && pnpm --filter @faixa-certa/web build

FROM node:24-bookworm-slim AS api
RUN apt-get update \
 && apt-get install -y --no-install-recommends ffmpeg ca-certificates \
 && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable
WORKDIR /repo
# Mantém as devDependencies: prisma (migrate deploy) e tsx (seed) rodam a partir desta imagem.
COPY --from=build /repo /repo
WORKDIR /repo/apps/api
EXPOSE 3000
CMD ["node", "dist/main.js"]

FROM nginx:1.29-alpine AS web
COPY docker/prod/nginx-web.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/web/dist /usr/share/nginx/html
