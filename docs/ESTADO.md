# ESTADO — Acierta

Última actualización: 2026-07-23 · Última fase ejecutada: F10 (COMPLETADA)

## Tabla de fases

| Fase | Nombre | Estado | Commit | Notas |
|---|---|---|---|---|
| F0 | Auditoría y reparación del repo | COMPLETADA | (esta sesión) | CLAUDE.md actualizado, ESTADO.md creado, .claude/settings.json agregado |
| F1 | Infraestructura validada vs Supabase real | COMPLETADA | (F1) | Proyecto Supabase real (ref fumluvvzskhdxcyljbmx). Schema=fuente de verdad (diff vacío), RLS verificada, seed real (2 inst/7 áreas/35 mat/217 temas/47 carreras), guardrail probado en vivo, 9/10 PDFs subidos. Bugs corregidos: camelCase en RLS + recursión infinita RLS. Pendiente externo: prueba Anthropic (falta key real) y guía IPN 80MB (>límite free-tier). Ver docs/VALIDACION_INFRA.md |
| F2 | Pipeline adversarial de contenido | EN_PROGRESO | (F2) | CONSTRUIDO Y PROBADO COMPLETO: verificador Fable 5 (sin respuesta, con test estructural), cálculo ejecutado en sandbox VM, resolución (coincidencia+conf≥0.85+0 problemas), 3a pasada Opus 5%, orquestador content-run, coverage con tasa auto-aprobación, 94 tests verdes, E2E mock vs DB real OK. Schema: +7 formatos, +verification JSONB. API key real creada y validada (auth OK). ÚNICO pendiente: tanda real de 10 — bloqueada por saldo API $0.00 (compra de créditos = decisión del dueño) |
| F2b | Anclaje en fuentes e ingesta continua | COMPLETADA | (F2b) | Escaneo real: 12 archivos detectados (10 docs/guias + 2 raíz), 380 fragmentos de 9 fuentes (uam_cbi reparada con backfill tras fix de bytes NUL), duplicado raíz de ECOEM detectado por hash, 2 PDFs IPN escaneados pendientes de visión. RLS solo-ADMIN verificada en vivo (anon → []). SOURCED end-to-end probado en mock con trazabilidad real en DB. Pendiente por saldo API $0: clasificar 380 fragmentos (~$0.70) — re-correr pnpm content:scan-sources con saldo. 0/217 temas con fuente hasta clasificar |
| F3 | Panel de discrepancias y resolución | COMPLETADA | (F3) | Repurposeó la cola plana de CC-06 (isVerified=false sin distinción) por 3 colas del pipeline F2: discrepancia/baja-confianza-o-problemas/muestreo-degradado, clasificadas por `Question.verification` (JSONB). Detalle con comparación generador-vs-verificador, razonamiento, problemas, auditoría; 1-clic aprobar con cualquiera de las 4 opciones (atajos 1-4/D/E); "Aprobar con X" y "editar" anotan `manualReview` (preserva el veredicto original para auditoría, saca el reactivo de la cola). Render de LaTeX/imagen de reactivo/imagen de opción/pasaje compartido. /admin/coverage: tasa de auto-aprobación global+por materia+por formato, desglose SOURCED/TEMARIO_ONLY (F2b). RLS ADMIN-only ya cubría todo (F1/F2b), sin cambios de schema. 15 tests nuevos (118 total) + verificación real contra Supabase con 5 fixtures cubriendo las 3 colas + SOURCED-con-passage-e-imagen + ya-resuelto (25 aserciones entre lectura y mutación, todas verdes, fixtures limpiados). `pnpm build` production OK (sin violaciones Server/Client Component) |
| F4 | Producción de contenido en escala | COMPLETADA | (F4) | **309 reactivos verificados/servibles reales en producción** (meta: ≥300). 380 generados, 71 sin publicar (verificación adversarial los rechazó correctamente), 0 rechazados sin verificación. Tasa de auto-aprobación global 81.3% (309/380). 184/380 SOURCED (anclados en fuente real), resto TEMARIO_ONLY solo en temas sin fragmento fuente. Auditoría de tercera pasada (5%, 16 reactivos): 16/16 sin defectos, 0 degradados. **Bloqueada por saldo API $0 (ver commit 065d448); desbloqueada SIN comprar crédito** por instrucción explícita del dueño ("no se meterá crédito de ninguna forma") — pipeline ejecutado con arquitectura alterna "capital cero" (ver Notas F4 abajo). Costo real en dinero: $0.00 |
| F5 | Onboarding (selección examen/carrera) | COMPLETADA | (F5) | Asistente de 4 pasos: examen (filtrado por feature flag) → área/rama → carrera meta (aciertos mínimos SIEMPRE como estimación, vía `formatAciertometroTarget`) → Tino + explicación del diagnóstico. Progreso en `UserProfile.onboardingStep` (sin tocar el schema — ver `src/lib/onboarding/steps.ts`); el área del Paso 2 es efímera (por `?area=` en la URL, no se persiste). `requireOnboarding` guardia todo `/app/*`. "Empezar diagnóstico" crea la `ExamSession` real (mode=DIAGNOSTIC) reusando `sessionsDb.startSession` de F2-adjacente; "posponer" cierra el asistente y deja tarjeta pendiente en el dashboard placeholder. El motor de diagnóstico en sí (`/diagnostico`) es F6/F7, fuera de alcance — el botón ya crea la sesión real, la pantalla se construye después. 10 tests nuevos (140 total). Verificado manualmente en navegador contra Supabase real (registro, login, los 4 pasos, cierre-y-retomo en cada paso, posponer exactamente una vez, guard bloqueando reingreso a /onboarding y bloqueando /app sin onboarding); usuario de prueba y su sesión eliminados al terminar. Bug real encontrado y corregido durante esa verificación: el Paso 2→3 navegaba con `<Link>` y el router cache del cliente servía el RSC del Paso 2 ya cacheado (mismo pathname, solo cambiaba `?area=`) — se resolvió moviendo esa transición a un Server Action (mismo patrón que los demás pasos), que sí invalida el cache al redirigir. `pnpm build` production OK |
| F6 | Motor adaptativo determinista y Aciertómetro | COMPLETADA | (F6) | Motor 100% determinista, sin ML ni IA en runtime. Funciones PURAS y testeables en `src/lib/adaptive/`: **topic-stats** (acumulación histórica por tema; débil = hitRate<0.60 con ≥3 intentos; tiers weak/intermediate/mastered/insufficient), **predictor** (Aciertómetro: promedio ponderado por `Subject.questionWeight`, default pesimista 0.30 para materias sin datos suficientes ≥5 intentos, confianza = proporción con datos, `floor`), **selector** (mezcla 60/25/15, excluye respondidas <72h, rng inyectable, respaldo aleatorio si el cálculo falla), **career-strategy** (compara predicción vs meta, sugiere ≤3 alternativas alcanzables desc por exigencia; meta SIEMPRE calificada por confianza vía `formatAciertometroTarget`). Orquestación en `src/lib/db/adaptive.ts` (recomputeWeakTopics/LearningProfile, selectNextAdaptiveQuestions con fallback, computeCareerStrategy, onSessionFinished). Endpoints protegidos `POST /api/adaptive/next-questions` y `/predict` (requireUser vía guardApiUser + Zod). **finishSession dispara onSessionFinished** (recálculo robusto: nunca rompe el cierre de sesión). **Caso de referencia obligatorio verificado: 0.70@peso26 + 0.50@peso16 sobre 120 = exactamente 74** (floor de 74.857). 28 tests nuevos (168 total, verdes). Verificación en vivo: ambos endpoints devuelven 401 sin sesión a través del runtime real; `pnpm build` registra las rutas; sin cambios de schema (`LearningProfile`/`WeakTopic` ya existían) |
| F7 | Diagnóstico inicial y resultados | COMPLETADA | (F7) | Ruta `/diagnostico`: sesión real de 30 reactivos repartidos por `Subject.questionWeight` (reparto de mayor resto con reserva de 1 asiento/materia — `src/lib/diagnostic/distribution.ts`, PURO y testeado, caso de referencia [26,16,12,10,6]→30 = exactamente [10,7,5,5,3]), recortado a disponibilidad real de contenido servible con redistribución del sobrante. Límite 45 min explícito (ya no hereda `exam.durationMins`). SÍ permite regresar: los 30 `SessionAnswer` se pre-crean como placeholders (`selectedOption=null`) al abrir la sesión, así el set completo vive siempre en DB — retomar tras cerrar es leer esa misma sesión, sin guardar la lista en ningún otro lado. Reusa 100% el motor de F2/F6 (`submitAnswer`/`finishSession`/`onSessionFinished`) sin duplicar lógica; único cambio a `sessions.ts`: `finishSession` marca `diagnosticDone=true` cuando `mode=DIAGNOSTIC`. Resultados: score crudo, Aciertómetro animado (anillo vía `@keyframes` CSS + `@number-flow/react`), gap vs. meta de carrera (`computeCareerStrategy`, F6), 3 temas prioritarios y mensaje de Tino. **Hallazgo de diseño real:** `WeakTopic` exige ≥3 intentos/tema (F6) pero el diagnóstico reparte 30 reactivos entre docenas de temas — casi ningún tema llega a 3 intentos en una sola pasada, así que la tabla acumulada queda vacía justo después del primer diagnóstico. Se agregó `rankWeakestFromSession` (ranking sin el umbral de 3, solo para esta sesión) como relleno cuando el historial acumulado no alcanza los 3 temas — sin tocar la regla de F6. 13 tests nuevos (181 total). **2 bugs reales encontrados y corregidos en verificación en navegador contra Supabase real:** (1) `@number-flow/react` (custom element/Shadow DOM) no hidrataba bajo SSR de Next.js — quedaba vacío hasta forzar montaje 100% cliente (`next/dynamic({ssr:false})` desde un wrapper `'use client'` dedicado, `AciertometroLoader.tsx`, porque `ssr:false` no se permite directo en un Server Component). (2) El anillo animado con Framer Motion (`motion.circle` + `strokeDashoffset`) se quedaba fijo en 0% de relleno pese a props correctas — se reemplazó por una animación 100% CSS (`@keyframes ring-fill` en `app/globals.css`, interpola desde circunferencia completa hasta el valor final YA puesto por React, sin estado de React de por medio); ya cubierta por la regla global de `prefers-reduced-motion`. Verificado end-to-end en vivo (UNAM Área 1 Ingeniería): 30 preguntas repartidas 12 Mat/7 Fís/6 Quím/5 Esp (Inglés excluido por 0 reactivos servibles — cobertura real hoy es 4 materias, no 6; el algoritmo alcanza ≥6 en cuanto el pipeline de contenido, ver Notas F4, cubra un área con ≥6 materias con contenido — la app IPN "Ciencias Sociales y Administrativas" ya tiene 7 materias en el seed, solo le falta contenido), navegación libre confirmada (ir y volver conserva la respuesta), cierre-y-retomo confirmado (recarga completa preserva timer absoluto y progreso), resultados completos confirmados con datos reales (Aciertómetro 87/120, meta ~101, gap 14, 3 temas con hitRate real), dashboard deja de mostrar la tarjeta pendiente tras terminar. Usuario de prueba y su sesión eliminados al terminar. `pnpm typecheck`, `pnpm lint`, `pnpm build` production OK |
| F8 | Integración de Stripe (pagos) | COMPLETADA | (F8) | Pagos a prueba de fallos. **Regla de oro cumplida y verificable en código:** el acceso se activa SOLO en el webhook (`billingStore.activateFromCheckout`), NUNCA desde el redirect — la pantalla de resultado (`/checkout/resultado`) solo LEE el estado real de la `Subscription`. Módulos PUROS y testeados en `src/lib/stripe/`: **pricing** (matriz PRD §9 en centavos, `getPlanPricing(plan,season)`, `currentSeason(now)` monotónico), **expiry** (`computeExpiresAt`: MONTHLY=null→lo maneja Stripe recurring; SEASON_PASS/PREMIUM = fecha del examen objetivo, respaldo 150 días si falta). Modelo de producto: MONTHLY = suscripción recurrente de Stripe (mode `subscription`, solo tarjeta — OXXO/SPEI no admiten recurring); pase/premium = pago único (mode `payment`, tarjeta+OXXO+SPEI vía `customer_balance`/`mx_bank_transfer`). **Webhook idempotente** (`src/lib/stripe/webhook.ts`, PURO con `BillingStore` inyectable): registra `event.id` en `processed_stripe_events` como PRIMERA sentencia de la MISMA transacción que aplica el cambio (`runIdempotent` en `src/lib/db/billing.ts`) — duplicado→P2002→aborta→'duplicate' sin re-activar; fallo transitorio→rollback revierte también el marcador→reintento seguro de Stripe. Enrutamiento: `checkout.session.completed` paid→activar / unpaid→PENDIENTE (voucher OXXO/SPEI, sin acceso); `async_payment_succeeded`→activar (con `forceAsync` porque ahí `payment_status` ya es 'paid' pero NO fue tarjeta — bug real detectado al escribir los tests y corregido); `async_payment_failed`→FAILED; `customer.subscription.deleted`→CANCELED. Route Handler (`app/api/webhooks/stripe`): lee raw body, `constructEvent` verifica firma→**400 si inválida/faltante** (verificado en vivo: HMAC de Stripe rechaza el payload), 200 en manejado/duplicado/ignorado, 500 en error→Stripe reintenta. Checkout Server Action (`app/actions/checkout.ts`): **requireVerifiedForPurchase** (correo verificado obligatorio), crea Checkout Session + `Subscription` PENDING con `stripeCheckoutSessionId` antes de redirigir; metadata `{userProfileId,plan,season}` para reconciliación. Pantallas éxito(Tino celebra + monto)/pendiente(comprobante + `StatusPoller` que refresca hasta que el webhook active)/fallido(`RetryButton` reusa la action)/cancelado. Badge EARLY_BIRD al activar en esa temporada. Cliente Stripe con `import 'server-only'` (la llave nunca cruza al cliente). **17 tests nuevos** (198 total): los 4 casos exigidos (tarjeta OK, OXXO pendiente→éxito, pago fallido, evento duplicado NO reactiva) con store en memoria que reproduce la idempotencia atómica, + pricing/expiry/resolvePaymentMethod. Sin cambios de schema (`Subscription`/`Payment`/`ProcessedStripeEvent` ya existían). Verificado en vivo: webhook 400 sin firma / 400 firma inválida / 405 GET; `/checkout/resultado` sin sesión→307 a /login. `pnpm typecheck`, `pnpm lint`, `pnpm build` OK. **Pendiente heredado (no bloquea F8):** las env vars de Stripe son placeholders — la compra end-to-end real requiere llaves reales (decisión del dueño, capital cero); job de reconciliación (webhook perdido) es F22/hardening |
| F9 | Paywall + Early Bird pricing | COMPLETADA | (F9) | Muro suave como **capa central reutilizable**: `src/lib/paywall/gates.ts` (PURO — `canStartFullSimulation`, `canAnswerDrillQuestion`, `canViewExplanationLayer`, `canAccessParentDashboard`, todas con la misma forma `GateDecision`) + `src/lib/db/paywall.ts` (orquestación real: `isUserPaid`/`getActiveSubscription` filtra por status ACTIVE Y vigencia `expiresAt`, `countCompletedFullSimulations`, `countDrillAnswersToday`). Reglas: 1 simulacro completo gratis (revisar resultados después no consume — es una lectura, nunca pasa por `startSession`); 10 reactivos/día de práctica libre reiniciando a medianoche de México (UTC-6 fijo, `src/lib/paywall/mexico-time.ts`, misma convención que el streak de F-08); Capa 1 de explicación siempre gratis, 2+ requiere plan; panel parental exige Pase o Premium (Mensual NO alcanza, confirmado contra la tabla del PRD §9). **Wireado en 2 puntos reales ya existentes** (los únicos con UI/endpoint funcional hoy — simulador F12 y Drill F14 aún no existen): `app/actions/sessions.ts` bloquea `startSession` en `mode=FULL_SIMULATION`; `POST /api/adaptive/next-questions` devuelve 402 al agotar el límite diario o recorta el `count` al restante. Explicación-por-capas y panel parental quedan con el gate listo para cuando F14/F16 construyan su UI (no hay dónde wirearlos todavía). Pantalla `/paywall`: copy dinámico por trigger (matriz de Flujo_App §9.1), comparativa de 3 planes con Pase destacado ⭐, precio de la **temporada efectiva** (ver abajo), banner de licencias Early Bird restantes, "Ahora no" siempre regresa a `?return=` saneado (`sanitizeReturnPath` bloquea URLs absolutas y `//host` — protección anti open-redirect, verificada en vivo). **Early Bird (Task 4):** `resolveEffectiveSeason` (src/lib/db/billing.ts) es el ÚNICO punto que decide qué temporada mostrar/cobrar — si la fecha cae en Early Bird pero ya hay 500 suscripciones ACTIVE en esa temporada, degrada a Temporada Alta automáticamente (`degradeIfEarlyBirdExhausted`, núcleo puro testeado); lo usan tanto `/paywall` (qué precio muestra) como `startCheckoutAction` de F8 (qué precio cobra) — nunca pueden divergir. Badge `EARLY_BIRD` ya se otorgaba desde F8 (`grantEarlyBirdBadge`), reusado sin cambios. `earlyBirdLicensesRemaining()` exportada y lista para la landing (F10). **Script `pnpm stripe:setup-prices`** (scripts/setup-stripe-prices.ts): crea los 9 Price de Stripe (idempotente vía `lookup_key`, p. ej. `pase_eb`) con los montos exactos del PRD y escribe/actualiza los 9 `STRIPE_PRICE_*` en `.env.example`; `app/actions/checkout.ts` (F8) ahora los prefiere sobre `price_data` inline si están configurados en el entorno, sin romper el flujo ya probado si no lo están. Corrido en seco: se detiene correctamente en la validación de llave real (mismas credenciales placeholder documentadas desde F8 — capital cero). 20 tests nuevos (229 total): límites exactos (1/1, 10/10, capa 1/2+, Mensual-no-alcanza), fronteras de medianoche México (incluye instante exacto e idempotencia), anti open-redirect, fallback Early Bird 500→0, nombres de variable STRIPE_PRICE_*. **Verificación en vivo contra Supabase real** (usuario de prueba + fixtures SQL, todo eliminado al terminar, cascada confirmada sin huérfanos): `/paywall` con los 4 triggers renderiza copy+precios+banner correctos; límite de drill probado end-to-end vía `fetch` real contra el endpoint (0→200 permitido con `remainingToday:10`, 10 respondidas→402 `DRILL_DAILY_LIMIT`, sesión re-fechada 2 días atrás→200 se reinició a 10, usuario con plan activo→200 `remainingToday:null` ilimitado); conteo de simulacro completo verificado con fixture (0→1 tras completar uno, misma query que usa el gate); licencias Early Bird verificadas en vivo (500→499 tras 1 suscripción ACTIVE, reflejado en el banner de `/paywall`); "Ahora no" con `return=https://evil.com` cae a `/app` en vez de seguir el link malicioso. `pnpm typecheck`, `pnpm lint`, `pnpm build` OK |
| F10 | Landing page | COMPLETADA | (F10) | **GATE EARLY BIRD alcanzable — solo faltan acciones de negocio (activar campañas).** Landing pública (`app/(public)/page.tsx`) y precios (`app/(public)/precios/page.tsx`) en modo claro fijo, sin toggle (UIUX Spec §3.5), vía `PublicPageShell` — un componente explícito (NO un `layout.tsx` compartido de `(public)/`) para no afectar a registro/login, que siguen en `AuthShell` con `data-theme="dark"` fijo. Hero con el mensaje de posicionamiento pedido ("no es otro curso con videos... entrenador que sabe exactamente qué te falta"), 4 diferenciadores con Tino (simulador/Aciertómetro/ruta/panel parental), sección de padres con los 3 ángulos EXACTOS pedidos (lugar correcto vs. cualquier lugar · visibilidad desde el celular · garantía Premium, aclarando que aplica solo a ese plan), FAQ de 8 preguntas con `<details>/<summary>` nativo (cero JS de cliente), footer con enlaces legales. Precios: tabla de 12 features × 4 planes **reproducida literal de PRD §9** (no reinterpretada). **Banner y contador Early Bird con datos REALES**: reusa `resolveEffectiveSeason`/`earlyBirdLicensesRemaining` de F9 sin duplicar el cálculo — si el cupo de 500 ya se agotó, `resolveEffectiveSeason` cae a temporada regular y el banner se oculta solo (nunca promete un precio que ya no aplica). Ambas páginas con `revalidate = 60` (ISR): Next.js las pre-renderiza como estáticas por defecto, lo que habría CONGELADO el conteo de licencias en el momento del build — se detectó y corrigió antes de finalizar. SEO: `metadataBase` + `og-image` dinámica vía `next/og` (sin depender de un archivo de diseño), `app/sitemap.ts` (rutas públicas), `app/robots.ts` (bloquea `/app` `/admin` `/api` `/diagnostico` `/checkout` `/paywall` `/onboarding`). CTA principal → `/registro`; los CTAs de planes pagos en `/precios` también → `/registro` (la compra real ya vive dentro de la app, F8/F9 — comprar sin cuenta no es el flujo del producto). Páginas legales provisionales (`/legal/terminos`, `/legal/privacidad`) con `noindex`, honestas sobre estar en preparación. **Bug preexistente real, grave, encontrado y corregido**: Tailwind 4 NUNCA cargó `tailwind.config.ts` — a `app/globals.css` le faltaba la directiva `@config` (v4 no autodetecta el config JS/TS como v3). Esto significaba que TODOS los tokens custom del proyecto (`bg-brand`, `bg-surface`, `bg-elevated`, `text-text-primary`, `border-border-subtle`, `rounded-lg` de 16px, `font-display`, etc.) generaban CERO CSS en silencio desde que se introdujeron — únicamente sobrevivía la sintaxis de valor arbitrario (`bg-[var(--x)]`, usada en `AuthShell`/`(app)/layout.tsx`) y el color/texto explícito escrito a mano en `body` de `app/layout.tsx`. Quedó indetectado en F5-F9 porque la verificación fue mayormente `get_page_text` (contenido, no estilos) y el único intento de screenshot (F7) hizo timeout; en dark-mode-sobre-dark-mode, un fondo "transparente" en vez del correcto era visualmente invisible contra el `body` oscuro de respaldo. Se hizo evidente al anidar una página en modo CLARO dentro de un documento con `<html data-theme="dark">`: las tarjetas mostraban el fondo oscuro del body transparentándose. **Corregido con una línea** (`@config "../tailwind.config.ts";` en `app/globals.css`) — verificado en vivo que ahora SÍ existen las reglas `.bg-surface`, `.bg-brand`, `.text-text-primary` en el CSS compilado (antes solo existían sus variantes `bg-[var(...)]`), que la landing en claro renderiza con los colores correctos, y que /login (AuthShell, oscuro) sigue renderizando exactamente igual que antes (sin regresión). Verificado además: sin scroll horizontal en 375px, acordeón FAQ funcional sin JS, CTA principal navega a /registro, robots.txt/sitemap.xml/opengraph-image responden 200 con contenido correcto. `pnpm typecheck`, `pnpm lint`, `pnpm build`, 229 tests OK (sin tests nuevos — F10 es contenido/UI, no lógica de negocio nueva; toda la lógica reusada ya estaba testeada en F9). **Discrepancia real entre documentos, NO resuelta unilateralmente**: PRD §9 tiene DOS filas distintas — "Simulacros completos: 1 (30 reactivos)" para Free (que parece describir el diagnóstico, F7) y "Simulador fullscreen (120/140 reactivos): ❌" para Free (cero simulacros reales) — mientras que Flujo_App §9.1 dice "Simulacro completo (120/140) — 1 completo" gratis, y el gate ya construido en F9 (`canStartFullSimulation`) implementa ESTA última regla (1 simulacro real 120/140 gratis), siguiendo la instrucción explícita y textual de la tarea F9. La página de precios reproduce la tabla del PRD tal cual (tarea F10 pedía "según la matriz del PRD"), así que ambos textos conviven sin reconciliar — es una decisión de producto pendiente, no un bug de código |
| F11 | Dashboard del alumno | PENDIENTE | — | Resumen de progreso, próximas sesiones, accesos rápidos |
| F12 | Simulador (UX fiel al examen oficial) | PENDIENTE | — | Interfaz, timer, navegación, almacenamiento temporal de respuestas en Zustand |
| F13 | Resultados del simulacro | PENDIENTE | — | Resumen de aciertos, análisis por materia, recomendaciones |
| F14 | Drill + capas de profundidad | PENDIENTE | — | Drill por tema, por materia, por área; indicadores de confianza |
| F15 | Gamificación (streaks, aciertómetro, Tino) | PENDIENTE | — | Flame de racha, aciertómetro predictor, apariciones de mascota |
| F16 | Panel parental | PENDIENTE | — | Seguimiento de progreso del hijo, reportes, configuración |
| F17 | PWA + Perfil de usuario | PENDIENTE | — | Instalable, modo offline base, avatar, preferencias |
| F18 | Progreso visual y polish | PENDIENTE | — | Animaciones, transiciones, refinamiento de UX |
| F19 | Suite E2E completa | PENDIENTE | — | Playwright: flows críticos (auth, diagnóstico, simulador, pago) |
| F20 | Observabilidad (Sentry + PostHog) | PENDIENTE | — | Error tracking, analytics de comportamiento |
| F21 | Conformidad legal (T&C, privacidad, GDPR) | PENDIENTE | — | Documentos legales, cookies, RLS verificado |
| F22 | Hardening de seguridad | PENDIENTE | — | Audit de credenciales, RLS en producción, API rate limiting |
| F23 | Fixes beta y preparación para launch | PENDIENTE | — | Bug fixes encontrados en E2E, refinamiento final |
| F24 | LAUNCH (6 de enero de 2027) | PENDIENTE | — | Únicamente UNAM Superior + IPN Superior al abrir; feature flags para UAM/EXANI/Media Superior |

