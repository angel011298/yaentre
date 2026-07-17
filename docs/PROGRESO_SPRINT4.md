# PROGRESO SPRINT 4 — Acierta

> **Nota de secuencia:** este archivo arranca directo en CC-25 porque la tarea
> llegó fuera de orden — el plan (`08_Plan_Implementacion.md`) ubica esta
> sesión en Sprint 4 "junto al simulador, no antes", y depende explícitamente
> de CC-22 (dashboard). **Ni CC-22 ni el simulador (CC-2x) han corrido
> todavía** — Sprint 2 cerró en CC-13 (`PROGRESO_SPRINT2.md`); no existe
> `PROGRESO_SPRINT3.md`. Se construyó igual, en modo autónomo como pedía la
> tarea, dejando la integración mínima posible con lo que sí existe (el
> placeholder de dashboard de CC-10) para no inventar features de otras
> sesiones. Ver el detalle de esta decisión en CC-25 abajo.

---

## CC-25 — Examen muestra oficial (IP-seguro)

**Fecha:** 12 de julio de 2026 · **Modelo de la sesión:** Sonnet (feature de producto, integración)

**Fuentes:** `Backend_Schema_Acierta_v1.0.md` (`ContentSource`), `UIUX_Spec_Acierta_v1.0.md`
(sistema de diseño, componentes `Card`/`Button`). Depende de CC-09/CC-09b
(`ContentSource` con las guías oficiales) y, nominalmente, CC-22 (dashboard) —
ver nota de secuencia arriba.

> **Nota sobre documentación:** `docs/12_Fuentes_Contenido_v2.1.md` no existe
> con ese nombre en el repo — mismo patrón que en CC-06/CC-09/CC-09b/CC-13.
> Se procedió sobre el objetivo explícito de la tarea.

### Objetivo

Dejar que un aspirante practique con el examen muestra **oficial** de su
institución (el PDF real que UNAM/IPN/UAM publican) sin que Acierta
reproduzca esas preguntas como contenido interactivo propio — puro
enlace/embed con atribución, cero riesgo de propiedad intelectual.

### Alcance entregado

- **`/app/examen-oficial`** — lista los `ContentSource` disponibles (guía +
  atribución: institución, nivel, año, "material oficial de uso público").
