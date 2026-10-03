# Migración de YaEntre fuera de Vercel (servidor propio gratuito) — G99b

Fecha: 2026-10-03 · Motivo: pausa de Vercel Hobby (ISR Writes 208K/200K, ver ESTADO.md §G99) y límites de uso no comercial.

**Estado:** la imagen se construyó y se verificó **en local** (amd64 y arm64); el despliegue en Oracle y el cutover se hacen con esta guía, paso a paso. Lo que solo se puede comprobar en el servidor real está marcado como **pendiente** al final.

## Arquitectura

- **Oracle Cloud Always Free**: VM ARM Ampere A1 (hasta 4 OCPU / 24 GB gratis; usamos 2 OCPU / 12 GB).
- **Docker Compose** con tres contenedores: `app` (Next.js `standalone`), `cloudflared` (túnel) y `cron` (reemplaza `vercel.json`).
- **Cloudflare** (plan gratis): DNS + Tunnel. **La VM no abre ningún puerto a internet**; HTTPS lo pone Cloudflare.
- **Supabase, Stripe, Resend, Sentry, PostHog**: no cambian. El webhook de Stripe conserva su URL porque el dominio es el mismo.
- Archivos: `Dockerfile`, `.dockerignore` (lista blanca), `deploy/docker-compose.yml`, `deploy/deploy.sh` y `output: "standalone"` condicional en `next.config.ts` (solo con `BUILD_STANDALONE=1`; en Vercel la variable no existe y el build no cambia).

## Cinco reglas que NO se tocan

1. **`VERCEL_ENV=production`** lo fija la imagen. El código decide «producción» con esa variable: interruptor de ventas, verificación `livemode` del webhook de Stripe, correos y entorno de Sentry. Sin ella, el servidor se comportaría como preview.
2. **`TRUSTED_PROXY=cloudflare`** lo fija la imagen. Fuera de Vercel nadie reescribe `x-vercel-forwarded-for` ni `x-forwarded-for`, y Cloudflare las deja pasar tal cual las mande el cliente. Antes de G99b, eso permitía **evadir el límite de tasa por IP** (login, registro, recuperación de contraseña) mandando una IP falsa en cada petición: medido, 70 peticiones sin un solo 429. Ahora detrás de Cloudflare solo se confía en `cf-connecting-ip`, que el borde sobreescribe siempre. Se verifica con `pnpm security:ip-spoof <url>`.
3. **Ningún puerto publicado.** Sin `ports:` en el compose y sin abrir 80/443 en Oracle. No es solo higiene: la regla 2 solo es segura si nadie puede llegar a la app sin pasar por Cloudflare. Quien llegara directo podría mandar su propio `cf-connecting-ip`.
4. **`CRON_SECRET` es EL MISMO valor que en Vercel**, no uno nuevo. Además de autorizar `/api/cron/*`, firma los enlaces de «darse de baja» de los correos (`src/lib/email/unsubscribe-token.ts`). Generar otro invalidaría todos los enlaces de baja ya enviados.
5. **`SALES_OPEN=false`** hasta que CFO/CLO den luz verde (G98). Con llave `sk_test_` en producción la venta queda cerrada aunque alguien ponga `true`. `deploy.sh` imprime el estado de la venta y el modo de la llave al terminar, nunca sus valores.

## Lo que se verificó en local (G99b)

| Qué | Resultado |
|---|---|
| `docker buildx` amd64 y arm64 (QEMU) | OK |
| Capturas de `/`, `/precios`, `/login`, `/registro`, `/recuperar-password`, `/legal/privacidad` y las redirecciones de `/app` y `/admin`, en escritorio claro/oscuro y móvil, contra el build normal de Vercel | **24/24 idénticas píxel a píxel**. Control: dos tomas de la referencia, 24/24. Una mutación de 1 píxel sí se detecta. |
| Secretos: los valores de las variables secretas buscados en las 17 capas **descomprimidas** de la imagen, en su config e historial | **0**. Control positivo: la URL pública de Supabase sí aparece, en 1 capa. |
| Usuario del proceso | `nextjs` (uid 1001). El código pertenece a root y la app no puede modificarlo; solo `.next` es escribible (caché ISR e imágenes). Sin npm/npx/corepack/yarn. |
| Cabeceras: CSP, HSTS, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy | Presentes e idénticas |
| `/api/cron/*` | 401 sin secreto y con secreto erróneo. Con el secreto correcto, aceptado. Se probó en una instancia **aislada** con la base de datos en un puerto cerrado, para que no saliera ningún correo. |
| Compose completo (app + cron + cloudflared) con su endurecimiento | Sin puertos publicados; `cap_drop: ALL` y `no-new-privileges` en los tres; cloudflared en solo lectura. crond **ejecuta** las tareas solo con `SETUID/SETGID`; cada corrida deja `OK`/`FALLO` con fecha en el log. |
| Prisma en la imagen | El motor `debian-openssl-3.0.x` carga |
| `next/image` (sharp) | WebP optimizado. Hizo falta copiar `libvips` a mano: el trazado de Next no la incluye. |
| Suplantación de IP | Verde con la imagen; **rojo** con la misma imagen y `TRUSTED_PROXY=vercel` (la sonda puede fallar) |

