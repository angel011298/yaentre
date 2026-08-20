# Inventario de marca — Rebrand a YaEntre (Fase R1)

> Generado: 2026-08-19 · Solo lectura, cero archivos de producto modificados.
> Marca nueva: **YaEntre** (dominio objetivo `yaentre.mx`, ver sesión previa de investigación de dominio).
> Feature `Aciertómetro` → **Entrómetro**.

## Metodología

- Patrón A (`acierta`, case-insensitive): cubre la marca `Acierta`/`acierta.mx` y las formas verbales comunes `acierta`/`aciertan`. **No** coincide con `acertar` (infinitivo, sin "i") ni con `aciertos` (sustantivo plural — "aciertos mínimos", "número de aciertos"): ambas son letra-por-letra distintas de `acierta` en la posición 7 (`acert-A-r` / `aciert-O-s` vs `aciert-A`), así que nunca se confunden con la marca y no requieren clasificación en esta fase.
- Patrón B (`aciert[oó]metro`, case-insensitive): dedicado a "Aciertómetro" — no se solapa con el Patrón A porque la letra tras "aciert" es "ó/o", no "a".
- Código: `src/`, `scripts/`, `prisma/`, y además `app/`, `tests/`, `public/`, y config de raíz (`package.json`, `.claude/launch.json`, `.vercel/project.json`, `proxy.ts`, `next.config.ts`, `vercel.json`, `instrumentation*.ts`) — ver nota de alcance abajo.
- Documentación: los 17 `.md` bajo `docs/` + `CLAUDE.md` + `README.md`.
- Base de datos real: script `tsx` desechable (`scripts/tmp-rebrand-db-scan.ts`, creado, ejecutado y **borrado** en esta misma sesión — `git status` queda limpio) que cargó credenciales vía `scripts/lib/env.ts` (el mecanismo ya usado por el resto del pipeline; no se leyó `.env.local` ni `.env` con herramientas de lectura). Consultó `Question.stem`, `Question.options` (JSON), `Question.verification` (JSON), `ExplanationLayer.title/content/latexContent`, `Passage.content`, `QuestionReport.reason`, y los nombres de `Institution/Area/Subject/Topic/Career/ContentSource`.
- No se leyó `.env.local` en ningún momento (instrucción explícita); tampoco `.env`, por el mismo criterio de prudencia.

**Nota de alcance real vs. documentada:** CLAUDE.md describe la estructura objetivo como `src/app/...`, pero el repo real tiene `app/` en la raíz (hermano de `src/`, no anidado) — es donde vive casi todo el ruteo (`app/(public)`, `app/(app)`, `app/admin`, `app/actions`, `app/api`) y concentra 65 de las apariciones de marca, incluyendo las páginas legales. Excluirlo habría dejado el inventario peligrosamente incompleto, así que se agregó al alcance de la tarea 1 junto con `tests/` y `public/` (mismo criterio: "código fuente real", no solo los 3 directorios nombrados literalmente).

---

## Resumen ejecutivo

| Categoría | MARCA | COMÚN | AMBIGUO | Total |
|---|---:|---:|---:|---:|
| Código (`src/scripts/prisma/app/tests/public/config raíz`) | 158 | 0 | 0 | 158 |
| Documentación (`docs/*.md` + `CLAUDE.md`) | 135 | 0 | 0 | 135 |
| Base de datos real | 0 | 1 | 0 | 1 |
| **"Acierta" — subtotal Patrón A** | **293** | **1** | **0** | **294** |
| Aciertómetro (Patrón B, siempre MARCA) | 201 | — | — | 201 |
| **TOTAL GENERAL** | **494** | **1** | **0** | **495** |

**Ningún match quedó sin clasificar.** Cero casos ambiguos genuinos (ver razonamiento al final). Un único caso COMÚN real en todo el proyecto — código, documentación y base de datos de producción incluidos.

---

## 1. Código — Patrón A ("acierta")

