# Plan de Implementación — YaEntre
## Execution Plan & Claude Code Session Map · v1.0

| Campo | Detalle |
|---|---|
| **Producto** | YaEntre (yaentre.mx) |
| **Documento** | Implementation Plan |
| **Versión** | 1.0 |
| **Fecha** | 9 de julio de 2026 |
| **Capacidad** | ~12 hrs/semana (nights & weekends), 1 founder-dev |
| **Arranque** | Julio 2026 · **Launch: 6 enero 2027** |
| **Método** | Claude Code autónomo con criterios de aceptación explícitos |
| **Depende de** | PRD · TRD · UI/UX · Flujo de App · Backend Schema (v1.0) |

---

## Tabla de contenidos

1. Reality check: la matemática honesta de la capacidad
2. La estrategia que protege la fecha de lanzamiento
3. Convención de sesiones de Claude Code
4. Asignación de modelos por tipo de tarea
5. Ruta crítica y dependencias
6. Track A — Desarrollo (sprint por sprint)
7. Track B — Contenido (pipeline paralelo)
8. Prompts ejemplares listos para Claude Code
9. Plantilla reutilizable de prompt
10. Líneas de corte (qué se sacrifica si hay retraso)
11. Calendario maestro y milestones

---

## 1. Reality check: la matemática honesta de la capacidad

Antes del plan, la verdad de los números:

```
Julio 2026 → 6 enero 2027  =  ~25 semanas
25 semanas × 12 hrs/sem     =  ~300 horas de tu tiempo
(−) descansos:
    - Viaje Puerto Vallarta (fin jul/ppio ago)   −1 semana
    - Vacaciones decembrinas                      −2 semanas
Capacidad real efectiva     ≈  ~22 sprints-semana ≈ 264 horas
```

**El problema si construyeras a mano:** 264 horas no alcanzan para todo el scope (motor adaptativo + simulador + pagos + panel parental + 4 instituciones + 1,500 reactivos verificados). Sería una fantasía.

**Por qué sí es viable con tu setup:** Claude Code no consume tus horas escribiendo cada línea — tú **orquestas, revisas y decides**. Tus 12 hrs/semana se van a: escribir prompts con criterios de aceptación, revisar PRs, probar, y tomar decisiones. Eso multiplica la velocidad efectiva de código 3-5×.

> **El verdadero cuello de botella no es el código — es el contenido.** Verificar 1,500 reactivos a mano son ~100-125 horas de tu tiempo. Eso solo, a 12 hrs/semana, se comería casi la mitad de tu capacidad total. **Decisión crítica del plan: NO verificas los reactivos tú.** Delegas la revisión a 2-3 freelancers (egresados UNAM/IPN, ~$4 MXN/reactivo), y tu tiempo se reserva para orquestar Claude Code y para las decisiones de producto. Este es el ajuste que hace todo el plan realista.

---

## 2. La estrategia que protege la fecha de lanzamiento

Cuatro decisiones estratégicas para que enero 2027 sea real:

| # | Decisión | Por qué |
|---|---|---|
| E1 | **Contenido arranca en paralelo desde el Sprint 1** | El pipeline de IA + revisión freelance corre como track independiente. No esperar a "terminar el código" para empezar reactivos. |
| E2 | **Lanzar con núcleo UNAM Superior + IPN Superior; UAM/EXANI/Media Superior tras feature flags** | Consistente con el TRD. Protege la fecha: el día 1 no necesita las 4 instituciones completas. |
| E3 | **Delegar revisión de reactivos a freelancers** | Libera tus horas para lo que solo tú puedes hacer: orquestar y decidir. |
| E4 | **Early Bird (1 oct) como forcing function** | Vender antes de terminar valida demanda y financia el marketing. Fuerza a tener lo mínimo vendible pronto. |

**Scope realista del día del launch (6 ene 2027):**
- ✅ UNAM Superior (4 áreas) — núcleo
- ✅ IPN Superior (3 ramas) — núcleo
- ✅ Simulador, diagnóstico, motor adaptativo, dashboard, panel parental, pagos
- 🚩 UAM → feature flag, semana 2-3 post-launch
- 🚩 EXANI II → feature flag, semana 3-4 post-launch
- 🚩 Media Superior → sprint post-launch

---

## 3. Convención de sesiones de Claude Code

Cada tarea es una **sesión autónoma de Claude Code** con esta estructura (alineada a tu flujo: autonomía total, sin intervención a media ejecución, criterios de aceptación explícitos en el prompt).

