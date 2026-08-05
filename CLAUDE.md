# CLAUDE.md — Acierta

> Contexto permanente del proyecto para todas las sesiones de Claude Code.
> Léelo completo antes de cualquier tarea. La documentación de detalle vive en `/docs`.

---

## Qué es Acierta

**Acierta** (acierta.mx) es una plataforma SaaS web/PWA de preparación autogestionable para los exámenes de admisión **en línea** de la UNAM, IPN, UAM y CENEVAL (EXANI II), niveles Medio Superior y Superior. El diferenciador central es un **simulador fiel del entorno del examen en línea** + un **motor adaptativo determinista** (diagnóstico → ruta personalizada → Aciertómetro que predice aciertos). Público: aspirantes de 15-22 años (usuario) y sus padres (pagador). **Launch: 6 de enero de 2027.**

Fase 1 es 100% autogestionable (sin profesores ni clases en vivo). La arquitectura deja lista la Fase 2 (video, livestream, notas de profesor) **inactiva** (`ContentStatus.INACTIVE`).

---

## Repositorio

- **Repo nuevo desde cero.** No hay migración de Certifik PLD; el reúso es conceptual (patrones del motor de preguntas), no de código ni datos.
- **OS de desarrollo:** Windows (Lenovo). Rutas locales estilo `C:\Users\LENOVO\...`.
- **Gestor de paquetes:** `pnpm` (no usar npm ni yarn).

---

## Documentación de referencia (`/docs`)

Toda decisión de producto y arquitectura está en estos documentos. **Consúltalos según la tarea; no reinventes decisiones ya tomadas.**

| Documento | Para qué |
|---|---|
| `PRD_Acierta_v1.0.md` | Requerimientos de producto, features, criterios de aceptación |
| `UIUX_Spec_Acierta_v1.0.md` | Sistema de diseño, tokens, componentes, mascota Tino |
| `Flujo_App_Acierta_v1.0.md` | Flujos de usuario, estados, edge cases, máquinas de estado |
| `Backend_Schema_Acierta_v1.0.md` | **Schema de Prisma final, enums, índices, RLS, seeds** |
| `Plan_Implementacion_Acierta_v1.0.md` | Sesiones CC, orden de construcción, dependencias |
| `ESTADO.md` | **Estado vivo del proyecto — consultar SIEMPRE antes de cualquier tarea** |

---

## Stack tecnológico

```
Framework:      Next.js 15 (App Router, RSC) + TypeScript (strict)
Estilos:        Tailwind CSS 4
Animación:      Framer Motion 11
Estado:         RSC + useState; Zustand SOLO en el simulador
Backend/BaaS:   Supabase (PostgreSQL, Auth, Storage)
ORM:            Prisma
Pagos:          Stripe (tarjeta, OXXO, SPEI)
Email:          Resend
Observabilidad: Sentry + PostHog
Deploy:         Vercel (us-east-1)
Fórmulas:       KaTeX
Contenido:      100% vía sesiones de Claude Code, usando la suscripción
                existente — NUNCA la API de pago de Anthropic
```

---

## Comandos

```bash
pnpm dev                      # desarrollo local
pnpm build                    # build de producción
pnpm typecheck                # tsc --noEmit (correr siempre antes de commit)
pnpm lint                     # ESLint
pnpm test:unit                # Vitest (motor, scoring, webhook)
pnpm test:e2e                 # Playwright (simulador)
pnpm prisma migrate dev       # migración en desarrollo
pnpm prisma generate          # regenerar client tipado
pnpm prisma db seed           # sembrar taxonomía (no reactivos)
pnpm prisma studio            # inspeccionar DB
```

---

## Decisiones de arquitectura (no negociables)

Estas decisiones vienen del TRD. **No las contradigas sin instrucción explícita.**

1. **Next.js-first.** La lógica vive en Server Actions (mutaciones), RSC (lectura) y Route Handlers (webhooks, motor adaptativo). **No** usar Supabase Edge Functions salvo excepción justificada.
2. **Motor adaptativo determinista.** Reglas explícitas (spaced repetition + promedio ponderado). **Sin ML ni llamadas a IA en runtime.** Funciones puras y testeables.
3. **Scoring siempre server-side.** La correctitud se calcula en el servidor comparando contra la DB. En modo simulacro, la respuesta correcta **nunca** viaja al cliente hasta finalizar.
4. **Pagos se activan SOLO por webhook** de Stripe, nunca desde el redirect de éxito. Idempotencia vía `ProcessedStripeEvent.eventId`.
5. **Zustand solo en el simulador.** El resto del estado es RSC + useState. No introducir un store global.
6. **Prisma es la fuente de verdad** del modelo de datos. Ningún acceso a datos fuera de él.
7. **RLS obligatorio** en todas las tablas con datos de usuario. Las escrituras del sistema usan `SERVICE_ROLE_KEY` (solo servidor).

