# ESTADO — Acierta

Última actualización: 2026-07-21 · Última fase ejecutada: F4 (COMPLETADA)

## Tabla de fases

| Fase | Nombre | Estado | Commit | Notas |
|---|---|---|---|---|
| F0 | Auditoría y reparación del repo | COMPLETADA | (esta sesión) | CLAUDE.md actualizado, ESTADO.md creado, .claude/settings.json agregado |
| F1 | Infraestructura validada vs Supabase real | COMPLETADA | (F1) | Proyecto Supabase real (ref fumluvvzskhdxcyljbmx). Schema=fuente de verdad (diff vacío), RLS verificada, seed real (2 inst/7 áreas/35 mat/217 temas/47 carreras), guardrail probado en vivo, 9/10 PDFs subidos. Bugs corregidos: camelCase en RLS + recursión infinita RLS. Pendiente externo: prueba Anthropic (falta key real) y guía IPN 80MB (>límite free-tier). Ver docs/VALIDACION_INFRA.md |
| F2 | Pipeline adversarial de contenido | EN_PROGRESO | (F2) | CONSTRUIDO Y PROBADO COMPLETO: verificador Fable 5 (sin respuesta, con test estructural), cálculo ejecutado en sandbox VM, resolución (coincidencia+conf≥0.85+0 problemas), 3a pasada Opus 5%, orquestador content-run, coverage con tasa auto-aprobación, 94 tests verdes, E2E mock vs DB real OK. Schema: +7 formatos, +verification JSONB. API key real creada y validada (auth OK). ÚNICO pendiente: tanda real de 10 — bloqueada por saldo API $0.00 (compra de créditos = decisión del dueño) |
| F2b | Anclaje en fuentes e ingesta continua | COMPLETADA | (F2b) | Escaneo real: 12 archivos detectados (10 docs/guias + 2 raíz), 380 fragmentos de 9 fuentes (uam_cbi reparada con backfill tras fix de bytes NUL), duplicado raíz de ECOEM detectado por hash, 2 PDFs IPN escaneados pendientes de visión. RLS solo-ADMIN verificada en vivo (anon → []). SOURCED end-to-end probado en mock con trazabilidad real en DB. Pendiente por saldo API $0: clasificar 380 fragmentos (~$0.70) — re-correr pnpm content:scan-sources con saldo. 0/217 temas con fuente hasta clasificar |
| F3 | Panel de discrepancias y resolución | COMPLETADA | (F3) | Repurposeó la cola plana de CC-06 (isVerified=false sin distinción) por 3 colas del pipeline F2: discrepancia/baja-confianza-o-problemas/muestreo-degradado, clasificadas por `Question.verification` (JSONB). Detalle con comparación generador-vs-verificador, razonamiento, problemas, auditoría; 1-clic aprobar con cualquiera de las 4 opciones (atajos 1-4/D/E); "Aprobar con X" y "editar" anotan `manualReview` (preserva el veredicto original para auditoría, saca el reactivo de la cola). Render de LaTeX/imagen de reactivo/imagen de opción/pasaje compartido. /admin/coverage: tasa de auto-aprobación global+por materia+por formato, desglose SOURCED/TEMARIO_ONLY (F2b). RLS ADMIN-only ya cubría todo (F1/F2b), sin cambios de schema. 15 tests nuevos (118 total) + verificación real contra Supabase con 5 fixtures cubriendo las 3 colas + SOURCED-con-passage-e-imagen + ya-resuelto (25 aserciones entre lectura y mutación, todas verdes, fixtures limpiados). `pnpm build` production OK (sin violaciones Server/Client Component) |
| F4 | Producción de contenido en escala | COMPLETADA | (F4) | **309 reactivos verificados/servibles reales en producción** (meta: ≥300). 380 generados, 71 sin publicar (verificación adversarial los rechazó correctamente), 0 rechazados sin verificación. Tasa de auto-aprobación global 81.3% (309/380). 184/380 SOURCED (anclados en fuente real), resto TEMARIO_ONLY solo en temas sin fragmento fuente. Auditoría de tercera pasada (5%, 16 reactivos): 16/16 sin defectos, 0 degradados. **Bloqueada por saldo API $0 (ver commit 065d448); desbloqueada SIN comprar crédito** por instrucción explícita del dueño ("no se meterá crédito de ninguna forma") — pipeline ejecutado con arquitectura alterna "capital cero" (ver Notas F4 abajo). Costo real en dinero: $0.00 |
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

**FASE:** F5 — **MODELO:** Sonnet 4.6
