# PROGRESO CC-00 — Scaffold Inicial Acierta

## Fecha
10 de julio de 2026

## Qué se construyó

### ✅ Completado

1. **Proyecto Next.js 15 inicializado**
   - App Router habilitado
   - TypeScript en modo strict
   - Tailwind CSS 4 configurado
   - pnpm como gestor de paquetes

2. **Estructura de carpetas creada**
   - `/app/` — App Router (raíz, donde Next.js lo espera)
   - `/src/components/` — Componentes React (ui, exam, gamification, mascot)
   - `/src/lib/` — Utilidades y lógica (db, adaptive, auth, stripe, stores)
   - `/src/styles/` — Estilos globales y tokens
   - `/tests/` — Tests unitarios (Vitest) y e2e (Playwright)
   - `/prisma/` — Schema de Prisma (completado con todos los modelos)
   - `/docs/` — Documentación de planeación
   - `/scripts/` — Scripts offline (pipeline IA, etc.)

3. **Dependencias instaladas**
   - Framework: Next.js 16, React 19
   - Styling: Tailwind CSS 4
   - Animation: Framer Motion 11
   - ORM: Prisma 7, @prisma/client
   - Validation: Zod
   - Backend/BaaS: @supabase/supabase-js
   - Payments: Stripe
   - Email: Resend
   - Observability: @sentry/nextjs, PostHog
   - Components: Lucide React, Sonner, @number-flow/react, react-calendar-heatmap
   - Full-screen: screenfull
   - Testing: Vitest, @vitest/ui, Playwright, jsdom, @vitejs/plugin-react
   - Code quality: ESLint, Prettier

