# Catálogo de fuentes adicionales de contenido

Complementa `docs/EXTRACCION_ECOEMS.md` y `docs/EXTRACCION_IPN.md` (CC-09). Este
documento registra el resultado de la búsqueda de fuentes oficiales y públicas
adicionales para UNAM, IPN, CENEVAL y UAM, con su URL, si son de descarga
directa, y su estado de ingesta.

> **Nota sobre documentación:** `docs/12_Fuentes_Contenido_v2.1.md` no existe
> con ese nombre en el repo (mismo patrón que `docs/04_TRD.md` en sesiones
> anteriores). El catálogo de categorías a buscar se tomó directamente de las
> TAREAS de esta sesión (guía UNAM por área, ediciones pasadas de ECOEMS,
> manual EXANI-II de CENEVAL, guía UAM, temarios oficiales).

**Método de verificación:** cada URL se comprobó con una petición `HEAD` real
(`curl -I`) para confirmar `HTTP 200` + `Content-Type: application/pdf` sin
autenticación, y se descargó para confirmar que el contenido corresponde a lo
anunciado (portada, tabla de contenido) antes de tratarla como fuente válida.

---

## Resumen por institución

| Institución | Fuente | Acceso | Estado |
|---|---|---|---|
| UNAM | Guía Superior por área (temario específico) | 🔒 Requiere registro + pago del examen | Listada para acción del usuario |
| UNAM | "¿Cómo ingreso a la UNAM?" 2026 | 🟢 Público directo | Descargada, registrada como referencia general (sin temario) |
| UNAM | "¿Cómo ingreso a la UNAM?" 2024-2025 | 🟢 Público directo | Descargada, registrada como referencia general (sin temario) |
| UNAM/IPN | ECOEMS ediciones anteriores | 🟡 Sin PDF individual público (web app / tienda de pago) | Ver detalle abajo |
| CENEVAL | Guía EXANI-II (variante UAA) | 🟢 Público directo | Descargada, **NO ingerida — marcada para revisión legal** |
| CENEVAL | Guía Nuevo EXANI-I | 🟢 Público directo | Descargada, **NO ingerida — marcada para revisión legal** |
| UAM | Guía CBI (Ciencias Básicas e Ingeniería) | 🟢 Público directo | Descargada e ingerida (temario, pesos placeholder) |
| UAM | Guía CBS (Ciencias Biológicas y de la Salud) | 🟢 Público directo | Descargada e ingerida (temario, pesos placeholder) |
| UAM | Guía CSH (Ciencias Sociales y Humanidades) | 🟢 Público directo | Descargada e ingerida (temario, pesos placeholder) |
| UAM | Guía CAD (Ciencias y Artes para el Diseño) | 🟢 Público directo | Descargada e ingerida (temario, pesos placeholder) |

---

## 1. UNAM — Guía Superior por área (temario específico)

**Prioridad: ALTA** (es el dato que corregiría los `TODO-VERIFICAR` de pesos de CC-07, nivel Superior).

- **No es de descarga pública directa.** Según la propia UNAM: *"para el ingreso a nivel licenciatura, el pago de tu derecho de examen incluye la descarga vía Internet de la Guía oficial de la UNAM del área de conocimiento correspondiente a la carrera en la que te registraste, sin costo adicional"* — la guía específica por área se libera **después de registrarte y pagar** el examen de un ciclo de admisión activo, dentro de tu cuenta de aspirante.
- También existe en venta impresa ($50 MXN) en la Tienda en Línea UNAM, sin relación con el ciclo de admisión vigente.
- **Instrucción exacta para el usuario:** si se desea esta guía, hay dos vías —
  1. Iniciar un registro real de aspirante a licenciatura en `dgae.unam.mx/admision_licenciatura/` para el ciclo vigente, pagar el derecho de examen, y descargar la guía del área desde la cuenta de aspirante. **Esto no es autónomo ni gratuito** (requiere pago real y datos de una persona aspirante).
  2. Comprar la edición impresa/PDF vigente en `tiendaenlinea.unam.mx` (ver ejemplo de un año anterior: `tiendaenlinea.unam.mx/productos/Libros/GUiA-2021-...`), colocarla en `docs/guias/unam_superior_area<N>.pdf`, y avisar para correr `pnpm content:ingest --source unam-superior-area<N>`.
- **No se intentó comprar ni registrar** — ambas acciones requieren pago y datos personales reales, fuera del alcance autónomo de esta sesión.

## 2. UNAM — Guías generales de admisión (públicas, sin temario)

Encontradas y descargadas directamente (HTTP 200, sin login):