- **`/app/examen-oficial/[externalRef]`** — detalle: copy de atribución
  exacto pedido por la tarea ("Este es el examen muestra oficial publicado
  por [institución]. Acierta te lo acerca; el material es propiedad de
  [institución]."), el PDF embebido en un `<iframe>` con fallback "Abrir en
  una pestaña nueva ↗", y CTA al simulador.
- **CTA de valor propio** en ambas pantallas: "¿Quieres practicar ilimitado
  con reactivos del mismo nivel? → Hacer un simulacro Acierta" enlazando a
  `/simulador` (ruta que construirá la sesión del simulador; no se fabricó
  una página falsa).
- **Un link visible** desde el dashboard placeholder actual (`app/(app)/app/page.tsx`,
  de CC-10) hacia `/app/examen-oficial` — CC-22 (el dashboard real) no ha
  corrido, así que se integró con lo mínimo que existe hoy en vez de construir
  un dashboard completo fuera de alcance.
- **`src/lib/db/content-sources.ts`**: capa de lectura pura,
  `listOfficialSampleSources()` / `getOfficialSampleSource()`.
- **TODO-LEGAL explícito** en el código (comentario en
  `[externalRef]/page.tsx`) y en este documento: la variante interactiva
  nativa de preguntas oficiales (reactivo por reactivo, clickeable dentro de
  la app) **requiere validación legal antes de reproducir preguntas
  oficiales en el producto de pago** — no implementada, ni planeada sin ese
  visto bueno.

### Decisión de diseño no trivial: `ContentSource.fileRef` como campo dual

El PDF de una guía puede vivir en dos estados: **URL pública oficial**
(embebible/enlazable hoy, ej. las 4 guías UAM en `admision.uam.mx/guias/`) o
**path local sin publicar** (`docs/guias/...`, gitignored desde CC-09 por
tamaño/licencia — no existe en producción).

En vez de agregar un campo nuevo al schema (`prisma/schema.prisma` no debe
tocarse sin instrucción explícita, y esta tarea no la daba), se **reutilizó
`fileRef` como campo dual**: si empieza con `http`, es una URL pública
servible; si no, es un path local todavía no publicado. `listOfficialSampleSources()`
filtra por esto — **solo se listan fuentes con URL pública confirmada**, así
que todo lo que aparece en la pantalla abre un PDF real, nunca un enlace
roto. Se documentó el nuevo significado en el comentario del campo (cambio de
comentario únicamente, sin migración).

### Qué SÍ tiene URL pública verificada hoy (aparecerá en la lista)

Las 4 guías UAM, confirmadas de nuevo en esta sesión (`curl -I`, HTTP 200,
`Content-Type: application/pdf`) contra `admision.uam.mx/guias/*.pdf` —
`uam_cbi.taxonomy.json`, `uam_cbs.taxonomy.json`, `uam_csh.taxonomy.json`,
`uam_cad.taxonomy.json` actualizados con la URL real en vez del path local.

### Qué NO tiene URL pública verificada (no aparecerá hasta resolverlo)

**ECOEMS (guía IPN-UNAM Media Superior) e IPN Superior** — investigado de
nuevo en esta sesión (búsqueda web dedicada): ninguna de las dos tiene un PDF
individual con URL pública estable confirmada. El acceso "oficial" real
requiere completar el registro de un examen (`miderechomilugar.gob.mx`,
`app.dems.ipn.mx`) o, para el nivel Superior del IPN, aparece incluso descrito
como trámite de **venta** en el portal `gob.mx`
(`IPN3909 — Venta de guía de estudio`). Los PDFs que sí tengo localmente
(`docs/guias/guia_ECOEM.pdf`, `docs/guias/Guia_IPN.pdf`) fueron
proporcionados directamente por el usuario, no descargados por Claude desde
una URL estable — por eso su `fileRef` sigue siendo el path local y **no
aparecen en `/app/examen-oficial` hasta que alguien confirme una URL pública
o se suban a un storage público** (Supabase Storage, ya en el stack, pero sin
credenciales disponibles en esta sesión offline).

**Esto es intencional, no un bug:** mostrar un enlace a algo que no se puede
verificar como públicamente accesible violaría la garantía de "sin
recapturar, con atribución clara" que pide esta tarea — es preferible mostrar
menos fuentes, todas reales, que una fuente con un link potencialmente roto o
de licencia dudosa.

### Verificación

- ✅ `pnpm typecheck` y `pnpm lint` en verde.
- ✅ 68 tests en verde (sin regresión — esta sesión no tocó lógica pura
  nueva que ameritara tests, es contenido/integración).
- ✅ `npx next build`: `/app/examen-oficial` y
  `/app/examen-oficial/[externalRef]` compilan como rutas dinámicas.
- ✅ Verificado en navegador: ambas rutas, sin sesión, redirigen a
  `/login?next=...` correctamente (mismo guard que el resto de `/app/*`),
  sin errores de servidor.
- ✅ Las 4 URLs de UAM reverificadas en vivo (HTTP 200) antes de construir la
  feature sobre ellas.
- 🟡 No se pudo verificar el renderizado con datos reales (listar
  `ContentSource` reales, ver el embed del PDF) — bloqueado por falta de
  `DATABASE_URL`, mismo bloqueo transversal de todas las sesiones anteriores.
  Cuando haya DB real, sembrar `ContentSource` (correr `pnpm content:ingest`
  con las 4 guías UAM) para ver la lista poblada.

### Guardrails respetados

- ✅ Cero preguntas oficiales recapturadas como contenido de la app — solo
  enlace/embed del documento original.
- ✅ Atribución visible e inequívoca en cada pantalla.
- ✅ Conecta con el simulador Acierta como siguiente paso, en ambas pantallas.
- ✅ TODO-LEGAL documentado en código y aquí para la variante nativa futura.
- ✅ No se modificó `prisma/schema.prisma` de forma estructural (solo un
  comentario aclaratorio en un campo existente, sin migración).

---

*Sprint 4 (fuera de secuencia): CC-25 queda listo esperando a CC-22 (dashboard
real) y al simulador. Cuando esas sesiones corran, el único ajuste esperado es
mover el link de `/app/examen-oficial` del placeholder actual a su lugar
definitivo en el dashboard — la feature en sí no necesita cambios.*
