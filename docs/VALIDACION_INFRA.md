# Validación de Infraestructura — Acierta (F1)

Fecha: 2026-07-18 · Ejecutado contra Supabase **real** por primera vez.

## Proyecto Supabase

| Campo | Valor |
|---|---|
| Nombre | Acierta |
| Ref | `fumluvvzskhdxcyljbmx` |
| Región | us-east-1 (coincide con deploy de Vercel) |
| Estado | ACTIVE_HEALTHY |
| Costo | $0/mes (plan gratuito) |
| URL | https://fumluvvzskhdxcyljbmx.supabase.co |

**Nota:** el proyecto no existía; el `.env.local` eran 100% placeholders (la
infraestructura nunca se había aprovisionado). Se creó en esta sesión vía el
conector de Supabase (Management API). Para liberar cupo del plan gratuito
(límite 2 proyectos activos), se **pausó** `PLD-Master-V0` con autorización
explícita del dueño (reversible con "restore").

## Cómo se aplicó el schema

El conector (MCP) no expone la contraseña de la DB ni tiene superusuario para
resetearla, así que el schema se aplicó vía `apply_migration` (server-side),
no por el CLI de Prisma local. El DDL se generó desde `schema.prisma` con
`prisma migrate diff --from-empty` (fuente de verdad intacta).

- ✅ **26 tablas** creadas (todas las del ERD).
- ✅ **18 enums** creados.
- ✅ Todas las FKs, índices únicos y `@@index` de Prisma.
- ✅ RLS (0001) e índices parciales (0002 + `questions_servable_verified_idx`).

## 🔴 Discrepancia crítica encontrada (código vs. DB real)

**Las migraciones hand-written de RLS e índices (0001–0003) referenciaban
columnas en `snake_case` (`user_id`, `is_verified`, `topic_id`,
`user_profile_id`, `hit_rate`…), pero el `schema.prisma` genera columnas en
`camelCase`** porque no aplica `@map` a los campos (solo `@@map` a las tablas).
Contra la DB real esas políticas e índices **habrían fallado** (columna
inexistente). Nunca se detectó porque nada había corrido contra una DB viva.

**Resolución (sin tocar `schema.prisma`, que es la fuente de verdad):** se
reescribieron `0001_enable_rls.sql`, `0002_create_partial_indexes.sql` y el
índice de `0003` a `camelCase` con comillas dobles, y se aplicaron ya
corregidos. `idx_session_answers_by_session` se eliminó por redundante con el
índice que Prisma ya genera.

> Decisión abierta para el futuro (requiere instrucción explícita, es cambio de
> schema): si se prefieren columnas `snake_case` en la DB, habría que agregar
> `@map` a cada campo del `schema.prisma`. Por ahora la convención efectiva es
> camelCase en columnas, snake_case en tablas.

## RLS — verificado en la DB real (`pg_tables.rowsecurity`)

RLS **habilitado** en las 12 tablas con datos de usuario:
`user_profiles`, `exam_sessions`, `session_answers`, `subscriptions`,
`payments`, `learning_profiles`, `weak_topics`, `streak_records`,
`parent_links`, `parent_link_codes`, `notification_preferences`, `questions`.

Tablas de taxonomía/contenido sin RLS (lectura pública, por diseño):
`institutions`, `levels`, `exams`, `areas`, `careers`, `subjects`, `topics`,
`content_sources`, `passages`, `content_items`, `professors`,
`explanation_layers`, `processed_stripe_events`.

> ⚠️ Recomendación: `question_reports` contiene `reportedBy` (referencia a
> usuario) y hoy no tiene RLS — igual que en la migración 0001 original. Evaluar
> agregar política en una fase de hardening (F22).

## Prisma config (Tarea 1)

El repo usa **Prisma 5.22**. `prisma.config.ts` es una feature de **Prisma 6.4+**
y NO aplica aquí — crearlo sería ignorado y engañoso. En v5.22 el mecanismo
correcto es `directUrl = env("DIRECT_URL")` en el bloque `datasource`, que **ya
está presente y correcto** en `schema.prisma`. No se creó `prisma.config.ts`.

## Storage

- ✅ Bucket **público** `guias-oficiales` creado (vía `storage.buckets`).
- ⏳ Subida de los 11 PDFs de `docs/guias/` (incl. `Guia_IPN.pdf` de ~83 MB):
  **pendiente** — requiere `SUPABASE_SERVICE_ROLE_KEY` (secreto) + script
  supabase-js.

## Pendiente — bloqueado por credenciales que ningún tool puede generar

| Tarea | Necesita | Dónde obtenerlo |
|---|---|---|
| Seed real + `migrate status` (CLI) | **Contraseña de DB** | Dashboard → Settings → Database → Reset database password |
| Guardrail smoke test (necesita un `topic` sembrado) | (depende del seed) | — |
| Subir PDFs al bucket | **SUPABASE_SERVICE_ROLE_KEY** | Dashboard → Settings → API → service_role |
| Prueba real API Anthropic | **ANTHROPIC_API_KEY real** | console.anthropic.com → API Keys |

## Conteos de seed (esperados; se llenan al correr el seed real)

El seed (`prisma/seed/unam.ts`, `ipn.ts`) es determinista e idempotente
(upserts). Estructura esperada de UNAM Superior 2027:
- 1 institución, 1 nivel, 1 examen (120 reactivos, 180 min), 4 áreas.
- Materias/temas/carreras por área según el temario oficial.
- IPN: análogo (pendiente de conteo exacto hasta correr el seed).

*(Conteos reales por tabla se agregarán aquí tras `pnpm prisma db seed`.)*
