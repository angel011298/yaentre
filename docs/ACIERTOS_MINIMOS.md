# Aciertos mínimos por carrera — triangulación multi-fuente (CC-13)

Arranque en frío del Aciertómetro: de dónde sale cada `Career.minAciertos`, con
qué nivel de confianza, y por qué. Complementa `docs/EXTRACCION_ECOEMS.md`,
`docs/EXTRACCION_IPN.md` y `docs/FUENTES_ADICIONALES.md` (CC-09/CC-09b).

> **Nota sobre documentación:** `docs/12_Fuentes_Contenido_v2.1.md` no existe
> con ese nombre en el repo (mismo patrón que en sesiones anteriores — ver
> CC-06, CC-09). Se procedió con el objetivo de la tarea directamente.

---

## Metodología

Para cada carrera se buscó su corte de admisión en dos categorías de fuente:

- **(a) Oficial/transparencia** — resultados publicados directamente por la
  institución o vía una solicitud de transparencia (Plataforma Nacional de
  Transparencia, PNT).
- **(b) Compilaciones públicas** — artículos y sitios de terceros que
  recopilan aciertos mínimos por carrera (blogs de preparación, medios).

**Regla de confianza** (adaptada del criterio de la tarea a lo que realmente
se pudo verificar por institución — ver justificación por institución abajo):

| Confianza | Cuándo se asigna |
|---|---|
| 🟢 **HIGH** | Hay una fuente oficial primaria de transparencia/resultados (categoría a) — el dato es el resultado real, no una estimación de terceros. |
| 🟡 **MED** | No hay fuente oficial primaria, pero ≥2 fuentes independientes coinciden (±2 aciertos). |
| 🔴 **LOW** | Las fuentes divergen (>±2), o solo se encontró una fuente débil/no verificable, o no se encontró ninguna fuente confiable. Se usa el valor **más alto** (más conservador: mejor sobreestimar la meta que subestimarla). |

**Nunca se inventó un número.** Donde no hubo fuente utilizable, el valor
previo de CC-07/CC-08 (una estimación razonada, no verificada) se conservó
explícitamente marcado `LOW` con una nota de "sin verificación en esta
sesión" — no se presenta como un dato investigado si no lo fue.

---

## UNAM — 26 carreras, todas con fuente oficial primaria (HIGH/MED)

**Hallazgo central de esta sesión:** UNAM (DGAE) publica un portal público de
resultados por carrera-plantel, sin necesidad de cuenta ni pago —
`dgae.unam.mx/Licenciatura2025/resultados/...` — con el resumen exacto
`Oferta=... Aspirantes=... Presentaron Examen=... Aciertos Minimos=...
Seleccionados=...` para el Concurso de Selección Licenciatura **2025**. Esto
es la fuente (a) categoría oficial/transparencia que la tarea pedía, y
**se verificó una por una con una petición HTTP real a cada URL** (no se
asumió ninguna).

**Validación cruzada de metodología:** se contrastaron 3 valores (Médico
Cirujano, Arquitectura, Derecho) contra una búsqueda web independiente —
**coincidieron exacto (±0) en las 3** — lo que da alta confianza en que el
resto de las lecturas directas del portal son igualmente correctas.