## Pasos

### 1. Crear la VM en Oracle (lo haces tú)
1. https://www.oracle.com/cloud/free/ → «Start for free». La tarjeta es solo para verificar identidad.
2. **Región de origen:** la más cercana a México con capacidad A1 (p. ej. `US East (Ashburn)`, que además es la región de Supabase/Vercel `us-east-1`). **No se puede cambiar después.**
3. Compute → Instances → Create:
   - Imagen **Canonical Ubuntu 24.04** (aarch64). Shape **VM.Standard.A1.Flex**, 2 OCPU / 12 GB. Boot volume 50 GB.
   - Sube tu llave SSH **pública** (`ssh-keygen -t ed25519` en tu PC si no tienes; nunca subas la privada).
   - Si dice «Out of capacity», reintenta más tarde o en otro *availability domain*.
4. Red (VCN → Security List): **borra cualquier regla de entrada salvo SSH (22/TCP) con origen `TU_IP/32`**. No abras 80 ni 443.
5. **Reclamo por inactividad:** Oracle puede reclamar instancias Always Free si en 7 días la CPU (percentil 95) queda bajo 20 %. Un sitio con poco tráfico cae ahí. Lo más sólido es convertir la cuenta a **Pay As You Go** (sigue costando $0 mientras uses recursos Always Free y quita el reclamo por inactividad) y crear en Billing un **presupuesto con alerta de $1** para enterarte si algo empieza a cobrar.

### 2. Preparar el servidor
```bash
ssh ubuntu@<IP_PUBLICA>
sudo apt-get update && sudo apt-get -y upgrade && sudo apt-get install -y ca-certificates curl git
curl -fsSL https://get.docker.com -o get-docker.sh && less get-docker.sh   # revísalo antes de correrlo
sudo sh get-docker.sh && sudo usermod -aG docker ubuntu && exit           # vuelve a entrar por SSH
```
Swap de 4 GB (el build de Next pide memoria; con 12 GB basta, el swap es red de seguridad):
```bash
sudo fallocate -l 4G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```
Comprueba que no quede nada escuchando hacia fuera salvo SSH: `sudo ss -tlnp` (solo `:22`, y Docker no debe mostrar `0.0.0.0:3000`).

### 3. Clonar el repo (privado) con llave de despliegue de solo lectura
```bash
ssh-keygen -t ed25519 -f ~/.ssh/yaentre_deploy -N ""
cat ~/.ssh/yaentre_deploy.pub   # GitHub → angel011298/yaentre → Settings → Deploy keys → Add (SIN «Allow write access»)
printf 'Host github.com\n  IdentityFile ~/.ssh/yaentre_deploy\n  IdentitiesOnly yes\n' >> ~/.ssh/config
git clone git@github.com:angel011298/yaentre.git yaentre && cd yaentre
```

### 4. Crear el `.env` del servidor
Los valores son los de Vercel → Project → Settings → Environment Variables → **Production**. Las variables marcadas como *Sensitive* en Vercel no se pueden volver a leer; esas se sacan de su origen (Supabase, Stripe, Resend, Sentry).

- Públicas (se incrustan en el build, deben estar **antes** de construir): `NEXT_PUBLIC_SITE_URL=https://yaentre.com`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SENTRY_DSN`, `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`, `NEXT_PUBLIC_META_PIXEL_ID`, `NEXT_PUBLIC_TIKTOK_PIXEL_ID`, `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`, `NEXT_PUBLIC_BING_SITE_VERIFICATION`, `NEXT_PUBLIC_ENABLE_UAM`, `NEXT_PUBLIC_ENABLE_EXANI`, `NEXT_PUBLIC_ENABLE_MEDIA_SUPERIOR`.
- Secretas: `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `DIRECT_URL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, los nueve `STRIPE_PRICE_*`, `RESEND_API_KEY`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN`, `MASTER_ADMIN_EMAILS`, **`CRON_SECRET` (el de Vercel, regla 4)**.
- Ventas: `SALES_OPEN=false`.
- Nueva: `TUNNEL_TOKEN` (paso 5).