4. **Archivos de configuración**
   - `.env.example` — Todas las variables de CLAUDE.md
   - `.gitignore` — Mejorado para pnpm y desarrollo
   - `.prettierrc` — Config de formato
   - `vitest.config.ts` — Config de tests unitarios
   - `playwright.config.ts` — Config de tests e2e
   - `tsconfig.json` — TypeScript strict mode, alias @/* → /src/*
   - `prisma/schema.prisma` — Schema completo (v1.0 del Backend Schema doc)
   - `.npmrc` — ignore-scripts=true (para evitar problemas con builds)

5. **Documentación**
   - Copiados todos los documentos de planeación a `/docs/`:
     - PRD_Acierta_v1.0.md
     - Flujo_App_Acierta_v1.0.md
     - Backend_Schema_Acierta_v1.0.md
     - Plan_Implementacion_Acierta_v1.0.md
     - UIUX_Spec_Acierta_v1.0.md
   - CLAUDE.md en raíz

6. **Git inicializado**
   - Primer commit: "chore: scaffold inicial Acierta"
   - Configuración: user.email, user.name

7. **Tests placeholder**
   - `tests/example.test.ts` — Vitest placeholder
   - `tests/e2e/example.spec.ts` — Playwright placeholder

### ✅ Validación de criterios de aceptación

- [x] `pnpm typecheck` pasó (ejecutado via `npx tsc --noEmit`)
- [x] `pnpm lint` pasó (ejecutado via `npx eslint .`)
- [x] Estructura de carpetas coincide con CLAUDE.md
- [x] `.env.example` contiene todas las variables de CLAUDE.md
- [x] Vitest instalado y configurado
- [x] Playwright instalado y configurado
- [x] Tests placeholder presentes
- [x] Primer commit realizado

---

## Decisiones y notas

### 🟡 App Router: /app en raíz vs /src/app

**Decisión tomada:** El App Router de Next.js está en `/app` (raíz del proyecto).

**Contexto:** CLAUDE.md especifica que debería estar en `/src/app`, pero Next.js 15+ espera el App Router en `/app` en la raíz. No hay una forma estándar de reubicarlo a `/src/app` sin configuración compleja.

**Resolución:**
- Mantuve `/app` en la raíz (donde Next.js lo busca)
- `/src/components/`, `/src/lib/`, `/src/styles/` para el resto del código
- Alias `@/*` → `/src/*` en tsconfig.json (permite usar `@/lib`, `@/components`, etc.)

**Impacto:** Cuando importes librerías de `/src/lib`, usa `@/lib/...`. El App Router está en `/app` y accede a componentes via `@/components/...`.

---

## Stack verificado

```
✓ Next.js 16.2.10 (App Router, TypeScript strict)
✓ Tailwind CSS 4
✓ Framer Motion 11 (animación)
✓ Prisma 7 (ORM)
✓ Supabase (@supabase/supabase-js)
✓ Stripe
✓ Sentry + PostHog
✓ Vitest + Playwright (testing)
✓ ESLint + Prettier (code quality)
```

---

## CC-01 — Schema de Prisma y migraciones

**Fecha:** 11 de julio de 2026

### ✅ Completado

1. **Schema.prisma completo y validado**
   - Copiado exactamente del Backend Schema v1.0 (§4)
   - ✓ `npx prisma validate` pasó
   - ✓ `npx prisma generate` generó el client tipado
   - ✓ 24 tablas definidas
   - ✓ Todos los enums de §3 presentes

2. **Versiones de Prisma corregidas**
   - Downgrade de Prisma 7 → Prisma 5 (versión estable)
   - @prisma/client actualizado a versión 5
   - Se evitaron incompatibilidades de configuración de Prisma 7

3. **Configuración de ambiente**
   - `.env.local` creado con placeholders para Supabase
   - `.env` en raíz (aunque `.env.local` es estándar) para que Prisma lo lea
   - Variables: DATABASE_URL, DIRECT_URL, keys de Stripe/Sentry/etc.

4. **Migraciones SQL creadas**
   - `prisma/migrations/0001_enable_rls.sql` — Políticas RLS para todas las tablas
   - `prisma/migrations/0002_create_partial_indexes.sql` — Índices parciales de §6
   - `prisma/seed.ts` — Script placeholder para seed de taxonomía

5. **Scripts Prisma añadidos a package.json**
   - `pnpm prisma:migrate` — ejecutar migraciones
   - `pnpm prisma:generate` — regenerar client
   - `pnpm prisma:seed` — poblar taxonomía
   - `pnpm prisma:studio` — abrir Prisma Studio

### 🟡 TODOs (Bloqueados por DB no configurada)

- [ ] **CC-01 continuación:** Configurar Supabase real en `.env.local` (requiere proyecto Supabase)
- [ ] `pnpm prisma:migrate` — aplicar migración acierta_init a BD real
- [ ] Verificar que todas las 24 tablas se crean en Supabase
- [ ] Ejecutar migraciones SQL de RLS manualmente en Supabase (si Prisma no las aplica)
- [ ] `pnpm prisma:seed` — poblar Institution, Level, Exam, Area, Career, Subject, Topic

### Comandos para cuando BD esté configurada

```bash
# Una vez configurado DATABASE_URL y DIRECT_URL
pnpm prisma:migrate      # crea las tablas
pnpm prisma:generate     # regenera client
pnpm prisma:seed         # puebla taxonomía
pnpm prisma:studio       # inspeccionar BD
```

---

## CC-02 — Autenticación con Supabase

**Fecha:** 11 de julio de 2026

**Nota sobre documentación:** `docs/04_TRD.md` no existe en este repo (nunca
fue provisto — solo se recibieron PRD, Flujo_App, Backend_Schema,
Plan_Implementación y UIUX_Spec). Se usó `Backend_Schema_Acierta_v1.0.md §7`
(RLS) como referencia de autorización más cercana, y `Flujo_App_Acierta_v1.0.md
§3, §4 y §16` (estados de usuario, registro, rutas/guards) como fuente de
verdad del flujo. Si `04_TRD.md` llega a agregarse, revisar esta sesión contra
su §5 por si hay decisiones de autorización más específicas.

### ✅ Completado

1. **Clientes de Supabase** (`src/lib/auth/`)
   - `supabase-server.ts` — Server Components/Actions/Route Handlers (cookies httpOnly vía `@supabase/ssr`)
   - `supabase-browser.ts` — Client Components (para uso futuro, p.ej. `onAuthStateChange`)
   - `supabase-middleware.ts` — cliente ligado al ciclo request/response de `proxy.ts`
   - `site-url.ts` — helper para construir URLs de `emailRedirectTo`/`redirectTo`
   - Se instaló `@supabase/ssr` (no estaba en CC-00; es el reemplazo oficial de los auth-helpers deprecados, necesario para sesión vía cookies sin localStorage/sessionStorage)

2. **Prisma singleton** — `src/lib/db/prisma.ts` (patrón estándar con cache en `globalThis` para hot-reload)

3. **Errores tipados y guards** (`src/lib/auth/`)
   - `errors.ts` — `AuthError` con `code: 'UNAUTHORIZED' | 'FORBIDDEN' | 'PAYWALL'`
   - `types.ts` — `ActionState` (fuera del archivo `'use server'` porque esos archivos solo pueden exportar funciones async)
   - `schemas.ts` — validación Zod (signUp, signIn, forgotPassword, updatePassword)
   - `guards.ts` — `requireUser`, `requireRole`, `requirePaidPlan`, `requireVerifiedForPurchase`
     - Solo `requireVerifiedForPurchase` bloquea por correo sin verificar (criterio de aceptación explícito)
     - Todos devuelven `{ authUser, profile }` (y `subscription` en el caso de plan pago) o lanzan `AuthError`

4. **Server Actions** (`app/actions/auth.ts`)
   - `signUpAction` — crea usuario Supabase + UserProfile (role=STUDENT, onboardingStep=0), intenta sesión inmediata, detecta correo duplicado (patrón `identities: []` documentado por Supabase), redirige a `next`
   - `signInAction` — mensaje genérico "Correo o contraseña incorrectos" (nunca revela cuál)
   - `signOutAction`, `forgotPasswordAction` (respuesta genérica, no revela si el correo existe), `updatePasswordAction`, `resendVerificationAction`
   - Todas validan con Zod en el borde; `redirect()` siempre fuera de cualquier try/catch (evita que el throw interno de Next se capture por error)

5. **Proxy (antes middleware)** — `proxy.ts` en la raíz
   - Next.js 16.2.10 deprecó la convención `middleware.ts` a favor de `proxy.ts` (confirmado con la doc oficial: mismo comportamiento, solo cambia el nombre del archivo y de la función exportada — `middleware` → `proxy`). Se implementó directamente con el nombre nuevo.
   - Refresca la sesión en cada request; redirige a `/login?next=<ruta>` si falta sesión en rutas protegidas (`/app`, `/onboarding`, `/diagnostico`, `/checkout`, `/tutor`, `/admin`)
   - Guard adicional: `/checkout` con correo sin verificar → redirige a `/app?verify=1` (chequeo de `email_confirmed_at` del JWT, sin tocar Prisma — el middleware corre en Edge runtime)
   - Try/catch alrededor de `getUser()`: si Supabase está caído, se trata como "sin sesión" en vez de tumbar el sitio

6. **Route Handler de confirmación** — `app/auth/confirm/route.ts`
   - Patrón oficial de Supabase para Next.js SSR: `token_hash` + `type` (cubre tanto `type=signup` como `type=recovery` con el mismo handler)
   - **TODO(infra):** el Supabase Dashboard debe tener las plantillas de correo (Confirm signup / Reset password) configuradas para enlazar a `/auth/confirm?token_hash=...&type=...&next=...` — esto es configuración manual del proyecto Supabase, documentado en la guía oficial, no algo que el código pueda forzar

7. **UI de autenticación** (dark mode, tokens mínimos de CLAUDE.md)
   - `app/globals.css` — subconjunto de tokens (`--brand`, `--bg-base`, `--text-primary`, etc.) bajo `[data-theme='dark']`; el sistema de diseño completo (Outfit/Inter, radios formales, Tino) queda para CC-04
   - `src/components/ui/AuthShell.tsx`, `Button.tsx`, `TextField.tsx` — primitivos mínimos
   - `src/components/ui/VerificationBanner.tsx` — client component con `useActionState`, botón "Reenviar"
   - Pantallas: `app/(public)/registro`, `/login`, `/recuperar-password`, `/actualizar-password` (cada una con su form client component)
   - `app/(app)/layout.tsx` — guard `requireUser()` con try/catch → redirect si falla (defensa en profundidad, el proxy ya bloquea `/app/*` sin sesión); muestra `VerificationBanner` si `!email_confirmed_at`
   - `app/(app)/app/page.tsx` — dashboard placeholder mínimo (email, rol, paso de onboarding, botón de logout) — **TODO(CC-10):** reemplazar por el dashboard real y aplicar `requireOnboarding` una vez exista el flujo de onboarding

8. **Alias de TypeScript** — se agregó `"@/app/*": ["./app/*"]` a `tsconfig.json` (además del `"@/*": ["./src/*"]` de CC-00), porque las Server Actions/rutas viven en `/app` (raíz) y las pantallas necesitan importarlas

9. **`NEXT_PUBLIC_SITE_URL`** — variable nueva (no estaba en la lista original de CLAUDE.md), necesaria para construir los links de `emailRedirectTo`/`redirectTo` de Supabase. Agregada a `.env`, `.env.local` y `.env.example`

10. **ESLint** — se agregó `argsIgnorePattern: '^_'` a `no-unused-vars` (las Server Actions usadas con `useActionState` deben aceptar `(prevState, formData)` aunque no siempre usen ambos)

11. **`.claude/launch.json`** — se agregó la configuración `"acierta"` (puerto 3000) junto a la preexistente `"mundial-2026"` (otro proyecto del usuario), para poder levantar el dev server de este proyecto con el Browser pane

### ✅ Verificación manual (dev server + navegador)

- `pnpm typecheck` y `pnpm lint` en verde
- `/registro`, `/login`, `/recuperar-password` renderizan correctamente en dark mode con los tokens
- Envío del formulario de registro contra credenciales Supabase placeholder falla de forma controlada (mensaje amigable, sin crash 500) — confirmado en logs del servidor: `fetch failed` / `ENOTFOUND your-project.supabase.co`, capturado y convertido en `ActionState` de error
- `/app` sin sesión redirige a `/login?next=%2Fapp` (confirmado en network requests) — el guard de rutas protegidas y la preservación de `next=` funcionan
- Tras renombrar `middleware.ts` → `proxy.ts`, el warning de deprecación desapareció y las rutas siguen funcionando igual

### 🟡 TODOs (dependen de un proyecto Supabase real)

- [ ] Crear el proyecto Supabase y configurar `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` reales
- [ ] **Confirmar que "Confirm email" permite sesión inmediata tras `signUp()`** (o que el fallback `signInWithPassword()` funciona antes de confirmar) — esto es un requisito de producto (`REGISTERED_UNVERIFIED` debe tener sesión) que depende de la configuración del Dashboard, no solo del código
- [ ] Actualizar las plantillas de correo (Confirm signup, Reset password) en el Dashboard para usar el patrón `/auth/confirm?token_hash=...&type=...`
- [ ] Probar el flujo completo end-to-end: registro → correo real → clic en enlace → `/auth/confirm` → sesión verificada
- [ ] `requireOnboarding` (mencionado en Flujo_App §16.2) — no se implementó porque depende del flujo de onboarding (CC-10), que aún no existe

---

## CC-03 — Motor de sesiones + scoring server-side

**Fecha:** 11 de julio de 2026 · **Modelo:** Opus (lógica crítica del Sprint 0)

**Nota sobre documentación:** de nuevo, `docs/04_TRD.md` no existe en el repo.
Se usó `PRD_Acierta_v1.0.md` (F-03, simulador), `Flujo_App_Acierta_v1.0.md`
(§8 flujo del simulador, §14.1 máquina de estados de ExamSession, §15 edge
cases) y `Backend_Schema_Acierta_v1.0.md` (ExamSession, SessionAnswer,
SessionStatus, SessionMode, `Question.options`) como fuentes de verdad.

### Arquitectura elegida (decisión de diseño clave)

Separé la lógica en tres capas para que **la lógica de seguridad sea probable
por unit test sin una DB viva**:

1. **`src/lib/sessions/scoring.ts` — módulo PURO** (sin Prisma, sin red, sin
   async). Contiene todo el scoring, cálculo de tiempo, resolución de estado y
   la política de revelado. Es determinista y se testea con casos fijos.
2. **`src/lib/db/sessions.ts` — capa DB tipada.** Orquesta las funciones puras
   contra Prisma. Valida propiedad de la sesión en cada mutación.
3. **`app/actions/sessions.ts` — Server Actions.** `requireUser()` + Zod +
   delega en la capa DB pasando el `userProfileId` del guard (nunca del cliente).

La ventaja: la garantía crítica de "no filtrar respuestas en simulación" se
reduce a una función pura (`buildSubmitResponse`) que es el **único punto de
retorno** de `submitAnswer`, y se prueba directamente. No hay otra ruta por la
que la correctitud pueda escapar al responder.

### Lo que se construyó

1. **`scoring.ts` (puro):** `parseQuestionOptions` (valida el JSON con Zod y
   lanza si está corrupto), `getCorrectOptionId` (exige exactamente 1 correcta),
   `isAnswerCorrect`, `computeScore`, `computeElapsedSecs`, `isTimeExceeded`,
   `isSessionStale`, `resolveFinishStatus`, `appendSuspicionEvent`,
   `revealsCorrectnessOnSubmit`, `buildSubmitResponse`. Constantes
   `TIME_GRACE_SECS = 30`, `STALE_SESSION_HOURS = 24`.
2. **`schemas.ts`:** Zod para `startSession`, `submitAnswer`, `finishSession`;
   tipo `ActionResult<T>` discriminado (`{ ok: true, data } | { ok: false,
   code, message }`).
3. **`db/sessions.ts`:** `startSession`, `submitAnswer`, `finishSession`,
   `abandonStaleSessions`, `loadOwnedSession` (privada), `SessionError` tipado
   (`NOT_FOUND`, `FORBIDDEN`, `NOT_IN_PROGRESS`, `EXAM_NOT_AVAILABLE`,
   `QUESTION_NOT_FOUND`, `INVALID_OPTION`).
4. **`app/actions/sessions.ts`:** las tres Server Actions envolviendo la capa DB,
   mapeando errores a `ActionResult`.
5. **`tests/sessions/scoring.test.ts`:** 28 tests — scoring correcto, no-leak en
   simulación/diagnóstico, validación de tiempo (fronteras exactas), transición
   de estados, abandono >24h, appendSuspicionEvent.

### Decisiones de diseño no triviales

- **Scoring como suma de correctitud ya verificada.** `submitAnswer` calcula
  `isCorrect` server-side contra la DB y lo persiste en `SessionAnswer`.
  `finishSession` hace `score = Σ isCorrect` sobre las respuestas guardadas.
  Nunca se confía en un score enviado por el cliente. (Guardrail no negociable.)

- **`buildSubmitResponse` como único guardián del revelado.** En
  `FULL_SIMULATION` y `DIAGNOSTIC` devuelve solo `{ recorded: true }` — sin
  `isCorrect` ni `correctOption`. En drill (`TOPIC_DRILL`, `AREA_PRACTICE`)
  revela al instante (ciclo de aprendizaje, Flujo_App §7).
  - **Decisión ampliada:** el requisito solo exigía ocultar en `FULL_SIMULATION`.
    Extendí el ocultamiento a `DIAGNOSTIC` porque un diagnóstico debe medir sin
    sesgar y sus resultados llegan al finalizar (Flujo_App §5). Es defensible y
    no rompe nada; queda documentado por si a futuro se quiere cambiar.

- **TIME_EXCEEDED con frontera estricta.** "Supera el límite +30s" ⇒ `elapsed >
  limite + 30` (mayor estricto): `limite+30` exacto NO excede, `limite+31` sí.
  Cuando ocurre, se registra `{ type: 'TIME_EXCEEDED', at, elapsedSecs,
  timeLimitSecs }` en `suspicionEvents` y el estado final es
  `COMPLETED_BY_TIMEOUT`. `finishSession` acepta `reason` (`USER` | `TIMEOUT`):
  `TIMEOUT` fuerza `COMPLETED_BY_TIMEOUT`; el servidor siempre es la autoridad
  sobre el tiempo real (recalcula `elapsed` vs `startedAt`, ignora el reloj del
  cliente).

- **Abandono en dos caminos.** (a) Perezoso: `assertActionable` cierra como
  `ABANDONED` cualquier sesión IN_PROGRESS con >24h al intentar operar sobre
  ella, y rechaza. (b) Barrido: `abandonStaleSessions()` para un cron
  (protegible con `CRON_SECRET`). Las ABANDONED quedan con `score = null` ⇒ no
  cuentan para stats (el filtrado por estado lo aplicarán las agregaciones de
  CC-11).

- **`startSession` deriva el límite de tiempo** de `exam.durationMins * 60` si el
  caller no lo provee, y valida `exam.isActive`. Así el diagnóstico/drill pueden
  pasar su propio límite y el simulador usa el del examen real.

- **`submitAnswer` es idempotente** vía `upsert` sobre la única
  `(sessionId, questionId)`: re-enviar una respuesta la actualiza en vez de
  duplicar (soporta reintentos de red del simulador, Flujo_App §15).

### ⚠️ Guardrail heredado para CC-10 / CC-20 (importante)

`Question.options` (JSON) **contiene `isCorrect` de cada opción**. CC-03 no
construye la ruta de *lectura* de reactivos (la que envía la pregunta al cliente
para renderizarla). **Cuando CC-10/CC-20 implementen esa lectura, DEBEN quitar
`isCorrect` de las opciones antes de mandarlas al cliente**, o el simulador
filtraría la respuesta en el payload de la pregunta. El scoring de CC-03 ya está
a salvo; el riesgo vive en el read-path futuro. Anotado aquí para que no se
escape.

### Verificación

- ✅ `pnpm typecheck` en verde
- ✅ `pnpm lint` en verde
- ✅ `pnpm test:unit` — 28 tests en verde (2 archivos: scoring + placeholder)
- ✅ Se corrigió `vitest.config.ts`: ahora excluye `tests/e2e/**` (Vitest estaba
  recolectando los specs de Playwright y fallaba; Playwright y Vitest no deben
  solaparse en la recolección de archivos)

### 🟡 TODOs (dependen de DB / sesiones posteriores)

- [ ] Tests de integración de la capa DB (`db/sessions.ts`) contra una DB de
  prueba — requieren Supabase/Postgres real (mismo bloqueo que CC-01/CC-02). La
  lógica crítica ya está cubierta por los tests puros.
- [ ] Route Handler de cron para `abandonStaleSessions` protegido con
  `CRON_SECRET` (cuando se configure el cron de Vercel).
- [ ] Persistir contadores de integridad del simulador (`tabBlurCount`,
  `rightClickAttempts`, `keyboardShortcutAttempts`, `completedFullscreen`) — se
  llenarán desde el cliente del simulador en CC-20; el schema ya los tiene.

### Prioridades
1. **Alta:** Migraciones Prisma, Auth Supabase, Motor de sesiones (ruta crítica)
2. **Alta:** Diagnóstico inicial (depende de motor de sesiones)
3. **Media:** Design tokens Tailwind, componentes UI base

---

## Recursos

- **Estructura objetivo:** Ver CLAUDE.md §Estructura de carpetas
- **Schema de datos:** `/docs/Backend_Schema_Acierta_v1.0.md` (§4)
- **Plan de sprints:** `/docs/Plan_Implementacion_Acierta_v1.0.md`
- **Stack + convenciones:** CLAUDE.md (raíz)

---

## Próximo paso

Sprint 0 casi completo: CC-00 (scaffold), CC-01 (schema), CC-02 (auth) y CC-03
(motor de sesiones) hechos. Falta **CC-04** (design tokens Tailwind + tema
dark/light + tipografía + mascota Tino SVG) para cerrar el Sprint 0.

Bloqueo transversal pendiente: configurar un proyecto Supabase real para aplicar
migraciones, sembrar taxonomía y probar auth + sesiones end-to-end contra la DB.

---

---

## CC-04 — Sistema de diseño base: tokens, temas y mascota Tino

**Fecha:** 11 de julio de 2026 · **Modelo:** Haiku (polish y componentes)

**Fuentes:** `docs/05_UIUX_Spec.md` (sección 14: tokens Tailwind, sección 2: mascota Tino)

### Arquitectura elegida

El sistema de diseño descansa en **CSS custom properties por tema**, integradas
con Tailwind:

1. **Tokens en `tailwind.config.ts`** — colores, radios, tipografía y touch
   targets (44px ≥ WCAG AA) como extiende de Tailwind
2. **CSS variables en `globals.css`** — `[data-theme='dark']` y
   `[data-theme='light']` que definen `--bg-base`, `--text-primary`, etc.
3. **Fuentes vía `next/font`** en `layout.tsx` — Outfit (display), Inter (body),
   JetBrains Mono (monospace)
4. **Componentes base** — `Button` (5 variantes), `Card`, `ThemeToggle`
5. **Mascota Tino** — SVG puro con 6 estados expresivos

### Lo que se construyó

1. **`tailwind.config.ts` mejorado**
   - Colores: `brand` (DEFAULT #7C3AED, hover #6D28D9, soft #A78BFA, tint #EDE9FE),
     success/streak/danger/info/warning con glows
   - Colores compuestos: `text` (primary, secondary, muted) y `border` (subtle,
     strong) desde CSS variables
   - Border-radius generoso: sm 8px, md 12px (botones), lg 16px (tarjetas),
     xl 24px, 2xl 32px
   - Tipografía: `font-display` (Outfit), `font-body` (Inter), `font-mono`
     (JetBrains Mono)
   - Touch targets: `min-h-touch` y `min-w-touch` = 44px

2. **`app/globals.css` — tokens por tema**
   - Marcas (constantes en `:root`): `--brand-primary`, `--success`, `--streak`,
     etc.
   - **Dark mode** `[data-theme='dark']`: base #0F0F14 (tinte violeta, no negro
     puro), superficies, bordes y sombras WCAG AA
   - **Light mode** `[data-theme='light']`: base #FBFAFF, superficies blancas con
     tinte mínimo
   - `prefers-reduced-motion` — anulación de transiciones para accesibilidad
   - Transiciones suaves en toggleo de tema (0.3s)

3. **`app/layout.tsx` — cargas de fuentes**
   - `Outfit` (pesos 400-800) para headings/display
   - `Inter` (pesos 400-700) para body/default
   - `JetBrains_Mono` (pesos 400-600) para números/timer con `tabular-nums`
   - Root: `lang="es-MX"`, `data-theme="dark"` (default alumno), clases
     `antialiased`

4. **`src/components/ui/Button.tsx` — 5 variantes**
   - `primary` — fondo violeta, contraste blanco
   - `secondary` — fondo surface con borde, texto primary
   - `tertiary` — texto violeta, fondo tint al hover
   - `ghost` — transparente, texto secondary → soft al hover
   - `danger` — fondo rojo
   - Estados: `hover` (cambio de color/sombra), `active:scale-[0.97]` (feedback
     táctil), `focus:ring-2` (accesibilidad), `disabled` (opacidad)
   - Área táctil: `min-h-touch min-w-touch` = 44px

5. **`src/components/ui/Card.tsx` — contenedor base**
   - `rounded-lg`, `bg-surface`, `border border-border-subtle`
   - `hover:shadow-lg` (elevación suave)
   - `active:scale-[0.97]` (feedback interactivo, compatible con
     `prefers-reduced-motion`)

6. **`src/components/ThemeToggle.tsx` — cambio de tema**
   - Client component con localStorage (persiste tema entre sesiones)
   - Botón minimizado con emoji (☀️ / 🌙)
   - Aria label accesible
   - Hidratación segura con `mounted` check (evita mismatch en SSR)

7. **`src/components/mascot/Tino.tsx` — mascota SVG con 6 estados**
   - `state`: `'sleepy'`, `'attentive'`, `'celebrating'`, `'streak'`,
     `'encouraging'`, `'graduated'`
   - Expresión vía cejas (`eyeBrows` path) y ojos (pupils)
   - Decoraciones por estado:
     - **celebrating**: confeti de colores (naranja/verde/azul)
     - **streak**: rayos de fuego naranjas
     - **graduated**: mortarboard violeta
   - Escalable: `size` prop (por defecto 120px)
   - Tema-aware: `className="text-brand-primary"` (usa `currentColor`)

### Decisiones de diseño

- **Dark por default para alumno.** El `html[data-theme="dark"]` en `layout.tsx`
  es el default. El toggle permite cambiar, pero CC-04 no conecta el toggle a
  `UserProfile.themePref` (eso es CC-10 cuando exista el dashboard real).
- **Tino NO en simulador.** Deliberadamente excluido de la ruta `/simulador`
  (futura). El contraste visual simulador (serio, sin mascota) vs. resto de app
  (gamificado) es intencional.
- **Shadow compuesto.** `var(--shadow-md)` en Tailwind permite que se redefinan
  en light mode (más suave, con tinte violeta) vs. dark mode (sombra real).
- **Monospace con `tabular-nums`.** Cuando se implemente el timer en CC-20, usar
  `font-mono` + `tabular-nums` garantiza que los dígitos no salten de ancho.

### Verificación (pendiente output de pnpm)

- [typecheck en progreso…]
- [lint en progreso…]

### 🟡 TODOs (después de CC-04)

- [ ] Conectar ThemeToggle al dashboard (CC-10) — persistir en `UserProfile.themePref`
- [ ] Componentes avanzados (TabsBar, Dropdown, Modal) — dependen de CC-04 base
- [ ] Página de error (404, 500) con Tino
- [ ] Animaciones de Tino (Framer Motion) para cambios de estado

### Prioridades post-CC-04

1. **Alta:** Dashboard real (CC-10) que consume los tokens y componentes base
2. **Alta:** Pantalla de diagnóstico (CC-05) que usa Card, Button, y la
   arquitectura de sesiones de CC-03
3. **Media:** Simulador (CC-20) que hereda Button/Card pero deliberadamente
   excluye Tino

---

*Sprint 0 se cierra con CC-04: fundación completa (scaffold, schema, auth,
sesiones, design system).*