| Área | Carrera | Aciertos mín. | Año | Confianza | Fuente |
|---|---|---|---|---|---|
| 1 · Físico-Matemáticas | Ingeniería en Computación | **101** | 2025 | 🟢 HIGH | [DGAE](https://www.dgae.unam.mx/Licenciatura2025/resultados/1/11000115.html) |
| 1 | Ingeniería Eléctrica Electrónica | **97** | 2025 | 🟢 HIGH | [DGAE](https://www.dgae.unam.mx/Licenciatura2025/resultados/1/10900115.html) |
| 1 | Ingeniería en Telecomunicaciones | **90** | 2025 | 🟢 HIGH | [DGAE](https://www.dgae.unam.mx/Licenciatura2025/resultados/1/11100115.html) |
| 1 | Ingeniería Mecánica | **104** | 2025 | 🟢 HIGH | [DGAE](https://www.dgae.unam.mx/Licenciatura2025/resultados/1/11500115.html) |
| 1 | Ingeniería Civil | **88** | 2025 | 🟢 HIGH | [DGAE](https://www.dgae.unam.mx/Licenciatura2025/resultados/1/10700115.html) |
| 1 | Arquitectura | **96** | 2025 | 🟢 HIGH | [DGAE](https://www.dgae.unam.mx/Licenciatura2025/resultados/1/10200015.html) + [Conamat](https://www.conamat.com/blog/aciertos-por-carrera-unam-2025-ranking-por-plantel-y-área) (±0) |
| 1 | Matemáticas Aplicadas | **101** | 2025 | 🟢 HIGH | [DGAE](https://www.dgae.unam.mx/Licenciatura2025/resultados/1/13600035.html) |
| 1 | Física | **104** | 2025 | 🟢 HIGH | [DGAE](https://www.dgae.unam.mx/Licenciatura2025/resultados/1/10600035.html) |
| 2 · Biológicas | Médico Cirujano | **114** | 2025 | 🟢 HIGH | [DGAE](https://www.dgae.unam.mx/Licenciatura2025/resultados/2/20800125.html) + [Conamat](https://www.conamat.com/blog/aciertos-por-carrera-unam-2025-ranking-por-plantel-y-área) (±0) |
| 2 | Cirujano Dentista | **100** | 2025 | 🟢 HIGH | [DGAE](https://www.dgae.unam.mx/Licenciatura2025/resultados/2/20200145.html) |
| 2 | Biología | **95** | 2025 | 🟢 HIGH | [DGAE](https://www.dgae.unam.mx/Licenciatura2025/resultados/2/20100035.html) |
| 2 | Química Farmacéutico Biológica | **104** | 2025 | 🟢 HIGH | [DGAE](https://www.dgae.unam.mx/Licenciatura2025/resultados/2/21300055.html) |
| 2 | Enfermería | **75** | 2025 | 🟢 HIGH | [DGAE](https://www.dgae.unam.mx/Licenciatura2025/resultados/2/22000095.html) |
| 2 | Ecología | **63** | 2025 | 🟢 HIGH | [DGAE](https://www.dgae.unam.mx/Licenciatura2025/resultados/2/22503005.html) (FES Iztacala — varía por plantel, ver nota) |
| 3 · Sociales | Derecho | **89** | 2025 | 🟢 HIGH | [DGAE](https://www.dgae.unam.mx/Licenciatura2025/resultados/3/30500075.html) + [Conamat](https://www.conamat.com/blog/aciertos-por-carrera-unam-2025-ranking-por-plantel-y-área) (±0) |
| 3 | Economía | **76** | 2025 | 🟢 HIGH | [DGAE](https://www.dgae.unam.mx/Licenciatura2025/resultados/3/30600085.html) |
| 3 | Administración | **90** | 2025 | 🟢 HIGH | [DGAE](https://www.dgae.unam.mx/Licenciatura2025/resultados/3/30100065.html) |
| 3 | Contaduría | **86** | 2025 | 🟢 HIGH | [DGAE](https://www.dgae.unam.mx/Licenciatura2025/resultados/3/30400065.html) |
| 3 | Ciencias Políticas y Admón. Pública | **92** | 2025 | 🟢 HIGH | [DGAE](https://www.dgae.unam.mx/Licenciatura2025/resultados/3/30300045.html) |
| 3 | Sociología | **73** | 2025 | 🟢 HIGH | [DGAE](https://www.dgae.unam.mx/Licenciatura2025/resultados/3/31100045.html) |
| 3 | Antropología | **74** | 2025 | 🟢 HIGH | [DGAE](https://www.dgae.unam.mx/Licenciatura2025/resultados/3/31900045.html) |
| 3 | Ciencias de la Comunicación *(reasignada, ver abajo)* | **98** | 2025 | 🟢 HIGH | [DGAE](https://www.dgae.unam.mx/Licenciatura2025/resultados/3/30200045.html) |
| 4 · Humanidades | Lengua y Literaturas Hispánicas | **69** | 2025 | 🟢 HIGH | [DGAE](https://www.dgae.unam.mx/Licenciatura2025/resultados/4/41400105.html) |
| 4 | Filosofía | **81** | 2025 | 🟢 HIGH | [DGAE](https://www.dgae.unam.mx/Licenciatura2025/resultados/4/41100105.html) |
| 4 | Historia | **68** | 2025 | 🟢 HIGH | [DGAE](https://www.dgae.unam.mx/Licenciatura2025/resultados/4/41200105.html) |
| 4 | Arte y Diseño | **48** | 2025 | 🟡 **MED** | [DGAE](https://www.dgae.unam.mx/Licenciatura2025/resultados/4/43402055.html) (Plantel Taxco) vs. [N+](https://www.nmas.com.mx/nacional/carreras-menos-aciertos-unam-2025-cuales-piden-puntaje-bajo-examen-licenciatura-lista/) cita 45 (±3, fuera de ±2) |

### 🔴 Correcciones y retiros (honestidad del dato)

Tres carreras del seed original de CC-07 **no existen** en la oferta real de
UNAM tal como estaban nombradas/ubicadas — verificado contra el índice
oficial de resultados de su área:

- **"Ciencias de la Salud" (Área 2) — retirada.** No aparece en el índice de
  resultados del Área 2 con ese nombre ni uno similar. No se inventó un
  cruce.
- **"Artes Musicales" (Área 4) — retirada.** La Facultad de Música ofrece
  programas específicos (Canto, Composición, Piano, Instrumentista,
  Etnomusicología, Educación Musical...), no un genérico "Artes Musicales".
- **"Comunicación Social" (Área 4) — reasignada.** La carrera real es
  **Ciencias de la Comunicación** y pertenece al **Área 3** (Ciencias
  Políticas y Sociales), no al Área 4. Se corrigió tanto el nombre como el
  área.

Varias carreras además se renombraron a su nombre oficial exacto de DGAE
(p. ej. "Medicina" → "Médico Cirujano", "Ciencia Política" → "Ciencias
Políticas y Administración Pública", "Contabilidad" → "Contaduría").

### Nota sobre "Ecología" (variación por plantel)

DGAE publica resultados **por plantel**, no uno solo por carrera. Ecología
tiene 3 planteles con cortes distintos: FES Iztacala (usado aquí, 63),
además de ENES Morelia y ENES Mérida con aciertos mínimos más bajos según
una fuente secundaria (~41 en Morelia). Se usó el plantel de mayor demanda/
prestigio relativo como referencia única por carrera — el mismo criterio
aplicado a todas las carreras multi-plantel (Facultad principal / CU cuando
existe).

---

## IPN — 21 carreras, ninguna con fuente oficial primaria verificable (MED/LOW)

**Hallazgo central:** a diferencia de UNAM, **el IPN no tiene un portal
público de resultados por carrera.** `admision.ipn.mx/nse/sitio/` exige
cuenta de aspirante (login). Se confirmó además, leyendo directamente un
artículo de Conamat sobre resultados IPN 2026, esta cita textual:

> *"El IPN no publica una lista oficial de aciertos mínimos... las tablas
> [circulando en redes] son estimaciones de terceros, no datos oficiales del
> Instituto."*

Esto es exactamente el tipo de honestidad de dato que esta tarea pide
preservar: **ningún valor de IPN alcanza HIGH**, porque no existe una fuente
oficial primaria pública contra la cual verificar. El techo real de
confianza para IPN es MED (2 fuentes independientes coinciden) o, con más
frecuencia, LOW.

Se usaron 2 compilaciones de terceros, que además citan **ciclos/rondas
distintos** del proceso de admisión (esto explica gran parte de la
divergencia observada, no es necesariamente un error de ninguna fuente):

- **unibetas.com** — tabla que afirma ser "datos oficiales del IPN, ciclo
  2024" (primera ronda regular, no verificable independientemente).
- **fabricadeperiodismo.com** — cita una solicitud a la Plataforma Nacional
  de Transparencia (folio PNT 340021800233525) para el proceso de
  **"segunda vuelta" enero-agosto 2026** (asignación de lugares sobrantes,
  típicamente con dinámica de demanda distinta a la ronda regular).

**Regla aplicada ante divergencia:** se usó el valor **más alto** de las dos
fuentes (más conservador — mejor que el usuario se prepare para un corte
más exigente de lo necesario que para uno insuficiente).

| Rama | Carrera | Aciertos mín. usado | Confianza | unibetas (2024) | Transparencia PNT (2ª vuelta 2026) |
|---|---|---|---|---|---|
| Físico-Matemáticas | Ingeniería en Sistemas Computacionales (ESCOM) | **97** | 🔴 LOW | 67 | 97 |
| Físico-Matemáticas | Ingeniería Eléctrica (ESIME) | **99** | 🔴 LOW | 99 | 75 |
| Físico-Matemáticas | Ingeniería Mecánica (ESIME) | **94** | 🔴 LOW | 94 | 65 |
| Físico-Matemáticas | Ingeniería en Comunicaciones y Electrónica | **93** | 🔴 LOW | 93 | 43 |
| Físico-Matemáticas | Ingeniería Civil (ESIA) | **70** | 🔴 LOW | 70 | 59 |
| Físico-Matemáticas | Ingeniería Química (ESIQIE) | **94** | 🔴 LOW | 94 | 41-66 (mapeo ambiguo) |
| Físico-Matemáticas | Ingeniería Matemática (ESFM) *(renombrada)* | **95** | 🔴 LOW | 95 | 91 |
| Físico-Matemáticas | Lic. en Física y Matemáticas (ESFM) *(renombrada)* | **104** | 🔴 LOW | 91 | 104 |
| Médico Biológicas | **Médico Cirujano y Partero (ESM)** *(renombrada)* | **109** | 🟡 **MED** | 109 | 117 (2ª vuelta, no usado) |
| Médico Biológicas | Lic. en Odontología (CICS) *(renombrada)* | **115** | 🔴 LOW | 102 | 115 |
| Médico Biológicas | Lic. en Biología (ENCB) *(renombrada)* | **110** | 🔴 LOW | 98 | 110 |
| Médico Biológicas | Químico Farmacéutico Industrial (ENCB) *(renombrada)* | **110** | 🔴 LOW | 100 | 110 |
| Médico Biológicas | Lic. en Enfermería y Obstetricia (ESEO) *(renombrada)* | **111** | 🔴 LOW | 94 | 111 |
| Médico Biológicas | Lic. en Psicología (CICS) | **93** | 🔴 LOW | 93 (única fuente) | — |
| Médico Biológicas | Bioquímica Clínica (ENCB) | **92** | 🔴 LOW | — (sin verificar) | — |
| Sociales-Admin. | Administración (CIMA) | **99** | 🔴 LOW | 99 | 87 |
| Sociales-Admin. | Contabilidad (CIMA) | **97** | 🔴 LOW | 83 | 97 |
| Sociales-Admin. | Comercio Internacional (CIMA) | **107** | 🔴 LOW | 93 | 107 |
| Sociales-Admin. | Economía (CICS) | **94** | 🔴 LOW | 94 | 73 (mapeo incierto) |
| Sociales-Admin. | Turismo (CIMA) | **100** | 🔴 LOW | 76 | 100 |
| Sociales-Admin. | Gestión y Dirección de Empresas | **78** | 🔴 LOW | — (sin verificar) | — |

### Correcciones de nombre (IPN)

6 carreras se renombraron a su nombre oficial real, tomado de
`scripts/extraction/ipn.taxonomy.json` (verificado en CC-09b contra la
oferta educativa publicada por el IPN):

| Nombre CC-08 (aproximado) | Nombre real (CC-09b/CC-13) |
|---|---|
| Medicina (ESM) | Médico Cirujano y Partero (ESM) |
| Cirugía Dental (ESD) — *no existe* | Licenciatura en Odontología (CICS) |
| Biología (Ciencias Biológicas) | Licenciatura en Biología (ENCB) |
| Química Farmacéutica (ENCB) | Químico Farmacéutico Industrial (ENCB) |
| Enfermería (ESM) | Licenciatura en Enfermería y Obstetricia (ESEO) |
| Matemáticas (Ciencias Básicas) | Ingeniería Matemática (ESFM) |
| Física (Ciencias Básicas) | Licenciatura en Física y Matemáticas (ESFM) |

Las carreras de la rama Sociales-Administrativas (Administración,
Contabilidad, Comercio Internacional, Economía, Turismo, Gestión y Dirección
de Empresas) **no pudieron verificarse contra `ipn.taxonomy.json`**: ese
artefacto (extraído de la guía oficial de estudio, no de la oferta educativa
completa) solo cubre las carreras de UPIICSA, mientras que estas son
probablemente de ESCA (Escuela Superior de Comercio y Administración, no
cubierta en CC-09b). Se mantienen los nombres de CC-08 sin corregir —
**pendiente de verificación futura**, no se inventó una corrección sin
evidencia.

---

## Mecanismo de auto-mejora post-launch (diseño, no implementado)

`minAciertos` es un **arranque en frío**: la mejor estimación disponible
antes de tener datos propios de usuarios reales. El diseño para que esto se
recalibre solo con el tiempo (a implementar en una sesión futura del motor
adaptativo, CC-11+):

1. **Percentiles propios cuando haya volumen suficiente.** Una vez que
   `ExamSession` en modo `FULL_SIMULATION` acumule un número mínimo de
   sesiones completadas por carrera objetivo (`UserProfile.targetCareerId`),
   el Aciertómetro puede calcular un percentil real de la base de usuarios
   de Acierta, independiente de la fuente externa. Umbral sugerido: ≥30
   sesiones completas por carrera antes de considerar el percentil propio
   "estable" (evita ruido de muestras chicas).
2. **Blend gradual, no reemplazo abrupto.** Mientras el volumen propio sea
   bajo, el Aciertómetro sigue centrado en `Career.minAciertos` (la
   triangulación externa). Conforme crece el volumen, la meta puede
   ponderarse entre la fuente externa y el percentil propio
   (`peso_propio = min(sesiones_carrera / 30, 1)`), sin necesitar un salto
   discreto de "fuente externa" a "fuente propia".
3. **Actualización anual de la fuente externa.** `Career.minAciertosYear`
   ya registra el ciclo de referencia. Una tarea programada (o una sesión
   manual anual, dado que estos cortes se publican una vez al año tras cada
   proceso de admisión) puede re-ejecutar la triangulación de esta sesión
   para refrescar los valores oficiales de UNAM (DGAE publica resultados
   nuevos cada ciclo) y volver a intentar encontrar una fuente oficial para
   IPN.
4. **La confianza nunca debe subir sola.** Si en el futuro se automatiza el
   refresco, `minAciertosConfidence` debe recalcularse con la MISMA regla
   (fuente oficial → HIGH, 2 fuentes ±2 → MED, si no LOW) — nunca se debe
   "promover" a HIGH solo porque el dato lleva tiempo en la base.

---

## Regla de presentación (Aciertómetro)

**La meta nunca se presenta como una cifra absoluta.** Implementado en
`src/lib/adaptive/aciertometro.ts` (ver PROGRESO_SPRINT2.md § CC-13):
según la confianza, el copy cambia explícitamente —

- `HIGH` → *"Tu meta: ~96 aciertos"* (con nota de fuente/año visible en un
  tooltip, no en el número principal).
- `MED` → *"Tu meta estimada: ~96 aciertos"* (con aviso de que 2 fuentes
  coinciden pero no hay dato oficial).
- `LOW` → *"Tu meta estimada (dato preliminar): ~96 aciertos"* + aviso
  explícito de que la cifra es la más conservadora entre fuentes que no
  coinciden, sujeta a revisión.
- Sin dato → el Aciertómetro no muestra una meta numérica; muestra el
  progreso relativo (aciertos actuales, tendencia) sin un objetivo inventado.

---

## Verificación

- ✅ Las 26 URLs de DGAE UNAM se visitaron con una petición real (browser)
  durante esta sesión — no se asumió ningún dato.
- ✅ 3/3 valores UNAM corroborados contra una fuente independiente
  coincidieron exacto (±0).
- ✅ Ninguna carrera de IPN alcanza HIGH — reflejo honesto de que no existe
  una fuente oficial pública verificable para IPN.
- ✅ 2 carreras (UNAM "Ciencias de la Salud"/"Artes Musicales") se retiraron
  por no existir, en vez de inventar un cruce.
- ✅ `pnpm typecheck` y `pnpm lint` en verde tras los cambios de seed.
- 🟡 Aplicación real a la DB bloqueada por falta de `DATABASE_URL` (mismo
  bloqueo transversal de todas las sesiones de Sprint 1-2).