---

## Reglas de la capa de datos

- El schema completo está en `/docs/Backend_Schema_Acierta_v1.0.md`.
- Taxonomía dinámica: Institución → Área → Materia → Tema es **data (seed)**, no código.
- `Subject.questionWeight` = # de reactivos esperados de esa materia en el examen real. Es el input del Aciertómetro.
- `Question.isVerified`: ningún reactivo con `false` es visible para usuarios. El pipeline de IA inserta `false`; el admin lo pasa a `true`.
- **Nunca borrar reactivos con respuestas históricas** (rompe el aprendizaje). Despublicar con `isVerified=false`.
- El `LearningProfile` sobrevive entre ciclos (clave para re-engagement de rechazados).

---

## Sistema de diseño (resumen)

Detalle completo en `/docs/UIUX_Spec_Acierta_v1.0.md`. Dirección: **cálido y gamificado (Duolingo/Brilliant)**, no corporativo.

```css
/* Marca */
--brand: #7C3AED;  --brand-hover: #6D28D9;  --brand-soft: #A78BFA;
/* Gamificación */
--success: #22C55E;  --streak: #F97316;  --danger: #EF4444;  --info: #38BDF8;
/* Superficies dark (default alumno): --bg-base #0F0F14 (tinte violeta, no negro puro) */
/* Superficies light (default panel parental): --bg-base #FBFAFF */
```

- **Tipografía:** Outfit (display), Inter (body), JetBrains Mono (números/timer, `tabular-nums`).
- **Radios generosos:** botones 12px, tarjetas 16px, contenedores 24-32px (firma del look amigable).
- **Temas:** dark por default en la app del alumno; light por default en el panel parental. Ambos desde el MVP.
- **Mascota: Tino el tecolote** (búho mexicano). Aparece en logros, estados vacíos y onboarding. **No** en el simulador. Voz motivadora, nunca regaña.
- **Simulador = excepción visual:** deliberadamente serio, sin Tino, sin gamificación, solo el timer con color. El contraste es intencional.
- **Accesibilidad:** WCAG AA, área táctil ≥44px, respetar `prefers-reduced-motion`, color nunca es el único canal (✓/✗ + texto).

---

## Feature flags

Controlan la activación gradual de instituciones post-launch (env vars):

```
NEXT_PUBLIC_ENABLE_UAM=false            # activar semana 2-3 post-launch
NEXT_PUBLIC_ENABLE_EXANI=false          # activar semana 3-4 post-launch
NEXT_PUBLIC_ENABLE_MEDIA_SUPERIOR=false # sprint post-launch
```

**Launch del 6 ene = solo UNAM Superior + IPN Superior.** No bloquear la fecha por las otras instituciones.

---

## Convención de sesiones de Claude Code

Cada tarea es una sesión autónoma con criterios de aceptación explícitos (ver `/docs/Plan_Implementacion_Acierta_v1.0.md`).

**Asignación de modelo por tipo de tarea:**

| Tier | Cuándo | Ejemplos |
|---|---|---|
| 🟣 Fable 5 | Lógica que define el negocio (máximo razonamiento) | pipeline de contenido, motor adaptativo, simulador, integración de pagos |
| 🔴 Opus | Razonamiento denso y verificación de implementaciones críticas | scoring, webhook Stripe, integridad de integraciones |
| 🟡 Sonnet | Features de negocio, CRUD, integración, búsqueda web | dashboard, drill, onboarding, panel admin, Server Actions |
| 🟢 Haiku | DDL, seeds, boilerplate, polish | migraciones, seed de taxonomía, tokens, componentes de presentación |

**Toda sesión debe:**
- Terminar con `pnpm typecheck` y `pnpm lint` en verde.
- Incluir tests Vitest si toca lógica crítica (scoring, motor, pagos).
- Respetar los design tokens y las convenciones de este archivo.
- **No** modificar `prisma/schema.prisma` sin instrucción explícita.

---

## Guardrails críticos (nunca hacer)

- ❌ No enviar `isCorrect` ni la respuesta correcta al cliente antes de que responda.
- ❌ No activar acceso de pago desde el redirect del cliente (solo webhook).
- ❌ No exponer `SERVICE_ROLE_KEY` ni `STRIPE_SECRET_KEY` al cliente (nada con `NEXT_PUBLIC_`).
- ❌ No usar `localStorage`/`sessionStorage` para datos sensibles ni de sesión (Supabase maneja auth).
- ❌ No usar la API de pago de Anthropic (SDK, `ANTHROPIC_API_KEY`) en ningún lugar del proyecto, ni en runtime ni en scripts offline.
- ❌ No poner `ContentItem.status = ACTIVE` en Fase 1 (queda `INACTIVE`).
- ❌ No borrar reactivos con respuestas históricas.
- ❌ No introducir un state manager global (Zustand solo en el simulador).
- ❌ Al componer un lote de reactivos, no dejar la respuesta correcta concentrada en una sola posición: distribuirla de forma pareja entre las cuatro opciones, y citar los distractores por su contenido, nunca por su letra — el simulador no baraja opciones para todas las instituciones (`shuffleOptions:false` en `src/lib/simulator/config.ts` para IPN/UAM/CENEVAL/CNBV). Todo lote debe pasar `scripts/lib/lot-validation.ts` (`content:validate-batch` / paso obligatorio de `content:insert`) antes de insertarse — ver G3b/G3c en `docs/ESTADO.md`.

