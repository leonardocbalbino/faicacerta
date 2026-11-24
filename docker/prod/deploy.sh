#!/usr/bin/env bash
# Deploy na VPS. Chamado pelo GitHub Actions (.github/workflows/deploy.yml):
#   bash deploy.sh /tmp/faixa-certa-<sha>.tar.gz
# Sincroniza o código em /opt/faixa-certa (preservando docker/prod/.env), builda,
# aplica as migrations, sobe os containers e confere a saúde da API.
set -euo pipefail

APP_DIR=/opt/faixa-certa
TARBALL=${1:?uso: deploy.sh <tarball>}
COMPOSE="docker compose -f docker/prod/docker-compose.yml --env-file docker/prod/.env"

# Um deploy por vez.
exec 9>/var/lock/faixa-certa-deploy.lock
flock 9

test -f "$APP_DIR/docker/prod/.env" || { echo "falta $APP_DIR/docker/prod/.env"; exit 1; }

echo "==> sincronizando código"
RELEASE=$(mktemp -d)
trap 'rm -rf "$RELEASE" "$TARBALL"' EXIT
tar xzf "$TARBALL" -C "$RELEASE"
rsync -a --delete --exclude 'docker/prod/.env' "$RELEASE/" "$APP_DIR/"
cd "$APP_DIR"

echo "==> build das imagens"
$COMPOSE build

echo "==> infraestrutura"
$COMPOSE up -d --wait postgres redis rustfs

echo "==> migrations"
$COMPOSE run --rm --no-deps api npx --no-update-notifier prisma migrate deploy

echo "==> subindo api, worker e web"
$COMPOSE up -d --remove-orphans

echo "==> health check"
for _ in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:8851/health/ready >/dev/null 2>&1 \
    && curl -fsS -o /dev/null http://127.0.0.1:8850/; then
    echo "ok: API e painel respondendo"
    docker image prune -f >/dev/null
    exit 0
  fi
  sleep 3
done

echo "FALHOU: API não ficou saudável"
$COMPOSE ps
$COMPOSE logs --tail 60 api
exit 1