## Notas F4 — producción "capital cero" (2026-07-21)

### El pivote: por qué no se compró crédito

F4 arrancó bloqueada por saldo API $0.00 (ver commit `065d448`, checkpoint
previo). Instrucción explícita del dueño ante ese bloqueo: **"No se meterá
crédito de ninguna forma, busca la mejor alternativa gratuita, estamos en
capital cero. Haz lo que tengas que hacer y avísame cuando podamos pasar a
fase 5."** Esto descarta permanentemente comprar crédito de la API de pago
como solución — no solo para esta fase, como política del proyecto mientras
dure el capital cero.

### La alternativa: pipeline real, LLM sustituido

Se reusó el pipeline de F2/F2b **sin ninguna modificación de su lógica de
negocio** (`validateDraft`, `resolveCitations`, `resolveVerdict`,
`insertQuestion`, `applyVerification` — el mismo código que usaría la API de
pago). Lo único que cambió es **de dónde viene el texto**:

- **Generador:** Claude Code (el propio agente orquestador, Sonnet 5) en vez
  de una llamada a la API de Anthropic. Escribe cada draft (stem, opciones,
  3 capas de explicación) siguiendo las mismas reglas de
  `scripts/prompts/_base.md` y el prompt específico de cada materia.
- **Verificador independiente:** subagentes de Claude Code, despachados con
  `model="fable"` (luego `model="opus"`, ver más abajo), que resuelven cada
  reactivo a ciegas — reciben el payload construido por `buildVerifierPayload`
  (mismo código real, sin `isCorrect` ni explicaciones por construcción de
  tipos) y ejecutan cálculo real vía su propia herramienta Bash cuando la
  materia lo exige, replicando la regla `CALC_NOT_EXECUTED` de
  `scripts/lib/verifier.ts`.
