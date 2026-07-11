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

## TODOs para próximas sesiones

### CC-01 — Schema de Prisma y migraciones
- [ ] Configurar DATABASE_URL y DIRECT_URL en `.env.local`
- [ ] `pnpm prisma migrate dev --name acierta_init`
- [ ] `pnpm prisma generate`
- [ ] Crear índices parciales SQL (recomendado en schema.prisma §6)
- [ ] Verificar que todas las tablas se crean correctamente

### CC-02 — Autenticación con Supabase
- [ ] Configurar NEXT_PUBLIC_SUPABASE_URL y claves en `.env.local`
- [ ] Crear el cliente de Supabase en `src/lib/auth/supabase.ts`
- [ ] Implementar Server Actions de registro, login, logout
- [ ] Guards de autenticación (`requireAuth`, `requireOnboarding`)
- [ ] Verificación diferida de email

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