Detalle línea por línea (esto es lo que un reemplazo automatizado necesita). Reemplazo propuesto general: `Acierta`→`YaEntre`, `acierta`→`yaentre` (identificadores/URLs en minúsculas), salvo donde se anota lo contrario.

### 1.1 Marca de producto en UI/copy — MARCA

| Archivo | Línea(s) | Texto encontrado | Reemplazo |
|---|---|---|---|
| `src/components/dashboard/Sidebar.tsx` | 15 | `Acierta` (wordmark del sidebar) | `YaEntre` |
| `src/components/dashboard/TopBar.tsx` | 19 | `Acierta` (wordmark del topbar) | `YaEntre` |
| `src/components/marketing/PublicHeader.tsx` | 14 | `Acierta` (wordmark header público) | `YaEntre` |
| `src/components/marketing/PublicFooter.tsx` | 11, 49 | `Acierta` (wordmark), `© {year} Acierta. Acierta no está afiliado...` | `YaEntre` (×2 en la misma línea) |
| `src/components/dashboard/AppFooter.tsx` | 11 | `© {year} Acierta. Acierta no está afiliado ni avalado por la UNAM...` | `YaEntre` (×2) |
| `src/components/tutor/ParentShell.tsx` | 28 | `Acierta · Panel del tutor` | `YaEntre · Panel del tutor` |
| `src/components/checkout/CheckoutViews.tsx` | 67 | `¡Gracias! Ya eres parte de Acierta` | `...parte de YaEntre` |
| `src/components/marketing/Hero.tsx` | 5, 23 | comentario "Acierta no es un curso..."; `Acierta detecta tus temas débiles...` | `YaEntre` |
| `src/components/marketing/Faq.tsx` | 8, 45 | `¿Cómo funciona Acierta?`; `...que Acierta marca como débiles.` | `YaEntre` |
| `src/components/pwa/InstallPrompt.tsx` | 76 | `Instala Acierta en tu celular` | `Instala YaEntre en tu celular` |
| `src/lib/tino/copy.ts` | 130 | `Desbloquea todo Acierta` | `Desbloquea todo YaEntre` |

### 1.2 Dominio, emails y URLs — MARCA