- **Auditor de 5%:** subagente con `model="opus"`, mismo mecanismo,
  sobre una muestra aleatoria de 16 reactivos ya aprobados.
- **Costo real en dinero: $0.00.** El "costo" de esta fase fue cuota del plan
  de Claude Code (Fable 5 y Opus), no facturación de la API de Anthropic.

Esto preserva la garantía estructural central del pipeline (el verificador
nunca ve la respuesta correcta) y la independencia de modelo generador↔
verificador para la mayoría del lote.

**Limitación honesta:** a medio proceso, Fable 5 agotó su límite de gasto
mensual del plan (falló con "You've hit your monthly spend limit" en los 3
lotes de verificación de Español). Se cambió a `model="opus"` para el resto
de Español, todo Química Área 2, y la auditoría de 5%. Para esos lotes,
Opus jugó tanto el rol de verificador primario como (en la muestra de
auditoría) el de auditor — pierde la independencia de tres modelos
distintos que tiene el diseño original, aunque sigue siendo un modelo
distinto al generador (Sonnet) en todos los casos. Documentado aquí para que
quede claro qué garantía se relajó y por qué.

### Hallazgo de calidad importante: sesgo de posición

Los primeros 6 lotes de verificación (Matemáticas, Física, Biología,
Química A1) señalaron, de forma independiente y repetida, que la respuesta
correcta caía casi siempre en la posición "A" — el generador (yo) no estaba
variando la posición de la opción correcta. Se corrigió agregando una
función `shuffleOptions()` en `_commit_subject.ts` (temporal, ver abajo) que
baraja las 4 opciones de cada draft ANTES de insertar, remapeando
`generatorOption` y `verdict.chosenOption` con el mismo mapa de permutación
(la comparación de `resolveVerdict` es idéntica, solo cambian las etiquetas).
Aplicado retroactivamente a Matemáticas antes de su commit; todos los lotes
posteriores ya se generaron/commitearon con el fix activo. **Pendiente real
para cuando exista un generador de producción (vía API o UI):** el generador
debe barajar posiciones por diseño, no como parche post-hoc.

