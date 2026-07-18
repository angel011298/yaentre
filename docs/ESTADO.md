# ESTADO — Acierta

Última actualización: 2026-07-18 · Última fase ejecutada: F1 (EN_PROGRESO)

## Tabla de fases

| Fase | Nombre | Estado | Commit | Notas |
|---|---|---|---|---|
| F0 | Auditoría y reparación del repo | COMPLETADA | (esta sesión) | CLAUDE.md actualizado, ESTADO.md creado, .claude/settings.json agregado |
| F1 | Infraestructura validada vs Supabase real | EN_PROGRESO | (WIP) | Proyecto Supabase real creado (ref fumluvvzskhdxcyljbmx). Schema+RLS+índices aplicados y verificados vía conector. Bug camelCase/snake_case en RLS corregido. Pendiente: seed real, guardrail, subida PDFs, prueba Anthropic — bloqueado por credenciales (ver Reanudación) |
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

**F1 — pausada por credenciales faltantes (2026-07-18).**

### Ya completado (autónomo, vía conector Supabase MCP)
- Proyecto Supabase real **Acierta** creado: ref `fumluvvzskhdxcyljbmx`, us-east-1.
  (Se pausó `PLD-Master-V0` con autorización para liberar cupo del plan gratuito.)
- Schema completo aplicado: 26 tablas, 18 enums, FKs, índices.
- RLS + índices parciales aplicados (con el bug camelCase corregido).
- RLS verificado en las 12 tablas de usuario.
- Bucket público `guias-oficiales` creado.
- `.env.local` con URL + anon key + publishable reales; connection strings con
  `[DB_PASSWORD]` de placeholder.
- Migraciones del repo (0001/0002/0003) corregidas a camelCase.
- `docs/VALIDACION_INFRA.md` escrito.

### Falta (bloqueado — credenciales que ningún tool puede generar)
1. **Contraseña de DB** → para `.env.local` (DATABASE_URL/DIRECT_URL) y correr
   `pnpm prisma db seed` + `prisma migrate status`. Resetear en:
   Dashboard → proyecto Acierta → Settings → Database → Reset database password.
2. **SUPABASE_SERVICE_ROLE_KEY** → subir los 11 PDFs de `docs/guias/` al bucket.
   Dashboard → Settings → API → service_role.
3. **ANTHROPIC_API_KEY real** → prueba de 1 token (Tarea 7). console.anthropic.com.

### Paso exacto para continuar
Con las 3 credenciales en `.env.local`: (a) `pnpm prisma db seed` y registrar
conteos en VALIDACION_INFRA.md; (b) smoke test del guardrail SERVABLE vs
CALIBRATION_ONLY; (c) script para subir PDFs al bucket; (d) script de prueba
Anthropic; (e) marcar F1 COMPLETADA y pasar a F2.

## Siguiente

**FASE:** F5 — **MODELO:** Haiku 4.5 (onboarding, boilerplate)