| Archivo | Línea(s) | Texto encontrado | Reemplazo |
|---|---|---|---|
| `src/lib/email/client.ts` | 16 | `const FROM_ADDRESS = 'Acierta <notificaciones@acierta.mx>'` | `'YaEntre <notificaciones@yaentre.mx>'` |
| `src/lib/email/templates.ts` | 24,30,53,66,71,97,111,146 | `Acierta` en `<span>` de marca, footer "Acierta · acierta.mx", 4 `subject` de correo, "entra a acierta.mx...", "acierta.mx/tutor" | `YaEntre` / `yaentre.mx` en las 8 |
| `src/lib/stripe/client.ts` | 27 | `appInfo: { name: 'Acierta', url: 'https://acierta.mx' }` | `{ name: 'YaEntre', url: 'https://yaentre.mx' }` |
| `src/lib/stripe/pricing.ts` | 4, 81 | comentario "Matriz de precios de Acierta"; `productName: \`Acierta — ${...}\`` | `YaEntre` |
| `src/components/tutor/ParentLockedPreview.tsx` | 19 | `...actívalo desde su cuenta en acierta.mx.` | `yaentre.mx` |
| `src/components/tutor/ParentDashboard.tsx` | 115 | `Ir a acierta.mx` | `Ir a yaentre.mx` |
| `src/components/marketing/PublicFooter.tsx` | 41-42 | `mailto:hola@acierta.mx`, texto `hola@acierta.mx` | `hola@yaentre.mx` |
| `src/components/dashboard/AppFooter.tsx` | 21 | `mailto:hola@acierta.mx` | `hola@yaentre.mx` |
| `scripts/setup-stripe-webhook.ts` | 24, 90, 112 | comentario de uso `--url https://acierta.vercel.app`; banner consola; `description: 'Acierta — producción Vercel...'` | ver nota Vercel abajo |
| `app/manifest.ts` | 14-15 | `name: 'Acierta'`, `short_name: 'Acierta'` (manifest PWA) | `YaEntre` |
| `app/opengraph-image.tsx` | 4, 44 | `alt = 'Acierta — Tu entrenador de admisión con IA'`; texto renderizado `Acierta` | `YaEntre` |
| `app/layout.tsx` | 32, 42 | `title: "Acierta — Tu entrenador..."`, `title: "Acierta"` | `YaEntre` |
| `app/tutor/page.tsx` | 10 | `title: 'Panel del tutor · Acierta'` | `· YaEntre` |
| `app/simulador/page.tsx` | 15 | `title: 'Simulacro · Acierta'` | `· YaEntre` |
| `app/(app)/app/progreso/page.tsx` | 22 | `title: 'Mi progreso · Acierta'` | `· YaEntre` |
| `app/(app)/app/perfil/page.tsx` | 17 | `title: 'Mi perfil · Acierta'` | `· YaEntre` |
| `app/(public)/page.tsx` | 18, 23, 20(Aciertómetro) | `title`/`og:title`: `Acierta — Tu entrenador...` | `YaEntre` |
| `app/(public)/precios/page.tsx` | 14, 16 | `title: 'Precios — Acierta'`; `...cada plan de Acierta...` | `YaEntre` |
| `app/api/email/unsubscribe/route.ts` | 26, 28 | `<title>Acierta</title>`, `<h1>Acierta</h1>` | `YaEntre` |
| `app/api/account/export/route.ts` | 33 | `filename="acierta-datos-${profileId}.json"` | `yaentre-datos-...` |
| `app/(app)/app/examen-oficial/page.tsx` | 20,55,63 | `Acierta no modifica...`, `Un simulacro Acierta te...`, `Hacer un simulacro Acierta →` | `YaEntre` |
| `app/(app)/app/examen-oficial/[externalRef]/page.tsx` | 8,50,85,93 | mismos patrones ("Acierta NUNCA recaptura...", "Acierta te lo acerca...") | `YaEntre` |
| `app/admin/layout.tsx` | 34 | `🦉 Acierta — Admin` | `🦉 YaEntre — Admin` |
| `public/sw.js` | 17,21,23,31,33 | `SHELL_CACHE = 'acierta-shell-v1'`; `<title>Sin conexión · Acierta</title>` ×2; `<h1>Acierta</h1>` ×2 | `yaentre-shell-v1` (bump de versión de caché de todos modos); `YaEntre` |

### 1.3 Páginas legales — MARCA (32 apariciones, terminos + privacidad)

`app/(public)/legal/terminos/page.tsx` (23 líneas: 5,23,31,44,75,91-92,102,106,111×2,118,120,138,140,141,149,152,205,206-207,220,233-234) y `app/(public)/legal/privacidad/page.tsx` (7 líneas: 5,26×2,124-125,167,180-181) usan "Acierta" como nombre de la empresa/producto en prosa legal continua ("Acierta es una plataforma...", "Acierta NO garantiza...", "el contenido de Acierta es propiedad intelectual...", emails `hola@acierta.mx`) — **todas MARCA**, ninguna es verbo. `privacidad/page.tsx:26` además tiene el placeholder `Acierta SAS de CV` y `contacto@acierta.mx`. Reemplazo: `YaEntre` / `yaentre.mx` en las 32. Estas páginas necesitan lectura humana completa en R2 (no solo find-replace) porque son el documento legal — un cambio de razón social real (`Acierta SAS de CV` → nombre legal real de la nueva entidad, si cambia) es una decisión de negocio, no solo de texto.

### 1.4 Identificadores de infraestructura derivados de la marca — MARCA (⚠️ alto riesgo, no es un simple find-replace)