```
┌─────────────────────────────────────────────────────┐
│ SESIÓN CC-[ID]                                        │
│ Modelo:        [🔴 Opus / 🟡 Sonnet / 🟢 Haiku]       │
│ Depende de:    [IDs de sesiones previas]              │
│ Contexto:      [docs relevantes en /docs]             │
│ Objetivo:      [qué construir, 1-2 líneas]            │
│ Criterios de aceptación:                              │
│   [ ] criterio testable 1                             │
│   [ ] criterio testable 2                             │
│   [ ] ...                                             │
│ Tu tiempo (revisión): [~X hrs]                        │
└─────────────────────────────────────────────────────┘
```

**Reglas de tu workflow aplicadas:**
- Los 6 documentos (`Estudio, Blueprint, PRD, TRD, UI/UX, Flujo, Backend Schema`) viven en `/docs` del repo → contexto permanente para toda sesión.
- Un `CLAUDE.md` en la raíz resume: stack, convenciones, ubicación de docs, reglas de estilo, comando de tests. (Se crea en CC-00.)
- Cada prompt incluye criterios de aceptación como checklist verificable.
- No se interviene a media ejecución; se revisa el PR al final.

---

## 4. Asignación de modelos por tipo de tarea

Tu convención (Sonnet lógica / Haiku DDL-polish), extendida con un tier de alto razonamiento para lo genuinamente difícil:

| Tier | Modelo | Cuándo usarlo | Ejemplos en YaEntre |
|---|---|---|---|
| 🔴 **Alto razonamiento** | Opus | Lógica crítica donde un bug es caro o el razonamiento es denso | Motor adaptativo, integridad del simulador, webhook idempotente de Stripe, cálculo de scoring |
| 🟡 **Estándar** | Sonnet | Features de negocio, CRUD, integración, UI con lógica | Dashboard, drill, onboarding, panel admin, Server Actions |
| 🟢 **Ligero** | Haiku | DDL, migraciones, seeds, boilerplate, polish de estilos | Migración Prisma, seed de taxonomía, tokens Tailwind, componentes de presentación |

> **Racional de costo/calidad:** reservar el modelo caro para lo que de verdad lo amerita. El 60% de las tareas son Sonnet, ~25% Haiku, ~15% Opus. Esto optimiza gasto de API sin comprometer la calidad donde importa.

---

## 5. Ruta crítica y dependencias

```
CC-00 (setup) ──▶ CC-01 (schema) ──▶ CC-02 (auth) ──┬──▶ CC-03 (session engine)
                                                      │
                       ┌──────────────────────────────┘
                       ▼
        ┌──────────────────────────────────────────────────┐
        │ CC-03 session engine                               │
        │   ├──▶ CC-10 diagnóstico ──▶ CC-11 motor adaptativo│
        │   │                              └──▶ CC-12 dashboard│
        │   └──▶ CC-20 simulador                             │
        └──────────────────────────────────────────────────┘
                       │
   Track B (paralelo): CC-05 pipeline contenido ──▶ reactivos ──▶ (necesario para CC-10)
                       │
   CC-30 Stripe ──▶ CC-31 paywall ──▶ [Early Bird gate]
                       │
   CC-40 panel parental ──▶ CC-41 gamificación ──▶ [Beta gate]
```

**Ruta crítica al Early Bird (1 oct):** CC-00 → CC-01 → CC-02 → CC-03 → CC-05(300 reactivos) → CC-10 → CC-30(Stripe EB) → landing. Todo lo demás puede correr después para la beta.

---

## 6. Track A — Desarrollo (sprint por sprint)

Sprints de 2 semanas (~24 hrs de tu tiempo cada uno). Cada celda "CC-XX" es una sesión de Claude Code.

### Sprint 0 — Fundación (14–25 jul 2026)

| Sesión | Modelo | Objetivo | Tu tiempo |
|---|---|---|---|
| CC-00 | 🟢 Haiku | Scaffold Next.js 15 + TS + Tailwind + Prisma + `CLAUDE.md` + `/docs` | 2h |
| CC-01 | 🟢 Haiku | Migración `schema.prisma` completo (Backend Schema doc) + índices | 2h |
| CC-02 | 🟡 Sonnet | Auth Supabase (registro, login, verificación diferida, guards, roles) | 3h |
| CC-03 | 🔴 Opus | Motor de sesiones + scoring server-side (base de todo examen) | 3h |
| CC-04 | 🟢 Haiku | Design tokens Tailwind + tema dark/light + tipografía + mascota Tino SVG | 2h |