Escríbelo **en el servidor** (`nano .env`). Si lo preparas en Windows, el `.env` saldrá con CRLF y `deploy.sh` se negará a usarlo; se corrige con `sed -i 's/\r$//' .env`. Después: `chmod 600 .env`. Nunca lo subas a git. Guarda una copia en tu gestor de contraseñas, no en un archivo suelto.

El build recibe `.env` como **secreto de BuildKit** montado como `.env.production.local`: Next lo lee y no queda en ninguna capa. Ojo: Next **sí** copia `.env` y `.env.production` dentro de `.next/standalone`. Por eso se monta con ese nombre y el Dockerfile rompe el build si encuentra cualquier `.env*` ahí.

### 5. Cloudflare (gratis)
El dominio está registrado en **Akky** y hoy su DNS lo sirve **Vercel** (`ns1/ns2.vercel-dns.com`). DNSSEC no está activo, así que el cambio de nameservers no requiere retirar ningún DS primero.

1. Crea cuenta en cloudflare.com → Add a domain → `yaentre.com` → plan Free. Cloudflare escanea e importa los registros.
2. **Compara la importación con esta lista** (estado del 2026-10-03; vuelve a sacarla el día del cambio con `npx vercel dns ls yaentre.com`):

   | Nombre | Tipo | Valor | Proxy |
   |---|---|---|---|
   | `yaentre.com` | A | `216.198.79.65`, `64.29.17.65` (Vercel) | se reemplaza en el cutover |
   | `www` | A | `216.198.79.65`, `64.29.17.1` (Vercel) | se reemplaza en el cutover |
   | `yaentre.com` | CAA | `0 issue "letsencrypt.org"`, `"pki.goog"`, `"sectigo.com"` | — |
   | `send` | MX | `10 feedback-smtp.us-east-1.amazonses.com` | **DNS only** |
   | `send` | TXT | `v=spf1 include:amazonses.com ~all` | **DNS only** |
   | `resend._domainkey` | TXT | `p=MIGfMA0…` (DKIM completo de Resend) | **DNS only** |
   | `_dmarc` | TXT | `v=DMARC1; p=none;` | **DNS only** |

   **Los registros de correo, en «DNS only» (nube gris).** Compara el DKIM carácter por carácter con el de Resend → Domains: si se corta, los correos de verificación y recuperación empiezan a caer en spam o a rebotar.
3. En **Akky** cambia los nameservers por los dos de Cloudflare. Propagación: de minutos a horas. Mientras tanto nada se rompe, porque los registros apuntan a lo mismo que hoy.
4. Comprueba que el correo sigue bien: Resend → Domains → `yaentre.com` → «Verified».
5. Zero Trust → Networks → Tunnels → Create tunnel (Cloudflared) → copia **solo el token** a `TUNNEL_TOKEN` en `.env`.
6. Public Hostname del túnel, **primero de prueba**: `nuevo.yaentre.com` → Service `HTTP` → `app:3000`.

### 6. Primer despliegue (sin cron)
Antes del cutover **el cron no debe correr**: mandaría a alumnos reales recordatorios con enlaces a `yaentre.com`, que todavía no apunta aquí.
```bash
cd ~/yaentre && SERVICIOS="app cloudflared" ./deploy/deploy.sh
docker compose -f deploy/docker-compose.yml --env-file .env logs -f app
```
El script se niega a seguir si el `.env` no tiene permisos 600 o trae CRLF. Espera hasta 3 minutos a que la app quede `healthy` y, si no, imprime el log y el comando de rollback. El primer build tarda varios minutos en ARM.

### 7. Verificación antes de mover el dominio (contra `https://nuevo.yaentre.com`)
- `/`, `/precios`, login y un panel. Para el login de prueba hay que añadir **temporalmente** `https://nuevo.yaentre.com/**` en Supabase → Auth → URL Configuration → Redirect URLs.
- **Suplantación de IP, desde tu PC:** `pnpm security:ip-spoof https://nuevo.yaentre.com` → debe salir VERDE, incluido `rotar-cf`. Esto prueba por efecto que Cloudflare sobreescribe `cf-connecting-ip`.
- **Ventas cerradas:** `G98_BASE_URL=https://nuevo.yaentre.com pnpm sales:probe`. Necesita la contraseña de la cuenta fixture `e2e.free@acierta-test.mx` (ver la cabecera de `scripts/g98/sales-closed-probe.ts`) y crea y borra una fila de preferencia `MARKETING` en la base (su control positivo P5).
- **Cabeceras:** `curl -sI https://nuevo.yaentre.com/ | grep -iE "content-security|strict-transport|x-frame"`.
- **Cron sin efectos:** `curl -s -o /dev/null -w "%{http_code}\n" https://nuevo.yaentre.com/api/cron/notifications` → 401. **No** lo llames con el secreto correcto: manda correos reales.
- **Sentry:** provoca un evento y confirma que llega con `environment: production`.
- **Puertos:** `sudo ss -tlnp` en la VM; solo `:22`.