| Archivo | Línea(s) | Identificador | Nota de riesgo |
|---|---|---|---|
| `src/lib/db/parent.ts:34`, `src/lib/db/auth-users.ts:7`, `scripts/verify-rls-isolation.ts:16,94`, `prisma/migrations/0009_security_hardening_f22.sql:7,96` | — | rol de Postgres **`acierta_ci`** (BYPASSRLS, dev/local) | Rol real en Supabase. Renombrarlo exige `ALTER ROLE` en la DB real + actualizar `DATABASE_URL`/`DIRECT_URL` en `.env.local` — **no tocar solo el texto en el código sin coordinar el cambio de rol real**, o el pipeline se cae con el mismo error `ENOTFOUND tenant/user` que ESTADO.md documenta haber pisado antes (línea 304). |
| `docs/ESTADO.md:1365` (referencia) | — | rol de Postgres **`acierta_prod`** (producción, Vercel) | Mismo riesgo que arriba pero en **producción real** — cualquier cambio requiere coordinar `ALTER ROLE` + actualizar env vars en el dashboard de Vercel, fuera del alcance de un `git commit`. |
| `.vercel/project.json:1` | — | `"projectName":"acierta"` | Autogenerado por Vercel CLI (`vercel link`). No se edita el JSON a mano — se renombra el proyecto en Vercel (o se relinkea) y este archivo se regenera solo. |
| `package.json:2` | — | `"name": "acierta"` | Nombre del paquete npm, cosmético (no publicado), bajo riesgo. |
| `.claude/launch.json:5` | — | `"name": "acierta-dev"` | Config del launcher de Claude Code, bajo riesgo. |
| `src/lib/analytics/client.ts:28`, `src/lib/marketing/pixels.ts:8,36`, `src/components/legal/CookiesConsentBanner.tsx:7,26` | — | clave de `localStorage`/evento **`acierta-cookies-consent`**, `acierta:cookies-accepted` | Cambiar la clave = usuarios ya instalados pierden su preferencia de cookies guardada (vuelven a ver el banner una vez). Bajo riesgo pero anotar en el changelog de R2. |
| `src/lib/marketing/attribution.ts:12` | — | `ATTRIBUTION_COOKIE_NAME = 'acierta_attribution'` | Misma nota: cookie existente se pierde al renombrar, atribución de esa sesión se resetea. |
| `src/components/pwa/InstallPrompt.tsx:7-8` | — | `acierta:pwaVisitCount`, `acierta:pwaInstallDismissedAt` | Bajo riesgo (contadores de UX, se resetean solos). |
| `app/globals.css:162-192`, `src/components/dashboard/TopBar.tsx:17`, `BottomNav.tsx:13`, `simulator/SimulatorRunner.tsx:215`, `gamification/HeatmapCalendar.tsx:30` | — | clases CSS **`.acierta-heatmap`**, **`.acierta-safe-top`**, **`.acierta-safe-bottom`** | Bajo riesgo, pero son 6 archivos que deben cambiar juntos (nombre de clase compartido) — no renombrar el CSS sin renombrar los 5 usos en JSX en el mismo commit. |
| `prisma/schema.prisma:4`, `docs/Plan_Implementacion_Acierta_v1.0.md:283`, `docs/Backend_Schema_Acierta_v1.0.md:853` | — | comentario/instrucción `--name acierta_init` (convención de nombre de migración inicial) | Cosmético — son comentarios de instrucción, no un nombre de carpeta de migración real existente (las migraciones reales están numeradas `0001`…`0009`). |

---

## 2. Aciertómetro → Entrómetro (Patrón B, 201 apariciones / 57 archivos — 100% MARCA)

Regla del usuario: "Aciertómetro" es siempre marca, sin excepción. Se listan los identificadores **distintos** (no las 201 líneas) agrupados por tipo, ya que el mismo identificador se repite consistentemente en todo el código:

| Tipo | Identificadores encontrados | Archivos donde se definen | Reemplazo propuesto |
|---|---|---|---|
| Componentes React | `Aciertometro`, `AciertometroLoader`, `AciertometroLocked`, `AciertometroHistoryChart` | `src/components/gamification/Aciertometro.tsx`, `AciertometroLoader.tsx`, `src/components/progress/AciertometroHistoryChart.tsx` | `Entrometro`, `EntrometroLoader`, `EntrometroLocked`, `EntrometroHistoryChart` |
| Módulo/archivo puro | `src/lib/adaptive/aciertometro.ts` | (mismo) | `src/lib/adaptive/entrometro.ts` |
| Tipos/interfaces | `AciertometroTarget`, `AciertometroDisplay`, `AciertometroAccess`, `AciertometroHistoryPoint` | `src/lib/adaptive/aciertometro.ts`, `src/lib/db/dashboard.ts`, `src/lib/db/progress.ts` | `EntrometroTarget`, `EntrometroDisplay`, `EntrometroAccess`, `EntrometroHistoryPoint` |
| Funciones | `formatAciertometroTarget`, `loadAciertometroAccess`, `loadAciertometroHistory` | `src/lib/adaptive/aciertometro.ts`, `src/lib/db/dashboard.ts`, `src/lib/db/progress.ts` | `formatEntrometroTarget`, `loadEntrometroAccess`, `loadEntrometroHistory` |
| Variable local | `aciertometro` (clave del objeto en `src/lib/db/account.ts:44`), `aciertometroAccess` (`app/(app)/app/page.tsx`) | — | `entrometro`, `entrometroAccess` |
| Test suites | `tests/adaptive/aciertometro.test.ts` (9 refs) + menciones en `predictor.test.ts`, `career-strategy.test.ts`, `regression.test.ts` | `tests/adaptive/` | `tests/adaptive/entrometro.test.ts` |
| CSS/comentarios | `app/globals.css:138`, comentarios en `career-strategy.ts`, `predictor.ts`, `diagnostic.ts`, etc. | múltiples | `Entrómetro` |
| Copy de UI (texto visible) | "Tu Aciertómetro", "Aciertómetro activo", "Evolución del Aciertómetro", "Aciertómetro bloqueado", tabla de features en `/precios`, FAQ, Hero, `TinoRecommendation`, `CheckoutViews` | `src/components/marketing/*`, `src/components/dashboard/TinoRecommendation.tsx`, `src/components/paywall/PlanCard.tsx`, `src/components/exam/DiagnosticResults.tsx`, `src/components/simulator/SimulatorResult.tsx`, `src/components/profile/TargetCareerForm.tsx`, `app/(app)/app/page.tsx`, `app/(app)/app/progreso/page.tsx`, `app/onboarding/_components/CareerStep.tsx`, `app/api/adaptive/predict/route.ts`, `app/layout.tsx` (meta description) | "Tu Entrómetro", "Entrómetro activo", etc. |
| Páginas legales | `app/(public)/legal/terminos/page.tsx:39,139,152`, `privacidad/page.tsx:66,157` — "Aciertómetro (predicción de aciertos...)" | (mismos archivos de §1.3) | `Entrómetro` |
| DB (comentario de columna) | `Career.minAciertos // ... arranque en frío del Aciertómetro` | `prisma/schema.prisma:283`, `prisma/migrations/0005_add_career_confidence.sql:2,5` | comentario → `Entrómetro`; el campo `minAciertos` en sí **no cambia** (es "aciertos mínimos", uso común, no marca) |
| Documentación | `CLAUDE.md` (3), `PRD_Acierta_v1.0.md` (11), `UIUX_Spec_Acierta_v1.0.md` (5), `Flujo_App_Acierta_v1.0.md` (8), `Backend_Schema_Acierta_v1.0.md` (1), `Plan_Implementacion_Acierta_v1.0.md` (3), `ESTADO.md` (17), `LAUNCH_CHECKLIST.md` (3), `BETA_FEEDBACK.md` (1), `PROGRESO_SPRINT2.md` (11), `ACIERTOS_MINIMOS.md` (6, doc dedicado al arranque en frío del Aciertómetro) | `docs/` | `Entrómetro` en prosa; `ACIERTOS_MINIMOS.md` **no se renombra** (trata de `minAciertos`, uso común — ver §1 metodología) |

**Nota:** en un par de líneas (p. ej. `app/(app)/app/progreso/page.tsx:5-6`) el import se partió en dos filas del extracto por el ancho de línea usado para la búsqueda — son una sola aparición real; el conteo de 201 usa el modo `count` de línea coincidente, no este extracto, así que no está inflado.