---

## Estructura de carpetas (objetivo)

```
/
├── CLAUDE.md                 ← este archivo
├── docs/                     ← los 8 documentos de planeación
├── prisma/
│   ├── schema.prisma
│   └── seed/                 ← seeds de taxonomía por institución
├── scripts/
│   └── content-insert-drafts.ts, content-blind-batch.ts,
│       content-resolve-verification.ts ← pipeline de contenido vía
│       sesiones de Claude Code (nunca API de pago)
├── src/
│   ├── app/                  ← rutas (App Router)
│   │   ├── (public)/         ← landing, precios, registro, login
│   │   ├── (app)/            ← dashboard, practicar, simulador, progreso, perfil
│   │   ├── (parent)/         ← panel parental
│   │   ├── admin/            ← panel de contenido
│   │   ├── actions/          ← Server Actions
│   │   └── api/              ← Route Handlers (webhooks, adaptive, admin)
│   ├── components/
│   │   ├── ui/               ← botones, tarjetas, inputs
│   │   ├── exam/             ← QuestionCard, OptionButton, Timer, ...
│   │   ├── gamification/     ← StreakFlame, Aciertometro, Tino, ...
│   │   └── mascot/           ← Tino SVG + estados
│   ├── lib/
│   │   ├── db/               ← capa de acceso a datos (Prisma)
│   │   ├── adaptive/         ← motor determinista (puro, testeado)
│   │   ├── auth/             ← guards
│   │   ├── stripe/           ← integración de pagos
│   │   └── stores/           ← Zustand (solo simulador)
│   └── styles/               ← globals.css, tokens
└── tests/                    ← Vitest + Playwright
```

---

## Variables de entorno

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=      # solo servidor
DATABASE_URL=                    # pooled
DIRECT_URL=                      # migraciones
# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
# Email / Observabilidad
RESEND_API_KEY=
NEXT_PUBLIC_SENTRY_DSN=
NEXT_PUBLIC_POSTHOG_KEY=
# Feature flags
NEXT_PUBLIC_ENABLE_UAM=false
NEXT_PUBLIC_ENABLE_EXANI=false
NEXT_PUBLIC_ENABLE_MEDIA_SUPERIOR=false
# Cron
CRON_SECRET=
```

`.env.local` en `.gitignore`; `.env.example` versionado con placeholders.

---

## Convenciones de código

- **TypeScript strict.** Sin `any` salvo justificación.
- **Validación con Zod** en el borde de cada Server Action y Route Handler.
- **Español mexicano** en todo el copy de cara al usuario; inglés en código/comentarios técnicos.
- **Nombres de tablas** en snake_case (via `@@map`); modelos Prisma en PascalCase.
- **Commits** en español, imperativos, con prefijo de tipo: `feat:`, `fix:`, `chore:`, `test:`.
- **Errores de cara al usuario:** explican qué pasó y cómo seguir, en la voz de la interfaz, sin disculpas excesivas.

---

## Testing

Enfoque calibrado a 1 dev: testear donde un bug cuesta dinero o confianza.

- 🔴 Obligatorio: motor adaptativo, scoring, webhook Stripe (Vitest); simulador end-to-end (Playwright).
- 🟡 Recomendado: RLS (script SQL), integración de pagos.
- ⚪ No: unit tests de UI ni de animaciones (se cubren con E2E + verificación manual).
- `pnpm typecheck` es la primera red de seguridad y debe estar siempre en verde.

---

## Estado del proyecto

**El estado vivo está en `/docs/ESTADO.md` — consúltalo SIEMPRE antes de empezar cualquier fase.**

Pipeline de contenido: verificación adversarial garantiza calidad sin freelancers, ejecutada íntegramente dentro de sesiones de Claude Code/chat (nunca la API de pago). Dos sesiones independientes (una compone el reactivo, otra lo resuelve a ciegas sin ver la respuesta) deben coincidir para publicar un reactivo; las discrepancias sin resolver no se publican.

---

*Mantén este archivo actualizado cuando cambien decisiones estructurales. Es la brújula de cada sesión.*
