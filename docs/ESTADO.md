# ESTADO — Acierta

Última actualización: 2026-08-05 · Última fase ejecutada: G3a (COMPLETADA)

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
| F11 | Dashboard del alumno | COMPLETADA | (F11) | Pantalla principal real (`app/(app)/app/page.tsx`), reemplaza el placeholder de F5. **RSC-first**: un único `Promise.all` en el Server Component resuelve toda la data real antes del primer render (Task 12); los únicos Client Components son las islas que de verdad lo necesitan (`AciertometroLoader` — wrapper `ssr:false` para el custom element de `@number-flow/react`, F7 —, `HeatmapCalendar`, `StartSimulationButton`, nav con `usePathname`). **Racha (nuevo, antes no tenía escritor pese a existir `StreakRecord` en schema)**: `src/lib/streak/compute.ts` (puro: sesión "cuenta" si dura ≥10 min, día activo por `startOfMexicoDay` de F9, racha actual sobrevive "hoy" sin sesión aún si "ayer" tuvo una, se rompe si ni hoy ni ayer) + `src/lib/db/streak.ts` (orquestación, upsert en `StreakRecord`), enganchado como tercer paso de `onSessionFinished` (F6) junto a `recomputeWeakTopics`/`recomputeLearningProfile` — mismo patrón robusto de try/catch independiente. **Delta semanal del Aciertómetro**: sin tabla de historial de predicciones (y sin agregarla sin instrucción explícita), `computeWeekOverWeekDelta` (src/lib/db/adaptive.ts) re-deriva la predicción de "hace una semana" filtrando `SessionAnswer` por fecha de corte y re-corriendo el `predictScore` puro de F6 sobre ese subconjunto — `null` si no hay historial previo a la semana (alumno nuevo, sin baseline), nunca inventa un cambio. **Reforzar hoy / Tino**: mismo problema de F7 (recurrente) — `WeakTopic` exige ≥3 intentos/tema y un alumno recién diagnosticado casi nunca llega ahí en ningún tema. `loadWeakestTopics` (src/lib/db/dashboard.ts) prefiere `WeakTopic` persistido y rellena los huecos con un ranking histórico completo SIN umbral (`loadAllTimeTopicRanking`) — mismo patrón de relleno que F7, aquí a nivel de todo el historial (no solo la última sesión) por ser un widget persistente. Tino recomienda el tema MÁS débil real (nunca genérico). **Mapa de calor 90 días**: nivel por día = duración de la sesión MÁS LARGA de ese día (0 sin sesión, 1 "tenue" <30min, 2 "lleno" ≥30min — regla exacta del PRD F-05), vía `react-calendar-heatmap` (typings instalados: `@types/react-calendar-heatmap`, no traía los suyos) + clases CSS propias (`.heatmap-level-N`) coloreadas con los tokens de marca. **Aciertómetro bloqueado (Task 11)**: `loadAciertometroAccess` — booleano NUEVO y distinto del gate de F9 (`canStartFullSimulation`, que responde "¿puede EMPEZAR uno nuevo?", no "¿debe VERSE el Aciertómetro?"): `unlocked = isPaid || completedFullSimulations > 0`, reusando las mismas funciones de `src/lib/db/paywall.ts` (F9) sin duplicar queries. `AciertometroLocked` (candado + copy + enlace ancla `#simulacro-cta` al botón real de la misma página — no a `/simulador`, que no existe hasta F12). **CTA primario "Hacer un simulacro completo"**: llama al `startSession` real de F2/F9 (ya gatea "1 gratis"), redirige a `/paywall` real si el muro lo bloquea; como el simulador (F12) aún no existe, el estado de éxito confirma honestamente "tu sesión ya quedó guardada" en vez de fingir una navegación a una pantalla que no existe. **Estados vacíos (Task 10)**: sin diagnóstico → único CTA claro con Tino (degrada TODO el dashboard, no solo el Aciertómetro); sin temas débiles y sin simulacros → `EmptyState` con Tino + acción, copy de "sin simulacros" tomado literal de UIUX Spec ("¡El primero es el más importante! 🦉"). **Navegación**: `Sidebar` (desktop, `lg:flex`/`hidden`) + `BottomNav` (móvil, `lg:hidden`, 5 opciones — las 3 rutas aún no construidas (Practicar/Simulador/Progreso/Perfil) apuntan a `/app` con un flag `builtRoute` que evita que se marquen visualmente "activas") + `TopBar` (racha + avatar), wireados en `app/(app)/layout.tsx` (afecta a todas las rutas del grupo `(app)`, ancho máximo ampliado a `max-w-5xl` sin romper nada). **Bug real encontrado y corregido**: la sintaxis de valor arbitrario `pb-[env(safe-area-inset-bottom)]` en `BottomNav` disparaba un bug de parseo del escáner de CSS de Tailwind 4 (Turbopack Y webpack, en modo dev) que corrompía candidatos `bg-[var(...)]` YA EXISTENTES en otros archivos (bytes de control en el nombre de la variable) — se evitó por completo reemplazando esa clase por `.acierta-safe-bottom` (CSS manual). **Bug preexistente, NO de esta fase, documentado para F-hardening**: incluso sin esa clase, el build de producción sigue emitiendo 1 warning no bloqueante sobre un candidato `bg-[var(...)]` corrupto (mismo síntoma, aparentemente disparado solo por el volumen de usos idénticos de `bg-[var(--bg-base)]` repetidos en 8+ archivos desde F5-F10) — no afecta el HTML/CSS servido, solo ensucia el log de build; raíz probable: bug del engine Oxide de Tailwind 4 con candidatos arbitrarios duplicados, no algo corregible desde el código de la app. 15 tests nuevos (244 total, todos verdes). **Verificación en vivo contra Supabase real** (usuario de prueba + fixtures SQL de sesiones/respuestas reales sobre preguntas reales de UNAM, recomputadas con el pipeline REAL `onSessionFinished` vía script `tsx` desechable — no con SQL a mano — para que Aciertómetro/racha/temas débiles reflejen exactamente lo que produciría un alumno real; todo eliminado al terminar): saludo+cuenta regresiva con fecha real del examen, Aciertómetro con predicción 60→meta 101→gap 41→+26 esta semana, Tino recomendando el tema realmente más débil (Circuitos eléctricos, 44%), 3 tarjetas de "reforzar hoy" en orden ascendente correcto, mapa de calor con niveles exactos (3 sesiones "tenue" + 2 "lleno" de los 5 fixtures, día de simulacro excluido al no estar COMPLETED), racha=4 (días consecutivos reales), simulacro reciente con score real; estado bloqueado del Aciertómetro y estado vacío de "sin simulacros" (copy exacto del spec) verificados forzando el simulacro fixture a no-completado; `Sidebar` oculto/`BottomNav` visible en 375px y viceversa en 1280px confirmado por `getComputedStyle`. Verificación hecha contra `next build` + `next start` (producción) en vez de `next dev`, porque el bug de Tailwind arriba SÍ es bloqueante (error duro, no solo warning) bajo Turbopack/webpack en modo dev — no afecta el sitio real que ve un usuario. `pnpm typecheck`, `pnpm lint`, `pnpm build` OK |
| F12 | Simulador (UX fiel al examen oficial) | COMPLETADA | (F12) | **EL feature diferenciador del producto.** Ruta `/simulador` FUERA del grupo `(app)` a propósito: sin Sidebar/BottomNav/TopBar — pantalla aislada y seria (UIUX §13), sin Tino ni gamificación durante la sesión (Tino solo reaparece en la bienvenida del gratuito y en resultados). **Reusa el motor de sesiones (F2/F6/F9) sin duplicarlo**: scoring server-side, política de no-revelado por modo (`buildSubmitResponse`), muro suave (`evaluateSimulationGate`), y `finishSession`→`onSessionFinished` (recálculo adaptativo). **Guardrail #1 del proyecto (la respuesta correcta JAMÁS viaja antes de terminar)**: ya garantizado por `buildSubmitResponse` (FULL_SIMULATION devuelve solo `{recorded:true}`) y `toRunnerQuestion` (opciones = solo `{id,text}`); el simulador reusa AMBOS. Verificado por (a) test unit `tests/simulator/no-leak.test.ts` que corre las MISMAS funciones del payload real, serializa el resultado y afirma que no contiene `isCorrect`/`correct` ni el contrato de sync acepta correctitud; (b) intercepción de RED REAL en vivo: la respuesta de `/api/simulator/sync` fue `{ok,recorded:1}` mientras la DB guardaba `isCorrect=true` calculado server-side — la correctitud nunca cruzó el cable; (c) `tests/e2e/simulator.spec.ts` (Playwright: happy-path + `page.on('response')` afirmando cero fugas, auto-omite sin credenciales E2E). **Módulos PUROS testeados** (`src/lib/simulator/`): `config` (institución→barajado: UNAM baraja preguntas+opciones, IPN solo preguntas), `shuffle` (Fisher-Yates SEMBRADO por `sessionId+questionId` — barajar opciones es determinista para que reabrir muestre el mismo orden, y solo cambia la vista: los `id` se conservan, el scoring no se afecta), `integrity` (merge monotónico de contadores, detección de atajos sospechosos), `time` (restante server-side, tono 30/15 min, formato HH:MM:SS). 28 tests nuevos (272 total). **Capa DB** (`src/lib/db/simulator.ts`): `startSimulation` (params por examen — 120/180 UNAM, 140/180 IPN —, set repartido por peso de materia reusando `buildDiagnosticQuestionSet`, pre-crea las N `SessionAnswer` para retomar), `loadSimulatorState` (resuelve activa/expirada/ninguna; el tiempo lo decide el SERVIDOR contra `startedAt`, nunca el cliente), `recordSimulatorSync` (upsert idempotente + integrity max-merge; nunca revela correctitud), `loadSimulatorResult` (desglose por materia + Aciertómetro). **Route Handler** `POST /api/simulator/sync` (no Server Action: es el destino de `navigator.sendBeacon`) para las 3 vías de resiliencia: flush periódico, reintento al reconectar, beacon en `beforeunload`/`pagehide`. **Store Zustand** (`src/lib/stores/simulatorStore.ts`) — ÚNICO uso de Zustand en el proyecto (CLAUDE.md): cola local de respuestas para offline, integrity, y la regla "no se puede regresar" codificada (`advance()` solo incrementa; no existe decremento). **Componentes** (`src/components/simulator/`): `SimulatorApp` (máquina de estados entry→active→result), `SimulatorPreflight` (reglas, cámara opcional no-bloqueante, aviso móvil, Tino de bienvenida al gratuito), `SimulatorRunner` (sesión seria: barra con temporizador de color, un reactivo, solo "Siguiente", listeners de integridad, pantalla completa vía `useSyncExternalStore`, overlay de reanudación), `SimTimer` (anclado a deadline absoluto ⇒ NO se pausa al cambiar de pestaña), `SimQuestion`, `SimulatorResult`. **Pantalla completa** vía `screenfull` con degradación graciosa (tarea 3). Dashboard wireado: nav "Simulador"→`/simulador` (builtRoute) y `StartSimulationButton` ahora navega al simulador real. **Bug real encontrado y corregido en verificación en vivo**: `await screenfull.request()` se COLGABA en contextos embebidos/con permiso restringido, bloqueando el arranque del examen (violaba la tarea 3 "nunca bloquear al usuario"); se cambió a disparo sin `await` (el gesto se conserva, el estado real lo refleja el runner). **Verificación en vivo contra Supabase real** (usuario de prueba onboardeado a UNAM Ingeniería en Computación, todo eliminado al terminar): pre-flight con Tino+reglas+cámara+params correctos; iniciar creó sesión `FULL_SIMULATION` IN_PROGRESS con 120 `SessionAnswer` y límite 10800s; runner serio sin Tino, "Pregunta 1 de 120", solo "Siguiente" (cero botón "Anterior"); responder+avanzar sincronizó al endpoint (respuesta sin `isCorrect`, DB con `isCorrect=true` server-side); envejecer `startedAt` +200min y recargar disparó la detección server-side de tiempo agotado → auto-cierre `COMPLETED_BY_TIMEOUT` score=1 → pantalla de resultados (aciertos, tiempo, Aciertómetro, desglose Español 19/Física 30/Mat 48/Química 23 = 120 por peso); fullscreen falló en el navegador embebido y el examen corrió igual (`completedFullscreen=false`, degradación graciosa); revisitar `/simulador` tras gastar el gratuito redirigió al `/paywall?trigger=FULL_SIMULATION_LIMIT`. `pnpm typecheck`, `pnpm lint`, `pnpm build`, 272 tests OK. **Nota de infra:** el E2E de Playwright apunta al servidor de PRODUCCIÓN (`pnpm build && pnpm start`), no a `next dev`, porque el escáner de CSS de Tailwind 4 en dev sigue con el bug de F11 (candidatos de valor arbitrario). Por eso la verificación en vivo también se hizo contra `next start`. **Pendiente heredado (F13):** los resultados son la versión básica (aciertos, tiempo, Aciertómetro, desglose); percentil vs. ciclo y "revisar preguntas falladas" con resolución por capas son F13 |
| F13 | Resultados del simulacro | COMPLETADA | (F13) | Pantalla que se ve justo al terminar un simulacro: aquí regresa la calidez que el simulador (F12) deliberadamente no tenía — Tino, color, celebración. **Guardrail de acceso (tarea 1)**: `loadOwnedFinishedSession` (src/lib/db/simulator.ts) es el ÚNICO punto que verifica dueño+sesión-terminada, compartido por `loadSimulatorResult` y el nuevo `loadSimulatorReview` — verificado en vivo con un `sessionId` ajeno/inexistente (cae a la entrada normal sin filtrar nada) y con una sesión propia AÚN EN CURSO (no muestra resultados; retoma la sesión activa en su lugar). **Celebración (tarea 2)**: `isPerfectRound` (src/lib/simulator/config.ts, umbral 90% medido contra los reactivos SERVIDOS, no el total oficial) dispara `PerfectRoundReveal` — estallido de partículas con Framer Motion `type:'spring'` (nunca linear, regla del proyecto) envuelto en `MotionConfig reducedMotion="user"` (mismo patrón ya probado de `StepTransition.tsx`, F5) para la tarea 12 sin lógica condicional propia. **Desglose por materia con color (tarea 3)**: `subjectColorFor` — paleta categórica `--chart-1..6` NUEVA en globals.css, deliberadamente DISTINTA de `--success`/`--danger` (esos ya significan correcto/incorrecto en toda la app) y NO reusa `Area.colorHex` (todas las materias de una sesión comparten la misma área, así que ese color no diferenciaría filas) — asignación determinista por hash del `subjectId` (reusa `hashSeed` de F12) para que "Matemáticas" tenga siempre el mismo color. **Aciertómetro con delta de sesión (tarea 5)**: `computeSessionPredictionDelta` (src/lib/db/adaptive.ts) — mismo patrón que el delta semanal de F11 pero con corte por SESIÓN en vez de por fecha: recalcula la predicción "antes" excluyendo las respuestas de ESTA sesión y la compara contra la ya persistida (que ya la incluye); `null` sin línea base (primera sesión del alumno) en vez de inventar un "+0". El componente `Aciertometro.tsx` ganó un `deltaLabel` opcional (default conserva el copy de F11 "esta semana") para reusarlo aquí como "por este simulacro" sin duplicar el componente. **Percentil (tarea 6)**: `computePercentileRank` (src/lib/simulator/percentile.ts, PURO) compara contra otras sesiones COMPLETADAS del MISMO `examId` (institución+nivel+año ya lo acotan a "mismo ciclo"); oculta el dato con `null` si la muestra es menor a `MIN_PERCENTILE_SAMPLE=5` en vez de mostrar un número sin sentido. **Verificado en vivo AMBOS estados**: con 0 sesiones hermanas el percentil no aparece; tras insertar 6 sesiones fixture con scores [40,60,75,90,100,118] para el mismo examen, recargar mostró exactamente "Le ganaste al 83%" (5 de 6 con score menor que 110 = 83.3%→83, matemática confirmada bit a bit). **Integridad con tono sobrio (tarea 7)**: `summarizeIntegrityEvents` (src/lib/simulator/integrity.ts, PURO) agrega los 3 contadores + las salidas de fullscreen desde `suspicionEvents`, filtra a solo los que ocurrieron (>0) — la copy explica "en el examen real esto puede anular tu evaluación" sin acusar. **Revelado de respuestas + revisión (tareas 8 y 9)**: nueva `loadSimulatorReview` trae las preguntas FALLADAS con la opción correcta marcada (✓/✗/○, nunca solo color — regla de accesibilidad) y la Capa 1 de explicación (siempre gratis, F9) si existe — 380 reactivos del pipeline F4 ya la tienen generada. Ruta `/simulador?view=review&session=X`, `SimulatorReview.tsx` con `<details>/<summary>` nativo (mismo patrón cero-JS del FAQ de F10). **Tino reacciona (tarea 10)**: ronda perfecta→`celebrating`, ≥60%→`attentive`, si no→`encouraging` (nunca un estado negativo — Tino anima, no regaña). **Racha (tarea 11)**: NO requirió código nuevo — `isQualifyingStreakSession` (F11) ya es agnóstica al modo de sesión (solo mira duración ≥10 min), así que un simulacro terminado ya contaba automáticamente vía el mismo `finishSession`→`onSessionFinished`→`recomputeStreak`; se agregó un test explícito que lo documenta y una racha real de 1 día se confirmó en vivo tras el primer simulacro del usuario de prueba. 21 tests nuevos (293 total). **Verificación en vivo contra Supabase real** (usuario de prueba onboardeado a UNAM, sesión de 120 reactivos con 110 correctas vía fixture SQL + `finishSession` REAL corrido con `tsx` — no simulado a mano — para que Aciertómetro/racha/percentil reflejen exactamente lo que produciría un examen real): celebración disparada (110/120=91.7%≥90%), desglose por materia exacto (Español 18/19, Física 26/30, Matemáticas 45/48, Química 21/23, suma=110), tiempo total y promedio correctos, racha 🔥1, delta del Aciertómetro correctamente OCULTO (primera sesión, sin línea base), percentil oculto→mostrado (83%) en ambos escenarios, revisión de las 10 falladas con respuesta correcta marcada y explicación real por `<details>`, acceso bloqueado a sesión ajena/inexistente y a sesión propia sin terminar. Todo el fixture (6 perfiles+sesiones dummy de percentil + el usuario principal) eliminado al terminar. `pnpm typecheck`, `pnpm lint`, `pnpm build`, 293 tests OK |
| F14 | Drill + capas de profundidad | COMPLETADA | (F14) | Ciclo de práctica diaria: `/practicar` DENTRO del grupo `(app)` (a diferencia del simulador aislado de F12 — el drill SÍ conserva Sidebar/BottomNav/TopBar, es parte de la experiencia cálida cotidiana). **Reusa el motor de sesiones sin duplicarlo**: `submitAnswer`/`finishSession` (F2) sin modificar — estos modos YA revelan correctitud al responder (`revealsCorrectnessOnSubmit`) y YA disparan `onSessionFinished` (temas débiles + racha, F6/F11) al terminar, así que la tarea 8 no necesitó código nuevo, solo reusar la tubería existente. **Selector adaptativo real (tarea 1)**: 3 alcances — "reforzar débiles" reusa `selectNextAdaptiveQuestions` (F6) sin cambios; nuevos `selectSubjectAdaptiveQuestions` (misma mezcla 60/25/15 acotada a una materia) y `selectTopicQuestions` (aleatorio dentro de un tema — la mezcla por tier no aplica con un solo tema) en `src/lib/db/adaptive.ts`. El schema no tiene un tercer `SessionMode` para "una materia" (no se toca `prisma/schema.prisma` sin instrucción explícita — CLAUDE.md), así que la decisión de mode quedó en un módulo PURO y testeado, `src/lib/drill/scope.ts` (`modeForScopeKind`): `topic`→`TOPIC_DRILL`, `subject`/`area`→`AREA_PRACTICE`. **Límite diario (tarea 2)**: reusa `evaluateDrillGate` de F9 sin cambios — contador visible ("Te quedan N reactivos gratis hoy") en el selector y dentro de la sesión activa. **Feedback inmediato (tarea 3)**: `DrillOptionButton` nuevo (a diferencia de `exam/OptionButton`, que NUNCA revela correctitud por diseño — este SÍ, porque el drill ya la revela al responder) con ✓/✗/texto siempre juntos (nunca solo color). **Resolución por 4 capas (tarea 4, PRD F-04)**: `ExplanationAccordion` — revelado PROGRESIVO (capa N solo pedible si N-1 ya se reveló) y cada clic re-valida el muro suave EN EL SERVIDOR vía `revealExplanationLayerAction`→`evaluateExplanationLayerGate` (F9, sin cambios): el contenido de capas 2-4 nunca llega al cliente de un usuario gratuito sin autorización — no es solo un candado visual, verificado en la respuesta de red real (`{"ok":false,"code":"PAYWALL"}`, sin el texto de la capa). Capa 4 no vive en la DB (el pipeline F4 solo generó capas 1-3, confirmado por conteo); es una invitación estática con la Capa 4 real seguida de la tarea 6. **Fórmulas matemáticas (tarea 5)**: `LatexText`/KaTeX reusado sin cambios (F7/F12/F13). **Capa 4 abre una sesión filtrada por tema (tarea 6)**: `onPracticeMore(topicId)` cierra honestamente la sesión actual (mismo `finishSession`, recalcula temas débiles+racha con lo avanzado hasta ahí) y abre de inmediato `startDrillAction({kind:'topic', topicId})` — mismo flujo que "por tema" del selector, sin código duplicado. **Reportar error (tarea 7)**: nuevo `reportQuestion`/`reportQuestionAction` — el único tramo de escritura que faltaba (la lectura y resolución en `/admin/reports` ya existían desde F3); `reportedBy` guarda el `authUser.id` (Supabase UID), mismo criterio que `UserProfile.userId`. **`RunnerQuestion` ganó `topicId`** (F7, campo aditivo no-breaking) — lo necesitaba la Capa 4 y el deep-link del dashboard. **`WeakTopicCard` (F11) dejó de apuntar a `/app`**: ahora enlaza a `/practicar?topicId=` con auto-arranque (`DrillApp` dispara el scope en un `useEffect` al montar) — un placeholder real menos. 3 tests nuevos (296 total, solo `modeForScopeKind`: la selección adaptativa por materia/tema es orquestación DB reusando el motor YA testeado de F6, y el resto de la lógica nueva es DB-touching sin lógica pura propia — verificado en vivo en su lugar, mismo criterio que `question-read.test.ts`). **Verificación en vivo contra Supabase real** (usuario de prueba + fixture de historial real en Álgebra vía `onSessionFinished` real, no SQL a mano): el selector "reforzar débiles" sirvió el tema débil real como primer reactivo; responder mal mostró ✗/✓ correctos al instante; Capa 1 se reveló con contenido real, Capa 2 quedó bloqueada con el link a `/paywall?trigger=EXPLANATION_LAYER&return=%2Fpracticar` (confirmado también a nivel de red); reportar un reactivo lo insertó con el `authUser.id` correcto y, tras 3 reportes, apareció en `/admin/reports` con el conteo exacto; terminar la sesión dejó la racha en 1 (era 0) y el `WeakTopic` recalculado con historial real (incluyendo las preguntas no respondidas del lote, mismo criterio ya usado en diagnóstico F7 — respuesta omitida cuenta como incorrecta). Todo el fixture (usuario, sesiones, reportes) eliminado al terminar. `pnpm typecheck`, `pnpm lint`, `pnpm build`, 296 tests OK |
| F15 | Gamificación y microcopy centralizado de Tino | COMPLETADA | (F15) | **Objetivo doble**: reglas exactas de disparo de las 3 mecánicas de motivación (racha/ronda perfecta/materia dominada) centralizadas en un único motor de prioridad, y diccionario centralizado de la voz de Tino en toda la app. **Módulos puros nuevos** (`src/lib/gamification/`): `mastery.ts` (`isSubjectMastered` — materia dominada exige `hitRate≥0.85` Y `attempts≥MIN_TOPIC_ATTEMPTS` en TODOS los temas de la materia, nunca el promedio general; reusa `MIN_TOPIC_ATTEMPTS` de F6 pero define su propio `SUBJECT_MASTERY_THRESHOLD` con comparación `>=` — deliberadamente distinto de `classifyTopicTier` de F6, que usa `>` estricto para un propósito distinto, clasificación de tier para el selector adaptativo), `streak-signals.ts` (`newlyReachedStreakMilestone` — 7/14/30, detecta el CRUCE, no solo "está por encima"; `isStreakAtRisk` — racha viva pero sin sesión calificante en el día México actual, reusa `startOfMexicoDay` de F9), `celebrations.ts` (`selectCelebration` — el ÚNICO punto que decide cuál de las 3 celebraciones grandes se muestra, prioridad exacta materiaDominada > perfectRound > streakMilestone, como máximo una por sesión; más `encodeCelebrationParam`/`decodeCelebrationParam` para viajar en la URL del redirect del simulador). **Diccionario centralizado** `src/lib/tino/copy.ts`: toda "línea de voz" de Tino (no copy transaccional de checkout/marketing, que se dejó fuera a propósito) vive aquí con su `TinoState` correcto — cubre estados vacíos, racha en riesgo, milestone de racha, después de error, paywall (relocado desde el `TRIGGER_COPY` local de `PaywallScreen.tsx`, F9), predicción sube, resultados de diagnóstico/simulacro/drill. **Capa DB** (`src/lib/db/gamification.ts`): `computeSessionCelebration` (llamada desde `finishSession` en `sessions.ts`, F2 — captura `previousStreak` ANTES de `onSessionFinished` y `currentStreak` DESPUÉS, para detectar el cruce exacto de milestone de ESTA sesión; otorga insignias `MATERIA_DOMINADA:<subjectId>` vía el mismo patrón idempotente `push` que `grantEarlyBirdBadge`, F8, reusando `UserProfile.badges` — CERO cambios de schema), `loadStreakStatus`, `loadMasteredSubjectBadges`. `FinishSessionResult` ganó el campo `celebration: Celebration | null`, robusto (try/catch, nunca rompe el cierre de sesión). **Simulador → resultados**: como `finishSimulationAction` redirige de página completa antes de que `SimulatorResult` se monte, la celebración decidida server-side viaja codificada en la URL (`encodeCelebrationParam`) en vez de recalcularse en el render (recalcular sería incorrecto: para entonces la insignia ya se otorgó, "recién dominada" ya no se distinguiría de "dominada desde antes"). **Componentes nuevos** (`src/components/gamification/`): `CelebrationDisplay` (las 3 variantes, reusando `PerfectRoundReveal` — relocado desde `components/simulator/`, formalizado como pieza compartida per tarea 1 — para las 3, solo cambia el marco/texto/tiempo; materia dominada usa transición card-flip 1400ms vía `rotateY`, UIUX §9), `StreakRiskBanner`, `MasteredSubjectBadges` (sin página de Perfil dedicada aún — nav la deja `builtRoute:false` — la insignia vive en el dashboard existente). **Migración de microcopy** a los ~10 puntos que antes tenían el texto disperso/duplicado: `DiagnosticResults.tsx` (su `tinoMessage()` local → `diagnosticResult()`), `PaywallScreen.tsx` (su `TRIGGER_COPY`/`DEFAULT_COPY` local → `paywallTriggerCopy()`), `PracticeSelector.tsx`, `SimulatorPreflight.tsx`, `SimulatorResult.tsx` (su lógica ad-hoc de 3 niveles → `simulatorResult()` + `CelebrationDisplay`), `DrillSummary.tsx` (+ `CelebrationDisplay`), `DrillRunner.tsx` (burbuja nueva de Tino tras responder mal, `afterMistake()`), `app/(app)/app/page.tsx` (empty states + nuevas secciones de racha en riesgo/insignias), `app/(app)/practicar/page.tsx` + `app/simulador/page.tsx` (`NoTargetMessage`), `app/(app)/diagnostico/page.tsx` (`NoContentMessage`). **Guardrail tarea 6 (cero Tino en el simulador activo)**: verificado con un test que lee el CÓDIGO FUENTE real de `SimulatorRunner.tsx` (no un mock) y falla si la palabra "Tino" aparece fuera de un comentario — mismo patrón de permanencia que `no-leak.test.ts` de F12. **Reduced motion (tarea 7)**: las 3 celebraciones + `PerfectRoundReveal` ya envueltas en `MotionConfig reducedMotion="user"` (patrón establecido desde F5/F13). 34 tests nuevos (330 total): límites exactos de fecha de racha (medianoche México, incluida la ventana 23:00-23:59), umbral de materia dominada (el caso crítico "un tema al 50% aunque el promedio general sea 91.6%" es `false`), prioridad de celebraciones con los 3 candidatos calificando a la vez, round-trip de serialización de celebración en URL, y el guardrail de código fuente. **Verificación en vivo contra Supabase real** (usuario de prueba `acierta.f15.gamify@gmail.com` onboardeado a UNAM Ingeniería en Computación — señal `email_confirmed_at` fijada por SQL porque el proyecto exige confirmación y no hay proveedor SMTP propio en este entorno de prueba, mismo tipo de workaround de infra que otras fases, no un bypass de la lógica de negocio): sesión real de práctica de 10 reactivos vía la UI (4 correctas/6 incorrectas) disparó `finishSession`→`onSessionFinished`→`computeSessionCelebration` real; la burbuja "Uy, esa estuvo difícil. La volvemos a ver más adelante. 💪" apareció exactamente tras cada respuesta incorrecta; `DrillSummary` mostró el copy correcto de `drillSummary(0.4)` sin celebración (correcto: ninguna materia con TODOS sus temas al umbral, sesión de 2 min no calificó para racha); confirmado por query directa a la DB tras terminar: `badges=[]`, `currentStreak=0` — exactamente el resultado esperado, sin falsos positivos. Cero errores de consola, cero errores de servidor. Todo el fixture (usuario + perfil, cascada completa) eliminado al terminar. `pnpm typecheck`, `pnpm lint`, `pnpm build`, 330 tests OK |
| F16 | Panel parental y sistema de correos | COMPLETADA | (F16) | **El schema ya tenía TODO lo necesario** (`ParentLink`, `ParentLinkCode`, `NotificationPreference`/`NotificationType`, `UserRole.PARENT`, más el gate `evaluateParentDashboardGate`/`canAccessParentDashboard` de F9) — F16 fue 100% código nuevo sobre un modelo de datos ya preparado, cero cambios de schema. **Vinculación** (tareas 1-2): `src/lib/parent/link-code.ts` (puro: código de 6 dígitos, TTL 10 min, `isLinkCodeRedeemable` exige `usedAt===null` Y no vencido) + `src/lib/db/parent.ts` (`generateParentLinkCode` invalida códigos previos sin usar del mismo alumno antes de crear uno nuevo — evita ambigüedad de "cuál es el vigente"; `redeemParentLinkCode` es atómico vía `updateMany({where:{code,usedAt:null,expiresAt:{gt:now}}})` — si dos canjes llegan a la vez, como mucho uno actualiza una fila, sin necesitar un lock manual). **Privacidad, verificada en DOS capas** (tarea 4): (a) `src/lib/db/parent.ts` nunca hace `select`/`include` sobre `Question` ni `SessionAnswer.selectedOption`/`isCorrect` — todo lo que expone son loaders YA EXISTENTES de F11 que agregan (`loadExamCountdown`, `loadRecentSimulations`, `loadHeatmapData`, `computeWeekOverWeekDelta`), cero lógica nueva que auditar; (b) a nivel de base de datos, las políticas RLS de F1 (`0001_enable_rls.sql`, sin cambios en esta fase) YA restringían `exam_sessions`/`session_answers`/`weak_topics`/`streak_records`/`learning_profiles`/`questions` a `userProfileId = current_profile_id()` SIN ninguna excepción de "padre" — un tutor con el JWT del cliente no puede leer ni una fila agregada de esas tablas ni con acceso directo a Supabase; solo el servidor (Prisma, rol `acierta_ci` con BYPASSRLS) puede, y ese código es exactamente el auditado en (a). **Panel bloqueado** (tarea 5): reusa el gate de F9 tal cual (`evaluateParentDashboardGate`, Mensual no alcanza) — sin botón de "comprar" en el panel del tutor (el plan se activa desde la cuenta del alumno, no hay flujo de "pagar por otro" en este producto). **Multi-hijo** (tarea 6): `loadLinkedStudents` + `StudentSwitcher` — puros `<Link href="/tutor?student=...">` sin JS de cliente, cada `parentProfileId+studentProfileId` verificado independientemente en `loadParentDashboardData` (un alumno bloqueado y otro desbloqueado del mismo tutor se muestran correctamente por separado). **Navegador de Facebook** (tarea 7): `/tutor` fuera de `(app)`, sin Sidebar/BottomNav/Tino, con `ParentShell` (modo claro fijo) — de sus 6 componentes, solo 2 son Client Components (`LinkCodeForm`, `WeeklyEmailToggle`), ambos formularios/checkboxes nativos sin APIs exóticas; verificado en viewport 375px sin scroll horizontal y cero errores de consola. **Sistema de correos** (tarea 8): `src/lib/email/client.ts` (Resend con `import 'server-only'`, mismo patrón que `stripe/client.ts` F8) — sin `RESEND_API_KEY` o si Resend falla, degrada a solo `console.log` sin lanzar nunca (instrucción explícita: "continúa sin detenerte"); 4 plantillas puras (`templates.ts`): confirmación de pago (hookeada en el webhook de Stripe existente, usa datos YA presentes en el evento verificado — `customer_details.email`, `metadata.plan`, `amount_total` — sin queries extra), resumen semanal parental, racha en riesgo, cuenta regresiva (30/15/7/1). **Un solo cron diario** (`/api/cron/notifications`, protegido con `CRON_SECRET` vía `Authorization: Bearer` — el mismo header que Vercel Cron agrega automáticamente) corre los 3 jobs de correo; la regla "racha en riesgo máximo 1/día" se cumple ESTRUCTURALMENTE por la cadencia del propio cron (una corrida diaria), no con una bandera "ya enviado hoy" en DB — evita tocar el schema. El resumen parental solo dispara en lunes real de México (`isMondayInMexico`, reusa `startOfMexicoDay` de F9). **Enlace de baja** (tarea 9): firma HMAC (`sign/verifyUnsubscribeToken`) reusando `CRON_SECRET` como llave (evita introducir un secreto nuevo) — sin ella, el link de baja sería un IDOR trivial (apagar la preferencia de cualquier otro usuario adivinando su id); solo los 3 tipos NO transaccionales lo llevan (`PARENT_WEEKLY`/`STREAK_RISK`/`EXAM_COUNTDOWN`) — la confirmación de pago nunca, por regla explícita de Flujo_App §13. Preferencias opt-in vs. prendidas-por-defecto decididas en código (`src/lib/notifications/preferences.ts`), no en el schema (`enabled` por defecto es `true` ahí, pero "sin fila" se interpreta como apagado para `PARENT_WEEKLY`/`STREAK_RISK`). **Registro de tutor**: `/registro?role=tutor` (CTA agregado a `ParentSection.tsx` de F10) pasa `role=PARENT` a `signUpAction` (antes solo creaba `STUDENT`). **Bug real encontrado y corregido en verificación en vivo**: el login genérico (`/login` sin `?next=`) siempre redirigía a `/app` sin importar el rol — un tutor caía directo en el asistente de onboarding de ALUMNO (`/app`→`requireOnboarding`→`/onboarding`, con `onboardingStep=0` de por vida porque un tutor nunca pasa por ese asistente, quedando efectivamente atrapado). Corregido en dos puntos: `signInAction` ahora resuelve el destino por ROL cuando no hay `next` explícito (`/tutor` para PARENT, `/app` para STUDENT; un `next` explícito como `/login?next=/tutor` sigue ganando), y `(app)/layout.tsx` ahora comprueba el rol ANTES que el onboarding (defensa en profundidad — si un PARENT llegara a `/app` por cualquier otra vía, se redirige a `/tutor` en vez de caer en el bucle de onboarding). 22 tests nuevos (367 total): límites exactos del código de 6 dígitos (TTL, un solo uso, no reusable tras canjearse), umbral de inactividad de 3 días, defaults opt-in de notificaciones, firma/verificación del token de baja (incluye anti-IDOR: un token válido para OTRO userProfileId o tipo se rechaza), autorización del cron, y la regla de "lunes en México". **Verificación en vivo contra Supabase real** (2 alumnos + 1 tutor, cuentas creadas por SQL directo en `auth.users`/`auth.identities` porque el proyecto agotó su cupo gratuito de correos de verificación de Supabase por esta fecha — mismo tipo de workaround de infraestructura que otras fases, no un bypass de lógica de negocio; login normal con contraseña funcionó igual que con una cuenta creada por el flujo real): código de 6 dígitos generado con cuenta regresiva en vivo (10:00→9:58 confirmado), código inválido rechazado con el mensaje correcto, código real canjeado exitosamente (confirmado en DB: `ParentLinkCode.usedAt` fijado, fila `ParentLink` creada), panel bloqueado mostrado correctamente para un alumno FREE, panel completo desbloqueado tras fixture de una suscripción `SEASON_PASS` ACTIVE con racha/predicción reales, selector entre 2 hijos con estados independientes (uno bloqueado, otro desbloqueado) confirmado, toggle de resumen semanal confirmado en DB tras clic real, viewport 375px sin scroll horizontal ni errores de consola, ruta cron rechaza sin/con secreto incorrecto (401 en ambos casos), ruta de baja rechaza firma inválida y tipo inválido. Todo el fixture (3 perfiles + auth.users/identities + suscripción + racha + predicción + vínculos) eliminado al terminar, cero filas huérfanas confirmado por query. `pnpm typecheck`, `pnpm lint`, `pnpm build`, 367 tests OK |
| F17 | PWA instalable y perfil de usuario completo | COMPLETADA | (F17) | **PWA** (tarea 1): `app/manifest.ts` (convención de archivo de Next, mismo patrón que `sitemap.ts`/`robots.ts` de F10) con `display: "standalone"` + 3 íconos generados al vuelo con `next/og` (192/512/512-maskable, mismo truco que `opengraph-image.tsx` de F10 — sin depender de un archivo de diseño) más `apple-icon.tsx` y `appleWebApp` en metadata para iOS (Safari ignora el manifest, solo respeta esas meta tags). **Offline mínimo, a propósito minimalista**: `public/sw.js` escrito a mano (sin Workbox) con DOS estrategias nada más — navegaciones: network-first con respaldo a caché (el tablero y cualquier pantalla de `(app)` quedan disponibles con los últimos datos vistos); `/_next/static/*`: cache-first (nombre de archivo con hash de contenido, cachear agresivo es seguro — sin esto el HTML offline se vería sin estilos ni JS de hidratación). **`/simulador` es la EXCEPCIÓN explícita y verificada en vivo**: el service worker nunca lo cachea (`isSimulatorPath()`) y responde con una página de aviso de "necesitas conexión" en vez de contenido viejo — confirmado navegando a `/simulador` y comprobando que la Cache Storage API sigue sin ninguna entrada que contenga "simulador", mientras que `/app`, `/app/perfil`, `/login` y `/` sí quedaron cacheados. **Aviso de instalación no invasivo**: `shouldShowInstallPrompt` (puro, `src/lib/pwa/install-prompt.ts`) — 2ª visita en adelante, cooldown de 7 días tras descartarlo, nunca si ya está instalada (`display-mode: standalone`); conteo de visitas y fecha de descarte en `localStorage` a propósito (estado del dispositivo, no de sesión — no viola la regla de CLAUDE.md sobre datos sensibles). **Tema migrado de localStorage a DB** (tarea 2, criterio explícito): `ThemeToggle.tsx` (F0, nunca conectado a ningún layout — código muerto real) se eliminó; `(app)/layout.tsx` ahora lee `profile.themePref` (ya existía en el schema desde el inicio, sin usarse) para el `data-theme` real, y el nuevo selector en Perfil persiste con `updateThemeAction` + `router.refresh()` — verificado en vivo: clic en "Claro" → `UserProfile.themePref='light'` en DB → el div interno de `(app)` cambia a `data-theme="light"` tras el refresh (confirmado con `document.querySelectorAll('[data-theme]')`, distinto del `<html>` raíz que sigue fijo en dark como fallback pre-hidratación). **Pantalla `/app/perfil` completa** (tarea 2): nombre + foto de perfil (subida DIRECTA del navegador al bucket nuevo `avatars` de Supabase Storage — RLS por carpeta `auth.uid()`, migración `0008_avatars_storage_bucket.sql` — el servidor solo valida y persiste la URL resultante, nunca ve el archivo), verificación de correo + reenviar (reusa `resendVerificationAction` de F5 sin cambios), cambiar contraseña (nueva Action, mismo `supabase.auth.updateUser` que ya usaba el flujo de recuperación pero sin el redirect a `/login` — aquí el usuario ya tiene sesión), preferencias de notificación del alumno (`STREAK_RISK`/`EXAM_COUNTDOWN`, reusa `setNotificationPreference` de F16), **cambio de carrera meta con recálculo del Aciertómetro** (verificado en DB de que la nueva carrera pertenece a la MISMA área que la actual — nunca se confía en el `careerId` del cliente; el hueco se recalcula SOLO, sin código nuevo, porque `computeCareerStrategy`, F6, ya releía `targetCareerId` fresco en cada carga — verificado en vivo cambiando de Ingeniería en Computación, meta 101, a Física, meta 104: el Aciertómetro pasó de mostrar el hueco viejo a **"Te faltan ~30 aciertos"** exactamente `104-74`), "Mi plan" con vigencia real y **cancelación de Mensual sin soporte** (`cancel_at_period_end: true` vía Stripe, nunca cancelación inmediata — el alumno ya pagó ese periodo; el webhook YA existente de F8 desactiva el acceso solo cuando Stripe de verdad cierre la suscripción, respetando la regla de oro "el acceso se activa/desactiva SOLO por webhook"; verificado en vivo hasta el límite de las credenciales de Stripe placeholder de este entorno — capital cero, mismo límite heredado documentado desde F8/F9 — el guard-clause y el manejo de error confirmados con un 401 real de Stripe, degradación correcta sin crash), insignias (reusa `loadMasteredSubjectBadges` de F15), y el código de vinculación de tutor (`ParentLinkCard` de F16 MOVIDO del dashboard a Perfil, ahora que existe una pantalla de Perfil real). **Derechos de datos** (tarea 3): exportar (`GET /api/account/export`, Route Handler no Server Action para que el navegador lo trate como descarga real vía `Content-Disposition: attachment` — JSON con cuenta, meta académica, Aciertómetro, racha, temas débiles, sesiones con respuestas, pagos, preferencias y conteo de vínculos parentales) y **eliminar cuenta con confirmación fuerte** (escribir el correo exacto, no un checkbox) que **anonimiza en vez de borrar los pagos**: como `Subscription`/`Payment` tienen `onDelete: Cascade` desde `UserProfile` en el schema, borrar la fila del perfil habría destruido el historial de pagos junto con todo lo demás — en su lugar, el perfil se ANONIMIZA en el sitio (sin nombre/foto/meta/insignias) y sigue vivo como ancla estable para esas filas, mientras que TODO lo demás (sesiones, temas débiles, racha, predicción, preferencias, vínculos parentales) se borra de verdad; la identidad de Auth (correo, login) se borra aparte con `SUPABASE_SERVICE_ROLE_KEY` (primer uso de esa credencial en el proyecto, `src/lib/auth/supabase-admin.ts`) — si esa llamada falla (confirmado en vivo: la llave de servicio no está configurada en este entorno), los datos personales YA se anonimizaron/borraron de todas formas, nunca se bloquea al usuario por esa dependencia opcional. **Verificado en vivo end-to-end contra Supabase real** (cuentas de prueba creadas por SQL directo, mismo motivo/técnica que F16 — cupo de correo de verificación agotado): exportar devolvió el JSON real con la carrera actualizada reflejada; eliminar cuenta con correo incorrecto rechazado, con el correcto anonimizó el perfil (`displayName`/`avatarUrl`/`targetExamId`/`targetCareerId`/`badges` todos vacíos) y borró en cascada sesiones/temas débiles/racha/predicción/preferencias/vínculos (los 7 conteos en 0) mientras la `Subscription` de prueba se conservó intacta (count=1) — exactamente la garantía pedida; el `auth.users` real siguió existiendo (confirma la degradación correcta sin `SERVICE_ROLE_KEY`) pero la sesión se cerró y el usuario quedó fuera. Manifest, los 3 íconos PWA y `apple-icon` verificados con `curl` (200, `image/png`/JSON correctos); service worker confirmado `activated` vía `navigator.serviceWorker.getRegistrations()`. Todo el fixture (3 cuentas, perfiles, suscripciones, `auth.users`/`identities`) eliminado al terminar. 8 tests nuevos (375 total, solo el motor puro del aviso de instalación — el resto de la lógica nueva es orquestación DB/Storage/Stripe sin cálculo propio, verificada en vivo en su lugar, mismo criterio que F14/F16). `pnpm typecheck`, `pnpm lint`, `pnpm build`, 375 tests OK |
| F18 | Pantalla de progreso y barrido de calidad visual | COMPLETADA | (F18) | **Pantalla de trayectoria** (tarea 1, `/app/progreso`, `src/lib/db/progress.ts`): evolución del Aciertómetro (`loadAciertometroHistory`) reconstruida SIN tabla de historial nueva — recorre las sesiones terminadas en orden cronológico acumulando aciertos/intentos por materia y llama a `predictScore` (puro, F6) después de cada una, exactamente la misma técnica de reconstrucción que `computeWeekOverWeekDelta` (F11) ya usaba para un solo corte, aquí aplicada punto por punto (tope 30 puntos, un valor por día); `AciertometroHistoryChart` es SVG estático server-rendered (sin JS de cliente) con `aria-label` resumen en texto (color/forma nunca es el único canal). Dominio por materia (`loadSubjectMastery`) de más débil a más fuerte, incluyendo materias sin intentos, con CTA "Practicar" real — extendido `/practicar?subjectId=` (mismo patrón que `?topicId=` de F11/F14) para el deep-link. Historial COMPLETO de simulacros (`loadSimulationHistory`, sin límite, a diferencia de los 3 del dashboard) enlazando a `/simulador?view=result&session=` ya existente. Estadísticas acumuladas calculadas frescas (reactivos respondidos, % acierto global, horas de estudio sumando duración de sesiones, racha más larga de `StreakRecord.longestStreak`). Vitrina de insignias reutiliza `ProfileBadges` de F17 tal cual. Gate del Aciertómetro reutiliza `loadAciertometroAccess` (F11) — misma regla de muro suave que el dashboard. **Verificado en vivo con fixture real de 3 sesiones en 3 días distintos**: los números de la pantalla (evolución 52→79, 78 reactivos, 69% acierto global, 3.3h, dominio Química 50%/Física 58%/Matemáticas 77%/Español 92%) coinciden EXACTOS con el cálculo manual esperado, y el delta "+27" del dashboard existente coincidió de forma independiente con el primer punto de la gráfica nueva (52) — misma matemática, dos pantallas distintas, verificación cruzada real. **Barrido de colores/bordes hardcodeados** (tarea 2): 6 usos de `rounded-[12px]`/`rounded-[24px]`/`min-h-[44px]` (valores arbitrarios que duplicaban tokens ya existentes) migrados a `rounded-md`/`rounded-xl`/`min-h-touch`; ~15 usos redundantes de `text-[var(--x)]`/`bg-[var(--x)]` (sintaxis de corchetes que ya apuntaban a un token con nombre) migrados a la clase con nombre (`text-danger`, `bg-warning/10`, etc.); **bug real encontrado**: `AuthShell.tsx` usaba `shadow-[var(--shadow-md-dark)]` — esa variable CSS NUNCA existió en `globals.css` (solo `--shadow-md`, ya theme-aware), así que las tarjetas de login/registro/recuperar-password llevaban meses sin sombra real; corregido a `shadow-md`, y le faltaba `font-display` en el título (inconsistencia tipográfica real). Hex literal de marca centralizado en `src/lib/brand/colors.ts` — única fuente para los 6 archivos que SÍ deben usarlo (`next/og` en los íconos PWA/OG image y `Metadata.themeColor`/`manifest.ts`, que no pueden consumir `var()`); `Tino.tsx` (mascota) migrado de hex literal a `var(--token)` en sus 5 acentos de estado (coinciden exacto con success/streak/info/warning/brand). **Contraste AA** (tarea 3, UIUX §12 "verificar especialmente violeta y verde"): medido con la fórmula WCAG real — `text-brand` (violeta) sobre superficies OSCURAS daba 3.03-3.35:1, **por debajo de 4.5:1 para texto normal** (el logo grande en negritas SÍ se salva por la excepción de "texto grande" ≥3:1, pero ~20 enlaces `text-sm font-semibold` en dashboard/drill/simulador/perfil NO) — corregidos a `text-brand-soft` (6.35-7.02:1) en los ~20 sitios reales donde aplicaba, dejando intactos marketing/admin/panel-parental (temas claros fijos, ya pasaban). Verde/ámbar/rojo/azul semánticos (`--success`/`--warning`/`--danger`/`--info`/`--streak`) daban de sobra en dark (5.08-11.45:1) pero **fallaban feo en light** (2.28/1.67/3.76/2.28:1) — como F17 hizo el tema togglable en `/app/perfil` y ahora también en `/app/progreso`, esto es un bug real y alcanzable, no teórico; solución: esos 5 tokens (antes hex estático en `tailwind.config.ts`) ahora son `var(--x)` con un valor SOLO para `[data-theme='light']` calibrado ≥4.5:1 (verde `#15803D`, ámbar `#B45309`, rojo `#DC2626`, azul `#0369A1`, naranja `#C2410C`) — dark no cambia nada (sigue usando el valor vivo original vía `:root`). `--brand-soft` mismo patrón: colapsa a `--brand-primary` solo en light (el lila claro fallaba ahí, 2.72:1). Verificado en vivo con `getComputedStyle` en ambos temas: dark sigue exactamente igual (`rgb(239,68,68)` danger sin cambios), light ahora da `rgb(220,38,38)`/`rgb(21,128,61)` con contraste medido 4.65:1 en el navegador real, no solo calculado. **Accesibilidad de interacción** (tarea 3): foco de teclado — `:focus-visible` global de respaldo en `globals.css` (especificidad baja a propósito, los componentes que ya definían su propio anillo como `Button`/`TextField` lo pisan sin conflicto) para los enlaces/botones que nunca tuvieron tratamiento propio; `TextField`/el `<select>` de carrera meta migrados de "solo cambia el color del borde" (1.90:1, prácticamente invisible) a `focus:ring-2 focus:ring-brand`. Área táctil ≥44px: ~15 controles reales corregidos (toggle de notificaciones del alumno Y del tutor sin `min-h-touch`, "Cancelar mi plan"/"Eliminar mi cuenta"/"Reenviar verificación" sin altura mínima, botones del selector de práctica, reportar reactivo, paginación admin, selector de alumno del tutor). Íconos-botón: ya tenían `aria-label` donde correspondía (cerrar modal admin, navegador de preguntas); checkboxes de notificación ya usaban `<label>` nativo (asociación correcta, sin necesitar `aria-label`). **Barrido responsive** (tarea 4): sin overflow horizontal verificado con `scrollWidth` real en 320/375/768/1280px en progreso/perfil/dashboard; `Sidebar`/`BottomNav` alternan correctamente en el breakpoint `lg`. **Panel parental en 320px** (navegador de Facebook, el caso explícito pedido): verificado en vivo con sesión real de tutor — cero overflow horizontal, estado bloqueado Y estado desbloqueado (con página real: predicción 79, +27 vs. semana pasada — coincide exacto con el cálculo de la pantalla de progreso nueva) ambos renderizan correctamente. **Reduced motion** (tarea 3): ya estaba bien cubierto desde F13/F15 (`MotionConfig reducedMotion="user"` en las 3 celebraciones Framer Motion + regla CSS global `prefers-reduced-motion` para animaciones CSS/`@number-flow`) — verificado que sigue siendo exhaustivo (grep de los 3 únicos usos de `framer-motion` en el repo), sin necesitar cambios. **Detalles finos** (tarea 5): 6 `loading.tsx` nuevos (`/app`, `/app/progreso`, `/app/perfil`, `/practicar`, `/tutor`) con esqueletos reales vía nuevo `<Skeleton>` — el de `/tutor` reutiliza `ParentShell` explícitamente (si no, el esqueleto parpadearía oscuro un instante antes del panel claro real, porque el tema del panel se aplica en `page.tsx`, no en `layout.tsx`). Zonas seguras de iPhone: **bug real encontrado** — `viewport-fit=cover` nunca estuvo en el `<meta viewport>`, así que el `padding-bottom: env(safe-area-inset-bottom)` de `.acierta-safe-bottom` (ya escrito desde F11) llevaba toda la vida resolviendo a 0 en iOS real (el requisito de Safari para que `env()` haga algo); agregado `viewportFit: "cover"` al nuevo `export const viewport` (migrado de paso del `metadata.viewport`/`themeColor` deprecado de Next 14+ al `Viewport` export correcto de Next 16) + nueva `.acierta-safe-top` (mismo motivo que `.acierta-safe-bottom`: la sintaxis arbitraria `pt-[env(...)]` de Tailwind dispara el bug de parseo documentado en F11) aplicada al `TopBar` y al header del simulador, necesaria ahora que `black-translucent` (F17) + `cover` sí dibujan bajo el notch/Dynamic Island. Texto largo: `truncate` ya aplicado donde corresponde en los componentes nuevos (nombre de materia, fila de simulacro). **Confirmado NO bloqueante** (ya documentado desde F10/F11, no de esta fase): advertencia de compilación sobre un candidato `bg-[var(...)]` corrupto del engine Oxide de Tailwind 4 bajo Turbopack — sigue sin afectar el HTML/CSS servido; verificación de esta fase hecha contra `next build && next start` (dev mode SÍ falla duro con este bug, como F11 ya advirtió) — confirmado en vivo con `getComputedStyle` que los tokens de color compilan y aplican correctamente en producción. 375 tests (sin tests nuevos — F18 es UI/orquestación y barrido de calidad, no lógica de negocio nueva, mismo criterio que F10). `pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm test:unit` OK |
| F19 | Suite de extremo a extremo y pruebas críticas | COMPLETADA | (F19) | Blindaje de las 3 zonas donde un error cuesta dinero o confianza: simulador, pagos y motor. **3 BUGS REALES ENCONTRADOS Y CORREGIDOS** (detalle abajo). **E2E del simulador** (`tests/e2e/simulator.spec.ts`, Playwright contra `next build && next start` + Supabase real): flujo feliz COMPLETO recorriendo los 120 reactivos hasta la pantalla de resultados ("Terminar examen" solo existe en la última pregunta, igual que el examen real); imposibilidad de regresar verificada en 3 puntos distintos (primera pregunta, a mitad y en la última) — es una garantía ESTRUCTURAL, el store de Zustand solo expone `advance`, no existe acción de retroceso; **no-filtración de la respuesta correcta interceptando el tráfico de red REAL** (`page.on('response')` sobre TODO el tráfico de la app, no solo `/api` — en Next.js las Server Actions y el payload RSC viajan por la propia ruta, filtrar por `/api` habría dejado fuera justo el canal por donde podría escaparse), armado antes de entrar y desarmado solo al confirmar el cierre (revelar ahí ya es legítimo); recarga a mitad de sesión que retoma la MISMA sesión con el tiempo del SERVIDOR (verifica que el restante bajó y que recargar no regala tiempo); y paywall en el segundo simulacro de una cuenta gratuita (redirige con `trigger=FULL_SIMULATION_LIMIT` ANTES de crear nada). **4 de 4 escenarios PASANDO en vivo** (los 3 specs del simulador + el del límite diario). La suite es idempotente: `ensureNoActiveSimulation` cierra por UI real cualquier simulacro colgado de una corrida anterior, sin lo cual el orden de ejecución la volvía frágil. **E2E del recorrido de usuario nuevo** (`tests/e2e/new-user-journey.spec.ts`): registro → onboarding (4 pasos) → diagnóstico → tablero (tras `E2E_SIGNUP=1`, apagado por defecto porque consume el cupo de correos de Supabase); **límite diario de práctica gratuita verificado contra el endpoint real** —no inferido de la UI— comprobando que el servidor NUNCA entrega más de lo que queda aunque el cliente pida 50, y que agotado responde 402 con `DRILL_DAILY_LIMIT` (PASA en vivo, probado con cuenta de pago y con cuenta gratuita); checkout hasta la redirección a `checkout.stripe.com` sin completar pago real, comprobando además que el acceso sigue SIN activarse (solo el webhook puede activarlo) — requiere `sk_test_`, hoy omitido por la limitación heredada de llaves placeholder (F8). **Webhook de pagos: los 5 casos contra el Route Handler REAL** (`tests/stripe/webhook-route.test.ts`, 9 tests): pago con tarjeta completado, pago asíncrono confirmado (OXXO: el voucher NO da acceso, la confirmación sí), evento duplicado que responde 200 pero NO reprocesa (ni reactiva, ni duplica el Payment, ni reenvía el correo), firma inválida rechazada con 400, y pago asíncrono fallido. La verificación de firma es REAL: los payloads se firman con `stripe.webhooks.generateTestHeaderString` (utilidad oficial de simulación de Stripe) y se verifican con el mismo `constructEvent` de producción — nada de mockear la firma; se cubren los 3 vectores (secreto equivocado, cabecera ausente y cuerpo manipulado DESPUÉS de firmar). Más el contrato de reintento: un fallo transitorio devuelve 500 (no 200) para que Stripe reintente, porque un 200 haría que dejara de reintentar y el alumno pagaría sin que se le active el acceso. Complementa —no reemplaza— los tests de F8 sobre la función pura. Habilitado con un stub de `server-only` acotado a Vitest (el build de Next sigue usando el paquete real, así que la protección de `STRIPE_SECRET_KEY` no se debilita) y el alias `@/app` que faltaba en `vitest.config.ts`. **Regresión del motor adaptativo** (`tests/adaptive/regression.test.ts`, 30 tests de casos LÍMITE): divisiones degeneradas (sin materias, todos los pesos en 0, `totalQuestions` 0) que no producen NaN; la regla pesimista no se puede burlar (acertar 4 de 4 NO infla el Aciertómetro — el fallo de confianza más caro posible); materias sin tocar SIEMPRE arrastran hacia abajo, nunca hacia arriba; fronteras exactas de los umbrales (0.60 NO es débil, 0.85 NO es dominado, 3 intentos sí clasifica); invariante de que `targetBucketCounts` suma exacto para todo count de 1 a 200 (sin perder ni inventar reactivos por redondeo); el selector nunca devuelve un excluido de las 72h, nunca repite, nunca rellena de aire y degrada bien con pool corto; y fronteras de la estrategia de carrera (gap 0 = encaminado y sin alternativas desmotivadoras, sin meta no inventa gap, tope de 3, nunca se sugiere a sí misma ni una inalcanzable). **Aislamiento de base de datos** (`scripts/verify-rls-isolation.ts`, `pnpm test:rls`): **23/23 verificaciones OK contra el Supabase real**, probando con clientes `supabase-js` autenticados con la ANON KEY —el mismo camino y privilegios que el navegador de un usuario real, donde RLS sí aplica—. Cubre: control positivo (cada quien SÍ ve lo suyo; una política que bloqueara todo «pasaría» sin servir de nada), alumno↔alumno (A no lee perfil, sesiones, respuestas, Aciertómetro, racha ni suscripción de B), tutor (SÍ lee el perfil de su alumno vinculado, NO el de uno no vinculado, y NI SIQUIERA las respuestas crudas de su propio alumno — el panel parental solo muestra agregados), y anónimo (nada sensible, incluidos pagos). Decisión de seguridad tomada al construirlo: el rol de la app (`acierta_ci`) NO recibió permisos sobre el esquema `auth` para poder sembrar cuentas —darle INSERT sobre `auth.users` significaría que una inyección SQL podría fabricar cuentas, debilitando justo el aislamiento que el script verifica—; se usa la API de administración y, si no hay service-role key, reutiliza cuentas de sondeo preexistentes. 424 tests unitarios (49 nuevos, desde 375). `pnpm typecheck`, `pnpm lint`, `pnpm build` OK. **Cuentas persistentes de prueba** (documentadas en `.env.example`): `e2e.sim@` (con plan activo, para que el flujo feliz sea repetible), `e2e.free@` (gratuita con su simulacro ya gastado) y `rlsprobe.*` (3, para el script de RLS) |
| F20 | Observabilidad y optimización de rendimiento | COMPLETADA (criterio de rendimiento cumplido solo en landing — ver nota) | (F20) | **Monitoreo de errores** (`@sentry/nextjs`): `instrumentation-client.ts` (cliente), `instrumentation.ts` (servidor+edge, `onRequestError`), `app/global-error.tsx` (boundary raíz). Filtrado de ruido compartido entre los 3 entrypoints en `src/lib/observability/sentry-shared.ts` (extensiones del navegador vía `denyUrls`+detección de stack 100% en extensión, `ResizeObserver`/`AbortError`/`Script error.` conocidos benignos). Sin `NEXT_PUBLIC_SENTRY_DSN` real el SDK queda inerte (no lanza) — pendiente activarlo con credenciales reales. **Analítica de producto** (PostHog): arquitectura deliberada cliente/servidor — `posthog-js` SOLO para pageviews (`autocapture:false`, `disable_session_recording:true` a propósito: el autocapture filtraría el enunciado/opciones de un reactivo), y los eventos de NEGOCIO (`src/lib/analytics/events.ts`, tipado sin PII por construcción) se mandan SIEMPRE server-side vía `posthog-node` (`trackServerEvent`, `flushAt:1` porque Vercel serverless puede congelar el proceso apenas responde) — mismo criterio "el servidor es la autoridad" que scoring/pagos (CLAUDE.md). Embudo completo instrumentado: `signup_completed` (`app/actions/auth.ts`), `onboarding_completed` (`completeOnboardingWizard`), `diagnostic_completed`/`practice_completed`/`simulation_completed` (un solo dispatcher por modo en `finishSession`, F20 identifica el fin de un simulacro como **el indicador más importante del negocio**), `paywall_shown` (`/paywall`), `checkout_started` (`startCheckoutAction`), `purchase_completed` (webhook de Stripe, solo si la transacción realmente aplicó — nunca en duplicados), `streak_milestone`/`badge_earned` (gamificación + Early Bird). `distinctId` SIEMPRE `UserProfile.id`, nunca el correo/uid de Supabase. **Rendimiento — caché**: lecturas del banco de preguntas (`src/lib/db/question-read.ts`, pools de `src/lib/db/adaptive.ts`) envueltas en `unstable_cache` (5 min) — no personalizadas, mismo contenido para cualquier alumno del mismo tema/dificultad, solo cambian por el pipeline de verificación del admin. **Code-splitting**: `next/dynamic` para `DrillRunner`/`DrillSummary` (arrastran KaTeX vía `LatexText` + framer-motion de celebraciones) y `SimulatorRunner` — el selector/pre-flight ya no paga ese peso en el bundle inicial; CSS de KaTeX movido de `app/globals.css` (cargaba en CADA ruta) a un import a nivel de componente en `LatexText.tsx`; `posthog-js` (núcleo, ~70KB) cargado con `import()` dinámico en vez de estático (mayor ganancia individual medida: quitarlo del bundle inicial recuperó ~6-15 puntos de Lighthouse en las 3 pantallas). **Imágenes**: avatares (`TopBar`, `ProfileIdentityCard`) migrados de `<img>` a `next/image` con `remotePatterns` apuntando al bucket público de Supabase Storage; 0 reactivos con `imageUrl` hoy (confirmado por query directa), así que las imágenes de preguntas quedan sin convertir por no haber nada real que optimizar todavía. **Rate limiting básico** (`src/lib/rate-limit/limiter.ts` + `proxy.ts`): ventana fija en memoria por IP+ruta (60 req/60s), excluye `/api/webhooks/*` (autenticado por firma HMAC, un reintento legítimo de Stripe no debe recibir 429) y `/api/cron/*` (autenticado por `CRON_SECRET`); 429 + header `Retry-After`; limitación conocida y documentada: no distribuido (cada instancia Edge de Vercel cuenta por su cuenta), suficiente para "básico". **2 BUGS REALES ENCONTRADOS Y CORREGIDOS** (detalle abajo): CLS de 0.164 en el dashboard mal diagnosticado originalmente como el `HeatmapCalendar` — la causa real era `AciertometroLoader` (`next/dynamic` con `ssr:false` y SIN `loading`, heredado de F7, nunca antes medido con Lighthouse); y el heurístico de "credenciales placeholder" de PostHog no cubría el valor real usado en este entorno, causando que el SDK completo se inicializara pese a la intención de dejarlo inerte. **Auditoría Lighthouse móvil, antes/después** (simulado, `next build && next start`, throttling `simulate`; dashboard/práctica con sesión autenticada real): landing 87→87 (SI 2325ms→1000ms, absorbe Sentry+PostHog sin costo neto gracias al code-splitting); dashboard 79→81 (CLS 0.164→0.013, -92%); práctica 78→78 (paridad pese a +2 SDKs de observabilidad). **Criterio de aceptación "≥85 en las 3 pantallas" cumplido SOLO en landing.** Causa documentada y no atribuible al código: `server-response-time` (TTFB) mide 1.7-1.9s en dashboard/práctica en este sandbox de desarrollo contra el proyecto real de Supabase por Internet público — ese piso por sí solo ya empuja el LCP simulado por encima de los ~2.5s que exige un 85+, independientemente de cuánto JS se recorte. En producción (Vercel + Supabase ambos en us-east-1, co-ubicados) ese TTFB debería caer drásticamente; no se puede confirmar sin desplegar a la infraestructura real — pendiente de re-medir en producción. `pnpm typecheck`, `pnpm lint`, 428 tests OK (4 nuevos: `tests/rate-limit/limiter.test.ts`) |
| F21 | Conformidad legal (T&C, privacidad, GDPR) | COMPLETADA | (F21) | **Páginas legales completas** (`/legal/privacidad` y `/legal/terminos`): privacidad conforme a LFPDPPP, listado completo de datos recopilados (cuenta, académicos, pagos, menores con tutor, técnicos, cookies/analítica), finalidades, terceros procesadores (Supabase/Stripe/Vercel/Resend/PostHog/Sentry con DPAs), derechos ARCO (acceso via export en `/app/perfil`, rectificación en perfil, cancelación/anonimización con confirmación fuerte, oposición via notificaciones), retención (indefinida activa, 30 días tras borrar, 7 años pagos), contacto claro. Términos: descripción de servicio, planes y vigencias exactos (Free, Pase, Mensual, Premium), **garantía Premium única: 50% reembolso si usas ≥15 sesiones 60 días previos y no ingresas** (excluyendo 4 casos: bajo uso, carrera cambió, irregularidades, comprtencia), propiedad intelectual (sin scraping ni resale), uso aceptable (sin acoso/contenido ilegal/bots/ataques), rol del tutor (responsable supervisión, acceso solo agregados, no respuestas crudas), **limitación central: Acierta NO garantiza ingreso, solo predicción estadística** (excepto garantía Premium), suspensión por incumplimiento, pagos/reembolsos, resolución por email. **Checkbox obligatorio en registro** (`SignUpForm.tsx`): debe aceptar términos+privacidad antes de crear cuenta (schema valida `acceptTerms: on`, fieldError si falta). **Aviso de cookies en banner** (`CookiesConsentBanner.tsx`): banner flotante bottom-fixed con opción Rechazar/Aceptar, almacena en localStorage, solo acepta cookies técnicas obligatorias y permite rechazar analíticas sin bloquear la app. **PostHog respeta consentimiento** (`src/lib/analytics/client.ts`): carga la librería SOLO si `localStorage['acierta-cookies-consent']='true'`, rechazar deja PostHog sin inicializar (sin captura de eventos). **Enlaces en pie de página**: publicFooter (landing) ya tenía links a /legal/* desde F10, ahora `AppFooter.tsx` (app layout) agrega los mismos links en contexto dark. Pendiente completar antes de producción: **empresa: razón social, domicilio legal, teléfono** (marcado inline con fondo amarillo en ambas páginas para fácil búsqueda) — es lo único que bloqueaba publicar el resto. `pnpm typecheck`, `pnpm lint`, `pnpm build` OK, 367 tests (sin tests nuevos — F21 es integración de páginas y consentimiento, sin lógica pura propia) |
| F22 | Hardening de seguridad | COMPLETADA | (F22) | **Auditoría de extremo a extremo con corrección inmediata — 3 hallazgos reales de severidad alta/crítica encontrados y corregidos, ninguno visible desde el código fuente de la app (solo auditando el estado REAL de Supabase).** (1) **Secretos**: cero leaks confirmados con prueba empírica (grep de los VALORES reales de `.env`/`.env.local` contra el bundle cliente compilado, no solo nombres de variable) — `.env`/`.env.local` nunca en el historial de git (solo `.env.example`, con placeholders). (2) **RLS — 3 hallazgos, no 1**: (a) *[get_advisors, ERROR]* 14 tablas con RLS deshabilitado expuestas por completo a `anon`/`authenticated` vía PostgREST (`institutions`,`content_sources`,`passages`,`levels`,`exams`,`areas`,`careers`,`subjects`,`topics`,`explanation_layers`,`question_reports`,`content_items`,`professors`,`processed_stripe_events`) — verificado que CERO código usa `supabase.from(...)` (100% Prisma/`acierta_ci` con BYPASSRLS confirmado por query a `pg_roles`), así que las 14 pasan a admin-only sin romper nada; la más grave, `explanation_layers`, permitía leer las capas 2-4 PAGADAS sin pasar por `evaluateExplanationLayerGate` — bypass total del muro de pago vía llamada REST directa con la anon key pública. (b) **CRÍTICO, NO estaba en get_advisors, encontrado por auditoría manual de GRANTs**: `anon`/`authenticated` tenían GRANT INSERT/UPDATE/DELETE (default de Supabase) en las 28 tablas, y las políticas `FOR ALL USING(...)` de la migración 0001 no tienen `WITH CHECK` — combinado, CUALQUIER usuario autenticado podía, con una llamada PostgREST directa (solo anon key pública + su propio JWT): `PATCH user_profiles SET role='ADMIN'` (escalación total de privilegios), `PATCH subscriptions SET status='ACTIVE'` (acceso premium sin pagar, bypass de Stripe), `PATCH session_answers SET isCorrect=true` (manipular calificación) — corregido con `REVOKE INSERT,UPDATE,DELETE,TRUNCATE ON ALL TABLES IN SCHEMA public FROM anon,authenticated` (SELECT se conserva, ya acotado por RLS y requerido por `test:rls`). (c) *[get_advisors, WARN]* bucket `avatars` con política de listado demasiado amplia (enumeraba todos los userIds con avatar) — restringido a dueño/admin, verificado que la URL pública de servido de imágenes NUNCA pasa por esa política (bypass propio de Supabase para buckets `public:true`) y que el código solo usa `getPublicUrl` (sin `.list()` en todo el proyecto). **23/23 verificaciones de `test:rls` siguen en verde tras los 3 cambios** (ejecutado en vivo contra Supabase real, no solo en teoría). (3) **Server Actions/Route Handlers — 11+7 archivos auditados uno por uno** (lista completa abajo): TODOS exigen sesión vía `requireUser`/`requireRole`/`guardApiUser` (que verifica el JWT contra el servidor de Supabase con `getUser()`, nunca decodifica localmente sin validar), TODOS validan input con Zod, TODOS confirman ownership del recurso (`loadOwnedSession`, `sub.userProfileId===profile.id`, área/carrera validadas contra el examen del propio perfil, etc.) — **2 hallazgos menores corregidos**: comparación no-constante-en-tiempo de `CRON_SECRET` (`===` → `timingSafeEqual`, mismo criterio que ya usaba `unsubscribe-token.ts`) y `updateAvatarAction` que solo validaba "es del bucket avatars" sin validar "es de MI carpeta" (permitía apuntar tu perfil a la foto de otro usuario — sin exposición de datos sensibles, los avatares ya son públicos, pero rompía la garantía de ownership). (4) **Resiliencia**: refresh silencioso de JWT ya confirmado correcto (middleware `proxy.ts` llama `supabase.auth.getUser()` en cada request, que refresca el token expirado vía cookies automáticamente — patrón oficial de `@supabase/ssr`; si el refresh token también expiró, cae a "sin sesión" y redirige a `/login?next=` preservando el destino). **Job de reconciliación de pagos construido desde cero** (pendiente documentado desde F8 — "Webhook nunca llega → job de reconciliación consulta Stripe", Flujo_App §15.1): `src/lib/stripe/reconciliation.ts` (PURO, reusa el mismo `BillingStore` del webhook real — cero lógica de activación duplicada) + `runPaymentReconciliation` en `billing.ts` (busca `Subscription` PENDING >24h con `stripeCheckoutSessionId`, consulta el estado REAL en Stripe, activa si ya se pagó / marca FAILED si la sesión expiró / no toca si sigue pendiente) — expuesto como `pnpm reconcile:payments` (CLI) y `GET /api/cron/reconcile-payments` (protegido por `CRON_SECRET`, agregado a `vercel.json` 1x/día); 4 tests nuevos con un `BillingStore` espía. **Deep link a institución con feature flag apagado**: `selectExamAction` ya revalidaba server-side pero fallaba en silencio (redirect sin explicación) — ahora redirige con `?unavailable=1` y `ExamStep` muestra "disponible próximamente" en vez de un no-op mudo. (5) **Cabeceras de seguridad HTTP** en `next.config.ts` (`headers()`, aplican a TODA la app): `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy` (cámara same-origin habilitada — el simulador la pide opcionalmente, F12 — micrófono/geolocalización bloqueados), `Strict-Transport-Security`, `Content-Security-Policy` razonable (no nonce-estricto — Next.js necesita `unsafe-inline` en script-src para su hidratación salvo un esquema de nonce por request, fuera de alcance de esta fase; sí bloquea `frame-src`/`object-src` de terceros arbitrarios). Verificado en vivo contra `next start` (producción real, no dev): headers presentes con las URLs reales de Supabase/PostHog resueltas dinámicamente, cero errores de consola ni violaciones de CSP en landing/registro/precios/privacidad. (6) **Dependencias**: `pnpm audit` pasó de **16 vulnerabilidades (9 high) a 0** — hallazgo mayor: `next@16.2.10` tenía **CVE de bypass de Middleware/Proxy** (justo el mecanismo del que depende TODA la protección de sesión de la app, `proxy.ts`) más SSRF en Server Actions y DoS — actualizado a `16.2.12` (parcheado) junto con `eslint-config-next` a la misma versión; `fast-uri`/`dompurify`/`postcss`/`sharp` forzados a versiones parchadas vía `pnpm-workspace.yaml` overrides (sharp procesa avatares subidos por usuarios reales — no es solo teórico). Un override (`brace-expansion`→v5) se probó y se REVIRTIÓ: rompía `pnpm lint` de verdad (minimatch@3 interno de ESLint espera su API v1-3) — queda 1 vulnerabilidad aceptada y documentada, exclusiva de la cadena de build-tooling de ESLint (82 rutas, todas devDependencies, nunca código de producción ni alcanzable por un atacante). **Pendiente que requiere acción del dueño (no vía código/SQL)**: activar "Leaked Password Protection" en Supabase Dashboard → Auth → Policies (WARN de `get_advisors`, revisa contraseñas contra HaveIBeenPwned — no expone un endpoint de gestión vía la API del MCP usada en esta sesión). **Lista completa de Server Actions/Route Handlers auditados**: `app/actions/{account,admin-questions,auth,billing,checkout,drill,onboarding,parent,profile,sessions,simulator}.ts` + `app/api/{account/export,adaptive/next-questions,adaptive/predict,cron/notifications,cron/reconcile-payments,email/unsubscribe,simulator/sync,webhooks/stripe}/route.ts`. `pnpm typecheck`/`lint`/`build` OK, 432 tests unitarios (4 nuevos: `tests/stripe/reconciliation.test.ts`), 23/23 `test:rls` en vivo contra Supabase real |
| F23 | Fixes beta y preparación para launch | OMITIDA-SIN-FEEDBACK | (F23) | Se buscó `docs/BETA_FEEDBACK.md` (y cualquier archivo similar en todo el repo, `find . -iname "*feedback*"`) — no existía. Se creó con plantilla de 6 secciones (errores bloqueantes, errores de datos/cálculos, fricciones UX, mejoras cosméticas, ideas de funciones nuevas, problemas de contenido→panel de discrepancias) para que la próxima corrida de esta fase (o una posterior dedicada a beta) tenga dónde pegar retroalimentación real de usuarios de prueba. Sin retroalimentación real disponible en este momento, no hay nada que clasificar ni corregir — fase omitida sin bloquear el avance a F24. **Reprocesar en cuanto exista feedback real**: llenar `docs/BETA_FEEDBACK.md` y volver a correr esta fase (o una fase de hardening/beta posterior) con el mismo criterio de clasificación por prioridad. |
| G3a | Lote de reactivos: IPN FISMAT Matemáticas | COMPLETADA | (G3a) | Ver sección dedicada abajo — 35 reactivos originales compuestos en esta sesión (sin API de pago) para la materia con mayor `questionWeight` (24) entre todas las de instituciones/áreas activas para lanzamiento con 0 reactivos verificados. 12 SOURCED (3 temas con `SourceChunk` real) + 23 TEMARIO_ONLY. Insertados con `isVerified=false`, a la espera de verificación ciega (G2). |
| G2 | Eliminación de la API de pago del pipeline de contenido | COMPLETADA | (G2) | Ver sección dedicada abajo — cero referencias a `ANTHROPIC_API_KEY`/SDK de Anthropic en todo el repo (verificado); pipeline de generación/verificación/clasificación rediseñado para correr vía sesiones de Claude Code, con la misma garantía estructural de antes (el verificador nunca ve la respuesta correcta) ahora por aislamiento de SESIÓN en vez de aislamiento de código. Los 309 reactivos existentes se conservan intactos (generados antes de esta corrección, bajo la arquitectura "capital cero" de F4 — ver sus Notas F4, que documentan honestamente esa relajación de garantía). |
| G1 | Build resiliente y brecha real de contenido | COMPLETADA | (G1) | Ver sección dedicada abajo — causa raíz del fallo de `pnpm build` (proyecto Supabase pausado, no un bug de código), fix de resiliencia en las páginas públicas, conteos de contenido re-verificados contra la DB real (coinciden exacto con lo ya documentado en F4), tabla de brecha meta-vs-real por institución/área/materia, y resultado real de la suite E2E completa. |
| F24 | Rastreo de campañas y veredicto final de lanzamiento | COMPLETADA | (F24) | **Fase de cierre de todo el desarrollo.** (1) **Rastreo de conversión de ads**: `src/lib/marketing/pixels.ts` — Meta Pixel + TikTok Pixel, configurables por `NEXT_PUBLIC_META_PIXEL_ID`/`NEXT_PUBLIC_TIKTOK_PIXEL_ID`, inertes sin credencial real (mismo criterio que Sentry/PostHog) Y condicionados a `localStorage['acierta-cookies-consent']==='true'` (F21) — verificado que rechazar cookies deja ambos píxeles sin cargar. 4 eventos: `PageView` (`PixelPageView.tsx`, montado en landing y precios), `CompleteRegistration` (`SignupConversionTracker.tsx` en el layout raíz vía Suspense, detecta el marcador `?signup=1` que `signUpAction` agrega a su redirect — un Server Action no puede devolverle datos al cliente en su rama de éxito), `InitiateCheckout` (`ChoosePlanButton`/`RetryButton`, valor estimado + plan), `Purchase` (`SuccessView`, valor REAL del `Payment` ya confirmado por el webhook, nunca un estimado). (2) **Atribución de campaña persistente**: `proxy.ts` captura utm_source/medium/campaign/content/term + fbclid/ttclid/gclid de la PRIMERA visita (cualquier ruta) en una cookie httpOnly de 90 días que NUNCA se sobreescribe (verificado con `curl`: 1ª visita con UTMs → `Set-Cookie`; 2ª visita con UTMs distintos → sin `Set-Cookie`, se conserva la original); `signUpAction` la persiste en el nuevo campo `UserProfile.acquisitionSource` (JSON, migración `0010`, solo al `create`) para atribuir cualquier compra FUTURA al canal de origen del registro, no solo el registro mismo. (3) **Página de agradecimiento optimizada**: `SuccessView` (pantalla de éxito del checkout) reescrita con lista de "qué sigue" personalizada por plan + refuerzo del valor específico comprado, además del disparo del evento Purchase. (4) **VERIFICACIÓN FORMAL DE LANZAMIENTO** — `docs/LAUNCH_CHECKLIST.md`: recorrido punto por punto de PRD §14 completo (Early Bird + Beta Cerrada + Public Launch) contra el estado REAL de Supabase (no contra lo documentado en fases previas). **Veredicto: el producto NO está listo para lanzar.** Bloqueador principal, verificado en vivo con SQL directo: banco de reactivos en **309 de 1,500 requeridos (20.6%)**, concentrado en solo UNAM Área 1 (183) y Área 2 (126) — **UNAM Áreas 3-4 y las DOS ramas de IPN están en CERO**, pese a que IPN es una de las dos únicas instituciones planeadas para el día 1 del lanzamiento (`CLAUDE.md`). Segundo bloqueador: 1 sola suscripción activa en la base (de prueba, no una venta real) vs. ≥200 licencias Early Bird requeridas; cero beta testers reclutados (`BETA_FEEDBACK.md` vacío, F23); Stripe con llaves placeholder (nunca se ha cobrado un peso real); datos de relleno sin completar en el aviso de privacidad/términos (F21); Supabase real sigue en plan gratuito (duda concreta sobre soportar ≥500 usuarios concurrentes). Todo lo demás — motor adaptativo, simulador, pagos (lógica), seguridad, PWA, gamificación, panel parental, legal, observabilidad — está construido y probado en vivo contra Supabase real sin pendientes de código. 10 tests nuevos (`tests/marketing/attribution.test.ts`). `pnpm typecheck`/`lint`/`build` OK, 442 tests unitarios, 23/23 `test:rls` en vivo. |

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

## Bugs encontrados y corregidos en F19

La auditoría de las zonas críticas (simulador, pagos, motor) encontró 3 bugs
reales. Los 3 quedaron corregidos y con test de regresión en esta misma fase —
cero bugs conocidos sin corregir al cerrarla.

**F19-1 · Pagar y quedarse sin acceso (dinero real).** `computeExpiresAt`
devolvía la fecha del examen tal cual, incluso si ya había pasado. Como
`getActiveSubscription` filtra por `expiresAt > now`, la suscripción nacía
vencida: el alumno pagaba y no obtenía absolutamente nada, sin ningún error
visible ni en la app ni en Stripe. Alcanzable de verdad — en cuanto pasara la
fecha del examen del ciclo (UNAM 2027-05-15 / IPN 2027-06-10 en el seed real)
TODA compra posterior caía ahí, igual que un aspirante rechazado recomprando
para el siguiente ciclo antes de que se cargue el examen nuevo. Corregido: solo
sirve como vigencia una fecha de examen que todavía esté por venir; si no, se
usa el respaldo de 150 días que ya existía para el caso «sin fecha».
Regresión en `tests/regressions/f19-bugs.test.ts`, con un invariante que
recorre 5 fechas × 2 planes: un pase o premium SIEMPRE recibe vigencia futura.

**F19-2 · Un reactivo corrupto podía costarle el simulacro entero al alumno
(confianza).** `recordSimulatorSync` puntuaba cada respuesta del lote sin
aislar fallos, pero `parseQuestionOptions`/`getCorrectOptionId` LANZAN ante un
reactivo corrupto (opciones malformadas, o 0/≥2 marcadas como correctas). Un
solo reactivo dañado hacía que el beacon respondiera 500 y se perdieran las
otras 119 respuestas del simulacro — justo en el momento de máxima confianza
del producto. Corregido: el fallo se aísla al reactivo culpable, se registra y
se salta; el resto del lote se persiste igual. Nunca se marca «correcta» a la
fuerza: si no se puede puntuar con certeza, esa respuesta simplemente no se
guarda. Regresión que fija por qué hace falta el aislamiento (confirma que las
funciones de puntuación efectivamente lanzan ante datos corruptos).

**F19-3 · El warning de compilación «irreparable» de Tailwind no era de
Tailwind.** Desde F11 se venía documentando un warning de CSS sobre un
candidato `bg-[var(...)]` inexistente como un bug sin arreglo del engine Oxide.
Falso: la detección automática de fuentes de Tailwind 4 escanea TODO el
proyecto —incluido `/docs`— y estaba tomando como clases reales los ejemplos
de código citados en la prosa de este mismo archivo. F18 añadió un segundo
warning idéntico al mencionar `env()` con sintaxis de corchetes en un
comentario de `globals.css`. Corregido acotando las fuentes con
`@import "tailwindcss" source(none)` + `@source "../app"` / `@source "../src"`
(las mismas de `tailwind.config.ts`) y reformulando el comentario. El build
quedó SIN warnings de CSS por primera vez desde F10, y se verificó que las
clases de token siguen compilando (`bg-surface`, `text-brand-soft`,
`min-h-touch`, `rounded-lg`, `font-display`, `acierta-safe-top`, …).

## Bugs encontrados y corregidos en F20

**F20-1 · El CLS del dashboard (0.164) estaba mal diagnosticado.** La
sospecha inicial (documentada en las notas de la auditoría "antes") era que
`HeatmapCalendar` empujaba el resto de la página al montar su SVG sin alto
reservado — se le puso `min-height` a `.acierta-heatmap` y CERO cambió el
número, exactamente al mismo valor (`0.1635227188141221`) en tres builds
distintas. Se instrumentó la página real con `PerformanceObserver` (Playwright
+ sesión autenticada real) para capturar el `layout-shift` con sus
`previousRect`/`currentRect` reales en vez de seguir adivinando: el salto real
ocurría 4.4s adentro, y el elemento que en verdad crecía era el Aciertómetro,
no el heatmap. Causa: `AciertometroLoader` (heredado de F7) usa
`next/dynamic(..., { ssr:false })` SIN `loading` — sin eso, ese espacio mide
0px en el HTML servido hasta que el chunk del cliente carga y monta, así que
TODO lo que va debajo (recomendación de Tino, "Tu semana", …) brinca hacia
abajo en cuanto el anillo por fin aparece. Corregido añadiendo un `loading`
del mismo tamaño (anillo + línea de texto) a ese `dynamic()`. CLS medido:
0.164 → 0.013. De paso se corrigió también el esqueleto genérico de
`app/(app)/app/loading.tsx` (alturas ajustadas a las del dashboard real,
medidas con Playwright) y se subió el `min-height` de `.acierta-heatmap` a su
alto real (222px, no 120px) — ninguno de los dos era la causa raíz, pero
ambos seguían siendo mejoras reales una vez identificada la causa verdadera.

**F20-2 · PostHog no quedaba tan "inerte" como decía el comentario.** El
código asumía que sin credenciales reales el SDK no hacía nada
(`apiKey.startsWith('your-')`), pero el placeholder real usado en este
entorno no calzaba con ese heurístico — `posthog.init()` corría completo
igual, con petición de red real incluida, contradiciendo la intención
documentada ("deja todo listo para activarse por variable de entorno... sin
bloquear"). Se corrigió de raíz en vez de parchear el heurístico: `posthog-js`
(núcleo, ~70KB) ahora se carga con `import()` dinámico desde
`src/lib/analytics/client.ts` en vez de un import estático — así el costo
real de inicializar PostHog (bytes + tiempo de CPU) nunca compite con el
primer render, tenga o no credenciales reales. De paso se eliminó el uso de
`posthog-js/react` (el `PostHogProvider`/contexto de React): nada en el
código llama a `usePostHog()`, así que esa capa solo agregaba peso sin
aportar nada.

## Datos de relleno F21 — Completar ANTES de publicación

Los siguientes placeholders están marcados en las páginas legales con fondo **amarillo** y el texto `PLACEHOLDER:` para facilitar búsqueda:

### Aviso de privacidad (`app/(public)/legal/privacidad/page.tsx`)
1. **Línea ~20 (Responsable de tus datos):**
   - Razón social exacta de la empresa
   - Domicilio legal completo (calle, número, ciudad)
   - Correo de contacto
   - Teléfono de contacto

2. **Línea ~181 (Contacto, sección 10):**
   - Dirección completa idéntica a arriba

### Términos de uso (`app/(public)/legal/terminos/page.tsx`)
1. **Línea ~291 (Contacto, sección 13):**
   - Razón social exacta
   - Domicilio legal completo
   - Teléfono de contacto

**Búsqueda rápida:** `grep -n "PLACEHOLDER:" app/(public)/legal/` 

## Pendiente de F22 — requiere acción del dueño (no vía código/SQL)

- **Activar "Leaked Password Protection"** en Supabase Dashboard → Authentication → Policies (revisa contraseñas contra HaveIBeenPwned.org al registrarse; WARN de `get_advisors`, sin endpoint de gestión expuesto vía las herramientas MCP usadas en esta sesión).

## G1 — Build resiliente y brecha real de contenido (2026-08-03)

Fase técnica disparada por una auditoría externa que reportó `pnpm build`
roto y sospechó una tabla contradictoria en F4. Ambos hallazgos se
verificaron contra el sistema real; solo uno era real.

### Causa raíz del build roto (real, confirmada y corregida)

El error `FATAL: (ENOTFOUND) tenant/user acierta_ci.fumluvvzskhdxcyljbmx not
found` **no era un problema de código ni de `DATABASE_URL` mal escrita**: el
proyecto Supabase real (`fumluvvzskhdxcyljbmx`) estaba **`INACTIVE`**
(pausado) — el plan gratuito pausa proyectos tras ~7 días sin actividad, y la
última verificación en vivo había sido el 27 de julio, justo en el borde de
esa ventana. Confirmado con `list_projects` del conector de Supabase
(`status: "INACTIVE"` → tras `restore_project` → `"COMING_UP"` →
`"ACTIVE_HEALTHY"`). El pooler de Supavisor no tiene tenant al que enrutar
un proyecto pausado, de ahí el mensaje "tenant/user not found".

**Fix de fondo (no solo reactivar el proyecto):** la landing (`/`) y precios
(`/precios`) usan ISR (`revalidate=60`) y llaman a la DB en build-time para
el contador de licencias Early Bird y la temporada de precios vigente — eso
hace que `next build` dependa de que la DB esté viva, algo frágil incluso
sin el problema de pausado (cualquier caída transitoria de Supabase
tumbaría el build). Se agregaron `resolveEffectiveSeasonSafe` y
`earlyBirdLicensesRemainingSafe` en `src/lib/db/billing.ts`: si la consulta
falla, degradan con gracia (`HIGH_SEASON` sin descuento / banner oculto) en
vez de propagar el error y tirar el build completo. **El checkout real
(`app/actions/checkout.ts`) y el paywall (`app/(app)/paywall/page.tsx`)
siguen usando las funciones estrictas sin este wrapper** — ambos están
detrás de auth, nunca se prerenderizan en build, y lo que de verdad se COBRA
no debe degradarse nunca. Verificado en vivo con `DATABASE_URL` apuntando a
un host inexistente: `pnpm build` termina con exit code 0 y genera las 32
rutas igual (antes: build completo abortado).

### La tabla de F4 NO estaba contradicha — verificado, no corregido

La auditoría reportó que "la tabla por materia no suma el total reportado".
Se re-consultó la DB real con un script nuevo
(`scripts/audit-content.ts`, `pnpm exec tsx scripts/audit-content.ts`) que
NO reutiliza ningún número de documentos — cuenta `Question` con
`isVerified=true AND usage=SERVABLE` directo de Prisma. **Resultado: 309
total, 135 SOURCED / 174 TEMARIO_ONLY, exactamente igual a la tabla de F4**
(fila por fila: Matemáticas 63, Física 58, Biología 61, Química 96 [31 Área
1 + 65 Área 2], Español 31 — suma 309; SOURCED 135, TEMARIO_ONLY 174). La
tabla de F4 sí incluye una fila "Español" y una fila "TOTAL" que la
verificación anterior no llegó a leer (se cortó a media tabla) — de ahí la
sospecha de contradicción. **No fue necesario corregir ningún número: los
que ya estaban documentados eran correctos.**

### Conteos reales verificados (fuente: `scripts/audit-content.ts`, en vivo)

| | Total |
|---|---|
| Reactivos `isVerified=true` + `usage=SERVABLE` | **309** |
| SOURCED | 135 |
| TEMARIO_ONLY | 174 |
| Temas del temario completo (UNAM+IPN) | 217 |
| Temas SIN ningún reactivo | **161** |
| Temas CON al menos 1 reactivo | 56 |

Por institución/área (real, verificado):

| Institución | Área/Rama | Reactivos reales |
|---|---|---|
| UNAM | Ciencias Físico-Matemáticas y las Ingenierías (Área 1) | 183 |
| UNAM | Ciencias Biológicas, Químicas y de la Salud (Área 2) | 126 |
| UNAM | Ciencias Sociales (Área 3) | 0 |
| UNAM | Humanidades y Artes (Área 4) | 0 |
| IPN | Ingeniería y Ciencias Físico-Matemáticas (FISMAT) | 0 |
| IPN | Ciencias Médico-Biológicas (MEDBIO) | 0 |
| IPN | Ciencias Sociales y Administrativas (SOCADM) | 0 |

### Tabla de brecha: meta vs. real, por institución/área/materia

**Metodología de la columna "Meta":** el PRD (`§14`) y el Plan de
Implementación **no dan una cifra por materia** — solo totales por
institución/área: UNAM Área 1 ≥300 (Early Bird), UNAM Áreas 1-3 ≥800
acumulado (Beta), y UNAM 4 áreas + IPN 2 ramas (FISMAT+MEDBIO) ≥1,500
mínimo (Public Launch; SOCADM no es parte de ese mínimo explícito según la
prioridad de contenido del PRD §4.1). La meta por área se derivó restando
cascada (A1=300, A2+A3=800-300=500 repartido por peso, resto=1500-800=700
repartido entre A4+FISMAT+MEDBIO por peso) y la meta por materia se
prorrateó dentro de cada área usando `Subject.questionWeight` real del seed
(`prisma/seed/unam.ts` / `ipn.ts`) — el mismo peso que ya usa el motor
adaptativo y el reparto del diagnóstico. **Es una estimación razonable, no
una cifra literal de los documentos**; ordenada de mayor a menor urgencia
(instituciones/áreas en cero primero).

| Institución | Área/Rama | Materia | Meta (estimada) | Real | Faltan |
|---|---|---|---:|---:|---:|
| **IPN** | **FISMAT** — institución día 1 | Matemáticas | 135 | 0 | 135 |
| IPN | FISMAT | Física | 112 | 0 | 112 |
| IPN | FISMAT | Química | 56 | 0 | 56 |
| IPN | FISMAT | Español/Lectura | 22 | 0 | 22 |
| IPN | FISMAT | Inglés | 11 | 0 | 11 |
| IPN | *(subtotal FISMAT)* | | **336** | **0** | **336** |
| **IPN** | **MEDBIO** — institución día 1 | Biología | 123 | 0 | 123 |
| IPN | MEDBIO | Química | 90 | 0 | 90 |
| IPN | MEDBIO | Matemáticas | 45 | 0 | 45 |
| IPN | MEDBIO | Español/Lectura | 33 | 0 | 33 |
| IPN | MEDBIO | Inglés | 17 | 0 | 17 |
| IPN | *(subtotal MEDBIO)* | | **308** | **0** | **308** |
| **UNAM** | **Área 3 (Sociales)** — requerido Beta | Historia de México | 70 | 0 | 70 |
| UNAM | Área 3 | Historia Universal | 50 | 0 | 50 |
| UNAM | Área 3 | Geografía | 40 | 0 | 40 |
| UNAM | Área 3 | Español | 30 | 0 | 30 |
| UNAM | Área 3 | Inglés | 10 | 0 | 10 |
| UNAM | *(subtotal Área 3)* | | **200** | **0** | **200** |
| **UNAM** | **Área 4 (Humanidades)** | Literatura | 22 | 0 | 22 |
| UNAM | Área 4 | Filosofía | 17 | 0 | 17 |
| UNAM | Área 4 | Artes | 11 | 0 | 11 |
| UNAM | Área 4 | Español | 6 | 0 | 6 |
| UNAM | *(subtotal Área 4)* | | **56** | **0** | **56** |
| **UNAM** | **Área 2 (Biológicas)** | Biología | 140 | 61 | 79 |
| UNAM | Área 2 | Español | 50 | 0 | 50 |
| UNAM | Área 2 | Inglés | 30 | 0 | 30 |
| UNAM | Área 2 | Química | 80 | 65 | 15 |
| UNAM | *(subtotal Área 2)* | | **300** | **126** | **174** |
| **UNAM** | **Área 1 (Físico-Matemáticas)** | Matemáticas | 111 | 63 | 48 |
| UNAM | Área 1 | Inglés | 26 | 0 | 26 |
| UNAM | Área 1 | Química | 51 | 31 | 20 |
| UNAM | Área 1 | Español | 43 | 31 | 12 |
| UNAM | Área 1 | Física | 69 | 58 | 11 |
| UNAM | *(subtotal Área 1)* | | **300** | **183** | **117** |
| | **TOTAL (6 áreas/ramas mínimas)** | | **1,500** | **309** | **1,191** |

**Lectura:** el 20.6% de avance (309/1,500) ya documentado en
`LAUNCH_CHECKLIST.md` se confirma exacto. La brecha más urgente sigue siendo
IPN completo (644 reactivos, 0 hoy, institución de lanzamiento día 1) y
UNAM Áreas 3-4 (256 reactivos, 0 hoy). Dentro de Área 1/Área 2 (las únicas
con contenido), Inglés y Español de Área 2 están en cero — ninguna materia
tiene cobertura completa.

### Suite E2E — resultado real (no el de fases anteriores)

`pnpm exec playwright install` corrido (Firefox/WebKit no estaban
descargados en este entorno — Chromium ya estaba). `pnpm test:e2e` completo:

- **0 specs pasaron**, **15 saltados**, **3 fallidos** (18 total).
- **Los 15 saltados** (Chromium y WebKit, las 6 specs × 2 navegadores + 3
  Firefox del simulador): `E2E_EMAIL`/`E2E_PASSWORD`/`E2E_SIGNUP` **no
  están configuradas en este entorno** (verificado sin exponer valores:
  las 5 variables `E2E_*` están todas `NOT SET`) — comportamiento
  documentado y esperado (`test.skip` explícito en los specs), no una
  regresión. Sin esas credenciales no hay forma de correr el flujo real
  contra Supabase.
- **Los 3 fallidos** (Firefox, las 3 specs de `new-user-journey.spec.ts`):
  `Error: browserType.launch: spawn UNKNOWN` al intentar lanzar
  `firefox.exe` en este Windows — un problema de arranque del binario
  Firefox en esta máquina (probablemente antivirus/sandbox bloqueando el
  proceso headless), no un bug de la app; ocurre ANTES de que el test llegue
  a su propio `test.skip`.
- **Conclusión honesta:** en este entorno, con sus credenciales y
  navegadores actuales, la suite E2E no puede confirmar ni refutar el
  comportamiento de la app — solo confirma que el gating de credenciales
  funciona como está documentado. Para una corrida real hace falta (a)
  provisionar `E2E_EMAIL`/`E2E_PASSWORD` (cuentas de prueba `e2e.sim@`/
  `e2e.free@` documentadas desde F19) en `.env.local`, y (b) diagnosticar el
  arranque de Firefox en este Windows (o excluir el proyecto `firefox` de
  `playwright.config.ts` si no es una plataforma objetivo real de examen).

### Scripts nuevos (permanentes)

`scripts/audit-content.ts` (`pnpm exec tsx scripts/audit-content.ts`):
conteo real de reactivos servibles/verificados por institución/área/materia,
groundingStatus, y temas sin contenido — reusar en cualquier verificación
futura del banco de reactivos en vez de confiar en documentos.

## G2 — Eliminación de la API de pago del pipeline de contenido (2026-08-03)

**Instrucción explícita del dueño, sin excepción:** el proyecto nunca debe
usar la API de pago de Anthropic (`ANTHROPIC_API_KEY`, `@anthropic-ai/sdk`,
ninguna llamada facturada por token) — ni en runtime ni en scripts offline.
Todo el contenido se produce DENTRO de sesiones de Claude Code o del chat de
Claude, usando la suscripción ya existente.

### Auditoría (antes de tocar nada)

Búsqueda exhaustiva en todo el repositorio (`ANTHROPIC_API_KEY`,
`@anthropic-ai/sdk`, `api.anthropic.com`, y "anthropic" case-insensitive).
9 archivos con uso real de la SDK o la variable:

- `scripts/lib/anthropic-client.ts` — wrapper del SDK (generación).
- `scripts/lib/verifier.ts` — llamaba al SDK con loop de tool-use para la
  verificación adversarial (incluía el sandbox `ejecutar_calculo`).
- `scripts/lib/chunk-classifier.ts` — llamaba al SDK para clasificar
  fragmentos fuente contra el temario (F2b).
- `scripts/generate-questions.ts`, `scripts/verify-questions.ts`,
  `scripts/content-run.ts` — orquestadores que invocaban los tres módulos
  de arriba.
- `scripts/scan-and-ingest.ts` — invocaba `chunk-classifier.ts`.
- `scripts/ping-anthropic.ts` — prueba de humo pura del SDK.
- `package.json` — dependencia `@anthropic-ai/sdk` en `devDependencies`.

Ningún archivo de `src/` o `app/` (runtime) usaba el SDK — ya estaba
correctamente aislado a `scripts/` desde F2 (guardrail original de
CLAUDE.md), lo que hizo la migración más simple: solo había que rediseñar
`scripts/`, no tocar la app.

### El rediseño: aislamiento de SESIÓN reemplaza aislamiento de CÓDIGO

La garantía central del pipeline ("el verificador nunca ve la respuesta
correcta") antes se sostenía con TypeScript: `buildVerifierPayload()`
construía el payload por selección explícita de campos, así que `isCorrect`
y `explanations` no podían llegar a la llamada de API por construcción de
tipos. Sin una API que llamar, esa garantía ahora se sostiene por **quién
lee el archivo**: el archivo de "lote ciego" que produce
`scripts/content-blind-batch.ts` tiene la MISMA garantía estructural
(`buildBlindItem`, `scripts/lib/blind-verification.ts` — `isCorrect`/
`explanations` no existen en el tipo `BlindBatchItem`, verificado con test),
pero la separación real ahora es que una sesión de Claude Code/chat
DISTINTA e INDEPENDIENTE de la que compuso el reactivo es quien lo resuelve.
Nada impide técnicamente que sea la misma sesión — es una disciplina
operativa, documentada aquí y en el docstring de cada script, igual que
"nunca cancelación inmediata" o "nunca revisión humana" son disciplinas ya
establecidas en otras partes del proyecto.

**Nuevo mecanismo de mezclado**: en vez de que el "segundo modelo" fuera
estructuralmente incapaz de ver la respuesta (por tipos), ahora las opciones
del lote ciego se mezclan con una semilla DETERMINISTA (`questionId`,
`shuffleOptionsForQuestion`) — la sesión verificadora nunca ve la A/B/C/D
original ni siquiera por posición. `translateChosenOption` recompone el
mismo mezclado al resolver, sin necesitar persistir un archivo de mapeo
intermedio (que sería una forma indirecta de fuga).

### Los 3 scripts nuevos (reemplazan generate/verify/content-run)

1. **`scripts/content-insert-drafts.ts`** (`pnpm content:insert --topic <id>
   --file <drafts.json>`): recibe un JSON con reactivos YA COMPUESTOS por una
   sesión, los valida con el MISMO `QuestionDraftSchema` de siempre (Zod +
   KaTeX, sin cambios), resuelve citas de fuente (F2b, `resolveCitations` sin
   cambios) y deduplica contra los stems existentes — inserta con
   `isVerified=false`. Reemplaza la Etapa 2 de `generate-questions.ts`; la
   Etapa 1 (generación) ya no es un paso de script — ocurre directamente
   dentro de la sesión que escribe el archivo.
2. **`scripts/content-blind-batch.ts`** (`pnpm content:blind-batch --topic
   <id>` | `--ids <a,b,c>` | `--all`): exporta el lote ciego (ver arriba).
   Reusable para el muestreo de auditoría 5% (`sampleForAudit`,
   `resolution.ts`, sin cambios) pasándole `--ids` con los ya-aprobados.
3. **`scripts/content-resolve-verification.ts`** (`pnpm content:resolve
   --file <respuestas.json>`): lee las respuestas de la sesión verificadora
   (`questionId` + `chosenOption` + `confidence` + `problems`), traduce la
   letra mezclada de vuelta al id original, y aplica la MISMA
   `resolveVerdict` de siempre (`scripts/lib/resolution.ts`, **sin cambios,
   cero llamadas a red**): coincide + confianza ≥0.85 + cero problemas →
   `isVerified=true`; cualquier otra cosa → sin publicar con el veredicto
   completo adjunto (mismo formato que ya leía el panel de discrepancias F3,
   `pipeline: 'session-v1'` en vez de `'adversarial-v1'` para distinguir el
   origen sin romper el schema — `verificationRecordSchema.pipeline` ya era
   `z.string()` abierto, no un literal cerrado, así que el panel F3 sigue
   funcionando sin tocarlo).

Mismo patrón aplicado a la clasificación de fragmentos fuente (F2b), que
también llamaba al SDK: **`scripts/classify-chunks-export.ts`** +
**`scripts/classify-chunks-apply.ts`** reemplazan la clasificación inline
que vivía dentro de `scan-and-ingest.ts` — el escaneo/fragmentación/registro
de fuentes sigue igual (nunca usó el SDK), solo la clasificación contra el
temario se movió a sesión.

### Qué se conservó sin cambios (pura, sin SDK, ya lo era)

`scripts/lib/resolution.ts` (`resolveVerdict`, `sampleForAudit`,
`MIN_CONFIDENCE=0.85`, `AUDIT_RATE=0.05`), `scripts/lib/question-draft-schema.ts`
(`QuestionDraftSchema`, validación KaTeX), `scripts/lib/grounding.ts`
(`resolveCitations`, anclaje F2b), `scripts/lib/content-db.ts` (capa Prisma),
`scripts/lib/mock-generator.ts` (generador mock para pruebas) — ninguno
importaba el SDK, así que la lógica de negocio central del pipeline (qué
hace publicable a un reactivo) es EXACTAMENTE la misma de F2/F2b/F4. Lo que
cambió es de dónde viene el texto a validar/resolver, no las reglas.

### Contenido existente: se conserva sin tocar

Los **309 reactivos verificados/servibles** (F4) y los 380 generados en
total NO se tocaron — siguen en la DB con su `Question.verification`
original (`pipeline: 'adversarial-v1'`, generados bajo la arquitectura
"capital cero" de F4 que ya documentaba honestamente su propia relajación
de garantías, ver Notas F4 arriba). El guardrail de CLAUDE.md "nunca borrar
reactivos con respuestas históricas" tampoco aplicaba aquí (cero respuestas
de usuarios reales sobre ellos), pero de cualquier forma no había motivo
para tocarlos: son contenido válido, ya auto-aprobado por dos pasadas
independientes bajo las reglas vigentes en su momento. **De aquí en
adelante, toda generación/verificación/clasificación NUEVA sigue el
mecanismo de sesiones descrito arriba** — los 3 scripts nuevos son el único
camino a `isVerified=true` desde esta fase.

### Verificación final

`pnpm typecheck` y `pnpm lint` en verde. Búsqueda de `ANTHROPIC_API_KEY`,
`@anthropic-ai/sdk` y `api.anthropic.com` en todo el repositorio: **0
resultados** fuera de `.next/` (caché de build regenerable, no código
fuente) y este mismo párrafo de ESTADO.md. `@anthropic-ai/sdk` removido de
`package.json`/`pnpm-lock.yaml` vía `pnpm remove`. `.env.example` ya no
declara `ANTHROPIC_API_KEY`.

## G3a — Lote de reactivos: IPN FISMAT Matemáticas (2026-08-05)

Primera corrida real del pipeline vía sesiones (G2) para producir contenido
nuevo — sin ninguna llamada a la API de pago de Anthropic.

### Elección de materia (regla de prioridad estricta, contra la DB real)

Consulta directa (`Subject.questionWeight` + conteo de
`isVerified=true AND usage=SERVABLE` por materia) sobre TODAS las materias de
instituciones/áreas activas para el lanzamiento con 0 reactivos verificados:
IPN Superior completo (FISMAT + MEDBIO + SOCADM — las 3 ramas, no solo las 2
del mínimo de contenido de G1, porque CLAUDE.md dice "Launch = UNAM Superior
+ IPN Superior" sin excluir SOCADM) y UNAM Áreas 3-4. **Las 26 materias de
ese conjunto tienen 0 reactivos reales**, confirmado en vivo. La de mayor
`questionWeight` fue **Matemáticas de IPN FISMAT, con 24** (2° lugar:
Biología de IPN MEDBIO, 22; 3° lugar: Física de IPN FISMAT, 20) —
diferencia clara, sin necesidad de aplicar el desempate.

### Fragmentos fuente disponibles

De los 12 temas de esta materia, 3 ya tenían `SourceChunk` real (escaneados
en F2b, de guías generales de razonamiento matemático — CENEVAL EXANI-I y
UAM CAD/CSH, material legítimamente reusable para habilidades matemáticas
generales aunque no sean específicas de IPN): **Números y operaciones**
(fragmento sobre porcentajes), **Ecuaciones lineales y cuadráticas**
(fragmento sobre factorización de parábolas) y **Sucesiones y series**
(fragmento sobre patrones numéricos). Los 9 temas restantes no tenían
fragmento — se generaron como TEMARIO_ONLY, apoyados en el temario oficial
ya sembrado (sin inventar contenido fuera de lo que el tema declara).

### Los 35 reactivos

Compuestos directamente en esta sesión (redacción original, cero llamadas a
red): enunciado + 4 opciones (1 correcta) + 3 capas de explicación cada uno,
validados con el MISMO `QuestionDraftSchema`/KaTeX de siempre
(`scripts/lib/question-draft-schema.ts`, sin cambios) — **0 rechazados en
el dry-run, 35/35 válidos**. Distribución por tema (12 SOURCED en los 3
temas con fragmento, citando `sourceChunks:[1]` en cada uno; 23
TEMARIO_ONLY en los 9 restantes):

| Tema | Reactivos | Grounding | Formatos |
|---|---:|---|---|
| Números y operaciones | 4 | SOURCED | PROBLEM_SOLVING ×4 |
| Ecuaciones lineales y cuadráticas | 4 | SOURCED | PROBLEM_SOLVING ×3, MULTIPLE_CHOICE ×1 |
| Sucesiones y series | 4 | SOURCED | NUMERIC_SERIES ×4 |
| Álgebra elemental | 3 | TEMARIO_ONLY | PROBLEM_SOLVING ×2, MULTIPLE_CHOICE ×1 |
| Funciones y gráficas | 3 | TEMARIO_ONLY | PROBLEM_SOLVING ×2, MULTIPLE_CHOICE ×1 |
| Trigonometría | 3 | TEMARIO_ONLY | PROBLEM_SOLVING ×3 |
| Geometría analítica | 3 | TEMARIO_ONLY | PROBLEM_SOLVING ×3 |
| Cálculo diferencial | 3 | TEMARIO_ONLY | PROBLEM_SOLVING ×3 |
| Cálculo integral | 2 | TEMARIO_ONLY | PROBLEM_SOLVING ×2 |
| Matrices y sistemas | 2 | TEMARIO_ONLY | MULTIPLE_CHOICE ×1, PROBLEM_SOLVING ×1 |
| Combinatoria y probabilidad | 2 | TEMARIO_ONLY | PROBLEM_SOLVING ×2 |
| Números complejos | 2 | TEMARIO_ONLY | PROBLEM_SOLVING ×2 |
| **TOTAL** | **35** | **12 SOURCED / 23 TEMARIO_ONLY** | PROBLEM_SOLVING 28 · NUMERIC_SERIES 4 · MULTIPLE_CHOICE 3 |

Mezcla de formato deliberadamente dominada por PROBLEM_SOLVING (80%),
reflejando el estilo real observado en los 3 fragmentos fuente disponibles
(problemas de cálculo/palabra, no reactivos de opción conceptual pura) más
NUMERIC_SERIES para el tema de sucesiones (match directo con su fragmento).
Dificultad variada BASIC/INTERMEDIATE/ADVANCED sin sobre-representar ningún
nivel.

### Inserción

`pnpm content:insert --topic <id> --file <drafts.json>` corrido 12 veces
(una por tema, siguiendo el contrato existente del script de G2) —
**35/35 insertados, 0 rechazados**, todos `isVerified=false`,
`source=GENERATED`, a la espera de verificación ciega
(`content:blind-batch` → sesión verificadora independiente →
`content:resolve`, mecanismo de G2). Verificado en vivo contra Supabase
real: `SELECT count(*)` confirma exactamente 35 pendientes en esa materia,
12 SOURCED / 23 TEMARIO_ONLY.

### Artefacto persistido

`docs/content-batches/g3a-ipn-fismat-matematicas.json` — los 35 reactivos
completos (enunciado, opciones, explicaciones, cita de fuente) con su
`questionId` real de la DB, para trazabilidad del lote. Los 12 archivos
operativos usados para la inserción (`scripts/content-exports/g3a/*.json`)
son intermedios desechables (esa carpeta está en `.gitignore` desde G1) —
la fuente de verdad persistida es el archivo consolidado en `docs/`.

### Pendiente inmediato (siguiente sesión, G3b)

Estos 35 reactivos NO son visibles a usuarios todavía (`isVerified=false`).
El siguiente paso es exportar el lote ciego
(`pnpm content:blind-batch --topic <id>` por cada uno de los 12 temas, o
`--ids` con todos los `questionId` del artefacto) y resolverlo en una
sesión de Claude Code/chat DISTINTA e independiente de esta — solo así se
preserva la garantía de que el verificador nunca vio la respuesta correcta.

## Siguiente

**G3b — Verificación ciega del lote de 35 reactivos (IPN FISMAT
Matemáticas).** Correr `pnpm content:blind-batch --topic <id>` por cada uno
de los 12 temas listados arriba (o construir el `--ids` con los
`questionId` de `docs/content-batches/g3a-ipn-fismat-matematicas.json`),
resolverlo en una sesión de Claude Code/chat DISTINTA e independiente de la
que compuso estos reactivos, y aplicar `pnpm content:resolve --file
<respuestas.json>`. Solo así los 35 reactivos pasan de `isVerified=false` a
`isVerified=true` (o quedan documentados como sin publicar, con el
veredicto adjunto). Después de G3b, repetir el mismo ciclo
(`content:insert` → `content:blind-batch` → sesión verificadora →
`content:resolve`) para la siguiente materia según la misma regla de
prioridad es cómo se cierra la brecha de 1,191 reactivos (tabla en G1),
sin ningún costo de API de por medio.