- `https://repositorio.dgae.unam.mx/pdfs/ingreso_unam2026.pdf` — "¿Cómo ingreso a la UNAM? Bachillerato, Licenciatura y Posgrado", Ejemplar 2026, 51 págs, 2.6 MB.
- `https://escolar1.unam.mx/pdfs/licenciatura20242025.pdf` — misma serie, edición 2024-2025, 55 págs, 2.4 MB.

**Contenido:** proceso de admisión, fechas, requisitos — **no traen temario ni examen muestra por área**. Se descargaron a `docs/guias/` y se registran aquí como referencia, pero **no se construyó un artefacto de ingesta** para ellas: forzarlas al modelo Institution→Exam→Area sería artificial, ya que no describen un examen específico con reactivos. Quedan como material de consulta, no como fuente de calibración.

## 3. ECOEMS — ediciones anteriores (Media Superior)

**Prioridad: BAJA** (CC-09 ya ingirió la edición 2025 vigente).

- La página oficial del IPN (`ipn.mx/dems/servicios/guia-de-estudios.html`) no aloja un PDF descargable de años anteriores: enlaza a una **plataforma web** (`app.dems.ipn.mx/MaterialDeApoyoNMS/`) con el material del ciclo 2026, no un archivo único.
- Ediciones anteriores (p. ej. 2021) se encontraron **solo como producto de pago** en la Tienda en Línea UNAM.
- **Instrucción exacta si se quiere una edición anterior:** comprarla en `tiendaenlinea.unam.mx` (buscar "GUÍA ... PARA INGRESAR A LA EDUCACIÓN MEDIA SUPERIOR" + año), colocar el PDF en `docs/guias/ecoems_<año>.pdf`, avisar para correr la extracción.
- **Fuentes descartadas explícitamente por origen dudoso** (no oficiales, redistribución de terceros — **no descargadas**): `cursoecoems.mx`, `es.scribd.com`, `slideshare.net`. Estas aparecieron en la búsqueda pero violan la restricción explícita de la tarea ("no descargues de sitios dudosos ni de repositorios que redistribuyan material con copyright de terceros").

## 4. CENEVAL — Guía EXANI-II y Nuevo EXANI-I

**Prioridad: MEDIA** (UAM y CENEVAL están detrás de `NEXT_PUBLIC_ENABLE_EXANI=false`, no bloquean el launch).

Ambas descargadas directamente desde el dominio oficial `ceneval.edu.mx` (HTTP 200, sin login):

- `https://ceneval.edu.mx/wp-content/uploads/2023/02/EXANI-II_Guia-para-el-sustentante_2023_UAA.pdf` — "Guía para el sustentante — Examen de Admisión UAA (EXANI-II Ceneval)", 31 págs, 1.2 MB. Es la guía oficial de CENEVAL personalizada para el proceso de admisión de la Universidad Autónoma de Aguascalientes (la estructura/temario del EXANI-II es la misma en cualquier institución que lo aplique).
- `https://ceneval.edu.mx/wp-content/uploads/2021/09/1_Guia-EXANI-I_sm.pdf` — "Guía para el sustentante — Nuevo EXANI-I", 24 págs, 2.2 MB (examen para Media Superior, no Superior).

### ⚠️ Marcadas para revisión — NO ingeridas

La guía EXANI-II incluye este aviso explícito (pág. 5, en negritas y subrayado):

> *"El contenido de este instrumento se encuentra protegido por la Ley Federal del Derecho de Autor y la Ley de la Propiedad Industrial, las cuales consideran como infracción la fijación, reproducción, distribución, transportación o comercialización de este material sin el consentimiento de este Centro. **En caso de incurrir en alguna de estas situaciones su evaluación será cancelada.**"*

Esto es una restricción más estricta que la de ECOEMS/UAM (que solo tienen un aviso de derechos de autor estándar). La consecuencia explícita ("evaluación cancelada") sugiere que el contenido está atado a la integridad del proceso de examen de una persona sustentante específica, no a un uso general de referencia educativa.

**Decisión tomada:** se descargaron ambos PDFs (la descarga en sí es pública, sin restricción de acceso) y se guardan en `docs/guias/` para que puedas revisarlos, pero **no se construyó ningún artefacto de extracción ni se ingirió temario/reactivos** de ellos en esta sesión. Quedan pendientes de tu decisión: si confirmas que el uso interno de calibración (nunca servido a usuarios, ver `CALIBRATION_ONLY`) es aceptable bajo estos términos, aviso y corro la extracción en una sesión futura.

## 5. UAM — 4 guías divisionales (descargadas e ingeridas)

**Prioridad: MEDIA** (UAM está detrás de `NEXT_PUBLIC_ENABLE_UAM=false`, no bloquea el launch, pero es una institución nueva — nunca antes sembrada).

Las 4 divisiones académicas de la UAM tienen guía propia, todas públicas y descargadas directamente desde `admision.uam.mx/guias/` (HTTP 200, sin login):

