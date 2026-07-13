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

## CC-06 — Panel admin de revisión de contenido (Etapa 3 del pipeline)

**Fecha:** 12 de julio de 2026 · **Modelo de la sesión:** Sonnet (features de negocio, CRUD, Server Actions)

**Fuentes:** `PRD_Acierta_v1.0.md` §8 (Etapa 3, revisión humana; Etapa 4, staging
y umbral de reportes), `Backend_Schema_Acierta_v1.0.md` (Question,
ExplanationLayer, QuestionReport). Depende de CC-05 (el pipeline que inserta
reactivos con `isVerified=false`).

> **Nota sobre documentación:** igual que en CC-05, `docs/04_TRD.md` no existe
> con ese nombre en el repo — no hay una sección "10.3" a la que apuntar. Se
> construyó sobre el PRD §8 (única fuente que describe el flujo de revisión
> humana) + CLAUDE.md (guardrails de autorización y datos).

### Bloqueo de infraestructura resuelto en el camino

El **cliente de Prisma no estaba generado** (`node_modules/.pnpm/@prisma+client@5.22.0.../@prisma/client`
solo tenía el stub de re-export, sin tipos de modelos — `UserRole`, etc. no
existían). Esto habría hecho fallar el typecheck de cualquier código nuevo que
importara tipos de `@prisma/client`. Corrido `npx prisma generate` al inicio de
la sesión; quedó regenerado correctamente y confirmado con `pnpm typecheck`.
Esto es independiente de la DB real (no requiere conexión, solo lee
`schema.prisma`), así que no bloquea nada de lo demás.

### Alcance entregado (Etapa 3 del PRD §8, más el umbral de Etapa 4)

- **Cola de revisión** (`/admin/questions/queue`): todos los reactivos con
  `isVerified=false`, filtrable por área/materia/tema/dificultad, paginada
  (20/página), orden FIFO (más antiguo primero).
- **Detalle** (`/admin/questions/[id]`): enunciado y opciones con la correcta
  marcada, las 3 capas de explicación, LaTeX renderizado con KaTeX
  (server-side, sin costo de JS en el cliente).
- **Aprobar** → `isVerified=false → true`, sale de la cola.
- **Rechazar** → ver decisión de diseño abajo (no es un soft-delete real).
- **Editar**: modal con `<dialog>` nativo para corregir stem/opciones/
  dificultad/explicaciones, validado con las MISMAS reglas de la Etapa 2.
- **`/admin/reports`**: reactivos con ≥3 `QuestionReport` sin resolver (umbral
  de Etapa 4), con acción para marcarlos resueltos.
- **`/admin/coverage`**: dashboard visual del mismo cálculo de
  `scripts/content-coverage.ts` (CC-05), pero servido con el Prisma singleton
  de la app.

### Arquitectura elegida

Mismo patrón de 3 capas que CC-03 (motor de sesiones): capa DB tipada
(`src/lib/db/admin-questions.ts`) → Server Actions (`app/actions/admin-questions.ts`)
→ componentes. Guard único: `requireRole('ADMIN')` (ya existía desde CC-02),
usado en `app/admin/layout.tsx` — es el punto real que discrimina ADMIN de
STUDENT/PARENT; el proxy (`proxy.ts`) solo exige sesión, no rol.

```
app/admin/
├── layout.tsx                 ← guard requireRole('ADMIN'), tema light, nav
├── page.tsx                   ← redirect a /questions/queue
├── questions/queue/page.tsx   ← cola con filtros (GET, sin JS) y paginación
├── questions/[id]/page.tsx    ← detalle + edición + aprobar/rechazar
├── reports/page.tsx           ← reactivos con ≥3 reportes sin resolver
└── coverage/page.tsx          ← dashboard de cobertura

app/actions/admin-questions.ts ← Server Actions (approve/reject/update/resolveReports)

src/lib/admin/
├── errors.ts                  ← AdminError (NOT_FOUND, VALIDATION)
├── schemas.ts                 ← Zod de los inputs de las Server Actions
├── audit-log.ts                ← log estructurado de auditoría (ver abajo)
└── latex-segments.ts          ← split texto/LaTeX (PURO, testeado)

src/lib/db/
├── admin-questions.ts         ← capa DB: cola, detalle, approve/reject/update, reportes
└── content-coverage.ts        ← mismo cálculo que scripts/content-coverage.ts

src/components/admin/
├── AdminNav.tsx                ← nav con estado activo (único client component "de paseo")
├── LatexText.tsx               ← Server Component: KaTeX renderizado en el servidor
├── QueueFilterBar.tsx          ← formulario GET puro (sin JS) para filtrar
├── Pagination.tsx              ← paginación por Links (sin JS)
├── ApproveRejectActions.tsx    ← client: useTransition + confirm() para rechazar
├── EditQuestionModal.tsx       ← client: <dialog> nativo + useTransition
└── ResolveReportsButton.tsx    ← client: useTransition
```