---

## 3. Documentación (`docs/*.md`, `CLAUDE.md`) — 135 apariciones / 18 archivos, 100% MARCA

| Archivo | Apariciones | Naturaleza | Reemplazo |
|---|---:|---|---|
| `PRD_Acierta_v1.0.md` | 12 | Nombre de producto en portada/prosa ("**Acierta** es una plataforma SaaS..."), `acierta.mx` (URL objetivo, criterio de lanzamiento), footer | `YaEntre` / `yaentre.mx`; considerar renombrar archivo a `PRD_YaEntre_v1.0.md` en R2 |
| `ESTADO.md` | 25 | Nombre de producto, `acierta.vercel.app`, rol `acierta_ci`/`acierta_prod`, clases CSS, usuario de prueba `acierta.f15.gamify@gmail.com` | `YaEntre` / equivalentes — ver también §1.4 |
| `Backend_Schema_Acierta_v1.0.md` | 9 | Título, header de `schema.prisma` citado, `acierta_init`, mapeo PLD→Acierta | `YaEntre`; candidato a renombrar archivo |
| `UIUX_Spec_Acierta_v1.0.md` | 9 | Título, wordmark, "decisión de identidad: Acierta tiene una mascota..." | `YaEntre`; candidato a renombrar archivo |
| `Plan_Implementacion_Acierta_v1.0.md` | 10 | Título, referencias a `/docs/TRD_Acierta_v1.0.md` (⚠️ ver nota abajo), `acierta_init` | `YaEntre`; candidato a renombrar archivo |
| `Flujo_App_Acierta_v1.0.md` | 5 | Título, "Producto: Acierta (acierta.mx)", "volver a Acierta" | `YaEntre`; candidato a renombrar archivo |
| `STRIPE_LIVE_CHECKLIST.md` | 10 | "cuenta de Stripe dedicada a Acierta", `acierta.vercel.app`, decisión de dominio abierta | `YaEntre` |
| `LAUNCH_CHECKLIST.md` | 7 | Checklist de lanzamiento, `acierta.mx`, cita a `PRD_Acierta_v1.0.md` | `YaEntre` |
| `PROGRESO_SPRINT0.md` | 15 | Bitácora de scaffold, nombres de archivo citados, `acierta_init`, `.claude/launch.json` "acierta" | `YaEntre` |
| `PROGRESO_SPRINT1.md` | 12 | Bitácora, citas a los 5 documentos `*_Acierta_v1.0.md` | `YaEntre` |
| `PROGRESO_SPRINT4.md` | 6 | Bitácora, "Acierta te lo acerca...", "simulador Acierta" | `YaEntre` |
| `SERVICE_CREDENTIALS_CHECKLIST.md` | 6 | Remitente Resend `Acierta <notificaciones@acierta.mx>`, verificación de dominio | `YaEntre` / `yaentre.mx` |
| `VALIDACION_INFRA.md` | 4 | Tabla de infra, rol `acierta_ci` | `YaEntre` — ver §1.4 |
| `PROGRESO_SPRINT2.md` | 2 | Cita a `Backend_Schema_Acierta_v1.0.md` | `YaEntre` |
| `ACIERTOS_MINIMOS.md` | 1 | "...un umbral propio de Acierta..." (además de las 6 menciones de Aciertómetro en §2 — el resto del documento es sobre `minAciertos`, uso común, fuera de este patrón) | `YaEntre`; **el archivo NO se renombra** (trata de "aciertos mínimos", no de la marca) |
| `BETA_FEEDBACK.md` | 1 | Título "BETA_FEEDBACK — Acierta" | `YaEntre` |
| `content-batches/g3e-veredictos-ipn-medbio-biologia.json` | 1 | **COMÚN**, no MARCA — ver §4 (es un export de la DB, mismo texto que el hallazgo de base de datos) | No tocar |
| `CLAUDE.md` | 3 (Patrón A) + 3 (Aciertómetro) | Título del documento, "Qué es Acierta", tabla de docs de referencia | `YaEntre` — este archivo ya se está actualizando en cada fase, no requiere tratamiento especial |

