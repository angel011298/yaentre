-- G100 — DISPARADOR HORARIO DE RECORDATORIOS (pg_cron + pg_net).
--
-- Por qué aquí y no en `vercel.json`: el plan Hobby de Vercel solo programa
-- crons DIARIOS, y el recordatorio sale a la hora que eligió cada alumno.
-- `pg_cron` llama cada hora a `/api/cron/reminders` con el mismo
-- `Authorization: Bearer <CRON_SECRET>` que usa Vercel Cron.
--
-- El secreto NUNCA va en este archivo (el repo es la retención del respaldo y
-- se versiona entero): se lee de Supabase Vault en cada corrida. Mientras el
-- secreto no exista, el job no hace NADA (el `WHERE EXISTS`), así que esta
-- migración es inofensiva hasta el paso manual de abajo.
--
-- PASO MANUAL, una sola vez, en el SQL Editor de Supabase (como postgres):
--
--   select vault.create_secret('<el mismo valor de CRON_SECRET en Vercel>',
--                              'yaentre_cron_secret',
--                              'Bearer de /api/cron/* para pg_cron (G100)');
--
-- Para rotarlo: `select vault.update_secret(id, '<nuevo>') from vault.secrets
-- where name = 'yaentre_cron_secret';` — sin tocar el job.
--
-- Vigilancia: el endpoint escribe un latido en `system_settings`
-- (`cron.reminders.lastRunAt`) y el cron DIARIO de Vercel lo reporta a Sentry
-- (`reminder_trigger`) si lleva más de 3 h sin latir y hay alumnos con
-- recordatorios activos. Un disparador que nunca se configuró no queda mudo.
--
-- Conexiones (ESCALA.md §5): pg_cron ya estaba contado en el presupuesto de
-- `max_connections=60`; una corrida por hora no lo mueve.
--
-- Idempotente: reprogramar con el mismo nombre reemplaza el job.
--
-- ⚠️ RESIDUAL CONOCIDO (medido al aplicar, G100): pg_net concede `EXECUTE`
-- sobre `net.http_post/http_get` a PUBLIC, y la concesión la hizo
-- `supabase_admin`. Un `REVOKE` como `postgres` se acepta SIN error y no
-- cambia nada (misma trampa que el GRANT sobre `auth` de G73) — se intentó
-- y se verificó por efecto con `has_function_privilege`. `DROP EXTENSION`
-- para recrearla en `extensions` se bloqueó por el worker de pg_net.
-- La barrera real es que el esquema `net` NO esté entre los «Exposed
-- schemas» de la API (Settings → API). Verificar por efecto:
--   curl "$SUPABASE_URL/rest/v1/http_request_queue?limit=1" \
--        -H "apikey: $ANON" -H "Accept-Profile: net"
-- debe responder 406 (PGRST106, esquema no expuesto). Nunca exponer `net`.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.schedule(
  'yaentre-reminders-hourly',
  '5 * * * *',
  $job$
    SELECT net.http_post(
      url := 'https://yaentre.com/api/cron/reminders',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || s.decrypted_secret,
        'Content-Type', 'application/json'
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 30000
    )
    FROM vault.decrypted_secrets s
    WHERE s.name = 'yaentre_cron_secret';
  $job$
);
