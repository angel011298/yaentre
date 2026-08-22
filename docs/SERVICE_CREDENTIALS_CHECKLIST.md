# Credenciales de servicios pendientes (G9)

> Generado en G9. Cubre los 4 servicios que G9 no pudo configurar: Resend
> (+ SMTP de Supabase Auth), Sentry, PostHog, y el `SUPABASE_SERVICE_ROLE_KEY`.
> Stripe tiene su propio documento — ver `docs/STRIPE_LIVE_CHECKLIST.md`.

## Por qué quedaron pendientes

G9 pidió explícitamente usar "las cuentas ya abiertas en el navegador". Se
verificó cada uno de los 5 servicios (Stripe, Resend, Sentry, PostHog, y el
dashboard de Supabase — incluso vía "Continuar con GitHub", marcado como
último método usado) navegando directamente a sus páginas autenticadas
(`dashboard.stripe.com/test/apikeys`, `resend.com/api-keys`, `sentry.io`,
`app.posthog.com`, `supabase.com/dashboard/project/.../settings/api-keys`)
en el navegador Chrome conectado a esta sesión — **ninguno tenía una sesión
activa**; los 5 redirigieron a su página de inicio de sesión o registro.

Dos límites duros de cualquier sesión de Claude Code impidieron continuar
desde ahí:
1. **Crear una cuenta nueva está prohibido** para cualquier sesión
   automatizada, sin excepción — no importa que el servicio sea gratuito o
   que el usuario lo autorice explícitamente.
2. **Escribir una contraseña en un campo de login está prohibido**, incluso
   si el navegador ya la tiene guardada/autocompletada (se observó
   literalmente esto en la pantalla de login de PostHog y de GitHub: el
   campo de contraseña mostraba puntos de un valor guardado, pero completar
   el login de todas formas habría significado autenticar con una
   contraseña en texto plano).

**Conclusión: si estas cuentas existen, están abiertas en un navegador o
perfil DISTINTO al que esta sesión de Claude Code tiene conectado — no en
el mismo Chrome.** Para que una sesión futura pueda continuar donde G9 se
detuvo, inicia sesión en los 4 servicios de abajo (o crea las cuentas si no
existen) **en el mismo Chrome que Claude Code tiene conectado** — pídele a
Claude Code que abra cada URL para confirmar que la sesión quedó activa —
o, más simple, pega tú mismo los valores en Vercel con los comandos exactos
de cada sección.

---

## 1. Resend — correo + desbloquear registro de usuarios

**Por qué es urgente:** Supabase Auth usa su proveedor de correo compartido
por default, con un límite de envío muy bajo en el plan gratuito — ya
agotado (confirmado de nuevo en G9, 3 días después de la última prueba en
G7: mismo error `over_email_send_rate_limit`). Mientras no haya SMTP
propio, **el registro de usuarios nuevos sigue bloqueado en producción**.

1. Cuenta gratuita: [resend.com/signup](https://resend.com/signup) (no pide
   tarjeta para el plan gratuito — 3,000 correos/mes, 100/día).
