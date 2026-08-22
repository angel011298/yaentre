# PROGRESO SPRINT 2 — YaEntre

Sprint 1 (pipeline de contenido: generación IA, panel admin, seeds de
taxonomía UNAM/IPN, ingesta de guías oficiales, procedencia/uso del
contenido) quedó cerrado — ver `PROGRESO_SPRINT1.md`. Sprint 2 arranca con el
arranque en frío del motor adaptativo: poblar `Career.minAciertos` con datos
reales antes de que exista el Entrómetro completo (CC-11).

---

## CC-13 — Aciertos mínimos por triangulación con confianza

**Fecha:** 12 de julio de 2026 · **Modelo de la sesión:** Sonnet (investigación web + integración de datos)

**Fuentes:** `Backend_Schema_Acierta_v1.0.md` (modelo `Career`). Depende de
CC-07/CC-08/CC-09b (carreras ya sembradas para UNAM e IPN).

> **Nota sobre documentación:** `docs/12_Fuentes_Contenido_v2.1.md` no existe
> con ese nombre en el repo — mismo patrón que en sesiones anteriores (CC-06,
> CC-09, CC-09b). Se procedió directo sobre el objetivo de la tarea.

### Objetivo

Poblar `Career.minAciertos` (el "arranque en frío" del Entrómetro — la meta
de aciertos que el producto le muestra a un aspirante antes de tener datos
propios de usuarios) con datos reales, verificables y trazables, en vez de
las estimaciones razonadas (pero no verificadas) que CC-07/CC-08 habían
dejado marcadas `TODO-VERIFICAR`.

### Alcance entregado

- **Schema:** enum `ConfidenceLevel` (HIGH/MED/LOW) + campos
  `Career.minAciertosConfidence` y `Career.sources` (JSON con URL + etiqueta
  por fuente). Migración `0005_add_career_confidence.sql`.
- **UNAM:** las 26 carreras (tras retirar 2 que no existen y reasignar 1)
  ahora tienen `minAciertos` **real, oficial, verificado uno por uno** contra
  el portal público de resultados de DGAE (`dgae.unam.mx/Licenciatura2025/
  resultados/...`), confianza HIGH en 25/26 y MED en 1 (divergencia menor de
  ±3 con una fuente secundaria).
