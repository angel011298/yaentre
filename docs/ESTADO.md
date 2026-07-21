# ESTADO — Acierta

Última actualización: 2026-07-20 · Última fase ejecutada: F3 (COMPLETADA) · F4 EN_PROGRESO, bloqueada por saldo API $0

## Tabla de fases

| Fase | Nombre | Estado | Commit | Notas |
|---|---|---|---|---|
| F0 | Auditoría y reparación del repo | COMPLETADA | (esta sesión) | CLAUDE.md actualizado, ESTADO.md creado, .claude/settings.json agregado |
| F1 | Infraestructura validada vs Supabase real | COMPLETADA | (F1) | Proyecto Supabase real (ref fumluvvzskhdxcyljbmx). Schema=fuente de verdad (diff vacío), RLS verificada, seed real (2 inst/7 áreas/35 mat/217 temas/47 carreras), guardrail probado en vivo, 9/10 PDFs subidos. Bugs corregidos: camelCase en RLS + recursión infinita RLS. Pendiente externo: prueba Anthropic (falta key real) y guía IPN 80MB (>límite free-tier). Ver docs/VALIDACION_INFRA.md |
| F2 | Pipeline adversarial de contenido | EN_PROGRESO | (F2) | CONSTRUIDO Y PROBADO COMPLETO: verificador Fable 5 (sin respuesta, con test estructural), cálculo ejecutado en sandbox VM, resolución (coincidencia+conf≥0.85+0 problemas), 3a pasada Opus 5%, orquestador content-run, coverage con tasa auto-aprobación, 94 tests verdes, E2E mock vs DB real OK. Schema: +7 formatos, +verification JSONB. API key real creada y validada (auth OK). ÚNICO pendiente: tanda real de 10 — bloqueada por saldo API $0.00 (compra de créditos = decisión del dueño) |
| F2b | Anclaje en fuentes e ingesta continua | COMPLETADA | (F2b) | Escaneo real: 12 archivos detectados (10 docs/guias + 2 raíz), 380 fragmentos de 9 fuentes (uam_cbi reparada con backfill tras fix de bytes NUL), duplicado raíz de ECOEM detectado por hash, 2 PDFs IPN escaneados pendientes de visión. RLS solo-ADMIN verificada en vivo (anon → []). SOURCED end-to-end probado en mock con trazabilidad real en DB. Pendiente por saldo API $0: clasificar 380 fragmentos (~$0.70) — re-correr pnpm content:scan-sources con saldo. 0/217 temas con fuente hasta clasificar |
| F3 | Panel de discrepancias y resolución | COMPLETADA | (F3) | Repurposeó la cola plana de CC-06 (isVerified=false sin distinción) por 3 colas del pipeline F2: discrepancia/baja-confianza-o-problemas/muestreo-degradado, clasificadas por `Question.verification` (JSONB). Detalle con comparación generador-vs-verificador, razonamiento, problemas, auditoría; 1-clic aprobar con cualquiera de las 4 opciones (atajos 1-4/D/E); "Aprobar con X" y "editar" anotan `manualReview` (preserva el veredicto original para auditoría, saca el reactivo de la cola). Render de LaTeX/imagen de reactivo/imagen de opción/pasaje compartido. /admin/coverage: tasa de auto-aprobación global+por materia+por formato, desglose SOURCED/TEMARIO_ONLY (F2b). RLS ADMIN-only ya cubría todo (F1/F2b), sin cambios de schema. 15 tests nuevos (118 total) + verificación real contra Supabase con 5 fixtures cubriendo las 3 colas + SOURCED-con-passage-e-imagen + ya-resuelto (25 aserciones entre lectura y mutación, todas verdes, fixtures limpiados). `pnpm build` production OK (sin violaciones Server/Client Component) |
| F4 | Producción de contenido en escala | EN_PROGRESO | b638576 (infra previa) | La infra de taxonomía/ingesta (CC-07..CC-25: seeds, ingesta, procedencia, aciertos mínimos, examen oficial) está lista y es la base de esta fase. El OBJETIVO REAL de F4 — generar ≥300 reactivos verificados/servibles vía el pipeline F2/F2b — arrancó 2026-07-20: escáner F2b re-corrido (0 archivos nuevos utilizables), estado real confirmado por query (0 GENERATED en DB, 0/380 chunks clasificados). BLOQUEADA antes de generar el primer reactivo: saldo API $0. Materias priorizadas ya identificadas (ver Reanudación). Costo estimado para completar: ~$40–55 USD |
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