**Nota — referencia rota preexistente, no relacionada con el rebrand:** `Plan_Implementacion_Acierta_v1.0.md` (líneas 299, 326, 353) cita `/docs/TRD_Acierta_v1.0.md` tres veces, pero **ese archivo no existe** en el repo (`docs/TRD*.md` → 0 resultados). Es un enlace roto de antes de esta sesión — probablemente el TRD se fusionó en `Backend_Schema_Acierta_v1.0.md` en algún punto y no se actualizaron las citas. Se documenta aquí porque se descubrió durante el barrido, pero es un defecto independiente del rebrand — no está en el alcance de R1/R2 a menos que el dueño lo pida explícitamente.

`README.md`: 0 apariciones.

---

## 4. Base de datos real — 1 aparición, COMÚN

Script desechable ejecutado contra la base de datos de producción real (`DATABASE_URL` cargada vía `scripts/lib/env.ts`, nunca vista en texto plano por mí):

| Tabla revisada | Filas revisadas | Matches |
|---|---:|---:|
| `Question.stem` | 450 reactivos | 0 |
| `Question.options` (JSON) | 450 reactivos | 0 |
| `Question.verification` (JSON) | 450 reactivos | **1** |
| `ExplanationLayer.title/content/latexContent` | 1,350 capas | 0 |
| `Passage.content/title` | 0 pasajes (tabla vacía) | 0 |
| `QuestionReport.reason` | 0 reportes (tabla vacía) | 0 |
| `Institution/Area/Subject/Topic/Career/ContentSource.name` | 2/7/35/217/47/9 = 317 nombres | 0 |

**El único match — COMÚN, no tocar:**

> `Question cmsg2b4eq0001hy8lharbr6iz`, campo `verification` (razonamiento del verificador adversarial, IPN Med-Bio Biología):
> *"...la palabra 'recordar'/'memoria' que el enunciado ya usa. **Se acierta** por coincidencia léxica, sin inmunología. Contenido correcto..."*

"Se acierta" = forma reflexiva/impersonal del verbo "acertar" (el verificador señala que un alumno podría **acertar la respuesta por coincidencia léxica**, sin entender el contenido — es una nota de calidad pedagógica sobre el reactivo). No tiene ninguna relación con el nombre del producto. Este mismo texto está espejado en `docs/content-batches/g3e-veredictos-ipn-medbio-biologia.json:243` (export estático del mismo veredicto) — contado una sola vez en el total general para no duplicar.

---

## 5. Servicios externos — resumen consolidado

(Todos los hallazgos de código ya están en las tablas de §1; esta sección los agrupa por servicio para planear R2.)