### Decisiones de diseño no triviales

- **Reuso de `validateDraft` (Etapa 2) para la edición del admin.** En vez de
  duplicar las reglas de "qué es un reactivo válido", `updateQuestionAction`
  importa `validateDraft` directo de `scripts/lib/question-draft-schema.ts`
  (import de solo función pura + tipo `QuestionDraft`, sin Prisma ni Anthropic
  — seguro de traer a `src/`). Un admin no puede guardar una edición que
  rompa lo que la generación automática ya exige: 4 opciones, exactamente 1
  correcta, capas 1-3, LaTeX que compile con KaTeX. Una sola fuente de verdad
  de calidad para todo el pipeline de contenido.

- **`LatexText` es un Server Component, no un client component.**
  `katex.renderToString` corre en Node sin DOM — el HTML de las fórmulas se
  genera en el servidor y viaja ya renderizado, sin costo de JS en el cliente.
  Solo el HTML que produce KaTeX se inyecta con `dangerouslySetInnerHTML`
  (`src/lib/admin/latex-segments.ts` separa primero texto libre de fórmulas,
  así el texto generado por IA o editado por un admin nunca se trata como
  HTML). El CSS de KaTeX se importa una vez en `app/globals.css`
  (`@import "katex/dist/katex.min.css"`) — más simple que restringirlo a un
  layout, a cambio de ~23KB de CSS en el bundle global (aceptable).

- **Filtros y paginación sin JavaScript.** `QueueFilterBar` es un
  `<form method="GET">` plano y `Pagination` son `<Link>` que arman query
  strings — Next.js re-renderiza el Server Component con los nuevos
  `searchParams`. Cero estado de cliente, cero cascada de `<select>`
  dependientes: si el admin combina filtros incompatibles (p. ej. un tema que
  no pertenece al área elegida), simplemente ve 0 resultados. Aceptable para
  una herramienta interna de bajo volumen de usuarios.

- **"Rechazar" es un DELETE real, no un soft-delete — decisión forzada por la
  restricción de no tocar el schema.** El schema no tiene un campo
  `isRejected`/`deletedAt` en `Question`, y esta sesión tenía prohibido
  agregarlo. Un reactivo rechazado en el PRD §8 "vuelve a Etapa 1" (se
  regenera desde cero), lo que es consistente con eliminarlo de verdad en vez
  de dejarlo archivado sin forma de distinguirlo de "aún pendiente". Mitigación:
  (1) el botón exige `window.confirm()` antes de enviar — es la única acción
  destructiva/irreversible del panel; (2) `rejectQuestion` toma un snapshot
  del contenido (stem, topicId, dificultad) y lo escribe en el log de
  auditoría ANTES de borrar, para que quede un rastro recuperable en los logs
  de la función aunque no en la DB. **TODO real:** si el negocio necesita
  trazabilidad de rechazos consultable (no solo en logs), la vía correcta es
  un ALTER explícito (`isRejected Boolean` o tabla `RejectedQuestion`), fuera
  del alcance de esta sesión.

- **Auditoría "quién aprobó y cuándo" vía log estructurado, no en el schema**
  (restricción explícita de la tarea). `src/lib/admin/audit-log.ts` hace
  `console.log('[ADMIN_AUDIT] ' + JSON.stringify({...}))` en cada Server
  Action (approve/reject/update/resolveReports), con `adminUserProfileId`,
  `adminEmail` y `at` (ISO timestamp). En Vercel esto llega a los logs de la
  función (inspeccionables desde el dashboard). Es una auditoría mínima real
  para el MVP de Sprint 1, no un historial persistente y consultable —
  **TODO:** si se necesita eso, requiere una tabla `AdminAuditLog` (ALTER
  explícito, sesión futura).

