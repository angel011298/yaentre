# PROGRESO SPRINT 1 — Acierta

Sprint 0 (fundación) quedó cerrado con CC-00 → CC-04 (ver `PROGRESO_SPRINT0.md`).
Sprint 1 arranca con el pipeline de contenido, la dependencia crítica no técnica
del proyecto (banco de 1,500 reactivos verificados antes del launch).

---

## CC-05 — Pipeline de generación de reactivos con IA (offline)

**Fecha:** 12 de julio de 2026 · **Modelo de la sesión:** Fable (activo de contenido)

**Fuentes:** `PRD_Acierta_v1.0.md` §8 (etapas del pipeline, validación, costos),
`Backend_Schema_Acierta_v1.0.md` (Question, ExplanationLayer, DifficultyLevel).

> **Nota sobre documentación:** `docs/03_PRD.md` y `docs/04_TRD.md` no existen con
> esos nombres en el repo; los documentos versionados son `PRD_Acierta_v1.0.md`,
> `Flujo_App_Acierta_v1.0.md`, `Backend_Schema_Acierta_v1.0.md`,
> `Plan_Implementacion_Acierta_v1.0.md` y `UIUX_Spec_Acierta_v1.0.md`. Se usó el
> §8 del PRD como especificación del pipeline (Etapas 1 y 2). No hay un TRD §10
> disponible; las decisiones de arquitectura se tomaron sobre el PRD + CLAUDE.md.

### Alcance entregado (Etapas 1 y 2 del PRD §8)

- **Etapa 1 — Generación con IA:** script CLI que construye el contexto
  taxonómico desde la DB, arma el system prompt por materia y llama a la API de
  Anthropic (`claude-sonnet-4-6`) para producir reactivos draft.
- **Etapa 2 — Validación automática:** todo reactivo pasa por un schema Zod
  (`QuestionDraftSchema`) + validación de LaTeX con KaTeX antes de tocar la DB.
  Lo que falla va a un log de rechazados y **nunca** se inserta.
- Los válidos se insertan con `isVerified = false` (quedan en la cola de la
  Etapa 3, revisión humana, que es un proceso externo no cubierto por código).

Las Etapas 3 (revisión humana) y 4 (staging) son de proceso/producto y se
implementarán como panel admin en una sesión posterior (CC-2x).

### Arquitectura elegida

Todo vive bajo `scripts/` (guardrail: la API de Anthropic **jamás** se llama en
runtime). Separación en módulos puros y testeables:

```
scripts/
├── generate-questions.ts        ← CLI orquestador (Etapa 1 + 2 + inserción)
├── content-coverage.ts          ← reporte de cobertura hacia la meta de 1,500
├── prompts/                     ← SYSTEM PROMPTS VERSIONADOS (el activo)
│   ├── _base.md                 ← rol, reglas, formato JSON, capas 1-3, LaTeX
│   ├── _default.md              ← fallback (decide STEM vs. humanidades)
│   ├── matematicas.md           ← few-shot con LaTeX
│   ├── fisica.md                ← few-shot con LaTeX + unidades SI
│   ├── quimica.md               ← few-shot con LaTeX (balanceo, estequiometría)
│   ├── biologia.md              ← few-shot sin LaTeX (conceptual)
│   ├── historia.md              ← few-shot sin LaTeX
│   └── espanol.md               ← few-shot sin LaTeX
└── lib/
    ├── question-draft-schema.ts ← Zod + validación KaTeX + dedupe (PURO)
    ├── parse-model-output.ts    ← extracción tolerante del array JSON (PURO)
    ├── prompt-loader.ts         ← compone base + materia + contexto
    ├── mock-generator.ts        ← drafts mock para dry-run sin API/DB
    ├── anthropic-client.ts      ← wrapper del SDK oficial
    └── content-db.ts            ← acceso Prisma (contexto, dedupe, inserción)
```

**Por qué prompts en archivos `.md` versionados:** el system prompt de generación
ES el activo de contenido del negocio. Vivir en archivos separados permite que un
redactor/pedagogo los itere (ajustar few-shots, reglas de distractores) **sin
tocar el código** ni recompilar — cumple el criterio de aceptación explícito.

### Decisiones del system prompt (parte del activo — documentadas a propósito)

1. **Rol calibrado al examen real mexicano.** El prompt base posiciona al modelo
   como redactor experto de reactivos de admisión UNAM/IPN/EXANI, con foco en los
   errores conceptuales reales de aspirantes de 15-22 años. No es un generador
   genérico de trivia.
2. **Distractores con origen nombrable.** Regla dura: cada distractor debe nacer
   de un error real y explicable (error de signo, paso omitido, confusión de
   conceptos). Si el modelo no puede explicar de qué error viene, debe rehacerlo.
   Esto sube la calidad discriminante del reactivo.
3. **Tres capas de explicación pedagógicas** (no solo "la respuesta es B"):
   - Capa 1 "¿Por qué?" — justificación directa.
   - Capa 2 "Paso a paso" — resolución completa que **nombra el error detrás de
     un distractor** ("si obtuviste X, probablemente…"). LaTeX en `latexContent`.
   - Capa 3 "Concepto base" — teoría de fondo + qué repasar.
   Esto alimenta directamente el sistema de explicaciones por capas de la app.
