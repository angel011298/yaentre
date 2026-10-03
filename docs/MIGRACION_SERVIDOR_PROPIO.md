# Migración de YaEntre fuera de Vercel (servidor propio gratuito)

Fecha: 2026-10-03 · Motivo: pausa de Vercel Hobby (ISR Writes 208K/200K) y límites de uso no comercial.
Estado: **preparado, NO probado**. Nadie ha construido todavía la imagen Docker. El primer build en el servidor es la prueba.

## Arquitectura

- **Oracle Cloud Always Free** (VM ARM Ampere A1, hasta 4 OCPU / 24 GB gratis; usamos 2 OCPU / 12 GB).
- **Docker Compose** con tres contenedores: `app` (Next.js standalone), `cloudflared` (túnel) y `cron` (reemplaza `vercel.json`).
- **Cloudflare** (plan gratis): DNS + Tunnel. No se abre ningún puerto en el servidor; HTTPS lo pone Cloudflare.
- **Supabase** (Postgres, Auth, Storage), **Stripe**, **Resend**, **Sentry**, **PostHog**: no cambian.
- El repo ya incluye: `Dockerfile`, `.dockerignore`, `deploy/docker-compose.yml`, `deploy/deploy.sh` y `output: "standalone"` condicional en `next.config.ts` (solo si `BUILD_STANDALONE=1`; Vercel no se ve afectado).

## ADVERTENCIA CRÍTICA: `VERCEL_ENV=production`

El código decide “producción” con `VERCEL_ENV === 'production'` (interruptor de ventas `SALES_OPEN`, verificación `livemode` del webhook de Stripe, correos, entorno de Sentry). El contenedor ya lo fija en el Dockerfile y en el compose. **No lo quites.** Sin él, el sitio se comportaría como preview/desarrollo.

Mantén `SALES_OPEN=false` hasta que el CFO/CLO den luz verde (G98, G100).

## Pasos

### 1. Crear cuenta de Oracle Cloud (lo haces tú)
1. https://www.oracle.com/cloud/free/ → “Start for free”. Pide tarjeta solo para verificar identidad (no cobra mientras uses recursos Always Free).
2. Elige región cercana a México (p. ej. US East Ashburn o US West Phoenix). **La región de origen no se puede cambiar después.**
3. Compute → Instances → Create: imagen **Ubuntu 24.04 (aarch64)**, shape **VM.Standard.A1.Flex**, 2 OCPU / 12 GB, 50 GB de disco, sube tu llave SSH pública.
4. Si dice “Out of capacity”: reintenta en otro momento o en otro dominio de disponibilidad; es común y no es un error tuyo.
5. Reglas de red: **no abras 80/443**. Solo SSH (22), idealmente limitado a tu IP.

**Riesgo de reclamo por inactividad:** Oracle puede reclamar instancias Always Free si en 7 días el uso de CPU, red y memoria queda bajo ~20 % (percentil 95). Un sitio con poco tráfico puede caer en eso. Mitigaciones: (a) convertir la cuenta a “Pay As You Go” (sigue sin cobrar si te quedas en recursos Always Free y quita el reclamo por inactividad); (b) revisar el uso semanal en Oracle Console → Monitoring.