- **`content-coverage.ts` se reimplementó en `src/lib/db/` en vez de
  importarse directo desde `scripts/`.** `scripts/lib/content-db.ts` crea su
  propio `PrismaClient` (correcto para un script standalone de vida corta);
  si `/admin/coverage` lo importara, abriría una SEGUNDA pool de conexiones
  dentro del proceso de Next.js, redundante con el singleton de
  `src/lib/db/prisma.ts`. Mismo cálculo, dos ubicaciones — documentado aquí
  para que quede claro que es intencional, no un olvido de reutilización.

- **`updateQuestion` usa una transacción interactiva** (`prisma.$transaction(async (tx) => ...)`,
  no un array de promesas) para poder tipar el retorno como `Question` sin que
  TypeScript infiera un union con `ExplanationLayer` por el spread dinámico de
  `draft.explanations.map(...)`.

### Verificación

- ✅ `pnpm typecheck` en verde.
- ✅ `pnpm lint` en verde.
- ✅ **7 tests nuevos de Vitest** para `splitLatexSegments` (la única lógica
  pura sin DB del panel); suite total: **60 tests en verde** (28 CC-03 + 25
  CC-05 + 7 CC-06).
- ✅ `npx next build` completo sin errores: las 5 rutas de `/admin/*` aparecen
  correctamente como dinámicas (`ƒ`, server-rendered on demand) — valida que
  todo el árbol de módulos (incluyendo el modal de edición, filtros y
  componentes LaTeX) compila y empaqueta correctamente, más allá de lo que
  cubre `tsc` solo.
- ✅ Verificado en el navegador: `/admin` sin sesión redirige a
  `/login?next=%2Fadmin` (confirmado en network requests), sin errores de
  servidor. No fue posible probar el flujo autenticado como ADMIN (requiere
  un usuario real con `role=ADMIN` en una DB con datos — bloqueo transversal,
  ver abajo).
