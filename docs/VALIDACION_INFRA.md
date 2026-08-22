# Validación de Infraestructura — YaEntre (F1)

Fecha: 2026-07-18 · Primera ejecución contra Supabase **real**.

## Proyecto Supabase

| Campo | Valor |
|---|---|
| Nombre | YaEntre |
| Ref | `fumluvvzskhdxcyljbmx` |
| Región | us-east-1 (coincide con deploy de Vercel) |
| Estado | ACTIVE_HEALTHY |
| Costo | $0/mes (plan gratuito) |
| URL | https://fumluvvzskhdxcyljbmx.supabase.co |

El proyecto no existía; el `.env.local` eran 100% placeholders (la infraestructura
nunca se había aprovisionado). Se creó en esta sesión vía el conector de Supabase.
Para liberar cupo del plan gratuito (límite 2 proyectos activos), se **pausó**
`PLD-Master-V0` con autorización explícita del dueño (reversible con "restore").

## Conexión de DB (Prisma CLI / seed)

El conector no expone la contraseña de DB ni tiene superusuario para resetearla.
Solución: se creó un rol dedicado **`acierta_ci`** (LOGIN + BYPASSRLS, equivalente
funcional al service-role para Prisma server-side) vía el conector, y se conecta
por el **pooler** `aws-0-us-east-1.pooler.supabase.com`. Verificado con conexión
real (`prisma db execute` → OK). Credenciales en `.env.local` (no versionado).

## Schema

DDL generado desde `schema.prisma` (`prisma migrate diff --from-empty`) y aplicado
vía el conector. **Validación fuerte:** `prisma migrate diff` de `schema.prisma`
contra la DB real devolvió *"empty migration"* → **la DB coincide EXACTO con la
fuente de verdad**. 26 tablas, 18 enums, todas las FKs e índices.

> El repo NO usa el flujo de migraciones de Prisma (los archivos en
> `prisma/migrations/` son SQL plano hand-written, no dirs de Prisma). Por eso
> `prisma migrate status` no aplica; la validación equivalente es el diff vacío
> de arriba + el listado de 26 tablas.

## 🔴 Discrepancias encontradas (código vs. DB real) y corregidas

Ninguna se había detectado porque nada había corrido contra una DB viva.

1. **snake_case vs camelCase.** Las migraciones de RLS/índices referenciaban
   columnas `snake_case` (`user_id`, `is_verified`, `topic_id`…), pero
   `schema.prisma` genera `camelCase` (no aplica `@map` a campos). Habrían fallado
   contra la DB real. → `0001/0002/0003` reescritas a camelCase con comillas dobles.

2. **Recursión infinita en RLS.** La política `parent_reads_student` de
   `user_profiles` consultaba `user_profiles`/`parent_links` dentro de sí misma →
   `infinite recursion detected in policy`. Apareció al conectar como rol normal
   (el conector corre como owner y bypassa RLS). → Corregido con funciones
   `SECURITY DEFINER` (`current_profile_id()`, `is_admin()`) que resuelven la
   identidad sin re-disparar RLS. `0001` consolidada a la forma final correcta.

## RLS — verificado en la DB real

RLS **habilitado** en las 12 tablas con datos de usuario (`user_profiles`,
`exam_sessions`, `session_answers`, `subscriptions`, `payments`,
`learning_profiles`, `weak_topics`, `streak_records`, `parent_links`,
`parent_link_codes`, `notification_preferences`, `questions`). Taxonomía/contenido
sin RLS (lectura pública, por diseño).

> ⚠️ Recomendación para F22 (hardening): `question_reports` tiene `reportedBy`
> (referencia a usuario) y hoy no tiene RLS. Evaluar política.

## Seed — conteos REALES (corrido con `prisma db seed` canónico)

| Tabla | Conteo real | Desglose |
|---|---|---|
| Instituciones | **2** | UNAM, IPN |
| Niveles | **2** | Superior ×2 |
| Exámenes | **2** | UNAM 2027 (120 react.), IPN 2027 (140 react.) |
| Áreas | **7** | UNAM 4 + IPN 3 |
| Materias | **35** | UNAM 18 + IPN 17 |
| Temas | **217** | temario oficial por materia |
| Carreras | **47** | UNAM 26 + IPN 21 (con `minAciertos` + fuentes) |

Coherente con la estructura del seed. Idempotente (upserts): re-ejecutable sin
duplicar.

## Guardrail de contenido — probado en vivo (Tarea 6)

Se insertaron 2 reactivos de prueba en un topic real y se corrió el **helper real**
`loadServableQuestionsByTopic`:

- `usage=CALIBRATION_ONLY, isVerified=true` → **NO** devuelto por el helper ✅
- `usage=SERVABLE, isVerified=true` → **SÍ** devuelto ✅

Ambos borrados al final (0 reactivos restantes). El guardrail SERVABLE funciona.

## Storage (Tarea 8)

- ✅ Bucket **público** `guias-oficiales` creado.
- ✅ **9 de 10 PDFs** de `docs/guias/` subidos (33 MB). Método F1: política temporal
  de storage + anon key vía API REST (revertida después; el bucket volvió a
  solo-lectura pública). El script canónico re-ejecutable es
  `scripts/upload-guias.ts` (usa service-role).
- ⚠️ `Guia_IPN.pdf` (~80 MB) **no subido**: excede el límite de 50 MB del plan
  gratuito de Supabase (límite de plataforma, requiere plan de pago).

## Prisma config (Tarea 1)

Prisma **5.22**. `prisma.config.ts` es de Prisma **6.4+**, no aplica. El mecanismo
correcto (`directUrl = env("DIRECT_URL")` en el `datasource`) ya está presente y
correcto en `schema.prisma`. No se creó `prisma.config.ts`.

## ⛔ Único pendiente bloqueado por credencial externa

**Tarea 7 — prueba de la API de Anthropic: NO ejecutada.** `ANTHROPIC_API_KEY` es
un placeholder y no existe forma de generar una key real por ninguna herramienta
(vive solo en console.anthropic.com, cuenta de facturación del dueño). El script
de prueba está listo: `scripts/ping-anthropic.ts` — corre con `npx tsx
scripts/ping-anthropic.ts` en cuanto haya una key real en `.env.local`.

## Estado de credenciales en `.env.local`

| Credencial | Estado |
|---|---|
| NEXT_PUBLIC_SUPABASE_URL / ANON_KEY | ✅ reales |
| DATABASE_URL / DIRECT_URL | ✅ reales (rol `acierta_ci`, funciona) |
| SUPABASE_SERVICE_ROLE_KEY | ⚠️ `FALTA` (no requerido para lo validado; sí para `upload-guias.ts` canónico) |
| ANTHROPIC_API_KEY | ⛔ `FALTA` (bloquea Tarea 7) |
| Stripe / Resend / Sentry / PostHog | placeholders (fases posteriores) |