### 8. Cutover (solo con OK explícito)
1. En el túnel: Public Hostnames `yaentre.com` y `www.yaentre.com` → `HTTP` → `app:3000`. Cloudflare reemplaza los registros A de Vercel por el CNAME del túnel; acepta el reemplazo.
2. Enciende el cron: `./deploy/deploy.sh` (sin `SERVICIOS`, levanta los tres).
3. Quita `https://nuevo.yaentre.com/**` de Supabase → Redirect URLs y borra el hostname `nuevo` del túnel.
4. **Webhook de Stripe:** misma URL (`https://yaentre.com/api/webhooks/stripe`) y mismo `STRIPE_WEBHOOK_SECRET`. Confírmalo en Stripe → Developers → Webhooks: la siguiente entrega debe salir 2xx.
5. Repite el paso 7 contra `https://yaentre.com`.
6. Al día siguiente, después de las 13:00 y 14:00 UTC: `docker compose -f deploy/docker-compose.yml --env-file .env logs cron` debe mostrar dos líneas `OK` y, para correos, **los logs de Resend** (el conteo del cron no es evidencia, ver G73).

### Rollback
- **Versión anterior de la app (segundos):** `./deploy/deploy.sh rollback`. Cada despliegue guarda la imagen que estaba corriendo como `yaentre:anterior`.
- **Un commit concreto:** `git checkout <commit> && ./deploy/deploy.sh`. Con HEAD desacoplado el script no hace pull; vuelve después con `git checkout master`.
- **Sacar el dominio del servidor:** en Cloudflare, quita los Public Hostnames `yaentre.com`/`www` del túnel y restaura los registros A de Vercel (tabla del paso 5). Solo sirve si Vercel ya no está pausado.
- **Volver al DNS de Vercel:** en Akky, nameservers a `ns1.vercel-dns.com` y `ns2.vercel-dns.com`.

### Operación diaria
- Actualizar: `ssh` al servidor y `./deploy/deploy.sh`.
- Logs: `docker compose -f deploy/docker-compose.yml --env-file .env logs -f app` (rotados: 5 × 10 MB por contenedor).
- Reinicio de la VM: `restart: unless-stopped`, los contenedores arrancan solos.
- Imágenes base: fijadas por versión **y** digest (Node 24.21.0, cloudflared 2026.9.3, alpine 3.24.2). Se actualizan a propósito: cambia la etiqueta y el digest y redespliega. Revisa cloudflared al menos una vez al trimestre.
- Respaldos: la base y los archivos están en Supabase (`docs/RESPALDOS.md`) y el banco de contenido en git. El servidor no guarda estado; se recrea con esta guía más el `.env` de tu gestor de contraseñas.

## Riesgos conocidos y pendientes
- **Pendiente de verificar en el servidor:** el build nativo en ARM (en local fue con emulación QEMU), un evento real de Sentry (el DSN local es un placeholder), el login y el panel contra `nuevo.yaentre.com`, la sonda de IP **a través de Cloudflare** y la primera corrida real del cron.
- **Supabase Auth ve una sola IP.** El login, el registro y la renovación de sesión se llaman desde el servidor, así que Supabase ve **la IP de la VM** para todos los alumnos (en Vercel eran muchas IPs). Si sus límites por IP (Auth → Rate Limits) son bajos, con tráfico real podrían bloquear logins legítimos. Revisa esos límites antes de la beta del 1 de noviembre.
- **Imágenes:** sin el CDN de Vercel, `next/image` se optimiza en la propia VM (usa CPU). Cloudflare cachea por extensión lo estático (`/_next/static`), no el HTML.
- **Un solo servidor:** si la VM cae, el sitio cae; no hay redundancia. La caché ISR (`/` y `/precios`) vive en el contenedor y se regenera sola tras un reinicio.
- **`TUNNEL_TOKEN` en el entorno de la app:** `env_file` le pasa todo el `.env`. Quien comprometa la app ya tiene las llaves de Supabase y Stripe, así que el riesgo marginal es bajo, pero el token permitiría conectar otro conector al túnel. Si se rota, se hace en Cloudflare → Tunnels.

### Plan B
- Vercel vuelve a servir cuando se levante la pausa (ventana móvil de 30 días) o con Pro.
- Coolify (https://coolify.io) sobre la misma VM reutiliza el mismo Dockerfile.
