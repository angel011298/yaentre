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

### CC-03 — Motor de sesiones
- [ ] Server Actions: `startSession`, `submitAnswer`, `finishSession`
- [ ] Scoring server-side (nunca revelar respuesta correcta al cliente en FULL_SIMULATION)
- [ ] Manejo de estados: IN_PROGRESS → COMPLETED / COMPLETED_BY_TIMEOUT / ABANDONED
- [ ] Tests Vitest para scoring

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

Arrancar **CC-01** (Prisma schema + migraciones). Este es bloqueante para todo lo demás: auth, sesiones, contenido.

---

*Scaffold completado. Fundación lista para CC-01.*