### Química Área 1: causa de la tasa de aprobación baja (60%, bajo el 75% objetivo)

Los verificadores marcaron sistemáticamente `WEAK_DISTRACTORS` en varios
temas conceptuales (enlace químico, estequiometría, ácidos/bases) —
distractores demasiado obvios o auto-eliminables sin saber química (p. ej.
"energía nuclear" como opción para un tema de electroquímica). Además, 3
reactivos de "Ácidos, bases y sales" se rechazaron por un descuido real: el
tema tenía SourceChunks disponibles y olvidé declarar `sourceChunks` en esos
drafts (la regla de anclaje de F2b exige cita cuando hay fuente disponible,
sin excepción). **Ajuste aplicado antes de generar Química Área 2:**
distractores más plausibles (mismo "shape" que la opción correcta, sin
absolutos tipo "siempre/nunca" que se descartan por heurística de examen,
sin pares "espejo" que se delatan entre sí) y verificación manual de que
todo draft en un tema con chunks incluyera `sourceChunks`. Resultado: Química
Área 2 subió a 90% de auto-aprobación con 0 reactivos rechazados por cita
faltante — confirma que el ajuste fue efectivo. Español tuvo el mismo
descuido de citación en menor escala (6 reactivos rechazados) con el mismo
origen; documentado aquí para no repetirlo en materias futuras.