### 2. Preparar el servidor
```bash
ssh ubuntu@<IP_PUBLICA>
sudo apt-get update && sudo apt-get install -y ca-certificates curl git
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker ubuntu && exit   # vuelve a entrar por SSH
```
Agrega 2 GB de swap (el build de Next consume memoria):
```bash
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### 3. Clonar el repo (privado) con llave de despliegue
```bash
ssh-keygen -t ed25519 -f ~/.ssh/yaentre_deploy -N ""
cat ~/.ssh/yaentre_deploy.pub   # pégala en GitHub → repo → Settings → Deploy keys (solo lectura)
printf 'Host github.com\n  IdentityFile ~/.ssh/yaentre_deploy\n' >> ~/.ssh/config
git clone git@github.com:<USUARIO>/<REPO>.git yaentre && cd yaentre
```
Antes, desde tu PC, asegúrate de haber hecho `git push origin master` (el commit local f50c6aa y el de migración aún no están en GitHub).

### 4. Crear el `.env` del servidor
Copia `.env.example` a `.env` y llena los valores reales (los mismos que en Vercel → Project → Settings → Environment Variables, entorno Production). Variables:

- Públicas (se incrustan en el build, deben estar antes de construir): `NEXT_PUBLIC_SITE_URL=https://yaentre.com`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SENTRY_DSN`, `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`, `NEXT_PUBLIC_META_PIXEL_ID`, `NEXT_PUBLIC_TIKTOK_PIXEL_ID`, `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`, `NEXT_PUBLIC_BING_SITE_VERIFICATION`, `NEXT_PUBLIC_ENABLE_UAM`, `NEXT_PUBLIC_ENABLE_EXANI`, `NEXT_PUBLIC_ENABLE_MEDIA_SUPERIOR`.
- Secretas: `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `DIRECT_URL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, los nueve `STRIPE_PRICE_*`, `RESEND_API_KEY`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN`, `MASTER_ADMIN_EMAILS`.
- Nuevas para este servidor: `CRON_SECRET` (cadena larga aleatoria: `openssl rand -hex 32`; debe coincidir con la que usa la app), `SALES_OPEN=false`, `TUNNEL_TOKEN` (del paso 5).
- Permisos: `chmod 600 .env`. Nunca lo subas a git.

Nota: el build lee `.env` como secreto de Docker (no queda dentro de la imagen); el runtime lo recibe con `env_file`.

### 5. Cloudflare (gratis)
1. Crea cuenta en cloudflare.com y **agrega yaentre.com**. Cloudflare te dará dos nameservers.
2. En tu registrador del dominio cambia los nameservers a esos dos. Propagación: minutos a horas. Antes de cambiar, copia todos los registros DNS existentes (correo/Resend: MX, SPF, DKIM, DMARC; verificaciones) y comprueba que Cloudflare los importó. **Los registros de correo deben quedar en “DNS only” (nube gris).**
3. Zero Trust → Networks → Tunnels → Create tunnel (tipo Cloudflared) → copia el **token** a `TUNNEL_TOKEN` en `.env`.
4. En el túnel agrega Public Hostname:
   - **Primero de prueba:** `nuevo.yaentre.com` → Service `HTTP` → `app:3000`.
   - Después del cutover: `yaentre.com` y `www.yaentre.com` → `http://app:3000`.

### 6. Primer despliegue
```bash
cd ~/yaentre && ./deploy/deploy.sh
docker compose -f deploy/docker-compose.yml --env-file .env logs -f app
```
El primer build tarda varios minutos en ARM. Si falla, copia el error: lo más probable son (a) el motor de Prisma bajo `standalone`, (b) pnpm 10 vs `allowBuilds`, (c) falta de memoria (revisa el swap).

### 7. Verificación antes de mover el dominio
Con `https://nuevo.yaentre.com`:
- Carga `/`, `/precios`, login y un panel; revisa que el Auth de Supabase funcione (agrega `https://nuevo.yaentre.com` a Supabase → Auth → URL Configuration solo para la prueba).
- Confirma que las ventas siguen **cerradas** (`SALES_OPEN=false`) y, desde el repo, `pnpm sales:probe` contra la nueva URL.
- Cron: `docker compose -f deploy/docker-compose.yml --env-file .env logs cron` y prueba manual:
  `curl -H "Authorization: Bearer $CRON_SECRET" https://nuevo.yaentre.com/api/cron/notifications`
  (el cron corre a las 13:00 y 14:00 UTC, igual que `vercel.json`).
- Sentry recibe un evento de prueba por `/monitoring`.

### 8. Cutover
1. Quita `yaentre.com`/`www` del proyecto en Vercel (o déjalos; al cambiar el DNS ya no se usan).
2. En Cloudflare apunta apex y `www` al túnel (Public Hostnames del paso 5; Cloudflare crea el CNAME).
3. Webhook de Stripe: la URL no cambia porque el dominio es el mismo. Confirma que `STRIPE_WEBHOOK_SECRET` es el correcto.
4. Revisa de nuevo login, formularios, correo y estado de ventas.

### Operación diaria
- Actualizar: `ssh` al servidor y `./deploy/deploy.sh`.
- Volver a una versión: `git checkout <commit> && ./deploy/deploy.sh` (luego `git checkout master`).
- Logs: `docker compose -f deploy/docker-compose.yml --env-file .env logs -f app`.
- Reinicio de la VM: los contenedores tienen `restart: unless-stopped`, arrancan solos.
- Respaldos: la base de datos y archivos están en Supabase (ver `docs/RESPALDOS.md`); el banco de contenido está en git. El servidor no guarda estado y se puede recrear con estos pasos.

### Plan B
- Vercel solo volverá a servir cuando se levante la pausa (esperar la ventana móvil de 30 días o Pro).
- Alternativa de PaaS de código abierto sobre la misma VM: Coolify (https://coolify.io), que reutiliza el mismo Dockerfile.

## Pendientes / no verificado
- Build de Docker no ejecutado (ni `tsc`): primer intento en el servidor.
- Prisma en `standalone` (puede requerir `outputFileTracingIncludes` para el binario del motor).
- Disponibilidad ARM en Oracle y riesgo de reclamo por inactividad.
- Sin CDN de imágenes de Vercel: `next/image` se optimiza en el propio servidor (usa CPU); Cloudflare cachea lo estático.