> 🏖️ **Break: viaje Puerto Vallarta (29 jul–2 ago).** El plan lo contempla; retomas el 4 de agosto sin culpa.

### Sprint 1 — Contenido + Diagnóstico base (4–15 ago)

| Sesión | Modelo | Objetivo | Tu tiempo |
|---|---|---|---|
| CC-05 | 🔴 Opus | Script de generación de reactivos (Anthropic API) + validación Zod | 3h |
| CC-06 | 🟡 Sonnet | Panel admin: cola de revisión + aprobar/editar + verify | 3h |
| CC-07 | 🟢 Haiku | Seed de taxonomía UNAM Superior (4 áreas, materias, temas, carreras) | 2h |
| CC-08 | 🟢 Haiku | Seed de taxonomía IPN Superior (3 ramas) | 2h |
| — | — | **▶ Arranca generación de reactivos + contratar freelancers (Track B)** | 2h |

### Sprint 2 — Diagnóstico + Onboarding (18–29 ago)

| Sesión | Modelo | Objetivo | Tu tiempo |
|---|---|---|---|
| CC-10 | 🟡 Sonnet | Onboarding (selección examen/carrera) + flujo primera vez | 3h |
| CC-11 | 🔴 Opus | Motor adaptativo: WeakTopics + selección + Entrómetro (predictor) | 4h |
| CC-12 | 🟡 Sonnet | Diagnóstico (30 reactivos) + pantalla de resultados | 3h |
| — | — | Tests unitarios del motor (Vitest) | 2h |

### Sprint 3 — Stripe + Landing (Early Bird prep) (1–12 sep)

| Sesión | Modelo | Objetivo | Tu tiempo |
|---|---|---|---|
| CC-30 | 🔴 Opus | Stripe: checkout, planes, OXXO/SPEI, webhook idempotente | 4h |
| CC-31 | 🟡 Sonnet | Paywall (muro suave) + gates por feature | 2h |
| CC-32 | 🟡 Sonnet | Landing page + precios + waitlist (light mode) | 3h |
| CC-33 | 🟢 Haiku | Stripe Price IDs Early Bird (`max_redemptions: 500`) + config | 1h |

### Sprint 4 — Simulador (15–26 sep)

| Sesión | Modelo | Objetivo | Tu tiempo |
|---|---|---|---|
| CC-20 | 🔴 Opus | Simulador: fullscreen, timer, sin retroceso, event listeners, Zustand | 4h |
| CC-21 | 🟡 Sonnet | Pre-flight check + resultados del simulacro + desglose | 3h |
| CC-22 | 🟡 Sonnet | Dashboard del alumno (Entrómetro, racha, heatmap, temas) | 3h |

> **🚀 EARLY BIRD — 1 octubre 2026.** Requiere: landing + Stripe EB + diagnóstico + ~300 reactivos UNAM. Todo listo tras S3-S4.

### Sprint 5 — Resolución + Gamificación (29 sep–10 oct)

| Sesión | Modelo | Objetivo | Tu tiempo |
|---|---|---|---|
| CC-23 | 🟡 Sonnet | Drill + resolución por capas (ExplanationAccordion) | 3h |
| CC-41 | 🟡 Sonnet | Gamificación: StreakFlame, PerfectRound, MateriaDominada (Framer Motion) | 3h |
| CC-42 | 🟢 Haiku | Reacciones de Tino + microcopy + estados vacíos | 2h |

### Sprint 6 — Panel parental + PWA (13–24 oct)

| Sesión | Modelo | Objetivo | Tu tiempo |
|---|---|---|---|
| CC-40 | 🟡 Sonnet | Vinculación parental (código 6 dígitos) + panel de solo lectura | 3h |
| CC-43 | 🟢 Haiku | PWA: manifest + service worker + instalable | 2h |
| CC-44 | 🟡 Sonnet | Resumen semanal parental (Resend) + notificaciones opt-in | 2h |

> **🔬 BETA CERRADA — 1 noviembre 2026.** 100 estudiantes reales; requiere ~800 reactivos + simulador + dashboard funcionando.

### Sprint 7 — QA + Beta feedback (27 oct–7 nov)

| Sesión | Modelo | Objetivo | Tu tiempo |
|---|---|---|---|
| CC-50 | 🔴 Opus | E2E Playwright del simulador + tests del webhook Stripe | 3h |
| CC-51 | 🟡 Sonnet | Fixes de beta (lista priorizada de feedback) | 4h |
| — | — | Reclutamiento y gestión de betatesters | 3h |