- **IPN:** 21 carreras (7 renombradas a su nombre oficial real) con
  `minAciertos` triangulado entre 2 compilaciones públicas independientes.
  **Ninguna alcanza HIGH** — hallazgo honesto: el IPN no publica un portal de
  resultados abierto como UNAM, confirmado además por una cita directa de un
  medio especializado ("el IPN no publica una lista oficial de aciertos
  mínimos"). 1 carrera MED (2 fuentes coinciden exacto), 20 LOW.
- **`docs/ACIERTOS_MINIMOS.md`:** tabla completa por carrera con valor, año,
  confianza y fuentes citables, con las LOW resaltadas y el detalle completo
  de metodología, correcciones de nombre y hallazgos.
- **`src/lib/adaptive/entrometro.ts`:** módulo puro que formatea la meta
  SIEMPRE calificada por su confianza ("Meta estimada" / "Meta preliminar"),
  nunca como una cifra absoluta — con 6 tests Vitest que verifican
  específicamente que ninguna rama de confianza devuelve un número sin
  calificar.

### Hallazgo principal: UNAM tiene datos oficiales públicos, IPN no

El hallazgo más importante de esta sesión no fue un número individual, sino
una asimetría estructural entre instituciones:

- **UNAM (DGAE)** publica, sin necesidad de cuenta ni pago, el resultado
  completo de cada carrera-plantel del concurso de selección — oferta,
  aspirantes, aciertos mínimos exactos, seleccionados. Se verificó **una por
  una con una petición HTTP real** a las 26 URLs (no se asumió ningún dato),
  y se validó la metodología cruzando 3 valores contra una fuente
  independiente: coincidieron exacto (±0) en las 3.
- **IPN** no tiene equivalente público — su portal de resultados exige login
  de aspirante. Esto se confirmó leyendo directamente un artículo
  especializado que cita explícitamente: *"el IPN no publica una lista
  oficial de aciertos mínimos... las tablas [circulando en redes] son
  estimaciones de terceros"*. Por eso NINGUNA carrera de IPN llega a
  confianza HIGH en este seed — es un reflejo honesto de la disponibilidad
  real de datos, no una limitación de la investigación.

### Correcciones de nombre y estructura (honestidad del dato)

Además de los valores de `minAciertos`, la triangulación reveló que varios
nombres de carrera de CC-07/CC-08 eran aproximados o incorrectos:

- **UNAM:** 2 carreras retiradas por no existir ("Ciencias de la Salud",
  "Artes Musicales"), 1 reasignada de área ("Comunicación Social" → "Ciencias
  de la Comunicación", de Área 4 a Área 3), y varias renombradas a su nombre
  oficial exacto de DGAE.
- **IPN:** 7 carreras renombradas a su nombre real (verificado contra
  `scripts/extraction/ipn.taxonomy.json` de CC-09b), p. ej. "Medicina (ESM)"
  → "Médico Cirujano y Partero (ESM)".

Detalle línea por línea en `docs/ACIERTOS_MINIMOS.md`.

### Entrómetro: exponer confianza, nunca verdad absoluta

CC-11 (el motor adaptativo / Entrómetro completo) **no existe todavía en
este repo** — `app/(app)/app/page.tsx` sigue siendo el placeholder de CC-10.
En vez de forzar una UI completa fuera de alcance, se construyó el
**contrato de presentación** que CC-11 debe usar:
`src/lib/adaptive/entrometro.ts` — función pura
`formatEntrometroTarget()` que:

- Nunca devuelve un número sin calificar ("Meta estimada" / "Meta
  preliminar", siempre con el prefijo `~`).
- Cambia el disclaimer según `minAciertosConfidence` (HIGH/MED/LOW/sin
  registrar — este último tratado como el nivel más bajo, nunca HIGH por
  defecto).
- Si no hay `minAciertos`, no inventa una meta: `hasTarget: false`.

6 tests Vitest verifican explícitamente que TODAS las ramas de confianza
califican el número y que el caso sin dato no fabrica una meta.

### Mecanismo de auto-mejora post-launch (diseño)

Documentado en `docs/ACIERTOS_MINIMOS.md` §Mecanismo de auto-mejora: una vez
que `ExamSession` en modo `FULL_SIMULATION` acumule volumen suficiente por
carrera objetivo (umbral sugerido ≥30 sesiones), el Entrómetro puede
mezclar gradualmente un percentil propio con la fuente externa
(`peso_propio = min(sesiones/30, 1)`), y la fuente externa (UNAM/IPN) debe
re-triangularse cada ciclo de admisión. Es diseño para una sesión futura del
motor adaptativo — no se implementó código de blending en CC-13 (no hay datos
de usuarios reales que blendear todavía).

### Verificación

- ✅ `pnpm typecheck` y `pnpm lint` en verde.
- ✅ 68 tests en verde (62 previos + 6 nuevos de `entrometro.test.ts`).
- ✅ Las 26 URLs de DGAE se visitaron con una petición HTTP real en esta
  sesión (browser), no se asumió ninguna.
- ✅ Cero valores inventados: donde no hubo fuente confiable, se conservó el
  valor previo de CC-07/CC-08 marcado explícitamente `LOW` con nota de "sin
  verificación en esta sesión" (2 carreras de IPN).
- 🟡 Aplicación real a la DB bloqueada por falta de `DATABASE_URL` (mismo
  bloqueo transversal de todas las sesiones anteriores).

### Guardrails respetados

- ✅ No se modificó `prisma/schema.prisma` más allá de lo pedido
  explícitamente (enum `ConfidenceLevel` + 2 campos en `Career`).
- ✅ Ningún número de `minAciertos` se presenta al usuario como verdad
  absoluta (verificado con tests).
- ✅ Ninguna carrera sin fuente suficiente quedó con un valor inventado.

---

*Sprint 2 arranca con el arranque en frío del Entrómetro (CC-13). Pendiente:
CC-10/CC-11 (dashboard y motor adaptativo completo, que consumirán
`formatEntrometroTarget`), completar la verificación de nombres de carrera
de IPN Sociales-Administrativas (no cubiertas por `ipn.taxonomy.json`), y —
igual que en Sprint 1 — una DB real para aplicar todos los seeds end-to-end.*