| División | URL | Tamaño | Páginas |
|---|---|---|---|
| CBI — Ciencias Básicas e Ingeniería | `uam_guia_cbi.pdf` | 7.6 MB | 125 |
| CBS — Ciencias Biológicas y de la Salud | `uam_guia_cbs.pdf` | 1.2 MB | 58 |
| CSH — Ciencias Sociales y Humanidades | `uam_guia_csh.pdf` | 1.4 MB | 58 |
| CAD — Ciencias y Artes para el Diseño | `uam_guia_cad.pdf` | 2.0 MB | 62 |

**Licencia:** © Universidad Autónoma Metropolitana, ISBN por volumen — aviso de derechos de autor estándar, sin la cláusula de "evaluación cancelada" de CENEVAL. Comparable en alcance al aviso de la guía ECOEMS ya ingerida en CC-09.

### Dato oficial confirmado

El examen de selección UAM es **único y compartido por las 4 divisiones**: **120 preguntas, 3 horas**, dividido en Aptitudes (Razonamiento verbal + Razonamiento matemático [+ Razonamiento simbólico-abstracto solo en CAD]) y Conocimientos específicos (propio de cada división). Extraído textualmente de la guía CBI (p.1) y confirmado en CBS (p.5).

### Qué se ingirió

- 1 nueva institución (`UAM`), 1 nivel (`SUPERIOR`), 1 examen (`Examen de Selección UAM 2027`, 120 reactivos, 180 min).
- 4 áreas (una por división), con el temario real de "conocimientos específicos" transcrito de cada guía (ver `scripts/extraction/uam_c*.taxonomy.json`).

### 🟡 TODO-VERIFICAR — pesos por materia

A diferencia de ECOEMS (donde el peso de cada materia se derivó **contando la clave real** del examen muestra), aquí **no se extrajo** la sección "Claves de respuestas" de cada guía (CBI p.51, CBS p.54, CSH p.53, CAD p.57) en esta sesión — son PDFs de texto real (no escaneados, extraíbles con certeza) pero de 58-125 páginas cada uno, y hacerlo a fondo para las 4 divisiones es equivalente en esfuerzo a una sesión CC-09 completa por división.

**Decisión:** `Subject.questionWeight = 1` en las 4 divisiones — un placeholder explícito, NO una estimación de proporción (a diferencia de los pesos de CC-07/CC-08, que sí son estimaciones razonadas). Marcado en `weightsNote` de cada artefacto. El CLI de ingesta (`ingest-source.ts`) detecta este campo y reporta `⚠️ PLACEHOLDER, no derivados` en vez de "pesos oficiales" para no aparentar una precisión que no existe.

**No se transcribieron reactivos** de las secciones "Ejercicios similares al examen de selección": la guía aclara explícitamente que esos ejercicios *"NO aparecerán en el examen de selección"* (son práctica, no reactivos oficiales reales) y sus respuestas correctas están en una página de claves no extraída — sin la letra correcta verificada, no se puede cumplir el criterio de "exactamente 1 opción correcta confirmada" del pipeline. Cero inventados.

---

## Cambio de código: `partialCoverage`

Los pesos de ECOEMS se validan porque **una sola guía trae el examen completo** (10 asignaturas, 128 preguntas, todo en un artefacto). UAM es distinto: **4 guías separadas**, cada una cubre solo su división, todas apuntando al mismo examen de 120 preguntas. Validar "la suma de pesos de este artefacto == totalQuestions" no tiene sentido cuando el artefacto es deliberadamente parcial.

Se agregó `exam.partialCoverage: true` a `ExamMeta` (`scripts/lib/ingest-artifact.ts`) para que `validateTaxonomy()` omita esa comprobación cuando el artefacto declara explícitamente que solo cubre una parte del examen. Los 4 artefactos UAM usan este flag.

---

## Verificación

- ✅ Las 8 URLs candidatas se verificaron con `curl -I` (HTTP 200 + `Content-Type: application/pdf`) antes de descargar.
- ✅ Cada PDF se abrió y se confirmó que el contenido (portada, índice) corresponde a lo anunciado antes de tratarlo como fuente válida.
- ✅ `pnpm typecheck` y `pnpm lint` en verde.
- ✅ Dry-run de los 4 artefactos UAM: validación OK, reporta correctamente el estado placeholder de los pesos.
- ✅ Ninguna fuente de origen dudoso (scribd, slideshare, sitios de "guías contestadas") fue descargada.
- 🟡 CENEVAL: descargado pero explícitamente NO ingerido, pendiente de tu confirmación de uso aceptable.
- 🟡 UNAM Superior por área: NO descargable de forma autónoma (requiere pago/registro real) — instrucción exacta arriba.