### Sprint 8 — Progreso + Perfil + Polish (10–21 nov)

| Sesión | Modelo | Objetivo | Tu tiempo |
|---|---|---|---|
| CC-24 | 🟡 Sonnet | Pantalla de progreso/analytics del alumno | 3h |
| CC-45 | 🟡 Sonnet | Perfil / ajustes (tema, verificar email, gestión de plan) | 2h |
| CC-52 | 🟢 Haiku | Polish de UI, responsive, accesibilidad (contraste, focus) | 3h |

### Sprint 9 — Performance + Observabilidad (24 nov–5 dic)

| Sesión | Modelo | Objetivo | Tu tiempo |
|---|---|---|---|
| CC-53 | 🟡 Sonnet | Sentry + PostHog (eventos del funnel) + optimización Lighthouse | 3h |
| CC-54 | 🟢 Haiku | Aviso de privacidad LFPDPPP + términos + páginas legales | 2h |
| CC-55 | 🟡 Sonnet | Hardening final: rate limiting, RLS review, edge cases | 3h |

### Sprint 10 — Launch prep (8–19 dic)

| Sesión | Modelo | Objetivo | Tu tiempo |
|---|---|---|---|
| CC-56 | 🟡 Sonnet | Campañas: pixels Meta/TikTok, tracking de conversión | 2h |
| — | — | Checklist Definition of Done (PRD §14) | 3h |
| — | — | Buffer / bugs críticos | 4h |

> 🎄 **Buffer decembrino (22 dic–3 ene).** Descanso + margen para imprevistos.
> **🌐 PUBLIC LAUNCH — 6 enero 2027.**

---

## 7. Track B — Contenido (pipeline paralelo)

Corre **independiente del código**, desde el Sprint 1. Es el track que más riesgo tiene, por eso arranca temprano.

| Semana | Meta acumulada de reactivos verificados | Responsable |
|---|---|---|
| Ago (S1-S2) | 300 (UNAM Área 1) | Pipeline IA + 1 freelance revisor |
| Sep (S3-S4) | 700 (UNAM Áreas 1-2) | + 2º freelance |
| Oct (S5-S6) | 1,100 (UNAM 4 áreas) | 2-3 freelancers |
| Nov (S7-S8) | 1,500 (UNAM completo + IPN Fís-Mat) | 2-3 freelancers |
| Post-launch | +1,000 (IPN completo, luego UAM/EXANI) | continuo |

**Tu rol en Track B:** orquestar la generación (correr el script), gestionar freelancers, y hacer spot-checks de calidad — **no** revisar reactivo por reactivo. Presupuesto: ~$6,400 MXN (1,500 × $4 revisión + API).

> **Alerta de dependencia:** el diagnóstico (CC-10/12) necesita ~300 reactivos UNAM Área 1 listos. Si Track B se atrasa, el diagnóstico se demora. Por eso Track B arranca en S1, no después.

---

## 8. Prompts ejemplares listos para Claude Code

Cuatro sesiones completamente escritas — las más críticas — como plantilla del formato exacto. El resto se deriva del mismo patrón.

### CC-01 — Migración del schema `🟢 Haiku`

```
CONTEXTO: Lee /docs/Backend_Schema_Acierta_v1.0.md — contiene el schema.prisma
completo y final.

OBJETIVO: Crear el schema de Prisma y ejecutar la migración inicial.

TAREAS:
1. Copia el schema.prisma completo del documento a /prisma/schema.prisma
2. Configura DATABASE_URL y DIRECT_URL desde .env
3. Ejecuta: npx prisma migrate dev --name yaentre_init
4. Ejecuta: npx prisma generate
5. Crea los índices parciales SQL de la sección 6 del doc como migración manual

CRITERIOS DE ACEPTACIÓN:
[ ] La migración corre sin errores
[ ] Todas las tablas del doc existen (institutions, exams, ..., processed_stripe_events)
[ ] `npx prisma generate` produce el client tipado sin warnings
[ ] Los enums coinciden exactamente con la sección 3 del doc
[ ] Los índices @@index están presentes en las tablas correspondientes
[ ] `npx prisma validate` pasa
```

### CC-03 — Motor de sesiones + scoring `🔴 Opus`

