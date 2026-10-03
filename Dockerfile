# syntax=docker/dockerfile:1.7
# YaEntre — imagen para servidor propio (ver docs/MIGRACION_SERVIDOR_PROPIO.md).
# Multi-arquitectura: sirve igual en x86 y en ARM (Oracle Always Free usa ARM).
ARG NODE_VERSION=24

FROM node:${NODE_VERSION}-bookworm-slim AS base
ENV NEXT_TELEMETRY_DISABLED=1
# openssl: lo necesita el motor de Prisma. pnpm 10: el lockfile es versión 9.
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/* \
 && npm install -g pnpm@10
WORKDIR /app

# ── 1. Dependencias (sin NODE_ENV=production: el build necesita las devDependencies)
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN pnpm install --frozen-lockfile

# ── 2. Build. Las variables de build (NEXT_PUBLIC_*, DATABASE_URL, …) llegan como
# SECRETO de BuildKit montado como .env.production.local: Next lo lee solo y
# NO queda guardado en ninguna capa de la imagen.
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production BUILD_STANDALONE=1
RUN --mount=type=secret,id=build_env,target=/app/.env.production.local \
    pnpm build

# ── 3. Imagen final, mínima y sin root
FROM base AS runner
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
# CRÍTICO: el código decide «producción real» con VERCEL_ENV (interruptor de
# ventas, webhook de Stripe, correos). Fuera de Vercel esa variable no existe,
# y sin ella el interruptor trataría este servidor como si no fuera producción.
ENV VERCEL_ENV=production
RUN groupadd --system nodejs && useradd --system --gid nodejs nextjs
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