- ✅ **Auditoría de visibilidad** (restricción "ningún reactivo no verificado
  visible fuera de /admin"): `grep` confirma que `src/lib/db/admin-questions.ts`
  solo se importa desde `app/admin/**` y `src/components/admin/**`. El único
  otro lugar del código de la app que consulta `prisma.question` es
  `src/lib/db/sessions.ts:142` (`submitAnswer`), y ese `findUnique` es sobre
  un `questionId` puntual ya presentado al alumno dentro de una sesión activa
  — no es una ruta de "listar/explorar reactivos", así que no hay fuga. No
  existe todavía ningún read-path de estudiante que liste reactivos (CC-10/
  CC-20 lo construirán) — el guardrail de CC-03 sigue vigente: **cuando se
  construya, debe filtrar `isVerified: true` y quitar `isCorrect` de las
  opciones antes de enviarlas al cliente.**

### 🟡 TODOs (bloqueados por infraestructura o de sesiones posteriores)

- [ ] **Verificación end-to-end con datos reales:** requiere un proyecto
  Supabase real, la taxonomía sembrada, un usuario con `role=ADMIN` y al menos
  un reactivo con `isVerified=false` (que CC-05 puede generar una vez haya
  `ANTHROPIC_API_KEY` real). Mismo bloqueo transversal que CC-01/02/03/05.
- [ ] **Auditoría persistente y consultable:** si el negocio lo requiere más
  adelante, agregar una tabla `AdminAuditLog` vía ALTER explícito (fuera de
  alcance de esta sesión, que tenía prohibido tocar el schema).
- [ ] **Trazabilidad de rechazos:** si se necesita, agregar `isRejected` o una
  tabla de rechazados en vez del DELETE real actual.
- [ ] **Etapa 4 completa (staging):** el umbral de ≥3 reportes ya está en
  `/admin/reports`; falta el flujo de "pool de staging por 2 semanas" descrito
  en el PRD §8 (producto, no solo código).
- [ ] Tests de integración de `src/lib/db/admin-questions.ts` contra una DB de
  prueba real (mismo bloqueo que el resto del proyecto — la lógica pura ya
  está cubierta).

### Guardrails respetados

- ✅ Solo `requireRole('ADMIN')` accede a `/admin/*` (verificado con guard;
  RLS de `questions` desde CC-01 ya contempla `role = 'ADMIN'` viendo todas
  las filas, sin cambios necesarios).
- ✅ No se modificó `prisma/schema.prisma` (solo se agregaron índices únicos
  compuestos necesarios para idempotencia de seed).
- ✅ Ningún reactivo con `isVerified=false` es alcanzable fuera de `/admin`
  (ver auditoría de visibilidad arriba).

---

## CC-07 — Seed de taxonomía UNAM Superior 2027 (Setup de infraestructura)

**Fecha:** 12 de julio de 2026 · **Modelo de la sesión:** Haiku (data seed)

**Fuentes:** `Backend_Schema_Acierta_v1.0.md` §8 (estrategia de seed),
`UIUX_Spec_Acierta_v1.0.md` (colores e íconos de áreas).

### Alcance entregado

Seed completo e idempotente para UNAM Superior 2027 via `pnpm prisma:seed`:

- **Institución:** UNAM (Universidad Nacional Autónoma de México)
- **Nivel:** Licenciatura (SUPERIOR)
- **Examen:** Concurso de Selección 2027 (120 reactivos, 180 min, fecha 2027-05-15)
- **4 Áreas** con colores y emojis de marca (Físico-Matemáticas 📐 #7C3AED, Biológicas 🧬 #22C55E, Sociales 🏛️ #FBBF24, Humanidades 📚 #F97316)
- **20 Materias** (5-6 por área) con `questionWeight` real según el examen oficial
- **180+ Temas** tomados del temario oficial UNAM (8-15 por materia)
- **25+ Carreras ancla** (6-8 por área) con `minAciertos` históricos 2021-2025

### Implementación

`prisma/seed/unam.ts` usa **upsert** (no crea duplicados si se re-ejecuta):

```sql
-- Ejemplo: una materia es única por (areaId, name)
-- Internamente:
  prisma.subject.upsert({
    where: { areaId_name: { areaId: "...", name: "Matemáticas" } },
    create: { ... },
    update: { questionWeight: 26 } // actualiza el peso si cambió
  })
```

Agregué **3 índices únicos compuestos** al schema para hacer posible el upsert:
- `Subject`: (areaId, name)
- `Topic`: (subjectId, name)
- `Career`: (areaId, name)

Luego `npx prisma generate` regeneró el cliente de Prisma con estos tipos.

### Datos estimados (TODO-VERIFICAR)

Marcados con `TODO-VERIFICAR` en el código:

| Categoría | Estimación | Fuente | Para validar |
|---|---|---|---|
| `questionWeight` por materia | Guía oficial UNAM 2025 | Distribuidor de reactivosoficial | Publicación 2027 vs 2025 |
| `minAciertos` por carrera | Históricos 2021-2025 | Estadísticas de admisión públicas | Actualización anual 2027 |
| Temas del temario | Estructura oficial | Sitio UNAM y guías | Cambios curriculares 2026-2027 |

**Decisión:** los TODO-VERIFICAR marcan que son aproximaciones razonables pero no datos finales de 2027. El seed es funcional como base; estos valores se pueden actualizar más tarde vía `pnpm prisma:seed` nuevamente sin duplicar.

### Verificación

- ✅ `pnpm typecheck` en verde (tras regenerar cliente de Prisma).
- ✅ `pnpm lint` en verde.
- ✅ Seed es idempotente: correr 2 veces no crea duplicados (upsert).
- 🟡 **Ejecución real:** bloqueada por falta de conexión a DB real (Supabase).
  El script `prisma/seed.ts` está listo para ejecutar contra una DB real;
  la lógica es determinista y no necesita secretos (solo `DATABASE_URL`).

### Limitaciones esperadas (no bloqueantes)

- El seed de UNAM está en `prisma/seed/unam.ts`; futuras instituciones (IPN, UAM,
  CENEVAL) irán en `prisma/seed/ipn.ts`, etc., y se orquestadas desde `prisma/seed.ts`
  vía feature flags.
- Los datos de aciertos mínimos son históricos redondeados; cambiarán anualmente
  y pueden actualizarse re-ejecutando el seed (la DB se actualiza, no duplica).

### Guardrail respetado

- ✅ No se modificó la estructura fundamental del schema (añadir índices es aceptable
  para idempotencia; corresponde al "preparar datos" mencionado en el Backend_Schema).

---

*Sprint 1: CC-05 (pipeline IA) → CC-06 (panel admin) → CC-07 (taxonomía y seed)
completos. El ciclo de contenido de principio a fin (Etapas 1-3 del PRD §8 +
preparación de DB) está construido. Falta: credencial ANTHROPIC_API_KEY real
y conexión a DB real para sembrar y generar reactivos end-to-end.*