**F4 — bloqueada desde el primer paso (2026-07-20): saldo API $0.00.**

Generar el lote real de 300+ reactivos (F4) también cierra el pendiente
suelto de F2 (la "tanda real de 10") — no son dos tareas separadas, generar
en volumen vía `content:run` YA ejecuta el pipeline adversarial completo.
La API key `acierta-pipeline-f2` sigue siendo real y autentica (confirmado de
nuevo hoy: error 400 de saldo, no 401). El bloqueo es **saldo API $0.00** en
el org de Anthropic (553angelortiz@gmail.com, plan evaluación) — comprar
créditos es una acción financiera que solo el dueño puede hacer.

### Trabajo YA hecho en esta sesión (2026-07-20), listo para continuar
- Escáner de F2b (`pnpm content:scan-sources`) re-corrido: 0 archivos nuevos
  utilizables (los 2 PDFs de IPN siguen siendo escaneados, sin cambio).
- Estado real confirmado por query directa (no por log): 0 reactivos
  GENERATED existen en la DB; 0 de los 380 fragmentos fuente están
  clasificados.
- Materias priorizadas identificadas por `questionWeight` real (UNAM Área 1 y
  2): Matemáticas (26, 12 temas) · Física (16, 12 temas) · Biología (14, 10
  temas) · Química Área 1 (12, 9 temas) · Español Área 1 (10, 7 temas) ·
  Química Área 2 (8, 6 temas).

### Costo estimado para desbloquear (con el pricing real de scripts/lib/verifier.ts)
| Concepto | Estimado |
|---|---|
| Clasificar 380 fragmentos fuente (F2b, Sonnet) | ~$0.70 |
| Generar + verificar ~375 reactivos para netear 300 auto-aprobados (Sonnet generador + Fable 5 verificador siempre-thinking + Opus en 5% de auditoría) | ~$35–50 |
| **Total recomendado a cubrir** | **~$40–55 USD** |

Rango ancho porque Fable 5 tiene thinking always-on y las materias de cálculo
(Matemáticas/Física/Química) usan loops de herramienta (`ejecutar_calculo`)
que multiplican el costo por reactivo — no predecible con precisión de
antemano. $60 USD deja margen cómodo.

### Paso exacto para continuar
1. Dueño: console.anthropic.com → Facturación → agregar ~$60 USD de crédito.
2. `pnpm content:scan-sources` — clasifica los 380 fragmentos pendientes
   contra el temario; deja los temas de las materias priorizadas CON fuente
   (SOURCED) donde exista, marcados por `topicId`.
3. Por cada materia priorizada (orden: Matemáticas → Física → Biología →
   Química → Español), listar sus temas y correr
   `pnpm content:run --topic <id> --count <n>` en tandas (~10-15 por tanda),
   priorizando primero los temas CON SourceChunk clasificado (auditar con
   `SELECT` sobre `source_chunks.topicId`), luego los que no tengan ninguno
   (esos saldrán TEMARIO_ONLY, no bloquea).
4. Vigilar la tasa de auto-aprobación impresa por cada tanda. Si alguna
   materia cae <75%, AJUSTAR su system prompt/few-shot
   (`scripts/prompts/<materia>.md`) antes de seguir generando en volumen para
   ella, y documentar el ajuste aquí.
5. Repetir hasta acumular ≥300 verificados/servibles reales — confirmar con
   query a la DB, no solo con el log del script.
6. Correr `pnpm content:coverage` (o revisar `/admin/coverage`, F3) para el
   reporte final por materia + desglose SOURCED/TEMARIO_ONLY.
7. Actualizar esta fila de F4 con los números reales (total generado,
   auto-aprobados, tasa final por materia, costo real gastado, cobertura) y
   marcar COMPLETADA.

Notas: la key vence el 17 ago 2026 (renovar en Console → API Keys). Las 2
copias de la guía IPN son PDF escaneado → requieren visión (pendiente hasta
implementar ese paso, o extracción manual como CC-09). Pendiente heredado de
F1: guía IPN 80MB no cabe en Storage free-tier.

## Siguiente

**Bloqueada:** F4 no puede continuar sin saldo API (ver Reanudación arriba —
plan completo listo para ejecutar en cuanto haya crédito). No es una fase
nueva a la que avanzar; es la misma F4 a retomar.

**FASE:** F4 — **MODELO:** Sonnet 4.6