### Números finales (confirmados por query directa a la DB, no solo por log)

| Materia | Generados (en DB) | Verificados/servibles | Tasa auto-aprob. | SOURCED | TEMARIO_ONLY |
|---|---|---|---|---|---|
| Matemáticas | 81 | 63 | 77.8% | 39 | 24 |
| Física | 72 | 58 | 80.6% | 21 | 37 |
| Biología | 65 | 61 | 93.8% | 34 | 27 |
| Química (Área 1 + Área 2) | 124 | 96 | 77.4% (A1: 60% · A2: 90%) | 20 | 76 |
| Español | 38 | 31 | 81.6% | 21 | 10 |
| **TOTAL** | **380** | **309** | **81.3%** | **135** | **174** |

- Meta ≥300 verificados/servibles: **cumplida (309)**.
- Auto-aprobación global ≥75%: **cumplida (81.3%)**; única materia bajo el
  umbral fue Química Área 1 (60%), causa raíz documentada arriba, corregida
  antes de continuar generando volumen para la siguiente subdivisión de la
  misma materia (Área 2), tal como pedían los criterios de aceptación.
- Anclaje en fuente: en TODOS los temas con SourceChunk disponible, los
  reactivos publicados citan fuente real (SOURCED) — los 174 TEMARIO_ONLY
  corresponden a temas que, tras el escaneo de F2b, siguen sin ningún
  fragmento fuente (p. ej. Límites/Integrales/Matrices en Matemáticas,
  Termodinámica/Magnetismo en Física, toda Química Área 2, Literatura
  medieval/moderna en Español).