2. Llave API: [resend.com/api-keys](https://resend.com/api-keys) → "Create
   API Key" → permiso "Sending access" alcanza.
3. Súbela a Vercel:
   ```bash
   npx vercel env add RESEND_API_KEY production
   ```
4. **Dominio de envío — bloqueo real sin dominio propio:** el código usa
   `YaEntre <notificaciones@yaentre.mx>` como remitente
   (`src/lib/email/client.ts:16`), y Resend exige verificar el dominio del
   remitente (registros DNS) antes de poder enviar con él — no se puede
   verificar `yaentre.mx` porque **el dominio aún no se compra** (mismo
   prerrequisito pendiente de siempre). Dos caminos mientras tanto:
   - **Recomendado, temporal:** cambia `FROM_ADDRESS` en
     `src/lib/email/client.ts:16` a `onboarding@resend.dev` (dominio de
     pruebas de Resend, verificado automáticamente, sin límite de
     destinatarios en el plan gratuito) hasta que se compre el dominio
     propio — deshace este cambio cuando conectes `yaentre.mx`.
   - Sin ese cambio, cualquier envío con `@yaentre.mx` fallará con "domain
     not verified" — `sendEmail()` ya degrada a solo-log en ese caso (F16),
     así que no rompe nada, pero tampoco entrega correos reales.
5. **Configura Supabase Auth para usar este SMTP** (esto es lo que de
   verdad desbloquea el registro — RESEND_API_KEY en Vercel por sí sola NO
   cambia el proveedor de correo de Supabase Auth, son sistemas distintos):
   Dashboard de Supabase → proyecto `fumluvvzskhdxcyljbmx` → Authentication
   → Emails → "SMTP Settings" → activa "Enable Custom SMTP" con:
   ```
   Host:      smtp.resend.com
   Port:      465 (SSL) o 587 (TLS)
   Username:  resend
   Password:  <tu RESEND_API_KEY>
   Sender email: onboarding@resend.dev (o notificaciones@yaentre.mx una vez verificado el dominio)
   ```
   ([guía oficial de Resend para Supabase](https://resend.com/docs/send-with-supabase-smtp))
   Este paso es 100% dashboard — no hay API para automatizarlo desde un
   script, así que sigue siendo manual incluso con la llave ya en Vercel.

---

## 2. Sentry — monitoreo de errores

1. Cuenta gratuita: [sentry.io/signup](https://sentry.io/signup) (plan
   Developer, gratis, no pide tarjeta).
2. Crea un proyecto Next.js dentro de la organización nueva.
3. Copia el DSN del proyecto (Settings → Projects → [tu proyecto] → Client
   Keys (DSN)).
4. Sube las 4 variables a Vercel:
   ```bash
   npx vercel env add NEXT_PUBLIC_SENTRY_DSN production
   npx vercel env add SENTRY_ORG production
   npx vercel env add SENTRY_PROJECT production
   npx vercel env add SENTRY_AUTH_TOKEN production
   ```
   `SENTRY_AUTH_TOKEN` (Settings → Auth Tokens → Create New Token, scope
   `project:releases`) es solo para subir sourcemaps legibles al build —
   sin ella el build compila igual, pero los stack traces en producción
   salen minificados.
5. Redeploy (`npx vercel --prod --yes`) y genera un error real (p. ej.
   entra a una ruta que fuerce un throw, o espera a que ocurra uno
   orgánico) para confirmar que aparece en el dashboard de Sentry.

---

## 3. PostHog — analítica de producto

1. Cuenta gratuita: [posthog.com/signup](https://posthog.com/signup) (1M
   eventos/mes gratis, no pide tarjeta).
2. Región: **US** (coincide con `NEXT_PUBLIC_POSTHOG_HOST` por default en
   `.env.example`; si eliges EU al crear el proyecto, usa
   `https://eu.i.posthog.com` en su lugar).
3. Copia la "Project API Key" (Project Settings → general).
4. Sube a Vercel:
   ```bash
   npx vercel env add NEXT_PUBLIC_POSTHOG_KEY production
   npx vercel env add NEXT_PUBLIC_POSTHOG_HOST production
   ```
5. Redeploy y navega la app real (`https://acierta.vercel.app`) — el
   evento `$pageview` debería aparecer en PostHog → Activity en segundos.

---

## 4. `SUPABASE_SERVICE_ROLE_KEY`

**No bloquea el smoke test de G7/G9** (solo la usa
`getSupabaseAdmin()` en `src/lib/auth/supabase-admin.ts` para borrar la
identidad de Auth cuando un usuario elimina su cuenta, F17) — pero sí falta
por completar la lista de `.env.example`.

1. Dashboard de Supabase → proyecto `fumluvvzskhdxcyljbmx` → Settings →
   API Keys → pestaña "Legacy anon, service_role API keys" → copia
   `service_role` (⚠️ nunca lo pegues en un chat de Claude Code — este
   proyecto bloquea deliberadamente la lectura de `.env`/`.env.local` por
   la misma razón, ver `.claude/settings.json`).
2. Súbela directo a Vercel sin que pase por ningún chat:
   ```bash
   npx vercel env add SUPABASE_SERVICE_ROLE_KEY production
   ```
   (el comando pide el valor de forma interactiva/oculta — pégalo ahí, no
   en un mensaje).

---

## Una vez resueltos los 4

```bash
npx vercel --prod --yes
```

y repetir el smoke test de G7 (`docs/ESTADO.md` sección G7 tiene el
procedimiento exacto con Browser tools) — debería pasar registro,
diagnóstico, simulador Y ahora observabilidad real. Stripe sigue un
camino aparte, ver `docs/STRIPE_LIVE_CHECKLIST.md`.
