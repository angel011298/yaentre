# syntax=docker/dockerfile:1.7
# YaEntre — imagen para servidor propio (ver docs/MIGRACION_SERVIDOR_PROPIO.md).
# Multi-arquitectura: la misma receta construye amd64 y arm64 (Oracle Always
# Free usa Ampere A1). La imagen base va fijada por versión Y por el digest de su
# índice multi-arquitectura: un build de dentro de un mes usa exactamente los
# mismos bytes que el que se verificó. Node 24 LTS, el mismo major que Vercel.
ARG NODE_IMAGE=node:24.21.0-bookworm-slim@sha256:0e0ff40c39bc087845bfb27465a0df4ea419520094bc35842ff83dd8cbe6f9b6
# La misma versión de pnpm con la que se mantiene pnpm-lock.yaml en desarrollo:
# `allowBuilds` de pnpm-workspace.yaml es configuración de pnpm 11.
ARG PNPM_VERSION=11.11.0

FROM ${NODE_IMAGE} AS base
ARG PNPM_VERSION
ENV NEXT_TELEMETRY_DISABLED=1
# openssl: lo necesita el motor de Prisma para elegir su binario.
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/* \
 && npm install -g pnpm@${PNPM_VERSION} \
 && npm cache clean --force
WORKDIR /app

# ── 1. Dependencias (sin NODE_ENV=production: el build necesita las devDependencies)
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN pnpm install --frozen-lockfile

# ── 2. Build. Las variables (NEXT_PUBLIC_*, DATABASE_URL para el prerender, …)
# llegan como SECRETO de BuildKit montado como .env.production.local: Next lo
# lee, y NO queda en ninguna capa. Ojo: Next SÍ copia `.env` y `.env.production`
# dentro de .next/standalone (verificado en G99b), por eso el secreto se monta
# con el único nombre que no copia, y el `test` de abajo rompe el build si algún
# día una versión de Next empezara a copiar también ese.
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Mismas variables que el contenedor final (ver runner): Vercel también define
# VERCEL_ENV durante el build, y TRUSTED_PROXY por si algún módulo la leyera ahí.
ENV NODE_ENV=production BUILD_STANDALONE=1 VERCEL_ENV=production TRUSTED_PROXY=cloudflare
# Docker NO incluye el contenido de un secreto en la clave de caché: si cambian
# las variables (NEXT_PUBLIC_SITE_URL, la URL de Supabase…) pero el código no,
# `pnpm build` se serviría de caché con las variables VIEJAS incrustadas — medido
# en G99b: un «build» de 3.7 s que habría desplegado una app sin la URL de
# Supabase y con los enlaces de correo apuntando a otro dominio. Esta huella
# (hash truncado del .env, lo calcula deploy.sh) invalida la caché solo cuando
# cambia el contenido del .env, y la referencia en el RUN fuerza que cuente.
ARG ENV_FINGERPRINT=sin-huella
RUN --mount=type=secret,id=build_env,target=/app/.env.production.local \
    echo "huella del entorno: ${ENV_FINGERPRINT}" \
 && pnpm build \
 && for f in .env .env.local .env.production .env.production.local; do \
      if [ -e ".next/standalone/$f" ]; then echo "ERROR: $f quedó dentro de .next/standalone" >&2; exit 1; fi; \
    done \
 # sharp: el trazado de Next copia los paquetes @img/sharp-* pero NO la
 # biblioteca nativa libvips-cpp.so, que se carga con dlopen y no con require
 # (verificado en G99b: `ERR_DLOPEN_FAILED: libvips-cpp.so…` y /_next/image
 # devolvía el original sin optimizar). Se copian completos; pnpm solo instaló
 # los de la arquitectura de ESTE build.
 && for d in node_modules/.pnpm/@img+sharp-*; do cp -a "$d" .next/standalone/node_modules/.pnpm/; done \
 # Se separa .next del resto: el código queda de root (solo lectura para la
 # app) y únicamente .next es escribible (caché ISR de / y /precios, imágenes).
 && mv .next/standalone /app/out \
 && mv /app/out/.next /app/out-dotnext

# ── 3. Imagen final, mínima y sin root
FROM ${NODE_IMAGE} AS runner
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 NEXT_TELEMETRY_DISABLED=1
# CRÍTICO: el código decide «producción real» con VERCEL_ENV (interruptor de
# ventas, webhook de Stripe, correos, Sentry). Fuera de Vercel esa variable no
# existe, y sin ella el interruptor trataría este servidor como si no fuera
# producción. No quitar.
ENV VERCEL_ENV=production
# CRÍTICO: detrás de Cloudflare la única IP de cliente fiable es
# cf-connecting-ip; sin esto el límite de tasa por IP se evade mandando una
# cabecera falsa (ver src/lib/rate-limit/client-ip.ts). No quitar.
ENV TRUSTED_PROXY=cloudflare
# npm/npx/corepack/yarn no se usan en tiempo de ejecución: fuera, menos superficie.
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/* \
 && rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack \
           /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack \
           /opt/yarn-v* /usr/local/bin/yarn /usr/local/bin/yarnpkg \
 && groupadd --system --gid 1001 nodejs \
 && useradd --system --uid 1001 --gid nodejs --no-create-home --shell /usr/sbin/nologin nextjs
WORKDIR /app
COPY --from=builder /app/out ./
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/out-dotnext ./.next
COPY --from=builder /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
