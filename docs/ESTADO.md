# ESTADO — Acierta

Última actualización: 2026-07-18 · Última fase ejecutada: F2 (EN_PROGRESO — solo falta la tanda real, bloqueada por créditos API)

## Tabla de fases

| Fase | Nombre | Estado | Commit | Notas |
|---|---|---|---|---|
| F0 | Auditoría y reparación del repo | COMPLETADA | (esta sesión) | CLAUDE.md actualizado, ESTADO.md creado, .claude/settings.json agregado |
| F1 | Infraestructura validada vs Supabase real | COMPLETADA | (F1) | Proyecto Supabase real (ref fumluvvzskhdxcyljbmx). Schema=fuente de verdad (diff vacío), RLS verificada, seed real (2 inst/7 áreas/35 mat/217 temas/47 carreras), guardrail probado en vivo, 9/10 PDFs subidos. Bugs corregidos: camelCase en RLS + recursión infinita RLS. Pendiente externo: prueba Anthropic (falta key real) y guía IPN 80MB (>límite free-tier). Ver docs/VALIDACION_INFRA.md |
| F2 | Pipeline adversarial de contenido | EN_PROGRESO | (F2) | CONSTRUIDO Y PROBADO COMPLETO: verificador Fable 5 (sin respuesta, con test estructural), cálculo ejecutado en sandbox VM, resolución (coincidencia+conf≥0.85+0 problemas), 3a pasada Opus 5%, orquestador content-run, coverage con tasa auto-aprobación, 94 tests verdes, E2E mock vs DB real OK. Schema: +7 formatos, +verification JSONB. API key real creada y validada (auth OK). ÚNICO pendiente: tanda real de 10 — bloqueada por saldo API $0.00 (compra de créditos = decisión del dueño) |
| F3 | Panel de discrepancias y resolución | PENDIENTE | — | Construido parcialmente en CC-06; necesita sesión dedicada |
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
   sobra; la tanda cuesta ~$0.50–$1.50).
2. Correr: `pnpm content:run --topic cmrr1iv7r000ghi3n9ageokue --count 10`
   (tema "Números reales y complejos", Matemáticas UNAM Área 1).
3. Registrar la tasa de auto-aprobación observada en las Notas de F2 y en
   docs/VALIDACION_INFRA.md; marcar F2 COMPLETADA.

Nota: la key vence el 17 ago 2026 (renovar en Console → API Keys).
Pendiente heredado de F1 sin cambio: guía IPN 80MB (>límite free-tier Supabase).

## Siguiente

**Inmediato:** cerrar F2 (ver Reanudación: créditos + tanda real de 10).
**Después:** **FASE:** F3 — **MODELO:** Sonnet 4.6 (panel de discrepancias)
