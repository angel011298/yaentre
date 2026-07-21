# ESTADO — Acierta

Última actualización: 2026-07-19 · Última fase ejecutada: F3 (COMPLETADA)

## Tabla de fases

| Fase | Nombre | Estado | Commit | Notas |
|---|---|---|---|---|
| F0 | Auditoría y reparación del repo | COMPLETADA | (esta sesión) | CLAUDE.md actualizado, ESTADO.md creado, .claude/settings.json agregado |
| F1 | Infraestructura validada vs Supabase real | COMPLETADA | (F1) | Proyecto Supabase real (ref fumluvvzskhdxcyljbmx). Schema=fuente de verdad (diff vacío), RLS verificada, seed real (2 inst/7 áreas/35 mat/217 temas/47 carreras), guardrail probado en vivo, 9/10 PDFs subidos. Bugs corregidos: camelCase en RLS + recursión infinita RLS. Pendiente externo: prueba Anthropic (falta key real) y guía IPN 80MB (>límite free-tier). Ver docs/VALIDACION_INFRA.md |
| F2 | Pipeline adversarial de contenido | EN_PROGRESO | (F2) | CONSTRUIDO Y PROBADO COMPLETO: verificador Fable 5 (sin respuesta, con test estructural), cálculo ejecutado en sandbox VM, resolución (coincidencia+conf≥0.85+0 problemas), 3a pasada Opus 5%, orquestador content-run, coverage con tasa auto-aprobación, 94 tests verdes, E2E mock vs DB real OK. Schema: +7 formatos, +verification JSONB. API key real creada y validada (auth OK). ÚNICO pendiente: tanda real de 10 — bloqueada por saldo API $0.00 (compra de créditos = decisión del dueño) |
| F2b | Anclaje en fuentes e ingesta continua | COMPLETADA | (F2b) | Escaneo real: 12 archivos detectados (10 docs/guias + 2 raíz), 380 fragmentos de 9 fuentes (uam_cbi reparada con backfill tras fix de bytes NUL), duplicado raíz de ECOEM detectado por hash, 2 PDFs IPN escaneados pendientes de visión. RLS solo-ADMIN verificada en vivo (anon → []). SOURCED end-to-end probado en mock con trazabilidad real en DB. Pendiente por saldo API $0: clasificar 380 fragmentos (~$0.70) — re-correr pnpm content:scan-sources con saldo. 0/217 temas con fuente hasta clasificar |
| F3 | Panel de discrepancias y resolución | COMPLETADA | (F3) | Repurposeó la cola plana de CC-06 (isVerified=false sin distinción) por 3 colas del pipeline F2: discrepancia/baja-confianza-o-problemas/muestreo-degradado, clasificadas por `Question.verification` (JSONB). Detalle con comparación generador-vs-verificador, razonamiento, problemas, auditoría; 1-clic aprobar con cualquiera de las 4 opciones (atajos 1-4/D/E); "Aprobar con X" y "editar" anotan `manualReview` (preserva el veredicto original para auditoría, saca el reactivo de la cola). Render de LaTeX/imagen de reactivo/imagen de opción/pasaje compartido. /admin/coverage: tasa de auto-aprobación global+por materia+por formato, desglose SOURCED/TEMARIO_ONLY (F2b). RLS ADMIN-only ya cubría todo (F1/F2b), sin cambios de schema. 15 tests nuevos (118 total) + verificación real contra Supabase con 5 fixtures cubriendo las 3 colas + SOURCED-con-passage-e-imagen + ya-resuelto (25 aserciones entre lectura y mutación, todas verdes, fixtures limpiados). `pnpm build` production OK (sin violaciones Server/Client Component) |
| F4 | Producción de contenido en escala | COMPLETADA | b638576 | CC-07/CC-08/CC-01c/CC-09/CC-09b/CC-13/CC-25: seeds, ingesta, procedencia, aciertos mínimos, examen oficial |
| F5 | Onboarding y diagnóstico inicial | PENDIENTE | — | Quiz inicial, determinación de nivel, primera recomendación |
| F6 | Motor adaptativo (recomendación de temas) | PENDIENTE | — | Spaced repetition, promedio ponderado, algoritmo de siguiente tema |
| F7 | Página de diagnóstico y resultados | PENDIENTE | — | Visualización de fortalezas/debilidades por área y materia |
| F8 | Integración de Stripe (pagos) | PENDIENTE | — | Webhook, idempotencia vía `ProcessedStripeEvent.eventId` |
| F9 | Paywall + Early Bird pricing | PENDIENTE | — | Bloqueos de acceso, cálculo de precio dinámico, modal de pago |
| F10 | Landing page | PENDIENTE | — | Home, precios, testimonios, CTA a login/registro |
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

## Reanudación

**F2 — un solo pendiente (2026-07-18): la tanda real de 10 reactivos.**

Todo lo demás de F2 está construido, probado y commiteado. La API key
`acierta-pipeline-f2` es real y autentica (validado: el error es 400 de saldo,
no 401). El bloqueo es **saldo API $0.00** en el org de Anthropic
(553angelortiz@gmail.com, plan evaluación) — comprar créditos es una acción
financiera que solo el dueño puede hacer.

### Paso exacto para continuar (5 minutos)
1. Dueño: console.anthropic.com → Facturación → agregar créditos (con $5 USD
   sobra: tanda F2 ~$0.50–$1.50 + clasificación F2b ~$0.70).
2. `pnpm content:scan-sources` — clasifica los 380 fragmentos pendientes
   contra el temario (F2b) y deja temas CON fuente.
3. `pnpm content:run --topic cmrr1iv7r000ghi3n9ageokue --count 10`
   (tema "Números reales y complejos", Matemáticas UNAM Área 1) — tanda real
   con verificación adversarial; ahora saldrá SOURCED si el tema tiene
   fragmentos clasificados.
4. Registrar la tasa de auto-aprobación en las Notas de F2; marcar F2
   COMPLETADA.

Notas: la key vence el 17 ago 2026 (renovar en Console → API Keys). Las 2
copias de la guía IPN son PDF escaneado → requieren visión (misma corrida de
escáner las procesará cuando se implemente ese paso, o extracción manual como
CC-09). Pendiente heredado de F1: guía IPN 80MB no cabe en Storage free-tier.

## Siguiente

**Pendiente cruzado (no bloquea F4):** cerrar F2 con la tanda real de 10 en
cuanto haya saldo API (ver Reanudación arriba) — el panel de F3 ya está listo
para mostrar sus resultados en cuanto exista contenido real no auto-aprobado.

**FASE:** F4 — **MODELO:** Sonnet 4.6