- Auditoría de tercera pasada (5%, `ceil(309×0.05)=16` reactivos, muestreo
  aleatorio de toda la base verificada): **16/16 sin defectos, 0
  degradados** — coincidencia total con las decisiones originales.
  Resultado escrito en `verification.audit` de esos 16 reactivos.
- Cero reactivos con `isVerified=true` que no hayan pasado por
  `resolveVerdict` (coincidencia+confianza≥0.85+cero problemas) sin excepción.
- `pnpm typecheck` y `pnpm lint`: verdes (ver commit).

### Scripts temporales usados (NO committeados, eliminados al cerrar la fase)

`_dump_for_classify.ts`, `_apply_classifications.ts`, `_dump_grounding.ts`,
`_commit_batch.ts`, `_commit_subject.ts`, `_build_verifier_input.ts`,
`_split.ts`, `_apply_audit.ts` — vivieron en la raíz del repo durante esta
sesión para reusar las funciones reales de `scripts/lib/*` sin exponer la
API de pago. Si una futura sesión necesita repetir este patrón (por ejemplo,
para generar más contenido mientras el capital siga en cero), puede
reconstruirlos con la misma lógica: son ~50-150 líneas cada uno, documentados
en el historial de esta conversación.

### Pendiente heredado (no bloquea F4, informativo)

La key `acierta-pipeline-f2` de la API de pago sigue vigente (vence 17 ago
2026) por si el dueño decide en el futuro cubrir saldo para acelerar
generación en volumen — pero **no se debe sugerir ni asumir esa compra**; es
decisión exclusiva del dueño. Las 2 copias de la guía IPN son PDF escaneado
→ requieren visión (pendiente heredado de F1/F2b). 171/217 temas del temario
completo siguen sin ningún fragmento fuente — cualquier ingesta futura de
material nuevo en `docs/guias/` seguida de `pnpm content:scan-sources`
puede aumentar la cobertura SOURCED de materias ya generadas.

## Siguiente

**FASE:** F11 — **MODELO:** Sonnet 4.6