| Servicio | Dónde | Valor actual | Cambia a | Riesgo |
|---|---|---|---|---|
| Stripe `appInfo` | `src/lib/stripe/client.ts:27` | `{ name: 'Acierta', url: 'https://acierta.mx' }` | `{ name: 'YaEntre', url: 'https://yaentre.mx' }` | Bajo (cosmético, visible en el dashboard de Stripe) |
| Stripe `productName` | `src/lib/stripe/pricing.ts:81` | `` `Acierta — ${plan} (${season})` `` | `` `YaEntre — ...` `` | Medio — si `pnpm stripe:setup-prices` ya corrió, los `Price`/`Product` existentes en Stripe **no se renombran solos**; hay que decidir si se re-crean o se actualizan vía Dashboard/API |
| Resend remitente | `src/lib/email/client.ts:16` | `'Acierta <notificaciones@acierta.mx>'` | `'YaEntre <notificaciones@yaentre.mx>'` | Alto — requiere verificar el dominio `yaentre.mx` en Resend (SPF/DKIM) ANTES del cambio, o los correos empiezan a fallar (mismo bloqueo ya documentado en `SERVICE_CREDENTIALS_CHECKLIST.md` para `acierta.mx`) |
| Plantillas de correo | `src/lib/email/templates.ts` (8 lugares) | Ver §1.2 | `YaEntre` / `yaentre.mx` | Bajo, texto plano |
| Vercel — proyecto | `.vercel/project.json`, `docs/ESTADO.md` | `projectName: "acierta"`, URL `acierta.vercel.app` | Decisión pendiente: renombrar el proyecto Vercel (cambia la URL `*.vercel.app`) o dejarlo y solo apuntar `yaentre.mx` como dominio custom | Medio — si se renombra el proyecto, hay que actualizar `NEXT_PUBLIC_SITE_URL` y el webhook de Stripe (mismo campo único que ya documentó `ESTADO.md` para el cambio de dominio) |
| Postgres (Supabase) | roles `acierta_ci` (dev), `acierta_prod` (producción) | Ver §1.4 | `yaentre_ci` / `yaentre_prod` | **Alto** — cambio de infraestructura viva, no de texto |
| PWA manifest | `app/manifest.ts` | `name`/`short_name: 'Acierta'` | `YaEntre` | Bajo |
| Service Worker cache | `public/sw.js:17` | `SHELL_CACHE = 'acierta-shell-v1'` | `yaentre-shell-v1` | Bajo (además conviene bumpear versión igual al desplegar) |
| Páginas legales | `app/(public)/legal/{terminos,privacidad}/page.tsx` | Ver §1.3 | `YaEntre` | Medio — requiere revisión humana del texto legal, no solo reemplazo |
| Cookies/localStorage | Ver tabla en §1.4 | `acierta-*` / `acierta:*` / `acierta_attribution` | `yaentre-*` equivalentes | Bajo — usuarios existentes pierden el valor guardado una vez |
| npm package | `package.json:2` | `"name": "acierta"` | `"yaentre"` | Ninguno (no publicado) |

---

## 6. Casos COMÚN — verificados

Solo se encontró **un** caso real en todo el proyecto (código + documentación + base de datos de producción): el veredicto del verificador citado en §4 ("Se acierta por coincidencia léxica"). Se optó por **no inventar ejemplos adicionales** para completar una cuota — la búsqueda fue exhaustiva (293 apariciones del patrón A revisadas una por una) y esta fue la única instancia gramatical genuina.

Por qué son tan pocas: en este dominio (examen de admisión), la palabra española más frecuente de esta familia es **"aciertos"** (sustantivo plural — número de respuestas correctas), no "acierta". "Aciertos" es letra-por-letra distinta (`aciert-O-s`) y por lo tanto **nunca aparece en esta búsqueda ni se confunde con la marca** — se ve constantemente en el código y la documentación sin riesgo alguno de colisión:

- `CLAUDE.md:10`: "...Aciertómetro que predice **aciertos**..."
- `prisma/schema.prisma:283`: `Career.minAciertos // aciertos mínimos históricos de ingreso`
- `docs/PRD_Acierta_v1.0.md:314`: "Predicción de **aciertos** en el examen"

Estos tres son solo ilustrativos (no son parte del conteo de 293/1 de arriba, porque el patrón de búsqueda no los captura) — se incluyen para mostrar que la distinción letra-por-letra funciona correctamente y que "aciertos" —omnipresente en un producto de examen de admisión— no necesita revisión ni aparece falsamente clasificado.

## 7. Casos AMBIGUOS

**Ninguno.** Los 293 hallazgos del Patrón A se dividieron sin zona gris: 292 son "Acierta" capitalizado usado como sustantivo propio (sujeto/objeto de la oración, wordmark, dominio, identificador de infraestructura) y 1 es "se acierta" en minúsculas, en medio de una oración, como verbo reflexivo — no hubo un solo caso a medio camino entre ambos patrones (p. ej. ningún "¡Acierta!" imperativo aislado que pudiera confundirse con la marca). El Patrón B (Aciertómetro) es 100% marca por definición del usuario, sin excepción posible.

---

*Fin del inventario · Fase R1 · Próximo paso: R2 (ejecución del reemplazo), no incluido en esta fase.*
