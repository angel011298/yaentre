#!/usr/bin/env bash
# Actualiza YaEntre en el servidor: baja el código, reconstruye y reinicia.
# Uso (en el servidor, desde cualquier carpeta):  ./deploy/deploy.sh
# Para volver a una versión anterior:  git checkout <commit> && ./deploy/deploy.sh
set -euo pipefail
cd "$(dirname "$0")/.."

[ -f .env ] || { echo "Falta el archivo .env en $(pwd)"; exit 1; }

git pull --ff-only
COMPOSE="docker compose -f deploy/docker-compose.yml --env-file .env"
$COMPOSE build
$COMPOSE up -d
docker image prune -f >/dev/null
$COMPOSE ps