```
CONTEXTO: Lee /docs/TRD_Acierta_v1.0.md (§6 contratos, §8 simulador) y
/docs/Backend_Schema_Acierta_v1.0.md (ExamSession, SessionAnswer).

OBJETIVO: Implementar el motor base de sesiones de examen con scoring
calculado SIEMPRE en el servidor.

TAREAS:
1. Server Actions: startSession, submitAnswer, finishSession (con Zod)
2. La correctitud se calcula server-side comparando contra la DB
3. En modo FULL_SIMULATION, NO revelar la respuesta correcta hasta finishSession
4. finishSession recalcula tiempo real vs startedAt (no confía en el cliente)
5. Capa lib/db/sessions.ts con funciones tipadas
6. Manejo de estados: IN_PROGRESS → COMPLETED / COMPLETED_BY_TIMEOUT / ABANDONED

CRITERIOS DE ACEPTACIÓN:
[ ] submitAnswer nunca envía isCorrect al cliente antes de responder
[ ] En modo simulación, la respuesta correcta NO viaja al cliente hasta el final
[ ] finishSession marca TIME_EXCEEDED si el tiempo real supera el límite +30s
[ ] Una sesión abierta >24h se marca ABANDONED y no afecta stats
[ ] Todas las mutaciones validan propiedad de la sesión (guard)
[ ] Tests Vitest: scoring correcto, no-leak de respuestas, validación de tiempo
[ ] typecheck y lint pasan
```

### CC-11 — Motor adaptativo `🔴 Opus`

```
CONTEXTO: Lee /docs/TRD_Acierta_v1.0.md (§7 motor determinista) — contiene
las funciones de referencia. Enfoque DETERMINISTA, sin ML ni IA en runtime.

OBJETIVO: Implementar WeakTopics, selección adaptativa y el Entrómetro.

TAREAS:
1. computeTopicHitRate + isWeakTopic (umbral 0.60, mín 3 intentos)
2. selectAdaptiveQuestions: 60% débiles / 25% medios / 15% dominados,
   excluir respondidas <72h
3. predictExamScore: promedio ponderado por Subject.questionWeight,
   default 0.30 pesimista para materias sin datos
4. recommendCareerStrategy: ON_TRACK vs AT_RISK + alternativas
5. Route Handler /api/adaptive/next-questions y /recompute-score

CRITERIOS DE ACEPTACIÓN:
[ ] predictExamScore pondera por peso de materia (test: UNAM Área 1 → 74 aciertos)
[ ] Materias sin datos usan 0.30 y bajan la confianza proporcionalmente
[ ] selectAdaptiveQuestions nunca repite preguntas de las últimas 72h
[ ] Solo selecciona reactivos con isVerified=true
[ ] Todas las funciones son puras y testeadas con casos fijos (Vitest)
[ ] Cero llamadas a servicios externos de IA en runtime
[ ] typecheck y lint pasan
```

### CC-30 — Stripe (checkout + webhook idempotente) `🔴 Opus`

```
CONTEXTO: Lee /docs/TRD_Acierta_v1.0.md (§9 pagos) y /docs/Flujo_App (§10).
/docs/Backend_Schema (Subscription, Payment, ProcessedStripeEvent).

OBJETIVO: Integración de pagos a prueba de fallos con activación SOLO por webhook.

TAREAS:
1. Crear Checkout Sessions por plan+temporada (Price IDs de env)
2. Soportar tarjeta, OXXO y SPEI
3. Webhook /api/webhooks/stripe: verificar firma, procesar eventos
4. Idempotencia: registrar event.id en ProcessedStripeEvent antes de activar
5. Activar plan SOLO en checkout.session.completed y async_payment_succeeded
6. Manejar async_payment_failed y subscription.deleted
7. Pase/Premium: expiresAt = fecha del examen objetivo

CRITERIOS DE ACEPTACIÓN:
[ ] El acceso se activa ÚNICAMENTE desde el webhook, nunca desde el redirect
[ ] Un mismo event.id nunca se procesa dos veces (idempotencia verificada)
[ ] OXXO/SPEI dejan la Subscription en PENDING hasta async_payment_succeeded
[ ] La firma del webhook se valida; firma inválida → 400
[ ] Early Bird respeta max_redemptions (cae a precio regular al agotarse)
[ ] Test de integración con Stripe CLI: tarjeta, OXXO pending→success, fail
[ ] typecheck y lint pasan
```

---

## 9. Plantilla reutilizable de prompt

Para generar las sesiones restantes con el mismo estándar:

```
CONTEXTO: Lee [documentos relevantes de /docs].

OBJETIVO: [una frase clara del entregable].

TAREAS:
1. [paso concreto]
2. [paso concreto]
...

CRITERIOS DE ACEPTACIÓN:
[ ] [condición testable y verificable]
[ ] [siempre incluir: typecheck y lint pasan]
[ ] [si aplica lógica crítica: tests Vitest presentes]

RESTRICCIONES:
- Sigue las convenciones de CLAUDE.md
- No modifiques el schema sin instrucción explícita
- Respeta los design tokens de /docs/UIUX_Spec
```

---

## 10. Líneas de corte (qué se sacrifica si hay retraso)

Priorización si el calendario se aprieta. Se corta de abajo hacia arriba.

| Prioridad | Feature | ¿Cortable? |
|---|---|---|
| 🔴 Núcleo intocable | Auth, sesiones, diagnóstico, simulador, motor adaptativo, Stripe, UNAM Superior | ❌ Nunca |
| 🟠 Alta | Dashboard, resolución por capas, paywall, gamificación básica | ❌ Difícil |
| 🟡 Media | Panel parental, IPN Superior completo, PWA | ⚠️ Diferible a semana 1-2 post-launch |
| 🟢 Baja | UAM, EXANI II, Media Superior, animaciones avanzadas, resumen parental por email | ✅ Post-launch (ya son feature flags) |

> **Regla de oro:** si vas retrasado, **nunca** cortes del núcleo. Corta UAM/EXANI/Media Superior (ya son feature flags), difiere el panel parental una semana, y protege el launch de UNAM Superior con el simulador. Un launch enfocado que funciona vence a un launch amplio que falla.

---

## 11. Calendario maestro y milestones

```
2026                                                          2027
JUL     AGO     SEP     OCT     NOV     DIC          ENE
│       │       │       │       │       │            │
S0──────S1──────S2──S3──S4──S5──S6──S7──S8──S9──S10   │
│  🏖️    │       │   │   │       │       │       │     │
│       │       │   │   │       │       │       │     │
▼       ▼       ▼   ▼   ▼       ▼       ▼   🎄buffer   ▼
setup  contenido diag │  sim   parental QA  polish   LAUNCH
       arranca        │        beta                   6 ene
                      │
                 🚀 EARLY BIRD          🔬 BETA
                    1 oct                1 nov
```

| Milestone | Fecha | Requisito mínimo |
|---|---|---|
| 🏗️ Fundación lista | 25 jul | Schema + auth + motor de sesiones |
| 📝 Contenido arranca | 4 ago | Pipeline IA + freelancers contratados |
| 🎯 Diagnóstico funcional | 29 ago | 300 reactivos UNAM + motor adaptativo |
| 🚀 **Early Bird** | **1 oct** | Landing + Stripe EB + diagnóstico + 300 reactivos · **meta: 200 licencias** |
| 🔬 **Beta cerrada** | **1 nov** | Simulador + dashboard + 800 reactivos + 100 testers |
| ✅ Content freeze | 21 nov | 1,500 reactivos verificados |
| 🎨 Production-ready | 5 dic | Lighthouse ≥85, PWA, legal, observabilidad |
| 🌐 **Public Launch** | **6 ene** | Definition of Done completo (PRD §14) |

---

## Apéndice — Resumen de sesiones de Claude Code

| Rango | Sesiones | Tema |
|---|---|---|
| CC-00 a CC-04 | 5 | Fundación (setup, schema, auth, motor sesiones, tokens) |
| CC-05 a CC-08 | 4 | Contenido (pipeline, admin, seeds) |
| CC-10 a CC-12 | 3 | Diagnóstico + motor adaptativo |
| CC-20 a CC-24 | 5 | Simulador + dashboard + drill + progreso |
| CC-30 a CC-33 | 4 | Pagos + paywall + landing |
| CC-40 a CC-45 | 6 | Parental + gamificación + PWA + perfil |
| CC-50 a CC-56 | 7 | QA + polish + performance + launch prep |
| **Total** | **~34 sesiones** | Distribuidas: ~15% Opus, ~60% Sonnet, ~25% Haiku |

---

*Fin del documento · Plan de Implementación YaEntre v1.0*
*Serie completa: Estudio → Blueprint → PRD → TRD → UI/UX → Flujo de App → Backend Schema → **Plan de Implementación***
*Próximo paso: `CLAUDE.md` en la raíz del repo + primera sesión CC-00.*
