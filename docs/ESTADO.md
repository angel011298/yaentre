# ESTADO — Acierta

Última actualización: 2026-07-18 · Última fase ejecutada: F1 (COMPLETADA)

## Tabla de fases

| Fase | Nombre | Estado | Commit | Notas |
|---|---|---|---|---|
| F0 | Auditoría y reparación del repo | COMPLETADA | (esta sesión) | CLAUDE.md actualizado, ESTADO.md creado, .claude/settings.json agregado |
| F1 | Infraestructura validada vs Supabase real | COMPLETADA | (F1) | Proyecto Supabase real (ref fumluvvzskhdxcyljbmx). Schema=fuente de verdad (diff vacío), RLS verificada, seed real (2 inst/7 áreas/35 mat/217 temas/47 carreras), guardrail probado en vivo, 9/10 PDFs subidos. Bugs corregidos: camelCase en RLS + recursión infinita RLS. Pendiente externo: prueba Anthropic (falta key real) y guía IPN 80MB (>límite free-tier). Ver docs/VALIDACION_INFRA.md |
| F2 | Pipeline adversarial de contenido | EN_PROGRESO | a4dbe82 | CC-05/CC-06: generación IA + panel admin. Verificación adversarial pendiente (CC-26) |
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

(Vacío. F1 cerrada. Dos ítems quedan fuera por dependencia externa, no por
trabajo pendiente: la prueba Anthropic —falta una API key real— y la guía IPN
de 80 MB —supera el límite del plan gratuito de Supabase—. Ambos con su script
listo: `scripts/ping-anthropic.ts` y `scripts/upload-guias.ts`.)

## Siguiente

**FASE:** F2 — **MODELO:** Fable 5 (pipeline adversarial de contenido)