4. **STEM vs. humanidades como eje de LaTeX.** Matemáticas/física/química usan
   LaTeX (`$...$` inline y `latexContent` en modo display); biología/historia/
   español lo dejan en `null`. El `_default.md` hace que materias sin plantilla
   decidan sola por categoría.
5. **Rotación de la opción correcta** entre A/B/C/D a lo largo del lote, para no
   sesgar hacia una letra (los aspirantes y los modelos tienden a la "C").
6. **Formato JSON estricto y sin markdown.** El prompt exige que el primer
   carácter sea `[` y el último `]`. Aun así, `parse-model-output.ts` es
   tolerante (quita cercas ```json, aísla el array, envuelve objeto suelto) —
   defensa en profundidad porque los LLMs a veces desobedecen el formato.
7. **Escape doble de LaTeX en JSON** documentado explícitamente en el prompt
   (`\\frac`, `\\sqrt`), porque es la causa #1 de JSON inválido en salidas STEM.

### Validación automática (Etapa 2) — reglas duras

`QuestionDraftSchema` (Zod + `superRefine`) rechaza si:

- Las opciones no son exactamente 4 con ids A/B/C/D únicos.
- No hay **exactamente 1** opción correcta.
- Alguna opción o enunciado está vacío.
- No están exactamente las capas 1, 2 y 3.
- La dificultad no es uno de los 5 valores de `DifficultyLevel`.
- Cualquier LaTeX (`$...$` inline o `latexContent`) no compila con KaTeX
  (`throwOnError: true`).

Los rechazados se escriben a `scripts/logs/rejected-<topic>-<timestamp>.jsonl`
(ignorado por git) con sus errores accionables. **Ningún reactivo inválido llega
a la DB** — probado con un reactivo de 2 correctas inyectado en el dry-run y con
9 casos malformados en los tests de Vitest.

### Idempotencia / dedupe

`normalizeStem` (minúsculas, sin acentos, espacios colapsados) permite comparar
enunciados. El CLI carga los stems existentes del tema y descarta cualquier draft
cuyo enunciado normalizado ya exista o se repita dentro del mismo lote.

### CLI

```bash
# genérico (vía pnpm) — nota: pnpm corre un install de verificación primero
pnpm content:generate --topic <topicId> --count <n> [--dry-run] [--mock] [--inject-invalid]
pnpm content:coverage [--exam <examId>]

# directo (evita el pre-install de pnpm; útil en CI/local)
npx tsx scripts/generate-questions.ts --topic <topicId> --count <n> --dry-run --mock
```

Flags:
- `--dry-run` — genera y valida, **no** escribe en la DB.
- `--mock` — usa el generador mock (sin tokens ni red). Si la DB no está
  disponible, degrada a un contexto taxonómico sintético para poder validar el
  pipeline completo sin Supabase.
- `--inject-invalid` — (con `--mock`) añade un reactivo inválido para demostrar
  el rechazo.

### Verificación

- ✅ **Dry-run mockeado end-to-end:** `--count 3 --dry-run --mock --inject-invalid`
  → 3 válidos (insertables con `isVerified=false`), 1 rechazado y registrado en
  el log JSONL. No se tocó la DB.
- ✅ **25 tests nuevos de Vitest** (`tests/scripts/question-draft-schema.test.ts`):
  casos válidos, 0/2 correctas, <4 opciones, opción vacía, ids duplicados, capa
  faltante, capa duplicada, contenido vacío, dificultad inválida, LaTeX
  malformado (stem y `latexContent`), extracción de LaTeX, dedupe, y parseo de
  salida del modelo (limpio, con cercas, con texto alrededor, objeto suelto,
  basura). **Suite total: 53 tests en verde** (28 de CC-03 + 25 nuevos).
- ✅ `pnpm typecheck` en verde.
- ✅ `pnpm lint` en verde.

### 🟡 TODOs (bloqueados por infraestructura o de sesiones posteriores)

- [ ] **Ejecución real contra la API:** `ANTHROPIC_API_KEY` en `.env.local` es un
  placeholder (`sk-ant-your-api-key`). Cuando se configure una key real, correr
  `npx tsx scripts/generate-questions.ts --topic <id real> --count 5` (sin
  `--mock`, sin `--dry-run`) para el primer batch real. El código ya está listo;
  solo falta la credencial y una DB sembrada.
- [ ] **DB sembrada:** `content-coverage.ts` e inserción real requieren Supabase
  con la taxonomía sembrada (mismo bloqueo transversal que CC-01/02/03).
- [ ] **Etapa 3 (revisión humana):** panel admin para pasar `isVerified` a `true`
  (sesión CC-2x).
- [ ] **Etapa 4 (staging):** pool de prueba de 2 semanas + umbral de reportes
  (producto, post-MVP del pipeline).
- [ ] Afinar few-shots por materia con un especialista STEM (el PRD marca que
  matemáticas avanzadas, química orgánica y física necesitan revisor especialista).

### Guardrails respetados

- ✅ La API de Anthropic **solo** se usa en `scripts/` (nunca en `src/` ni `app/`).
- ✅ `ANTHROPIC_API_KEY` se lee con `dotenv` en el script, nunca con prefijo
  `NEXT_PUBLIC_`.
- ✅ Reactivos entran con `isVerified = false` (ninguno visible sin revisión).
- ✅ No se modificó `prisma/schema.prisma`.

---

*Sprint 1 arranca con CC-05: el pipeline de contenido está construido y validado
en seco. Falta la credencial de Anthropic y la DB real para el primer batch en
vivo.*
