#!/usr/bin/env bash
# Actualiza YaEntre en el servidor: baja el código, reconstruye y reinicia.
#
#   ./deploy/deploy.sh             despliega master (git pull + build + up)
#   ./deploy/deploy.sh rollback    vuelve a la imagen anterior SIN reconstruir (segundos)
#   SERVICIOS="app cloudflared" ./deploy/deploy.sh
#                                  levanta solo esos servicios (antes del cutover el
#                                  cron NO debe correr: mandaría correos reales con
#                                  enlaces a un dominio que todavía no apunta aquí)
#
# Para desplegar un commit concreto: git checkout <commit> && ./deploy/deploy.sh
# (con HEAD desacoplado no se hace pull; se construye exactamente ese commit).
set -euo pipefail
cd "$(dirname "$0")/.."

COMPOSE="docker compose -f deploy/docker-compose.yml --env-file .env"

[ -f .env ] || { echo "Falta el archivo .env en $(pwd)"; exit 1; }
perm=$(stat -c '%a' .env)
[ "$perm" = "600" ] || { echo "El .env debe tener permisos 600 (tiene $perm): chmod 600 .env"; exit 1; }

esperar_sano() {
  local id estado
  id=$($COMPOSE ps -q app)
  for _ in $(seq 1 36); do # hasta 3 minutos
    estado=$(docker inspect -f '{{.State.Health.Status}}' "$id" 2>/dev/null || echo "desconocido")
    [ "$estado" = "healthy" ] && { echo "app: healthy"; return 0; }
    sleep 5
  done
  echo "app NO quedó sana (estado: $estado). Últimas líneas del log:"
  $COMPOSE logs --tail 60 app || true
  return 1
}

resumen() {
  $COMPOSE ps
  # Visibilidad, nunca valores: el estado de la venta y el MODO de la llave.
  local ventas modo
  ventas=$(grep -E '^SALES_OPEN=' .env | cut -d= -f2- || true)
  modo=$(grep -E '^STRIPE_SECRET_KEY=' .env | cut -d= -f2- | cut -c1-8 || true)
  echo "Ventas: SALES_OPEN=${ventas:-<ausente>} (cerrada salvo 'true' Y llave live) · Stripe: ${modo%_*}_…"
}

if [ "${1:-}" = "rollback" ]; then
  docker image inspect yaentre:anterior >/dev/null 2>&1 \
    || { echo "No hay imagen yaentre:anterior a la cual volver."; exit 1; }
  docker tag yaentre:anterior yaentre:local
  $COMPOSE up -d --no-build ${SERVICIOS:-}
  esperar_sano
  resumen
  exit 0
fi

if git symbolic-ref -q HEAD >/dev/null; then
  git pull --ff-only
else
  echo "HEAD desacoplado: se despliega $(git rev-parse --short HEAD) sin hacer pull."
fi
echo "Desplegando $(git log -1 --format='%h %s')"

# La imagen que está corriendo pasa a ser la de rollback ANTES de reconstruir.
if docker image inspect yaentre:local >/dev/null 2>&1; then
  docker tag yaentre:local yaentre:anterior
fi

$COMPOSE build app
$COMPOSE up -d ${SERVICIOS:-}
if ! esperar_sano; then
  echo
  echo "Para volver a la versión anterior en segundos:  ./deploy/deploy.sh rollback"
  exit 1
fi
docker image prune -f >/dev/null
resumen
