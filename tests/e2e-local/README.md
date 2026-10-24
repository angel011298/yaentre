# E2E en pila local (G103)

`pnpm test:e2e:local` corre los flujos críticos de G103 (y la regresión de lo
que ya existía) contra una pila **100 % local**: Supabase en Docker (Auth,
Storage, base), un simulador de Stripe y el build de producción de la app en
`localhost:3000`. Ninguna prueba crea cuentas, cobra, sube archivos ni manda
correos en un servicio real.

| Archivo | Flujo |
|---|---|
| `01-disponibilidad` | El profesor define su disponibilidad (escritorio arrastrando, celular tocando) y bloquea una fecha; se comprueba en la base y en la API de horarios. |
| `02-reservas` | Premium reserva admisión (Checkout que guarda la tarjeta, luego en un clic); sin Premium: rechazo en pantalla y en API, regularización sí; un horario ocupado no se ofrece. |
| `03-cursos` | El profesor crea, sube portada y video, arma y envía un curso; el admin maestro lo publica; un alumno lo compra, lo ve, avanza y califica. Un no inscrito no saca el video de Storage (por efecto, con control positivo). |
| `04-vigencia` | Aviso antes de expirar, gracia con acceso, extensión de 6 meses por webhook, y pérdida de Premium conservando el progreso. |
| `05-regresion` | Registro → onboarding → diagnóstico → tablero; simulacro sin fuga de la respuesta; compra del Pase de Temporada (12 meses); panel parental vinculado con código. |
| `06-banderas-apagadas` | El mismo build con las banderas de G103 apagadas: rutas y API 404, la portada no menciona clases ni cursos. |

## Preparar la pila (una vez)

Requisitos: Docker Desktop corriendo y ~4 GB de RAM libres.

```bash
mkdir -p ~/yaentre-e2e && cd ~/yaentre-e2e
pnpm dlx supabase@2.119.0 init --force
```

En `supabase/config.toml`: `project_id = "yaentre-e2e"`; `enabled = false` en
`[realtime]`, `[studio]`, `[local_smtp]`, `[storage.s3_protocol]`,
`[storage.vector]`, `[edge_runtime]`, `[analytics]`, `[db.seed]` y
`[db.migrations]`; `site_url = "http://localhost:3000"` y
`additional_redirect_urls = ["http://localhost:3000/**"]`. Después:

```bash
pnpm dlx supabase@2.119.0 start
pnpm dlx supabase@2.119.0 status -o env > ~/yaentre-e2e/stack.env
```

Desde la raíz del repo:

```bash
E2E_LOCAL_STACK_ENV=~/yaentre-e2e/stack.env npx tsx tests/e2e-local/support/bootstrap-stack.ts
E2E_LOCAL_STACK_ENV=~/yaentre-e2e/stack.env npx tsx --tsconfig scripts/tsconfig.perf.json tests/e2e-local/support/careers-local.ts
```

## Correr

```bash
E2E_LOCAL_STACK_ENV=~/yaentre-e2e/stack.env pnpm test:e2e:local
```

`E2E_SKIP_BUILD=1` reutiliza el último build **local** (lo comprueba una huella
en `.next/E2E_LOCAL_BUILD`; un build hecho con el entorno real no se sirve).

## Salvaguardas (no quitarlas)

- `stack-env.ts` rechaza cualquier pila que no esté en `127.0.0.1`/`localhost`
  y fija vacíos Sentry, PostHog, píxeles y Resend: Next.js no sobreescribe con
  `.env.local` lo que ya trae el proceso.
- `global-setup.ts` no escribe nada si la base no tiene `__e2e_local_marker`
  (solo existe en la pila local) y usa la URL explícita, no un `.env`.
- El servidor de la app NUNCA se reutiliza: uno abierto en `:3000` podría estar
  conectado al proyecto real.
- Stripe: `localStripeApi()` (`src/lib/stripe/client.ts`) solo desvía el SDK al
  simulador sin `VERCEL_ENV`, con `localhost` y con llave `sk_test_`. El
  simulador firma los webhooks con el secreto local, como Stripe.
- Contraseñas de las cuentas de prueba: aleatorias por corrida, solo en el
  entorno del proceso, solo en el Auth local.
- Windows: `wslrelay` también escucha en `127.0.0.1:54322` y puede atascarse;
  por eso la URL de la base se normaliza a `localhost`.
- Después de correr la suite, `.next` contiene un build LOCAL: el despliegue
  siempre compila en Vercel, pero `pnpm build` antes de cualquier otra
  verificación.

Atajo deliberado: la regla «≥ 5 min de video» (probada en unidad) se cumple en
`03-cursos` ajustando la duración en la base local, para no grabar 5 minutos.
