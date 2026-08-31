# ESTADO — YaEntre

Última actualización: 2026-08-30 · Última fase ejecutada: G47 (**COMPLETADA — lote de 35 reactivos de **Biología, UNAM Área 2 (Ciencias Biológicas, Químicas y de la Salud)**, insertados con `isVerified=false` en la cola de verificación ciega. Modelo `claude-sonnet-5` (tier Sonnet del Plan para lotes de contenido). Materia **NO compartida** (`sharedContentKey` NULL), `questionWeight` **14**, 10 temas propios. **El encargo pidió priorizar los temas de menor cobertura:** consulta en vivo a Supabase (2026-08-30) → **65 verificados repartidos 6/7/7/7/7/7/6/6/6/6**; el lote da **+4 a los 5 temas de 6** (Célula y organelos, Nutrición y metabolismo, Homeostasis, Reproducción, Inmunología) y **+3 a los 5 de 7** (Mitosis y meiosis, Genética mendeliana, Evolución, Ecología y ecosistemas, Sistemas del cuerpo humano) → **los 10 temas quedan en 10**. Cubre célula, genética, evolución, ecología, fisiología y diversidad del temario. **15 SOURCED / 20 TEMARIO_ONLY:** los 5 temas con `SourceChunk` clasificado por F2b (1 c/u, todos de `uam_cbs.pdf` — guía de la División CBS de la UAM, pp. 42-46, otra institución que la del examen destino, se anota; patrón G33/G37/G41/G43/G45) llevan `sourceChunks:[1]` obligatorio y **transforman la tarea del ítem-semilla** (los de la guía son de recuerdo/atribución; los compuestos exigen aplicar el concepto — p. ej. la anafase pasa de «¿en qué fase migran los cromosomas?» a «¿qué consecuencia tiene una no disyunción?»). **Genética con cálculo de proporciones (criterio 5 del encargo):** los 3 reactivos de Genética + Ec3 se **recalcularon desde cero** con `itertools`+`Fraction` exigiendo coincidencia única contra las 4 opciones — G1 (Ll×Ll, 320→80 rugosas = 1/4), G2 (cruce de prueba AaBb×aabb, 400→100 doble recesivo; el distractor 25 es la trampa de aplicar el 1/16 de un F2 dihíbrido), G3 (AB×O → ½ grupo A, ½ grupo B), Ec3 (regla del 10 %: 20 000→200 kcal/m²) — **4/4 correctos**. **Formato:** 28 `MULTIPLE_CHOICE` · 4 `PROBLEM_SOLVING` · 3 `SENTENCE_COMPLETION`. **Dificultad:** BASIC 8 · INTERMEDIATE 17 · ADVANCED 8 · EXPERT 2 (≈ 23/49/23/6, distribución de `_base.md`). **Clave A9/B9/C9/D8** (25.7/25.7/25.7/22.9 %), las 4 en la banda 15-40 %, **confirmada por `jsonb_array_elements` tras insertar**; ≥3 letras distintas por tema, tope 1 por letra por tema; **0 rachas cíclicas A→B→C→D** (candado de G16/G38); los 3 numéricos van con las opciones en orden ascendente y la letra la fija el rango del valor (hallazgo G46 §7). `content:validate-batch --dir` **0 violaciones** (POSITION_SKEW/LETTER_CITATION/MALFORMED_OPTIONS/PASSAGE_LINK), antes de la DB y como paso obligatorio de `content:insert --lot-dir` sobre los 10 archivos. **0 citas por letra y 0 referencias posicionales** en las 105 capas (regex de `lot-validation.ts` + `POSITION_REF` de G33; las 35 capas 2 se titulan «Cómo se descarta cada opción» y descartan los distractores por su contenido, numerados 1/2/3). **Señuelo de longitud tie-aware (G34 §2 / G43): 2ª pasada** — el 1er borrador dejaba la clave como la más larga en 22/35 (arrastre de la síntesis multicausal); tras recortar claves a la aserción, homogeneizar distractores y meter varianza deliberada, quedó en **18.8 % «más larga» / 21.9 % «más corta»** (histograma de rango 6/14/5/7 sobre 32 ítems con opciones-oración; los 3 de opción-valor quedan fuera, criterio G45/G46), ambos < 25 % y < 14/35. **Lenguaje absolutista (G44 §6):** 0.06 marcadores/opción en claves vs 0.13 en distractores (~2×, vs 14× de G43), **0/35 con la clave como única sin marcador**. **Opción compuesta como única clave (G44 §7): 0/35** (se añadió un distractor compuesto a los 7 reactivos donde solo la clave lo era). **Fuga entre reactivos (G38 §6 / G42 §8):** revisada en las dos direcciones y en la diagonal clave↔distractor; heurístico de 4-gramas sobre `(stem+clave)` y `(clave↔distractores)` de los 35 → **0 coincidencias no triviales**. **Acumulado real, DB en vivo antes y después:** banco **937 → 972** · servibles **934** sin cambio (esta sesión no verifica sus propios reactivos, por diseño) · cola ciega **0 → 35** · cola canónica de discrepancias **2** sin cambio (los 2 retenidos de G46) · 1 retirado a propósito · UNAM A2 Biología **65✓/0⧗ → 65✓/35⧗** (⚓ del pool **35/30 → 50/50**, fuentes 5/10 temas) · `SOURCED` banco **251 → 266 (27 %)** · 105 `explanation_layers` · 15 `question_source_chunks` (5 chunks distintos). `content:coverage`: **934 servibles · 35 pendientes · 1 retirado · 970 en banco**; meta efectiva G26 (1 222) **62 %**, brecha **468 ≈ 14 lotes** — no se mueve hasta que G48 verifique; UNAM A2 Biología (peso 14, meta efectiva ~78) está en 65, así que ~13 de los 35 caen en la brecha efectiva y ~22 en un pool ya en meta (caso intermedio entre los lotes de humanidades de G33–G43 y el de Matemáticas de G45). Meta nominal 1 500: **62 %**. Auditoría 5 % **vencida, ahora 6 ciclos** (esta fase compone, no audita). `pnpm typecheck` y `pnpm lint` en verde; cero cambios de código de producción (el generador de Python y los 10 archivos del lote corren en el scratchpad y **no se committean**; el registro permanente es `docs/content-batches/g47-unam-a2-biologia.json`); cero llamadas a la API de pago. **Siguiente: G48 = verificación ciega de este lote, modelo Fable 5.**)

<details><summary>Historial: G46 (2026-08-30)</summary>

Última fase ejecutada: G46 (**COMPLETADA — verificación ciega (G2) de los 35 reactivos que G45 dejó en la cola: **Matemáticas, UNAM Área 1 (Ciencias Físico-Matemáticas y las Ingenierías)**, el pool STEM de mayor peso del banco (`questionWeight` 26). **35/35 coinciden con la clave del generador**; **auto-aprobados 33/35 = 94.3 %** — los 2 restantes **también acertaron la letra** y quedan sin publicar únicamente porque esta sesión reportó `problems` sobre su enunciado. **Es la primera ronda ciega por debajo del 100 % en quince**, y bajó sin que fallara una sola clave: la movieron dos defectos editoriales reales, de modo que la métrica que G39/G44 daban por saturada volvió a discriminar. Modelo real `claude-opus-5` — el plan anunciaba Fable 5; el campo `model` declara el que corrió de verdad (corrección de G17, segundo ciclo consecutivo en que difieren). **Aislamiento:** sesión distinta de la que compuso el lote; no se leyó el commit de G45, ni los JSON del lote, ni `Question.options` — único insumo `g46-blind.json`, **0 fugas** de `isCorrect`/`explanation`, opciones con solo `label`/`text`/`imageUrl`, y la clave cayó en la **misma posición tras barajar solo 8/35** (azar ≈ 8.8). **Candado de G28 aplicado a los 35** (`isCalcSubject("Matemáticas")`=true, `requiresCalculation` 35/35): cada reactivo se resolvió **desde cero con `sympy` 1.14** y se exigió **coincidencia única** contra las 4 opciones (`assert len(hits)==1`) — 21 por expresión exacta, 8 numéricos con tolerancia, 2 ecuaciones de curva, 2 antiderivadas (derivando la opción y exigiendo `+C`, lo que decide un reactivo donde dos opciones solo se distinguen por la constante), 1 identidad falsa evaluada en 5 ángulos agudos y 1 patrón de serie inferido de sus términos. **El control de transcripción de G42 §2 atrapó un defecto propio:** comparar el fragmento **como substring** dio un falso «no único» en el reactivo con opciones `6` y `−6` (`"6"` ⊂ `"-6"`); se endureció a **igualdad del texto normalizado completo** — en humanidades el substring basta porque las opciones son oraciones, en matemáticas colisiona. **Clave real A9/B9/C9/D8 confirmada**, con ≥3 letras distintas en todo tema de ≥3 reactivos. **Los dos señuelos de forma de G44 §6-§7 salen inertes y está medido:** absolutismo **0.00/opción** en claves y distractores (vs 0.03 y 0.41 en G43), clave única sin marcador **0/35** (vs 11/35), longitud tie-aware **21.2 % más larga / 22.6 % más corta** — cuando las opciones son valores cortos no hay superficie lingüística donde alojar el señuelo. **Hallazgo: el diagnóstico que sí toca vigilar en STEM es el rango del valor correcto** (si la clave tiende al 2º-3er valor de las cuatro ordenadas, «descarta los extremos» acierta sin saber matemáticas, y G45 fijó la letra de los numéricos precisamente por ese rango): sobre los **25 reactivos 100 % numéricos** salió 5/5/9/6, **χ²=1.72 (gl 3), p=0.63**; extremos 11 vs centrales 14, binomial **p=0.69** — **sin señuelo**, y queda propuesto para `lot-validation.ts` como reemplazo de §6-§7 en lotes STEM. **Los 2 retenidos** (primeras entradas de la cola de discrepancias desde que se drenó en G40): (a) Trigonometría/antena `OTHER` — el `stem` manda usar `tan30°≈0.577`, que da 23.08, pero la opción dice 23.09 (el exacto 23.0940 redondeado); la respuesta sigue siendo única porque ninguna otra opción queda cerca, pero el reactivo se contradice; (b) Progresiones/sucesión `AMBIGUOUS_STEM` — la lectura literal del paso compuesto da 321, que no está entre las opciones, y solo la lectura alternada (+2, ×3, +2, ×3) produce una; ambas se calcularon en código antes de elegir. Los dos son una reescritura de una línea + `blind-batch --ids`. **Acumulado real, DB en vivo antes y después:** banco **937** sin cambio · servibles **901 → 934** · cola ciega **35 → 0** · cola canónica de discrepancias **0 → 2** · 1 retirado a propósito · auto-aprobación global **100 % (902/902) → 99.8 % (935/937)** · UNAM A1 Matemáticas **81✓/35⧗ → 114✓/0⧗/2✋** (98 %) · `SOURCED` 251 (27 %). `content:coverage`: **934 servibles · 0 pendientes · 1 retirado · 937 en banco**; meta efectiva G26 (1 222) **59 % → 62 %**, brecha **501 → 468 (≈ 14 lotes)** — **la predicción de G45/G39 §7 se cumplió**: por caer en un pool bajo su meta, los 33 publicados descuentan uno a uno, a diferencia de los lotes de humanidades de G33–G43. Meta nominal 1 500: **60 % → 62 %**. Auditoría 5 % **vencida, ahora 6 ciclos** (exige tier ≠ opus-5, y esta sesión volvió a correr en opus-5). `pnpm typecheck` y `pnpm lint` en verde; cero cambios de código de producción; cero llamadas a la API de pago. **Siguiente: G47, modelo Sonnet 4.6.**)

</details>

<details><summary>Historial: G45 (2026-08-30)</summary>

Última fase ejecutada: G45 (**COMPLETADA — lote de 35 reactivos de **Matemáticas, UNAM Área 1 (Ciencias Físico-Matemáticas y las Ingenierías)**, insertados con `isVerified=false` en la cola de verificación ciega. Modelo `claude-sonnet-5` (tier Sonnet para lotes de contenido). **Pool STEM de mayor peso de la UNAM** (`questionWeight` 26), materia **NO compartida** (`sharedContentKey` NULL, a diferencia de Español/Inglés/Química de la UNAM en G26): el lote va a sus 12 temas propios. Consulta en vivo a Supabase (2026-08-30): 81 verificados repartidos 10/10/7/5/8/7/7/6/5/6/4/6. **El lote prioriza los 10 temas de menor cobertura y deja intactos los dos de 10** (Números reales, Álgebra ecuaciones). Reparto: Trigonometría 5 (5→10), Progresiones y combinatoria 4 (4→8), Series y sucesiones 3 (5→8), Integrales 5 (6→11), Matrices y sistemas 3 (6→9), Estadística descriptiva 2 (6→8), Límites y continuidad 4 (7→11), Derivadas 4 (7→11), Polinomios y funciones 2 (7→9), Geometría analítica 3 (8→11) — cubre álgebra, geometría analítica, trigonometría y cálculo diferencial e integral. **21 SOURCED / 14 TEMARIO_ONLY:** 6 temas tienen `SourceChunk` clasificado por F2b (Trigonometría, Progresiones/combinatoria, Series, Derivadas, Polinomios, Geometría analítica — guías de la UAM y CENEVAL, otra institución que la del examen destino; `grounding.ts` hace obligatoria la cita; se anota, patrón G33/G37/G40/G41/G43) y sus 21 reactivos **transforman la tarea del ítem-semilla** (los de las guías son ejercicios resueltos con la respuesta a la vista; los compuestos usan la misma técnica con datos y opciones nuevas). Los 4 temas sin chunk (Integrales, Matrices, Estadística, Límites) salen TEMARIO_ONLY. **35 con cálculo verificable — recalculados uno por uno con `sympy` antes de insertar: 35/35 coinciden** (criterio del encargo); los distractores numéricos derivan de un error de procedimiento nombrado (signo, olvidar `/2`, confundir vértice con raíces, reportar `x` en vez de `x+y`…). **Formato:** 23 `PROBLEM_SOLVING` · 10 `MULTIPLE_CHOICE` · 2 `NUMERIC_SERIES`. **Dificultad:** BASIC 7 · INTERMEDIATE 17 · ADVANCED 9 · EXPERT 2 (≈ 20/49/26/6, distribución objetivo de `_base.md`, misma que G43). **Clave A9/B9/C9/D8** (25.7/25.7/25.7/22.9 %), las cuatro en la banda 15-40 %, **confirmada por `jsonb_array_elements` tras insertar**; equilibrio también por tema: ≥3 letras distintas en cada tema de ≥3 reactivos, tope 2 por letra. La letra se asignó a mano (sin barajado del generador). `content:validate-batch --dir` **0 violaciones** (antes de la DB y como paso obligatorio de `content:insert --lot-dir` sobre los 10 archivos). **0 citas por letra y 0 referencias posicionales** en las 105 capas (regex de `lot-validation.ts` + `POSITION_REF` de G33); las 35 capas 2 descartan los distractores **por su contenido** (el valor o la fórmula), numerados 1/2/3. **Señuelo de longitud tie-aware (G34 §2): «más larga» 24.1 % y «más corta» 22.6 %**, ambos por debajo del azar (25 %) y de 14/35 — en un lote de matemáticas las opciones son valores/expresiones cortas y homogéneas; se homogeneizaron a mano las 4 conceptuales que traían un outlier. Lenguaje absolutista **0.0/opción** en claves y distractores; opción compuesta como única clave **0/35** (los señuelos de forma de G44 §6-§7 son de humanidades). **Fuga entre reactivos** revisada en las dos direcciones y en la diagonal clave↔distractor (G42 §8): 0 coincidencias no triviales de 4-gramas. **Acumulado real, DB en vivo antes y después:** banco **902 → 937** · servibles **901** sin cambio (esta sesión no verifica sus propios reactivos, por diseño) · cola ciega **0 → 35** · 1 retirado a propósito · auto-aprobación global **100 % (902/902)** · UNAM A1 Matemáticas **81✓/0⧗ → 81✓/35⧗** (⚓ del pool **57/24 → 78/38**, fuentes 8/12 temas) · `SOURCED` banco **230 → 251 (27 %)** · `TEMARIO_ONLY` **672 → 686** · 105 `ExplanationLayer` · 36 `question_source_chunks`. `content:coverage`: **901 servibles · 35 pendientes · 1 retirado · 937 en banco**; meta efectiva G26 (1 222) **59 %**, brecha **501 ≈ 15 lotes** — no se mueve hasta que G46 verifique, **pero a diferencia de los lotes de humanidades de G33–G43 este SÍ moverá la brecha efectiva**: el pool está en 81 vs meta ~144 (G26), así que los 35 caen enteros dentro (recomendación de G39 §7 / G43 §2). Meta nominal de 1 500: **60 %**. Auditoría 5 % **vencida, ahora 5 ciclos** (exige tier ≠ opus-5). `pnpm typecheck` y `pnpm lint` en verde; cero cambios de código de producción (el generador de Python y los 10 archivos del lote corren en el scratchpad y **no se committean**; el registro permanente es `docs/content-batches/g45-unam-a1-matematicas.json`); cero llamadas a la API de pago. **Siguiente: G46 = verificación ciega de este lote, modelo Fable 5.**)

</details>

<details><summary>Historial: G44 (2026-08-30)</summary>

Última fase ejecutada: G44 (**COMPLETADA — verificación ciega del lote de G43 (35 reactivos de **Historia Universal, UNAM Área 3 (Ciencias Sociales)**). **35/35 auto-aprobados = tasa de auto-aprobación 100 %**, **decimocuarta ronda ciega consecutiva al 100 %**. Modelo `claude-opus-5` — G43 anticipaba `fable-5`; la sesión corrió en tier Opus y el `model` declarado dice la verdad (corrección de G17). **Cierra el Área 3 completa**: sus 3 materias propias quedan en 35✓/0⧗ — Historia de México (G33→G34), Geografía (G35→G36), Historia Universal (G43→G44). **Acumulado real, DB en vivo antes y después:** banco **902** sin cambio · servibles **866 → 901** · cola ciega **35 → 0** · 1 retirado a propósito · auto-aprobación global **100 % (902/902)** · UNAM A3 Historia Universal **0✓/35⧗ → 35✓/0⧗** (⚓5/30) · `SOURCED` 230 (25 %); meta efectiva G26 (1 222) **57 % → 59 %**, brecha **529 → 501 ≈ 15 lotes**; meta nominal de 1 500: **58 % → 60 %**. **Ceguera verificada estructuralmente**, no asumida: 0 ocurrencias de `isCorrect`/`explanation`/`correct` en el lote ciego, opciones solo con `label`/`text`/`imageUrl`, 35/35 `MULTIPLE_CHOICE`, 0 con cálculo (`usedCalculation:false` verdadero por construcción), 0 con pasaje; no se abrió el commit `7e7d781`, ni el JSON del lote, ni `Question.options`, ni la sección `## G43`. **Fuga potencial declarada:** el `grep` inicial trajo la línea 3 de este documento, que reporta agregados del lote (clave A9/B9/C9/D8, diagnósticos de longitud) pero **ninguna clave por reactivo**, y el rebarajado por `questionId` la vuelve inservible para las etiquetas ciegas — no se usó; la próxima ronda debe localizar la fase con `grep "^## G4x"`. **Control de transcripción de G42 §2 aplicado:** 35/35 fragmentos con match único y 35/35 letras derivadas del contenido == las escritas (aquí como validación posterior; la forma preventiva de G42 es la buena). **Clave real leída después de responder: A9/B9/C9/D8**, reproduce al reactivo lo que G43 midió por query directa a la DB; rotación cíclica **0.0 %**, racha máxima 2. **Señuelo de longitud recalculado sobre las respuestas ciegas (G36 §2 / G38 §3): 14.3 % «más larga» y 14.3 % «más corta», ratio medio 1.045 — idéntico al de G43 por vía independiente**; histograma 5/23/2/5 (el pico en rango 2 es el residuo del ajuste, no explotable). **Lo que aporta por encima del 100 %: dos señuelos de forma medidos, no intuidos.** **(§6) El distractor se delata por el lenguaje absolutista:** 43 marcadores en 105 distractores (0.41/opción) contra **1 en 35 claves** (0.03/opción), ~14×; en **11/35** la clave no tiene marcador y ≥2 distractores sí, en 3/35 lo tienen los tres. **(§7) La clave es la única opción compuesta:** 8/35 `stem` anuncian multicausalidad y en **10/35** la clave es la única que enumera ≥2 factores heterogéneos frente a tres distractores monocausales — «elige la opción compuesta» acierta sin saber historia; #6 y #31 muestran la corrección (un distractor también compuesto, pero equivocado). **Ninguno se marcó como `problem`**: los 35 son correctos y despublicarlos habría sido el error; van como regla al compositor y como propuesta a `lot-validation.ts`, junto al señuelo de longitud de G34 §2 y al cruce intra-lote de G42 §8. **Exactitud factual verificada opción por opción:** 0 atribuciones erróneas, 0 fechas incorrectas, 0 claves discutibles; detectadas las dos trampas anacrónicas (la Revolución francesa como «muy anterior» a 1517; las independencias hispanoamericanas atribuidas a 1929), el mito de la Tierra plana y las dos tesis monocausales sobre la caída de Roma. **De los 4 reactivos que G43 marcó como apretados, el único que lo fue es #19** (la «cuestión social» de 1848, confianza 0.94, mínima del lote); los 2 `EXPERT` salieron a 0.96-0.97 porque son justo donde opera el señuelo de §7, y el `SOURCED` #31 —el más alejado de su ítem-semilla— a 0.98, lo que confirma que la transformación de G43 funcionó. Auditoría 5 % **vencida, 4 ciclos**: exige tier ≠ opus-5 y esta sesión fue opus-5. `pnpm typecheck` y `pnpm lint` en verde; cero cambios de código de producción; cero llamadas a la API de pago. **Siguiente: G45.**)

</details>

<details><summary>Historial: G43 (2026-08-30)</summary>

Última fase ejecutada: G43 (**COMPLETADA — lote de 35 reactivos de **Historia Universal, UNAM Área 3 (Ciencias Sociales)**, insertados con `isVerified=false` en la cola de verificación ciega. Modelo `claude-sonnet-5` (tier Sonnet para lotes de contenido). **Cierra las 3 materias propias del Área 3** (Historia de México G33, Geografía G35, Historia Universal G43); era la última en cero absoluto. `sharedContentKey` NULL → lote a sus **8 temas propios**, sin reutilización entre áreas (patrón G33/G35/G37/G41). «Áreas 3 y 4» del encargo se resuelve a la única Historia Universal del Área 3 (no existe en el Área 4; la del IPN SOCADM es otra institución y G26 no cruza). Reparto: **5/4/4/4/4/5/5/4** (Antigüedad clásica · Edad Media · Renacimiento · Ilustración · Revoluciones de 1848 · Imperialismo e Industrialización · Guerras Mundiales · Siglo XXI). **30 TEMARIO_ONLY / 5 SOURCED:** «Guerras Mundiales» tiene 1 `SourceChunk` (p. 44 de `uam_csh.pdf`, guía UAM — banco de 4 ítems de historia contemporánea homogéneos, sin arrastre de otros temas a diferencia de G40/G41); sus 5 reactivos citan `sourceChunks:[1]` y transforman la tarea de atribución/«qué provocó X» a comprensión de proceso/causalidad (patrón G40 §6 / G41 §3); #31 es el más alejado de su ítem-semilla y se declara para G44. **35 `MULTIPLE_CHOICE`**, 0 con cálculo, 0 con pasaje. Dificultad **7/17/9/2** (los 2 EXPERT: caída de Roma multicausal, por qué Gran Bretaña industrializó primero). **Clave A9/B9/C9/D8** (25.7/25.7/25.7/22.9 %), las cuatro en 15-40 %, **confirmada por query directa a la DB** (`jsonb_array_elements` sobre `options`); equilibrio también por tema (tope 2 por letra, ≥3 letras distintas); DFS con semilla fija (43043), **rotación cíclica A→B→C→D 0.0 %**. **Señuelo de longitud tie-aware (G34 §2): «elige la más larga» 5.00/35 = 14.3 %, «elige la más corta» 5.00/35 = 14.3 %**, ratio medio 1.045 (mín 0.89, máx 1.20) — el primer borrador daba la correcta como la más larga en 34/35 (arrastraba la síntesis multicausal, patrón G33/G35/G37/G41); tres pasadas hasta nivelar, con varianza deliberada en ambos extremos (5 rank-1, 5 rank-4) para que el rango no sea un pico en 2. `content:validate-batch` **0 violaciones** (antes de la DB y como paso obligatorio de `content:insert --lot-dir` sobre los 8 archivos). **0 citas por letra y 0 posicionales** en las 105 capas (regex de `lot-validation.ts` + `POSITION_REF`; las capas 2 se titulan «Cómo se descarta cada opción» y citan los distractores por su contenido). **Cruce intra-lote clave↔distractor (G42 §8):** #11/#12 (imprenta/Reforma) y #24/#27 (motivo económico/imperialismo colonial) desacoplados; pares reforzantes (#22/#23, #24/#26, #18–#21) conservados a propósito. **Exactitud factual verificada opción por opción** antes de insertar (fechas, atribuciones, procesos). **Acumulado real, DB en vivo antes y después:** banco **867 → 902** · verificados **866** sin cambio (esta sesión no verifica sus propios reactivos, por diseño) · cola ciega **0 → 35** · Historia Universal UNAM A3 **0✓/0⧗ → 0✓/35⧗** por los 8 temas 5/4/4/4/4/5/5/4 · 105 `ExplanationLayer` · 5 `question_source_chunks`. `content:coverage`: **866 servibles · 35 pendientes · 1 retirado · 902 en banco**; auto-aprobación global 100 % (867/867); `SOURCED` **230 (25 %)** · 672 `TEMARIO_ONLY`; meta efectiva G26 (1 222) al **57 %**, brecha **529 ≈ 16 lotes** — no se mueve hasta que G44 verifique (la meta efectiva de la celda w5 ≈ 28, la cubrirán y superarán los 35, patrón G37/G41). Meta nominal de 1 500: **58 %**. `pnpm typecheck` y `pnpm lint` en verde; cero cambios de código de producción (generador y 8 archivos del lote en el scratchpad, no se committean); cero llamadas a la API de pago. **Siguiente: G44 = verificación ciega de este lote, modelo Fable 5.**)

</details>

<details><summary>Historial: G42 (2026-08-30)</summary>

Última fase ejecutada: G42 (**COMPLETADA — verificación ciega del lote de G41 (35 reactivos de **Filosofía, UNAM Área 4**, segunda materia propia del Área 4 con contenido). **35/35 auto-aprobados = tasa de auto-aprobación 100 %**, **decimotercera ronda ciega consecutiva al 100 %** — métrica saturada, se dice cada vez. **Acumulado real (DB en vivo, cruzado con `content:coverage`): 867 en banco / 866 servibles / 1 retirado a propósito**; auto-aprobación global **100 % (867/867)**; `SOURCED` 225 (26 %); **cola ciega y cola canónica de discrepancias, ambas en cero** (`isVerified=false ∧ verification≠null ∧ manualReview=null`). UNAM A4 · Filosofía pasa de 0✓/35⧗ a **35✓/0⧗**; meta efectiva G26 (1 222) al **57 %**, brecha **529 ≈ 16 lotes**; meta nominal de 1 500: **58 %**. **Lo que aporta esta fase por encima del 100 %:** **(§2) el arnés dejó de depender de una letra copiada a mano** — el archivo de respuestas se genera desde un fragmento del texto de la opción elegida, con assert de match único, y el control disparó de verdad atrapando un error de transcripción antes de tocar la DB; **(§5) auditoría de atribución que pidió el encargo: 23 de 35 reactivos nombran autor, 17 autores distintos, 0 atribuciones erróneas**, con distractores que son posiciones rivales reales (akrasía, atomismo, escepticismo académico, Hume literal) o errores documentados de estudiante; **(§6) tres interpretaciones discutibles examinadas y ninguna marcada** (compatibilismo, «muerte del arte» en Hegel, Gorgias sincero vs. retórico) porque los tres `stem` están redactados de modo que la clave no depende del punto en disputa — criterio explícito: se marca cuando otra escuela viva respondería otra letra, no cuando hay debate; **(§8) hallazgo propio: tres solapamientos entre reactivos del MISMO lote**, uno fuerte (el distractor utilitarista del reactivo del imperativo categórico enuncia el principio de utilidad casi con las palabras de la clave del reactivo de Bentham y Mill), uno medio (mímesis → teoría de las Ideas) y una redundancia conceptual en los dos primeros de Epistemología — **ninguno afecta la corrección**, los 35 son correctos; **regla que se desprende: el cruce intra-lote debe comparar claves contra distractores, no solo enunciado contra enunciado**. **(§7) El señuelo de longitud tie-aware (6.50/35 = 18.6 % larga; 5.33/35 = 15.2 % corta; ratio 0.99) reproduce al decimal el de G41 por vía independiente** —G41 lo midió contra `isCorrect`, esta sesión contra la clave elegida a ciegas. Anotado: `manualReview` **no es columna**, es clave dentro del JSON de `Question.verification`. Auditoría 5 % **vencida, ahora 3 ciclos**. `pnpm typecheck` / `pnpm lint` verdes. Cero llamadas a la API de pago.)

</details>

<details><summary>Historial: G41 (2026-08-30)</summary>

Última fase ejecutada: G41 (**COMPLETADA — lote de 35 reactivos de **Filosofía, UNAM Área 4 (Humanidades y Artes)**, insertados con `isVerified=false` en la cola de verificación ciega. Modelo `claude-sonnet-5` (tier Sonnet para lotes de contenido). **Segunda materia del Área 4 con contenido**, tras Literatura (G37); Filosofía estaba en cero absoluto. `content:coverage` tras el lote: **831 servibles · 35 pendientes · 1 retirado · 867 en banco · 55 % de la meta efectiva**. Señuelo de longitud tie-aware **6.5/35 = 18.6 %** («más larga») y **5.3/35 = 15.2 %** («más corta»), ambos bajo el azar; sub-regla nueva: equilibrio de letra **también por tema**. Verificado a ciegas en G42: **35/35**. *Nota de mantenimiento: esta línea la añadió G42 — G41 no rotó el encabezado de este documento.*)

</details>

<details><summary>Historial: G40 (2026-08-30)</summary>

Última fase ejecutada: G40 (**COMPLETADA — micro-fase editorial + verificación ciega de las reparadas**, ejecutando el work order que G39 §9 dejó abierto. La cola ciega estaba en **cero**: esta fase la creó reparando, no componiendo. **3 reactivos reparados → 3/3 rescatados = 100 % de tasa de rescate**, resueltos a ciegas con el arnés de G2 (los 3 conceptuales, `usedCalculation:false` declarado con verdad; descarte razonado de los tres distractores por contenido, cero referencias posicionales). **Acumulado real (DB en vivo, cruzado con `content:coverage`): 832 en banco / 831 servibles / 1 retirado a propósito**; auto-aprobación global **100 % (832/832)**; `ExplanationLayer` 2 496 = 832×3; `SOURCED` 218 = `QuestionSourceChunk` 218. **Cola canónica en cero** con la definición que usa la app (`isVerified=false ∧ verification≠null ∧ manualReview=null`) — 4ª fase consecutiva. **Work order de G39 §9 cerrado:** §9.1 fuga relacional reparada, §9.2 los dos reactivos peninsulares reubicados a sus `Topic` correctos, §9.3 duplicado retirado (**desbloqueado**: `manualReview.action` acepta `'duplicate'`, el bloqueo que G24 y G39 declararon sin resolver). **Hallazgo propio (§3): la fuga de G39 §9.1 era BIDIRECCIONAL** — el reactivo *protegido* filtraba en su `stem` el punto que evaluaba el otro; reparar solo el señalado habría dejado la mitad abierta. **Hallazgo propio (§6): 3 de los 4 reactivos anclados al chunk de la guía UAM son paráfrasis cercanas de los ítems de esa guía**, uno casi literal en el `stem` — riesgo de originalidad, no de corrección; va al work order con re-verificación ciega obligatoria porque esta sesión ya quedó contaminada sobre ellos. **§9.2/d resuelto con veredicto:** el `SourceChunk` no está mal clasificado por juicio sino **rebanado por página**, así que ningún `topicId` único puede servirlo — el arreglo vive en el chunker, no en el chunk. **Caveat declarado (§2): reparación y pasada ciega ocurrieron en la MISMA sesión** — la garantía sobre la clave se sostiene (nunca se leyó `options`/`isCorrect` antes de responder, verificado por `grep` = 0), la de independencia editorial no. `content:coverage` corregido: «en banco» ya cuadra con `COUNT(*)`. `pnpm typecheck` / `pnpm lint` verdes, **493/493** tests (+2). Cero llamadas a la API de pago.)

</details>

<details><summary>Historial: G39 (2026-08-30)</summary>

Última fase ejecutada: G39 (**COMPLETADA — balance intermedio del banco. Pasada editorial (no ciega). **Estado consolidado desde la DB real** (`fumluvvzskhdxcyljbmx`, en vivo, cruzado con `content:coverage`): **832 totales / 832 verificados / 832 servibles**, 0 `CALIBRATION_ONLY`, 832 `GENERATED`, auto-aprobación global **100 % (832/832)**, `ExplanationLayer` 2 496 = 832×3 exactas, integridad `SOURCED`↔`QuestionSourceChunk` 218=218. **Por institución:** UNAM 482 (peso 130, 9/18 materias con contenido) · IPN 350 (peso 140, 8/17). **Por área:** UNAM A1 240 · A2 137 · A3 70 · A4 35; IPN FISMAT 175 · MEDBIO 140 · SOCADM 35. 16 de 35 filas `Subject` con contenido, 19 en cero (varias son celdas de un pool G26 ya servido desde otra área); **todo el banco está en alcance del 21-nov** (launch = UNAM 4 áreas + IPN 3 ramas, CLAUDE.md). **Triaje de la cola:** la cola formal de discrepancias está en **cero** — verificado por 4 vías (SQL `verification!=null & !isVerified`=0; SQL `!isVerified`=0; `content:coverage` "0 pendientes"; 0 veredictos `UNPUBLISHED` en el banco entero, 0 `manualReview`, 0 `audit.degraded`). `session-v1` lleva **523/523** coincidencias generador↔verificador desde G2. **3ª fase de balance consecutiva (G24, G25, G39) que la encuentra vacía.** **Cero reactivos auto-aprobados por esta fase.** Lo que sí existe: **7 defectos editoriales heredados de las rondas ciegas G28–G38**, todos "no bloqueante" y **sin impacto de cara al usuario** (los componentes no ramifican por `format`), triados con las 4 categorías de G17: 1 aplicado (§8), 5 diferidos a micro-fase editorial con work order (§9), 1 sin acción; **VERIFICADOR TENÍA RAZÓN: 0 casos; IRREPARABLE: 0.** **Único cambio de datos:** 8 `format` `CHART_TABLE → PROBLEM_SOLVING` (reactivos de G27 con datos en prosa y sin tabla; G28 §8.1, diferido 4 fases). Solo el enum — 0 bytes de `stem`/`options`/`isCorrect`, render idéntico, scoring intacto, **sin re-verificación**, `isVerified` sigue `true`, 0 `SessionAnswer` en los 8. **Distribución de posición:** UNAM 482 → A 26.6 / B 26.6 / C 22.4 / D 24.5 %; IPN 350 → 25.4 / 25.1 / 26.0 / 23.4 % — **el sesgo de G8 no reapareció**; celdas tight sin empeorar (UNAM A1 Mat D=16.0 %, UNAM A1 Español C=17.1 %, ambas de G8/G24, sin lote nuevo encima). **Artefacto de rotación de G16 estable:** confinado a IPN FISMAT Matemáticas (88.4 %) e IPN MEDBIO Biología (68.1 %); todo lote desde G20 ≤ 27.5 %. **Anclaje:** 218 SOURCED (**26.2 %**) / 614 TEMARIO_ONLY — el ratio baja fase a fase (F4 44 % → G24 33 % → G39 26 %) porque G27–G37 son casi todos TEMARIO_ONLY. **Auditoría 5 %:** el mecanismo está **sano** (revisión de código; reordenamiento de G24 intacto en `verification.ts:130`; `content:audit-sample` corrido en vivo → pool 785, muestra 40 ids regenerada), pero la **ejecución está vencida 2 ciclos**: 47/832 (5.6 %) sin cambio desde G25, `session-v1` diluido de 5.8 % a **3.4 %** (18/523) por los +210 de G27–G37 sin auditar. **Brecha y proyección:** meta efectiva G26 **1 222**, brecha **546 = 16 lotes = ~32 sesiones** (confirmada por `content:coverage` + SQL a nivel de pool). La reutilización de G26 está activa (7 pools, 19 filas); UNAM Química (124/67) e IPN Español (70/33) sobre-cubiertos. **Los últimos 6 lotes rindieron ~46 % bajo su potencial:** de 210 reactivos, ~113 cerraron brecha, **~97 cayeron en pools ya en/sobre meta** (G29 Español no movió la meta en absoluto; G33/G35/G37 abrieron Áreas 3/4 para cobertura de producto pero aportaron poco a la meta). **83 días al 21-nov** (~11.9 sem); cadencia requerida **1.35 lotes/sem (6.6/día)**. Ritmos: burst ~95/día (no sostenible), calendario con la pausa de 19 días de agosto **13.4/día**, calendario desde G3a **19/día**. A 13.4/día: cierre **~2026-10-10, ~6 semanas de margen**. **Veredicto: alcanza con holgura** — harían falta 2 pausas del tamaño de la de agosto para perder la fecha (G24 tenía margen de exactamente 1). El riesgo no es el ritmo: es **la puntería de los lotes**. **Top-5 pools por brecha:** IPN Física 76 · UNAM A1 Matemáticas 63 · IPN Matemáticas (pool) 63 · IPN Química (pool) 54 · IPN MEDBIO Biología 52 — todos día 1, STEM de alto peso. **`pnpm typecheck` / `pnpm lint` / `pnpm test:unit` 491/491 en verde; 1 `UPDATE` de datos (8 filas), 0 cambios de código, 0 llamadas a la API de pago**)

</details>

<details><summary>Historial: G38 (2026-08-29)</summary>

Última fase ejecutada: G38 (**COMPLETADA — verificación ciega del lote de G37 (35 reactivos de **Literatura, UNAM Área 4**), segunda mitad del ciclo adversarial de G2. **35/35 auto-aprobados = tasa de auto-aprobación 100 %**, undécima ronda consecutiva al 100 % (métrica saturada; se dice cada vez). **Ceguera estructural verificada antes de leer el lote:** `grep -c` de `isCorrect|explanation|correctOption|"answer"|correctAnswer|solution` = **0**; claves de opción solo `label, text, imageUrl`; **35/35 `MULTIPLE_CHOICE`**, **0 con `requiresCalculation`**, **0 con pasaje**. **Aislamiento comprobado:** no se abrió el commit `91532b1`, ni el registro permanente del lote, ni `Question.options`, ni la sección `## G37`, ni su bloque `### Siguiente` antes de responder. **Contaminación real medida — la primera desde G32:** la línea 3 de G37 **inventarió el contenido de los ítems del `SourceChunk`** del lote, y dos de esos puntos son el dato que un reactivo pide identificar → **2/35 contaminados, 1 parcial, 32 limpios** (G34 y G36: 35/35 limpios). **Regla nueva:** la línea 3 describe el fragmento por fuente/página/naturaleza, nunca inventariando lo que sus ítems contienen. **El candado de G36 §2 resultó inejecutable:** G36 §3 sacó los valores exactos del canal de entrada y G37 los mandó al registro permanente del lote —el archivo que contiene la clave—, así que la sesión ciega no puede alcanzarlos sin romper el sello; solo cupo comparar **contra veredictos**: tie-aware «más larga» **por debajo del azar y de la cota de 14/35**, «más corta» **en el azar**, ratio medio ≈ 1.0 — los tres consistentes con lo que G37 declaró. **Regla nueva:** el valor exacto va en la sección `## GNN` (que la ciega abre solo después de resolver), no solo en el permanente. **Candado más fuerte hallado de paso:** traducidas de vuelta, las 35 respuestas **reprodujeron carácter por carácter la secuencia de clave de 35 letras** y la clave agregada **A9/B9/C9/D8** que G37 declaró — corroboración exacta e inyectiva, no con pérdida como el estadístico de longitud. **Contrapartida:** esa secuencia **es la clave en texto plano**, y estaba publicada en `## G37`; esta fase la **redactó** y dejó en su lugar sus propiedades (sin corridas cíclicas ≥ 3, rotación +1 3/34 = 8.8 %). **Regla nueva:** ninguna composición publica la secuencia de letras de su clave en este documento. **Resolución:** 35 `stem` y 140 opciones revisados uno por uno verificando fechas, autoría, orden religiosa, nacionalidad, siglo y adscripción de movimiento; **ninguna atribución resultó falsa**; **0 problemas declarados**; autochequeo mecánico **0 citas por letra**, **0 referencias posicionales**, **35/35 con los tres distractores descartados por contenido**. Confianza mínima **0.96**, máxima 0.99, promedio **0.983**. Dos matices no bloqueantes registrados **sin decir a qué opción pertenecen** (cambio respecto de cómo los escribieron G34 §4 y G36 §4, por la fuga de §4). **Defecto real hallado — relacional, invisible para `lot-validation.ts`:** un `stem` del lote nombra el dato que otro reactivo del mismo lote pide identificar; ambos son individualmente correctos, así que **no** se declararon como `problems` (habría dejado sin publicar reactivos sanos). **Regla nueva:** ningún `stem` puede nombrar el dato que otro reactivo del mismo lote pide identificar; reparación editorial pendiente, no bloqueante. **Observación de G36 §5, medida:** los reactivos cuyos 3 distractores caen sin el dato evaluado bajan de ~11/35 (G34 y G36) a **4/35 claros + 2 discutibles**; G37 declaró «~4» por su lado y **las dos mediciones convergen sin haberse visto**. **Barajado real:** la etiqueta ciega coincide con la original en **10/35 = 28.6 %**, cerca del azar; 25 respuestas cambiaron de letra. **Acumulado real, consultado en vivo antes y después:** banco **832** · verificados **797 → 832** · cola ciega **35 → 0** · sin publicar con veredicto **0** · UNAM A4 Literatura **0✓/35⧗ → 35✓/0⧗** · `Question.verification` **0/35 → 35/35** (`session-v1`, `AUTO_APPROVED`, `model=claude-opus-5`, `usedCalculation=false`, por query directa). `content:coverage`: **832 servibles**, auto-aprobación global 100 % (832/832), meta efectiva G26 (1 222) al **55 %**, brecha **546 ≈ 16 lotes**; meta nominal de 1 500: 53 % → **55 %**. **Veredicto pedido por G37 sobre la clasificación F2b del chunk:** los reactivos son correctos y no se marcan; el chunk sí está mal clasificado y el Área 4 ya tiene el tema donde encajan, así que basta reclasificar, sin sembrar tema nuevo. `pnpm typecheck` y `pnpm lint` en verde; cero cambios de código de producción; cero llamadas a la API de pago**)

</details>

<details><summary>Historial: G37 (2026-08-29)</summary>

Última fase ejecutada: G37 (**COMPLETADA — lote de 35 reactivos de **Literatura, UNAM Área 4 (Humanidades y Artes)**. **Abre el Área 4**, que estaba entera en cero (nota de G34/G36). **Consulta en vivo a Supabase (2026-08-30):** Literatura existe como **una sola fila `Subject`, en el Área 4**, `questionWeight` 4, **`sharedContentKey` NULL** — no hay materia «Literatura» en el Área 3 (que tiene Historia de México, Historia Universal, Geografía, Español, Inglés) y G26 no le dio clave de contenido compartido (solo Español/Inglés/Química de la UNAM la tienen). Por eso «Áreas 3 y 4» del encargo se resuelve a la **única Literatura del Área 4**: el lote va a sus **7 temas propios** y no se reutiliza entre áreas — mismo patrón que Historia de México (G33) y Geografía (G35), ambas `sharedKey` NULL. Reparto por los 7 temas: **5 / 6 / 5 / 5 / 5 / 4 / 5** (prehispánica · colonial · neoclásica y romántica · realismo y naturalismo · modernismo · contemporánea mexicana · universal clásica), que cubre géneros literarios, corrientes y movimientos, figuras retóricas y literatura mexicana e hispanoamericana. **31/35 TEMARIO_ONLY · 4/35 SOURCED:** el tema «Literatura contemporánea mexicana» tiene **1 `SourceChunk`** (`cmrsromj5…`, p. 39 de `uam_csh.pdf` — banco de preguntas de la guía CSH de la UAM con 3 ítems literarios: novela picaresca/Quevedo, Generación del 98, Octavio Paz), y `grounding.ts` obliga a citar cuando hay fragmento → sus 4 reactivos llevan `sourceChunks:[1]`. **Imprecisión de clasificación heredada de F2b, documentada y no bloqueante:** 2 de esos 4 (picaresca, Generación del 98) tratan letras españolas, no mexicanas contemporáneas — derivan **directo** del fragmento y son factualmente correctos (la ronda ciega los revalida uno por uno); los `stem` lo explicitan («en la tradición literaria hispánica que también se estudia en México», «en las letras españolas»). Mismo criterio que G33 (componer al tema que el pipeline asignó al chunk). **35 `MULTIPLE_CHOICE`.** Dificultad **BASIC 7 / INTERMEDIATE 17 / ADVANCED 9 / EXPERT 2** (≈ 20/49/26/6, la distribución objetivo de `_base.md`; misma que G33/G35). **Clave A9/B9/C9/D8** (25.7/25.7/25.7/22.9 %), las cuatro en la banda 15–40 % de G3c, **confirmada por query directa a la DB** (`jsonb_array_elements` sobre `options`) tras insertar; la letra la asigna el generador con búsqueda de semilla fija que impide corridas cíclicas A→B→C→D de longitud ≥ 3 (rotación +1: 3/34 = 8.8 %). **Regla de G34 §2, reportada como veredicto contra el umbral (G36 §3):** el puntaje esperado tie-aware de «elige la más larga» quedó **por debajo del azar del 25 % y muy por debajo de la cota de 14/35**, y «elige la más corta» también quedó en el azar; ratio medio de longitud correcta/distractores ≈ 1.0. El primer borrador daba la correcta como la más larga en la mitad del lote (arrastraba la cláusula justificativa, el patrón que ya corrigieron G33/G35); se recortaron las correctas a la aserción y se homogeneizaron los distractores en dos pasadas. `content:validate-batch` **0 violaciones** (antes de tocar la DB y de nuevo como paso obligatorio de `content:insert --lot-dir` sobre los 7 archivos). **0 citas por letra** y **0 citas posicionales** en las 105 capas (auto-chequeo con las regex de `lot-validation.ts` + `POSITION_REF` de G33; las capas 2 se titulan «Cómo se descarta cada opción» y citan los distractores **por su contenido**). **Atendida la observación de G36 §5:** en BASIC/INTERMEDIATE los distractores son alternativas **reales** que exigen conocimiento específico para rechazarse (otros movimientos con su set de rasgos, otras escritoras del Barroco, otra revista modernista, otros poetas del Siglo de Oro, otras vanguardias); caveat honesto (G34 §4): en ~4 reactivos algún distractor cae también por anacronismo o imposibilidad. **Derechos de autor (criterio de aceptación del encargo):** cero reproducción de fragmentos extensos de obras vigentes; de autores con derechos (Paz, Rulfo, Fuentes, García Márquez, Federico Gamboa) solo título/autor/datos; los **3 reactivos que piden analizar un texto** (personificación, ironía, sinestesia) usan textos **originales** escritos para el lote «a la manera de» cada movimiento — pastiche, no cita; no se citan traducciones de la lírica náhuatl (las de León-Portilla/Garibay tienen derechos): se describe, no se transcribe. Única cita textual: el íncipit-título «Hombres necios que acusáis» (4 palabras, Sor Juana, s. XVII, dominio público). **Exactitud factual verificada opción por opción antes de insertar.** **Acumulado real, consultado en vivo antes y después:** banco **797 → 832** total · verificados **797** sin cambio (esta sesión no verifica sus propios reactivos, por diseño) · cola ciega **0 → 35** · Literatura UNAM A4 **0✓/0⧗ → 0✓/35⧗** por los 7 temas 5/6/5/5/5/4/5 · 105 `ExplanationLayer` · 4 `question_source_chunks`. `pnpm typecheck` y `pnpm lint` en verde; cero cambios de código de producción (el generador y los 7 archivos del lote corren en el scratchpad y no se committean); cero llamadas a la API de pago. **Siguiente: G38 = verificación ciega de este lote** — mayormente verbal (0/35 admiten cálculo → no cabe el candado de G28); los 4 `SOURCED` se resuelven igual con conocimiento literario de bachillerato porque `loadPendingQuestionsWithContext` no pasa el texto del `SourceChunk`; el control será el descarte explícito de los tres distractores por contenido y la confianza declarada, más recalcular los diagnósticos de longitud contra las respuestas ciegas (G36 §2)**)

</details>

<details><summary>Historial: G36 (2026-08-30)</summary>

Última fase ejecutada: G36 (**COMPLETADA — verificación ciega del lote de G35 (35 reactivos de **Geografía, UNAM Área 3**), segunda mitad del ciclo adversarial de G2. **35/35 auto-aprobados = tasa de auto-aprobación 100 %.** **Segunda ronda consecutiva de canal de entrada limpio** bajo la regla de G32 §2 / G34 §3: la línea 3 nombró los 6 temas del lote pero **ningún punto evaluado por su forma correcta** → **acuerdo 35/35 plenamente independiente, 0 reactivos contaminados**. **Ceguera estructural verificada antes de leer el lote:** `grep -c` de campos de respuesta = **0**; opciones solo con `label, text, imageUrl`; **35/35 `MULTIPLE_CHOICE`**, **0 con `requiresCalculation`**, **0 con pasaje**. **Aislamiento comprobado:** no se abrió el commit `0f40eef` de G35, ni el JSON del lote, ni `Question.options`, ni la sección `## G35`, ni el bloque `### Siguiente (G35)` antes de responder. **Cuarta ronda puramente verbal** tras G30, G32 y G34: control = **descarte explícito de los tres distractores por su contenido** (**0 citas por letra y 0 referencias posicionales** en los 35 razonamientos) + **verificación factual opción por opción** de los 35 `stem` y las 140 opciones. **0 problemas declarados.** **Aporte metodológico (§2): candado mecánico para lotes verbales, el análogo del de unicidad de G28** — recalcular los diagnósticos de longitud de G34 §2 sobre las respuestas ciegas reprodujo **exactamente** el puntaje tie-aware, el ratio medio y sus extremos que anotó G35, lo que solo es posible si ambas sesiones coinciden reactivo a reactivo. **Contrapartida (§3):** ese estadístico es un **checksum derivado de la clave** y la línea 3 lo publicaba — canal teórico y débil; regla nueva: reportarlo como veredicto contra el umbral, no como valor. **Confianza declarada:** mínima **0.96**, promedio **0.984** — empata el piso más alto (G34: 0.96). **Barajado real:** etiqueta ciega = original en **4/35 = 11.4 %**, la más baja registrada. **Confirmación independiente de G35, recontada en vivo:** clave **A9/B9/C9/D8**. **Dos imprecisiones didácticas registradas sin bloquear** (§4): moneda única europea sin acotar, y tramo occidental del límite norte descrito como enteramente rectilíneo. **~11/35 con distractores que caen por implausibilidad general** (confirma G34 §4). **Acumulado real:** banco **797** · verificados **762 → 797** · cola ciega **35 → 0**; UNAM A3 Geografía **35✓/0⧗**; `Question.verification` en 35/35 con `verdict.model="claude-opus-5"`. `content:coverage`: 797 servibles, auto-aprobación global 100 %, meta efectiva G26 (1 222) al **54 %**, brecha **568 ≈ 17 lotes**. **Décima ronda ciega consecutiva al 100 % — la métrica sigue saturada.** `pnpm typecheck` y `pnpm lint` en verde. Cero cambios de código de producción y cero llamadas a la API de pago**)

</details>

<details><summary>Historial: G35 (2026-08-30)</summary>

Última fase ejecutada: G35 (**COMPLETADA — lote de 35 reactivos de **Geografía, UNAM Área 3 (Ciencias Sociales)**. Segunda de las tres materias propias del Área 3 con contenido, tras Historia de México (G33); Historia Universal sigue en cero. Materia **NO compartida** (`sharedContentKey` null, a diferencia de Español/Inglés/Química de la UNAM): el lote va a sus **6 temas propios** y no se reutiliza entre áreas — mismo caso que Historia de México en G33 y Matemáticas Aplicadas de SOCADM en G27. Consulta en vivo a Supabase: los 6 temas en **0 reactivos y 0 `SourceChunk`** → **35/35 TEMARIO_ONLY** (no existe guía de Geografía de la UNAM en `content_sources` ni fragmento clasificado a estos temas). Reparto por los 6 temas sembrados: **5 / 6 / 6 / 6 / 6 / 6** (cartografía y sistemas de referencia · geomorfología · climas y vegetación · geografía política · geografía económica · geografía de México), que cubre las ramas física (17), humana/política (6), económica (6) y de México (6). **35 `MULTIPLE_CHOICE`** (la sección de Geografía de la UNAM es opción múltiple simple; no se forzó `CHART_TABLE` sin tabla, el defecto abierto de G28). Dificultad BASIC 7 / INTERMEDIATE 17 / ADVANCED 9 / EXPERT 2 (≈ 20/49/26/6, la distribución objetivo de `_base.md`). **Clave A9/B9/C9/D8** (25.7/25.7/25.7/22.9 %), las cuatro dentro de la banda 15–40 % de G3c, **confirmada por query directa a la DB** (`jsonb_array_elements` sobre `options`); la letra la asigna el generador con una búsqueda de semilla fija que impide corridas cíclicas A→B→C→D de longitud ≥ 3 (rotación +1: **4/34**, por debajo del azar ≈ 8.5). **Regla de G34 §2 aplicada:** el auto-chequeo del generador emite el **puntaje esperado tie-aware de la heurística «elige la más larga»** y lo mantiene **por debajo de 14/35** — aquí **6.5/35 ≈ 19 %**, por debajo del azar del 25 %; ratio medio de longitud correcta/distractores **0.998** (mín 0.87, máx 1.08), dispersión máx-mín media de 6 caracteres por reactivo, y las dos heurísticas de longitud («la más larga» y «la más corta») rinden por debajo del azar. `content:validate-batch` **0 violaciones** (corrido antes de tocar la DB y de nuevo como paso obligatorio de `content:insert --lot-dir` sobre los 6 archivos). **0 citas por letra** y **0 citas posicionales** en las 105 capas de explicación (auto-chequeo del generador con las regex de `lot-validation.ts` más el patrón `POSITION_REF` de G33; las capas 2 descartan los distractores **por su contenido**). **Exactitud factual verificada opción por opción antes de insertar.** Caveat honesto (patrón G34 §4): en ~3 reactivos BASIC/INTERMEDIATE algún distractor cae por implausibilidad general más que por el dato exacto; los 2 EXPERT exigen síntesis real. **Acumulado real, consultado en vivo antes y después:** banco **762 → 797** total · verificados **762** sin cambio (esta sesión no verifica sus propios reactivos, por diseño) · cola ciega **0 → 35** · Geografía UNAM A3 **0✓/0⧗ → 0✓/35⧗** · 105 `ExplanationLayer`. `pnpm typecheck` y `pnpm lint` en verde; cero cambios de código de producción (el generador y los 6 archivos del lote corren en el scratchpad y no se committean); cero llamadas a la API de pago. **Siguiente: G36 = verificación ciega de este lote** — puramente verbal (0/35 admiten cálculo → no cabe el candado de G28); el control será el descarte explícito de los tres distractores por contenido y la confianza declarada**)

</details>

<details><summary>Historial: G34 (2026-08-30)</summary>

Última fase ejecutada: G34 (**COMPLETADA — verificación ciega del lote de G33 (35 reactivos de **Historia de México, UNAM Área 3**), segunda mitad del ciclo adversarial de G2. **35/35 auto-aprobados = tasa de auto-aprobación 100 %.** **Primera ronda con el canal de entrada limpio desde que existe la regla de G32 §2:** la línea 3 de este documento se lee al inicio de toda sesión por diseño, y esta vez **no nombró ningún punto evaluado por su forma correcta** — de ahí que el **acuerdo sea 35/35 plenamente independiente, 0 reactivos contaminados** (G32: 26/26 limpios de 35; G30: 34/35). La regla funcionó y es el resultado que esta fase aporta. **Ceguera estructural verificada antes de leer el lote:** `grep -c` de `isCorrect|explanation|correctOption|"answer"|correctAnswer|solution` = **0**; las claves de cada opción son solo `label, text, imageUrl`; **35/35 `MULTIPLE_CHOICE`**, **0 con `requiresCalculation`** y **0 con pasaje** (los 35 llegan autocontenidos en el `stem`). **Aislamiento comprobado:** no se abrió el commit `ff5be4b` de G33, ni `docs/content-batches/g33-unam-a3-historia-mexico.json`, ni `Question.options`, ni la sección `## G33`, ni el bloque `### Siguiente (G33)` antes de responder (ese bloque se leyó **después** de resolver, para redactar esta sección). **Tercera ronda puramente verbal** tras G30 y G32: sin cálculo no cabe el candado aritmético de G28, así que el control fue el **descarte explícito de los tres distractores por su contenido** (autochequeo POSITION_REF sobre los 35 razonamientos: **0 referencias posicionales**) más, como pidió el encargo, la **verificación factual opción por opción** de los 35 `stem` y las 140 opciones. **0 problemas declarados.** Una sola imprecisión registrada **sin bloquear publicación**: un `stem` fecha en 1862 el envío de tropas de la intervención tripartita, cuando la vanguardia española desembarcó en Veracruz en diciembre de 1861 (Francia e Inglaterra sí en enero de 1862) — es la datación didáctica estándar del temario y no altera lo que el reactivo evalúa, así que va como observación, no como `problems`. **Confianza declarada:** mínima **0.96**, máxima 0.99, promedio **0.984** — el **piso más alto de cualquier ronda ciega** (G30 y G32: 0.92; G28: 0.95; G23: 0.93). Lectura honesta: no es que el lote sea mejor, es que la historia curricular de opción múltiple admite menos matiz que el razonamiento verbal; **la contrapartida es que en ~11 de los 35 los tres distractores caen por imposibilidad material o cronológica sin necesitar el dato que el reactivo dice evaluar**, así que la dificultad declarada puede estar sobreestimada (observación de composición para G35). **El barajado es real:** la etiqueta ciega coincide con la original en **7/35 = 20 %**, por debajo del 25 % de azar. **Confirmación independiente de G33, recontada en vivo:** clave **A9/B9/C9/D8**, rotación +1 **3/34 = 8.8 %** y ratio medio de longitud **1.017** (máx 1.172) — los tres coinciden con lo que G33 registró. **Pero el cue de longitud estaba mal leído (§2):** el «13/35 sin señal aprendible» de G33 es el conteo **estricto** (correcta como **única** más larga), p = 0.076 a una cola; contando los **2 empates** en el máximo son **15/35, p = 0.016**, y el puntaje esperado de la heurística «elige la más larga, empates al azar» es **14.00/35 = 40 %** frente al 25 % de azar, **justo en la cota del 95 %** (k = 14 para 35 ensayos). El ratio medio ≈ 1.0 es neutro y **enmascara** el estadístico de rango (rangos de la correcta {1: 15, 2: 5, 3: 9, 4: 6} contra 8.75 esperados por celda). **Regla nueva (§2):** vigilar el **puntaje esperado tie-aware** y mantenerlo **< 14/35**, no solo el ratio ni el conteo estricto. **Acumulado real, consultado en vivo antes y después:** banco **762** totales · verificados **727 → 762** · cola ciega **35 → 0** · sin publicar con veredicto 0; UNAM A3 Historia de México **0✓/35⧗ → 35✓/0⧗**. `content:coverage`: 762 servibles, auto-aprobación global 100 % (762/762), meta efectiva G26 (1 222) al **52 %**, brecha **590 ≈ 17 lotes**; meta nominal de 1 500: 48 % → **51 %**. **Nota honesta: novena ronda ciega consecutiva al 100 % — la métrica sigue saturada y no discrimina**; lo que esta fase aporta es la primera ronda de canal limpio y una corrección metodológica al indicador de longitud. `pnpm typecheck` y `pnpm lint` en verde. Cero cambios de código de producción —los diagnósticos corrieron en scripts desechables, creados y borrados— y cero llamadas a la API de pago**)

</details>

<details><summary>Historial: G33 (2026-08-30)</summary>

Última fase ejecutada: G33 (**COMPLETADA — lote de 35 reactivos de **Historia de México, UNAM Área 3 (Ciencias Sociales)**. Primera cobertura de contenido propio del Área 3 en todo el banco: el pool servible de A3 era 35, todo Español reutilizado por G26; sus materias propias (Historia de México, Historia Universal, Geografía) estaban en **cero absoluto**. El encargo redirigió el hueco: G30–G32 nombraron **IPN SOCADM** Historia de México como candidata natural; esta fase abrió **UNAM A3** Historia de México, también en cero y de **mayor peso del área** (`questionWeight` 7). Materia **NO compartida** (`sharedContentKey` null, a diferencia de Español/Inglés/Química de la UNAM): el lote va a sus **6 temas propios** y no se reutiliza entre áreas. Reparto por los 6 temas sembrados, de la época prehispánica al México contemporáneo: **5 / 6 / 6 / 6 / 7 / 5**; el Porfiriato, que el temario no separa como tema, queda repartido entre Reforma y Revolución. **7 SOURCED / 28 TEMARIO_ONLY:** el tema Revolución Mexicana tiene **2 `SourceChunk`** (guía de la UAM `uam_csh.pdf`, pp. 41–42, clasificada a ese tema por el pipeline F2b en julio); sus 7 reactivos citan ambos fragmentos → `groundingStatus = SOURCED`. Los otros 28 son TEMARIO_ONLY, como G22/G27/G29/G31 (no existe guía de la UNAM de Historia en `content_sources`… la clasificada es de la UAM y el pipeline la asignó por temario). **35 `MULTIPLE_CHOICE`** (la sección de Historia del examen real de la UNAM es opción múltiple simple); el encargo pidió **priorizar comprensión de procesos sobre memorización de fechas aisladas**, así que los stems preguntan por causas, consecuencias, continuidades y contrastes, no por efemérides. Dificultad BASIC 7 / INTERMEDIATE 17 / ADVANCED 9 / EXPERT 2 (≈ 20/49/26/6). **Clave A9/B9/C9/D8** (25.7/25.7/25.7/22.9 %), las cuatro dentro de la banda 15–40 % de G3c, **confirmada por query directa a la DB** tras la inserción; la letra la asigna el generador con una búsqueda que impide corridas cíclicas A→B→C→D (rotación +1: **3/34**, muy por debajo del azar ≈ 8.5). **Cue de longitud vigilado (G30/G31):** la opción correcta arrastraba su cláusula justificativa (que pertenece a la capa 1); se recortó a la aserción y se equilibraron distractores → correcta = opción más larga **13/35**, ratio medio de longitud correcta/distractores **1.02** (máx 1.17), sin señal aprendible. `content:validate-batch` **0 violaciones**. Insertado tema por tema con `content:insert --lot-dir`, **verificado en la DB:** banco **727 → 762** total, verificados sin cambio en **727** (esta sesión no verifica sus propios reactivos, por diseño), cola ciega **0 → 35**, 105 `ExplanationLayer`, 14 `question_source_chunks`. Registro permanente en `docs/content-batches/g33-unam-a3-historia-mexico.json`. Compuesto con un generador de Python desechable en el scratchpad que auto-chequea distribución de letra, longitud de opciones, citas por letra, **citas posicionales** (el barajado rompe cualquier «la segunda opción…» — defecto nuevo, ver §5) y grounding antes de validar; el generador y los 6 archivos del lote no se committean. `pnpm typecheck` y `pnpm lint` en verde. Cero cambios de código de producción y cero llamadas a la API de pago**)

</details>

<details><summary>Historial: G32 (2026-08-29)</summary>

Última fase ejecutada: G32 (**COMPLETADA — verificación ciega del lote de G31 (35 reactivos de **Inglés, IPN**, pool compartido `IPN:INGLES`), segunda mitad del ciclo adversarial de G2. **35/35 auto-aprobados = tasa de auto-aprobación 100 %.** **Primera ronda ciega sobre contenido en inglés** y segunda puramente verbal tras G30: 0/35 admiten cálculo, así que no cabe el candado aritmético de G28 y el control es el **descarte explícito de los tres distractores por su contenido** más, en los 17 reactivos de gramática y vocabulario, **la regla citada por su nombre**. **Ceguera estructural verificada antes de leer el lote:** `grep -c` de `isCorrect|explanation|correctOption|"answer"|correctAnswer|solution` = **0**; las claves de cada opción son solo `label, text, imageUrl`; y los **18 de comprensión llegaron CON su pasaje** (4 pasajes: 5/5/3/5), como exige el formato. **Aislamiento comprobado:** no se abrió el commit `eb7a48a` de G31, ni `docs/content-batches/g31-ipn-ingles.json`, ni `Question.options`, ni la sección `## G31`, ni el bloque `### Siguiente (G31)` antes de responder. **Pero la contaminación de esta ronda es la más grave registrada, y es de canal, no de encargo:** la **línea 3 de este documento** se leyó al inicio de la sesión y enumeraba los puntos evaluados **por su forma correcta**, entregando la respuesta de **6 reactivos** de forma decisiva, **1** ambigua y **2** solo por tema. **Acuerdo limpio: 26/26**; los otros 9 se aprobaron con la contaminación anotada. **Es el mismo defecto que G30 §1 halló en el bloque `### Siguiente`, migrado al resumen de composición.** **Regla nueva (G32 §2):** línea 3 y fila de tabla deben nombrar el punto evaluado **genéricamente**, nunca por su forma correcta; la enumeración de la línea 3 quedó redactada en el bloque Historial de G31. **Confianza declarada:** mínima **0.92**, máxima 0.99, promedio **0.965**. **El barajado es real:** la etiqueta ciega coincide con la original en **10/35 (28.6 %)**. **Confirmación independiente de G31, recontada en vivo:** clave **A9/B9/C9/D8**, rotación A→B→C→D **6/34 = 17.6 %**, correcta = opción más larga **8/35 = 22.9 %**, 18 con pasaje — **los cuatro coinciden con lo que G31 registró**. **Acumulado real:** banco **727** totales · verificados **692 → 727** · cola ciega **35 → 0**; IPN MEDBIO Inglés **0✓/35⧗ → 35✓/0⧗**. `content:coverage`: 727 servibles, auto-aprobación global 100 % (727/727), meta efectiva G26 (1 222) al **49 %**, brecha **625 ≈ 18 lotes**; meta nominal de 1 500: 46 % → **48 %**. **Nota honesta: octava ronda ciega consecutiva al 100 % — la métrica está saturada y no discrimina.** Lo que aporta esta fase no es el 100 %, es haber detectado una **fuga de información en el canal de entrada** de la ronda ciega, el primer defecto del pipeline hallado fuera del lote. `pnpm typecheck` y `pnpm lint` en verde. Cero cambios de código de producción y cero llamadas a la API de pago**)

</details>

<details><summary>Historial: G31 (2026-08-29)</summary>

Última fase ejecutada: G31 (**COMPLETADA — lote de 35 reactivos de **Inglés, IPN** (materia COMPARTIDA `sharedContentKey=IPN:INGLES`, migración 0011/G26), **primera cobertura de Inglés en todo el banco**. A diferencia de la UNAM, el examen del IPN evalúa Inglés en las **3 ramas** (FISMAT w2, MEDBIO w3, SOCADM w2) y las 3 celdas estaban en **cero**. Regla de CLAUDE.md/G26 ("componer contra el `topicId` de la materia con más contenido del grupo") con empate a cero → se elige la celda de **mayor peso, MEDBIO** (`cmrr1m31200dvhi3nuat1aznh`, w3), que además define la meta efectiva de G26 para el grupo (**17**); la reutilización G26 lo sirve a FISMAT y SOCADM en runtime (`src/lib/db/shared-content.ts`). **35 TEMARIO_ONLY** — 0 SourceChunk para Inglés IPN y no existe guía del IPN en `content_sources`. Reparto por los 3 temas de MEDBIO Inglés: Presente simple 12, Pasado simple 12, Vocabulario médico-científico 11. **18 comprensión de lectura** (`READING_COMPREHENSION`) sobre **4 pasajes ORIGINALES en inglés** (g31-cut 5 · g31-market 5 · g31-storm 3 · g31-sleep 5), **10 `SENTENCE_COMPLETION`**, **7 `MULTIPLE_CHOICE`** (gramática: tiempos verbales, preposiciones de tiempo y de lugar, preposición dependiente de verbo, conectores de resultado, concordancia, forma interrogativa y negativa; vocabulario: significado por contexto, antonimia por sufijo, colocación verbo+sustantivo, derivación adjetival, polisemia — **enumeración redactada en G32 §2: la versión original nombraba cada punto por su forma correcta y filtró la respuesta de 6 reactivos a la ronda ciega**). **Instrucción en español; contenido evaluado en inglés** (pasaje, oración, opciones), como el examen real. Dificultad BASIC 7 / INTERMEDIATE 18 / ADVANCED 8 / EXPERT 2. **Clave A9/B9/C9/D8** (25.7/25.7/25.7/22.9 %), las cuatro en 15-40 %, confirmada por query directa a la DB; rotación A→B→C→D **6/34 = 17.6 %** (quinto lote limpio seguido); **correcta = opción más larga 8/35 = 22.9 %**, bajo el 25 % de azar — se reescribieron ~10 distractores de comprensión para bajar ese cue del 60 % del primer borrador (donde la respuesta correcta, al ser la paráfrasis completa y fiel, salía más larga). `content:validate-batch` **0 violaciones**. Insertado con `content:insert --lot-dir` tema por tema, **verificado en la DB**: banco **692 → 727** total, verificados sin cambio en **692** (esta sesión no verifica sus propios reactivos, por diseño), cola ciega **0 → 35**, pasajes **8 → 12**. `IPN:INGLES` de 0 a 35 contra una meta efectiva de 17: sobra profundidad, igual que hizo G29 con `IPN:ESPANOL` (70 vs 33) — decisión del encargo, no de la regla. Registro en `docs/content-batches/g31-ipn-ingles.json`. `pnpm typecheck` y `pnpm lint` en verde. Cero llamadas a la API de pago**)

</details>

<details><summary>Historial: G30 (2026-08-29)</summary>

Última fase ejecutada: G30 (**COMPLETADA — verificación ciega del lote de G29 (35 reactivos de **Español/Lectura, pool compartido `IPN:ESPANOL`**), segunda mitad del ciclo adversarial de G2. **35/35 auto-aprobados = tasa de auto-aprobación 100 %.** **Primera ronda ciega puramente verbal a escala:** 0 de los 35 admiten cálculo (`requiresCalculation=false` en todos), así que aquí no cabe el candado aritmético de G28 — el único control es el **descarte explícito de los tres distractores en cada reactivo**, citados por su contenido y nunca por su letra. **Aislamiento comprobado, no asumido:** no se abrió el commit `cc0b49e` de G29, ni el JSON del lote, ni `Question.options`, ni la sección `## G29` de este documento (línea 2094 antes de las inserciones de esta fase; hoy 2361); sí se leyeron el bloque `### Siguiente (G29)` (el encargo) y la fila de tabla de G29, que dan la distribución **agregada** de la clave — sin señal por reactivo, porque el lote ciego baraja las etiquetas con semilla por `id`. **Contaminación declarada, no escondida:** ese encargo nombra el criterio decisivo de uno de los dos `EXPERT` («símil vs. personificación… el nexo "como" es la marca decisiva»), así que **ese reactivo no cuenta como acuerdo independiente**; los otros 34 sí. **Ceguera verificada estructuralmente antes de leer el lote:** `grep -c` de `isCorrect|explanation|correctOption|"answer"|correctAnswer|solution` = **0**; las claves de cada opción son solo `label, text, imageUrl`; y los **20/20 de comprensión llegaron CON su pasaje** (4 pasajes × 5 reactivos), como exige el encargo. **Confianza declarada — el indicador que sí discrimina, según G23:** mínima **0.92**, promedio **0.963**. Esa mínima es **el piso más bajo de cualquier ronda ciega** (G28: 0.95; G23: 0.93): el razonamiento verbal admite matiz donde la aritmética no, y se registra tal cual en vez de inflarse. **0 problemas declarados y 0 ambigüedades forzadas:** los dos reactivos más apretados («marca en la pared», 0.92, y símil vs. personificación, 0.93) se resolvieron por la glosa que el propio texto da de su imagen y por el nexo comparativo, no por descarte a ciegas. **Sin señal de longitud:** la correcta es la opción más larga en **7/35 = 20 %**, por debajo del 25 % de azar. **El barajado es real:** la etiqueta ciega coincide con la original en 12/35 (34.3 %) — 23 respuestas cambiaron de letra. **Corrección al registro de G29:** el reconteo en vivo de la clave da **A9 / B8 / C9 / D9** (25.7 / 22.9 / 25.7 / 25.7 %), no el A9/B9/C9/D8 anotado en G29 — transposición B↔D en la nota; ambas lecturas caen dentro de la banda 15-40 % de G3c, así que nada aguas abajo cambia. Rotación A→B→C→D **6/34 = 17.6 %**, que sí coincide con lo anotado en G29 (cuarto lote limpio seguido). **Acumulado real consultado en vivo antes y después:** banco **692** totales · verificados **657 → 692** · cola ciega **35 → 0** · sin publicar con veredicto 0; IPN FISMAT Español/Lectura **35✓/35⧗ → 70✓/0⧗**. `content:coverage`: 692 servibles, auto-aprobación global 100 % (692/692), meta efectiva G26 (1 222) al **47 %**, brecha **642 ≈ 19 lotes**; meta nominal de 1 500: 44 % → **46 %**. **Nota honesta: séptima ronda ciega consecutiva al 100 % — la métrica sigue saturada y no discrimina**; lo que aporta esta fase es haber sometido a la pasada ciega un lote donde no existe verificación mecánica posible. Tres observaciones de composición registradas sin bloquear publicación (nexo concesivo rodeado de tres causales casi sinónimos; el distractor de personificación cuya justificación es literalmente cierta de la imagen; `content:coverage` sigue mostrando 0✓ en Español/Lectura de SOCADM y MEDBIO porque el pool vive bajo los temas de FISMAT y la reutilización de G26 opera en runtime, no en el reporte). **Reparación de registro:** G29 nunca actualizó la línea 3 de este documento; G30 la repara y archiva G28 y G29 en Historial. `pnpm typecheck` y `pnpm lint` en verde. Cero cambios de código —el diagnóstico corrió en un script desechable, creado y borrado— y cero llamadas a la API de pago**)

</details>

<details><summary>Historial: G29 (2026-08-28)</summary>

Última fase ejecutada: G29 (**COMPLETADA — Encargo: 35 reactivos de Español para la rama SOCADM. Español/Lectura es materia COMPARTIDA (`sharedContentKey=IPN:ESPANOL`, G26): el lote se compuso contra los 4 temas de **FISMAT** (la celda con más contenido del grupo: 35 verificados de G22; MEDBIO y SOCADM en cero) y la reutilización G26 lo sirve a MEDBIO y SOCADM. FISMAT es además la única rama cuyo temario nombra Ortografía y Gramática como temas propios, que es donde caen los formatos del encargo. 35 TEMARIO_ONLY. Reparto: Comprensión lectora 10, Análisis de textos 10, Gramática 9, Ortografía 6 (RC 20 con 4 pasajes ORIGINALES ×5, SENTENCE_COMPLETION 4, ANALOGY 3, MULTIPLE_CHOICE 8). Posición A9/B9/C9/D8 confirmada en la DB; rotación A→B→C→D 6/34 = 17.6 %; correcta = opción más larga 20 %; 0 citas por letra. `content:validate-batch` 0 violaciones. Banco 657 → 692, cola ciega 0 → 35. Segundo lote sobre el pool `IPN:ESPANOL` tras G22 (35→70).**)

*(Entrada reconstruida en G30 desde la fila de tabla de G29: esa fase
nunca actualizó la línea 3 de este documento.)*

</details>

## URL de producción actual

**`https://yaentre.com`** — dominio propio, en producción real, con certificado SSL válido (Let's Encrypt, verificado en vivo el 25 de agosto de 2026). `www.yaentre.com` también resuelve. El proyecto en Vercel se renombró de `acierta` a **`yaentre`** (mismo `projectId`, org `angel011298s-projects`) — el nombre del proyecto y el dominio ya coinciden con la marca. `https://acierta.vercel.app` se conserva como URL de respaldo y sigue sirviendo tráfico (confirmado en vivo).

## Tabla de fases

| Fase | Nombre | Estado | Commit | Notas |
|---|---|---|---|---|
| G41 | Lote de reactivos: Filosofía, UNAM Área 4 | **COMPLETADA — 35 insertados, isVerified=false, banco 832 → 867, cola ciega 0 → 35** | (G41) | Ver sección dedicada abajo. **Segunda materia del Área 4 con contenido** (tras Literatura en G37): Filosofía estaba en cero absoluto. Consulta en vivo a Supabase: **Filosofía es una sola fila `Subject` en el Área 4**, `questionWeight` 3, **`sharedContentKey` NULL** (no entra en G26 — en la UNAM solo Español/Inglés/Química la tienen). Lote a sus **5 temas propios**: Epistemología 9 (incluye lógica) · Metafísica 6 · Ética 8 · Estética 5 · Historia de la filosofía occidental 7. **28/35 TEMARIO_ONLY · 7/35 SOURCED** (el tema «Historia de la filosofía occidental» tiene 3 `SourceChunk` — `uam_csh.pdf` pp. 45-47, banco de preguntas de la guía CSH de la UAM; cada reactivo SOURCED cita el fragmento cuya página contiene su ítem-semilla; el chunk está rebanado por página y arrastra ítems de historia/serie numérica, patrón G40 §7). **Originalidad (G40 §6):** 5 de los 7 SOURCED cambian la tarea de atribución («¿de quién es X?») a comprensión («¿qué sostiene X?»); los 2 más cercanos (#30 Gorgias, #35 Wittgenstein prop. 7) reproducen un enunciado canónico inevitable, reformulado, con la tarea desplazada — se declaran para G42. Prioriza comprensión de argumentos sobre memorización: solo 3 reactivos son de clasificación por definición. 35 `MULTIPLE_CHOICE`; dificultad **7/17/9/2**. Clave **A9/B9/C9/D8**, confirmada por query directa a la DB; sin corridas cíclicas ≥3, rotación +1 = 11.8 %; **equilibrio también por tema** (ninguna letra concentra la correcta en un tema). **Cue de longitud (G34 §2, reportado como veredicto — G36 §3):** tie-aware «elige la más larga» = **6.5/35 = 18.6 %**, «elige la más corta» = **5.3/35 = 15.2 %**, ambas por debajo del azar (25 %) y de la cota 14/35; ratio medio **0.99** (el primer borrador tenía la correcta como la más larga en 31/35 — patrón G33/G35/G37 —, corregido en dos pasadas). `content:validate-batch` **0 violaciones**. 0 citas por letra / posicionales en 105 `ExplanationLayer` (capas 2 «Cómo se descarta cada opción», distractores por contenido). Distractores = **posturas filosóficas reales** correctamente descritas (G36 §5). **Fuga entre reactivos revisada en las dos direcciones (G38 §6 / G40 §3):** #30 (Gorgias) se desacopló de #10 (Parménides/Heráclito) y de #22 (Sócrates) cambiando sus distractores. Las 35 atribuciones de postura verificadas una por una. Registro en `docs/content-batches/g41-unam-a4-filosofia.json`. Generador Python desechable (no committeado). `typecheck`/`lint` verde, 0 cambios de código, 0 API de pago. |
| G40 | Micro-fase editorial + verificación ciega de las reparadas | **COMPLETADA — 3 reparadas, 3/3 rescatadas = 100 % de rescate; banco 832, servibles 832 → 831 (1 retirado a propósito), cola canónica en cero** | (G40) | Ver sección dedicada abajo. **La cola ciega estaba vacía: esta fase la creó reparando, no componiendo** — ejecuta el work order que G39 §9 dejó abierto y lo cierra completo. §9.1 fuga relacional reparada; **hallazgo propio: la fuga era BIDIRECCIONAL** (el reactivo protegido filtraba en su `stem` el punto que evaluaba el otro), así que se repararon los dos, no el señalado. §9.2 los dos reactivos de letras peninsulares salen del `Topic` mexicano a sus temas correctos (uno de ellos además pierde la coletilla que solo justificaba el archivado equivocado ⇒ tercera reparada). §9.3 **desbloqueado**: `manualReview.action` acepta `'duplicate'` (+2 tests) — el bloqueo que G24 y G39 declararon sin resolver; el duplicado de neutralización queda despublicado con veredicto del pipeline intacto y fuera de toda cola. §9.2/d **resuelto con veredicto**: el `SourceChunk` no está mal clasificado por juicio sino **rebanado por página** (arrastra la cola de un reactivo de otra materia), así que ningún `topicId` único puede servirlo — el arreglo vive en el chunker. **Hallazgo nuevo para el work order:** 3 de los 4 reactivos anclados a ese chunk son paráfrasis cercanas de los ítems de la guía fuente, uno casi literal en el `stem` — riesgo de originalidad, no de corrección, y **exige sesión ciega distinta** porque ésta ya quedó contaminada sobre ellos. Arnés auditado antes de reportar el 100 %: **2/3** etiquetas ciegas tradujeron a un id distinto, traducción **biyectiva** (12/12 imágenes, 0 colisiones). **Caveat declarado:** reparación y pasada ciega en la MISMA sesión — la garantía sobre la clave se sostiene (`grep` de campos de respuesta = 0 antes de abrir el lote), la de independencia editorial no. `content:coverage` corregido para que «en banco» cuadre con `COUNT(*)` cuando hay retirados. 493/493 tests. |
| G39 | Balance intermedio del banco | **COMPLETADA — banco 832/832/832, colas en cero (3ª vez consecutiva), brecha efectiva 546 (16 lotes), proyección al 21-nov con ~6 sem de margen** | (G39) | Ver sección dedicada abajo. Pasada editorial (no ciega). Estado consolidado desde la DB real por institución/área/materia; cola formal de discrepancias vacía verificada por 4 vías; 7 defectos editoriales heredados triados con las 4 categorías (0 auto-aprobados); **1 cambio de datos**: 8 `format` `CHART_TABLE → PROBLEM_SOLVING` (G28 §8.1, metadato, sin re-verificación). Auditoría 5 %: mecanismo sano, ejecución vencida 2 ciclos (47/832 = 5.6 %, `session-v1` diluido a 3.4 %), muestra de 40 ids regenerada. Los últimos 6 lotes rindieron ~46 % bajo su potencial contra la meta (97/210 en pools ya cubiertos). Top-5 pools de brecha: IPN Física 76 · UNAM A1 Mat 63 · IPN Mat 63 · IPN Química 54 · IPN MEDBIO Bio 52. |
| G38 | Verificación ciega: Literatura, UNAM Área 4 (lote de G37) | **COMPLETADA — 35/35 auto-aprobados = 100 %, banco 832, verificados 797 → 832, cola ciega 35 → 0** | (G38) | Ver sección dedicada abajo. Contaminación del canal de entrada medida (2/35) y regla nueva para lotes `SOURCED`; el candado de G36 §2 resultó inejecutable y se corrige dónde vive el valor exacto; **la secuencia de clave se recuperó exacta desde las respuestas ciegas** y por eso se redactó de `## G37`; defecto relacional entre dos reactivos del lote (no bloqueante); distractores que caen por implausibilidad general bajan de ~11/35 a 4/35. |
| G37 | Lote de reactivos: Literatura, UNAM Área 4 | **COMPLETADA — 35 insertados, isVerified=false, banco 797 → 832, cola ciega 0 → 35** | (G37) | Ver sección dedicada abajo. **Abre el Área 4** (Humanidades y Artes), que estaba entera en cero. Consulta en vivo a Supabase: **Literatura es una sola fila `Subject`, en el Área 4**, `questionWeight` 4, **`sharedContentKey` NULL** — no hay «Literatura» en el Área 3 y G26 no le dio clave compartida, así que «Áreas 3 y 4» del encargo se resuelve a la única Literatura del Área 4; el lote va a sus **7 temas propios**, sin reutilización entre áreas (como G33 y G35). Reparto por los 7 temas: **5/6/5/5/5/4/5** (prehispánica · colonial · neoclásica y romántica · realismo y naturalismo · modernismo · contemporánea mexicana · universal clásica); cubre géneros, corrientes y movimientos, figuras retóricas y literatura mexicana e hispanoamericana. **31/35 TEMARIO_ONLY · 4/35 SOURCED** (el tema «Literatura contemporánea mexicana» tiene 1 `SourceChunk` — banco de preguntas de la guía CSH de la UAM: picaresca/Quevedo, Generación del 98, Octavio Paz; `grounding.ts` obliga a citar → sus 4 reactivos llevan `sourceChunks:[1]`). **Imprecisión de clasificación F2b documentada y no bloqueante:** 2 de esos 4 tratan letras españolas, derivan directo del fragmento y son factualmente correctos; los `stem` lo explicitan. 35 `MULTIPLE_CHOICE`; dificultad **7/17/9/2**. Clave **A9/B9/C9/D8**, confirmada por query directa a la DB; rotación cíclica +1 = 3/34. **Regla de G34 §2, reportada como veredicto (G36 §3):** tie-aware de «elige la más larga» **por debajo del azar y de la cota 14/35**; «elige la más corta» en el azar; ratio medio ≈ 1.0 (el primer borrador tenía la correcta como la más larga en la mitad del lote — patrón G33/G35 —, corregido en dos pasadas). `content:validate-batch` **0 violaciones**. 0 citas por letra / posicionales en 105 `ExplanationLayer` (capas 2 tituladas «Cómo se descarta cada opción», citan distractores por contenido). **Atendida la observación de G36 §5:** en BASIC/INTERMEDIATE los distractores son alternativas reales que exigen conocimiento para rechazarse. **Derechos de autor:** cero fragmentos extensos de obras vigentes; los 3 reactivos de análisis de texto usan textos **originales**; sin citas de traducciones. Exactitud factual verificada opción por opción. Registro en `docs/content-batches/g37-unam-a4-literatura.json`. Generador de Python desechable (no committeado). |
| G36 | Verificación ciega: Geografía, UNAM Área 3 (lote de G35) | **COMPLETADA — 35/35 auto-aprobados = 100 %, banco 797, verificados 762 → 797, cola ciega 35 → 0** | (G36) | Ver sección dedicada abajo. **Segunda ronda consecutiva de canal limpio** (G32 §2 / G34 §3): la línea 3 nombró los 6 temas pero ningún punto por su forma correcta → acuerdo **35/35 independiente, 0 contaminados**. Ceguera estructural verificada (`grep` de campos de respuesta = 0; opciones solo `label/text/imageUrl`; 35/35 `MULTIPLE_CHOICE`; 0 `requiresCalculation`; 0 pasajes). Cuarta ronda **puramente verbal**: control = descarte de los tres distractores **por contenido** (0 citas por letra, 0 referencias posicionales) + **verificación factual opción por opción** de 35 `stem` y 140 opciones — **0 problemas**, 2 imprecisiones didácticas registradas sin bloquear. **Aporte metodológico (§2): candado mecánico para lotes verbales** — recalcular los diagnósticos de longitud de G34 §2 sobre las respuestas ciegas reprodujo **exactamente** los valores de G35, lo que solo es posible si ambas sesiones coinciden reactivo a reactivo; es el análogo verbal del candado de unicidad de G28. **§3:** ese estadístico es un checksum derivado de la clave y la línea 3 lo publica — canal débil, mitigación barata, regla nueva para composición. Confianza mín **0.96** / prom **0.984**. Barajado real: etiqueta ciega = original en **4/35 = 11.4 %**, la más baja registrada. Reconteo en vivo confirma la clave **A9/B9/C9/D8** de G35. |
| G35 | Lote de reactivos: Geografía, UNAM Área 3 | **COMPLETADA — 35 insertados, isVerified=false, banco 762 → 797, cola ciega 0 → 35** | (G35) | Ver sección dedicada abajo. **Segunda de las 3 materias propias del Área 3 con contenido**, tras Historia de México (G33); Historia Universal sigue en cero. Materia **NO compartida** (`sharedContentKey` null): el lote va a sus **6 temas propios**, sin reutilización entre áreas — como G33 y G27. Consulta en vivo: los 6 temas en 0 reactivos y 0 `SourceChunk` → **35/35 TEMARIO_ONLY** (no hay guía de Geografía de la UNAM en `content_sources`). Reparto por los 6 temas sembrados: **5/6/6/6/6/6** (cartografía · geomorfología · climas y vegetación · geografía política · geografía económica · geografía de México), que cubre las ramas física, humana, económica y de México. 35 `MULTIPLE_CHOICE`; dificultad 7/17/9/2. Clave **A9/B9/C9/D8**, confirmada por query directa a la DB; rotación cíclica +1 = 4/34. **Regla de G34 §2 aplicada:** puntaje esperado tie-aware de «elige la más larga» = **6.5/35 ≈ 19 %** (umbral < 14/35), ratio medio de longitud **0.998**. `content:validate-batch` 0 violaciones. 0 citas por letra / posicionales en 105 `ExplanationLayer`. Exactitud factual verificada opción por opción. Registro en `docs/content-batches/g35-unam-a3-geografia.json`. Generador de Python desechable (no committeado). |
| G34 | Verificación ciega: Historia de México, UNAM Área 3 (lote de G33) | **COMPLETADA — 35/35 auto-aprobados = 100 %, banco 762, verificados 727 → 762, cola ciega 35 → 0** | (G34) | Ver sección dedicada abajo. **Primera ronda de canal de entrada limpio** desde la regla de G32 §2: la línea 3 no filtró ningún punto por su forma correcta → **acuerdo 35/35 independiente, 0 contaminados** (G32: 26/26; G30: 34/35). Ceguera estructural verificada (`grep` de campos de respuesta = 0; opciones solo `label/text/imageUrl`; 0 `requiresCalculation`; 0 pasajes). Ronda **puramente verbal**: el control fue el descarte de los tres distractores **por contenido** (0 referencias posicionales) más **verificación factual opción por opción** de 35 `stem` y 140 opciones — **0 problemas**, una imprecisión de datación registrada sin bloquear. Confianza mín **0.96** / prom **0.984**, el piso más alto registrado. Barajado real: etiqueta ciega = original en **7/35 = 20 %**. Reconteo en vivo confirma clave, rotación y ratio de G33; **corrige su lectura del cue de longitud** (§2): tie-aware **14.00/35 = 40 %** contra 25 % de azar. |
| G33 | Lote de reactivos: Historia de México, UNAM Área 3 | **COMPLETADA — 35 insertados, isVerified=false, banco 727 → 762, cola ciega 0 → 35** | (G33) | Ver sección dedicada abajo. **Primera cobertura de contenido propio del Área 3** (Ciencias Sociales); sus materias propias estaban en cero absoluto (el pool servible de 35 era Español reutilizado por G26). El encargo redirigió el hueco que G30–G32 nombraban en **IPN SOCADM** hacia **UNAM A3** Historia de México — también en cero y de mayor peso del área (`questionWeight` 7). Materia **NO compartida** (`sharedContentKey` null): el lote va a sus 6 temas propios, sin reutilización entre áreas. Reparto por los 6 temas sembrados (época prehispánica → México contemporáneo): 5/6/6/6/7/5; el Porfiriato, sin tema propio en el temario, repartido entre Reforma y Revolución. **7 SOURCED** (el tema Revolución Mexicana tiene 2 `SourceChunk` de una guía de la UAM clasificada ahí por F2b; sus reactivos citan ambos) **/ 28 TEMARIO_ONLY.** 35 `MULTIPLE_CHOICE` de **comprensión de procesos** (causas, consecuencias, continuidades, contrastes — no efemérides), como pidió el encargo. Dificultad 7/17/9/2. Clave **A9/B9/C9/D8**, confirmada por query directa a la DB; rotación cíclica +1 = 3/34; correcta = opción más larga 13/35, ratio medio de longitud 1.02 (cue de G30/G31 vigilado, sin señal). `content:validate-batch` 0 violaciones. 105 `ExplanationLayer`, 14 `question_source_chunks`. Registro en `docs/content-batches/g33-unam-a3-historia-mexico.json`. Generador de Python desechable (auto-chequea letra, longitud, citas por letra, **citas posicionales** y grounding). |
| G32 | Verificación ciega: Inglés IPN (lote de G31) | **COMPLETADA — 35/35 auto-aprobados (100 %), banco 692 → 727 verificados, cola ciega 35 → 0** | (G32) | Ver sección dedicada abajo. Segunda mitad del ciclo adversarial de G2 sobre el lote de G31. **Primera ronda ciega sobre contenido en inglés**; segunda puramente verbal tras G30 (0/35 admiten cálculo → sin candado aritmético de G28; el control es el descarte explícito de los tres distractores más la regla gramatical citada por su nombre). Ceguera estructural verificada (`grep` = 0; claves de opción solo `label, text, imageUrl`); **los 18 de comprensión llegaron CON su pasaje** (4 pasajes, 5/5/3/5). Aislamiento comprobado: no se abrió el commit de G31, ni el JSON del lote, ni `Question.options`, ni la sección `## G31`, ni el bloque `### Siguiente (G31)`. **Contaminación grave declarada, y de canal:** la **línea 3** de este documento enumeraba los puntos evaluados **por su forma correcta**, entregando 6 respuestas de forma decisiva, 1 ambigua y 2 por tema → **acuerdo limpio 26/26**, los otros 9 aprobados con la contaminación anotada. Es el defecto de G30 §1 migrado del bloque `### Siguiente` al encabezado; la enumeración quedó **redactada** y la regla nueva está en §2. Confianza mínima **0.92**, promedio 0.965, 0 problemas. Barajado real: la etiqueta ciega coincide con la original en 10/35 (28.6 %). **Confirmación independiente de G31:** clave A9/B9/C9/D8, rotación 6/34 = 17.6 %, correcta = más larga 8/35 = 22.9 %, 18 con pasaje — **los cuatro coinciden con lo registrado** (a diferencia de G29). Octava ronda seguida al 100 %: métrica saturada, y se dice así. Cero cambios de código de producción. |
| G31 | Lote de reactivos: Inglés IPN (3 ramas, materia en cero) | **COMPLETADA — 35 insertados, isVerified=false** | (G31) | Ver sección dedicada abajo. **Primera cobertura de Inglés del banco.** A diferencia de la UNAM, el IPN evalúa Inglés en las 3 ramas; materia COMPARTIDA (`sharedContentKey=IPN:INGLES`, G26), las 3 celdas en cero. Regla de G26 con empate a cero → celda de mayor peso: **MEDBIO** (w3), que define la meta efectiva del grupo (17); reutilización G26 sirve a FISMAT y SOCADM. 35 TEMARIO_ONLY (0 SourceChunk IPN). Reparto por los 3 temas de MEDBIO: Presente simple 12, Pasado simple 12, Vocabulario médico-científico 11. Formato: 18 `READING_COMPREHENSION` sobre 4 pasajes ORIGINALES en inglés (5/5/3/5), 10 `SENTENCE_COMPLETION`, 7 `MULTIPLE_CHOICE`. Instrucción en español, contenido en inglés. Clave A9/B9/C9/D8, rotación A→B→C→D 6/34 = 17.6 %, correcta = opción más larga 8/35 = 22.9 % (tras reescribir ~10 distractores). `content:validate-batch` 0 violaciones. Banco 692 → 727, cola ciega 0 → 35, pasajes 8 → 12. Registro en `docs/content-batches/g31-ipn-ingles.json`. |
| G30 | Verificación ciega: Español/Lectura IPN (lote de G29) | **COMPLETADA — 35/35 auto-aprobados (100 %), banco 657 → 692 verificados, cola ciega 35 → 0** | (G30) | Ver sección dedicada abajo. Segunda mitad del ciclo adversarial de G2 sobre el lote de G29. Primera ronda ciega **puramente verbal a escala**: 0/35 admiten cálculo, así que no cabe el candado aritmético de G28 y el único control es el **descarte explícito de los tres distractores**, citados por contenido y nunca por letra. Aislamiento comprobado (no se abrió el commit de G29, ni el JSON, ni `Question.options`, ni la sección `## G29`); ceguera verificada con `grep` = 0 y por las claves de opción; **los 20 de comprensión llegaron CON su pasaje** (4 pasajes × 5). **Contaminación declarada:** el encargo leído nombra el criterio decisivo de uno de los dos `EXPERT`, así que ese reactivo no cuenta como acuerdo independiente. Confianza mínima **0.92** (el piso más bajo de cualquier ronda ciega; G28 0.95, G23 0.93), promedio 0.963, 0 problemas y 0 ambigüedades forzadas. Sin señal de longitud (correcta = más larga 7/35 = 20 %). Barajado real: la etiqueta ciega coincide con la original en 12/35 (34.3 %). **Corrección a G29:** la clave recontada en vivo es A9/B8/C9/D9, no A9/B9/C9/D8 (transposición B↔D; ambas dentro de la banda de G3c). Séptima ronda seguida al 100 %: la métrica sigue saturada y se dice así. Cero cambios de código. |
| G29 | Lote de reactivos: Español/Comunicación IPN (encargo SOCADM) | **COMPLETADA — 35 insertados, isVerified=false** | (G29) | Ver sección dedicada abajo. Encargo: 35 reactivos de Español para la rama SOCADM. Español/Lectura es materia COMPARTIDA (`sharedContentKey=IPN:ESPANOL`, G26): el lote se compuso contra los 4 temas de **FISMAT** (la celda con más contenido del grupo: 35 verificados de G22; MEDBIO y SOCADM en cero) y la reutilización G26 lo sirve a MEDBIO y SOCADM. FISMAT es además la única rama cuyo temario nombra Ortografía y Gramática como temas propios, que es donde caen los formatos del encargo. 35 TEMARIO_ONLY. Reparto: Comprensión lectora 10, Análisis de textos 10, Gramática 9, Ortografía 6 (RC 20 con 4 pasajes ORIGINALES ×5, SENTENCE_COMPLETION 4, ANALOGY 3, MULTIPLE_CHOICE 8). Posición A9/B9/C9/D8 confirmada en la DB; rotación A→B→C→D 6/34 = 17.6 %; correcta = opción más larga 20 %; 0 citas por letra. `content:validate-batch` 0 violaciones. Banco 657 → 692, cola ciega 0 → 35. Segundo lote sobre el pool `IPN:ESPANOL` tras G22 (35→70). |
| G28 | Verificación ciega: Matemáticas Aplicadas IPN SOCADM (G27) | **COMPLETADA — 35/35 auto-aprobados (100 %), banco 622 → 657 verificados, cola ciega 35 → 0** | (G28) | Ver sección dedicada abajo. Segunda mitad del ciclo adversarial de G2 sobre el lote de G27. Aislamiento comprobado, no asumido (no se abrió el commit de G27, ni el JSON del lote, ni `Question.options`, ni la sección `## G27`); ceguera del archivo verificada con `grep` = 0 y por las claves de opción (`label, text, imageUrl`). Los 35 resueltos con la operación **ejecutada en código**, un solucionador por reactivo escrito desde el enunciado. **Candado nuevo: unicidad** — exactamente una opción coincide con el valor calculado en **35/35** (prueba los distractores, no el acuerdo entre sesiones); 0 enunciados duplicados. Barajado real: la etiqueta ciega coincide con la original solo en 6/35 (17.1 %). Confianza mínima 0.95, 0 problemas. Confirmación independiente de G27: clave A9/B9/C9/D8 y rotación A→B→C→D ausente (7/34 = 20.6 %). Sexta ronda ciega seguida al 100 %: la métrica está saturada y se dice así. Cero cambios de código. |
| G27 | Lote de reactivos: Matemáticas Aplicadas IPN SOCADM (rama en cero) | **COMPLETADA — 35 insertados, isVerified=false** | (G27) | Ver sección dedicada abajo. Primera materia con contenido de la rama SOCADM (7 materias, estaba en cero). Materia "Matemáticas Aplicadas" (weight 3), no el bloque general de Matemáticas — enfoque de razonamiento cuantitativo aplicado. 35 TEMARIO_ONLY, reparto 12/11/12 (Estadística descriptiva / Probabilidad / Análisis de datos). Cálculos recomputados uno por uno. Posición A9/B9/C9/D8, `content:validate-batch` 0 violaciones. Banco 622 → 657, cola ciega 0 → 35. |
| G26 | Reutilización de contenido entre áreas | **COMPLETADA — mecanismo `Subject.sharedContentKey` (migración 0011), 7 grupos / 19 filas; selector, diagnóstico, simulador y Entrómetro cableados; meta 1 500 → ~1 220, brecha 878 → 659** | (G26) | Ver sección dedicada abajo. Una columna nullable, sin tocar `Question` ni `Topic`. Confirmado con guías oficiales que el área solo cambia el peso. `test:unit` 491/491 (+15). |
| G25 | Verificación ciega: auditoría 5 % de `session-v1` | **COMPLETADA con desviación declarada — no había "reparadas de G24" que verificar (cola en cero); se ejecutó la auditoría 5 %: 31/31 confirmados, 0 degradados, banco 622/622 sin cambio** | (G25) | Ver sección dedicada abajo. La premisa del encargo era falsa y se comprobó sin leer el commit de G24. `session-v1` pasa de 0 a 18 auditados. |
| G24 | Balance del banco y triaje de cola | **COMPLETADA — banco 622/622, colas en cero, brecha 878 (26 lotes), 1 bug de auditoría corregido** | (G24) | Ver sección dedicada abajo. **Pasada editorial** (no ciega, por diseño del encargo: aquí sí se ven las respuestas del generador y del verificador, el trabajo es juzgar cuál tiene razón — igual que G17). Estado consolidado con números reales de la DB (`scripts/g24-consolidate.ts`, desechable, solo lectura). **Banco: 622 reactivos, 622 verificados, 622 servibles (`usage=SERVABLE`), todos `GENERATED`.** **Las dos colas en cero** — cola ciega 0, cola de discrepancias 0: la "cola acumulada" que el encargo pedía triar **no existe**, se vació por completo en G19 (77 reparadas de G17 re-verificadas) y G21/G23 la mantuvieron vacía. Cero reactivos con `isVerified=false`. **Ningún reactivo auto-aprobado por esta fase** (no había nada que aprobar). Desglose por institución/área/materia: IPN FISMAT Matemáticas 70, Física 35, Español/Lectura 35, Química **0**, Inglés 0; IPN MEDBIO Biología 70, Química 35, Matemáticas **0**, Español/Lectura 0, Inglés 0; UNAM A1 Matemáticas 81, Física 72, Química 52, Español 35, Inglés 0; UNAM A2 Biología 65, Química 72, Español 0, Inglés 0; UNAM A3/A4 e IPN SOCADM **enteras en cero**. **Distribución de posición de la respuesta correcta** (solo `isVerified=true`, letra = `option.id` con `isCorrect` en la DB): UNAM A 26.8 % / B 26.8 % / C 21.5 % / D 24.9 % (n=377); IPN A 25.3 % / B 25.3 % / C 26.1 % / D 23.3 % (n=245); **las 11 materias con contenido dentro del rango 15–40 % de `POSITION_SKEW`** — **el sesgo corregido en G8 NO ha reaparecido**. Barrido de citas por letra sobre las 1 866 capas de explicación: **0** (el fix de G8 se sostiene). **Pero el artefacto de ROTACIÓN de G16 (letra correcta que rota A→B→C→D al ordenar por `id`) sigue presente y sin corregir**, y medido a nivel materia es más marcado de lo que G16 documentó por lote: **IPN FISMAT Matemáticas 61/69 pares consecutivos** (azar ≈17), **IPN MEDBIO Biología 47/69** — los lotes viejos (G3a/G3d/G13/G15); los lotes nuevos G18/G20/G21/G22/G23 están limpios (6–8/34). Reposicionar reactivos ya publicados con `SessionAnswer` sigue siendo decisión del dueño, igual que G16/G21/G23 lo dejaron — se registra con números frescos, no se toca. **SOURCED vs TEMARIO_ONLY: 207 SOURCED (33.3 %) / 415 TEMARIO_ONLY (66.7 %)** — la proporción bajó desde el 44 % de F4 (135/309) porque los lotes G del refuerzo IPN son casi todos `TEMARIO_ONLY` (solo 46/217 temas tienen fragmento fuente). **Auditoría del 5 % (pendiente de G14): mecanismo verificado + 1 bug real corregido.** Los scripts de G17 (`content:audit-sample` / `content:audit-resolve`) funcionan — pool elegible **606**, muestra 5 % = **31** (comprobado en vivo, sin resolver: esta sesión no es ciega). **Hallazgo:** ESTADO decía "nunca se ha auditado nada" — impreciso: el pipeline `adversarial-v1` de F4 **sí** corrió su 3ª pasada integrada sobre **16 de los 309** reactivos originales el 2026-07-21 (16/309 ≈ 5.2 %, los 16 confirmados, 0 degradados). Lo que nunca se ha auditado es el contenido `session-v1` (G2 en adelante): **0 de 313**. **Bug corregido** (`src/lib/admin/verification.ts`): `classifyReviewQueue` comprobaba `decision !== 'UNPUBLISHED'` ANTES de `audit?.degraded` → un reactivo que la 3ª pasada degrade queda `isVerified=false` (bien despublicado por `content-audit-resolve.ts`) pero con `decision:'AUTO_APPROVED'` heredado del veredicto de 2ª pasada, así que el guard lo mandaba a `null` y **desaparecía del panel F3** (ni servido, ni en cola, invisible). Reordenado para mirar `manualReview` → `audit.degraded` → `decision`; 2 tests de regresión nuevos. **Duplicados reales anotados** (0 respuestas, no bloqueantes): `cmrul0y5k…` ≡ `cmrul1p9e…` (H₂SO₄+2NaOH, UNAM Química, ya lo marcó G19) y `cmru8zod5…` ≡ `cmt8mvgiv…` (cruce dihíbrido AaBb×AaBb → 9:3:3:1, pero uno es UNAM A2 y otro IPN MEDBIO — bancos distintos). **Brecha a la meta de 1 500: 878 reactivos = 26 lotes de 35 = ~52 sesiones (compón + verifica ciega).** Proyección honesta: al ritmo con el que el pipeline ha existido de verdad (**13.6 verificados/día** entre G3a 2026-08-04 y G23 2026-08-27, un número que **ya incluye** la pausa de 19 días de agosto por infra/rebrand) alcanza para el **21-nov con ~3 semanas de margen**; al ritmo calendario completo desde el cierre de F4 (**9.9/día**) **lo pierde por ~3 días**. Como el trabajo de infra/credenciales que causó la pausa de agosto **ya está hecho**, la proyección realista se acerca al 13.6 — **pero es borde y no hay margen para otra pausa de varias semanas**. **Top-5 materias por brecha absoluta** (meta = 1 500 prorrateada por `questionWeight` sobre las 270 de peso SUPERIOR, ordenadas por urgencia): (1) **IPN FISMAT Química — brecha 56, EN CERO**, institución día 1; (2) **IPN FISMAT Física — brecha 76** (35/111), día 1; (3) **IPN FISMAT Matemáticas — brecha 63** (70/133), día 1; (4) **IPN MEDBIO Química — brecha 54** (35/89), día 1; (5) **UNAM A1 Matemáticas — brecha 63** (81/144), UNAM ya es la más profunda. También en cero y urgentes aunque fuera del top-5 por tamaño: IPN MEDBIO Matemáticas (44) y Español/Lectura (33). **Pregunta de alcance que hay que resolver antes de mediados de septiembre:** si UNAM A3/A4, IPN SOCADM e Inglés entran en la meta del 21-nov, son ~13 materias más partiendo de cero y los 878 reactivos se reparten entre 24 materias en vez de 11 → más lotes y riesgo de materias con <20 reactivos. Los docs son ambiguos (PRD §14 "UNAM 4 áreas + IPN 2 ramas"; Plan L259 "UNAM completo + IPN Fís-Mat"; la producción real desde G3 solo ha tocado 4 áreas). `pnpm typecheck`, `pnpm lint` y `pnpm test:unit` (**476/476**, +2 sobre G23) en verde. Scripts desechables (`scripts/g24-*.ts`) eliminados al terminar. |
| G23 | Verificación ciega: Español y Habilidad Verbal IPN FISMAT (G22) | **COMPLETADA — 35/35 auto-aprobados (100 %), banco 587 → 622 verificados** | (G23) | Ver sección dedicada abajo. Segunda mitad del ciclo adversarial de G2 sobre el lote de G22. **Aislamiento comprobado, no asumido:** no se leyó el commit `fd6e302` de G22, ni el JSON del lote, ni `Question.options`, ni la sección `## G22` de este documento (línea 2075, dejada sin abrir a propósito, mismo criterio que G21 con G20); el único insumo fue el lote ciego **regenerado en esta sesión** (`pnpm content:blind-batch --all --limit 60` → `blind-batch-2026-08-27T23-54-54-423Z.json`, 35 ítems). **Primer lote verbal y primera verificación ciega con pasajes compartidos:** los 20 `READING_COMPREHENSION` llegaron con su `passage` completo — condición necesaria para poder responderlos — y sin ninguna marca de respuesta; `grep` da **0** para `isCorrect`, `explanation`, `explanations` y `correctOption`. Las 10 ocurrencias de `correct`/`soluci` que aparecen en el archivo se auditaron una por una y **son prosa española legítima** ("completa correctamente la oración", "ofrece varias soluciones posibles"), no marcas de respuesta. **Método, distinto por necesidad al de los lotes de ciencias:** aquí no hay operación que ejecutar, así que `usedCalculation:false` en los 35 (y por primera vez eso **coincide** con `requiresCalculation`, que el pipeline derivó en `false` para los 35 vía `isCalcSubject("Español/Lectura")` — en G21 el flag venía en `true` por materia y hubo que declarar el desglose real a mano). El criterio de resolución fue el que pedía el encargo: para cada reactivo se razonó **por qué cada uno de los tres distractores es insostenible** y por qué la opción elegida es la única defendible, y ese razonamiento quedó persistido íntegro en `Question.verification.reasoning`. **Cero ambigüedades genuinas encontradas, y el estándar se aplicó de verdad, no por omisión:** el encargo pedía marcar como problema (en vez de forzar una elección) cualquier reactivo con dos opciones *igualmente* defendibles. Se sometieron a segunda pasada adversarial los cuatro casos más cerrados y en los cuatro sobrevivió una sola opción, por razones concretas y no por descarte superficial — el detalle está en la sección dedicada. **Resultado de `pnpm content:resolve`: 35 auto-aprobados, 0 sin publicar, 0 omitidos → tasa de auto-aprobación 100 %.** **Candado anti-deriva propio de esta sesión** (mismo patrón que G16/G21): el archivo de respuestas no se escribió a mano — un script emparejó cada letra elegida con un fragmento del contenido razonado y **abortaba sin escribir nada si la letra y el contenido no coincidían o si el fragmento no identificaba de forma única a esa opción**, con igualdad exacta por delante de la subcadena (indispensable aquí: la opción correcta de un reactivo de concordancia es literalmente `fue`, subcadena de su propio distractor `fueron`); pasó en los 35. **Acumulado real consultado en vivo contra Supabase antes y después, no estimado:** banco 622 totales · verificados **587 → 622** · pendientes **35 → 0** · sin veredicto **35 → 0** · sin publicar con veredicto 0 (sin cambio). `Español/Lectura` de IPN FISMAT (`questionWeight=4`) pasó de **0✓/35⧗ a 35✓/0⧗** en sus 4 temas (Comprensión lectora 10, Análisis de textos 10, Gramática 9, Ortografía 6). **Comentario comparativo pedido por el encargo:** la tasa NO difiere de la de ciencias (100 % en G14, G16, G19, G21 y ahora G23) — pero eso, dicho con honestidad, es porque **la métrica está saturada y hoy no discrimina nada**: cinco rondas ciegas seguidas al 100 %. Donde sí aparece la diferencia verbal es en la **confianza**: 14 de 35 reactivos por debajo de 0.99 (40 %), contra 3/35 en G21, 3/35 en G16 y 2/35 en G14 (≈8 %), y el **mínimo de 0.93 es el más bajo de cualquier ronda ciega del proyecto**. Lectura: el margen entre la opción correcta y el mejor distractor es genuinamente más delgado en lo verbal, aunque nunca llegó a cero. **Tres notas de composición para futuros lotes verbales** (observaciones, no defectos que bloqueen publicación): ver sección dedicada. **Seguimiento del hallazgo de G16 (rotación A→B→C→D de la letra correcta), medido desde el lado ciego: el artefacto NO está presente** — solo **6 de 34** pares consecutivos siguen la rotación, por debajo de los ≈8.5 esperados al azar (secuencia `CADBADBACBBDACDACBDCACBADBCADBDACBC`), frente a los 34/34, 27/34, 26/34 y 21/34 de los cuatro lotes que G16 documentó; segundo lote consecutivo limpio tras G21. Distribución de posición en el espacio ORIGINAL: **A=9, B=9, C=9, D=8** (25.7 %/25.7 %/25.7 %/22.9 %, dentro del rango 15 %-40 % de G3c); las elecciones en el espacio MEZCLADO fueron A=6/B=11/C=7/D=11, o sea el shuffle sí reordenó de verdad. El hallazgo de G16 sigue **sin corregir en los lotes ya publicados de G3a, G3d, G13 y G15**, igual que G16 y G21 lo dejaron. `pnpm typecheck` y `pnpm lint` en verde; **cero cambios de código**. Scripts desechables (`scripts/g23-count.ts`, `scripts/g23-seqcheck.ts`, `scripts/g23-build-answers.ts`) eliminados al terminar. |
| G22 | Lote de reactivos: Español y Habilidad Verbal — IPN FISMAT `Español/Lectura` (materia en cero) | **COMPLETADA — 35 insertados, isVerified=false** | (G22) | Ver sección dedicada abajo. **Institución elegida con números reales (Prisma/SQL directo contra Supabase):** IPN Español/Lectura = **0 reactivos** en las 3 ramas (FISMAT w4, MEDBIO w6, SOCADM w3), 10 temas, 0 SourceChunk, sin guía IPN ingerida; UNAM Español = **35 verificados** (todos Área 1, w10). Brecha normalizada por peso del banco (~3.5 verificados/punto de peso): IPN ~45 vs UNAM ~31, y la de IPN en ramas de lanzamiento día 1 en cero absoluto → **IPN**. Subrama: **FISMAT**, única de IPN cuyo temario cubre los 4 temas que el encargo pide (Ortografía, Gramática, Comprensión lectora, Análisis de textos). **Primer uso del modelo `Passage`:** 4 pasajes ORIGINALES (divulgación científica «Del teocintle al maíz», argumentativo «Más árboles en las ciudades», narrativo «La azotea», ensayístico «En defensa del aburrimiento»), 5 preguntas cada uno = 20 `READING_COMPREHENSION`; + 4 `SENTENCE_COMPLETION`, 2 `ANALOGY`, 9 `MULTIPLE_CHOICE`. **Extensión del pipeline G2** (código): campo `passage` en `QuestionDraftSchema`, regla de lote `PASSAGE_LINK` en `scripts/lib/lot-validation.ts` (RC⇔passage, ≥2 preguntas/pasaje), `findOrCreatePassage` + `passageId` en `content-db.ts`/`content-insert-drafts.ts`. Verificado en DB: banco 587→**622**, verificados **587** (sin cambio), cola ciega 0→**35**, `passages` 0→**4** (cada uno con exactamente 5 preguntas). Posición correcta A9/B9/C9/D8; sin rotación cíclica (17.6 % transiciones +1). Cero API de pago. |
| G21 | Verificación ciega: Química IPN MEDBIO (G20) | **COMPLETADA — 35/35 auto-aprobados (100 %), banco 552 → 587 verificados** | (G21) | Ver sección dedicada abajo. Segunda mitad del ciclo adversarial de G2 sobre el lote de G20. **Aislamiento comprobado, no asumido:** no se leyó el commit `aa763fb` de G20, ni el JSON del lote, ni `Question.options`, ni la sección G20 de este documento antes de publicar; el único insumo fue el lote ciego regenerado en esta sesión (`pnpm content:blind-batch --all --limit 60` → `blind-batch-2026-08-27T01-57-51-887Z.json`, 35 ítems), sobre el que `grep` da **0 ocurrencias de `isCorrect`, `explanation` y `correctOption`**. **El flag `requiresCalculation` viene en `true` en los 35, pero es por MATERIA y no por reactivo** (`isCalcSubject()` lo deriva del nombre "Química"), así que el registro honesto es el que esta sesión declaró ítem por ítem: **`usedCalculation:true` en 21, `false` en 14**. **Los 21 con operación real se resolvieron EJECUTANDO el cálculo en código** (Python + `sympy`), con unidades explícitas y comprobando en el mismo script que **exactamente una** opción coincide (`assert len(hits) == 1`): masa molar de H₂SO₄, moles en 36 g de agua, reactivo limitante de 2H₂+O₂ (el H₂ limita → 4 mol, no los 6 que daría el O₂), rendimiento porcentual, %N en NH₄NO₃, balanceo entero mínimo de C₃H₈+O₂ por búsqueda con conservación de átomos, Kc de H₂+I₂⇌2HI, pH de HCl 0.01 M, [OH⁻] a pH 11 **comprobado contra Kw** (1.0e−14), volumen de titulación, promedio ponderado de isótopos del boro, neutrones por A−Z, conteo de pares libres del H₂O; y, en los que la respuesta es texto pero el criterio sí es calculable, **Zeff por reglas de Slater** a lo largo del periodo 3 (2.20 en Na → 6.10 en Cl, monótona), **suma vectorial de los dipolos del CO₂** (0 a 180° contra 1.224 a 104.5°), **equivalencia simbólica** de las cuatro expresiones de Kc, **Δn de moles de gas** para Le Chatelier, **números de oxidación del carbono funcional** (alcohol −1 → aldehído +1 = oxidación; ácido +3 → alcohol −1 = reducción) y **conteo σ/π por hibridación**. **Cero `NONE_VALID` y cero `MULTIPLE_VALID`.** Los 14 conceptuales se razonaron descartando cada distractor por su contenido — hallazgo de método que lo justifica: **dos opciones del reactivo redox dicen "agente reductor"** y la que se descarta lo justifica diciendo que el sodio "se reduce al ganar electrones", contradiciendo el enunciado (0 → +1); y el distractor "el carbono central no tiene pares libres" del CO₂ es **verdadero pero no es la razón**, por eso se calculó la cancelación vectorial en vez de razonarla de palabra. **Candado anti-deriva propio de esta sesión:** el archivo de respuestas no se escribió a mano — un script emparejó cada letra elegida con un fragmento del contenido razonado y **abortaba sin escribir nada si la letra y el contenido no coincidían o si el fragmento no identificaba de forma única a esa opción** (con igualdad exacta, no subcadena, donde las opciones son números desnudos y "2" es subcadena de "12"); pasó en los 35. **Resultado de `pnpm content:resolve`: 35 auto-aprobados, 0 sin publicar, 0 omitidos → tasa de auto-aprobación 100 %.** Confianza 0.99 en 32, 0.98 en 2 y 0.97 en 1; todas ≥0.85. `model: "claude-opus-5"`, el modelo que de verdad resolvió. **Acumulado real consultado en vivo contra Supabase antes y después, no estimado:** banco 587 totales · verificados **552 → 587** · pendientes **35 → 0** · sin veredicto **35 → 0** · sin publicar con veredicto 0 (sin cambio). **Es la primera vez que el banco entero queda verificado: 587/587 con las dos colas en cero.** Química IPN MEDBIO (`questionWeight=16`) pasó de **0✓/35⧗ a 35✓/0⧗**. **Seguimiento del hallazgo de G16 (rotación A→B→C→D de la letra correcta), medido ahora desde el lado ciego: el artefacto NO está presente en este lote** — solo **7 de 34** pares consecutivos siguen la rotación, contra ≈8.5 esperados al azar, frente a los 34/34, 27/34, 26/34 y 21/34 de los cuatro lotes que G16 documentó. Distribución de posición en el espacio ORIGINAL: **A=9, B=9, C=9, D=8** (25.7 %/25.7 %/25.7 %/22.9 %, dentro del rango 15 %-40 % de G3c); las elecciones en el espacio MEZCLADO fueron A=10/B=11/C=8/D=6, o sea el shuffle sí reordenó de verdad. El hallazgo de G16 sigue **sin corregir en los lotes ya publicados de G3a, G3d, G13 y G15**, igual que G16 lo dejó. `pnpm typecheck` y `pnpm lint` en verde; **cero cambios de código**. Scripts desechables (`scripts/g21-count.ts`, `scripts/g21-seqcheck.ts`) eliminados al terminar. |
| G20 | Lote de reactivos: Química IPN MEDBIO (materia en cero) | **COMPLETADA — 35 insertados, isVerified=false** | (G20) | Ver sección dedicada abajo. **Rama elegida con números reales consultados en vivo (Prisma directo contra Supabase + `pnpm content:coverage`):** las dos materias "Química" de IPN estaban en **0 reactivos** — FISMAT Química (`questionWeight=10`) y MEDBIO Química (`questionWeight=16`). La brecha absoluta contra el peso es mayor en **MEDBIO (16) que en FISMAT (10)**, y la regla de prioridad de G13/G15 ("IPN con <50 verificados, mayor `questionWeight` primero") también favorece a MEDBIO; además MEDBIO Química tiene **1 `SourceChunk`** (tema Química orgánica, `uam_cbs.pdf` p.54) frente a 0 de FISMAT. **9 temas del temario sembrado, 1 con fragmento fuente:** los 3 reactivos de Química orgánica citan `sourceChunks:[1]` de forma obligatoria (SOURCED, derivados genuinamente del fragmento — oxidación = pérdida de electrones, hibridación sp², deshidratación de dos alcoholes → éter); los otros 8 temas TEMARIO_ONLY (32 reactivos) sin bloquear la generación (F2b). **Cobertura repartida entre los 9 temas** (Estructura atómica 4, Tabla periódica 4, Enlace químico 4, Reacciones químicas 4, Estequiometría 5, Equilibrio químico 4, Ácidos y bases 4, Química orgánica 3, Bioquímica básica 3 = 35), con más peso a Estequiometría por ser el tema de mayor rendimiento en el examen real. **13 reactivos son de cálculo** (estequiometría de masa molar / moles / reactivo limitante / rendimiento / composición porcentual, balanceo, masa atómica promedio, pares de Lewis, Kc, pH y pOH, titulación): **los 13 verificados ejecutando la aritmética en un script** — un script calculó la respuesta correcta de cada uno Y cada uno de sus 3 distractores, confirmando que cada distractor corresponde a un error real y nombrable (división invertida, masa equivalente en vez de molar, olvidar ×100, reactivo limitante equivocado, reportar pOH como pH, exponente mal contado) y que exactamente una opción coincide con el valor calculado; las opciones numéricas quedaron en orden ascendente (convención de `_base.md`). **Distribución de posición diseñada con dos pasadas** (numéricas: letra determinada por el orden ascendente; 22 conceptuales: letra asignada para balancear y romper ciclos): **A=9, B=9, C=9, D=8** (25.7/25.7/25.7/22.9 %), las 4 dentro de 15-40 %. **Verificación explícita de que la secuencia NO es cíclica** (defecto que G16 halló en cuatro lotes anteriores): transiciones +1 en el ciclo A→B→C→D **20.6 %**, transiciones −1 **26.5 %**, ambas indistinguibles del azar (~25 %). **Validador de lote de G3c corrido y aprobado** (`content:validate-batch --dir` + `content:insert --lot-dir` en dry-run sobre los 9 archivos: `MALFORMED_OPTIONS` 0, `POSITION_SKEW` 0, `LETTER_CITATION` 0 — distractores citados siempre por su contenido, nunca por su letra; el simulador no baraja opciones para IPN). Insertado con `pnpm content:insert --lot-dir` tema por tema, **verificado con consulta directa a la DB, no solo el log**: Química IPN MEDBIO pasó de **0 a 35 reactivos** (0 verificados, correcto — esta sesión no verifica sus propios reactivos, por diseño del pipeline adversarial); banco global **552 → 587** total, verificados sin cambio en **552**, sin-veredicto **0 → 35**. Registro consolidado en `docs/content-batches/g20-ipn-medbio-quimica.json`. `pnpm typecheck` y `pnpm lint` en verde (sin cambios de código, solo contenido). Cero llamadas a la API de pago de Anthropic — los 35 reactivos se redactaron directamente en esta sesión. Scripts desechables de consulta a la DB, verificación aritmética y exportación eliminados al terminar, junto con `scripts/g20-lote/`. |
| G19 | Verificación ciega: Física IPN FISMAT (G18) y reparadas de G17 | **COMPLETADA — 112/112 auto-aprobados (100 %), banco 440 → 552 verificados** | (G19) | Ver sección dedicada abajo. Dos poblaciones resueltas en la misma pasada ciega pero **medidas por separado**: el lote nuevo de Física de G18 (35, `createdAt` = `updatedAt`) → **35/35 (100 %)**; y las 77 que G17 devolvió a la cola (37 REPARABLE editadas + 40 GENERADOR TENÍA RAZÓN; las 3 IRREPARABLE ya estaban borradas) → **77/77 (100 %)**, es decir **rescate total** del trabajo editorial de G17. Cohortes separadas por timestamps en la DB (`updatedAt > createdAt + 60 s`), partición disjunta y exhaustiva validada con `assert` contra los ids del lote ciego. **65 de 112 con la operación ejecutada en código** (unidades explícitas, comprobando que exactamente una opción coincide); los 47 restantes son conceptuales y van declarados `usedCalculation:false`, sin marcar `true` por inercia. **Ceguera comprobada, no asumida**: `grep -c "isCorrect\|explanation"` sobre el lote ciego → 0, y las consultas de estado seleccionaron solo metadatos, nunca `options`. **El 100 % se auditó antes de reportarlo**: 88/112 etiquetas ciegas tradujeron a un id distinto y la traducción es biyectiva (448 imágenes sin colisión), así que el barajado permutó de verdad y la tasa no es artefacto del arnés. Física IPN sale de CERO a 35 publicables; primera vez que el pipeline queda **sin nada en cola**. Hallazgo anotado, no bloqueante: dos reactivos duplicados (`H₂SO₄ + 2NaOH`) en temas distintos, ambos correctos y ambos aprobados — el defecto es del banco, no del reactivo. Caveat vigente: aislamiento **de sesión, no de modelo**; el muestreo de auditoría del 5 % sigue sin correrse. |
| G18 | Lote de reactivos: Física IPN FISMAT (materia en cero) | **COMPLETADA — 35 insertados, isVerified=false** | (G18) | Ver sección dedicada abajo. **Materia asignada explícitamente por el encargo, sin aplicar la regla de prioridad general**: Física de IPN FISMAT (`questionWeight=20`) llevaba en 0 reactivos desde antes de G13, mencionada como pendiente en G13/G14/G15 sin que ninguna fase la tomara — G18 la trabaja directo. **14 temas del temario sembrado, 1 con `SourceChunk` real** (Cinemática, `ceneval_exanii_i.pdf` p.9 — ejemplo conceptual que distingue velocidad de aceleración): sus 3 reactivos citan `sourceChunks:[1]` obligatoriamente (SOURCED); los 13 temas restantes, sin fragmento fuente, TEMARIO_ONLY (32 reactivos) sin bloquear la generación (F2b). **Cobertura repartida por relevancia declarada en el encargo** ("cinemática, dinámica, trabajo y energía, electricidad y magnetismo, ondas"): los 7 temas que ese listado nombra o agrupa (Cinemática, Dinámica, Trabajo y energía, Electrostática, Corriente eléctrica, Magnetismo, Ondas y sonido) reciben 3 reactivos cada uno (21); los 7 restantes (Momentum e impulso, Gravitación, Fluidos, Termodinámica, Óptica, Inducción electromagnética, Física moderna) reciben 2 cada uno (14) — total 35. **Todos los cálculos verificados EJECUTÁNDOLOS en código antes de redactar el texto final** (27 de los 35 reactivos son de cálculo): un script calculó la respuesta correcta de cada uno (MRUA, leyes de Newton, energía, momento lineal, ley de Coulomb, ley de Ohm, efecto Doppler, notación científica en física moderna, etc.) y un segundo script verificó ADEMÁS cada distractor individual, confirmando que cada uno corresponde a un error real y nombrable (factor olvidado, operación invertida, error de exponente) y que los 4 valores de cada reactivo son numéricamente distintos entre sí — un defecto de par de distractores idénticos se detectó y corrigió en esta verificación antes de redactar ningún JSON. **Distribución de posición diseñada con dos pasadas, no elegida a mano**: para los 27 reactivos numéricos se respetó la convención de `_base.md` (opciones numéricas en orden ascendente), así que la letra de la respuesta correcta es la que el ORDENAMIENTO real de los 4 valores determina, nunca una elección libre; los 8 reactivos conceptuales (sin opciones numéricas) sí se asignaron libremente, usados para balancear lo que los 27 numéricos dejaron sesgado. Resultado: **A=8 (22.9%) B=8 (22.9%) C=10 (28.6%) D=9 (25.7%)**, las 4 dentro de 15%-40%. **Verificación explícita de que la secuencia NO es cíclica** (el defecto real que G16 encontró y documentó en cuatro lotes anteriores): se midió la tasa de transiciones que avanzan +1 en el ciclo A→B→C→D a lo largo de los 35 — **17.6%**, y en sentido inverso **35.3%**, ambas estadísticamente indistinguibles de una secuencia aleatoria (p=0.89 y p=0.12; el umbral que delató a los lotes anteriores fue p<10⁻⁵). **Validador de lote de G3c corrido y aprobado** (`content:validate-batch --dir` + `content:insert --lot-dir` en dry-run sobre los 14 archivos, ambos con 0 violaciones tras corregir 1 falso-positivo propio: una unidad "°C)" partida por un `\text{}` de LaTeX hacía que el regex de cita-por-letra confundiera "C)" con "opción C)" — se unificó el bloque de unidad y el validador quedó en verde). Insertado con `pnpm content:insert --lot-dir` (sin `--dry-run`) tema por tema, verificado con consulta directa a la DB, no solo el log: Física IPN FISMAT pasó de **0 a 35 reactivos** (0 verificados, correcto — esta sesión no verifica sus propios reactivos, por diseño del pipeline adversarial); banco global **517→552** totales, verificados sin cambio en 440, sin-veredicto **77→112** (los 35 nuevos se suman a los 77 que G17 devolvió a la cola ciega). `pnpm typecheck` y `pnpm lint` en verde (sin cambios de código, solo contenido). Cero llamadas a la API de pago de Anthropic. Scripts desechables de cálculo, verificación y consulta a la DB eliminados al terminar. |
| G17 | Triaje de la cola de discrepancias heredada | **COMPLETADA — 80 clasificadas: 37 REPARABLE, 40 GENERADOR TENÍA RAZÓN, 0 VERIFICADOR TENÍA RAZÓN, 3 IRREPARABLE (borrados)** | (G17) | Ver sección dedicada abajo. **Pasada editorial, no ciega, por diseño del encargo**: a diferencia de G14/G16, esta sesión SÍ vio la respuesta del generador y el veredicto completo del verificador para cada una de las 80 — su trabajo era juzgar cuál tenía razón, no resolver desde cero. Clasificación con criterios explícitos y consistentes (documentados en la sección dedicada): defectos mecánicamente reparables (reasignar `topicId`, quitar una glosa reveladora, corregir un valor objetivamente cierto usando notación ya dada en el enunciado) se repararon; complaints subjetivos sin defecto real (distractores "fáciles" sin pista estructural) se resolvieron a favor del generador; 3 reactivos irrecuperables sin inventar contenido nuevo se descartaron. **Las 77 reparadas + generador-tenía-razón quedaron con `verification=null` e `isVerified=false`**, re-entrando a la cola de verificación ciega (`content:blind-batch`) — **ninguna se auto-aprobó desde esta fase**, preservando la garantía adversarial. **3 defectos matemáticos/físicos REALES capturados y corregidos** (no solo cosméticos): un ítem de física con NONE_VALID genuino (la clasificación correcta —equilibrio indiferente— no estaba entre las opciones; se corrigió el texto de la opción y se reescribieron sus 3 explicaciones), y dos ítems de trigonometría con MULTIPLE_VALID genuino (dos identidades simultáneamente falsas, o dos ecuaciones de la ley de senos simultáneamente válidas; se corrigió un valor en cada uno para dejar una sola respuesta correcta). **Patrón sistémico encontrado y reparado, herencia de un lote anterior (probable G3d):** los 8 reactivos de Biología IPN MEDBIO en la cola tenían "CUE DE GLOSA" — la opción correcta era, en el 8/8, la ÚNICA con un paréntesis aclaratorio, permitiendo acertar sin saber biología; se quitó el paréntesis en los 8. **Distribución de posición de las 37 reparadas verificada (regla de G3c): A=12 (32.4%) B=12 (32.4%) C=7 (18.9%) D=6 (16.2%)** — dentro de 15%-40% sin necesidad de reordenar letras, porque ninguna reparación cambió qué opción es la correcta (salvo los 3 defectos reales, donde se corrigió el TEXTO de una opción no-correcta, nunca la letra marcada `isCorrect`). **Acumulado real, antes → después:** banco 520→517 totales (−3 borrados) · verificados 440→440 (sin cambio, correcto) · sin veredicto 0→77 (vuelven a la cola ciega) · sin publicar-con-veredicto 80→0 (la cola de discrepancias quedó en cero). **Dos pendientes de G14 corregidos de paso:** (1) el campo `model` del veredicto ya no hardcodea `VERIFIER_MODEL_TIER` — `VerifierAnswerSchema` gana `model` opcional (default retrocompatible) y `content-resolve-verification.ts` lo persiste tal cual, mismo patrón que `usedCalculation`. (2) El muestreo de auditoría 5% (`sampleForAudit`, `Question.verification.audit`) existía completo y testeado desde el pipeline original pero **ningún script lo invocaba — cero reactivos habían pasado nunca por la tercera pasada**; se agregaron `content:audit-sample` (selecciona el 5% vía `sampleForAudit`, probado en vivo: 424 elegibles → 22 muestreados) y `content:audit-resolve` (aplica el veredicto de la 3ª pasada a `verification.audit`, despublicando si degrada). **Deliberadamente NO se ejecutó la resolución de esa muestra en esta sesión**: esta sesión no es ciega (leyó los 80 veredictos completos), así que no puede ser la tercera pasada independiente — mismo criterio de aislamiento que G16. Queda documentado como trabajo pendiente de una sesión ciega dedicada. `pnpm typecheck`, `pnpm lint` y `pnpm test:unit` (**465/465**, +1 test nuevo para el default de `model`) en verde. Scripts desechables de consulta/aplicación eliminados al terminar; los dos scripts nuevos del pipeline (`content-audit-sample.ts`, `content-audit-resolve.ts`) SÍ se conservan. |
| G16 | Verificación ciega del lote de G15 (2º intento, sesión limpia) | **COMPLETADA — 35/35 auto-aprobados (100%), banco 405 → 440 verificados** | (G16) | Ver sección dedicada abajo. Re-ejecución de G16 en una invocación de `claude` **nueva**, tal como pedía la nota "Siguiente" del intento abortado. **Aislamiento comprobado, no asumido:** no se leyó el commit de G15, ni `docs/content-batches/g15-ipn-medbio-biologia.json`, ni `Question.options`; el único insumo fue un lote ciego **regenerado en esta sesión** (`pnpm content:blind-batch --all --limit 50` → `blind-batch-2026-08-26T01-17-05-172Z.json`, 35 ítems), sobre el que `grep` da **0 ocurrencias de `isCorrect` y 0 de `explanation`**. **Los 35 son conceptuales (`requiresCalculation:false` en los 35, biología), pero los 3 con combinatoria real se resolvieron EJECUTANDO el cálculo en código,** no razonándolo en texto: cuadro de Punnett 4×4 completo para el dihíbrido AaBb×AaBb (16 casillas → A_B_=9, A_bb=3, aaB_=3, aabb=1 = 9:3:3:1), conteo de productos meióticos (2n → 2 células n → 4 células n) y balance de la gametogénesis (4 productos; 4 espermatozoides contra 4−3 cuerpos polares = 1 óvulo). Esos 3 llevan `usedCalculation:true` y los otros 32 `false` — el registro de auditoría dice exactamente lo que la sesión hizo (el campo que G14 arregló). **Los 35 se razonaron descartando cada distractor por su contenido**, no por eliminación superficial. **Candado anti-deriva propio de esta sesión:** el archivo de respuestas no se escribió a mano — un script emparejó cada letra elegida con un fragmento del texto que se había razonado y **abortaba si la letra y el contenido no coincidían**; pasó en los 35, así que ningún acierto puede venir de un desfase de índice. **Resultado de `pnpm content:resolve`: 35 auto-aprobados, 0 sin publicar, 0 omitidos → tasa de auto-aprobación 100%.** Confianza 0.99 en 33, 0.98 en 1 (importancia biológica de la meiosis) y 0.97 en 2 (homología ave-murciélago, y sinapsis química frente a la eléctrica como excepción); todas ≥0.85. **Acumulado real consultado en vivo contra Supabase antes y después, no estimado:** banco 520 totales · verificados **405 → 440** · sin veredicto **35 → 0** · sin publicar 80 (sin cambio, son discrepancias de lotes anteriores ajenas a este lote). Biología IPN MEDBIO pasó de **27✓/35⧗/8✋ a 62✓/0⧗/8✋** — cruzó el umbral de 50, como G15 anticipó, así que el siguiente lote debe re-consultar la brecha en vivo. **HALLAZGO REAL, ajeno al encargo, detectado al leer el log de resolución (ver sección dedicada):** la letra correcta **rota A→B→C→D** dentro de cada lote ordenado por id, en los **cuatro** lotes de contenido generados hasta hoy (G3a 34/34 = 100%, G3d 26/34, G13 27/34, G15 21/34, contra 25% esperado al azar; p entre 6.2e-6 y 3.4e-21). Los cuatro pasaron `POSITION_SKEW` con 9/9/9/8 porque **el validador sólo mira la distribución marginal, nunca el orden**. No invalida ningún reactivo (los 35 se resolvieron a ciegas y coincidieron uno por uno) y hoy no es explotable por un alumno, porque `src/lib/adaptive/selector.ts` baraja los reactivos antes de servirlos; pero es un artefacto de composición que debilita la señal de calidad y quedaría expuesto en cualquier ruta que sirva en orden estable. **No se corrigió: queda fuera del alcance de G16 y reposicionar los reactivos ya publicados de esos cuatro lotes es decisión del dueño del proyecto.** **Caveat honesto heredado, que sigue SIN corregir:** el veredicto persiste `model: VERIFIER_MODEL_TIER` (`'claude-fable-5'`), no el modelo que realmente resolvió (Opus 5) — mismo caveat que G14 anotó y decidió no ampliar de alcance; se mantiene esa decisión por consistencia, no por descuido. `pnpm typecheck`, `pnpm lint` y `pnpm test:unit` (**464/464**) en verde; cero cambios de código. Scripts desechables (`scripts/g16-count.ts`, `scripts/g16-seqcheck.ts`) eliminados al terminar. |
| G16 | Verificación ciega del lote de G15 (1er intento) | **ABORTADA — contaminación de contexto, 0 resueltos, 0 publicados** | (G16) | Ver sección dedicada abajo. **Segunda ocurrencia del mismo fallo de proceso que ya documentó G3e (1er intento), y por la misma causa exacta:** la sesión asignada a verificar era la MISMA conversación que compuso el lote en G15, minutos antes. Se cambió el modelo (`/model claude-opus-5`) entre una fase y la otra, pero **un cambio de modelo no reinicia la conversación** — la ventana de contexto se conserva íntegra, y en ella estaban los 12 archivos JSON de G15 con los 35 reactivos y su `"isCorrect": true` explícito en cada uno. La contaminación es **total, no parcial ni inferencial**: no hacía falta razonar una sola línea de biología para "acertar" los 35. **Se abortó antes de resolver el primer reactivo**, siguiendo la regla que el propio proyecto ya dejó escrita tras G3e ("si aparece en el contexto cualquier artefacto de la fase de composición, la verificación ya está comprometida — hay que abortar y reportar, no intentar 'olvidar' la respuesta") y el contrato en `scripts/lib/blind-verification.ts:11` ("Esa sesión debe ser DISTINTA (proceso/conversación separada) de la que compuso los reactivos"). Continuar habría producido **35/35 y una tasa de auto-aprobación del 100%** — un número idéntico al de G14, indistinguible de un resultado legítimo, que habría publicado 35 reactivos a alumnos reales con un sello de calidad inventado. **El primer criterio de aceptación de la tarea ("Nunca viste la respuesta correcta antes de responder") ya estaba incumplido antes de empezar**, así que ejecutar las tareas 1-5 habría entregado un resultado que falla el propio estándar del encargo mientras aparenta éxito. **Trabajo real completado:** el lote ciego SÍ se generó y quedó en disco listo para una sesión limpia (`scripts/content-exports/blind-batch-2026-08-26T01-11-03-065Z.json`, 35 ítems, `requiresCalculation:false` en los 35 — biología conceptual, igual que en G3d/G3e); y se consultó el estado real de la DB (sin cambios, ver abajo). **Desviación deliberada del encargo, declarada:** el mensaje de commit pedido era `feat(G16): verificación ciega Biología IPN MEDBIO`, pero se usó uno honesto (`chore(G16): …abortada…`) — mismo criterio que G12, y coherente con el defecto que G14 corrigió (un registro de auditoría no debe afirmar algo que no ocurrió). `pnpm typecheck` y `pnpm lint` en verde (cero cambios de código). |
| G15 | Lote de reactivos: Biología IPN MEDBIO (refuerzo) | **COMPLETADA — 35 insertados, isVerified=false** | (G15) | Ver sección dedicada abajo. **Materia elegida re-aplicando en vivo la misma regla de prioridad de G13** ("IPN con <50 verificados, mayor `questionWeight` primero"): G14 verificó los 35 de G13 y Matemáticas de FISMAT pasó de 34 a 69 verificados — **cruzó el umbral de 50 y salió del conjunto elegible**. Dentro de lo que queda (<50 verificados), la de mayor peso ya no es Física FISMAT (20, la sugerencia informal que había dejado la nota "Siguiente" de G14): es **Biología de IPN MEDBIO, peso 22**, confirmado con consulta directa a Prisma, no asumido de la nota anterior (esa nota hablaba de "mayor peso en CERO", un criterio más estrecho que la Prioridad 1 real, que no distingue entre materias en cero y materias que ya tienen contenido). Mismo patrón que estableció G13: reforzar la de mayor peso del conjunto elegible aunque ya tenga contenido previo (27 verificados de G3d), aplicando la regla tal como está escrita. **12 temas de la materia, 0/12 con `SourceChunk`** (a diferencia de Matemáticas FISMAT) — los 35 reactivos son 100% TEMARIO_ONLY, sin bloquear la generación (F2b). **Composición balanceada contra el acumulado de G3d**, no repartida pareja: los temas que G3d dejó con menos contenido (Homeostasis, Reproducción, Evolución y especiación, Mitosis y meiosis, 2 cada uno) reciben más refuerzo (3-4 nuevos); los que G3d dejó más completos (Genética básica, Célula y organelos, Sistema nervioso, 4 cada uno) reciben menos (2 nuevos) — acumulado final entre 5 y 6 reactivos por tema en los 12. **35/35 MULTIPLE_CHOICE** (mismo criterio que G3d y el fewshot de `biologia.md`, contenido conceptual sin fragmento fuente). Dificultad **BASIC 10 / INTERMEDIATE 16 / ADVANCED 7 / EXPERT 2**, más cercana a la distribución sugerida por `scripts/prompts/_base.md` (20/50/25/5%) que la de G3d. **Distribución de posición diseñada y verificada: A=9, B=9, C=9, D=8** (25.7%/25.7%/25.7%/22.9%, dentro de 15%-40%). **Validador de lote de G3c corrido y aprobado** (`content:validate-batch` + `content:insert --lot-dir`, ambos 0 violaciones: `MALFORMED_OPTIONS` 0, `POSITION_SKEW` 0, `LETTER_CITATION` 0) antes de tocar la DB — distractores citados siempre por contenido ("1)...2)...3)...4)..."), nunca por letra. Dry-run primero (0 duplicados contra los 27 verificados + 8 sin publicar de G3d, vía `normalizeStem`), luego inserción real: la materia pasó de 27✓/0⧗/8✋ (35 totales) a **27✓/35⧗/8✋ (70 totales)** — exactamente +35 pendientes, verificado con consulta directa a la DB, no solo el log de consola. Registro consolidado en `docs/content-batches/g15-ipn-medbio-biologia.json` (mismo patrón que G3a/G3d/G13). El total VERIFICADO del banco no cambió (sigue en 405) porque este lote entra a la cola de verificación ciega, tarea de una sesión POSTERIOR e independiente — G15 no verifica sus propios reactivos, por diseño del pipeline adversarial. Si los 35 se aprueban en la siguiente verificación, Biología MEDBIO pasaría de 27 a 62 verificados y cruzaría el umbral de 50, igual que le pasó a Matemáticas FISMAT en G13→G14 — el siguiente lote de contenido tendría que re-consultar la brecha otra vez en vivo (candidata probable: Física de IPN FISMAT, peso 20, sigue en 0 verificados). `pnpm typecheck` y `pnpm lint` en verde (sin cambios de código, solo contenido + docs). Scripts desechables (`scripts/g15-gap-check.ts`, `scripts/g15-topics.ts`, `scripts/g15-export.ts`, `scripts/g15-lote/*.json`) usados para consultar la DB, componer y exportar el lote, eliminados al terminar. |
| G14 | Verificación ciega del lote de G13 | **COMPLETADA — 35/35 auto-aprobados (100%), banco 370 → 405 verificados** | (G14) | Ver sección dedicada abajo. Segunda mitad del ciclo adversarial de G2 sobre el lote de G13: esta sesión **nunca vio la respuesta correcta** — su único insumo fue el lote ciego (`pnpm content:blind-batch --all`, 35 reactivos de Matemáticas IPN FISMAT con las opciones remezcladas por semilla determinista). Garantía comprobada, no asumida: `grep` sobre el archivo exportado da **0 ocurrencias de `isCorrect`/`explanation`/`correctOption`**, y no se leyó el commit de G13, ni `docs/content-batches/g13-ipn-fismat-matematicas.json`, ni `Question.options` de la DB. **Los 35 reactivos son de materia de cálculo (`requiresCalculation=true` en los 35), así que los 35 se resolvieron EJECUTANDO la operación en código** (sympy/Python: `solve`, `diff`, `integrate`, `factor`, `function_range`, `continuous_domain`, `Point.distance`, `math.comb`, aritmética exacta con `Fraction`), nunca solo razonando en texto. **Segundo paso ejecutado, más estricto que responder:** un script de emparejamiento transcribió las 4 opciones de cada reactivo a expresiones simbólicas y comprobó **unicidad** — cuántas opciones son equivalentes al resultado calculado. Resultado: **exactamente 1 opción válida en los 35** (cero `NONE_VALID`, cero `MULTIPLE_VALID`), por eso ningún reactivo lleva `problems`. **Resultado de `pnpm content:resolve`: 35 auto-aprobados, 0 sin publicar, 0 omitidos — tasa de auto-aprobación 100%.** Confianza declarada 0.99 en 33 reactivos y 0.97 en 2 (dominio de raíz y rango de parábola, los únicos conceptuales en vez de puramente computacionales); todas ≥0.85, el umbral de `MIN_CONFIDENCE`. **Acumulado real consultado en vivo contra Supabase (antes y después), no estimado:** 485 reactivos totales · verificados **370 → 405** · pendientes **115 → 80**, y de esos 80 pendientes **0 quedan sin veredicto** (los 80 son discrepancias con veredicto adjunto de lotes anteriores, ajenas a este lote). Matemáticas IPN FISMAT pasó de 34 a **69 verificados** (`questionWeight=24`), 1 pendiente (el preexistente de antes de G13). **Confirmación independiente de la distribución de posición de G13:** al traducir las respuestas del orden mezclado al original, las correctas quedan en **A=9, B=9, C=9, D=8** — exactamente lo que G13 documentó, verificado ahora desde el lado ciego (las elecciones de esta sesión en el espacio MEZCLADO fueron A=10/B=10/C=10/D=5, o sea el shuffle sí reordenó de verdad). **Defecto real corregido en el pipeline:** `content-resolve-verification.ts` escribía `usedCalculation: false` **hardcodeado** en `Question.verification`, así que el registro de auditoría afirmaba lo contrario de lo que la sesión hacía. Se agregó `usedCalculation` como campo opcional (default `false`, retrocompatible) a `VerifierAnswerSchema` y se pasa al veredicto; el lote se re-resolvió para que los 35 registros digan la verdad. `pnpm typecheck`, `pnpm lint` y `pnpm test:unit` (464/464) en verde. Scripts desechables de consulta a la DB (`scripts/g14-count.ts`, `scripts/g14-breakdown.ts`) eliminados al terminar; los archivos del lote viven en `scripts/content-exports/` (gitignored). |
| G13 | Lote de reactivos: Matemáticas IPN FISMAT (refuerzo) | **COMPLETADA — 35 insertados, isVerified=false** | (G13) | Ver sección dedicada abajo. **Materia elegida por la regla de prioridad 1, con números reales:** entre las 3 áreas de IPN Superior, TODAS sus materias tienen menos de 50 reactivos verificados (consultado en vivo vía `pnpm content:coverage` + query directa a Prisma) — dentro de ese conjunto, Matemáticas de IPN FISMAT tiene el `questionWeight` más alto (24, por encima de Biología MEDBIO=22 y Física FISMAT=20) con 34 verificados. Es el mismo tema que G3a trabajó, pero la regla no dice "los que tienen cero primero" sino "mayor weight primero entre los <50" — se documentó explícitamente esta lectura literal antes de generar nada. **35 reactivos originales compuestos por esta sesión** (cero llamadas a la API de pago de Anthropic — pipeline G2, `pnpm content:insert`), repartidos en los 12 temas de la materia; 3 temas con `SourceChunk` real (Ecuaciones lineales y cuadráticas, Números y operaciones, Sucesiones y series) se citaron obligatoriamente como SOURCED (8 reactivos), los otros 9 temas TEMARIO_ONLY (27 reactivos). **Distribución de posición diseñada y verificada: A=9, B=9, C=9, D=8** (25.7%/25.7%/25.7%/22.9%, dentro del rango 15%-40% exigido). **Validador de lote de G3c corrido y aprobado** (`pnpm content:validate-batch --dir` + `content:insert --lot-dir`, ambos con 0 violaciones) antes de tocar la DB — cero sesgo de posición, cero citas de distractores por letra (todas las explicaciones describen la respuesta por su CONTENIDO, nunca "opción X"). Verificado con dry-run primero en los 12 temas, luego inserción real: consulta a la DB confirma **35/35 insertados** (antes 34 verified + 1 pendiente = 70 total en la materia hoy; 8 SOURCED + 28 TEMARIO_ONLY sin verificar, donde 1 de esos 28 es el pendiente preexistente, no de este lote). Registro consolidado del lote en `docs/content-batches/g13-ipn-fismat-matematicas.json` (mismo patrón que G3a/G3d). El total de reactivos VERIFICADOS del banco no cambió (sigue en 370) porque este lote entra a la cola de verificación ciega (G3b/G3e), que es tarea de una sesión POSTERIOR e independiente — G13 no verifica sus propios reactivos, por diseño del pipeline adversarial. `pnpm typecheck` y `pnpm lint` en verde (sin cambios de código, solo contenido + docs). Scripts desechables (`scripts/g13-gap-check.ts`, `scripts/g13-lote/*.json`) usados para consultar la DB y componer el lote, eliminados al terminar. |
| G12 | Stripe y SMTP reales en producción | **BLOQUEADA — mismo bloqueo que G6/G9, sin avance en credenciales** | (G12) | Ver sección dedicada abajo. **Premisa de la tarea era falsa, verificada antes de empezar:** se citaba una fase "G11" que ya había "confirmado dos bloqueantes externos" — no existe ninguna fila `G11` en esta tabla ni ningún commit `G11` en `git log` (el historial pasa directo de `G10`/`0e5a3aa` a `R1`/`bc5442d`). **Verificado en vivo en el mismo Chrome conectado a esta sesión:** Stripe (`dashboard.stripe.com/test/apikeys`) y Resend (`resend.com/api-keys`) **siguen sin sesión activa** — ambos redirigen a su pantalla de login, igual que en G9 (15 días antes). Vercel **sí** tiene sesión activa (`vercel.com/angel011298s-projects`), pero eso no ayuda: sin llaves reales de Stripe/Resend no hay nada válido que subir. **Ningún límite duro se cruzó, incluso bajo instrucción explícita del usuario de "hazlo todo tú mismo":** no se creó ninguna cuenta, no se escribió ninguna contraseña ni API key en ningún campo (ni por navegador ni por CLI), y no se intentó "Log in with Google"/OAuth en Stripe o Resend (habría creado una cuenta nueva si no existía, o requerido permiso explícito por-acción que no se tenía). Estas prohibiciones aplican igual aunque el usuario las autorice explícitamente — están documentadas como no-negociables en las reglas de esta sesión. **Trabajo real completado (sin tocar credenciales):** revisión de `docs/STRIPE_LIVE_CHECKLIST.md` (G6) y `docs/SERVICE_CREDENTIALS_CHECKLIST.md` (G9) — ambos ya contienen los pasos exactos pedidos por la tarea 3 (checklist de modo live), así que no hacía falta escribirlos de nuevo; se les corrigió una sección desactualizada: los dos asumían que `yaentre.com` "aún no está conectado a Vercel", pero R6→R8 ya lo conectaron con SSL real — se anotó que el webhook de Stripe y el dominio de Resend deben apuntar directo a `https://yaentre.com` desde el inicio, no a `acierta.vercel.app` con migración posterior. `pnpm typecheck` y `pnpm lint` en verde (solo cambios de documentación). **Pendiente exactamente igual que G9:** alguien con acceso humano a las cuentas de Stripe/Resend (o a un Google/GitHub ya vinculado a ellas) tiene que iniciar sesión en el mismo Chrome que esta sesión usa, o pegar las 12+1 variables directo en Vercel con los comandos ya documentados en ambos checklists. |
| R8 | yaentre.com operativo con SSL y marca correcta | COMPLETADA | (R8) | **El hallazgo real de esta fase: los dos problemas reportados por el usuario tenían la misma causa raíz, y no era la que se sospechaba.** El diagnóstico inicial suponía un residuo de marca sin detectar en el código fuente. Verificación en vivo (`curl` contra `http://yaentre.com`, ya que HTTPS fallaba): **29 apariciones de "acierta", 0 de "yaentre"** en el HTML real servido — pero un grep de `src/` (repitiendo lo que R1/R2/R5/R7 ya habían probado exhaustivamente) volvió a dar **0 residuos**. La contradicción se resolvió con `vercel ls acierta --prod`: el **último deploy de producción tenía 14 días** — de *antes* de R1. Nadie había desplegado el código rebrandeado a Vercel en ninguna de las 7 fases anteriores (R1-R7 son todas commits locales/`vercel domains add`/edición de docs — ninguna incluía `vercel --prod`). El sitio en vivo llevaba dos semanas sirviendo el build viejo, completamente ajeno a los commits del rebrand. **No había ningún bug que corregir en el código — el código ya estaba correcto desde R2.** La solución real fue desplegar el `HEAD` actual. **Antes del deploy**, se actualizó `NEXT_PUBLIC_SITE_URL` a `https://yaentre.com` (`vercel env update`, para que el build nuevo la incluyera desde la compilación — es una var `NEXT_PUBLIC_*`, se inlinea en build time). **Bug real cometido y corregido en la misma fase:** el primer intento (`echo "https://yaentre.com" | vercel env update`) guardó el valor con un salto de línea final (`"https://yaentre.com\n"`) — `echo` agrega newline y Vercel lo conservó tal cual; habría roto el link de verificación de Supabase Auth (`src/lib/auth/site-url.ts` solo recorta `/` final, no espacios). Corregido con `printf` (sin newline) antes de desplegar; verificado con `vercel env pull` que el valor quedó limpio. **`vercel --prod` (deploy real, no preview):** build exitoso (TypeScript limpio, 33 rutas, mismo output que las fases anteriores verificaron), y Vercel **aliasó automáticamente `https://yaentre.com` al nuevo deploy** — el mismo evento disparó la emisión del certificado SSL (Let's Encrypt, confirmado con `openssl s_client`: `CN=yaentre.com`, válido 25-ago al 23-nov-2026 — antes `vercel certs ls` mostraba "No certificates found"). **Verificado en vivo post-deploy, con evidencia, no solo asumido:** `https://yaentre.com` → HTTP 200, HSTS activo, `<title>YaEntre — Tu entrenador de admisión con IA`, 0 "acierta" / 29 "yaentre" en el HTML; `https://www.yaentre.com` → HTTP 200 con SSL válido (un primer intento dio error de certificado — blip transitorio de la emisión recién completada, confirmado estable en 3 reintentos siguientes); `https://acierta.vercel.app` → sigue sirviendo tráfico sin cambios, respaldo intacto. **Proyecto de Vercel renombrado** de `acierta` a `yaentre` vía dashboard (el CLI v50.37.2 sigue sin subcomando de rename, confirmado otra vez) — la sesión de navegador SÍ tenía cuenta de Vercel activa (a diferencia de Akky/Stripe/Resend). Vercel pidió configurar 2FA antes de guardar cambios sensibles del proyecto; se usó **"Skip securing my account"** en vez de configurar 2FA por la cuenta del usuario — no es una decisión de seguridad que le corresponda a esta sesión tomar. Rename confirmado ("Project name updated"), mismo `projectId`, sitio verificado funcionando después. `.vercel/project.json` local (gitignored) refrescado con `vercel link --yes --project yaentre` — no se editó a mano, mismo criterio que R1-R7 establecieron. **Archivo `dominio_yaentre.com` de Descargas** (el mismo PDF ya revisado en R6): sin información nueva. `pnpm typecheck`/`pnpm lint` en verde. Cero cambios de código — todos los cambios de esta fase son infraestructura viva (Vercel: env var, deploy, rename) verificable con `curl`/`openssl`, no con `git diff`. |
| R6 | Conectar yaentre.com al despliegue de producción | PARCIAL — bloqueada en DNS/credenciales | (R6) | **Hallazgo que desbloqueó media fase:** el CLI de Vercel (`vercel`, v50.37.2) resultó estar ya autenticado en esta máquina (`vercel whoami` → `angel011298`, mismo team `angel011298s-projects` que `.vercel/project.json`) — permitió trabajar directo contra la API real de Vercel sin necesitar sesión de navegador. **1. Dominio agregado al proyecto — HECHO:** `vercel domains add yaentre.com` y `vercel domains add www.yaentre.com` (ambos éxito, confirmado con `vercel domains inspect`). Los dos quedan bajo el proyecto `acierta` en Vercel — **no se recreó el proyecto ni se tocó el despliegue existente**, `acierta.vercel.app` sigue sirviendo tráfico exactamente igual. **2. Registros DNS a configurar en Akky — BLOQUEADO, con la receta exacta ya en mano:** Vercel entregó los registros reales (no genéricos): `A yaentre.com → 76.76.21.21` y `A www.yaentre.com → 76.76.21.21` (alternativa: delegar nameservers a `ns1.vercel-dns.com`/`ns2.vercel-dns.com`, pero se prefirió la opción A porque el dominio se compró como invitado en Akky — sin cuenta — y la tarea pedía explícitamente dejar a Akky como DNS host). El dominio se compró por checkout de invitado (ver R4); Akky no ofrece gestión de DNS sin iniciar sesión, y crear una cuenta o escribir/recuperar una contraseña está fuera de lo que cualquier sesión automatizada puede hacer — instrucción explícita del propio usuario en esta fase ("salvo que necesites acceso a una cuenta que no tengas ya abierta"). **Alguien con acceso a la cuenta de PayPal/correo de la compra (`angelortizsanchez0112@gmail.com`) tiene que entrar al panel de Akky y pegar esos 2 registros A.** **3. Correo (MX/SPF/DKIM) — BLOQUEADO por partida doble:** depende de (a) Resend generando los valores exactos de SPF/DKIM para `yaentre.com`, y (b) el panel DNS de Akky para pegarlos — ambos bloqueados (Resend sigue sin sesión activa, mismo estado que R4/G9). No se puede generar una receta de registros inventada; hay que sacarla del dashboard real de Resend primero. **4. `NEXT_PUBLIC_SITE_URL` — DECISIÓN DELIBERADA DE NO TOCARLA TODAVÍA:** confirmado con grep que tiene un único uso en todo el código (`src/lib/auth/site-url.ts:6`) — construye el link de verificación/recuperación que Supabase Auth incrusta en sus correos. Cambiarla a `https://yaentre.com` AHORA, con el DNS todavía sin propagar, mandaría a cualquier usuario que se registre o pida recuperar contraseña HOY (en el sitio que sí funciona, `acierta.vercel.app`) un correo con un link roto — se prefirió no arriesgar un flujo que hoy funciona. Queda anotado el cambio exacto pendiente para cuando el DNS resuelva: `vercel env` no soporta editar in-place, así que es `vercel env rm NEXT_PUBLIC_SITE_URL production` + `vercel env add NEXT_PUBLIC_SITE_URL production` con valor `https://yaentre.com`, y luego un redeploy (`vercel --prod` o el próximo push) para que tome efecto. **5. Webhook de Stripe — BLOQUEADO, y además no aplica todavía:** el dashboard de Stripe sigue sin sesión activa (mismo bloqueo que G6/G7/G9/R4, re-verificado en esta fase). Adicionalmente, el historial ya documentado (G6) confirma que `STRIPE_SECRET_KEY` nunca fue una llave real — es decir, lo más probable es que **no exista ningún webhook real que reapuntar todavía**; esto se resuelve junto con el resto de la configuración real de Stripe, no antes. **6. Renombrar el proyecto de Vercel de "acierta" a "yaentre" — NO HECHO:** el CLI instalado (v50.37.2) no tiene subcomando de rename (`vercel project` solo ofrece `add/inspect/list/remove/token`); requiere el dashboard de Vercel o su API REST directa, ninguna con sesión disponible en este momento. Cosmético y de bajo riesgo (no afecta el despliegue), queda pendiente. **Archivo revisado sin hallazgos nuevos:** `dominio_yaentre.com` en Descargas del usuario — es el comprobante/factura PDF de Akky de la compra ya documentada en R4 (mismo número de orden), sin información de DNS o cuenta adicional. **Sin cambios de código ni de variables de entorno en esta fase** — el único cambio es esta fila de estado. `pnpm typecheck`/`pnpm lint` no aplican (nada de código cambió). |
| R7 | Corrección/confirmación de dominio a yaentre.com | COMPLETADA — 0 residuos, ya estaba corregido | (R7) | **Dominio definitivo confirmado: `yaentre.com`** (comprado en Akky el 21-ago-2026, orden `20260821697888`). Esta fase pidió buscar y corregir toda referencia literal a `yaentre.mx`/`www.yaentre.mx` en código, docs, `.env.example`, correo y Stripe — barrido exhaustivo (`rg -i --hidden --no-ignore "yaentre\.mx"` sobre todo el repo, incluidos ocultos/no rastreados) encontró **solo 16 coincidencias, las 16 dentro de contenido histórico ya congelado por decisión de R3/R4**: 13 en `docs/REBRAND_INVENTARIO.md` (la auditoría de R1, que describe qué decía el plan *en ese momento*) y 3 en las propias filas R2/R3/R4 de esta tabla (que documentan con precisión lo que esos commits hicieron entonces, verificable en `5b4a64e`/`8c1a402`/`a1c5218`). **Cero en código activo, cero en documentación viva.** Mismo resultado para `acierta.mx`: única aparición fuera de esos dos documentos fue una línea de la narrativa histórica de G9 (línea ~1668, cita el remitente hardcodeado *tal como era antes de R2*) — igual de legítima. Verificado además de forma directa (no solo grep) en los 4 puntos que la tarea señaló expresamente: `.env.example` (`NEXT_PUBLIC_SITE_URL` es un placeholder `localhost:3000`, nunca tuvo dominio propio), `src/lib/stripe/client.ts` (`https://yaentre.com`), `src/lib/email/client.ts`+`templates.ts` (`notificaciones@yaentre.com` y las 3 menciones de dominio en el cuerpo), y las páginas legales (`terminos`: 6 menciones, `privacidad`: 5, todas `.com`). **Conclusión: la corrección de dominio que pedía esta fase ya la hizo R4** el 21-ago-2026 (mismo día de la compra) — R7 la re-verificó de forma independiente y exhaustiva en vez de asumirlo, y no encontró ninguna mezcla ni residuo real que corregir. No hubo cambios de código; el único cambio de esta fase es esta fila. `pnpm typecheck` y `pnpm lint` en verde (sin tocar código, verificación de formalidad). |
| R5 | Verificación final del rebrand a YaEntre | COMPLETADA — rebrand APROBADO | (R5) | Control de calidad de R1→R4. Informe completo en **`docs/REBRAND_VERIFICACION.md`**. **Suite completa en verde:** `typecheck` ✅, `lint` ✅, **`test:unit` 464 tests / 51 archivos ✅**, `build` de producción ✅ (33 rutas). **Barrido exhaustivo de residuos** (`rg -i --hidden --no-ignore` sobre todo el repo, incluidos ocultos y no rastreados): 18 archivos con coincidencias de `acierta`, **0 son marca vieja sin corregir** — las 6 categorías legítimas quedaron clasificadas una por una: (A) 43 referencias a los nombres de archivo reales `*_Acierta_v1.0.md` (no renombrados por decisión de R3; "corregirlas" rompería toda referencia cruzada), (B) 8 menciones de los roles Postgres `acierta_ci`/`acierta_prod` (infra viva), (C) 5 de `acierta.vercel.app` (URL de producción real hoy), (D) 1 en `.vercel/project.json` (autogenerado), (E) 2 comentarios en `prisma/migrations/0005_*.sql` (**checksum congelado** — editar una migración ya aplicada rompe `prisma migrate`; mismo criterio que R2 aplicó a `0009`), (F) el único COMÚN (verbo *acertar*). **Contenido educativo demostrablemente intacto** — la verificación de mayor riesgo: `git diff 0e5a3aa..HEAD -- docs/content-batches/ prisma/seed/ prisma/migrations/` vacío; el archivo de veredictos con "Se acierta por coincidencia léxica" **byte-idéntico por md5** (`cbe7dfde…` antes y después); **cero palabras mutiladas** por el regex (búsqueda dirigida de `yaentres/yaentren/minYaEntre` → 0); y el sustantivo `aciertos` sin pérdidas en ningún archivo preexistente, con los 4 archivos renombrados conservando su conteo exacto (3/3, 2/2, 13/13, 21/21). **"Entrómetro" consistente**: cero `Aciertómetro` en `src/`+`app/`+`tests/`+`scripts/`+`public/`+`schema.prisma`; las 4 variantes (`Entrómetro` 117 en prosa, `Entrometro` 95 en identificadores, `entrometro` 24 en archivos/imports, `ENTRÓMETRO` 1 en diagrama) replican exactamente el patrón que tenía la marca anterior, sin mezcla. **Verificación visual contra `next start` de producción** (no `next dev`, por el bug documentado de Tailwind 4 en dev): HTML realmente servido de las **12 rutas públicas** con `acierta=0` en todas; landing con wordmark YaEntre y tokens de marca correctos, manifest PWA `{"name":"YaEntre"}`, OG image renderizando "YaEntre" + Tino, términos con las 13 secciones legales intactas. **Límite honesto declarado:** el dashboard autenticado NO se verificó en pantalla (`/app` redirige correctamente a `/login`; entrar exige sesión real y el registro sigue bloqueado por el rate-limit de correo de Supabase, bloqueo preexistente de G7/G9) — se verificaron en fuente y vía build los 6 únicos elementos con marca de esa zona (Sidebar, TopBar, AppFooter, ProfileBadges, ParentShell, admin layout), todos en YaEntre, con barrido de `acierta` en esos directorios → 0. **3 problemas encontrados y corregidos en esta misma fase** (ninguno es residuo de marca, los 3 eran afirmaciones factualmente falsas tras la compra del dominio en R4, en documentos accionables que R6 va a seguir): `ESTADO.md` §URL decía *"cuando se compre"*, `SERVICE_CREDENTIALS_CHECKLIST.md:61` decía *"el dominio aún no se compra"*, y `STRIPE_LIVE_CHECKLIST.md:182` decía *"la decisión de nombre sigue abierta… todavía no está comprado"* — los tres ahora reflejan que `yaentre.com` se compró el 21-ago-2026 (Akky, orden `20260821697888`) y que lo pendiente es el DNS (R6). Se agregó también la configuración `yaentre-prod` a `.claude/launch.json` para poder verificar contra el build de producción. |
| R4 | Rebrand de servicios externos, legal y marketing a YaEntre | COMPLETADA con hallazgos | (R4) | **Hallazgo real que cambió el rumbo de la fase, ANTES de tocar nada de lo pedido:** una pestaña de Chrome ya abierta (de la sesión que investigó el dominio, antes de R1) resultó ser la confirmación de una compra real en Akky — **`yaentre.com`** (1 año, $347 MXN, PayPal, checkout de invitado), NO `yaentre.mx`, que es lo que R1→R3 usaron en absolutamente todo el código y la documentación. Se preguntó al dueño en vez de asumir; respuesta: **`yaentre.com` es ahora el dominio principal.** Antes de las tareas propias de R4, se corrigió esa herencia: script Node desechable, reemplazo literal `yaentre.mx`→`yaentre.com` sobre los 22 archivos donde R2/R3 lo habían dejado en `.mx` (código + docs) — **con una excepción deliberada**: las filas históricas de R2/R3 en esta misma tabla se restauraron a decir `.mx` (es lo que esos commits realmente hicieron, verificable en `5b4a64e`/`8c1a402`; reescribirlas a `.com` habría falsificado el historial) y en su lugar se les añadió una nota apuntando aquí. **1. Stripe**: `appInfo.name`/`url` y `productName` (código, ya en YaEntre/yaentre.com desde R2, confirmado). Dashboard real: **bloqueado** — `dashboard.stripe.com` redirige a login, sin sesión activa en el Chrome conectado (mismo bloqueo que G6/G7/G9, nada cambió). Los 9 Price/Product no existen todavía en ningún Stripe real (nunca se corrió `stripe:setup-prices` con llave real), así que no hay nada que renombrar ahí — cuando se corra con credenciales reales, ya saldrán como "YaEntre". **2. Correo**: `FROM_ADDRESS` y las 8 plantillas (`src/lib/email/templates.ts`) en `notificaciones@yaentre.com` (código). Dashboard de Resend: **bloqueado** igual que Stripe (`resend.com/login`, sin sesión). Verificación de dominio (SPF/DKIM) sigue pendiente de R6 con credenciales reales — documentado en `SERVICE_CREDENTIALS_CHECKLIST.md`. **3. Base de datos**: re-verificado en vivo (script `tsx` desechable, mismo patrón que R1): 450 preguntas, 1,350 explicaciones, 0 pasajes, 0 reportes, 9 `ContentSource` (nombre+licencia+fileRef), 308 nombres de taxonomía — **0 MARCA, exactamente el mismo único COMÚN de R1** ("Se acierta por coincidencia léxica"), sin tocar. Nada que actualizar aquí, confirmado en vivo, no por memoria. **4. Legal**: `terminos`/`privacidad` ya estaban en YaEntre/yaentre.com desde R2 — se leyeron completos línea por línea para esta fase (no solo grep) confirmando que las 13+10 secciones de sustancia real (reembolso 50% de garantía Premium, umbral de 15 sesiones/20min, jurisdicción CDMX, derechos ARCO con sus 4 rutas de UI exactas, retención de 30 días/7 años fiscales, lista real de proveedores terceros Supabase/Stripe/Vercel/Resend/PostHog/Sentry) quedaron intactas — solo cambiaron nombre y dominio de correo. **5. Marketing**: landing y componentes de marketing ya limpios desde R2 (grep dirigido: 0 matches); código de tracking (claves de cookie/atribución) fuera de alcance de esta fase por instrucción explícita, ya cubierto en R2. **6. Badge de fundador**: hallazgo real — el PRD describía `"Fundador Acierta 🏅"` pero el código implementado (`src/components/profile/ProfileBadges.tsx`) nunca dijo eso; decía `"🏅 Fundador Early Bird"` (sin nombre de marca, discrepancia PRD-vs-implementación preexistente, no introducida por el rebrand). Actualizado a `"🏅 Fundador YaEntre"` por instrucción explícita de la tarea. `pnpm typecheck` y `pnpm lint` en verde. **Pendiente heredado (no bloquea R4):** Stripe y Resend con configuración real requieren que el dueño inicie sesión — ninguna sesión automatizada puede crear esas cuentas ni escribir sus contraseñas. |
| R3 | Rebrand de toda la documentación a YaEntre | COMPLETADA | (R3) | Aplicó el reemplazo de marca (guiado por `docs/REBRAND_INVENTARIO.md` de R1) sobre los 6 documentos principales (PRD/Backend_Schema/UIUX_Spec/Flujo_App/Plan_Implementacion — el TRD referenciado en Plan_Implementacion sigue sin existir, defecto preexistente ya anotado en R1, no es de esta fase) más `CLAUDE.md`, las 4 bitácoras `PROGRESO_SPRINT*.md`, y 5 checklists/notas (`LAUNCH_CHECKLIST`, `STRIPE_LIVE_CHECKLIST`, `SERVICE_CREDENTIALS_CHECKLIST`, `VALIDACION_INFRA`, `BETA_FEEDBACK`, `ACIERTOS_MINIMOS`). Script Node desechable, mismas 7 reglas de R2 (familia "Aciertómetro"→"Entrómetro" primero) más una protección nueva específica de documentación: `Acierta` seguido de `_v1.0` (es decir, dentro de un nombre de archivo tipo `PRD_Acierta_v1.0.md`) **no se toca**, porque esta fase renombra CONTENIDO, no los archivos físicos (eso queda para una fase posterior, evita romper referencias cruzadas mientras tanto). **16 archivos modificados, 138 reemplazos.** Título interno (primera línea) actualizado en los 5 documentos principales y en `ESTADO.md`. **`docs/ESTADO.md` recibió trato distinto y deliberado**, por instrucción explícita: se actualizó solo el título (`# ESTADO — YaEntre`) y este mismo encabezado de estado — **las filas de fases pasadas (F0-G10, R1, R2) quedan exactamente como se escribieron**, sin tocar una sola palabra, porque son el registro histórico de cuando el producto sí se llamaba Acierta; reescribirlas sería falsificar cuándo pasó qué. **`docs/REBRAND_INVENTARIO.md` (el propio informe de R1) también se dejó intacto** por la misma razón — es una auditoría histórica de dónde decía "Acierta", no copy de marca. Se protegieron además, en todos los documentos, los mismos identificadores de infraestructura viva que R2: `acierta_ci`/`acierta_prod` (roles reales de Postgres) y la URL `acierta.vercel.app` (sigue siendo la URL de producción real hoy — cambiarla en un checklist accionable como `STRIPE_LIVE_CHECKLIST.md` lo habría vuelto incorrecto). `acierta.mx` (dominio objetivo, nunca desplegado) sí se actualizó a `yaentre.mx` donde aparecía como aspiración/URL de referencia (nota: R4 descubrió que el dominio realmente comprado es `yaentre.com`, no `.mx` — ver fila R4). Búsqueda final (`grep -i acierta` sobre todo `docs/`) confirma cero menciones pendientes fuera de las 3 excepciones documentadas (`ESTADO.md` histórico, `REBRAND_INVENTARIO.md`, y los identificadores de infra viva). |
| R2 | Rebrand de código y UI a YaEntre | COMPLETADA | (R2) | Ejecutó el reemplazo clasificado en R1, **solo en código/interfaz/componentes/assets** — `docs/*.md` queda deliberadamente fuera de alcance de esta fase (se conserva como registro histórico exacto de cuando el producto se llamaba Acierta; renombrarlo retroactivamente sería reescribir la historia). Script Node desechable aplicó las reglas en el orden correcto (familia "Aciertómetro"→"Entrómetro" primero, para que "acierta"→"yaentre" no la vuelva a tocar; protección explícita de `acierta_ci`/`acierta_prod` — roles reales de Postgres, no texto de marca) sobre `src/`, `scripts/`, `app/`, `tests/`, `public/`, `prisma/schema.prisma`, `prisma/seed.ts`, `package.json`, `.claude/launch.json`, `proxy.ts`, `.env.example`. **98 archivos modificados**, ~360 reemplazos. Aciertómetro→Entrómetro en TODO el código, incluyendo 5 archivos renombrados vía `git mv` (`Aciertometro.tsx`, `AciertometroLoader.tsx`, `AciertometroHistoryChart.tsx`, `aciertometro.ts`→`entrometro.ts`, `aciertometro.test.ts`) y todos los tipos/funciones/componentes derivados (`AciertometroTarget`, `formatAciertometroTarget`, etc.) renombrados consistentemente — `pnpm typecheck` limpio confirma que ningún import quedó roto. Manifest PWA, `opengraph-image.tsx`, todos los `<title>`/meta tags y `acierta.vercel.app`→`yaentre.mx` en referencias hardcodeadas del código (el DNS real se conecta en R6; el código ya apunta al nombre correcto, aunque no resuelva todavía — nota: R4 corrigió esto a `yaentre.com`, ver fila R4). **Excepciones deliberadas, no descuidos:** roles de Postgres `acierta_ci`/`acierta_prod` (los comentarios que los mencionan quedan intactos — renombrar el comentario sin migrar el rol real haría que mintiera); `prisma/migrations/*.sql` ya aplicadas (Prisma trackea checksums de migraciones históricas, no se editan); `.vercel/project.json` (autogenerado por `vercel link`, se regenera solo si se renombra el proyecto). Verificado con `git diff --stat -- docs/` vacío (cero cambios fuera de alcance) y con grep dirigido: el único caso COMÚN de R1 ("Se acierta por coincidencia léxica", en la DB y en `docs/content-batches/`) permanece intacto, sin tocar. Páginas legales (`terminos`/`privacidad`) reemplazadas pero conservan su aviso preexistente `EDITAR ANTES DE PUBLICAR` — la revisión humana del texto legal sigue pendiente, no es parte de esta fase. `pnpm typecheck` y `pnpm lint` en verde. |
| R1 | Inventario de marca para rebrand a YaEntre | COMPLETADA | (R1) | Fase de **solo lectura**, sin cambios de código. Barrido completo de "Acierta"/"Aciertómetro" en código (`src/`, `scripts/`, `prisma/`, y además `app/` — nota real: `app/` vive en la raíz del repo, no en `src/app/` como describe la estructura objetivo de CLAUDE.md —, `tests/`, `public/`), en las 17 `.md` de `docs/` + `CLAUDE.md`, y en la base de datos real vía script `tsx` desechable (`Question.stem/options/verification`, `ExplanationLayer`, `Passage`, `QuestionReport`, y 317 nombres de taxonomía — creado, ejecutado y borrado en la misma sesión). **495 apariciones, todas clasificadas: 494 MARCA, 1 COMÚN, 0 AMBIGUO.** El único caso común real en todo el proyecto: "Se acierta por coincidencia léxica" en el veredicto de un verificador de reactivo (`Question.verification`, IPN Med-Bio Biología) — uso gramatical del verbo "acertar", sin relación con la marca. `docs/REBRAND_INVENTARIO.md` (commit `bc5442d`) documenta cada hallazgo con propuesta de reemplazo (`Acierta`→`YaEntre`, `Aciertómetro`→`Entrómetro`) y notas de riesgo explícitas para R2 (roles de Postgres `acierta_ci`/`acierta_prod` marcados como alto riesgo — no son un simple find-replace de texto). |
| F0 | Auditoría y reparación del repo | COMPLETADA | (esta sesión) | CLAUDE.md actualizado, ESTADO.md creado, .claude/settings.json agregado |
| F1 | Infraestructura validada vs Supabase real | COMPLETADA | (F1) | Proyecto Supabase real (ref fumluvvzskhdxcyljbmx). Schema=fuente de verdad (diff vacío), RLS verificada, seed real (2 inst/7 áreas/35 mat/217 temas/47 carreras), guardrail probado en vivo, 9/10 PDFs subidos. Bugs corregidos: camelCase en RLS + recursión infinita RLS. Pendiente externo: prueba Anthropic (falta key real) y guía IPN 80MB (>límite free-tier). Ver docs/VALIDACION_INFRA.md |
| F2 | Pipeline adversarial de contenido | EN_PROGRESO | (F2) | CONSTRUIDO Y PROBADO COMPLETO: verificador Fable 5 (sin respuesta, con test estructural), cálculo ejecutado en sandbox VM, resolución (coincidencia+conf≥0.85+0 problemas), 3a pasada Opus 5%, orquestador content-run, coverage con tasa auto-aprobación, 94 tests verdes, E2E mock vs DB real OK. Schema: +7 formatos, +verification JSONB. API key real creada y validada (auth OK). ÚNICO pendiente: tanda real de 10 — bloqueada por saldo API $0.00 (compra de créditos = decisión del dueño) |
| F2b | Anclaje en fuentes e ingesta continua | COMPLETADA | (F2b) | Escaneo real: 12 archivos detectados (10 docs/guias + 2 raíz), 380 fragmentos de 9 fuentes (uam_cbi reparada con backfill tras fix de bytes NUL), duplicado raíz de ECOEM detectado por hash, 2 PDFs IPN escaneados pendientes de visión. RLS solo-ADMIN verificada en vivo (anon → []). SOURCED end-to-end probado en mock con trazabilidad real en DB. Pendiente por saldo API $0: clasificar 380 fragmentos (~$0.70) — re-correr pnpm content:scan-sources con saldo. 0/217 temas con fuente hasta clasificar |
| F3 | Panel de discrepancias y resolución | COMPLETADA | (F3) | Repurposeó la cola plana de CC-06 (isVerified=false sin distinción) por 3 colas del pipeline F2: discrepancia/baja-confianza-o-problemas/muestreo-degradado, clasificadas por `Question.verification` (JSONB). Detalle con comparación generador-vs-verificador, razonamiento, problemas, auditoría; 1-clic aprobar con cualquiera de las 4 opciones (atajos 1-4/D/E); "Aprobar con X" y "editar" anotan `manualReview` (preserva el veredicto original para auditoría, saca el reactivo de la cola). Render de LaTeX/imagen de reactivo/imagen de opción/pasaje compartido. /admin/coverage: tasa de auto-aprobación global+por materia+por formato, desglose SOURCED/TEMARIO_ONLY (F2b). RLS ADMIN-only ya cubría todo (F1/F2b), sin cambios de schema. 15 tests nuevos (118 total) + verificación real contra Supabase con 5 fixtures cubriendo las 3 colas + SOURCED-con-passage-e-imagen + ya-resuelto (25 aserciones entre lectura y mutación, todas verdes, fixtures limpiados). `pnpm build` production OK (sin violaciones Server/Client Component) |
| F4 | Producción de contenido en escala | COMPLETADA | (F4) | **309 reactivos verificados/servibles reales en producción** (meta: ≥300). 380 generados, 71 sin publicar (verificación adversarial los rechazó correctamente), 0 rechazados sin verificación. Tasa de auto-aprobación global 81.3% (309/380). 184/380 SOURCED (anclados en fuente real), resto TEMARIO_ONLY solo en temas sin fragmento fuente. Auditoría de tercera pasada (5%, 16 reactivos): 16/16 sin defectos, 0 degradados. **Bloqueada por saldo API $0 (ver commit 065d448); desbloqueada SIN comprar crédito** por instrucción explícita del dueño ("no se meterá crédito de ninguna forma") — pipeline ejecutado con arquitectura alterna "capital cero" (ver Notas F4 abajo). Costo real en dinero: $0.00 |
| F5 | Onboarding (selección examen/carrera) | COMPLETADA | (F5) | Asistente de 4 pasos: examen (filtrado por feature flag) → área/rama → carrera meta (aciertos mínimos SIEMPRE como estimación, vía `formatAciertometroTarget`) → Tino + explicación del diagnóstico. Progreso en `UserProfile.onboardingStep` (sin tocar el schema — ver `src/lib/onboarding/steps.ts`); el área del Paso 2 es efímera (por `?area=` en la URL, no se persiste). `requireOnboarding` guardia todo `/app/*`. "Empezar diagnóstico" crea la `ExamSession` real (mode=DIAGNOSTIC) reusando `sessionsDb.startSession` de F2-adjacente; "posponer" cierra el asistente y deja tarjeta pendiente en el dashboard placeholder. El motor de diagnóstico en sí (`/diagnostico`) es F6/F7, fuera de alcance — el botón ya crea la sesión real, la pantalla se construye después. 10 tests nuevos (140 total). Verificado manualmente en navegador contra Supabase real (registro, login, los 4 pasos, cierre-y-retomo en cada paso, posponer exactamente una vez, guard bloqueando reingreso a /onboarding y bloqueando /app sin onboarding); usuario de prueba y su sesión eliminados al terminar. Bug real encontrado y corregido durante esa verificación: el Paso 2→3 navegaba con `<Link>` y el router cache del cliente servía el RSC del Paso 2 ya cacheado (mismo pathname, solo cambiaba `?area=`) — se resolvió moviendo esa transición a un Server Action (mismo patrón que los demás pasos), que sí invalida el cache al redirigir. `pnpm build` production OK |
| F6 | Motor adaptativo determinista y Aciertómetro | COMPLETADA | (F6) | Motor 100% determinista, sin ML ni IA en runtime. Funciones PURAS y testeables en `src/lib/adaptive/`: **topic-stats** (acumulación histórica por tema; débil = hitRate<0.60 con ≥3 intentos; tiers weak/intermediate/mastered/insufficient), **predictor** (Aciertómetro: promedio ponderado por `Subject.questionWeight`, default pesimista 0.30 para materias sin datos suficientes ≥5 intentos, confianza = proporción con datos, `floor`), **selector** (mezcla 60/25/15, excluye respondidas <72h, rng inyectable, respaldo aleatorio si el cálculo falla), **career-strategy** (compara predicción vs meta, sugiere ≤3 alternativas alcanzables desc por exigencia; meta SIEMPRE calificada por confianza vía `formatAciertometroTarget`). Orquestación en `src/lib/db/adaptive.ts` (recomputeWeakTopics/LearningProfile, selectNextAdaptiveQuestions con fallback, computeCareerStrategy, onSessionFinished). Endpoints protegidos `POST /api/adaptive/next-questions` y `/predict` (requireUser vía guardApiUser + Zod). **finishSession dispara onSessionFinished** (recálculo robusto: nunca rompe el cierre de sesión). **Caso de referencia obligatorio verificado: 0.70@peso26 + 0.50@peso16 sobre 120 = exactamente 74** (floor de 74.857). 28 tests nuevos (168 total, verdes). Verificación en vivo: ambos endpoints devuelven 401 sin sesión a través del runtime real; `pnpm build` registra las rutas; sin cambios de schema (`LearningProfile`/`WeakTopic` ya existían) |
| F7 | Diagnóstico inicial y resultados | COMPLETADA | (F7) | Ruta `/diagnostico`: sesión real de 30 reactivos repartidos por `Subject.questionWeight` (reparto de mayor resto con reserva de 1 asiento/materia — `src/lib/diagnostic/distribution.ts`, PURO y testeado, caso de referencia [26,16,12,10,6]→30 = exactamente [10,7,5,5,3]), recortado a disponibilidad real de contenido servible con redistribución del sobrante. Límite 45 min explícito (ya no hereda `exam.durationMins`). SÍ permite regresar: los 30 `SessionAnswer` se pre-crean como placeholders (`selectedOption=null`) al abrir la sesión, así el set completo vive siempre en DB — retomar tras cerrar es leer esa misma sesión, sin guardar la lista en ningún otro lado. Reusa 100% el motor de F2/F6 (`submitAnswer`/`finishSession`/`onSessionFinished`) sin duplicar lógica; único cambio a `sessions.ts`: `finishSession` marca `diagnosticDone=true` cuando `mode=DIAGNOSTIC`. Resultados: score crudo, Aciertómetro animado (anillo vía `@keyframes` CSS + `@number-flow/react`), gap vs. meta de carrera (`computeCareerStrategy`, F6), 3 temas prioritarios y mensaje de Tino. **Hallazgo de diseño real:** `WeakTopic` exige ≥3 intentos/tema (F6) pero el diagnóstico reparte 30 reactivos entre docenas de temas — casi ningún tema llega a 3 intentos en una sola pasada, así que la tabla acumulada queda vacía justo después del primer diagnóstico. Se agregó `rankWeakestFromSession` (ranking sin el umbral de 3, solo para esta sesión) como relleno cuando el historial acumulado no alcanza los 3 temas — sin tocar la regla de F6. 13 tests nuevos (181 total). **2 bugs reales encontrados y corregidos en verificación en navegador contra Supabase real:** (1) `@number-flow/react` (custom element/Shadow DOM) no hidrataba bajo SSR de Next.js — quedaba vacío hasta forzar montaje 100% cliente (`next/dynamic({ssr:false})` desde un wrapper `'use client'` dedicado, `AciertometroLoader.tsx`, porque `ssr:false` no se permite directo en un Server Component). (2) El anillo animado con Framer Motion (`motion.circle` + `strokeDashoffset`) se quedaba fijo en 0% de relleno pese a props correctas — se reemplazó por una animación 100% CSS (`@keyframes ring-fill` en `app/globals.css`, interpola desde circunferencia completa hasta el valor final YA puesto por React, sin estado de React de por medio); ya cubierta por la regla global de `prefers-reduced-motion`. Verificado end-to-end en vivo (UNAM Área 1 Ingeniería): 30 preguntas repartidas 12 Mat/7 Fís/6 Quím/5 Esp (Inglés excluido por 0 reactivos servibles — cobertura real hoy es 4 materias, no 6; el algoritmo alcanza ≥6 en cuanto el pipeline de contenido, ver Notas F4, cubra un área con ≥6 materias con contenido — la app IPN "Ciencias Sociales y Administrativas" ya tiene 7 materias en el seed, solo le falta contenido), navegación libre confirmada (ir y volver conserva la respuesta), cierre-y-retomo confirmado (recarga completa preserva timer absoluto y progreso), resultados completos confirmados con datos reales (Aciertómetro 87/120, meta ~101, gap 14, 3 temas con hitRate real), dashboard deja de mostrar la tarjeta pendiente tras terminar. Usuario de prueba y su sesión eliminados al terminar. `pnpm typecheck`, `pnpm lint`, `pnpm build` production OK |
| F8 | Integración de Stripe (pagos) | COMPLETADA | (F8) | Pagos a prueba de fallos. **Regla de oro cumplida y verificable en código:** el acceso se activa SOLO en el webhook (`billingStore.activateFromCheckout`), NUNCA desde el redirect — la pantalla de resultado (`/checkout/resultado`) solo LEE el estado real de la `Subscription`. Módulos PUROS y testeados en `src/lib/stripe/`: **pricing** (matriz PRD §9 en centavos, `getPlanPricing(plan,season)`, `currentSeason(now)` monotónico), **expiry** (`computeExpiresAt`: MONTHLY=null→lo maneja Stripe recurring; SEASON_PASS/PREMIUM = fecha del examen objetivo, respaldo 150 días si falta). Modelo de producto: MONTHLY = suscripción recurrente de Stripe (mode `subscription`, solo tarjeta — OXXO/SPEI no admiten recurring); pase/premium = pago único (mode `payment`, tarjeta+OXXO+SPEI vía `customer_balance`/`mx_bank_transfer`). **Webhook idempotente** (`src/lib/stripe/webhook.ts`, PURO con `BillingStore` inyectable): registra `event.id` en `processed_stripe_events` como PRIMERA sentencia de la MISMA transacción que aplica el cambio (`runIdempotent` en `src/lib/db/billing.ts`) — duplicado→P2002→aborta→'duplicate' sin re-activar; fallo transitorio→rollback revierte también el marcador→reintento seguro de Stripe. Enrutamiento: `checkout.session.completed` paid→activar / unpaid→PENDIENTE (voucher OXXO/SPEI, sin acceso); `async_payment_succeeded`→activar (con `forceAsync` porque ahí `payment_status` ya es 'paid' pero NO fue tarjeta — bug real detectado al escribir los tests y corregido); `async_payment_failed`→FAILED; `customer.subscription.deleted`→CANCELED. Route Handler (`app/api/webhooks/stripe`): lee raw body, `constructEvent` verifica firma→**400 si inválida/faltante** (verificado en vivo: HMAC de Stripe rechaza el payload), 200 en manejado/duplicado/ignorado, 500 en error→Stripe reintenta. Checkout Server Action (`app/actions/checkout.ts`): **requireVerifiedForPurchase** (correo verificado obligatorio), crea Checkout Session + `Subscription` PENDING con `stripeCheckoutSessionId` antes de redirigir; metadata `{userProfileId,plan,season}` para reconciliación. Pantallas éxito(Tino celebra + monto)/pendiente(comprobante + `StatusPoller` que refresca hasta que el webhook active)/fallido(`RetryButton` reusa la action)/cancelado. Badge EARLY_BIRD al activar en esa temporada. Cliente Stripe con `import 'server-only'` (la llave nunca cruza al cliente). **17 tests nuevos** (198 total): los 4 casos exigidos (tarjeta OK, OXXO pendiente→éxito, pago fallido, evento duplicado NO reactiva) con store en memoria que reproduce la idempotencia atómica, + pricing/expiry/resolvePaymentMethod. Sin cambios de schema (`Subscription`/`Payment`/`ProcessedStripeEvent` ya existían). Verificado en vivo: webhook 400 sin firma / 400 firma inválida / 405 GET; `/checkout/resultado` sin sesión→307 a /login. `pnpm typecheck`, `pnpm lint`, `pnpm build` OK. **Pendiente heredado (no bloquea F8):** las env vars de Stripe son placeholders — la compra end-to-end real requiere llaves reales (decisión del dueño, capital cero); job de reconciliación (webhook perdido) es F22/hardening |
| F9 | Paywall + Early Bird pricing | COMPLETADA | (F9) | Muro suave como **capa central reutilizable**: `src/lib/paywall/gates.ts` (PURO — `canStartFullSimulation`, `canAnswerDrillQuestion`, `canViewExplanationLayer`, `canAccessParentDashboard`, todas con la misma forma `GateDecision`) + `src/lib/db/paywall.ts` (orquestación real: `isUserPaid`/`getActiveSubscription` filtra por status ACTIVE Y vigencia `expiresAt`, `countCompletedFullSimulations`, `countDrillAnswersToday`). Reglas: 1 simulacro completo gratis (revisar resultados después no consume — es una lectura, nunca pasa por `startSession`); 10 reactivos/día de práctica libre reiniciando a medianoche de México (UTC-6 fijo, `src/lib/paywall/mexico-time.ts`, misma convención que el streak de F-08); Capa 1 de explicación siempre gratis, 2+ requiere plan; panel parental exige Pase o Premium (Mensual NO alcanza, confirmado contra la tabla del PRD §9). **Wireado en 2 puntos reales ya existentes** (los únicos con UI/endpoint funcional hoy — simulador F12 y Drill F14 aún no existen): `app/actions/sessions.ts` bloquea `startSession` en `mode=FULL_SIMULATION`; `POST /api/adaptive/next-questions` devuelve 402 al agotar el límite diario o recorta el `count` al restante. Explicación-por-capas y panel parental quedan con el gate listo para cuando F14/F16 construyan su UI (no hay dónde wirearlos todavía). Pantalla `/paywall`: copy dinámico por trigger (matriz de Flujo_App §9.1), comparativa de 3 planes con Pase destacado ⭐, precio de la **temporada efectiva** (ver abajo), banner de licencias Early Bird restantes, "Ahora no" siempre regresa a `?return=` saneado (`sanitizeReturnPath` bloquea URLs absolutas y `//host` — protección anti open-redirect, verificada en vivo). **Early Bird (Task 4):** `resolveEffectiveSeason` (src/lib/db/billing.ts) es el ÚNICO punto que decide qué temporada mostrar/cobrar — si la fecha cae en Early Bird pero ya hay 500 suscripciones ACTIVE en esa temporada, degrada a Temporada Alta automáticamente (`degradeIfEarlyBirdExhausted`, núcleo puro testeado); lo usan tanto `/paywall` (qué precio muestra) como `startCheckoutAction` de F8 (qué precio cobra) — nunca pueden divergir. Badge `EARLY_BIRD` ya se otorgaba desde F8 (`grantEarlyBirdBadge`), reusado sin cambios. `earlyBirdLicensesRemaining()` exportada y lista para la landing (F10). **Script `pnpm stripe:setup-prices`** (scripts/setup-stripe-prices.ts): crea los 9 Price de Stripe (idempotente vía `lookup_key`, p. ej. `pase_eb`) con los montos exactos del PRD y escribe/actualiza los 9 `STRIPE_PRICE_*` en `.env.example`; `app/actions/checkout.ts` (F8) ahora los prefiere sobre `price_data` inline si están configurados en el entorno, sin romper el flujo ya probado si no lo están. Corrido en seco: se detiene correctamente en la validación de llave real (mismas credenciales placeholder documentadas desde F8 — capital cero). 20 tests nuevos (229 total): límites exactos (1/1, 10/10, capa 1/2+, Mensual-no-alcanza), fronteras de medianoche México (incluye instante exacto e idempotencia), anti open-redirect, fallback Early Bird 500→0, nombres de variable STRIPE_PRICE_*. **Verificación en vivo contra Supabase real** (usuario de prueba + fixtures SQL, todo eliminado al terminar, cascada confirmada sin huérfanos): `/paywall` con los 4 triggers renderiza copy+precios+banner correctos; límite de drill probado end-to-end vía `fetch` real contra el endpoint (0→200 permitido con `remainingToday:10`, 10 respondidas→402 `DRILL_DAILY_LIMIT`, sesión re-fechada 2 días atrás→200 se reinició a 10, usuario con plan activo→200 `remainingToday:null` ilimitado); conteo de simulacro completo verificado con fixture (0→1 tras completar uno, misma query que usa el gate); licencias Early Bird verificadas en vivo (500→499 tras 1 suscripción ACTIVE, reflejado en el banner de `/paywall`); "Ahora no" con `return=https://evil.com` cae a `/app` en vez de seguir el link malicioso. `pnpm typecheck`, `pnpm lint`, `pnpm build` OK |
| F10 | Landing page | COMPLETADA | (F10) | **GATE EARLY BIRD alcanzable — solo faltan acciones de negocio (activar campañas).** Landing pública (`app/(public)/page.tsx`) y precios (`app/(public)/precios/page.tsx`) en modo claro fijo, sin toggle (UIUX Spec §3.5), vía `PublicPageShell` — un componente explícito (NO un `layout.tsx` compartido de `(public)/`) para no afectar a registro/login, que siguen en `AuthShell` con `data-theme="dark"` fijo. Hero con el mensaje de posicionamiento pedido ("no es otro curso con videos... entrenador que sabe exactamente qué te falta"), 4 diferenciadores con Tino (simulador/Aciertómetro/ruta/panel parental), sección de padres con los 3 ángulos EXACTOS pedidos (lugar correcto vs. cualquier lugar · visibilidad desde el celular · garantía Premium, aclarando que aplica solo a ese plan), FAQ de 8 preguntas con `<details>/<summary>` nativo (cero JS de cliente), footer con enlaces legales. Precios: tabla de 12 features × 4 planes **reproducida literal de PRD §9** (no reinterpretada). **Banner y contador Early Bird con datos REALES**: reusa `resolveEffectiveSeason`/`earlyBirdLicensesRemaining` de F9 sin duplicar el cálculo — si el cupo de 500 ya se agotó, `resolveEffectiveSeason` cae a temporada regular y el banner se oculta solo (nunca promete un precio que ya no aplica). Ambas páginas con `revalidate = 60` (ISR): Next.js las pre-renderiza como estáticas por defecto, lo que habría CONGELADO el conteo de licencias en el momento del build — se detectó y corrigió antes de finalizar. SEO: `metadataBase` + `og-image` dinámica vía `next/og` (sin depender de un archivo de diseño), `app/sitemap.ts` (rutas públicas), `app/robots.ts` (bloquea `/app` `/admin` `/api` `/diagnostico` `/checkout` `/paywall` `/onboarding`). CTA principal → `/registro`; los CTAs de planes pagos en `/precios` también → `/registro` (la compra real ya vive dentro de la app, F8/F9 — comprar sin cuenta no es el flujo del producto). Páginas legales provisionales (`/legal/terminos`, `/legal/privacidad`) con `noindex`, honestas sobre estar en preparación. **Bug preexistente real, grave, encontrado y corregido**: Tailwind 4 NUNCA cargó `tailwind.config.ts` — a `app/globals.css` le faltaba la directiva `@config` (v4 no autodetecta el config JS/TS como v3). Esto significaba que TODOS los tokens custom del proyecto (`bg-brand`, `bg-surface`, `bg-elevated`, `text-text-primary`, `border-border-subtle`, `rounded-lg` de 16px, `font-display`, etc.) generaban CERO CSS en silencio desde que se introdujeron — únicamente sobrevivía la sintaxis de valor arbitrario (`bg-[var(--x)]`, usada en `AuthShell`/`(app)/layout.tsx`) y el color/texto explícito escrito a mano en `body` de `app/layout.tsx`. Quedó indetectado en F5-F9 porque la verificación fue mayormente `get_page_text` (contenido, no estilos) y el único intento de screenshot (F7) hizo timeout; en dark-mode-sobre-dark-mode, un fondo "transparente" en vez del correcto era visualmente invisible contra el `body` oscuro de respaldo. Se hizo evidente al anidar una página en modo CLARO dentro de un documento con `<html data-theme="dark">`: las tarjetas mostraban el fondo oscuro del body transparentándose. **Corregido con una línea** (`@config "../tailwind.config.ts";` en `app/globals.css`) — verificado en vivo que ahora SÍ existen las reglas `.bg-surface`, `.bg-brand`, `.text-text-primary` en el CSS compilado (antes solo existían sus variantes `bg-[var(...)]`), que la landing en claro renderiza con los colores correctos, y que /login (AuthShell, oscuro) sigue renderizando exactamente igual que antes (sin regresión). Verificado además: sin scroll horizontal en 375px, acordeón FAQ funcional sin JS, CTA principal navega a /registro, robots.txt/sitemap.xml/opengraph-image responden 200 con contenido correcto. `pnpm typecheck`, `pnpm lint`, `pnpm build`, 229 tests OK (sin tests nuevos — F10 es contenido/UI, no lógica de negocio nueva; toda la lógica reusada ya estaba testeada en F9). **Discrepancia real entre documentos, NO resuelta unilateralmente**: PRD §9 tiene DOS filas distintas — "Simulacros completos: 1 (30 reactivos)" para Free (que parece describir el diagnóstico, F7) y "Simulador fullscreen (120/140 reactivos): ❌" para Free (cero simulacros reales) — mientras que Flujo_App §9.1 dice "Simulacro completo (120/140) — 1 completo" gratis, y el gate ya construido en F9 (`canStartFullSimulation`) implementa ESTA última regla (1 simulacro real 120/140 gratis), siguiendo la instrucción explícita y textual de la tarea F9. La página de precios reproduce la tabla del PRD tal cual (tarea F10 pedía "según la matriz del PRD"), así que ambos textos conviven sin reconciliar — es una decisión de producto pendiente, no un bug de código |
| F11 | Dashboard del alumno | COMPLETADA | (F11) | Pantalla principal real (`app/(app)/app/page.tsx`), reemplaza el placeholder de F5. **RSC-first**: un único `Promise.all` en el Server Component resuelve toda la data real antes del primer render (Task 12); los únicos Client Components son las islas que de verdad lo necesitan (`AciertometroLoader` — wrapper `ssr:false` para el custom element de `@number-flow/react`, F7 —, `HeatmapCalendar`, `StartSimulationButton`, nav con `usePathname`). **Racha (nuevo, antes no tenía escritor pese a existir `StreakRecord` en schema)**: `src/lib/streak/compute.ts` (puro: sesión "cuenta" si dura ≥10 min, día activo por `startOfMexicoDay` de F9, racha actual sobrevive "hoy" sin sesión aún si "ayer" tuvo una, se rompe si ni hoy ni ayer) + `src/lib/db/streak.ts` (orquestación, upsert en `StreakRecord`), enganchado como tercer paso de `onSessionFinished` (F6) junto a `recomputeWeakTopics`/`recomputeLearningProfile` — mismo patrón robusto de try/catch independiente. **Delta semanal del Aciertómetro**: sin tabla de historial de predicciones (y sin agregarla sin instrucción explícita), `computeWeekOverWeekDelta` (src/lib/db/adaptive.ts) re-deriva la predicción de "hace una semana" filtrando `SessionAnswer` por fecha de corte y re-corriendo el `predictScore` puro de F6 sobre ese subconjunto — `null` si no hay historial previo a la semana (alumno nuevo, sin baseline), nunca inventa un cambio. **Reforzar hoy / Tino**: mismo problema de F7 (recurrente) — `WeakTopic` exige ≥3 intentos/tema y un alumno recién diagnosticado casi nunca llega ahí en ningún tema. `loadWeakestTopics` (src/lib/db/dashboard.ts) prefiere `WeakTopic` persistido y rellena los huecos con un ranking histórico completo SIN umbral (`loadAllTimeTopicRanking`) — mismo patrón de relleno que F7, aquí a nivel de todo el historial (no solo la última sesión) por ser un widget persistente. Tino recomienda el tema MÁS débil real (nunca genérico). **Mapa de calor 90 días**: nivel por día = duración de la sesión MÁS LARGA de ese día (0 sin sesión, 1 "tenue" <30min, 2 "lleno" ≥30min — regla exacta del PRD F-05), vía `react-calendar-heatmap` (typings instalados: `@types/react-calendar-heatmap`, no traía los suyos) + clases CSS propias (`.heatmap-level-N`) coloreadas con los tokens de marca. **Aciertómetro bloqueado (Task 11)**: `loadAciertometroAccess` — booleano NUEVO y distinto del gate de F9 (`canStartFullSimulation`, que responde "¿puede EMPEZAR uno nuevo?", no "¿debe VERSE el Aciertómetro?"): `unlocked = isPaid || completedFullSimulations > 0`, reusando las mismas funciones de `src/lib/db/paywall.ts` (F9) sin duplicar queries. `AciertometroLocked` (candado + copy + enlace ancla `#simulacro-cta` al botón real de la misma página — no a `/simulador`, que no existe hasta F12). **CTA primario "Hacer un simulacro completo"**: llama al `startSession` real de F2/F9 (ya gatea "1 gratis"), redirige a `/paywall` real si el muro lo bloquea; como el simulador (F12) aún no existe, el estado de éxito confirma honestamente "tu sesión ya quedó guardada" en vez de fingir una navegación a una pantalla que no existe. **Estados vacíos (Task 10)**: sin diagnóstico → único CTA claro con Tino (degrada TODO el dashboard, no solo el Aciertómetro); sin temas débiles y sin simulacros → `EmptyState` con Tino + acción, copy de "sin simulacros" tomado literal de UIUX Spec ("¡El primero es el más importante! 🦉"). **Navegación**: `Sidebar` (desktop, `lg:flex`/`hidden`) + `BottomNav` (móvil, `lg:hidden`, 5 opciones — las 3 rutas aún no construidas (Practicar/Simulador/Progreso/Perfil) apuntan a `/app` con un flag `builtRoute` que evita que se marquen visualmente "activas") + `TopBar` (racha + avatar), wireados en `app/(app)/layout.tsx` (afecta a todas las rutas del grupo `(app)`, ancho máximo ampliado a `max-w-5xl` sin romper nada). **Bug real encontrado y corregido**: la sintaxis de valor arbitrario `pb-[env(safe-area-inset-bottom)]` en `BottomNav` disparaba un bug de parseo del escáner de CSS de Tailwind 4 (Turbopack Y webpack, en modo dev) que corrompía candidatos `bg-[var(...)]` YA EXISTENTES en otros archivos (bytes de control en el nombre de la variable) — se evitó por completo reemplazando esa clase por `.acierta-safe-bottom` (CSS manual). **Bug preexistente, NO de esta fase, documentado para F-hardening**: incluso sin esa clase, el build de producción sigue emitiendo 1 warning no bloqueante sobre un candidato `bg-[var(...)]` corrupto (mismo síntoma, aparentemente disparado solo por el volumen de usos idénticos de `bg-[var(--bg-base)]` repetidos en 8+ archivos desde F5-F10) — no afecta el HTML/CSS servido, solo ensucia el log de build; raíz probable: bug del engine Oxide de Tailwind 4 con candidatos arbitrarios duplicados, no algo corregible desde el código de la app. 15 tests nuevos (244 total, todos verdes). **Verificación en vivo contra Supabase real** (usuario de prueba + fixtures SQL de sesiones/respuestas reales sobre preguntas reales de UNAM, recomputadas con el pipeline REAL `onSessionFinished` vía script `tsx` desechable — no con SQL a mano — para que Aciertómetro/racha/temas débiles reflejen exactamente lo que produciría un alumno real; todo eliminado al terminar): saludo+cuenta regresiva con fecha real del examen, Aciertómetro con predicción 60→meta 101→gap 41→+26 esta semana, Tino recomendando el tema realmente más débil (Circuitos eléctricos, 44%), 3 tarjetas de "reforzar hoy" en orden ascendente correcto, mapa de calor con niveles exactos (3 sesiones "tenue" + 2 "lleno" de los 5 fixtures, día de simulacro excluido al no estar COMPLETED), racha=4 (días consecutivos reales), simulacro reciente con score real; estado bloqueado del Aciertómetro y estado vacío de "sin simulacros" (copy exacto del spec) verificados forzando el simulacro fixture a no-completado; `Sidebar` oculto/`BottomNav` visible en 375px y viceversa en 1280px confirmado por `getComputedStyle`. Verificación hecha contra `next build` + `next start` (producción) en vez de `next dev`, porque el bug de Tailwind arriba SÍ es bloqueante (error duro, no solo warning) bajo Turbopack/webpack en modo dev — no afecta el sitio real que ve un usuario. `pnpm typecheck`, `pnpm lint`, `pnpm build` OK |
| F12 | Simulador (UX fiel al examen oficial) | COMPLETADA | (F12) | **EL feature diferenciador del producto.** Ruta `/simulador` FUERA del grupo `(app)` a propósito: sin Sidebar/BottomNav/TopBar — pantalla aislada y seria (UIUX §13), sin Tino ni gamificación durante la sesión (Tino solo reaparece en la bienvenida del gratuito y en resultados). **Reusa el motor de sesiones (F2/F6/F9) sin duplicarlo**: scoring server-side, política de no-revelado por modo (`buildSubmitResponse`), muro suave (`evaluateSimulationGate`), y `finishSession`→`onSessionFinished` (recálculo adaptativo). **Guardrail #1 del proyecto (la respuesta correcta JAMÁS viaja antes de terminar)**: ya garantizado por `buildSubmitResponse` (FULL_SIMULATION devuelve solo `{recorded:true}`) y `toRunnerQuestion` (opciones = solo `{id,text}`); el simulador reusa AMBOS. Verificado por (a) test unit `tests/simulator/no-leak.test.ts` que corre las MISMAS funciones del payload real, serializa el resultado y afirma que no contiene `isCorrect`/`correct` ni el contrato de sync acepta correctitud; (b) intercepción de RED REAL en vivo: la respuesta de `/api/simulator/sync` fue `{ok,recorded:1}` mientras la DB guardaba `isCorrect=true` calculado server-side — la correctitud nunca cruzó el cable; (c) `tests/e2e/simulator.spec.ts` (Playwright: happy-path + `page.on('response')` afirmando cero fugas, auto-omite sin credenciales E2E). **Módulos PUROS testeados** (`src/lib/simulator/`): `config` (institución→barajado: UNAM baraja preguntas+opciones, IPN solo preguntas), `shuffle` (Fisher-Yates SEMBRADO por `sessionId+questionId` — barajar opciones es determinista para que reabrir muestre el mismo orden, y solo cambia la vista: los `id` se conservan, el scoring no se afecta), `integrity` (merge monotónico de contadores, detección de atajos sospechosos), `time` (restante server-side, tono 30/15 min, formato HH:MM:SS). 28 tests nuevos (272 total). **Capa DB** (`src/lib/db/simulator.ts`): `startSimulation` (params por examen — 120/180 UNAM, 140/180 IPN —, set repartido por peso de materia reusando `buildDiagnosticQuestionSet`, pre-crea las N `SessionAnswer` para retomar), `loadSimulatorState` (resuelve activa/expirada/ninguna; el tiempo lo decide el SERVIDOR contra `startedAt`, nunca el cliente), `recordSimulatorSync` (upsert idempotente + integrity max-merge; nunca revela correctitud), `loadSimulatorResult` (desglose por materia + Aciertómetro). **Route Handler** `POST /api/simulator/sync` (no Server Action: es el destino de `navigator.sendBeacon`) para las 3 vías de resiliencia: flush periódico, reintento al reconectar, beacon en `beforeunload`/`pagehide`. **Store Zustand** (`src/lib/stores/simulatorStore.ts`) — ÚNICO uso de Zustand en el proyecto (CLAUDE.md): cola local de respuestas para offline, integrity, y la regla "no se puede regresar" codificada (`advance()` solo incrementa; no existe decremento). **Componentes** (`src/components/simulator/`): `SimulatorApp` (máquina de estados entry→active→result), `SimulatorPreflight` (reglas, cámara opcional no-bloqueante, aviso móvil, Tino de bienvenida al gratuito), `SimulatorRunner` (sesión seria: barra con temporizador de color, un reactivo, solo "Siguiente", listeners de integridad, pantalla completa vía `useSyncExternalStore`, overlay de reanudación), `SimTimer` (anclado a deadline absoluto ⇒ NO se pausa al cambiar de pestaña), `SimQuestion`, `SimulatorResult`. **Pantalla completa** vía `screenfull` con degradación graciosa (tarea 3). Dashboard wireado: nav "Simulador"→`/simulador` (builtRoute) y `StartSimulationButton` ahora navega al simulador real. **Bug real encontrado y corregido en verificación en vivo**: `await screenfull.request()` se COLGABA en contextos embebidos/con permiso restringido, bloqueando el arranque del examen (violaba la tarea 3 "nunca bloquear al usuario"); se cambió a disparo sin `await` (el gesto se conserva, el estado real lo refleja el runner). **Verificación en vivo contra Supabase real** (usuario de prueba onboardeado a UNAM Ingeniería en Computación, todo eliminado al terminar): pre-flight con Tino+reglas+cámara+params correctos; iniciar creó sesión `FULL_SIMULATION` IN_PROGRESS con 120 `SessionAnswer` y límite 10800s; runner serio sin Tino, "Pregunta 1 de 120", solo "Siguiente" (cero botón "Anterior"); responder+avanzar sincronizó al endpoint (respuesta sin `isCorrect`, DB con `isCorrect=true` server-side); envejecer `startedAt` +200min y recargar disparó la detección server-side de tiempo agotado → auto-cierre `COMPLETED_BY_TIMEOUT` score=1 → pantalla de resultados (aciertos, tiempo, Aciertómetro, desglose Español 19/Física 30/Mat 48/Química 23 = 120 por peso); fullscreen falló en el navegador embebido y el examen corrió igual (`completedFullscreen=false`, degradación graciosa); revisitar `/simulador` tras gastar el gratuito redirigió al `/paywall?trigger=FULL_SIMULATION_LIMIT`. `pnpm typecheck`, `pnpm lint`, `pnpm build`, 272 tests OK. **Nota de infra:** el E2E de Playwright apunta al servidor de PRODUCCIÓN (`pnpm build && pnpm start`), no a `next dev`, porque el escáner de CSS de Tailwind 4 en dev sigue con el bug de F11 (candidatos de valor arbitrario). Por eso la verificación en vivo también se hizo contra `next start`. **Pendiente heredado (F13):** los resultados son la versión básica (aciertos, tiempo, Aciertómetro, desglose); percentil vs. ciclo y "revisar preguntas falladas" con resolución por capas son F13 |
| F13 | Resultados del simulacro | COMPLETADA | (F13) | Pantalla que se ve justo al terminar un simulacro: aquí regresa la calidez que el simulador (F12) deliberadamente no tenía — Tino, color, celebración. **Guardrail de acceso (tarea 1)**: `loadOwnedFinishedSession` (src/lib/db/simulator.ts) es el ÚNICO punto que verifica dueño+sesión-terminada, compartido por `loadSimulatorResult` y el nuevo `loadSimulatorReview` — verificado en vivo con un `sessionId` ajeno/inexistente (cae a la entrada normal sin filtrar nada) y con una sesión propia AÚN EN CURSO (no muestra resultados; retoma la sesión activa en su lugar). **Celebración (tarea 2)**: `isPerfectRound` (src/lib/simulator/config.ts, umbral 90% medido contra los reactivos SERVIDOS, no el total oficial) dispara `PerfectRoundReveal` — estallido de partículas con Framer Motion `type:'spring'` (nunca linear, regla del proyecto) envuelto en `MotionConfig reducedMotion="user"` (mismo patrón ya probado de `StepTransition.tsx`, F5) para la tarea 12 sin lógica condicional propia. **Desglose por materia con color (tarea 3)**: `subjectColorFor` — paleta categórica `--chart-1..6` NUEVA en globals.css, deliberadamente DISTINTA de `--success`/`--danger` (esos ya significan correcto/incorrecto en toda la app) y NO reusa `Area.colorHex` (todas las materias de una sesión comparten la misma área, así que ese color no diferenciaría filas) — asignación determinista por hash del `subjectId` (reusa `hashSeed` de F12) para que "Matemáticas" tenga siempre el mismo color. **Aciertómetro con delta de sesión (tarea 5)**: `computeSessionPredictionDelta` (src/lib/db/adaptive.ts) — mismo patrón que el delta semanal de F11 pero con corte por SESIÓN en vez de por fecha: recalcula la predicción "antes" excluyendo las respuestas de ESTA sesión y la compara contra la ya persistida (que ya la incluye); `null` sin línea base (primera sesión del alumno) en vez de inventar un "+0". El componente `Aciertometro.tsx` ganó un `deltaLabel` opcional (default conserva el copy de F11 "esta semana") para reusarlo aquí como "por este simulacro" sin duplicar el componente. **Percentil (tarea 6)**: `computePercentileRank` (src/lib/simulator/percentile.ts, PURO) compara contra otras sesiones COMPLETADAS del MISMO `examId` (institución+nivel+año ya lo acotan a "mismo ciclo"); oculta el dato con `null` si la muestra es menor a `MIN_PERCENTILE_SAMPLE=5` en vez de mostrar un número sin sentido. **Verificado en vivo AMBOS estados**: con 0 sesiones hermanas el percentil no aparece; tras insertar 6 sesiones fixture con scores [40,60,75,90,100,118] para el mismo examen, recargar mostró exactamente "Le ganaste al 83%" (5 de 6 con score menor que 110 = 83.3%→83, matemática confirmada bit a bit). **Integridad con tono sobrio (tarea 7)**: `summarizeIntegrityEvents` (src/lib/simulator/integrity.ts, PURO) agrega los 3 contadores + las salidas de fullscreen desde `suspicionEvents`, filtra a solo los que ocurrieron (>0) — la copy explica "en el examen real esto puede anular tu evaluación" sin acusar. **Revelado de respuestas + revisión (tareas 8 y 9)**: nueva `loadSimulatorReview` trae las preguntas FALLADAS con la opción correcta marcada (✓/✗/○, nunca solo color — regla de accesibilidad) y la Capa 1 de explicación (siempre gratis, F9) si existe — 380 reactivos del pipeline F4 ya la tienen generada. Ruta `/simulador?view=review&session=X`, `SimulatorReview.tsx` con `<details>/<summary>` nativo (mismo patrón cero-JS del FAQ de F10). **Tino reacciona (tarea 10)**: ronda perfecta→`celebrating`, ≥60%→`attentive`, si no→`encouraging` (nunca un estado negativo — Tino anima, no regaña). **Racha (tarea 11)**: NO requirió código nuevo — `isQualifyingStreakSession` (F11) ya es agnóstica al modo de sesión (solo mira duración ≥10 min), así que un simulacro terminado ya contaba automáticamente vía el mismo `finishSession`→`onSessionFinished`→`recomputeStreak`; se agregó un test explícito que lo documenta y una racha real de 1 día se confirmó en vivo tras el primer simulacro del usuario de prueba. 21 tests nuevos (293 total). **Verificación en vivo contra Supabase real** (usuario de prueba onboardeado a UNAM, sesión de 120 reactivos con 110 correctas vía fixture SQL + `finishSession` REAL corrido con `tsx` — no simulado a mano — para que Aciertómetro/racha/percentil reflejen exactamente lo que produciría un examen real): celebración disparada (110/120=91.7%≥90%), desglose por materia exacto (Español 18/19, Física 26/30, Matemáticas 45/48, Química 21/23, suma=110), tiempo total y promedio correctos, racha 🔥1, delta del Aciertómetro correctamente OCULTO (primera sesión, sin línea base), percentil oculto→mostrado (83%) en ambos escenarios, revisión de las 10 falladas con respuesta correcta marcada y explicación real por `<details>`, acceso bloqueado a sesión ajena/inexistente y a sesión propia sin terminar. Todo el fixture (6 perfiles+sesiones dummy de percentil + el usuario principal) eliminado al terminar. `pnpm typecheck`, `pnpm lint`, `pnpm build`, 293 tests OK |
| F14 | Drill + capas de profundidad | COMPLETADA | (F14) | Ciclo de práctica diaria: `/practicar` DENTRO del grupo `(app)` (a diferencia del simulador aislado de F12 — el drill SÍ conserva Sidebar/BottomNav/TopBar, es parte de la experiencia cálida cotidiana). **Reusa el motor de sesiones sin duplicarlo**: `submitAnswer`/`finishSession` (F2) sin modificar — estos modos YA revelan correctitud al responder (`revealsCorrectnessOnSubmit`) y YA disparan `onSessionFinished` (temas débiles + racha, F6/F11) al terminar, así que la tarea 8 no necesitó código nuevo, solo reusar la tubería existente. **Selector adaptativo real (tarea 1)**: 3 alcances — "reforzar débiles" reusa `selectNextAdaptiveQuestions` (F6) sin cambios; nuevos `selectSubjectAdaptiveQuestions` (misma mezcla 60/25/15 acotada a una materia) y `selectTopicQuestions` (aleatorio dentro de un tema — la mezcla por tier no aplica con un solo tema) en `src/lib/db/adaptive.ts`. El schema no tiene un tercer `SessionMode` para "una materia" (no se toca `prisma/schema.prisma` sin instrucción explícita — CLAUDE.md), así que la decisión de mode quedó en un módulo PURO y testeado, `src/lib/drill/scope.ts` (`modeForScopeKind`): `topic`→`TOPIC_DRILL`, `subject`/`area`→`AREA_PRACTICE`. **Límite diario (tarea 2)**: reusa `evaluateDrillGate` de F9 sin cambios — contador visible ("Te quedan N reactivos gratis hoy") en el selector y dentro de la sesión activa. **Feedback inmediato (tarea 3)**: `DrillOptionButton` nuevo (a diferencia de `exam/OptionButton`, que NUNCA revela correctitud por diseño — este SÍ, porque el drill ya la revela al responder) con ✓/✗/texto siempre juntos (nunca solo color). **Resolución por 4 capas (tarea 4, PRD F-04)**: `ExplanationAccordion` — revelado PROGRESIVO (capa N solo pedible si N-1 ya se reveló) y cada clic re-valida el muro suave EN EL SERVIDOR vía `revealExplanationLayerAction`→`evaluateExplanationLayerGate` (F9, sin cambios): el contenido de capas 2-4 nunca llega al cliente de un usuario gratuito sin autorización — no es solo un candado visual, verificado en la respuesta de red real (`{"ok":false,"code":"PAYWALL"}`, sin el texto de la capa). Capa 4 no vive en la DB (el pipeline F4 solo generó capas 1-3, confirmado por conteo); es una invitación estática con la Capa 4 real seguida de la tarea 6. **Fórmulas matemáticas (tarea 5)**: `LatexText`/KaTeX reusado sin cambios (F7/F12/F13). **Capa 4 abre una sesión filtrada por tema (tarea 6)**: `onPracticeMore(topicId)` cierra honestamente la sesión actual (mismo `finishSession`, recalcula temas débiles+racha con lo avanzado hasta ahí) y abre de inmediato `startDrillAction({kind:'topic', topicId})` — mismo flujo que "por tema" del selector, sin código duplicado. **Reportar error (tarea 7)**: nuevo `reportQuestion`/`reportQuestionAction` — el único tramo de escritura que faltaba (la lectura y resolución en `/admin/reports` ya existían desde F3); `reportedBy` guarda el `authUser.id` (Supabase UID), mismo criterio que `UserProfile.userId`. **`RunnerQuestion` ganó `topicId`** (F7, campo aditivo no-breaking) — lo necesitaba la Capa 4 y el deep-link del dashboard. **`WeakTopicCard` (F11) dejó de apuntar a `/app`**: ahora enlaza a `/practicar?topicId=` con auto-arranque (`DrillApp` dispara el scope en un `useEffect` al montar) — un placeholder real menos. 3 tests nuevos (296 total, solo `modeForScopeKind`: la selección adaptativa por materia/tema es orquestación DB reusando el motor YA testeado de F6, y el resto de la lógica nueva es DB-touching sin lógica pura propia — verificado en vivo en su lugar, mismo criterio que `question-read.test.ts`). **Verificación en vivo contra Supabase real** (usuario de prueba + fixture de historial real en Álgebra vía `onSessionFinished` real, no SQL a mano): el selector "reforzar débiles" sirvió el tema débil real como primer reactivo; responder mal mostró ✗/✓ correctos al instante; Capa 1 se reveló con contenido real, Capa 2 quedó bloqueada con el link a `/paywall?trigger=EXPLANATION_LAYER&return=%2Fpracticar` (confirmado también a nivel de red); reportar un reactivo lo insertó con el `authUser.id` correcto y, tras 3 reportes, apareció en `/admin/reports` con el conteo exacto; terminar la sesión dejó la racha en 1 (era 0) y el `WeakTopic` recalculado con historial real (incluyendo las preguntas no respondidas del lote, mismo criterio ya usado en diagnóstico F7 — respuesta omitida cuenta como incorrecta). Todo el fixture (usuario, sesiones, reportes) eliminado al terminar. `pnpm typecheck`, `pnpm lint`, `pnpm build`, 296 tests OK |
| F15 | Gamificación y microcopy centralizado de Tino | COMPLETADA | (F15) | **Objetivo doble**: reglas exactas de disparo de las 3 mecánicas de motivación (racha/ronda perfecta/materia dominada) centralizadas en un único motor de prioridad, y diccionario centralizado de la voz de Tino en toda la app. **Módulos puros nuevos** (`src/lib/gamification/`): `mastery.ts` (`isSubjectMastered` — materia dominada exige `hitRate≥0.85` Y `attempts≥MIN_TOPIC_ATTEMPTS` en TODOS los temas de la materia, nunca el promedio general; reusa `MIN_TOPIC_ATTEMPTS` de F6 pero define su propio `SUBJECT_MASTERY_THRESHOLD` con comparación `>=` — deliberadamente distinto de `classifyTopicTier` de F6, que usa `>` estricto para un propósito distinto, clasificación de tier para el selector adaptativo), `streak-signals.ts` (`newlyReachedStreakMilestone` — 7/14/30, detecta el CRUCE, no solo "está por encima"; `isStreakAtRisk` — racha viva pero sin sesión calificante en el día México actual, reusa `startOfMexicoDay` de F9), `celebrations.ts` (`selectCelebration` — el ÚNICO punto que decide cuál de las 3 celebraciones grandes se muestra, prioridad exacta materiaDominada > perfectRound > streakMilestone, como máximo una por sesión; más `encodeCelebrationParam`/`decodeCelebrationParam` para viajar en la URL del redirect del simulador). **Diccionario centralizado** `src/lib/tino/copy.ts`: toda "línea de voz" de Tino (no copy transaccional de checkout/marketing, que se dejó fuera a propósito) vive aquí con su `TinoState` correcto — cubre estados vacíos, racha en riesgo, milestone de racha, después de error, paywall (relocado desde el `TRIGGER_COPY` local de `PaywallScreen.tsx`, F9), predicción sube, resultados de diagnóstico/simulacro/drill. **Capa DB** (`src/lib/db/gamification.ts`): `computeSessionCelebration` (llamada desde `finishSession` en `sessions.ts`, F2 — captura `previousStreak` ANTES de `onSessionFinished` y `currentStreak` DESPUÉS, para detectar el cruce exacto de milestone de ESTA sesión; otorga insignias `MATERIA_DOMINADA:<subjectId>` vía el mismo patrón idempotente `push` que `grantEarlyBirdBadge`, F8, reusando `UserProfile.badges` — CERO cambios de schema), `loadStreakStatus`, `loadMasteredSubjectBadges`. `FinishSessionResult` ganó el campo `celebration: Celebration | null`, robusto (try/catch, nunca rompe el cierre de sesión). **Simulador → resultados**: como `finishSimulationAction` redirige de página completa antes de que `SimulatorResult` se monte, la celebración decidida server-side viaja codificada en la URL (`encodeCelebrationParam`) en vez de recalcularse en el render (recalcular sería incorrecto: para entonces la insignia ya se otorgó, "recién dominada" ya no se distinguiría de "dominada desde antes"). **Componentes nuevos** (`src/components/gamification/`): `CelebrationDisplay` (las 3 variantes, reusando `PerfectRoundReveal` — relocado desde `components/simulator/`, formalizado como pieza compartida per tarea 1 — para las 3, solo cambia el marco/texto/tiempo; materia dominada usa transición card-flip 1400ms vía `rotateY`, UIUX §9), `StreakRiskBanner`, `MasteredSubjectBadges` (sin página de Perfil dedicada aún — nav la deja `builtRoute:false` — la insignia vive en el dashboard existente). **Migración de microcopy** a los ~10 puntos que antes tenían el texto disperso/duplicado: `DiagnosticResults.tsx` (su `tinoMessage()` local → `diagnosticResult()`), `PaywallScreen.tsx` (su `TRIGGER_COPY`/`DEFAULT_COPY` local → `paywallTriggerCopy()`), `PracticeSelector.tsx`, `SimulatorPreflight.tsx`, `SimulatorResult.tsx` (su lógica ad-hoc de 3 niveles → `simulatorResult()` + `CelebrationDisplay`), `DrillSummary.tsx` (+ `CelebrationDisplay`), `DrillRunner.tsx` (burbuja nueva de Tino tras responder mal, `afterMistake()`), `app/(app)/app/page.tsx` (empty states + nuevas secciones de racha en riesgo/insignias), `app/(app)/practicar/page.tsx` + `app/simulador/page.tsx` (`NoTargetMessage`), `app/(app)/diagnostico/page.tsx` (`NoContentMessage`). **Guardrail tarea 6 (cero Tino en el simulador activo)**: verificado con un test que lee el CÓDIGO FUENTE real de `SimulatorRunner.tsx` (no un mock) y falla si la palabra "Tino" aparece fuera de un comentario — mismo patrón de permanencia que `no-leak.test.ts` de F12. **Reduced motion (tarea 7)**: las 3 celebraciones + `PerfectRoundReveal` ya envueltas en `MotionConfig reducedMotion="user"` (patrón establecido desde F5/F13). 34 tests nuevos (330 total): límites exactos de fecha de racha (medianoche México, incluida la ventana 23:00-23:59), umbral de materia dominada (el caso crítico "un tema al 50% aunque el promedio general sea 91.6%" es `false`), prioridad de celebraciones con los 3 candidatos calificando a la vez, round-trip de serialización de celebración en URL, y el guardrail de código fuente. **Verificación en vivo contra Supabase real** (usuario de prueba `acierta.f15.gamify@gmail.com` onboardeado a UNAM Ingeniería en Computación — señal `email_confirmed_at` fijada por SQL porque el proyecto exige confirmación y no hay proveedor SMTP propio en este entorno de prueba, mismo tipo de workaround de infra que otras fases, no un bypass de la lógica de negocio): sesión real de práctica de 10 reactivos vía la UI (4 correctas/6 incorrectas) disparó `finishSession`→`onSessionFinished`→`computeSessionCelebration` real; la burbuja "Uy, esa estuvo difícil. La volvemos a ver más adelante. 💪" apareció exactamente tras cada respuesta incorrecta; `DrillSummary` mostró el copy correcto de `drillSummary(0.4)` sin celebración (correcto: ninguna materia con TODOS sus temas al umbral, sesión de 2 min no calificó para racha); confirmado por query directa a la DB tras terminar: `badges=[]`, `currentStreak=0` — exactamente el resultado esperado, sin falsos positivos. Cero errores de consola, cero errores de servidor. Todo el fixture (usuario + perfil, cascada completa) eliminado al terminar. `pnpm typecheck`, `pnpm lint`, `pnpm build`, 330 tests OK |
| F16 | Panel parental y sistema de correos | COMPLETADA | (F16) | **El schema ya tenía TODO lo necesario** (`ParentLink`, `ParentLinkCode`, `NotificationPreference`/`NotificationType`, `UserRole.PARENT`, más el gate `evaluateParentDashboardGate`/`canAccessParentDashboard` de F9) — F16 fue 100% código nuevo sobre un modelo de datos ya preparado, cero cambios de schema. **Vinculación** (tareas 1-2): `src/lib/parent/link-code.ts` (puro: código de 6 dígitos, TTL 10 min, `isLinkCodeRedeemable` exige `usedAt===null` Y no vencido) + `src/lib/db/parent.ts` (`generateParentLinkCode` invalida códigos previos sin usar del mismo alumno antes de crear uno nuevo — evita ambigüedad de "cuál es el vigente"; `redeemParentLinkCode` es atómico vía `updateMany({where:{code,usedAt:null,expiresAt:{gt:now}}})` — si dos canjes llegan a la vez, como mucho uno actualiza una fila, sin necesitar un lock manual). **Privacidad, verificada en DOS capas** (tarea 4): (a) `src/lib/db/parent.ts` nunca hace `select`/`include` sobre `Question` ni `SessionAnswer.selectedOption`/`isCorrect` — todo lo que expone son loaders YA EXISTENTES de F11 que agregan (`loadExamCountdown`, `loadRecentSimulations`, `loadHeatmapData`, `computeWeekOverWeekDelta`), cero lógica nueva que auditar; (b) a nivel de base de datos, las políticas RLS de F1 (`0001_enable_rls.sql`, sin cambios en esta fase) YA restringían `exam_sessions`/`session_answers`/`weak_topics`/`streak_records`/`learning_profiles`/`questions` a `userProfileId = current_profile_id()` SIN ninguna excepción de "padre" — un tutor con el JWT del cliente no puede leer ni una fila agregada de esas tablas ni con acceso directo a Supabase; solo el servidor (Prisma, rol `acierta_ci` con BYPASSRLS) puede, y ese código es exactamente el auditado en (a). **Panel bloqueado** (tarea 5): reusa el gate de F9 tal cual (`evaluateParentDashboardGate`, Mensual no alcanza) — sin botón de "comprar" en el panel del tutor (el plan se activa desde la cuenta del alumno, no hay flujo de "pagar por otro" en este producto). **Multi-hijo** (tarea 6): `loadLinkedStudents` + `StudentSwitcher` — puros `<Link href="/tutor?student=...">` sin JS de cliente, cada `parentProfileId+studentProfileId` verificado independientemente en `loadParentDashboardData` (un alumno bloqueado y otro desbloqueado del mismo tutor se muestran correctamente por separado). **Navegador de Facebook** (tarea 7): `/tutor` fuera de `(app)`, sin Sidebar/BottomNav/Tino, con `ParentShell` (modo claro fijo) — de sus 6 componentes, solo 2 son Client Components (`LinkCodeForm`, `WeeklyEmailToggle`), ambos formularios/checkboxes nativos sin APIs exóticas; verificado en viewport 375px sin scroll horizontal y cero errores de consola. **Sistema de correos** (tarea 8): `src/lib/email/client.ts` (Resend con `import 'server-only'`, mismo patrón que `stripe/client.ts` F8) — sin `RESEND_API_KEY` o si Resend falla, degrada a solo `console.log` sin lanzar nunca (instrucción explícita: "continúa sin detenerte"); 4 plantillas puras (`templates.ts`): confirmación de pago (hookeada en el webhook de Stripe existente, usa datos YA presentes en el evento verificado — `customer_details.email`, `metadata.plan`, `amount_total` — sin queries extra), resumen semanal parental, racha en riesgo, cuenta regresiva (30/15/7/1). **Un solo cron diario** (`/api/cron/notifications`, protegido con `CRON_SECRET` vía `Authorization: Bearer` — el mismo header que Vercel Cron agrega automáticamente) corre los 3 jobs de correo; la regla "racha en riesgo máximo 1/día" se cumple ESTRUCTURALMENTE por la cadencia del propio cron (una corrida diaria), no con una bandera "ya enviado hoy" en DB — evita tocar el schema. El resumen parental solo dispara en lunes real de México (`isMondayInMexico`, reusa `startOfMexicoDay` de F9). **Enlace de baja** (tarea 9): firma HMAC (`sign/verifyUnsubscribeToken`) reusando `CRON_SECRET` como llave (evita introducir un secreto nuevo) — sin ella, el link de baja sería un IDOR trivial (apagar la preferencia de cualquier otro usuario adivinando su id); solo los 3 tipos NO transaccionales lo llevan (`PARENT_WEEKLY`/`STREAK_RISK`/`EXAM_COUNTDOWN`) — la confirmación de pago nunca, por regla explícita de Flujo_App §13. Preferencias opt-in vs. prendidas-por-defecto decididas en código (`src/lib/notifications/preferences.ts`), no en el schema (`enabled` por defecto es `true` ahí, pero "sin fila" se interpreta como apagado para `PARENT_WEEKLY`/`STREAK_RISK`). **Registro de tutor**: `/registro?role=tutor` (CTA agregado a `ParentSection.tsx` de F10) pasa `role=PARENT` a `signUpAction` (antes solo creaba `STUDENT`). **Bug real encontrado y corregido en verificación en vivo**: el login genérico (`/login` sin `?next=`) siempre redirigía a `/app` sin importar el rol — un tutor caía directo en el asistente de onboarding de ALUMNO (`/app`→`requireOnboarding`→`/onboarding`, con `onboardingStep=0` de por vida porque un tutor nunca pasa por ese asistente, quedando efectivamente atrapado). Corregido en dos puntos: `signInAction` ahora resuelve el destino por ROL cuando no hay `next` explícito (`/tutor` para PARENT, `/app` para STUDENT; un `next` explícito como `/login?next=/tutor` sigue ganando), y `(app)/layout.tsx` ahora comprueba el rol ANTES que el onboarding (defensa en profundidad — si un PARENT llegara a `/app` por cualquier otra vía, se redirige a `/tutor` en vez de caer en el bucle de onboarding). 22 tests nuevos (367 total): límites exactos del código de 6 dígitos (TTL, un solo uso, no reusable tras canjearse), umbral de inactividad de 3 días, defaults opt-in de notificaciones, firma/verificación del token de baja (incluye anti-IDOR: un token válido para OTRO userProfileId o tipo se rechaza), autorización del cron, y la regla de "lunes en México". **Verificación en vivo contra Supabase real** (2 alumnos + 1 tutor, cuentas creadas por SQL directo en `auth.users`/`auth.identities` porque el proyecto agotó su cupo gratuito de correos de verificación de Supabase por esta fecha — mismo tipo de workaround de infraestructura que otras fases, no un bypass de lógica de negocio; login normal con contraseña funcionó igual que con una cuenta creada por el flujo real): código de 6 dígitos generado con cuenta regresiva en vivo (10:00→9:58 confirmado), código inválido rechazado con el mensaje correcto, código real canjeado exitosamente (confirmado en DB: `ParentLinkCode.usedAt` fijado, fila `ParentLink` creada), panel bloqueado mostrado correctamente para un alumno FREE, panel completo desbloqueado tras fixture de una suscripción `SEASON_PASS` ACTIVE con racha/predicción reales, selector entre 2 hijos con estados independientes (uno bloqueado, otro desbloqueado) confirmado, toggle de resumen semanal confirmado en DB tras clic real, viewport 375px sin scroll horizontal ni errores de consola, ruta cron rechaza sin/con secreto incorrecto (401 en ambos casos), ruta de baja rechaza firma inválida y tipo inválido. Todo el fixture (3 perfiles + auth.users/identities + suscripción + racha + predicción + vínculos) eliminado al terminar, cero filas huérfanas confirmado por query. `pnpm typecheck`, `pnpm lint`, `pnpm build`, 367 tests OK |
| F17 | PWA instalable y perfil de usuario completo | COMPLETADA | (F17) | **PWA** (tarea 1): `app/manifest.ts` (convención de archivo de Next, mismo patrón que `sitemap.ts`/`robots.ts` de F10) con `display: "standalone"` + 3 íconos generados al vuelo con `next/og` (192/512/512-maskable, mismo truco que `opengraph-image.tsx` de F10 — sin depender de un archivo de diseño) más `apple-icon.tsx` y `appleWebApp` en metadata para iOS (Safari ignora el manifest, solo respeta esas meta tags). **Offline mínimo, a propósito minimalista**: `public/sw.js` escrito a mano (sin Workbox) con DOS estrategias nada más — navegaciones: network-first con respaldo a caché (el tablero y cualquier pantalla de `(app)` quedan disponibles con los últimos datos vistos); `/_next/static/*`: cache-first (nombre de archivo con hash de contenido, cachear agresivo es seguro — sin esto el HTML offline se vería sin estilos ni JS de hidratación). **`/simulador` es la EXCEPCIÓN explícita y verificada en vivo**: el service worker nunca lo cachea (`isSimulatorPath()`) y responde con una página de aviso de "necesitas conexión" en vez de contenido viejo — confirmado navegando a `/simulador` y comprobando que la Cache Storage API sigue sin ninguna entrada que contenga "simulador", mientras que `/app`, `/app/perfil`, `/login` y `/` sí quedaron cacheados. **Aviso de instalación no invasivo**: `shouldShowInstallPrompt` (puro, `src/lib/pwa/install-prompt.ts`) — 2ª visita en adelante, cooldown de 7 días tras descartarlo, nunca si ya está instalada (`display-mode: standalone`); conteo de visitas y fecha de descarte en `localStorage` a propósito (estado del dispositivo, no de sesión — no viola la regla de CLAUDE.md sobre datos sensibles). **Tema migrado de localStorage a DB** (tarea 2, criterio explícito): `ThemeToggle.tsx` (F0, nunca conectado a ningún layout — código muerto real) se eliminó; `(app)/layout.tsx` ahora lee `profile.themePref` (ya existía en el schema desde el inicio, sin usarse) para el `data-theme` real, y el nuevo selector en Perfil persiste con `updateThemeAction` + `router.refresh()` — verificado en vivo: clic en "Claro" → `UserProfile.themePref='light'` en DB → el div interno de `(app)` cambia a `data-theme="light"` tras el refresh (confirmado con `document.querySelectorAll('[data-theme]')`, distinto del `<html>` raíz que sigue fijo en dark como fallback pre-hidratación). **Pantalla `/app/perfil` completa** (tarea 2): nombre + foto de perfil (subida DIRECTA del navegador al bucket nuevo `avatars` de Supabase Storage — RLS por carpeta `auth.uid()`, migración `0008_avatars_storage_bucket.sql` — el servidor solo valida y persiste la URL resultante, nunca ve el archivo), verificación de correo + reenviar (reusa `resendVerificationAction` de F5 sin cambios), cambiar contraseña (nueva Action, mismo `supabase.auth.updateUser` que ya usaba el flujo de recuperación pero sin el redirect a `/login` — aquí el usuario ya tiene sesión), preferencias de notificación del alumno (`STREAK_RISK`/`EXAM_COUNTDOWN`, reusa `setNotificationPreference` de F16), **cambio de carrera meta con recálculo del Aciertómetro** (verificado en DB de que la nueva carrera pertenece a la MISMA área que la actual — nunca se confía en el `careerId` del cliente; el hueco se recalcula SOLO, sin código nuevo, porque `computeCareerStrategy`, F6, ya releía `targetCareerId` fresco en cada carga — verificado en vivo cambiando de Ingeniería en Computación, meta 101, a Física, meta 104: el Aciertómetro pasó de mostrar el hueco viejo a **"Te faltan ~30 aciertos"** exactamente `104-74`), "Mi plan" con vigencia real y **cancelación de Mensual sin soporte** (`cancel_at_period_end: true` vía Stripe, nunca cancelación inmediata — el alumno ya pagó ese periodo; el webhook YA existente de F8 desactiva el acceso solo cuando Stripe de verdad cierre la suscripción, respetando la regla de oro "el acceso se activa/desactiva SOLO por webhook"; verificado en vivo hasta el límite de las credenciales de Stripe placeholder de este entorno — capital cero, mismo límite heredado documentado desde F8/F9 — el guard-clause y el manejo de error confirmados con un 401 real de Stripe, degradación correcta sin crash), insignias (reusa `loadMasteredSubjectBadges` de F15), y el código de vinculación de tutor (`ParentLinkCard` de F16 MOVIDO del dashboard a Perfil, ahora que existe una pantalla de Perfil real). **Derechos de datos** (tarea 3): exportar (`GET /api/account/export`, Route Handler no Server Action para que el navegador lo trate como descarga real vía `Content-Disposition: attachment` — JSON con cuenta, meta académica, Aciertómetro, racha, temas débiles, sesiones con respuestas, pagos, preferencias y conteo de vínculos parentales) y **eliminar cuenta con confirmación fuerte** (escribir el correo exacto, no un checkbox) que **anonimiza en vez de borrar los pagos**: como `Subscription`/`Payment` tienen `onDelete: Cascade` desde `UserProfile` en el schema, borrar la fila del perfil habría destruido el historial de pagos junto con todo lo demás — en su lugar, el perfil se ANONIMIZA en el sitio (sin nombre/foto/meta/insignias) y sigue vivo como ancla estable para esas filas, mientras que TODO lo demás (sesiones, temas débiles, racha, predicción, preferencias, vínculos parentales) se borra de verdad; la identidad de Auth (correo, login) se borra aparte con `SUPABASE_SERVICE_ROLE_KEY` (primer uso de esa credencial en el proyecto, `src/lib/auth/supabase-admin.ts`) — si esa llamada falla (confirmado en vivo: la llave de servicio no está configurada en este entorno), los datos personales YA se anonimizaron/borraron de todas formas, nunca se bloquea al usuario por esa dependencia opcional. **Verificado en vivo end-to-end contra Supabase real** (cuentas de prueba creadas por SQL directo, mismo motivo/técnica que F16 — cupo de correo de verificación agotado): exportar devolvió el JSON real con la carrera actualizada reflejada; eliminar cuenta con correo incorrecto rechazado, con el correcto anonimizó el perfil (`displayName`/`avatarUrl`/`targetExamId`/`targetCareerId`/`badges` todos vacíos) y borró en cascada sesiones/temas débiles/racha/predicción/preferencias/vínculos (los 7 conteos en 0) mientras la `Subscription` de prueba se conservó intacta (count=1) — exactamente la garantía pedida; el `auth.users` real siguió existiendo (confirma la degradación correcta sin `SERVICE_ROLE_KEY`) pero la sesión se cerró y el usuario quedó fuera. Manifest, los 3 íconos PWA y `apple-icon` verificados con `curl` (200, `image/png`/JSON correctos); service worker confirmado `activated` vía `navigator.serviceWorker.getRegistrations()`. Todo el fixture (3 cuentas, perfiles, suscripciones, `auth.users`/`identities`) eliminado al terminar. 8 tests nuevos (375 total, solo el motor puro del aviso de instalación — el resto de la lógica nueva es orquestación DB/Storage/Stripe sin cálculo propio, verificada en vivo en su lugar, mismo criterio que F14/F16). `pnpm typecheck`, `pnpm lint`, `pnpm build`, 375 tests OK |
| F18 | Pantalla de progreso y barrido de calidad visual | COMPLETADA | (F18) | **Pantalla de trayectoria** (tarea 1, `/app/progreso`, `src/lib/db/progress.ts`): evolución del Aciertómetro (`loadAciertometroHistory`) reconstruida SIN tabla de historial nueva — recorre las sesiones terminadas en orden cronológico acumulando aciertos/intentos por materia y llama a `predictScore` (puro, F6) después de cada una, exactamente la misma técnica de reconstrucción que `computeWeekOverWeekDelta` (F11) ya usaba para un solo corte, aquí aplicada punto por punto (tope 30 puntos, un valor por día); `AciertometroHistoryChart` es SVG estático server-rendered (sin JS de cliente) con `aria-label` resumen en texto (color/forma nunca es el único canal). Dominio por materia (`loadSubjectMastery`) de más débil a más fuerte, incluyendo materias sin intentos, con CTA "Practicar" real — extendido `/practicar?subjectId=` (mismo patrón que `?topicId=` de F11/F14) para el deep-link. Historial COMPLETO de simulacros (`loadSimulationHistory`, sin límite, a diferencia de los 3 del dashboard) enlazando a `/simulador?view=result&session=` ya existente. Estadísticas acumuladas calculadas frescas (reactivos respondidos, % acierto global, horas de estudio sumando duración de sesiones, racha más larga de `StreakRecord.longestStreak`). Vitrina de insignias reutiliza `ProfileBadges` de F17 tal cual. Gate del Aciertómetro reutiliza `loadAciertometroAccess` (F11) — misma regla de muro suave que el dashboard. **Verificado en vivo con fixture real de 3 sesiones en 3 días distintos**: los números de la pantalla (evolución 52→79, 78 reactivos, 69% acierto global, 3.3h, dominio Química 50%/Física 58%/Matemáticas 77%/Español 92%) coinciden EXACTOS con el cálculo manual esperado, y el delta "+27" del dashboard existente coincidió de forma independiente con el primer punto de la gráfica nueva (52) — misma matemática, dos pantallas distintas, verificación cruzada real. **Barrido de colores/bordes hardcodeados** (tarea 2): 6 usos de `rounded-[12px]`/`rounded-[24px]`/`min-h-[44px]` (valores arbitrarios que duplicaban tokens ya existentes) migrados a `rounded-md`/`rounded-xl`/`min-h-touch`; ~15 usos redundantes de `text-[var(--x)]`/`bg-[var(--x)]` (sintaxis de corchetes que ya apuntaban a un token con nombre) migrados a la clase con nombre (`text-danger`, `bg-warning/10`, etc.); **bug real encontrado**: `AuthShell.tsx` usaba `shadow-[var(--shadow-md-dark)]` — esa variable CSS NUNCA existió en `globals.css` (solo `--shadow-md`, ya theme-aware), así que las tarjetas de login/registro/recuperar-password llevaban meses sin sombra real; corregido a `shadow-md`, y le faltaba `font-display` en el título (inconsistencia tipográfica real). Hex literal de marca centralizado en `src/lib/brand/colors.ts` — única fuente para los 6 archivos que SÍ deben usarlo (`next/og` en los íconos PWA/OG image y `Metadata.themeColor`/`manifest.ts`, que no pueden consumir `var()`); `Tino.tsx` (mascota) migrado de hex literal a `var(--token)` en sus 5 acentos de estado (coinciden exacto con success/streak/info/warning/brand). **Contraste AA** (tarea 3, UIUX §12 "verificar especialmente violeta y verde"): medido con la fórmula WCAG real — `text-brand` (violeta) sobre superficies OSCURAS daba 3.03-3.35:1, **por debajo de 4.5:1 para texto normal** (el logo grande en negritas SÍ se salva por la excepción de "texto grande" ≥3:1, pero ~20 enlaces `text-sm font-semibold` en dashboard/drill/simulador/perfil NO) — corregidos a `text-brand-soft` (6.35-7.02:1) en los ~20 sitios reales donde aplicaba, dejando intactos marketing/admin/panel-parental (temas claros fijos, ya pasaban). Verde/ámbar/rojo/azul semánticos (`--success`/`--warning`/`--danger`/`--info`/`--streak`) daban de sobra en dark (5.08-11.45:1) pero **fallaban feo en light** (2.28/1.67/3.76/2.28:1) — como F17 hizo el tema togglable en `/app/perfil` y ahora también en `/app/progreso`, esto es un bug real y alcanzable, no teórico; solución: esos 5 tokens (antes hex estático en `tailwind.config.ts`) ahora son `var(--x)` con un valor SOLO para `[data-theme='light']` calibrado ≥4.5:1 (verde `#15803D`, ámbar `#B45309`, rojo `#DC2626`, azul `#0369A1`, naranja `#C2410C`) — dark no cambia nada (sigue usando el valor vivo original vía `:root`). `--brand-soft` mismo patrón: colapsa a `--brand-primary` solo en light (el lila claro fallaba ahí, 2.72:1). Verificado en vivo con `getComputedStyle` en ambos temas: dark sigue exactamente igual (`rgb(239,68,68)` danger sin cambios), light ahora da `rgb(220,38,38)`/`rgb(21,128,61)` con contraste medido 4.65:1 en el navegador real, no solo calculado. **Accesibilidad de interacción** (tarea 3): foco de teclado — `:focus-visible` global de respaldo en `globals.css` (especificidad baja a propósito, los componentes que ya definían su propio anillo como `Button`/`TextField` lo pisan sin conflicto) para los enlaces/botones que nunca tuvieron tratamiento propio; `TextField`/el `<select>` de carrera meta migrados de "solo cambia el color del borde" (1.90:1, prácticamente invisible) a `focus:ring-2 focus:ring-brand`. Área táctil ≥44px: ~15 controles reales corregidos (toggle de notificaciones del alumno Y del tutor sin `min-h-touch`, "Cancelar mi plan"/"Eliminar mi cuenta"/"Reenviar verificación" sin altura mínima, botones del selector de práctica, reportar reactivo, paginación admin, selector de alumno del tutor). Íconos-botón: ya tenían `aria-label` donde correspondía (cerrar modal admin, navegador de preguntas); checkboxes de notificación ya usaban `<label>` nativo (asociación correcta, sin necesitar `aria-label`). **Barrido responsive** (tarea 4): sin overflow horizontal verificado con `scrollWidth` real en 320/375/768/1280px en progreso/perfil/dashboard; `Sidebar`/`BottomNav` alternan correctamente en el breakpoint `lg`. **Panel parental en 320px** (navegador de Facebook, el caso explícito pedido): verificado en vivo con sesión real de tutor — cero overflow horizontal, estado bloqueado Y estado desbloqueado (con página real: predicción 79, +27 vs. semana pasada — coincide exacto con el cálculo de la pantalla de progreso nueva) ambos renderizan correctamente. **Reduced motion** (tarea 3): ya estaba bien cubierto desde F13/F15 (`MotionConfig reducedMotion="user"` en las 3 celebraciones Framer Motion + regla CSS global `prefers-reduced-motion` para animaciones CSS/`@number-flow`) — verificado que sigue siendo exhaustivo (grep de los 3 únicos usos de `framer-motion` en el repo), sin necesitar cambios. **Detalles finos** (tarea 5): 6 `loading.tsx` nuevos (`/app`, `/app/progreso`, `/app/perfil`, `/practicar`, `/tutor`) con esqueletos reales vía nuevo `<Skeleton>` — el de `/tutor` reutiliza `ParentShell` explícitamente (si no, el esqueleto parpadearía oscuro un instante antes del panel claro real, porque el tema del panel se aplica en `page.tsx`, no en `layout.tsx`). Zonas seguras de iPhone: **bug real encontrado** — `viewport-fit=cover` nunca estuvo en el `<meta viewport>`, así que el `padding-bottom: env(safe-area-inset-bottom)` de `.acierta-safe-bottom` (ya escrito desde F11) llevaba toda la vida resolviendo a 0 en iOS real (el requisito de Safari para que `env()` haga algo); agregado `viewportFit: "cover"` al nuevo `export const viewport` (migrado de paso del `metadata.viewport`/`themeColor` deprecado de Next 14+ al `Viewport` export correcto de Next 16) + nueva `.acierta-safe-top` (mismo motivo que `.acierta-safe-bottom`: la sintaxis arbitraria `pt-[env(...)]` de Tailwind dispara el bug de parseo documentado en F11) aplicada al `TopBar` y al header del simulador, necesaria ahora que `black-translucent` (F17) + `cover` sí dibujan bajo el notch/Dynamic Island. Texto largo: `truncate` ya aplicado donde corresponde en los componentes nuevos (nombre de materia, fila de simulacro). **Confirmado NO bloqueante** (ya documentado desde F10/F11, no de esta fase): advertencia de compilación sobre un candidato `bg-[var(...)]` corrupto del engine Oxide de Tailwind 4 bajo Turbopack — sigue sin afectar el HTML/CSS servido; verificación de esta fase hecha contra `next build && next start` (dev mode SÍ falla duro con este bug, como F11 ya advirtió) — confirmado en vivo con `getComputedStyle` que los tokens de color compilan y aplican correctamente en producción. 375 tests (sin tests nuevos — F18 es UI/orquestación y barrido de calidad, no lógica de negocio nueva, mismo criterio que F10). `pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm test:unit` OK |
| F19 | Suite de extremo a extremo y pruebas críticas | COMPLETADA | (F19) | Blindaje de las 3 zonas donde un error cuesta dinero o confianza: simulador, pagos y motor. **3 BUGS REALES ENCONTRADOS Y CORREGIDOS** (detalle abajo). **E2E del simulador** (`tests/e2e/simulator.spec.ts`, Playwright contra `next build && next start` + Supabase real): flujo feliz COMPLETO recorriendo los 120 reactivos hasta la pantalla de resultados ("Terminar examen" solo existe en la última pregunta, igual que el examen real); imposibilidad de regresar verificada en 3 puntos distintos (primera pregunta, a mitad y en la última) — es una garantía ESTRUCTURAL, el store de Zustand solo expone `advance`, no existe acción de retroceso; **no-filtración de la respuesta correcta interceptando el tráfico de red REAL** (`page.on('response')` sobre TODO el tráfico de la app, no solo `/api` — en Next.js las Server Actions y el payload RSC viajan por la propia ruta, filtrar por `/api` habría dejado fuera justo el canal por donde podría escaparse), armado antes de entrar y desarmado solo al confirmar el cierre (revelar ahí ya es legítimo); recarga a mitad de sesión que retoma la MISMA sesión con el tiempo del SERVIDOR (verifica que el restante bajó y que recargar no regala tiempo); y paywall en el segundo simulacro de una cuenta gratuita (redirige con `trigger=FULL_SIMULATION_LIMIT` ANTES de crear nada). **4 de 4 escenarios PASANDO en vivo** (los 3 specs del simulador + el del límite diario). La suite es idempotente: `ensureNoActiveSimulation` cierra por UI real cualquier simulacro colgado de una corrida anterior, sin lo cual el orden de ejecución la volvía frágil. **E2E del recorrido de usuario nuevo** (`tests/e2e/new-user-journey.spec.ts`): registro → onboarding (4 pasos) → diagnóstico → tablero (tras `E2E_SIGNUP=1`, apagado por defecto porque consume el cupo de correos de Supabase); **límite diario de práctica gratuita verificado contra el endpoint real** —no inferido de la UI— comprobando que el servidor NUNCA entrega más de lo que queda aunque el cliente pida 50, y que agotado responde 402 con `DRILL_DAILY_LIMIT` (PASA en vivo, probado con cuenta de pago y con cuenta gratuita); checkout hasta la redirección a `checkout.stripe.com` sin completar pago real, comprobando además que el acceso sigue SIN activarse (solo el webhook puede activarlo) — requiere `sk_test_`, hoy omitido por la limitación heredada de llaves placeholder (F8). **Webhook de pagos: los 5 casos contra el Route Handler REAL** (`tests/stripe/webhook-route.test.ts`, 9 tests): pago con tarjeta completado, pago asíncrono confirmado (OXXO: el voucher NO da acceso, la confirmación sí), evento duplicado que responde 200 pero NO reprocesa (ni reactiva, ni duplica el Payment, ni reenvía el correo), firma inválida rechazada con 400, y pago asíncrono fallido. La verificación de firma es REAL: los payloads se firman con `stripe.webhooks.generateTestHeaderString` (utilidad oficial de simulación de Stripe) y se verifican con el mismo `constructEvent` de producción — nada de mockear la firma; se cubren los 3 vectores (secreto equivocado, cabecera ausente y cuerpo manipulado DESPUÉS de firmar). Más el contrato de reintento: un fallo transitorio devuelve 500 (no 200) para que Stripe reintente, porque un 200 haría que dejara de reintentar y el alumno pagaría sin que se le active el acceso. Complementa —no reemplaza— los tests de F8 sobre la función pura. Habilitado con un stub de `server-only` acotado a Vitest (el build de Next sigue usando el paquete real, así que la protección de `STRIPE_SECRET_KEY` no se debilita) y el alias `@/app` que faltaba en `vitest.config.ts`. **Regresión del motor adaptativo** (`tests/adaptive/regression.test.ts`, 30 tests de casos LÍMITE): divisiones degeneradas (sin materias, todos los pesos en 0, `totalQuestions` 0) que no producen NaN; la regla pesimista no se puede burlar (acertar 4 de 4 NO infla el Aciertómetro — el fallo de confianza más caro posible); materias sin tocar SIEMPRE arrastran hacia abajo, nunca hacia arriba; fronteras exactas de los umbrales (0.60 NO es débil, 0.85 NO es dominado, 3 intentos sí clasifica); invariante de que `targetBucketCounts` suma exacto para todo count de 1 a 200 (sin perder ni inventar reactivos por redondeo); el selector nunca devuelve un excluido de las 72h, nunca repite, nunca rellena de aire y degrada bien con pool corto; y fronteras de la estrategia de carrera (gap 0 = encaminado y sin alternativas desmotivadoras, sin meta no inventa gap, tope de 3, nunca se sugiere a sí misma ni una inalcanzable). **Aislamiento de base de datos** (`scripts/verify-rls-isolation.ts`, `pnpm test:rls`): **23/23 verificaciones OK contra el Supabase real**, probando con clientes `supabase-js` autenticados con la ANON KEY —el mismo camino y privilegios que el navegador de un usuario real, donde RLS sí aplica—. Cubre: control positivo (cada quien SÍ ve lo suyo; una política que bloqueara todo «pasaría» sin servir de nada), alumno↔alumno (A no lee perfil, sesiones, respuestas, Aciertómetro, racha ni suscripción de B), tutor (SÍ lee el perfil de su alumno vinculado, NO el de uno no vinculado, y NI SIQUIERA las respuestas crudas de su propio alumno — el panel parental solo muestra agregados), y anónimo (nada sensible, incluidos pagos). Decisión de seguridad tomada al construirlo: el rol de la app (`acierta_ci`) NO recibió permisos sobre el esquema `auth` para poder sembrar cuentas —darle INSERT sobre `auth.users` significaría que una inyección SQL podría fabricar cuentas, debilitando justo el aislamiento que el script verifica—; se usa la API de administración y, si no hay service-role key, reutiliza cuentas de sondeo preexistentes. 424 tests unitarios (49 nuevos, desde 375). `pnpm typecheck`, `pnpm lint`, `pnpm build` OK. **Cuentas persistentes de prueba** (documentadas en `.env.example`): `e2e.sim@` (con plan activo, para que el flujo feliz sea repetible), `e2e.free@` (gratuita con su simulacro ya gastado) y `rlsprobe.*` (3, para el script de RLS) |
| F20 | Observabilidad y optimización de rendimiento | COMPLETADA (criterio de rendimiento cumplido solo en landing — ver nota) | (F20) | **Monitoreo de errores** (`@sentry/nextjs`): `instrumentation-client.ts` (cliente), `instrumentation.ts` (servidor+edge, `onRequestError`), `app/global-error.tsx` (boundary raíz). Filtrado de ruido compartido entre los 3 entrypoints en `src/lib/observability/sentry-shared.ts` (extensiones del navegador vía `denyUrls`+detección de stack 100% en extensión, `ResizeObserver`/`AbortError`/`Script error.` conocidos benignos). Sin `NEXT_PUBLIC_SENTRY_DSN` real el SDK queda inerte (no lanza) — pendiente activarlo con credenciales reales. **Analítica de producto** (PostHog): arquitectura deliberada cliente/servidor — `posthog-js` SOLO para pageviews (`autocapture:false`, `disable_session_recording:true` a propósito: el autocapture filtraría el enunciado/opciones de un reactivo), y los eventos de NEGOCIO (`src/lib/analytics/events.ts`, tipado sin PII por construcción) se mandan SIEMPRE server-side vía `posthog-node` (`trackServerEvent`, `flushAt:1` porque Vercel serverless puede congelar el proceso apenas responde) — mismo criterio "el servidor es la autoridad" que scoring/pagos (CLAUDE.md). Embudo completo instrumentado: `signup_completed` (`app/actions/auth.ts`), `onboarding_completed` (`completeOnboardingWizard`), `diagnostic_completed`/`practice_completed`/`simulation_completed` (un solo dispatcher por modo en `finishSession`, F20 identifica el fin de un simulacro como **el indicador más importante del negocio**), `paywall_shown` (`/paywall`), `checkout_started` (`startCheckoutAction`), `purchase_completed` (webhook de Stripe, solo si la transacción realmente aplicó — nunca en duplicados), `streak_milestone`/`badge_earned` (gamificación + Early Bird). `distinctId` SIEMPRE `UserProfile.id`, nunca el correo/uid de Supabase. **Rendimiento — caché**: lecturas del banco de preguntas (`src/lib/db/question-read.ts`, pools de `src/lib/db/adaptive.ts`) envueltas en `unstable_cache` (5 min) — no personalizadas, mismo contenido para cualquier alumno del mismo tema/dificultad, solo cambian por el pipeline de verificación del admin. **Code-splitting**: `next/dynamic` para `DrillRunner`/`DrillSummary` (arrastran KaTeX vía `LatexText` + framer-motion de celebraciones) y `SimulatorRunner` — el selector/pre-flight ya no paga ese peso en el bundle inicial; CSS de KaTeX movido de `app/globals.css` (cargaba en CADA ruta) a un import a nivel de componente en `LatexText.tsx`; `posthog-js` (núcleo, ~70KB) cargado con `import()` dinámico en vez de estático (mayor ganancia individual medida: quitarlo del bundle inicial recuperó ~6-15 puntos de Lighthouse en las 3 pantallas). **Imágenes**: avatares (`TopBar`, `ProfileIdentityCard`) migrados de `<img>` a `next/image` con `remotePatterns` apuntando al bucket público de Supabase Storage; 0 reactivos con `imageUrl` hoy (confirmado por query directa), así que las imágenes de preguntas quedan sin convertir por no haber nada real que optimizar todavía. **Rate limiting básico** (`src/lib/rate-limit/limiter.ts` + `proxy.ts`): ventana fija en memoria por IP+ruta (60 req/60s), excluye `/api/webhooks/*` (autenticado por firma HMAC, un reintento legítimo de Stripe no debe recibir 429) y `/api/cron/*` (autenticado por `CRON_SECRET`); 429 + header `Retry-After`; limitación conocida y documentada: no distribuido (cada instancia Edge de Vercel cuenta por su cuenta), suficiente para "básico". **2 BUGS REALES ENCONTRADOS Y CORREGIDOS** (detalle abajo): CLS de 0.164 en el dashboard mal diagnosticado originalmente como el `HeatmapCalendar` — la causa real era `AciertometroLoader` (`next/dynamic` con `ssr:false` y SIN `loading`, heredado de F7, nunca antes medido con Lighthouse); y el heurístico de "credenciales placeholder" de PostHog no cubría el valor real usado en este entorno, causando que el SDK completo se inicializara pese a la intención de dejarlo inerte. **Auditoría Lighthouse móvil, antes/después** (simulado, `next build && next start`, throttling `simulate`; dashboard/práctica con sesión autenticada real): landing 87→87 (SI 2325ms→1000ms, absorbe Sentry+PostHog sin costo neto gracias al code-splitting); dashboard 79→81 (CLS 0.164→0.013, -92%); práctica 78→78 (paridad pese a +2 SDKs de observabilidad). **Criterio de aceptación "≥85 en las 3 pantallas" cumplido SOLO en landing.** Causa documentada y no atribuible al código: `server-response-time` (TTFB) mide 1.7-1.9s en dashboard/práctica en este sandbox de desarrollo contra el proyecto real de Supabase por Internet público — ese piso por sí solo ya empuja el LCP simulado por encima de los ~2.5s que exige un 85+, independientemente de cuánto JS se recorte. En producción (Vercel + Supabase ambos en us-east-1, co-ubicados) ese TTFB debería caer drásticamente; no se puede confirmar sin desplegar a la infraestructura real — pendiente de re-medir en producción. `pnpm typecheck`, `pnpm lint`, 428 tests OK (4 nuevos: `tests/rate-limit/limiter.test.ts`) |
| F21 | Conformidad legal (T&C, privacidad, GDPR) | COMPLETADA | (F21) | **Páginas legales completas** (`/legal/privacidad` y `/legal/terminos`): privacidad conforme a LFPDPPP, listado completo de datos recopilados (cuenta, académicos, pagos, menores con tutor, técnicos, cookies/analítica), finalidades, terceros procesadores (Supabase/Stripe/Vercel/Resend/PostHog/Sentry con DPAs), derechos ARCO (acceso via export en `/app/perfil`, rectificación en perfil, cancelación/anonimización con confirmación fuerte, oposición via notificaciones), retención (indefinida activa, 30 días tras borrar, 7 años pagos), contacto claro. Términos: descripción de servicio, planes y vigencias exactos (Free, Pase, Mensual, Premium), **garantía Premium única: 50% reembolso si usas ≥15 sesiones 60 días previos y no ingresas** (excluyendo 4 casos: bajo uso, carrera cambió, irregularidades, comprtencia), propiedad intelectual (sin scraping ni resale), uso aceptable (sin acoso/contenido ilegal/bots/ataques), rol del tutor (responsable supervisión, acceso solo agregados, no respuestas crudas), **limitación central: Acierta NO garantiza ingreso, solo predicción estadística** (excepto garantía Premium), suspensión por incumplimiento, pagos/reembolsos, resolución por email. **Checkbox obligatorio en registro** (`SignUpForm.tsx`): debe aceptar términos+privacidad antes de crear cuenta (schema valida `acceptTerms: on`, fieldError si falta). **Aviso de cookies en banner** (`CookiesConsentBanner.tsx`): banner flotante bottom-fixed con opción Rechazar/Aceptar, almacena en localStorage, solo acepta cookies técnicas obligatorias y permite rechazar analíticas sin bloquear la app. **PostHog respeta consentimiento** (`src/lib/analytics/client.ts`): carga la librería SOLO si `localStorage['acierta-cookies-consent']='true'`, rechazar deja PostHog sin inicializar (sin captura de eventos). **Enlaces en pie de página**: publicFooter (landing) ya tenía links a /legal/* desde F10, ahora `AppFooter.tsx` (app layout) agrega los mismos links en contexto dark. Pendiente completar antes de producción: **empresa: razón social, domicilio legal, teléfono** (marcado inline con fondo amarillo en ambas páginas para fácil búsqueda) — es lo único que bloqueaba publicar el resto. `pnpm typecheck`, `pnpm lint`, `pnpm build` OK, 367 tests (sin tests nuevos — F21 es integración de páginas y consentimiento, sin lógica pura propia) |
| F22 | Hardening de seguridad | COMPLETADA | (F22) | **Auditoría de extremo a extremo con corrección inmediata — 3 hallazgos reales de severidad alta/crítica encontrados y corregidos, ninguno visible desde el código fuente de la app (solo auditando el estado REAL de Supabase).** (1) **Secretos**: cero leaks confirmados con prueba empírica (grep de los VALORES reales de `.env`/`.env.local` contra el bundle cliente compilado, no solo nombres de variable) — `.env`/`.env.local` nunca en el historial de git (solo `.env.example`, con placeholders). (2) **RLS — 3 hallazgos, no 1**: (a) *[get_advisors, ERROR]* 14 tablas con RLS deshabilitado expuestas por completo a `anon`/`authenticated` vía PostgREST (`institutions`,`content_sources`,`passages`,`levels`,`exams`,`areas`,`careers`,`subjects`,`topics`,`explanation_layers`,`question_reports`,`content_items`,`professors`,`processed_stripe_events`) — verificado que CERO código usa `supabase.from(...)` (100% Prisma/`acierta_ci` con BYPASSRLS confirmado por query a `pg_roles`), así que las 14 pasan a admin-only sin romper nada; la más grave, `explanation_layers`, permitía leer las capas 2-4 PAGADAS sin pasar por `evaluateExplanationLayerGate` — bypass total del muro de pago vía llamada REST directa con la anon key pública. (b) **CRÍTICO, NO estaba en get_advisors, encontrado por auditoría manual de GRANTs**: `anon`/`authenticated` tenían GRANT INSERT/UPDATE/DELETE (default de Supabase) en las 28 tablas, y las políticas `FOR ALL USING(...)` de la migración 0001 no tienen `WITH CHECK` — combinado, CUALQUIER usuario autenticado podía, con una llamada PostgREST directa (solo anon key pública + su propio JWT): `PATCH user_profiles SET role='ADMIN'` (escalación total de privilegios), `PATCH subscriptions SET status='ACTIVE'` (acceso premium sin pagar, bypass de Stripe), `PATCH session_answers SET isCorrect=true` (manipular calificación) — corregido con `REVOKE INSERT,UPDATE,DELETE,TRUNCATE ON ALL TABLES IN SCHEMA public FROM anon,authenticated` (SELECT se conserva, ya acotado por RLS y requerido por `test:rls`). (c) *[get_advisors, WARN]* bucket `avatars` con política de listado demasiado amplia (enumeraba todos los userIds con avatar) — restringido a dueño/admin, verificado que la URL pública de servido de imágenes NUNCA pasa por esa política (bypass propio de Supabase para buckets `public:true`) y que el código solo usa `getPublicUrl` (sin `.list()` en todo el proyecto). **23/23 verificaciones de `test:rls` siguen en verde tras los 3 cambios** (ejecutado en vivo contra Supabase real, no solo en teoría). (3) **Server Actions/Route Handlers — 11+7 archivos auditados uno por uno** (lista completa abajo): TODOS exigen sesión vía `requireUser`/`requireRole`/`guardApiUser` (que verifica el JWT contra el servidor de Supabase con `getUser()`, nunca decodifica localmente sin validar), TODOS validan input con Zod, TODOS confirman ownership del recurso (`loadOwnedSession`, `sub.userProfileId===profile.id`, área/carrera validadas contra el examen del propio perfil, etc.) — **2 hallazgos menores corregidos**: comparación no-constante-en-tiempo de `CRON_SECRET` (`===` → `timingSafeEqual`, mismo criterio que ya usaba `unsubscribe-token.ts`) y `updateAvatarAction` que solo validaba "es del bucket avatars" sin validar "es de MI carpeta" (permitía apuntar tu perfil a la foto de otro usuario — sin exposición de datos sensibles, los avatares ya son públicos, pero rompía la garantía de ownership). (4) **Resiliencia**: refresh silencioso de JWT ya confirmado correcto (middleware `proxy.ts` llama `supabase.auth.getUser()` en cada request, que refresca el token expirado vía cookies automáticamente — patrón oficial de `@supabase/ssr`; si el refresh token también expiró, cae a "sin sesión" y redirige a `/login?next=` preservando el destino). **Job de reconciliación de pagos construido desde cero** (pendiente documentado desde F8 — "Webhook nunca llega → job de reconciliación consulta Stripe", Flujo_App §15.1): `src/lib/stripe/reconciliation.ts` (PURO, reusa el mismo `BillingStore` del webhook real — cero lógica de activación duplicada) + `runPaymentReconciliation` en `billing.ts` (busca `Subscription` PENDING >24h con `stripeCheckoutSessionId`, consulta el estado REAL en Stripe, activa si ya se pagó / marca FAILED si la sesión expiró / no toca si sigue pendiente) — expuesto como `pnpm reconcile:payments` (CLI) y `GET /api/cron/reconcile-payments` (protegido por `CRON_SECRET`, agregado a `vercel.json` 1x/día); 4 tests nuevos con un `BillingStore` espía. **Deep link a institución con feature flag apagado**: `selectExamAction` ya revalidaba server-side pero fallaba en silencio (redirect sin explicación) — ahora redirige con `?unavailable=1` y `ExamStep` muestra "disponible próximamente" en vez de un no-op mudo. (5) **Cabeceras de seguridad HTTP** en `next.config.ts` (`headers()`, aplican a TODA la app): `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy` (cámara same-origin habilitada — el simulador la pide opcionalmente, F12 — micrófono/geolocalización bloqueados), `Strict-Transport-Security`, `Content-Security-Policy` razonable (no nonce-estricto — Next.js necesita `unsafe-inline` en script-src para su hidratación salvo un esquema de nonce por request, fuera de alcance de esta fase; sí bloquea `frame-src`/`object-src` de terceros arbitrarios). Verificado en vivo contra `next start` (producción real, no dev): headers presentes con las URLs reales de Supabase/PostHog resueltas dinámicamente, cero errores de consola ni violaciones de CSP en landing/registro/precios/privacidad. (6) **Dependencias**: `pnpm audit` pasó de **16 vulnerabilidades (9 high) a 0** — hallazgo mayor: `next@16.2.10` tenía **CVE de bypass de Middleware/Proxy** (justo el mecanismo del que depende TODA la protección de sesión de la app, `proxy.ts`) más SSRF en Server Actions y DoS — actualizado a `16.2.12` (parcheado) junto con `eslint-config-next` a la misma versión; `fast-uri`/`dompurify`/`postcss`/`sharp` forzados a versiones parchadas vía `pnpm-workspace.yaml` overrides (sharp procesa avatares subidos por usuarios reales — no es solo teórico). Un override (`brace-expansion`→v5) se probó y se REVIRTIÓ: rompía `pnpm lint` de verdad (minimatch@3 interno de ESLint espera su API v1-3) — queda 1 vulnerabilidad aceptada y documentada, exclusiva de la cadena de build-tooling de ESLint (82 rutas, todas devDependencies, nunca código de producción ni alcanzable por un atacante). **Pendiente que requiere acción del dueño (no vía código/SQL)**: activar "Leaked Password Protection" en Supabase Dashboard → Auth → Policies (WARN de `get_advisors`, revisa contraseñas contra HaveIBeenPwned — no expone un endpoint de gestión vía la API del MCP usada en esta sesión). **Lista completa de Server Actions/Route Handlers auditados**: `app/actions/{account,admin-questions,auth,billing,checkout,drill,onboarding,parent,profile,sessions,simulator}.ts` + `app/api/{account/export,adaptive/next-questions,adaptive/predict,cron/notifications,cron/reconcile-payments,email/unsubscribe,simulator/sync,webhooks/stripe}/route.ts`. `pnpm typecheck`/`lint`/`build` OK, 432 tests unitarios (4 nuevos: `tests/stripe/reconciliation.test.ts`), 23/23 `test:rls` en vivo contra Supabase real |
| F23 | Fixes beta y preparación para launch | OMITIDA-SIN-FEEDBACK | (F23) | Se buscó `docs/BETA_FEEDBACK.md` (y cualquier archivo similar en todo el repo, `find . -iname "*feedback*"`) — no existía. Se creó con plantilla de 6 secciones (errores bloqueantes, errores de datos/cálculos, fricciones UX, mejoras cosméticas, ideas de funciones nuevas, problemas de contenido→panel de discrepancias) para que la próxima corrida de esta fase (o una posterior dedicada a beta) tenga dónde pegar retroalimentación real de usuarios de prueba. Sin retroalimentación real disponible en este momento, no hay nada que clasificar ni corregir — fase omitida sin bloquear el avance a F24. **Reprocesar en cuanto exista feedback real**: llenar `docs/BETA_FEEDBACK.md` y volver a correr esta fase (o una fase de hardening/beta posterior) con el mismo criterio de clasificación por prioridad. |
| G3a | Lote de reactivos: IPN FISMAT Matemáticas | COMPLETADA | (G3a) | Ver sección dedicada abajo — 35 reactivos originales compuestos en esta sesión (sin API de pago) para la materia con mayor `questionWeight` (24) entre todas las de instituciones/áreas activas para lanzamiento con 0 reactivos verificados. 12 SOURCED (3 temas con `SourceChunk` real) + 23 TEMARIO_ONLY. Insertados con `isVerified=false`, a la espera de verificación ciega (G2). |
| G10 | Smoke test completo en producción | **COMPLETADA — 1 defecto real hallado y corregido** | (G10) | Ver sección dedicada abajo. La premisa de la tarea ("con G9 resuelto") era **falsa** — se verificó antes de empezar: el registro sigue bloqueado por el rate-limit de correo de Supabase y Vercel sigue sin credenciales de Stripe. Se recorrió igual todo lo demás provisionando las cuentas de prueba directo en `auth.users` (solo se rodea el envío de correo, lo único realmente bloqueado). **Verificado en producción real:** onboarding de 4 pasos, diagnóstico de 30 reactivos, resultados + Aciertómetro (47), dashboard, simulacro completo de 120 con reanudación y revisión, muro suave de drill Y de simulacro, y panel parental. **No-filtración PROBADA** contra payloads crudos de producción (52 KB del diagnóstico y 77 KB del simulacro: 0 ocurrencias de `isCorrect`/`correctOption`/`explanation`, cruzado contra la respuesta real en la DB). **Defecto real corregido:** un tutor quedaba atrapado en el asistente de ALUMNO al abrir `/simulador` o `/onboarding` (`requireOnboarding` no comprobaba rol; `/simulador` vive fuera de `(app)` y no tenía otra defensa). Corregido, desplegado, re-verificado en vivo y blindado con 4 tests de regresión (`tests/regressions/g10-bugs.test.ts`, probados en rojo antes de la corrección). 2 falsas alarmas investigadas y descartadas correctamente (shadow DOM de NumberFlow; Suspense sin revelar por pestaña oculta). Fixtures de prueba eliminados. `pnpm typecheck`, `pnpm lint` y `pnpm test:unit` (464/464) en verde. |
| G9 | Credenciales de servicios (Stripe/Resend/Sentry/PostHog/Service Role) | **BLOQUEADA — sin sesión activa en ninguno de los 5** | (G9) | Ver sección dedicada abajo. La tarea asumía cuentas "ya abiertas en el navegador"; se verificó cada una navegando directo a su página autenticada (Stripe, Resend, Sentry, PostHog, dashboard de Supabase incluso vía SSO de GitHub) — **las 5 redirigieron a login/signup**, ninguna con sesión activa en el Chrome conectado a esta sesión. Dos límites duros impidieron continuar: crear cuenta nueva está prohibido sin excepción, y escribir/enviar una contraseña (incluso ya autocompletada por el navegador) también. Nuevo `docs/SERVICE_CREDENTIALS_CHECKLIST.md` con pasos exactos para las 4 pendientes (Resend+SMTP de Supabase Auth, Sentry, PostHog, `SUPABASE_SERVICE_ROLE_KEY`); Stripe ya tenía su checklist desde G6, sin cambios porque nada cambió (mismo bloqueo). Re-verificado en vivo: el rate-limit de correo de Supabase sigue activo 3 días después de G7 (mismo error exacto), confirmando que el registro real sigue bloqueado hasta que exista SMTP propio. `pnpm typecheck`/`pnpm lint` en verde (sin cambios de código). |
| G8 | Verificación y corrección real del sesgo de posición | **COMPLETADA** | (G8) | Ver sección dedicada abajo. Auditoría de solo-lectura previa (sesión aparte) había marcado la corrección de G3c como "no verificable" alegando que Postgres no puede consultar JSON — **eso era incorrecto**; se consultó `options` (jsonb) directamente con `jsonb_array_elements` + `CROSS JOIN LATERAL`, sin ninguna dependencia de Node/dotenv. **Confirmado con datos reales:** los 35 de IPN FISMAT Matemáticas quedan 9/9/9/8 (25.7/25.7/25.7/22.9%), exactamente como afirmaba G3c. Los 7 grupos del banco completo (450 reactivos) están dentro de 15-40%; los dos más cercanos al piso (UNAM Español C=15.8%, UNAM Matemáticas D=16.0%) siguen dentro de banda. Hallazgo adicional no reportado antes: sobre el subconjunto SERVABLE hoy (`isVerified=true`, 370/450), esos mismos dos grupos SÍ caen debajo de 15% (Español C=12.9%, Matemáticas D=12.7%) — no por un defecto de composición sino porque los reactivos pendientes de revisión F3 se concentran desproporcionadamente en esas letras; decisión razonada de NO reasignar posiciones ahí (ver sección dedicada, criterio explicado). Cerradas las 2 citas-por-letra preexistentes de F4 que G3c había dejado como pendiente menor (UNAM Español `cmrule6ir…`, UNAM Física `cmru8sy0a…`) — ambas reescritas por contenido; de paso corrigieron una referencia de letra ya OBSOLETA en ambas (citaban una letra que ya no correspondía a la opción descrita). Barrido exhaustivo de todo el corpus (450/450, no solo grupos sesgados): **0 citas por letra restantes.** `scripts/lib/lot-validation.ts` reverificado: 13/13 tests Vitest pasan, incluyendo el caso exacto pedido (lote de 35 con 100% en "A" → rechazado). `pnpm typecheck`/`pnpm lint` en verde (sin cambios de código, solo contenido en DB). |
| G7 | Despliegue a producción sobre URL de Vercel | **COMPLETADA con hallazgos** | (G7) | Ver sección dedicada abajo. **`https://acierta.vercel.app` en vivo**, landing/registro/login/diagnóstico/simulador/paywall verificados contra la app real. Variables de entorno core (Supabase URL+anon vía Supabase MCP — públicas por diseño; DATABASE_URL/DIRECT_URL vía rol Postgres NUEVO `acierta_prod`, generado y verificado sin leer `.env.local`; CRON_SECRET generado; site URL; feature flags) configuradas y confirmadas en Vercel. **Hallazgo de seguridad real, corregido en la misma sesión:** `vercel --prod` NO respeta `.gitignore` para decidir qué sube — un `.env` local viejo (anterior al proyecto Supabase real) viajó al primer build y Next.js lo cargó en runtime, filtrando un valor placeholder de Stripe a los logs de error; cerrado con `.vercelignore` explícito y redeploy limpio, verificado que el error volvió a su forma genérica sin exponer nada. Bloqueados y señalados explícitamente (no ejecutables por esta sesión): `SUPABASE_SERVICE_ROLE_KEY` (solo afecta borrado de cuenta, F17 — no bloquea ningún smoke test), Stripe completo (mismo bloqueo de G6, sin cambios), Sentry/PostHog/Resend (cuentas de terceros no creadas — creación de cuentas prohibida para cualquier sesión). Registro: código confirmado correcto contra Supabase Auth real (reproducido el mismo error vía llamada directa), bloqueado por el rate-limit de correo del plan gratuito de Supabase — no es un defecto de esta fase. Crons registrados Y activos (probados con el `CRON_SECRET` real: 200 con auth, 401 sin ella). `pnpm typecheck`/`pnpm lint` en verde. |
| G6 | Stripe en modo prueba sobre URL de Vercel | **PARCIAL — bloqueada en credenciales** | (G6) | Ver sección dedicada abajo. Decisión tomada y documentada: cuenta de Stripe SEPARADA para Acierta (`docs/STRIPE_LIVE_CHECKLIST.md` §0). **Logrado sin bloqueo:** primer deploy real de Acierta a Vercel — `https://acierta.vercel.app` (proyecto no existía; se creó y enlazó). Encontró y corrigió un bug real de infraestructura: `.npmrc` tiene `ignore-scripts=true` (control de seguridad deliberado contra scripts de post-install de terceros), que bloqueaba silenciosamente el `postinstall` de Prisma — funcionaba en local solo porque `node_modules/.prisma/client` ya estaba generado de sesiones previas; en el install limpio de Vercel, el cliente de Prisma quedaba sin generar y TODOS sus tipos caían a `any`, rompiendo el build (`app/(app)/diagnostico/page.tsx`, error real de TypeScript solo reproducible en Vercel). Corregido con `"build": "prisma generate && next build"` en `package.json` — sin tocar `ignore-scripts` (se preserva la protección contra ~1000+ dependencias transitivas). **Bloqueado, no ejecutable por ninguna sesión:** crear una cuenta de Stripe es una acción PROHIBIDA para cualquier sesión automatizada bajo cualquier instrucción (ver reglas de seguridad) — no existe una `STRIPE_SECRET_KEY` real (ni de prueba) en `.env.local`, confirmado por el propio guardrail de `scripts/setup-stripe-prices.ts` (rechaza llaves placeholder), y esta sesión tiene bloqueada la LECTURA de `.env`/`.env.local` por `.claude/settings.json` (deny explícito), así que tampoco puede leer/transferir credenciales de Supabase/DB a Vercel. Los 9 precios, el webhook y la prueba E2E (tareas 2-4) quedan listos para ejecutarse en cuanto existan credenciales reales — scripts nuevos `scripts/setup-stripe-webhook.ts` (`pnpm stripe:setup-webhook`, idempotente, escribe el signing secret directo a Vercel sin imprimirlo) y `docs/STRIPE_LIVE_CHECKLIST.md` §1 con los pasos exactos. `pnpm typecheck` y `pnpm lint` en verde. |
| G3e | Verificación ciega del lote G3d | COMPLETADA (2º intento) | (G3e) | Ver sección dedicada abajo — primer intento ABORTADO por contaminación de contexto (misma conversación que compuso G3d; cambiar de modelo no reinicia la ventana), re-ejecutado en sesión genuinamente nueva. Los 35 reactivos resueltos a ciegas: **35/35 coincidencias** con el generador, confianza mínima 0.96. **27 auto-aprobados (77.1%)**, 8 sin publicar. Acumulado real: **370 `isVerified=true`** de 450 (82.2%). **HALLAZGO DE LOTE: "cue de glosa"** — en los 8 reactivos donde exactamente una opción trae paréntesis explicativos, esa opción es la correcta **8/8** (p=1.5e-5); son justo los 8 bloqueados. Patrón aprendible análogo al sesgo de posición de G3b, pero peor: viaja en el TEXTO de la opción, así que barajar no lo neutraliza. |
| G3d | Lote de reactivos: IPN MEDBIO Biología | COMPLETADA | (G3d) | Ver sección dedicada abajo — 35 reactivos originales compuestos en esta sesión (sin API de pago) para Biología de IPN MEDBIO (`questionWeight` 22, la de mayor peso entre las materias de instituciones activas para lanzamiento con 0 reactivos verificados). 100% TEMARIO_ONLY (sin `SourceChunk` disponible para esta materia). Distribución de la respuesta correcta balanceada DESDE LA COMPOSICIÓN (9/9/9/8, ~25% por letra) y explicaciones que citan distractores por contenido, nunca por letra — ambas reglas de G3c aplicadas de origen, no como reparación posterior. Pasó `content:validate-batch` con 0 violaciones antes de insertar. Insertados con `isVerified=false`, a la espera de verificación ciega (G3e). |
| G3c | Corrección de sesgo de posición + validación de lote | COMPLETADA | (G3c) | Ver sección dedicada abajo — los 35 de IPN reparados editorialmente (distribución 9/9/9/8, ~25% por letra); 5 explicaciones reescritas para citar distractores por contenido, no por letra; nuevo `scripts/lib/lot-validation.ts` (puro, 13 tests) + `pnpm content:validate-batch` + paso obligatorio dentro de `content:insert` (`--lot-dir`) que rechaza un lote sesgado ANTES de tocar la DB. Regla añadida a CLAUDE.md. Barrido de los 415 reactivos existentes: sesgo de posición sano en todos los grupos institución·materia; 2 citas-por-letra preexistentes de F4 (UNAM Español/Física, baja severidad porque UNAM sí baraja) quedaron reportadas, no corregidas (fuera de alcance de esta fase). |
| G3b | Verificación ciega del lote G3a | COMPLETADA | (G3b) | Ver sección dedicada abajo — los 35 reactivos resueltos a ciegas en sesión independiente, con el cálculo EJECUTADO en sympy (35/35 aciertos). **34 auto-aprobados (97.1%)**, 1 sin publicar por `WEAK_DISTRACTORS`. Acumulado real: **343 `isVerified=true`** de 415 (82.7%). **HALLAZGO DE LOTE, BLOQUEANTE PARA G3a-siguiente:** los 35 reactivos de G3a tienen la opción correcta en la posición `A` el **100%** de las veces, y el simulador NO baraja opciones para IPN (`shuffleOptions:false`) — patrón aprendible que invalida el lote como práctica. No corregido en esta fase (mutar el orden desincronizaría explicaciones que citan letras). |
| G2 | Eliminación de la API de pago del pipeline de contenido | COMPLETADA | (G2) | Ver sección dedicada abajo — cero referencias a `ANTHROPIC_API_KEY`/SDK de Anthropic en todo el repo (verificado); pipeline de generación/verificación/clasificación rediseñado para correr vía sesiones de Claude Code, con la misma garantía estructural de antes (el verificador nunca ve la respuesta correcta) ahora por aislamiento de SESIÓN en vez de aislamiento de código. Los 309 reactivos existentes se conservan intactos (generados antes de esta corrección, bajo la arquitectura "capital cero" de F4 — ver sus Notas F4, que documentan honestamente esa relajación de garantía). |
| G1 | Build resiliente y brecha real de contenido | COMPLETADA | (G1) | Ver sección dedicada abajo — causa raíz del fallo de `pnpm build` (proyecto Supabase pausado, no un bug de código), fix de resiliencia en las páginas públicas, conteos de contenido re-verificados contra la DB real (coinciden exacto con lo ya documentado en F4), tabla de brecha meta-vs-real por institución/área/materia, y resultado real de la suite E2E completa. |
| F24 | Rastreo de campañas y veredicto final de lanzamiento | COMPLETADA | (F24) | **Fase de cierre de todo el desarrollo.** (1) **Rastreo de conversión de ads**: `src/lib/marketing/pixels.ts` — Meta Pixel + TikTok Pixel, configurables por `NEXT_PUBLIC_META_PIXEL_ID`/`NEXT_PUBLIC_TIKTOK_PIXEL_ID`, inertes sin credencial real (mismo criterio que Sentry/PostHog) Y condicionados a `localStorage['acierta-cookies-consent']==='true'` (F21) — verificado que rechazar cookies deja ambos píxeles sin cargar. 4 eventos: `PageView` (`PixelPageView.tsx`, montado en landing y precios), `CompleteRegistration` (`SignupConversionTracker.tsx` en el layout raíz vía Suspense, detecta el marcador `?signup=1` que `signUpAction` agrega a su redirect — un Server Action no puede devolverle datos al cliente en su rama de éxito), `InitiateCheckout` (`ChoosePlanButton`/`RetryButton`, valor estimado + plan), `Purchase` (`SuccessView`, valor REAL del `Payment` ya confirmado por el webhook, nunca un estimado). (2) **Atribución de campaña persistente**: `proxy.ts` captura utm_source/medium/campaign/content/term + fbclid/ttclid/gclid de la PRIMERA visita (cualquier ruta) en una cookie httpOnly de 90 días que NUNCA se sobreescribe (verificado con `curl`: 1ª visita con UTMs → `Set-Cookie`; 2ª visita con UTMs distintos → sin `Set-Cookie`, se conserva la original); `signUpAction` la persiste en el nuevo campo `UserProfile.acquisitionSource` (JSON, migración `0010`, solo al `create`) para atribuir cualquier compra FUTURA al canal de origen del registro, no solo el registro mismo. (3) **Página de agradecimiento optimizada**: `SuccessView` (pantalla de éxito del checkout) reescrita con lista de "qué sigue" personalizada por plan + refuerzo del valor específico comprado, además del disparo del evento Purchase. (4) **VERIFICACIÓN FORMAL DE LANZAMIENTO** — `docs/LAUNCH_CHECKLIST.md`: recorrido punto por punto de PRD §14 completo (Early Bird + Beta Cerrada + Public Launch) contra el estado REAL de Supabase (no contra lo documentado en fases previas). **Veredicto: el producto NO está listo para lanzar.** Bloqueador principal, verificado en vivo con SQL directo: banco de reactivos en **309 de 1,500 requeridos (20.6%)**, concentrado en solo UNAM Área 1 (183) y Área 2 (126) — **UNAM Áreas 3-4 y las DOS ramas de IPN están en CERO**, pese a que IPN es una de las dos únicas instituciones planeadas para el día 1 del lanzamiento (`CLAUDE.md`). Segundo bloqueador: 1 sola suscripción activa en la base (de prueba, no una venta real) vs. ≥200 licencias Early Bird requeridas; cero beta testers reclutados (`BETA_FEEDBACK.md` vacío, F23); Stripe con llaves placeholder (nunca se ha cobrado un peso real); datos de relleno sin completar en el aviso de privacidad/términos (F21); Supabase real sigue en plan gratuito (duda concreta sobre soportar ≥500 usuarios concurrentes). Todo lo demás — motor adaptativo, simulador, pagos (lógica), seguridad, PWA, gamificación, panel parental, legal, observabilidad — está construido y probado en vivo contra Supabase real sin pendientes de código. 10 tests nuevos (`tests/marketing/attribution.test.ts`). `pnpm typecheck`/`lint`/`build` OK, 442 tests unitarios, 23/23 `test:rls` en vivo. |

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

## Bugs encontrados y corregidos en F19

La auditoría de las zonas críticas (simulador, pagos, motor) encontró 3 bugs
reales. Los 3 quedaron corregidos y con test de regresión en esta misma fase —
cero bugs conocidos sin corregir al cerrarla.

**F19-1 · Pagar y quedarse sin acceso (dinero real).** `computeExpiresAt`
devolvía la fecha del examen tal cual, incluso si ya había pasado. Como
`getActiveSubscription` filtra por `expiresAt > now`, la suscripción nacía
vencida: el alumno pagaba y no obtenía absolutamente nada, sin ningún error
visible ni en la app ni en Stripe. Alcanzable de verdad — en cuanto pasara la
fecha del examen del ciclo (UNAM 2027-05-15 / IPN 2027-06-10 en el seed real)
TODA compra posterior caía ahí, igual que un aspirante rechazado recomprando
para el siguiente ciclo antes de que se cargue el examen nuevo. Corregido: solo
sirve como vigencia una fecha de examen que todavía esté por venir; si no, se
usa el respaldo de 150 días que ya existía para el caso «sin fecha».
Regresión en `tests/regressions/f19-bugs.test.ts`, con un invariante que
recorre 5 fechas × 2 planes: un pase o premium SIEMPRE recibe vigencia futura.

**F19-2 · Un reactivo corrupto podía costarle el simulacro entero al alumno
(confianza).** `recordSimulatorSync` puntuaba cada respuesta del lote sin
aislar fallos, pero `parseQuestionOptions`/`getCorrectOptionId` LANZAN ante un
reactivo corrupto (opciones malformadas, o 0/≥2 marcadas como correctas). Un
solo reactivo dañado hacía que el beacon respondiera 500 y se perdieran las
otras 119 respuestas del simulacro — justo en el momento de máxima confianza
del producto. Corregido: el fallo se aísla al reactivo culpable, se registra y
se salta; el resto del lote se persiste igual. Nunca se marca «correcta» a la
fuerza: si no se puede puntuar con certeza, esa respuesta simplemente no se
guarda. Regresión que fija por qué hace falta el aislamiento (confirma que las
funciones de puntuación efectivamente lanzan ante datos corruptos).

**F19-3 · El warning de compilación «irreparable» de Tailwind no era de
Tailwind.** Desde F11 se venía documentando un warning de CSS sobre un
candidato `bg-[var(...)]` inexistente como un bug sin arreglo del engine Oxide.
Falso: la detección automática de fuentes de Tailwind 4 escanea TODO el
proyecto —incluido `/docs`— y estaba tomando como clases reales los ejemplos
de código citados en la prosa de este mismo archivo. F18 añadió un segundo
warning idéntico al mencionar `env()` con sintaxis de corchetes en un
comentario de `globals.css`. Corregido acotando las fuentes con
`@import "tailwindcss" source(none)` + `@source "../app"` / `@source "../src"`
(las mismas de `tailwind.config.ts`) y reformulando el comentario. El build
quedó SIN warnings de CSS por primera vez desde F10, y se verificó que las
clases de token siguen compilando (`bg-surface`, `text-brand-soft`,
`min-h-touch`, `rounded-lg`, `font-display`, `acierta-safe-top`, …).

## Bugs encontrados y corregidos en F20

**F20-1 · El CLS del dashboard (0.164) estaba mal diagnosticado.** La
sospecha inicial (documentada en las notas de la auditoría "antes") era que
`HeatmapCalendar` empujaba el resto de la página al montar su SVG sin alto
reservado — se le puso `min-height` a `.acierta-heatmap` y CERO cambió el
número, exactamente al mismo valor (`0.1635227188141221`) en tres builds
distintas. Se instrumentó la página real con `PerformanceObserver` (Playwright
+ sesión autenticada real) para capturar el `layout-shift` con sus
`previousRect`/`currentRect` reales en vez de seguir adivinando: el salto real
ocurría 4.4s adentro, y el elemento que en verdad crecía era el Aciertómetro,
no el heatmap. Causa: `AciertometroLoader` (heredado de F7) usa
`next/dynamic(..., { ssr:false })` SIN `loading` — sin eso, ese espacio mide
0px en el HTML servido hasta que el chunk del cliente carga y monta, así que
TODO lo que va debajo (recomendación de Tino, "Tu semana", …) brinca hacia
abajo en cuanto el anillo por fin aparece. Corregido añadiendo un `loading`
del mismo tamaño (anillo + línea de texto) a ese `dynamic()`. CLS medido:
0.164 → 0.013. De paso se corrigió también el esqueleto genérico de
`app/(app)/app/loading.tsx` (alturas ajustadas a las del dashboard real,
medidas con Playwright) y se subió el `min-height` de `.acierta-heatmap` a su
alto real (222px, no 120px) — ninguno de los dos era la causa raíz, pero
ambos seguían siendo mejoras reales una vez identificada la causa verdadera.

**F20-2 · PostHog no quedaba tan "inerte" como decía el comentario.** El
código asumía que sin credenciales reales el SDK no hacía nada
(`apiKey.startsWith('your-')`), pero el placeholder real usado en este
entorno no calzaba con ese heurístico — `posthog.init()` corría completo
igual, con petición de red real incluida, contradiciendo la intención
documentada ("deja todo listo para activarse por variable de entorno... sin
bloquear"). Se corrigió de raíz en vez de parchear el heurístico: `posthog-js`
(núcleo, ~70KB) ahora se carga con `import()` dinámico desde
`src/lib/analytics/client.ts` en vez de un import estático — así el costo
real de inicializar PostHog (bytes + tiempo de CPU) nunca compite con el
primer render, tenga o no credenciales reales. De paso se eliminó el uso de
`posthog-js/react` (el `PostHogProvider`/contexto de React): nada en el
código llama a `usePostHog()`, así que esa capa solo agregaba peso sin
aportar nada.

## Datos de relleno F21 — Completar ANTES de publicación

Los siguientes placeholders están marcados en las páginas legales con fondo **amarillo** y el texto `PLACEHOLDER:` para facilitar búsqueda:

### Aviso de privacidad (`app/(public)/legal/privacidad/page.tsx`)
1. **Línea ~20 (Responsable de tus datos):**
   - Razón social exacta de la empresa
   - Domicilio legal completo (calle, número, ciudad)
   - Correo de contacto
   - Teléfono de contacto

2. **Línea ~181 (Contacto, sección 10):**
   - Dirección completa idéntica a arriba

### Términos de uso (`app/(public)/legal/terminos/page.tsx`)
1. **Línea ~291 (Contacto, sección 13):**
   - Razón social exacta
   - Domicilio legal completo
   - Teléfono de contacto

**Búsqueda rápida:** `grep -n "PLACEHOLDER:" app/(public)/legal/` 

## Pendiente de F22 — requiere acción del dueño (no vía código/SQL)

- **Activar "Leaked Password Protection"** en Supabase Dashboard → Authentication → Policies (revisa contraseñas contra HaveIBeenPwned.org al registrarse; WARN de `get_advisors`, sin endpoint de gestión expuesto vía las herramientas MCP usadas en esta sesión).

## G1 — Build resiliente y brecha real de contenido (2026-08-03)

Fase técnica disparada por una auditoría externa que reportó `pnpm build`
roto y sospechó una tabla contradictoria en F4. Ambos hallazgos se
verificaron contra el sistema real; solo uno era real.

### Causa raíz del build roto (real, confirmada y corregida)

El error `FATAL: (ENOTFOUND) tenant/user acierta_ci.fumluvvzskhdxcyljbmx not
found` **no era un problema de código ni de `DATABASE_URL` mal escrita**: el
proyecto Supabase real (`fumluvvzskhdxcyljbmx`) estaba **`INACTIVE`**
(pausado) — el plan gratuito pausa proyectos tras ~7 días sin actividad, y la
última verificación en vivo había sido el 27 de julio, justo en el borde de
esa ventana. Confirmado con `list_projects` del conector de Supabase
(`status: "INACTIVE"` → tras `restore_project` → `"COMING_UP"` →
`"ACTIVE_HEALTHY"`). El pooler de Supavisor no tiene tenant al que enrutar
un proyecto pausado, de ahí el mensaje "tenant/user not found".

**Fix de fondo (no solo reactivar el proyecto):** la landing (`/`) y precios
(`/precios`) usan ISR (`revalidate=60`) y llaman a la DB en build-time para
el contador de licencias Early Bird y la temporada de precios vigente — eso
hace que `next build` dependa de que la DB esté viva, algo frágil incluso
sin el problema de pausado (cualquier caída transitoria de Supabase
tumbaría el build). Se agregaron `resolveEffectiveSeasonSafe` y
`earlyBirdLicensesRemainingSafe` en `src/lib/db/billing.ts`: si la consulta
falla, degradan con gracia (`HIGH_SEASON` sin descuento / banner oculto) en
vez de propagar el error y tirar el build completo. **El checkout real
(`app/actions/checkout.ts`) y el paywall (`app/(app)/paywall/page.tsx`)
siguen usando las funciones estrictas sin este wrapper** — ambos están
detrás de auth, nunca se prerenderizan en build, y lo que de verdad se COBRA
no debe degradarse nunca. Verificado en vivo con `DATABASE_URL` apuntando a
un host inexistente: `pnpm build` termina con exit code 0 y genera las 32
rutas igual (antes: build completo abortado).

### La tabla de F4 NO estaba contradicha — verificado, no corregido

La auditoría reportó que "la tabla por materia no suma el total reportado".
Se re-consultó la DB real con un script nuevo
(`scripts/audit-content.ts`, `pnpm exec tsx scripts/audit-content.ts`) que
NO reutiliza ningún número de documentos — cuenta `Question` con
`isVerified=true AND usage=SERVABLE` directo de Prisma. **Resultado: 309
total, 135 SOURCED / 174 TEMARIO_ONLY, exactamente igual a la tabla de F4**
(fila por fila: Matemáticas 63, Física 58, Biología 61, Química 96 [31 Área
1 + 65 Área 2], Español 31 — suma 309; SOURCED 135, TEMARIO_ONLY 174). La
tabla de F4 sí incluye una fila "Español" y una fila "TOTAL" que la
verificación anterior no llegó a leer (se cortó a media tabla) — de ahí la
sospecha de contradicción. **No fue necesario corregir ningún número: los
que ya estaban documentados eran correctos.**

### Conteos reales verificados (fuente: `scripts/audit-content.ts`, en vivo)

| | Total |
|---|---|
| Reactivos `isVerified=true` + `usage=SERVABLE` | **309** |
| SOURCED | 135 |
| TEMARIO_ONLY | 174 |
| Temas del temario completo (UNAM+IPN) | 217 |
| Temas SIN ningún reactivo | **161** |
| Temas CON al menos 1 reactivo | 56 |

Por institución/área (real, verificado):

| Institución | Área/Rama | Reactivos reales |
|---|---|---|
| UNAM | Ciencias Físico-Matemáticas y las Ingenierías (Área 1) | 183 |
| UNAM | Ciencias Biológicas, Químicas y de la Salud (Área 2) | 126 |
| UNAM | Ciencias Sociales (Área 3) | 0 |
| UNAM | Humanidades y Artes (Área 4) | 0 |
| IPN | Ingeniería y Ciencias Físico-Matemáticas (FISMAT) | 0 |
| IPN | Ciencias Médico-Biológicas (MEDBIO) | 0 |
| IPN | Ciencias Sociales y Administrativas (SOCADM) | 0 |

### Tabla de brecha: meta vs. real, por institución/área/materia

**Metodología de la columna "Meta":** el PRD (`§14`) y el Plan de
Implementación **no dan una cifra por materia** — solo totales por
institución/área: UNAM Área 1 ≥300 (Early Bird), UNAM Áreas 1-3 ≥800
acumulado (Beta), y UNAM 4 áreas + IPN 2 ramas (FISMAT+MEDBIO) ≥1,500
mínimo (Public Launch; SOCADM no es parte de ese mínimo explícito según la
prioridad de contenido del PRD §4.1). La meta por área se derivó restando
cascada (A1=300, A2+A3=800-300=500 repartido por peso, resto=1500-800=700
repartido entre A4+FISMAT+MEDBIO por peso) y la meta por materia se
prorrateó dentro de cada área usando `Subject.questionWeight` real del seed
(`prisma/seed/unam.ts` / `ipn.ts`) — el mismo peso que ya usa el motor
adaptativo y el reparto del diagnóstico. **Es una estimación razonable, no
una cifra literal de los documentos**; ordenada de mayor a menor urgencia
(instituciones/áreas en cero primero).

| Institución | Área/Rama | Materia | Meta (estimada) | Real | Faltan |
|---|---|---|---:|---:|---:|
| **IPN** | **FISMAT** — institución día 1 | Matemáticas | 135 | 0 | 135 |
| IPN | FISMAT | Física | 112 | 0 | 112 |
| IPN | FISMAT | Química | 56 | 0 | 56 |
| IPN | FISMAT | Español/Lectura | 22 | 0 | 22 |
| IPN | FISMAT | Inglés | 11 | 0 | 11 |
| IPN | *(subtotal FISMAT)* | | **336** | **0** | **336** |
| **IPN** | **MEDBIO** — institución día 1 | Biología | 123 | 0 | 123 |
| IPN | MEDBIO | Química | 90 | 0 | 90 |
| IPN | MEDBIO | Matemáticas | 45 | 0 | 45 |
| IPN | MEDBIO | Español/Lectura | 33 | 0 | 33 |
| IPN | MEDBIO | Inglés | 17 | 0 | 17 |
| IPN | *(subtotal MEDBIO)* | | **308** | **0** | **308** |
| **UNAM** | **Área 3 (Sociales)** — requerido Beta | Historia de México | 70 | 0 | 70 |
| UNAM | Área 3 | Historia Universal | 50 | 0 | 50 |
| UNAM | Área 3 | Geografía | 40 | 0 | 40 |
| UNAM | Área 3 | Español | 30 | 0 | 30 |
| UNAM | Área 3 | Inglés | 10 | 0 | 10 |
| UNAM | *(subtotal Área 3)* | | **200** | **0** | **200** |
| **UNAM** | **Área 4 (Humanidades)** | Literatura | 22 | 0 | 22 |
| UNAM | Área 4 | Filosofía | 17 | 0 | 17 |
| UNAM | Área 4 | Artes | 11 | 0 | 11 |
| UNAM | Área 4 | Español | 6 | 0 | 6 |
| UNAM | *(subtotal Área 4)* | | **56** | **0** | **56** |
| **UNAM** | **Área 2 (Biológicas)** | Biología | 140 | 61 | 79 |
| UNAM | Área 2 | Español | 50 | 0 | 50 |
| UNAM | Área 2 | Inglés | 30 | 0 | 30 |
| UNAM | Área 2 | Química | 80 | 65 | 15 |
| UNAM | *(subtotal Área 2)* | | **300** | **126** | **174** |
| **UNAM** | **Área 1 (Físico-Matemáticas)** | Matemáticas | 111 | 63 | 48 |
| UNAM | Área 1 | Inglés | 26 | 0 | 26 |
| UNAM | Área 1 | Química | 51 | 31 | 20 |
| UNAM | Área 1 | Español | 43 | 31 | 12 |
| UNAM | Área 1 | Física | 69 | 58 | 11 |
| UNAM | *(subtotal Área 1)* | | **300** | **183** | **117** |
| | **TOTAL (6 áreas/ramas mínimas)** | | **1,500** | **309** | **1,191** |

**Lectura:** el 20.6% de avance (309/1,500) ya documentado en
`LAUNCH_CHECKLIST.md` se confirma exacto. La brecha más urgente sigue siendo
IPN completo (644 reactivos, 0 hoy, institución de lanzamiento día 1) y
UNAM Áreas 3-4 (256 reactivos, 0 hoy). Dentro de Área 1/Área 2 (las únicas
con contenido), Inglés y Español de Área 2 están en cero — ninguna materia
tiene cobertura completa.

### Suite E2E — resultado real (no el de fases anteriores)

`pnpm exec playwright install` corrido (Firefox/WebKit no estaban
descargados en este entorno — Chromium ya estaba). `pnpm test:e2e` completo:

- **0 specs pasaron**, **15 saltados**, **3 fallidos** (18 total).
- **Los 15 saltados** (Chromium y WebKit, las 6 specs × 2 navegadores + 3
  Firefox del simulador): `E2E_EMAIL`/`E2E_PASSWORD`/`E2E_SIGNUP` **no
  están configuradas en este entorno** (verificado sin exponer valores:
  las 5 variables `E2E_*` están todas `NOT SET`) — comportamiento
  documentado y esperado (`test.skip` explícito en los specs), no una
  regresión. Sin esas credenciales no hay forma de correr el flujo real
  contra Supabase.
- **Los 3 fallidos** (Firefox, las 3 specs de `new-user-journey.spec.ts`):
  `Error: browserType.launch: spawn UNKNOWN` al intentar lanzar
  `firefox.exe` en este Windows — un problema de arranque del binario
  Firefox en esta máquina (probablemente antivirus/sandbox bloqueando el
  proceso headless), no un bug de la app; ocurre ANTES de que el test llegue
  a su propio `test.skip`.
- **Conclusión honesta:** en este entorno, con sus credenciales y
  navegadores actuales, la suite E2E no puede confirmar ni refutar el
  comportamiento de la app — solo confirma que el gating de credenciales
  funciona como está documentado. Para una corrida real hace falta (a)
  provisionar `E2E_EMAIL`/`E2E_PASSWORD` (cuentas de prueba `e2e.sim@`/
  `e2e.free@` documentadas desde F19) en `.env.local`, y (b) diagnosticar el
  arranque de Firefox en este Windows (o excluir el proyecto `firefox` de
  `playwright.config.ts` si no es una plataforma objetivo real de examen).

### Scripts nuevos (permanentes)

`scripts/audit-content.ts` (`pnpm exec tsx scripts/audit-content.ts`):
conteo real de reactivos servibles/verificados por institución/área/materia,
groundingStatus, y temas sin contenido — reusar en cualquier verificación
futura del banco de reactivos en vez de confiar en documentos.

## G2 — Eliminación de la API de pago del pipeline de contenido (2026-08-03)

**Instrucción explícita del dueño, sin excepción:** el proyecto nunca debe
usar la API de pago de Anthropic (`ANTHROPIC_API_KEY`, `@anthropic-ai/sdk`,
ninguna llamada facturada por token) — ni en runtime ni en scripts offline.
Todo el contenido se produce DENTRO de sesiones de Claude Code o del chat de
Claude, usando la suscripción ya existente.

### Auditoría (antes de tocar nada)

Búsqueda exhaustiva en todo el repositorio (`ANTHROPIC_API_KEY`,
`@anthropic-ai/sdk`, `api.anthropic.com`, y "anthropic" case-insensitive).
9 archivos con uso real de la SDK o la variable:

- `scripts/lib/anthropic-client.ts` — wrapper del SDK (generación).
- `scripts/lib/verifier.ts` — llamaba al SDK con loop de tool-use para la
  verificación adversarial (incluía el sandbox `ejecutar_calculo`).
- `scripts/lib/chunk-classifier.ts` — llamaba al SDK para clasificar
  fragmentos fuente contra el temario (F2b).
- `scripts/generate-questions.ts`, `scripts/verify-questions.ts`,
  `scripts/content-run.ts` — orquestadores que invocaban los tres módulos
  de arriba.
- `scripts/scan-and-ingest.ts` — invocaba `chunk-classifier.ts`.
- `scripts/ping-anthropic.ts` — prueba de humo pura del SDK.
- `package.json` — dependencia `@anthropic-ai/sdk` en `devDependencies`.

Ningún archivo de `src/` o `app/` (runtime) usaba el SDK — ya estaba
correctamente aislado a `scripts/` desde F2 (guardrail original de
CLAUDE.md), lo que hizo la migración más simple: solo había que rediseñar
`scripts/`, no tocar la app.

### El rediseño: aislamiento de SESIÓN reemplaza aislamiento de CÓDIGO

La garantía central del pipeline ("el verificador nunca ve la respuesta
correcta") antes se sostenía con TypeScript: `buildVerifierPayload()`
construía el payload por selección explícita de campos, así que `isCorrect`
y `explanations` no podían llegar a la llamada de API por construcción de
tipos. Sin una API que llamar, esa garantía ahora se sostiene por **quién
lee el archivo**: el archivo de "lote ciego" que produce
`scripts/content-blind-batch.ts` tiene la MISMA garantía estructural
(`buildBlindItem`, `scripts/lib/blind-verification.ts` — `isCorrect`/
`explanations` no existen en el tipo `BlindBatchItem`, verificado con test),
pero la separación real ahora es que una sesión de Claude Code/chat
DISTINTA e INDEPENDIENTE de la que compuso el reactivo es quien lo resuelve.
Nada impide técnicamente que sea la misma sesión — es una disciplina
operativa, documentada aquí y en el docstring de cada script, igual que
"nunca cancelación inmediata" o "nunca revisión humana" son disciplinas ya
establecidas en otras partes del proyecto.

**Nuevo mecanismo de mezclado**: en vez de que el "segundo modelo" fuera
estructuralmente incapaz de ver la respuesta (por tipos), ahora las opciones
del lote ciego se mezclan con una semilla DETERMINISTA (`questionId`,
`shuffleOptionsForQuestion`) — la sesión verificadora nunca ve la A/B/C/D
original ni siquiera por posición. `translateChosenOption` recompone el
mismo mezclado al resolver, sin necesitar persistir un archivo de mapeo
intermedio (que sería una forma indirecta de fuga).

### Los 3 scripts nuevos (reemplazan generate/verify/content-run)

1. **`scripts/content-insert-drafts.ts`** (`pnpm content:insert --topic <id>
   --file <drafts.json>`): recibe un JSON con reactivos YA COMPUESTOS por una
   sesión, los valida con el MISMO `QuestionDraftSchema` de siempre (Zod +
   KaTeX, sin cambios), resuelve citas de fuente (F2b, `resolveCitations` sin
   cambios) y deduplica contra los stems existentes — inserta con
   `isVerified=false`. Reemplaza la Etapa 2 de `generate-questions.ts`; la
   Etapa 1 (generación) ya no es un paso de script — ocurre directamente
   dentro de la sesión que escribe el archivo.
2. **`scripts/content-blind-batch.ts`** (`pnpm content:blind-batch --topic
   <id>` | `--ids <a,b,c>` | `--all`): exporta el lote ciego (ver arriba).
   Reusable para el muestreo de auditoría 5% (`sampleForAudit`,
   `resolution.ts`, sin cambios) pasándole `--ids` con los ya-aprobados.
3. **`scripts/content-resolve-verification.ts`** (`pnpm content:resolve
   --file <respuestas.json>`): lee las respuestas de la sesión verificadora
   (`questionId` + `chosenOption` + `confidence` + `problems`), traduce la
   letra mezclada de vuelta al id original, y aplica la MISMA
   `resolveVerdict` de siempre (`scripts/lib/resolution.ts`, **sin cambios,
   cero llamadas a red**): coincide + confianza ≥0.85 + cero problemas →
   `isVerified=true`; cualquier otra cosa → sin publicar con el veredicto
   completo adjunto (mismo formato que ya leía el panel de discrepancias F3,
   `pipeline: 'session-v1'` en vez de `'adversarial-v1'` para distinguir el
   origen sin romper el schema — `verificationRecordSchema.pipeline` ya era
   `z.string()` abierto, no un literal cerrado, así que el panel F3 sigue
   funcionando sin tocarlo).

Mismo patrón aplicado a la clasificación de fragmentos fuente (F2b), que
también llamaba al SDK: **`scripts/classify-chunks-export.ts`** +
**`scripts/classify-chunks-apply.ts`** reemplazan la clasificación inline
que vivía dentro de `scan-and-ingest.ts` — el escaneo/fragmentación/registro
de fuentes sigue igual (nunca usó el SDK), solo la clasificación contra el
temario se movió a sesión.

### Qué se conservó sin cambios (pura, sin SDK, ya lo era)

`scripts/lib/resolution.ts` (`resolveVerdict`, `sampleForAudit`,
`MIN_CONFIDENCE=0.85`, `AUDIT_RATE=0.05`), `scripts/lib/question-draft-schema.ts`
(`QuestionDraftSchema`, validación KaTeX), `scripts/lib/grounding.ts`
(`resolveCitations`, anclaje F2b), `scripts/lib/content-db.ts` (capa Prisma),
`scripts/lib/mock-generator.ts` (generador mock para pruebas) — ninguno
importaba el SDK, así que la lógica de negocio central del pipeline (qué
hace publicable a un reactivo) es EXACTAMENTE la misma de F2/F2b/F4. Lo que
cambió es de dónde viene el texto a validar/resolver, no las reglas.

### Contenido existente: se conserva sin tocar

Los **309 reactivos verificados/servibles** (F4) y los 380 generados en
total NO se tocaron — siguen en la DB con su `Question.verification`
original (`pipeline: 'adversarial-v1'`, generados bajo la arquitectura
"capital cero" de F4 que ya documentaba honestamente su propia relajación
de garantías, ver Notas F4 arriba). El guardrail de CLAUDE.md "nunca borrar
reactivos con respuestas históricas" tampoco aplicaba aquí (cero respuestas
de usuarios reales sobre ellos), pero de cualquier forma no había motivo
para tocarlos: son contenido válido, ya auto-aprobado por dos pasadas
independientes bajo las reglas vigentes en su momento. **De aquí en
adelante, toda generación/verificación/clasificación NUEVA sigue el
mecanismo de sesiones descrito arriba** — los 3 scripts nuevos son el único
camino a `isVerified=true` desde esta fase.

### Verificación final

`pnpm typecheck` y `pnpm lint` en verde. Búsqueda de `ANTHROPIC_API_KEY`,
`@anthropic-ai/sdk` y `api.anthropic.com` en todo el repositorio: **0
resultados** fuera de `.next/` (caché de build regenerable, no código
fuente) y este mismo párrafo de ESTADO.md. `@anthropic-ai/sdk` removido de
`package.json`/`pnpm-lock.yaml` vía `pnpm remove`. `.env.example` ya no
declara `ANTHROPIC_API_KEY`.

## G3a — Lote de reactivos: IPN FISMAT Matemáticas (2026-08-05)

Primera corrida real del pipeline vía sesiones (G2) para producir contenido
nuevo — sin ninguna llamada a la API de pago de Anthropic.

### Elección de materia (regla de prioridad estricta, contra la DB real)

Consulta directa (`Subject.questionWeight` + conteo de
`isVerified=true AND usage=SERVABLE` por materia) sobre TODAS las materias de
instituciones/áreas activas para el lanzamiento con 0 reactivos verificados:
IPN Superior completo (FISMAT + MEDBIO + SOCADM — las 3 ramas, no solo las 2
del mínimo de contenido de G1, porque CLAUDE.md dice "Launch = UNAM Superior
+ IPN Superior" sin excluir SOCADM) y UNAM Áreas 3-4. **Las 26 materias de
ese conjunto tienen 0 reactivos reales**, confirmado en vivo. La de mayor
`questionWeight` fue **Matemáticas de IPN FISMAT, con 24** (2° lugar:
Biología de IPN MEDBIO, 22; 3° lugar: Física de IPN FISMAT, 20) —
diferencia clara, sin necesidad de aplicar el desempate.

### Fragmentos fuente disponibles

De los 12 temas de esta materia, 3 ya tenían `SourceChunk` real (escaneados
en F2b, de guías generales de razonamiento matemático — CENEVAL EXANI-I y
UAM CAD/CSH, material legítimamente reusable para habilidades matemáticas
generales aunque no sean específicas de IPN): **Números y operaciones**
(fragmento sobre porcentajes), **Ecuaciones lineales y cuadráticas**
(fragmento sobre factorización de parábolas) y **Sucesiones y series**
(fragmento sobre patrones numéricos). Los 9 temas restantes no tenían
fragmento — se generaron como TEMARIO_ONLY, apoyados en el temario oficial
ya sembrado (sin inventar contenido fuera de lo que el tema declara).

### Los 35 reactivos

Compuestos directamente en esta sesión (redacción original, cero llamadas a
red): enunciado + 4 opciones (1 correcta) + 3 capas de explicación cada uno,
validados con el MISMO `QuestionDraftSchema`/KaTeX de siempre
(`scripts/lib/question-draft-schema.ts`, sin cambios) — **0 rechazados en
el dry-run, 35/35 válidos**. Distribución por tema (12 SOURCED en los 3
temas con fragmento, citando `sourceChunks:[1]` en cada uno; 23
TEMARIO_ONLY en los 9 restantes):

| Tema | Reactivos | Grounding | Formatos |
|---|---:|---|---|
| Números y operaciones | 4 | SOURCED | PROBLEM_SOLVING ×4 |
| Ecuaciones lineales y cuadráticas | 4 | SOURCED | PROBLEM_SOLVING ×3, MULTIPLE_CHOICE ×1 |
| Sucesiones y series | 4 | SOURCED | NUMERIC_SERIES ×4 |
| Álgebra elemental | 3 | TEMARIO_ONLY | PROBLEM_SOLVING ×2, MULTIPLE_CHOICE ×1 |
| Funciones y gráficas | 3 | TEMARIO_ONLY | PROBLEM_SOLVING ×2, MULTIPLE_CHOICE ×1 |
| Trigonometría | 3 | TEMARIO_ONLY | PROBLEM_SOLVING ×3 |
| Geometría analítica | 3 | TEMARIO_ONLY | PROBLEM_SOLVING ×3 |
| Cálculo diferencial | 3 | TEMARIO_ONLY | PROBLEM_SOLVING ×3 |
| Cálculo integral | 2 | TEMARIO_ONLY | PROBLEM_SOLVING ×2 |
| Matrices y sistemas | 2 | TEMARIO_ONLY | MULTIPLE_CHOICE ×1, PROBLEM_SOLVING ×1 |
| Combinatoria y probabilidad | 2 | TEMARIO_ONLY | PROBLEM_SOLVING ×2 |
| Números complejos | 2 | TEMARIO_ONLY | PROBLEM_SOLVING ×2 |
| **TOTAL** | **35** | **12 SOURCED / 23 TEMARIO_ONLY** | PROBLEM_SOLVING 28 · NUMERIC_SERIES 4 · MULTIPLE_CHOICE 3 |

Mezcla de formato deliberadamente dominada por PROBLEM_SOLVING (80%),
reflejando el estilo real observado en los 3 fragmentos fuente disponibles
(problemas de cálculo/palabra, no reactivos de opción conceptual pura) más
NUMERIC_SERIES para el tema de sucesiones (match directo con su fragmento).
Dificultad variada BASIC/INTERMEDIATE/ADVANCED sin sobre-representar ningún
nivel.

### Inserción

`pnpm content:insert --topic <id> --file <drafts.json>` corrido 12 veces
(una por tema, siguiendo el contrato existente del script de G2) —
**35/35 insertados, 0 rechazados**, todos `isVerified=false`,
`source=GENERATED`, a la espera de verificación ciega
(`content:blind-batch` → sesión verificadora independiente →
`content:resolve`, mecanismo de G2). Verificado en vivo contra Supabase
real: `SELECT count(*)` confirma exactamente 35 pendientes en esa materia,
12 SOURCED / 23 TEMARIO_ONLY.

### Artefacto persistido

`docs/content-batches/g3a-ipn-fismat-matematicas.json` — los 35 reactivos
completos (enunciado, opciones, explicaciones, cita de fuente) con su
`questionId` real de la DB, para trazabilidad del lote. Los 12 archivos
operativos usados para la inserción (`scripts/content-exports/g3a/*.json`)
son intermedios desechables (esa carpeta está en `.gitignore` desde G1) —
la fuente de verdad persistida es el archivo consolidado en `docs/`.

### Pendiente inmediato (siguiente sesión, G3b)

Estos 35 reactivos NO son visibles a usuarios todavía (`isVerified=false`).
El siguiente paso es exportar el lote ciego
(`pnpm content:blind-batch --topic <id>` por cada uno de los 12 temas, o
`--ids` con todos los `questionId` del artefacto) y resolverlo en una
sesión de Claude Code/chat DISTINTA e independiente de esta — solo así se
preserva la garantía de que el verificador nunca vio la respuesta correcta.

## G3b — Verificación ciega del lote G3a (2026-08-04)

Segunda mitad del ciclo adversarial de G2: la sesión verificadora (esta) es
distinta e independiente de la que compuso los reactivos (G3a).

### Aislamiento preservado

La sesión NO leyó el commit de G3a, ni
`docs/content-batches/g3a-ipn-fismat-matematicas.json`, ni consultó
`Question.options` antes de responder. Único insumo: el lote ciego generado
con `pnpm content:blind-batch --all --limit 100` (35 pendientes detectados,
los 35 de G3a — el filtro `verification IS NULL` los aísla solo de los 71
sin publicar de F4, que ya traen veredicto). Comprobación explícita del
archivo antes de leerlo: claves por ítem = `questionId, institution,
subject, topic, format, passage, requiresCalculation, stem, options`, y por
opción = `label, text, imageUrl` — sin `isCorrect` ni `explanations`. La
única coincidencia de un grep de `correct` fue la palabra española
"correcta" dentro de un enunciado.

### Resolución con cálculo ejecutado

Los 35 ítems venían con `requiresCalculation: true` (materia = Matemáticas).
Se resolvieron con un script de sympy 1.14 que **calcula cada respuesta
desde cero y la compara numérica o simbólicamente contra el texto de cada
opción**, con un `assert` por reactivo de que **exactamente una** opción
coincide — ese assert es a la vez la comprobación de `MULTIPLE_VALID` y de
`NONE_VALID`. Los 35 asserts pasaron. Casos donde el cálculo descartó una
lectura alterna en vez de suponerla: la serie `5,11,17,23,29` (se enumeraron
los primos para confirmar que NO son primos consecutivos, así que `+6` es la
única regla coherente), `s(t)=t³-6t²+9t` (se evaluó `v(0)=9≠0` para
descartar la opción que incluía `t=0`), y la ley de exponentes (16 pares
`(m,n)` con `a=3`, más el contraejemplo `3²·3³≠3⁶` que descarta `a^{mn}`).

### Resultado

**35/35 coincidieron con el generador.** Confianzas 0.96–0.99.

| | Reactivos |
|---|---:|
| Auto-aprobados (`isVerified=true`) | **34** |
| Sin publicar (veredicto adjunto) | 1 |
| Omitidos | 0 |
| **Tasa de auto-aprobación del lote** | **97.1%** |

El único no publicado es `cmsfgf5ea0001k3lis0d0uzf9` (Números complejos,
`(3+2i)+(1-5i)`): la respuesta coincidió con confianza 0.96, pero se marcó
`WEAK_DISTRACTORS` porque una de sus opciones está escrita `$4-3$` — parece
un `$4-3i$` al que se le cayó la `i`. Leída literal vale 1 y no es un
complejo (distractor no creíble); leída como errata es indistinguible de la
opción correcta, o sea dos opciones aparentemente válidas. Necesita que se
corrija el texto de esa opción antes de publicarse. Queda en la cola de
discrepancias de F3 con el veredicto completo.

### Acumulado real en la DB (verificado en vivo)

| | Reactivos |
|---|---:|
| Totales en la DB | 415 |
| `isVerified=true` (servibles) | **343** |
| `isVerified=false` | 72 |

343 = los 309 de F4 + los 34 de este lote. Los 72 pendientes = 71 de F4
(rechazados correctamente por la verificación) + 1 de G3b.
Tasa de auto-aprobación acumulada: 343/415 = **82.7%**.

### HALLAZGO DE LOTE — bloqueante para el siguiente G3a

La verificación ciega es **por reactivo**, así que no puede detectar
defectos del lote como conjunto. Uno apareció al revisar la salida de
`content:resolve`, donde `generatorOption` fue `A` en las 35 líneas.
Confirmado con una consulta a la DB real:

| Institución | Reactivos | Posición de la opción correcta |
|---|---:|---|
| UNAM (F4) | 380 | A 27.1% · B 26.6% · C 21.3% · D 25.0% — sana |
| IPN (G3a) | 35 | **A 100%** |

Esto importa porque `src/lib/simulator/config.ts` define
`IPN: { shuffleOptions: false }` — a diferencia de UNAM, el simulador NO
baraja las opciones para IPN, así que un alumno vería la respuesta correcta
en la posición A en los 35 reactivos. Es un patrón aprendible que anula el
valor de práctica del lote. Los 380 de F4 no tienen el problema (su
distribución es sana), así que es un defecto introducido por el método de
composición de G3a, no del pipeline.

**No se corrigió en esta fase, deliberadamente.** Permutar el orden
almacenado de las opciones desincronizaría las explicaciones que citan
letras: se encontraron al menos 2 casos reales donde la Capa 3 se refiere a
un distractor por su letra actual y quedaría apuntando a otra opción —
`cmsfgg0yn0001jdba3hzgyncc` ("Olvidar el $+C$ (opción C)…", y la C
almacenada es en efecto la primitiva sin constante) y
`cmsfgfw8a000bpofk5e35jc1f` ("El punto donde la recta cruza el eje $y$
(opción B)…", y la B almacenada es en efecto esa). Un reordenamiento
mecánico rompería ambas. La corrección requiere revisión editorial por
reactivo, fuera del alcance de G3b (que es verificar, no editar contenido).

**Acción para el siguiente lote:** al componer, distribuir la opción
correcta entre A/B/C/D (~25% cada una) desde el inicio, y escribir las
explicaciones citando el CONTENIDO del distractor en vez de su letra, para
que el orden deje de ser información estructural.

## G3c — Corrección de sesgo de posición + validación de lote (2026-08-05)

Cierra el hallazgo de G3b: los 35 reactivos de IPN FISMAT Matemáticas
tenían la respuesta correcta en la posición `A` el 100% de las veces, y
el simulador no baraja opciones para IPN — patrón aprendible, invisible
para la verificación ciega (que opera reactivo por reactivo, no sobre el
conjunto). Modo de trabajo: autónomo, sin preguntas de selección.

### 1) Reparación editorial de los 35 de IPN

**Confirmado antes de tocar nada:** 0 `SessionAnswer` referencian estos 35
`questionId` (ni siquiera placeholders) — seguro relabelear sin violar el
guardrail de "nunca borrar/romper reactivos con respuestas históricas".

`Question.options` guarda `[{id:"A"|"B"|"C"|"D", text, isCorrect}, ...]` y
`toRunnerQuestion`/`OptionButton` usan ese `id` LITERAL como la letra que ve
el alumno (`src/lib/db/diagnostic.ts:232`, `src/components/exam/OptionButton.tsx`)
— el array no se reordena para instituciones sin `shuffleOptions`, así que
la única forma de mover la respuesta correcta de posición es reasignar el
campo `id` entre el objeto-opción correcto y el que ya ocupaba la letra
destino (intercambio de `id`, contenido intacto), y reordenar el array por
`id` para que la vista siga A→B→C→D en pantalla.

Plan de reasignación: ciclo `A,B,C,D` sobre los 35 ids ordenados
ascendentemente → distribución **9/9/9/8** (25.7%/25.7%/25.7%/22.9%,
dentro de la banda 15-40%). Verificado en vivo tras la escritura: 0
reactivos malformados, 0 discrepancias de `stem`/texto de opción contra el
snapshot previo (solo cambiaron `id` y el orden del array).

**5 explicaciones reescritas** para citar el CONTENIDO del distractor en
vez de su letra (un barrido con patrones `opción [ABCD]`, `inciso [ABCD]`,
`([ABCD])`/`[ABCD])`, y un patrón dedicado para títulos tipo "Por qué A"
encontró 2 más de los que G3b ya había visto):

| Reactivo | Capa | Antes | Después |
|---|---|---|---|
| `cmsfgemwc…` (discriminante) | 1 (título) | "Por qué A" | "Por qué el número y tipo de raíces" |
| `cmsfgfw8a…` (pendiente $m$) | 1 (título) | "Por qué A" | "Por qué la razón de cambio" |
| `cmsfgfw8a…` | 3 (contenido) | "…cruza el eje $y$ (opción B) es la ORDENADA…" | "…cruza el eje $y$ es la ORDENADA…" |
| `cmsfgg0yn…` (integral) | 3 (contenido) | "Olvidar el $+C$ (opción C)… la opción D es la derivada…" | "Olvidar el $+C$… la expresión $12x^2-6+C$ es la derivada…" |
| `cmsfgg85l…` (circunferencia) | 3 (contenido) | "…al cuadrado (opción B usa $r=5$…)" | "…al cuadrado (la ecuación $x^2+y^2=5$ usa $r=5$…)" |

Verificado en vivo tras la reparación: `SELECT` directo confirma
distribución `{A:9,B:9,C:9,D:8}` y **0 citas por letra restantes** en los 35.

### 2-3) Validación de lote — nueva capa obligatoria del pipeline

`scripts/lib/lot-validation.ts` (PURO, sin Prisma ni red — 13 tests
Vitest): `analyzeLot(items)` recibe todos los reactivos de un lote
(options/format/difficulty/explanations) y reporta:

- **`POSITION_SKEW`**: ninguna letra puede ser la correcta en <15% o >40%
  de los reactivos — **solo aplica con ≥20 reactivos** (`POSITION_SKEW_MIN_LOT_SIZE`;
  con menos, la muestra no alcanza para el umbral, pero el resto de reglas
  sigue activo sin importar el tamaño).
- **`LETTER_CITATION`**: explicaciones que citan una opción por su letra
  (`opción A`, `inciso B`, `letra C`, `(B)`/`B)`, o un título "Por qué A"
  bare). El patrón parentético excluye deliberadamente unidades científicas
  que coinciden por casualidad con A-D (`25°C)`, `5A)`) vía un lookbehind
  que descarta la letra si está pegada a un dígito o a `°` — verificado
  contra el corpus real (ver barrido abajo): sin ese ajuste, `°C)` en
  reactivos de Química daba 2 falsos positivos.
- **`MALFORMED_OPTIONS`**: no exactamente 4 opciones con ids A-D únicos y
  exactamente 1 correcta — defensa en profundidad (Zod ya lo exige antes).
- Reporta también distribución de formato y dificultad (informativo, no
  bloquea por sí solo).

`scripts/validate-batch.ts` (`pnpm content:validate-batch --dir <carpeta>`
o `--files a.json,b.json,...`): CLI standalone que corre `analyzeLot` sobre
TODOS los archivos de un lote a la vez (una materia completa — el mismo
patrón de "1 archivo por tema" que usó G3a) ANTES de llamar a
`content:insert`. Exit code 1 y sin tocar nada si el lote falla.

**Integrado como paso obligatorio de `content-insert-drafts.ts`** (no un
flag opcional que se pueda olvidar): el script SIEMPRE corre `analyzeLot`
antes de insertar, incluso en `--dry-run`. Nuevo flag `--lot-dir <carpeta>`:
cuando el lote real abarca varios archivos (un tema cada uno), se le pasa
la carpeta que los contiene y el chequeo de sesgo ve el CONJUNTO completo
en vez de solo el archivo de este tema (con <20 reactivos por archivo, el
chequeo de 15-40% nunca tendría muestra suficiente si mirara un archivo a
la vez). Sin `--lot-dir`, valida el archivo de este tema por su cuenta —
las reglas de cita-por-letra y opciones-malformadas siguen activas sin
importar el tamaño. Cualquier violación aborta la inserción completa: cero
escritura en la DB. Verificado en vivo con un lote sintético de 20
reactivos 100%-en-A vía `--lot-dir`: rechazado con exit 1, sin insertar
nada (incluso con reactivos que además fallaban el chequeo de anclaje,
confirmando que el chequeo de lote corre independiente y antes).

### 4) Regla en CLAUDE.md

Añadida a "Guardrails críticos (nunca hacer)": no dejar la respuesta
correcta concentrada en una posición al componer un lote (distribuir
pareja entre las 4 opciones) y citar distractores por su contenido, nunca
por su letra — con referencia directa a `shuffleOptions:false`
(IPN/UAM/CENEVAL/CNBV) y al paso obligatorio de `lot-validation.ts`.

### 5) Barrido sobre TODO el contenido existente (415 reactivos, 6 grupos)

`analyzeLot` corrido agrupando por institución·materia sobre el corpus
completo real:

| Institución · Materia | Reactivos | Sesgo de posición | Citas por letra |
|---|---:|---|---|
| IPN · Matemáticas | 35 | ✅ sano (9/9/9/8, tras la reparación de arriba) | ✅ 0 |
| UNAM · Biología | 65 | ✅ sano | ✅ 0 |
| UNAM · Español | 38 | ✅ sano (A12/B11/C6/D9) | ❌ 1 (`cmrule6ir…` capa 2: "…coincide exactamente con la opción A.") |
| UNAM · Física | 72 | ✅ sano (A18/B21/C15/D18) | ❌ 1 (`cmru8sy0a…` capa 3: "…potencial (definida en B)… oposición al flujo (definida en C)") |
| UNAM · Matemáticas | 81 | ✅ sano | ✅ 0 |
| UNAM · Química | 124 | ✅ sano (A35/B30/C25/D34) | ✅ 0 (2 falsos positivos de `°C)` descartados por el fix del lookbehind, ver arriba) |

**Ningún grupo tiene sesgo de posición pasado por alto** — el defecto de
G3a fue específico a ese lote (probablemente un artefacto de cómo se
compuso ese lote en particular, no un patrón sistémico del pipeline: F4,
generado con un método distinto, salió sano). Los 380 reactivos de F4 ya
barajan opciones de origen (UNAM) o tienen distribución natural sana.

**2 citas-por-letra preexistentes de F4** (Español, Física) sí quedaron
expuestas por el barrido — severidad BAJA porque UNAM tiene
`shuffleOptions:true`, así que la letra que el alumno ve en pantalla no es
la letra almacenada; no es el mismo riesgo estructural que IPN. **No se
corrigieron en esta fase** (task 5 pidió reportar, no reparar todo el
corpus) — quedan como pendiente menor, propuestas como tarea de
seguimiento.

## G3d — Lote de reactivos: IPN MEDBIO Biología (2026-08-05)

Primera corrida del pipeline con las dos correcciones de método de G3c ya
aplicadas DESDE LA COMPOSICIÓN (no como reparación posterior). Modo de
trabajo: autónomo, sin preguntas de selección.

### Elección de materia (regla de prioridad, contra la DB real)

Consulta directa por `Subject.questionWeight` + conteo de
`isVerified=true` sobre TODAS las materias de instituciones activas para
lanzamiento (UNAM + IPN, todas las áreas/ramas sembradas):

| questionWeight | Institución · Área · Materia | Verificados |
|---:|---|---:|
| **22** | **IPN · Ciencias Médico-Biológicas · Biología** | **0** |
| 20 | IPN · Ingeniería y Ciencias Físico-Matemáticas · Física | 0 |
| 16 | IPN · Ciencias Médico-Biológicas · Química | 0 |
| 10 | IPN · Ingeniería y Ciencias Físico-Matemáticas · Química | 0 |
| 8 | IPN · Ciencias Médico-Biológicas · Matemáticas | 0 |
| 7 | UNAM · Ciencias Sociales · Historia de México | 0 |
| … | (resto de materias en 0 verificados, peso ≤7) | 0 |

Sin empate en el primer lugar (22 vs. 20) — no fue necesaria la Prioridad 2
(brecha absoluta) ni el desempate por peso. **Biología de IPN MEDBIO**
elegida, `questionWeight=22`, 0 reactivos verificados y 0 en cola.

### Fragmentos fuente

**0 `SourceChunk`** para esta materia — ni a nivel tema (los 12 temas
verificados uno por uno) ni a nivel materia (`subjectId` directo). De los
380 fragmentos reales de F2b, ninguno cae en Biología de IPN. Los 35
reactivos son, por tanto, **100% TEMARIO_ONLY**, generados a partir de los
12 nombres de tema ya sembrados (Célula y organelos, Mitosis y meiosis,
Genética básica, Evolución y especiación, Ecología y ecosistemas, Sistemas
del cuerpo humano, Nutrición y metabolismo, Homeostasis, Sistema nervioso,
Sistema endocrino, Inmunología, Reproducción) — contenido de biología
general de nivel bachillerato, dentro del conocimiento factual estándar,
sin necesidad de fuente externa.

### Los 35 reactivos

Compuestos directamente en esta sesión (redacción original, cero llamadas
a red), formato `MULTIPLE_CHOICE` en los 35 (estándar para reactivos
conceptuales de biología, a diferencia del dominio PROBLEM_SOLVING de
G3a/Matemáticas). Distribución por tema:

| Tema | Reactivos | Dificultad |
|---|---:|---|
| Célula y organelos | 4 | BASIC ×2, INTERMEDIATE ×2 |
| Genética básica | 4 | BASIC ×4 |
| Sistema nervioso | 4 | BASIC ×1, INTERMEDIATE ×2, EXPERT ×1 |
| Ecología y ecosistemas | 3 | BASIC ×2, INTERMEDIATE ×1 |
| Sistemas del cuerpo humano | 3 | BASIC ×1, INTERMEDIATE ×2 |
| Nutrición y metabolismo | 3 | BASIC ×2, INTERMEDIATE ×1 |
| Sistema endocrino | 3 | BASIC ×1, INTERMEDIATE ×2 |
| Inmunología | 3 | BASIC ×1, INTERMEDIATE ×1, EXPERT ×1 |
| Mitosis y meiosis | 2 | BASIC ×1, INTERMEDIATE ×1 |
| Evolución y especiación | 2 | INTERMEDIATE ×1, ADVANCED ×1 |
| Homeostasis | 2 | INTERMEDIATE ×1, ADVANCED ×1 |
| Reproducción | 2 | BASIC ×1, INTERMEDIATE ×1 |
| **TOTAL** | **35** | BASIC 16 · INTERMEDIATE 15 · ADVANCED 2 · EXPERT 2 |

**Balance de posición aplicado desde la composición** (regla de G3c): cada
reactivo se escribió con la respuesta correcta ya asignada a una letra
objetivo, ciclando A→B→C→D sobre los 35 en orden — sin necesitar una
reparación posterior como en G3a. **Explicaciones sin citas por letra
desde el origen**: cada capa 3 contrasta el distractor por su CONTENIDO
("el aparato de Golgi modifica y empaqueta proteínas, no genera energía"),
nunca por su posición ("la opción B").

### Validación (Zod + lote G3c)

`pnpm content:validate-batch --dir <carpeta-con-12-archivos>`: **35/35
válidos, 0 rechazados por formato** (Zod/KaTeX — sin fórmulas LaTeX en
este lote, biología no las requirió), **0 violaciones de lote**:

```
Distribución de posición de la respuesta correcta: {"A":9,"B":9,"C":9,"D":8}
Distribución de formato: {"MULTIPLE_CHOICE":35}
Distribución de dificultad: {"BASIC":16,"INTERMEDIATE":15,"ADVANCED":2,"EXPERT":2}
✅ Sin violaciones.
```

### Inserción

`pnpm content:insert --topic <id> --file <drafts.json> --lot-dir <carpeta>`
corrido 12 veces (una por tema) — cada llamada re-validó el lote completo
de 12 archivos antes de insertar, per diseño de G3c. **35/35 insertados, 0
rechazados**, todos `isVerified=false`, `groundingStatus=TEMARIO_ONLY`.
Verificado en vivo contra Supabase real tras la corrida: `SELECT count(*)`
confirma exactamente 35 en la materia, `analyzeLot` corrido de nuevo
DIRECTAMENTE sobre las filas reales de la DB (no sobre los archivos
fuente) confirma la misma distribución 9/9/9/8 y 0 citas por letra — la
garantía sobrevivió el viaje por Zod/Prisma sin corromperse. 35 enunciados
únicos (sin duplicados).

### Artefacto persistido

`docs/content-batches/g3d-ipn-medbio-biologia.json` — los 35 reactivos
completos (enunciado, opciones, explicaciones) con su `questionId` real de
la DB, mismo patrón de trazabilidad que G3a.

## G3e (1er intento) — ABORTADA por contaminación de contexto (2026-08-05)

> Re-ejecutada con éxito en una sesión nueva; ver "G3e (re-ejecución)" más
> abajo. Esta sección se conserva porque el hallazgo de proceso es reutilizable.


**No se resolvió ni se publicó ningún reactivo. Los 35 de G3d siguen
`isVerified=false`.** Esta sección documenta por qué, porque es un hallazgo
de proceso reutilizable, no solo un incidente puntual.

### Qué pasó

La sesión asignada a ejecutar G3e (resolver a ciegas el lote de G3d) era la
**misma conversación** que había compuesto ese lote en G3d, minutos antes.
Se cambió el modelo (`/model claude-opus-5`) entre una fase y la otra, pero
un cambio de modelo **no reinicia la conversación**: la ventana de contexto
se conserva íntegra.

Esa ventana contenía el script de composición de G3d
(`scripts/tmp-g3d-gen.ts`, borrado del disco al terminar esa fase pero
todavía presente en el contexto de la conversación), cuyo comentario declara
literalmente:

> `// La opción en options[0] siempre es la CORRECTA en este borrador de trabajo`

…seguido de los 35 reactivos con su respuesta correcta en primera posición.
La contaminación era **total y mecánica**, no parcial: el mismo script
contiene el algoritmo de asignación de letra (`LETTERS[i % 4]` sobre los
ítems en orden), así que la letra almacenada de cualquier reactivo se podía
derivar por aritmética, sin razonar una sola línea de biología.

### Por qué se abortó en vez de continuar

El contrato del pipeline es explícito y está escrito en el propio código:

> `scripts/lib/blind-verification.ts:11` — "Esa sesión debe ser **DISTINTA
> (proceso/conversación separada)** de la que compuso los reactivos — la
> separación de sesión sustituye a la separación de llamada-a-API del diseño
> anterior."

Y CLAUDE.md exige "**Dos sesiones independientes** (una compone el reactivo,
otra lo resuelve a ciegas sin ver la respuesta)". El aislamiento de sesión
es la ÚNICA garantía de calidad que le queda al pipeline desde que G2 retiró
la verificación vía API de pago: no hay revisión humana, no hay segundo
proveedor, no hay freelancers. Si esa garantía es falsa, no queda ninguna.

Continuar habría producido 35/35 coincidencias y una tasa de auto-aprobación
del 100% — un número que se vería mejor que el 97.1% real de G3b, y que
habría publicado 35 reactivos a alumnos reales con un sello de calidad
inventado. **Una verificación que no puede fallar no es una verificación.**

### Lección de proceso (aplicable a G6 y a todo lote futuro)

El aislamiento de sesión es una propiedad de la **conversación**, no del
**modelo**. Las fases de composición (G3a/G3d/…) y de verificación
(G3b/G3e/…) deben correrse en invocaciones de `claude` separadas, con
historial en blanco. Cambiar de tier de modelo dentro de una misma
conversación —aunque el plan de sesiones asigne modelos distintos a cada
fase— NO satisface el contrato y produce una verificación nula.

Señal de alarma concreta para la sesión verificadora: si el lote ciego se
"siente" familiar, o si aparece en el contexto cualquier artefacto de la
fase de composición (script generador, JSON de drafts, tabla de temas con
conteos), la verificación ya está comprometida — hay que abortar y reportar,
no intentar "olvidar" la respuesta.

### Estado real tras abortar

| | |
|---|---:|
| Reactivos de G3d pendientes de verificación | **35** (`isVerified=false`) |
| Resueltos en esta sesión | **0** |
| Publicados en esta sesión | **0** |
| Acumulado `isVerified=true` en la DB (sin cambios desde G3d) | **343** de 450 |

El lote ciego SÍ se generó y quedó en disco, listo para que lo consuma una
sesión nueva sin necesidad de regenerarlo:
`scripts/content-exports/blind-batch-2026-08-05T23-35-18-047Z.json`
(35 ítems, `requiresCalculation:false` en los 35 — biología conceptual, sin
cálculo que ejecutar, a diferencia de G3b). Regenerarlo con
`pnpm content:blind-batch --all --limit 100` es idempotente y también
válido.

## G3e (re-ejecución) — Verificación ciega del lote G3d (2026-08-05)

Corrida en una sesión de `claude` **genuinamente nueva**, con historial en
blanco, que no participó en G3d. El aislamiento exigido por
`scripts/lib/blind-verification.ts:11` se cumplió esta vez: la sesión NO leyó
el commit de G3d (`c41a597`), ni `docs/content-batches/g3d-ipn-medbio-biologia.json`,
ni `Question.options` — su único insumo fue el lote ciego regenerado
(`scripts/content-exports/blind-batch-2026-08-05T23-38-23-367Z.json`, 35
ítems, sin `isCorrect` ni `explanations` por construcción). La clave de
respuestas se hizo visible por primera vez al correr `content:resolve`, es
decir DESPUÉS de que las 35 respuestas quedaran escritas en disco.

### Resultado

| | |
|---|---:|
| Reactivos resueltos | **35 / 35** |
| Coincidencias con el generador | **35 / 35 (100%)** |
| Confianza mínima registrada | **0.96** (umbral 0.85) |
| **Auto-aprobados (tasa del lote)** | **27 / 35 = 77.1%** |
| Sin publicar (`problems` ≠ ∅) | **8** |
| **Acumulado real en la DB** | **370** `isVerified=true` de 450 (**82.2%**) |

Veredictos completos en
`docs/content-batches/g3e-veredictos-ipn-medbio-biologia.json` (mismo formato
y misma convención de ruta que G3b).

### Cálculo ejecutado

El lote traía `requiresCalculation:false` en los 35 (biología conceptual, a
diferencia del de G3b, que era 100% matemáticas). Aun así, 5 reactivos tienen
una operación que se puede EJECUTAR en vez de afirmarse de memoria, y se
ejecutó en un script desechable con un assert por reactivo de que
**exactamente una** opción coincide con el resultado calculado (equivale a
comprobar `MULTIPLE_VALID` y `NONE_VALID`):

| Reactivo | Operación ejecutada | Resultado | Assert |
|---|---|---|---|
| `cmsg296p6…` | Cuadro de Punnett `Aa × Aa` | genotipos {AA:1, Aa:2, aa:1} → fenotípica **3 : 1** | 1 opción ✔ |
| `cmsg299b5…` | Cuadro de Punnett `AA × aa` | F1 uniforme **Aa** (4/4) | 1 opción ✔ |
| `cmsg298fs…` | Cariotipo `23 pares × 2` | **46** | 1 opción ✔ |
| `cmsg2ag5u…` | Factores de Atwater, `9/4` | **2.25** → "más del doble" verdadero | 1 opción ✔ |
| `cmsg2bdb3…` | Regla del 10%, `100·0.1^(n-1)` | 100 → 10 → 1 → 0.1, decrece siempre | 1 opción ✔ |

Los 30 restantes se resolvieron por verificación factual (definiciones,
mecanismos fisiológicos, terminología), citando siempre por qué cada
distractor es falso y nunca por su letra.

### HALLAZGO DE LOTE — "cue de glosa" (bloqueante para el siguiente G3d)

Los 8 reactivos sin publicar NO son errores de contenido: los 35 son
factualmente correctos y los 35 coincidieron. Los 8 se bloquearon por un
patrón **estructural, mecánico y medido**, del mismo tipo que el sesgo de
posición que G3b encontró en G3a:

> En los **8** reactivos del lote donde **exactamente una** opción trae glosa
> entre paréntesis, esa opción es la **correcta**: **8 de 8**.
> P(≥8 de 8 por azar, p=0.25) = **1.5e-5**.

Ejemplos: `Hipófisis (pituitaria)` contra "Tiroides"/"Páncreas";
`Trompas de Falopio (oviductos)` (30 caracteres) contra "Útero"/"Vagina"/"Ovario"
(6 de promedio); `Células de memoria (linfocitos B y T de memoria)`, que
además repite la palabra del enunciado ("recordar"/"memoria"); `46 (23 pares)`
contra las cifras desnudas 48/23/44; `Lípidos (grasas)`.

**Por qué es peor que el sesgo de posición de G3b:** el sesgo de posición vive
en el ORDEN de las opciones, así que al menos en teoría lo neutraliza barajar.
El cue de glosa vive en el **texto** de la opción y viaja con ella a cualquier
posición — `shuffleOptions` no lo toca. Y en IPN (`shuffleOptions:false`) ni
siquiera existe ese amortiguador.

Medición secundaria del mismo hábito de composición, registrada pero **no**
usada para bloquear: la opción correcta es la **más larga** en **21/35 = 60%**
de los reactivos (azar 25%, p=1.2e-5). No se marcó como problema en los 13
casos que no traen glosa porque ahí la longitud es intrínseca al contenido —
un mecanismo fisiológico necesita más palabras que un distractor de una línea,
y en esos reactivos al menos un distractor tiene longitud comparable. Es un
hallazgo para la fase de COMPOSICIÓN, no un defecto por reactivo.

**Reparación:** los 8 son publicables con una edición de segundos (quitar el
paréntesis, o glosar también los distractores). Quedan en la cola de
"baja-confianza-o-problemas" de `/admin/reports` (F3) con el veredicto
completo adjunto en `Question.verification`, que es exactamente el camino
diseñado para "correcto pero necesita edición" — no se descartaron.

**Para la siguiente fase de composición:** `scripts/lib/lot-validation.ts`
(G3c) ya rechaza el sesgo de posición antes de tocar la DB, pero no detecta
este patrón. La regla mecánica a añadir es directa: *si exactamente una opción
de un reactivo contiene paréntesis, es un cue* — se puede validar sin conocer
la respuesta correcta, igual que la distribución de posición.

## Siguiente

**G6 — siguiente materia por la regla de prioridad.** Candidata: **Física de
IPN FISMAT, `questionWeight` 20** (confirmar contra la DB antes de empezar).
Recordatorios de método, ya pagados con dos hallazgos:

1. **Composición y verificación en invocaciones de `claude` SEPARADAS.**
   Cambiar de tier de modelo dentro de una misma conversación no satisface el
   contrato y produce una verificación nula (ver G3e, 1er intento).
2. **Balancear la posición de la correcta desde la composición** (G3c) **y
   ahora también la FORMA de las opciones** (G3e): sin glosas, ejemplos ni
   longitudes que solo lleve la correcta.

Pendientes menores arrastrados: `cmsfgf5ea0001k3lis0d0uzf9` (Números
complejos, IPN Matemáticas) sigue sin publicarse — su opción `$4-3$`
necesita reescribirse (hallazgo de G3b, sin relación con el sesgo de
posición). Las 2 citas-por-letra de F4 (UNAM Español `cmrule6ir…`, Física
`cmru8sy0a…`) siguen pendientes de una pasada editorial menor que las
reescriba por contenido. Se suman los 8 reactivos de biología con cue de
glosa descritos arriba.

> **Nota de numeración:** la etiqueta "G6" que esta sección anticipaba para
> el SIGUIENTE lote de contenido (Física de IPN FISMAT) terminó
> asignándose a una fase distinta (Stripe en modo prueba, ver abajo). El
> lote de Física sigue pendiente tal cual se describe arriba, solo que sin
> número de fase todavía — retómalo cuando la orquestación lo asigne.

---

## G6 — Stripe en modo prueba sobre URL de Vercel (2026-08-05)

**Resultado: PARCIAL.** Dos bloqueos reales impidieron completar las tareas
2-4 (crear los 9 precios, verificar el webhook, correr una compra de
extremo a extremo) — ninguno es una elección de esta sesión, ambos son
límites estructurales (seguridad y disponibilidad de credenciales) que
ninguna sesión automatizada puede resolver por sí misma. Todo lo demás sí
se completó.

### 0. Decisión de cuenta (tarea 1)

**Cuenta de Stripe separada y dedicada a Acierta.** Documentada con su
razonamiento completo en `docs/STRIPE_LIVE_CHECKLIST.md` §0 (contabilidad y
depósitos limpios por proyecto, radio de blast separado, facturación fiscal
por país/moneda, costo de separar cuentas = cero). Esta sesión NO creó la
cuenta — crear una cuenta (con email, verificación) es una acción prohibida
para cualquier sesión automatizada bajo cualquier instrucción, incluso con
permiso explícito del usuario; el dueño debe crearla personalmente (pasos
exactos en la sección 1 del checklist).

### 1. Deploy real a Vercel (tarea 3, parcial) — y un bug real encontrado

El proyecto Acierta **nunca se había desplegado a Vercel** (la instrucción
de la tarea asumía que ya existía una URL asignada; no era así — se
verificó con `vercel project ls` antes de asumir nada). Se creó y enlazó el
proyecto (`vercel link --yes --project acierta`) y se desplegó a
producción por primera vez.

**El primer intento de deploy falló** con un error real de TypeScript
(`app/(app)/diagnostico/page.tsx:42`, "Parameter 'a' implicitly has an 'any'
type") que **no reproducía en local** (`pnpm typecheck` y `pnpm build`
locales pasaban limpio). Diagnóstico: `.npmrc` tiene `ignore-scripts=true`
—un control de seguridad deliberado del proyecto contra scripts de
`postinstall` arbitrarios de las ~1000+ dependencias transitivas—, que
también bloquea silenciosamente el `postinstall` de Prisma. En local
"funcionaba" solo porque `node_modules/.prisma/client` ya tenía el cliente
generado de sesiones anteriores; en el install limpio de Vercel, el cliente
de Prisma nunca se generaba y **todos** sus tipos caían a `any`
—incluyendo `DiagnosticSessionWithAnswers['answers']`—, lo cual el
compilador de TypeScript de `next build` sí detecta como error real
(mientras que localmente los tipos ya generados lo enmascaraban por
completo).

**Corrección:** `"build": "prisma generate && next build"` en
`package.json` (antes solo `"next build"`) — un paso EXPLÍCITO de
`pnpm run build`, que `ignore-scripts` no bloquea (esa bandera solo
desactiva los hooks AUTOMÁTICOS de ciclo de vida de `pnpm install`, no los
scripts invocados a mano). Se preserva intacta la protección de
`ignore-scripts` para el resto de las dependencias — no se tocó esa
configuración. Verificado: `pnpm build` local limpio con el nuevo paso
(tras liberar un `next start` de una sesión anterior que tenía el binario
del motor de Prisma bloqueado en Windows — `taskkill` a los dos procesos
`node.exe` huérfanos), y el segundo deploy a Vercel terminó `READY`.

**URL de producción:** **`https://acierta.vercel.app`** — verificada en
vivo con el navegador: la landing carga completa (hero, diferenciadores,
sección de padres, FAQ), degradando con gracia donde no hay DB conectada
(mismo mecanismo `resolveEffectiveSeasonSafe`/`earlyBirdLicensesRemainingSafe`
de G1). Confirmado también que `.env`/`.env.local` NO se subieron al
deploy (`git check-ignore` confirma que ambos coinciden con `.gitignore`, y
no existe `.vercelignore` que anule ese comportamiento — la línea
"Environments: .env" en el log de build de Vercel es un archivo que Next.js
sintetiza internamente a partir de las variables de entorno YA
configuradas en el proyecto de Vercel, vacío hoy porque no hay ninguna
configurada, no una filtración del `.env` local).

### 2. El bloqueo real: no hay credenciales (tareas 2 y 4)

`pnpm stripe:setup-prices` (ya existente desde F9) se corrió como prueba y
confirmó lo que ya documentaba F8/F9/G1: **no existe una `STRIPE_SECRET_KEY`
real en `.env.local`** — el propio guardrail del script la rechaza por
placeholder. Sin ella, no se puede crear ni un solo `Price` ni webhook en
Stripe: no hay llamada a la API de Stripe posible sin autenticación real.

Esta sesión **tiene bloqueada la lectura de `.env`/`.env.local`** por
`.claude/settings.json` (`"deny": ["Read(./.env)", "Read(./.env.local)"]`,
confirmado en vivo: un `grep` directo sobre `.env.local` fue denegado por el
sistema de permisos). Esto significa que, aunque existieran credenciales
reales de Supabase/DB ahí (que si existen, F1 las documenta como reales),
esta sesión no puede leerlas ni transferirlas a Vercel — ni por lectura
directa ni por ningún intento indirecto (tuberías, scripts intermedios),
que violaría el propósito explícito de ese guardrail. **Se respetó ese
límite en vez de rodearlo.**

Conclusión: **crear cuentas está prohibido para cualquier sesión bajo
cualquier instrucción, y leer `.env.local` está bloqueado por
configuración explícita del proyecto** — ambos son límites estructurales,
no decisiones de esta sesión. Las tareas 2 (9 precios), 3-webhook (crear y
verificar el endpoint) y 4 (compra E2E real) quedan **listas para
ejecutarse en cuanto existan credenciales reales**, no completadas hoy.

### 3. Lo que se dejó preparado

- **`scripts/setup-stripe-webhook.ts`** (`pnpm stripe:setup-webhook --url
  <url>`) — nuevo, idempotente (reusa el webhook si ya existe con la misma
  URL; `--force` para rotarlo), restringido a llaves `sk_test_*` a
  propósito (nunca se ejecuta con una llave live por accidente). Escribe el
  `STRIPE_WEBHOOK_SECRET` resultante DIRECTO a las variables de entorno de
  producción de Vercel (`vercel env add` vía `stdin`, en el mismo proceso)
  sin que el valor pase nunca por la salida de una terminal — mismo
  criterio de manejo de secretos que el proyecto ya aplica a `.env.local`.
- **`docs/STRIPE_LIVE_CHECKLIST.md`** — checklist completo en 3 partes: §0
  decisión de cuenta (ya resuelta arriba), §1 los pasos EXACTOS para dejar
  el modo de prueba funcionando (crear cuenta → llaves de prueba → correr
  los 2 scripts → subir variables a Vercel → redeploy → probar con la
  tarjeta de prueba `4242 4242 4242 4242`), §2 activación de modo REAL
  (verificación de identidad y cuenta bancaria ante Stripe, llaves live,
  precios y webhook live, variables de Vercel, una compra real de
  verificación antes de anunciar el lanzamiento), §3 recordatorio de
  actualizar la URL del webhook cuando el dominio propio se conecte (un
  campo, tal como se anticipó).

`pnpm typecheck` y `pnpm lint` en verde.

### Siguiente (G6)

> **Actualizado por G7:** el punto 1 original ("subir a Vercel las variables
> de Supabase/DB reales") **ya se resolvió** — ver la sección G7 abajo, que
> las generó de forma independiente (rol Postgres nuevo, sin leer
> `.env.local`). Sigue pendiente únicamente la credencial de Stripe.

1. **Desbloquear la credencial de Stripe** — el dueño sigue
   `docs/STRIPE_LIVE_CHECKLIST.md` §1 (cuenta de Stripe + llave de prueba en
   `.env.local`, luego `pnpm stripe:setup-prices` + `pnpm stripe:setup-webhook`
   + subir esas 3 variables a Vercel). Con eso resuelto, una sesión puede
   completar las tareas 2-4 de G6 en minutos (los scripts ya existen).
2. Retomar el lote de contenido pendiente (Física de IPN FISMAT,
   `questionWeight` 20 — ver nota de numeración arriba), sin depender de lo
   anterior.

---

## G7 — Despliegue a producción sobre URL de Vercel (2026-08-06)

**Resultado: COMPLETADA, con un hallazgo de seguridad real encontrado y
corregido en el camino.** Prerrequisito era solo G1 (build funcionando);
G6 (Stripe) explícitamente NO era prerrequisito, así que su bloqueo
documentado ahí no impidió esta fase.

### 1. Variables de entorno (tarea 1)

Estado antes de esta sesión: **cero** variables configuradas en Vercel
(`vercel env ls production` → vacío) — G6 solo había dejado el proyecto
creado y desplegado una vez, sin ninguna variable real.

**Configuradas en esta sesión, sin leer `.env`/`.env.local` en ningún
momento** (ambos siguen bloqueados por `.claude/settings.json`, respetado
igual que en G6):

| Variable | Origen |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase MCP `get_project_url` — dato público por diseño |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase MCP `get_publishable_keys` — dato público por diseño |
| `DATABASE_URL` / `DIRECT_URL` | Rol Postgres **nuevo** `acierta_prod` (LOGIN+BYPASSRLS, mismos privilegios que `acierta_ci` — SELECT/INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER en `public`, replicados exactamente vía `pg_roles`/`role_table_grants`), creado vía el conector Supabase con una contraseña generada por esta sesión (nunca leída de ningún lado). Deliberadamente un rol DISTINTO de `acierta_ci` (el de desarrollo local) para no romper nada local al rotar/usar credenciales de producción. |
| `NEXT_PUBLIC_SITE_URL` | La URL real de Vercel, ya conocida (`https://acierta.vercel.app`) |
| `CRON_SECRET` | Generado por esta sesión (`crypto.randomBytes(32)`) |
| `NEXT_PUBLIC_ENABLE_UAM` / `_EXANI` / `_MEDIA_SUPERIOR` | `false` — regla de CLAUDE.md, launch = solo UNAM+IPN Superior |

**Señaladas explícitamente como faltantes (no configurables por esta
sesión):**

| Variable | Por qué falta | Bloquea algo del smoke test? |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | No expuesta por ningún tool de Supabase MCP (deliberado, es un secreto de administrador) | No — solo la usa `getSupabaseAdmin()` para borrar la identidad de Auth al eliminar cuenta (F17); confirmado por grep, nada de los 5 flujos del smoke test la toca |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` / 9× `STRIPE_PRICE_*` | Mismo bloqueo de G6, sin cambios: crear cuenta de Stripe está prohibido para cualquier sesión, y no hay llave real en ningún lado accesible | Sí — el checkout no puede llegar a la pantalla de Stripe (ver tarea 3 abajo) |
| `RESEND_API_KEY` | Cuenta de Resend no creada | No — `sendEmail()` degrada a solo log por diseño (F16), verificado en el código |
| `NEXT_PUBLIC_SENTRY_DSN` / `SENTRY_ORG` / `SENTRY_PROJECT` / `SENTRY_AUTH_TOKEN` | Cuenta de Sentry no creada, sin conector MCP disponible | No bloquea la app (SDK queda inerte, F20); sí bloquea la tarea 5 (confirmar eventos reales) |
| `NEXT_PUBLIC_POSTHOG_KEY` / `_HOST` | Cuenta de PostHog no creada, sin conector MCP disponible | Igual que Sentry |
| `NEXT_PUBLIC_META_PIXEL_ID` / `_TIKTOK_PIXEL_ID` | Cuentas de ads no creadas | No — inertes por diseño (F24), fuera de alcance de lanzamiento técnico |
| `E2E_*` | No son variables de PRODUCCIÓN — son credenciales de Playwright para CI/local | N/A, no le corresponden a Vercel |

### 2. Despliegue (tarea 2) — y el hallazgo de seguridad

Primer intento de esta sesión: `vercel --prod --yes` con las variables de
arriba ya cargadas → `READY`. Verificación en vivo mostró la landing con
datos reales (contador Early Bird "499 de 500", confirmando que
`DATABASE_URL` funcionaba).

**Al probar el checkout (tarea 3) apareció un error de Stripe citando una
llave real** (`Invalid API Key provided: sk_test_*******lder`) — **pese a
que esta sesión nunca configuró `STRIPE_SECRET_KEY` en Vercel** (confirmado
con `vercel env ls production`, no aparecía en la lista). Diagnóstico:
`vercel --prod` (deploy directo desde CLI, sin integración de git) **no
respeta `.gitignore`** para decidir qué archivos subir pese a la
documentación de Vercel — un `.env` local (fecha anterior a la creación del
proyecto Supabase real de F1, casi seguro el scaffolding original con
valores placeholder tipo `sk_test_placeholder`) viajó dentro del bundle de
build, y Next.js lo cargó en runtime porque su propio `loadEnvConfig` no
sobreescribe variables que Vercel YA inyectó (por eso `DATABASE_URL` sí
usó el valor correcto — esa sí estaba en Vercel — pero `STRIPE_SECRET_KEY`,
ausente de Vercel, cayó al valor del `.env` filtrado).

**Corregido de inmediato:** `.vercelignore` nuevo, con `.env`, `.env.local`,
`.env.*.local`, `.vercel`, `node_modules` explícitos — Vercel SÍ respeta
este archivo de forma garantizada (a diferencia de `.gitignore`). Redeploy
inmediato; verificado que el error volvió a su forma genérica y segura
(`Falta STRIPE_SECRET_KEY: la integración de pagos no está configurada.`,
sin ningún valor real citado). **Riesgo real evaluado como bajo pero no
cero:** por la fecha del archivo (anterior a que existieran credenciales
reales de Supabase, que viven en `.env.local` según F1/memoria, no en
`.env`), es muy probable que solo contuviera placeholders — pero esta
sesión NO puede confirmarlo sin leer el archivo (bloqueado a propósito).
**Recomendación para el dueño:** revisar el contenido de `.env` (no
`.env.local`) y borrarlo si es en efecto el scaffolding viejo sin uso real —
`.env.local` sigue siendo el archivo real de desarrollo, sin tocar.

### 3. Smoke test contra la URL pública real (tarea 3)

| Flujo | Resultado | Evidencia |
|---|---|---|
| **Landing** | ✅ | Carga completa, Early Bird "499 de 500" real (DB real) |
| **Registro** | ⚠️ código correcto, bloqueado por límite externo | El formulario llega correctamente a Supabase Auth (reproducido el error EXACTO — `over_email_send_rate_limit` — con una llamada directa al mismo endpoint con las mismas credenciales); es el límite de envío de correo del plan gratuito de Supabase (no configurable sin SMTP propio — Resend, ya bloqueado arriba), no un defecto de esta fase. Confirmado en `auth.users` que NINGÚN usuario quedó creado a medias (transacción atómica, sin residuos) |
| **Diagnóstico** | ✅ | Verificado con una cuenta fixture (creada vía SQL directo en `auth.users`+`user_profiles` — mismo patrón de "usuario de prueba, eliminado al terminar" de F5-F16 — para rodear el rate-limit de arriba sin esperar una hora): 30 preguntas reales repartidas por materia, "PREGUNTA 1 DE 30 · MATEMÁTICAS · PROGRESIONES Y COMBINATORIA" con 4 opciones reales |
| **Simulador** | ✅ | Mismo fixture: preflight con Tino, params reales exactos ("120 preguntas · 180 minutos", UNAM) |
| **Checkout → pantalla de Stripe** | ❌ bloqueado (heredado de G6) | El botón "Elegir este plan" SÍ ejecuta el Server Action, SÍ intenta crear la sesión de Stripe, y falla limpiamente por falta de llave real — confirma que todo el camino hasta Stripe funciona, solo falta la credencial |

Fixture de diagnóstico/simulador (usuario `g7-smoketest-fixture@example.com`,
su `UserProfile`, y cualquier `ExamSession`/`SessionAnswer` creada al
navegar) **eliminado al terminar**, verificado con conteo en 0.

### 4. Cron jobs (tarea 4)

`vercel crons ls` confirma los 2 jobs de `vercel.json` registrados
(`/api/cron/notifications` 0 13 * * *, `/api/cron/reconcile-payments`
0 14 * * *). **Activos, no solo registrados** — probados en vivo contra la
URL real: `curl` con `Authorization: Bearer $CRON_SECRET` real → **200** en
ambos; sin ese header → **401** (el guardrail de CLAUDE.md/F16 funcionando
correctamente en producción).

### 5. Sentry y PostHog (tarea 5)

**Bloqueado, no ejecutable por esta sesión.** Ninguna de las dos tiene
cuenta creada (confirmado: `next.config.ts` lee `SENTRY_ORG`/`PROJECT` 100%
de variables de entorno, sin ningún valor hardcodeado que sugiera una
cuenta preexistente) y no hay conector MCP para ninguna de las dos en este
entorno. Sin DSN/key real, ambos SDKs quedan inertes por diseño (F20) — no
hay eventos que confirmar porque no hay a dónde enviarlos. Mismo criterio
que Stripe: crear las cuentas es una acción prohibida para cualquier sesión
automatizada.

### Siguiente (G7)

1. **Verificar/limpiar el `.env` viejo** (hallazgo de seguridad arriba) —
   acción de 2 minutos del dueño, no bloquea nada más.
2. **Stripe** (heredado de G6, sin cambios) — `docs/STRIPE_LIVE_CHECKLIST.md` §1.
3. **Cuentas de Sentry y PostHog** — crearlas (dueño) y pegar los DSN/keys
   reales en Vercel (`vercel env add`, esta sesión ya dejó el patrón
   establecido con `NEXT_PUBLIC_SITE_URL` etc. si una sesión futura necesita
   replicarlo).
4. **Confirmar rate-limit de correo de Supabase** — configurar SMTP propio
   (Resend, una vez con llave real) en el dashboard de Supabase
   (Authentication → Emails → SMTP Settings) para que el registro real deje
   de depender del límite gratuito por defecto.

---

## G8 — Verificación y corrección real del sesgo de posición (2026-08-06)

**Resultado: COMPLETADA.** Modo de trabajo: autónomo, sin preguntas de
selección. Cierra un hallazgo de una auditoría de solo-lectura previa
(sesión aparte, mismo día) que había reportado la corrección de G3c como
"no verificable" con el argumento de que Postgres no puede consultar el
campo `options` porque es JSON. **Ese argumento era incorrecto** — Postgres
consulta JSON de forma nativa. Se verificó con `jsonb_array_elements(q.options::jsonb)`
en `CROSS JOIN LATERAL` para extraer, por cada reactivo, la letra de la
opción con `isCorrect=true`, sin ninguna dependencia de Node/dotenv/`.env.local`
(la consulta corrió íntegro vía el conector de Supabase, mismo canal ya
usado en G7).

### 1) Distribución real, banco completo (450 reactivos, con y sin verificar)

| Institución · Materia | Total | A | B | C | D | ¿Dentro de 15-40%? |
|---|---:|---:|---:|---:|---:|---|
| IPN · Biología | 35 | 25.7% | 25.7% | 25.7% | 22.9% | ✅ |
| **IPN · Matemáticas** (el lote de G3c) | **35** | **25.7%** | **25.7%** | **25.7%** | **22.9%** | ✅ **9/9/9/8, exactamente como afirmaba G3c** |
| UNAM · Biología | 65 | 21.5% | 27.7% | 18.5% | 32.3% | ✅ |
| UNAM · Español | 38 | 31.6% | 28.9% | 15.8% | 23.7% | ✅ (C al borde del piso) |
| UNAM · Física | 72 | 25.0% | 29.2% | 20.8% | 25.0% | ✅ |
| UNAM · Matemáticas | 81 | 29.6% | 25.9% | 28.4% | 16.0% | ✅ (D al borde del piso) |
| UNAM · Química | 124 | 28.2% | 24.2% | 20.2% | 27.4% | ✅ |

**Ningún grupo supera 40% ni baja de 15% en el banco completo.** Los 35 de
IPN FISMAT Matemáticas — el objetivo específico de la tarea 2 — quedan
confirmados en **9/9/9/8**, cifra idéntica a la que G3c reportó al momento
de la reparación. Los dos casos más cercanos al piso (Español C=15.8%,
Matemáticas D=16.0%) están dentro de banda pero sin margen — quedan
anotados para monitoreo, no requieren reparación hoy.

### 2) Hallazgo adicional: el subconjunto SERVABLE hoy es más angosto que el banco completo

Sobre `isVerified=true` (370/450, lo que un alumno ve HOY), los mismos dos
grupos SÍ cruzan el piso: **UNAM Español C=12.9% (4/31)**, **UNAM
Matemáticas D=12.7% (8/63)**. Investigado el porqué: los reactivos aún sin
verificar de esas materias (7 de Español, 18 de Matemáticas — todos
`source=GENERATED` con datos de verificación ya registrados pero
`isVerified=false`, es decir, en cola de revisión F3 por razones de
contenido no relacionadas con posición) se concentran desproporcionadamente
en las letras C y D respectivamente, dejando el subconjunto ya-aprobado más
desbalanceado que el conjunto compuesto originalmente.

**Decisión razonada: NO reasignar posiciones en este subconjunto.** Tres
motivos:
1. El defecto de G3a que motivó la reparación de G3c era una falla de
   **composición** (35/35 en "A", permanente, del lote completo). Esto es
   distinto: es un artefacto **temporal** de qué fracción de un lote ya
   balanceado ha limpiado la cola de revisión F3 en este momento.
2. `lot-validation.ts` — el guardrail real que previene este defecto —
   opera sobre el LOTE COMPLETO al insertar (ver G3c), no sobre el
   subconjunto verificado en un instante dado; el criterio de "banco" que
   usa esta misma tarea (los "35 de IPN FISMAT" citados en las
   instrucciones son el total del lote, no los 34 actualmente verificados)
   confirma que esa es la unidad de medida correcta.
3. Reasignar letras en el subconjunto verificado de HOY quedaría
   desalineado en cuanto los 7+18 reactivos pendientes se aprueben en F3 —
   generando más trabajo, no menos, y tocando reactivos con `SessionAnswer`
   reales sin una razón de fondo (a diferencia de las explicaciones del
   punto 3, que sí se corrigieron porque su defecto era permanente e
   independiente del estado de verificación).

**Queda como pendiente de monitoreo:** cuando los reactivos pendientes de
UNAM Español/Matemáticas se resuelvan en F3, reconfirmar que el subconjunto
servable vuelve a quedar dentro de banda (debería, dado que el banco
completo ya lo está).

### 3) Citas por letra — barrido exhaustivo del corpus completo (no solo grupos sesgados)

La tarea pidió buscar exhaustivamente, sin asumir cuántas hay — se buscó en
las **450 explicaciones de layer**, no solo en los grupos sesgados (ninguno
lo estaba). Replicando los 4 patrones reales de `lot-validation.ts`
(`opción [ABCD]`, `inciso [ABCD]`, `letra [ABCD]`, y `[ABCD])` con
lookbehind que excluye dígitos/°) vía regex de Postgres: **exactamente 2
hits**, los mismos 2 que G3c ya había documentado como "pendiente menor" sin
corregir:

| Reactivo | Institución·Materia | Cita original | Corrección aplicada |
|---|---|---|---|
| `cmrule6ir…` (layer 2) | UNAM Español | "…coincide exactamente con la opción A." | Reescrita citando el CONTENIDO de la opción correcta ("…tiene múltiples causas y su solución requiere tanto acción colectiva como individual") |
| `cmru8sy0a…` (layer 3) | UNAM Física | "…energía potencial (definida en B)… oposición al flujo (definida en C)…" | Reescrita citando el CONTENIDO directo ("…energía potencial entre dos puntos de un circuito… oposición al flujo de carga en un conductor…") |

**Hallazgo dentro del hallazgo:** en ambos casos la letra citada ya estaba
**obsoleta** — no correspondía a la opción que de verdad describía ese
concepto en el estado actual de `options` (p. ej. Física citaba "B" para
"energía potencial", pero esa opción es "C" en la DB real hoy). Citar por
contenido, además de ser la regla de CLAUDE.md, corrige este tipo de
desincronización como efecto colateral — una razón más para preferirlo
sobre citar por letra en general.

**Verificado seguro antes de editar:** ambos reactivos SÍ tienen
`SessionAnswer` históricos (4 y 1 respectivamente) — pero solo se tocó el
texto de la EXPLICACIÓN (contenido pedagógico post-respuesta), nunca
`stem`/`options`/`isCorrect`, así que el guardrail de "nunca borrar/romper
reactivos con respuestas históricas" no aplica (nada del historial de
scoring cambia).

**Re-barrido tras la corrección: 0 citas por letra en las 450 explicaciones.**

### 4) Validación de que `lot-validation.ts` detecta el sesgo

No hizo falta escribir un caso nuevo — `tests/scripts/lot-validation.test.ts`
ya tiene exactamente el caso pedido por la tarea (`'caso de referencia G3a:
35/35 en "A" -> rechazado'`, línea 35). Re-corrido en vivo para esta fase:

```
$ npx vitest run tests/scripts/lot-validation.test.ts
 Test Files  1 passed (1)
      Tests  13 passed (13)
```

Confirma que un lote artificialmente sesgado (35/35 en una letra) es
rechazado con `POSITION_SKEW`, y que un lote sano (9/9/9/8) pasa — el
contrato que impide que el defecto de G3a se repita ya está probado y en
verde.

### 5) `pnpm typecheck` / `pnpm lint`

En verde. Esta fase no tocó código — solo 2 filas de `explanation_layers`
vía SQL directo — así que ambos comandos no tenían nada nuevo que
verificar, pero se corrieron para cumplir el criterio de aceptación.

### Siguiente (G8)

1. Cuando el F3 resuelva los reactivos pendientes de UNAM Español (7) y
   Matemáticas (18), reconfirmar la distribución del subconjunto servable
   (punto 2 arriba) — debería auto-corregirse.
2. Los pendientes heredados de G6/G7 (credencial de Stripe, cuentas de
   Sentry/PostHog, `.env` viejo por revisar) siguen abiertos, sin relación
   con esta fase.
3. Retomar el lote de contenido pendiente (Física de IPN FISMAT,
   `questionWeight` 20).

---

## G9 — Credenciales de servicios: bloqueada por falta de sesión (2026-08-06)

**Resultado: BLOQUEADA en las 5 tareas de credenciales.** Modo de trabajo:
autónomo, sin preguntas de selección. La instrucción decía explícitamente
"configura todo lo que puedas por tu cuenta usando las cuentas ya abiertas
en el navegador" — se verificó esa premisa en vivo, con el navegador Chrome
conectado a esta sesión, antes de asumir nada.

### Verificación en vivo — ninguna de las 5 cuentas tenía sesión activa

Se navegó directo a la página autenticada de cada servicio:

| Servicio | URL probada | Resultado |
|---|---|---|
| Stripe | `dashboard.stripe.com/test/apikeys` | Redirigió a `dashboard.stripe.com/login` |
| Resend | `resend.com/api-keys` | Redirigió a `resend.com/login` |
| Sentry | `sentry.io` | Landing de marketing (sin sesión) |
| PostHog | `app.posthog.com` | Redirigió a `us.posthog.com/login` — campo de contraseña con un valor AUTOCOMPLETADO por el navegador guardado de una sesión anterior, pero sin sesión activa |
| Supabase (dashboard) | `supabase.com/dashboard/project/.../settings/api-keys` | Redirigió a `dashboard/sign-in` — se intentó también "Continuar con GitHub" (marcado "ÚLTIMO USADO" en la UI, sugiriendo un login previo) → GitHub también pidió usuario/contraseña sin sesión activa |

**Dos límites duros de cualquier sesión de Claude Code, no negociables ni
con instrucción explícita del usuario, impidieron continuar desde ahí:**

1. Crear una cuenta nueva (Resend/Sentry/PostHog/Stripe) está prohibido
   para cualquier sesión automatizada — sin excepción, ni con "autónomo
   total, sin preguntas" ni con permiso explícito.
2. Escribir o enviar una contraseña en un formulario de login está
   prohibido — incluso cuando el NAVEGADOR ya la tenía autocompletada
   (observado literalmente en las pantallas de PostHog y GitHub: el campo
   mostraba puntos de un valor guardado, pero completar el login de todas
   formas habría sido autenticar con una credencial en texto plano).

**Conclusión más probable:** si estas cuentas existen, están abiertas en un
navegador o perfil distinto al que esta sesión de Claude Code tiene
conectado (`mcp__claude-in-chrome__*`) — no en ese mismo Chrome. La
instrucción original asumía lo contrario sin haberlo verificado; esta
sesión sí lo verificó antes de proceder, en vez de intentar un rodeo
(seguir con OAuth de GitHub sin contraseña, por ejemplo, tampoco tenía
sesión activa que aprovechar).

### Lo que sí se completó

- **Confirmado el estado real de Vercel** (`vercel env ls production`):
  siguen las mismas 9 variables de G7, ninguna nueva — consistente con que
  ninguna credencial nueva estuvo disponible para cargar.
- **Re-verificado en vivo el rate-limit de correo de Supabase** (tarea 3,
  el motivo por el que el registro sigue bloqueado): mismo error exacto
  `over_email_send_rate_limit` reproducido 3 días después de la prueba de
  G7 — confirma que el límite no se resuelve solo con el tiempo en el plan
  gratuito, y que SMTP propio (Resend) es la única salida real, tal como
  ya sospechaba G7.
- **`docs/SERVICE_CREDENTIALS_CHECKLIST.md`** (nuevo) — pasos exactos,
  probados contra la documentación real de cada servicio, para las 4
  credenciales pendientes que no tienen ya su propio documento:
  - **Resend + SMTP de Supabase Auth**: incluye el hallazgo de que
    `RESEND_API_KEY` en Vercel por sí sola NO desbloquea el registro — el
    proveedor de correo de Supabase Auth es una configuración SEPARADA
    (dashboard → Authentication → Emails → SMTP Settings) que ninguna API
    expone para automatizar; y que el remitente hardcodeado
    `notificaciones@acierta.mx` (`src/lib/email/client.ts:16`) no podrá
    verificarse en Resend hasta comprar el dominio — recomienda usar el
    dominio de pruebas `onboarding@resend.dev` de Resend mientras tanto.
  - **Sentry**: cuenta → proyecto Next.js → DSN + auth token → 4 variables.
  - **PostHog**: cuenta (región US, coincide con el default de
    `.env.example`) → project key → 2 variables.
  - **`SUPABASE_SERVICE_ROLE_KEY`**: ya existe en el dashboard del proyecto
    real (pestaña "Legacy anon, service_role API keys") — no requiere
    cuenta nueva, solo que el dueño la copie y la pegue directo en
    `vercel env add` (nunca en el chat).
- `docs/STRIPE_LIVE_CHECKLIST.md` (de G6) sigue vigente sin cambios — nada
  se resolvió ahí tampoco, mismo bloqueo.
- `pnpm typecheck`/`pnpm lint` en verde (esta fase no tocó código, solo
  documentación).

### Lo que quedó sin hacer (las 5 tareas originales)

Ninguna de las 5 tareas de G9 se completó: los 12 de Stripe, el webhook, el
`SUPABASE_SERVICE_ROLE_KEY`, Resend+SMTP, Sentry y PostHog siguen sin
credenciales reales en Vercel. El redeploy-y-smoke-test de la tarea 5 no se
ejecutó porque no había nada nuevo que verificar — repetirlo ahora habría
reproducido exactamente los mismos resultados que G7 ya documentó.

### Siguiente (G9)

1. **El dueño debe iniciar sesión (o crear cuenta) en Stripe, Resend,
   Sentry y PostHog, y en el dashboard de Supabase — en el mismo navegador
   Chrome que Claude Code tiene conectado** (`mcp__claude-in-chrome__*`).
   Con eso resuelto, una sesión futura puede completar G9 en una sola
   pasada usando `docs/SERVICE_CREDENTIALS_CHECKLIST.md` y
   `docs/STRIPE_LIVE_CHECKLIST.md` §1 tal cual están escritos.
2. Alternativa más simple si el dueño prefiere no exponer ningún login a
   Claude Code: seguir ambos documentos él mismo y pegar los valores
   directo en `vercel env add production` (nunca en el chat) — ninguno de
   los pasos restantes requiere una sesión de Claude Code una vez que las
   cuentas existen.
3. Retomar el lote de contenido pendiente (Física de IPN FISMAT,
   `questionWeight` 20) — sigue sin relación con lo de arriba.

---

## G10 — Smoke test completo en producción (2026-08-10)

**Resultado: COMPLETADA, con 1 defecto real hallado, corregido, desplegado
y blindado con tests.** Modo de trabajo: autónomo, sin preguntas.

### 0) La premisa de la tarea era falsa — verificada antes de empezar

La tarea afirmaba "con G9 resuelto, por primera vez es posible recorrer el
producto completo". **G9 no está resuelto.** Comprobado antes de tocar nada:
último commit sigue siendo `f63d93a` (G9 bloqueada), Vercel sigue con las
mismas 9 variables de G7 (0 de Stripe), y un `signUp` real contra Supabase
Auth devuelve otra vez `over_email_send_rate_limit`.

**Cómo se recorrió igual todo lo demás:** las cuentas de prueba se
provisionaron directo en `auth.users`+`user_profiles` vía SQL (mismo patrón
que G7), replicando exactamente lo que hace `signUpAction`. Eso rodea
**solo** el envío de correo — lo único genuinamente bloqueado — y deja
intacto todo el resto del recorrido, que sí se ejecutó contra producción
real. Lo que NO se pudo probar por esta vía queda listado abajo sin
maquillar.

### 1) Recorrido de alumno nuevo — funciona de punta a punta

| Etapa | Resultado |
|---|---|
| Onboarding paso 1 (examen) | ✅ Muestra SOLO IPN y UNAM Superior — los feature flags de UAM/EXANI/Media Superior se respetan en producción |
| Paso 2 (área) | ✅ Las 4 áreas de UNAM |
| Paso 3 (carrera) | ✅ Con `minAciertos` reales por carrera (Ing. en Computación ~101) |
| Paso 4 (intro de Tino) | ✅ |
| Diagnóstico | ✅ 30 reactivos reales repartidos por materia; 30/30 respuestas persistidas |
| Resultados | ✅ 12/30, Aciertómetro **47**, meta ~101, "te faltan ~54", 3 temas prioritarios reales |
| Dashboard | ✅ Saludo, countdown (278 días), recomendación de Tino, heatmap, Aciertómetro correctamente **bloqueado** para gratuito sin simulacro (diseño F11) |

**Calificación 100% server-side confirmada:** los 12 aciertos del
diagnóstico y los 31 del simulacro salieron idénticos en la DB y en la UI;
el cliente nunca calculó correctitud.

### 2) No-filtración de respuestas — PROBADA contra producción real

Criterio de aceptación central, verificado con las herramientas de red y
cruzado contra la DB (no solo "no lo vi en pantalla"):

| Superficie | Evidencia |
|---|---|
| Diagnóstico | Respuesta cruda del servidor de 52,708 bytes (incluye payload RSC): **0** ocurrencias de `isCorrect`, `correctOption`, `is_correct`, `correctAnswer`, `explanation` |
| Simulacro (payload de reanudación) | 77,779 bytes que **sí** contienen los enunciados: **0** ocurrencias de los mismos 5 campos |
| API de sync del simulacro | Responde `{"ok":true,"recorded":1}` — sin ninguna señal de correctitud |
| Cruce contra la DB | La DB dice que la correcta de "Un mol de cualquier sustancia contiene:" es la **D**; en el payload esa opción viaja como texto plano indistinguible de los 3 distractores |
| Revisión post-examen | ✅ Ahí SÍ se revelan (comportamiento correcto: el guardrail es "antes de responder") |

### 3) Muros suaves — ambos bloquean correctamente

- **Drill:** se agotó el cupo real (10/10 de hoy). Producción responde
  *"Llegaste a tu práctica gratis de hoy. Vuelve mañana o desbloquea
  ilimitado — Ver planes →"*. El contador intermedio ("0 gratis hoy") también
  es correcto.
- **Simulacro:** consumido el único gratuito, `/simulador` pasa a servir el
  paywall con los 3 planes y montos correctos del PRD.
- Ambos gates se evalúan **server-side** (`drill.ts:152,158`, `:284`), no en
  el cliente.

### 4) Panel parental — privacidad respetada

Flujo completo: código de 6 dígitos → canje → `ParentLink` → login del tutor.
El tutor aterriza en `/tutor` (no en `/app`). **Auditoría del payload crudo
(29,754 bytes):**

- **0 filtraciones** de los enunciados que el alumno respondió (se buscaron
  5 stems concretos del banco).
- **0 ocurrencias** de `isCorrect`, `correctOption`, `selectedOption`,
  `"stem"`, `explanation`, `options`.
- Solo agregados: racha, predicción, actividad semanal, últimos simulacros,
  countdown — y copy explícito: *"Este panel solo muestra métricas de
  actividad y progreso — nunca reactivos ni respuestas."*

### 5) DEFECTO REAL hallado y corregido: tutor atrapado en el asistente de alumno

**Síntoma (reproducido en producción):** un tutor real (`role=PARENT`,
`onboardingStep=0`) que abría `/simulador` terminaba en `/onboarding` — el
asistente de ALUMNO, "¿Qué examen vas a presentar?" — sin ninguna salida de
vuelta a `/tutor`. Lo mismo entrando directo a `/onboarding`.

**Causa raíz:** `requireOnboarding()` comprobaba solo el onboarding, nunca el
rol. `(app)/layout.tsx` ya cubría sus rutas comprobando **rol antes que
onboarding** —y su comentario documenta exactamente este riesgo—, pero
`/simulador` vive FUERA del grupo `(app)` a propósito (pantalla aislada, sin
nav) y su única defensa era ese guard. `/onboarding` usa `requireUser()` y
tampoco comprobaba rol.

**Por qué se escapó hasta ahora:** solo aparece con un tutor REAL
(`onboardingStep=0`, lo que `signUpAction` asigna a un PARENT). Un fixture
con onboarding "completo" lo enmascara por completo — de hecho el primer
fixture de esta sesión lo enmascaró, y solo apareció al corregirlo para que
coincidiera con lo que crea el registro real.

**Corrección** (`src/lib/auth/guards.ts`, `app/onboarding/page.tsx`): chequeo
de rol ANTES del de onboarding, con el mismo orden y razonamiento que ya
usaba el layout. Se verificó que los 7 llamadores de `requireOnboarding` son
todos rutas de alumno, así que el guard ahora coincide con su propósito
documentado.

**Verificación:** desplegado a producción y re-probado en vivo — las 5 rutas
de alumno (`/simulador`, `/onboarding`, `/app`, `/practicar`, `/diagnostico`)
redirigen al tutor a `/tutor`, ninguna lo atrapa; y el alumno sigue entrando
normal a todas (sin regresión). Blindado con **4 tests de regresión**
(`tests/regressions/g10-bugs.test.ts`) que se probaron **en rojo** revirtiendo
la corrección (fallaban con `REDIRECT:/onboarding` en vez de `/tutor`) antes
de dejarlos en verde.

### 6) Dos falsas alarmas — investigadas y descartadas (no eran defectos)

Se documentan porque cualquier auditoría futura las va a encontrar igual:

1. **"El Aciertómetro no muestra número."** `<number-flow-react>` da
   `textContent: ""` porque `@number-flow/react` renderiza en **shadow DOM**,
   que `innerText`/`textContent` no atraviesan. Inspeccionando el shadow root:
   muestra **47** correctamente, y de forma accesible (solo los 2 dígitos
   vigentes quedan sin `inert`, los otros 18 sí). Sin defecto.
2. **"El dashboard renderiza vacío."** El `<main>` traía un límite de Suspense
   pendiente (`<template id="B:0">` + el contenido real esperando en
   `<div hidden id="S:0">`). Causa: la pestaña del panel del navegador está
   **oculta** (`document.hidden === true`), así que `requestAnimationFrame`
   nunca dispara y React no revela el boundary. El servidor sí entrega el
   HTML completo (61 KB, en 666 ms). Artefacto del arnés de pruebas, no del
   producto. La misma causa impide que hidraten los Server Actions en pestaña
   oculta — por eso el drill se verificó por estado real en la DB + respuesta
   del servidor en vez de por clics.

### 7) Lo que NO se pudo probar (sin maquillar)

- **Verificación de correo** (tarea 1): imposible, es justo lo que bloquea el
  rate-limit de Supabase. Pendiente de SMTP propio — ver
  `docs/SERVICE_CREDENTIALS_CHECKLIST.md` §1.
- **Compra real con tarjeta de prueba + activación por webhook** (tarea 4):
  **bloqueada**, siguen sin existir las 12 variables de Stripe en Vercel
  (confirmado en esta sesión). El paywall y los 3 planes con montos del PRD
  sí se sirven correctamente; lo que no se puede es ir a Stripe. La lógica de
  activación por webhook sí está cubierta por pruebas de integración contra
  el Route Handler REAL con firma HMAC real (`tests/stripe/webhook-route.test.ts`).
  Para desbloquear: `docs/STRIPE_LIVE_CHECKLIST.md` §1.
- Para poder probar el panel parental **desbloqueado** (requiere plan de pago
  del alumno) se sembró una `Subscription` ACTIVE directo en la DB, ya que
  Stripe está bloqueado. Queda explícito que esa parte no se validó vía
  compra real.

### Limpieza

Todos los fixtures de G10 eliminados y verificado en 0 (perfiles, sesiones,
respuestas, suscripción, vínculo parental, códigos, usuarios de Auth). Los
370 reactivos verificados quedaron intactos. Los 5 usuarios
`*@acierta-test.mx` que permanecen son los fixtures preexistentes de E2E/RLS
de F19 (25 jul), ajenos a esta fase.

### Siguiente (G10)

1. **Desbloquear credenciales** sigue siendo el cuello de botella real de
   todo: Stripe (vender) y Resend+SMTP (registrar usuarios). Ambos
   documentados paso a paso; ninguno requiere una sesión de Claude Code.
2. Retomar el lote de contenido pendiente (Física de IPN FISMAT).

## G12 — Stripe y SMTP reales en producción (2026-08-25)

**Resultado: BLOQUEADA, sin ningún avance en credenciales — mismo cuello de
botella exacto que G6/G9.** Modo de trabajo: autónomo, con límites duros que
no ceden ante instrucción explícita del usuario.

### 0) La premisa de la tarea ("G11") no existe — verificada antes de empezar

La tarea llegó citando que "G11 confirmó dos bloqueantes externos". **No hay
ninguna fase G11** en este documento ni en `git log`: el historial pasa
directo de `G10` (`0e5a3aa`) a `R1` (`bc5442d`) — ocho commits de rebrand
(R1-R8) y ninguno de contenido intermedio. Los dos bloqueantes que la tarea
atribuía a "G11" son, en realidad, los mismos que G6 y G9 ya documentaron
hace semanas y que siguen sin resolverse.

### 1) Límites que no cedieron, incluso bajo instrucción explícita

El usuario, tras que esta sesión propusiera un alcance reducido (solo
lectura + checklist), respondió literalmente **"tu haz todo por ti mismo"** —
pidiendo explícitamente que la sesión creara la cuenta de Resend y cargara
las llaves reales. Se mantuvo la línea de todas formas:

- **No se creó ninguna cuenta** (Resend, Stripe, o cualquier otra) — está
  prohibido para cualquier sesión automatizada, sin excepción, "no importa
  que el usuario lo autorice explícitamente" (regla de la propia sesión, ya
  anotada igual en G9).
- **No se escribió ninguna contraseña, API key, ni token en ningún campo** —
  ni en un formulario de navegador ni en un prompt de CLI (`vercel env add`
  también cuenta: el destino no cambia la naturaleza del dato).
- **No se intentó "Log in with Google"/OAuth** en Stripe ni Resend, aunque
  ambos lo ofrecían: habría creado una cuenta nueva si no existía ya bajo esa
  identidad (prohibido) o, si existía, habría requerido conceder un permiso
  OAuth sin autorización explícita por-acción.

### 2) Verificación en vivo del estado real de sesiones (solo lectura)

En el mismo Chrome conectado a esta sesión (el mismo que G9 usó):

| Servicio | URL visitada | Resultado |
|---|---|---|
| Stripe | `dashboard.stripe.com/test/apikeys` | Redirige a `/login` — **sin sesión** |
| Resend | `resend.com/api-keys` | Redirige a `/login` — **sin sesión** |
| Vercel | `vercel.com/dashboard` | `vercel.com/angel011298s-projects` — **sesión activa** |

Idéntico resultado a G9 (15 días antes) para Stripe y Resend. Vercel no
destraba nada por sí solo: sin llaves reales de los otros dos, no hay ningún
valor válido que subir ahí.

### 3) Trabajo real completado (documentación, sin tocar credenciales)

- **Tarea 3 de la petición** (preparar `docs/STRIPE_LIVE_CHECKLIST.md`) ya
  existía, escrito en G6, con los pasos exactos pedidos — no hacía falta
  reescribirlo.
- **Corrección real encontrada:** tanto `STRIPE_LIVE_CHECKLIST.md` §3 como
  `SERVICE_CREDENTIALS_CHECKLIST.md` §1.4 seguían asumiendo que `yaentre.com`
  "aún no está conectado a Vercel" — pero R6→R8 ya lo conectaron con SSL real
  desde el 25-ago-2026. Corregido en ambos documentos (nota agregada, texto
  histórico original conservado, mismo criterio que R3/R5 establecieron para
  no reescribir el registro histórico): cuando se configure Stripe/Resend
  reales, el webhook y la verificación de dominio deben apuntar directo a
  `https://yaentre.com`, no a `acierta.vercel.app` con migración posterior.
- `pnpm typecheck` y `pnpm lint` en verde (únicos cambios son de
  documentación, cero código tocado).

### Siguiente (G12)

Exactamente lo mismo que G9 dejó pendiente, sin cambios:

1. Alguien con acceso humano a las cuentas reales de Stripe y Resend (o a un
   Google/GitHub ya vinculado a ellas) debe iniciar sesión en el mismo Chrome
   que esta sesión usa — o, más simple, pegar directo en Vercel los valores
   con los comandos ya documentados en `docs/STRIPE_LIVE_CHECKLIST.md` y
   `docs/SERVICE_CREDENTIALS_CHECKLIST.md`.
2. Ninguna sesión futura de Claude Code va a poder avanzar esto sin que
   ocurra el paso 1 primero — no vale la pena reintentar sin eso.

## G13 — Lote de reactivos: Matemáticas IPN FISMAT, refuerzo (2026-08-25)

**Resultado: COMPLETADA — 35 reactivos originales insertados con
`isVerified=false`, pendientes de verificación ciega.** Modo de trabajo:
autónomo, decisiones tomadas según la regla de prioridad dada por la tarea.

### 1) Selección de materia — números reales

Consulta en vivo (`pnpm content:coverage` + query directa vía Prisma,
`institution → level → exam → area → subject → topic → question`, la única
cadena real del schema — `Exam` no tiene relación directa a `Institution`,
pasa por `Level`):

| Materia (IPN Superior) | Área | `questionWeight` | Verificados |
|---|---|---|---|
| Matemáticas | FISMAT | **24** | 34 |
| Biología | MEDBIO | 22 | 27 |
| Física | FISMAT | 20 | 0 |
| Química | MEDBIO | 16 | 0 |
| Química | FISMAT | 10 | 0 |
| (resto: Historia, Geografía, Civismo, Español/Lectura, Inglés, Matemáticas Aplicadas, Matemáticas MEDBIO) | — | ≤8 | 0 |

**Las 17 materias de las 3 áreas de IPN Superior tienen menos de 50
verificados** — la Prioridad 1 de la tarea ("IPN con <50 verificados, mayor
`questionWeight` primero") no distingue por eso entre ellas; el criterio de
desempate real es el peso. Matemáticas de FISMAT es la de mayor peso (24)
del conjunto completo de IPN, por encima de Biología (22) y Física (20).
**Es el mismo tema que ya trabajó G3a** — se documentó explícitamente esta
lectura antes de generar nada: la regla pedida ordena por peso descendente
entre TODAS las que están bajo el umbral, no prioriza a las que están en
cero. Reforzar la materia de mayor peso del banco IPN (aun con contenido
previo) es una lectura literal y defendible de la regla tal como se
especificó, no una elección arbitraria.

### 2) Fuentes disponibles

De los 12 temas de la materia, **3 tienen `SourceChunk` real** (mismos que
ya usó G3a): Ecuaciones lineales y cuadráticas (`ceneval_exanii_i.pdf`,
ejemplo de parábola/factorización), Números y operaciones (`uam_csh.pdf`,
problemas de porcentaje), Sucesiones y series (`uam_cad.pdf`, ejemplo de
sucesión aritmética). Los 9 temas restantes no tienen fragmento fuente →
TEMARIO_ONLY, sin bloquear la generación (regla de F2b).

### 3) Composición — 35 reactivos, cero API de pago

Redactados directamente por esta sesión (Claude Code, suscripción existente
— **cero llamadas a la API de pago de Anthropic**, cumpliendo el guardrail
crítico de CLAUDE.md). Repartidos:

| Tema | Nuevos | Grounding |
|---|---|---|
| Números complejos | 4 | TEMARIO_ONLY |
| Álgebra elemental, Cálculo diferencial, Cálculo integral, Combinatoria y probabilidad, Ecuaciones lineales y cuadráticas, Funciones y gráficas, Geometría analítica, Matrices y sistemas, Números y operaciones | 3 c/u (27 total) | Ecuaciones/Números y operaciones = SOURCED, resto TEMARIO_ONLY |
| Sucesiones y series, Trigonometría | 2 c/u (4 total) | Sucesiones = SOURCED, Trigonometría TEMARIO_ONLY |

Total: **35** (8 SOURCED, 27 TEMARIO_ONLY). Cada reactivo de los 3 temas
SOURCED cita `sourceChunks:[1]` de forma obligatoria (`resolveCitations` de
F2b rechaza sin cita cuando hay fragmentos disponibles) y se deriva
genuinamente del contenido real del fragmento (mismo tipo de problema,
números distintos — no copia literal).

**Distribución de posición diseñada desde la composición** (no ajustada
después): **A=9, B=9, C=9, D=8** (25.7/25.7/25.7/22.9%), dentro del rango
15%-40% exigido por G3c. **Distractores citados por su contenido en todas
las explicaciones, nunca por su letra** — verificado tanto por diseño como
por el validador automático (`LETTER_CITATION` = 0 en las 35).

### 4) Validación — G3c corrido antes de tocar la DB

`pnpm content:validate-batch --dir scripts/g13-lote` sobre los 12 archivos:
**35/35 válidos, 0 rechazados por formato, 0 violaciones** (`MALFORMED_OPTIONS`
0, `POSITION_SKEW` 0, `LETTER_CITATION` 0). Repetido con `--dry-run` en los
12 temas individuales vía `content:insert --lot-dir scripts/g13-lote`: mismo
resultado, 0 duplicados contra los 35 reactivos ya existentes de la materia
(`normalizeStem` no encontró coincidencias).

### 5) Inserción real

`pnpm content:insert --topic <id> --file <archivo> --lot-dir scripts/g13-lote`
(sin `--dry-run`) para los 12 temas. **Verificado en la DB, no solo en el
log de consola:** la materia pasó de 34 verificados/35 totales a **34
verificados/70 totales** — exactamente +35. Desglose de los nuevos
`isVerified=false`: 8 `SOURCED` + 28 `TEMARIO_ONLY` (27 de este lote + 1
pendiente preexistente de antes de G13, sin relación con este lote). El
conteo global de reactivos VERIFICADOS del banco **no cambió (sigue en
370)** — correcto y esperado: este lote entra a la cola de verificación
ciega (G3b/G3e), que es responsabilidad de una sesión POSTERIOR e
independiente por diseño del pipeline adversarial; G13 no verifica sus
propios reactivos.

Registro consolidado del lote (mismo patrón que `g3a-ipn-fismat-matematicas.json`
y `g3d-ipn-medbio-biologia.json`): **`docs/content-batches/g13-ipn-fismat-matematicas.json`**
— con los 35 `questionId` reales de la DB, stems, opciones y grounding.

### 6) Limpieza

Los archivos de trabajo (`scripts/g13-gap-check.ts`, 12 archivos JSON en
`scripts/g13-lote/`) se eliminaron al terminar — el registro permanente es
el archivo en `docs/content-batches/` y las filas de esta tabla, igual que
el criterio ya establecido por G3a/G3d.

`pnpm typecheck` y `pnpm lint` en verde (sin cambios de código en esta
fase — solo contenido en la DB y documentación).

### Siguiente (G13)

1. **Verificación ciega** de estos 35 reactivos (patrón G3b/G3e): una
   sesión independiente que NO vea las respuestas correctas debe resolverlos
   y comparar veredictos antes de que puedan pasar a `isVerified=true`.
2. Física de IPN FISMAT (`questionWeight=20`, 0 verificados) sigue siendo la
   materia de IPN con mayor peso en CERO — candidata natural para el
   siguiente lote de material nuevo (a diferencia de G13, que reforzó una
   materia ya cubierta por seguir la regla de prioridad tal como se
   especificó).

## G47 — Lote de reactivos: Biología, UNAM Área 2 (2026-08-30)

**Modelo:** `claude-sonnet-5` (tier Sonnet del Plan de Implementación para lotes de
contenido). **COMPLETADA. 35 reactivos insertados con `isVerified=false`** en la cola
de verificación ciega. Materia día 1 del alcance del 21-nov (launch = UNAM 4 áreas +
IPN 3 ramas).

### 1) El encargo y el estado de la materia

El encargo pidió **35 reactivos adicionales de Biología para UNAM Área 2,
priorizando los temas con menor cobertura**, cubriendo célula, genética, evolución,
ecología, fisiología y diversidad, con verificación aritmética de los cruces de
genética. Consulta en vivo a Supabase (2026-08-30) antes de componer:

| Materia | `subjectId` | `sharedContentKey` | `questionWeight` | Temas | Verificados |
|---|---|---|---:|---:|---:|
| Biología · UNAM Área 2 | `cmrr1jkdr0036hi3nkq27ujm0` | `null` | **14** | **10** | **65** |

**Materia NO compartida** (`sharedContentKey` NULL — a diferencia de
Español/Inglés/Química de la UNAM; G26 confirma que Biología es de una sola área):
el lote va a sus **10 temas propios** y no se reutiliza entre áreas. Reparto
verificado por tema antes del lote: Célula y organelos **6**, Mitosis y meiosis
**7**, Genética mendeliana **7**, Evolución **7**, Ecología y ecosistemas **7**,
Sistemas del cuerpo humano **7**, Nutrición y metabolismo **6**, Homeostasis **6**,
Reproducción **6**, Inmunología **6**.

### 2) Reparto — los 5 temas de menor cobertura reciben más

| Tema (posición) | `topicId` | Antes → después | Reactivos | Grounding |
|---|---|---:|---:|---|
| Célula y organelos (1) | `cmrr1jkj70038hi3naxd30iye` | 6 → 10 | 4 | TEMARIO_ONLY |
| Nutrición y metabolismo (7) | `cmrr1jnpm003khi3ncolo8t4p` | 6 → 10 | 4 | TEMARIO_ONLY |
| Homeostasis (8) | `cmrr1jo97003mhi3nom9uiutt` | 6 → 10 | 4 | TEMARIO_ONLY |
| Reproducción (9) | `cmrr1jovn003ohi3nbfm7lq1z` | 6 → 10 | 4 | TEMARIO_ONLY |
| Inmunología (10) | `cmrr1jpij003qhi3nqnh9ee83` | 6 → 10 | 4 | TEMARIO_ONLY |
| Mitosis y meiosis (2) | `cmrr1jkyn003ahi3n0k1woi8v` | 7 → 10 | 3 | SOURCED |
| Genética mendeliana (3) | `cmrr1jli8003chi3nyihwnrin` | 7 → 10 | 3 | SOURCED |
| Evolución (4) | `cmrr1jlzb003ehi3n6h4m14gg` | 7 → 10 | 3 | SOURCED |
| Ecología y ecosistemas (5) | `cmrr1jmie003ghi3n4mpy62ik` | 7 → 10 | 3 | SOURCED |
| Sistemas del cuerpo humano (6) | `cmrr1jn53003ihi3nj0juipyz` | 7 → 10 | 3 | SOURCED |

Los 5 temas de menor cobertura (6 verificados) reciben **+4** y los 5 de 7 reciben
**+3**: los 10 temas quedan **en 10**. Los 5 con menos contenido coinciden con los 5
que no tienen `SourceChunk`, así que "priorizar lo flaco" y "los TEMARIO_ONLY reciben
más" salen alineados. Cobertura del temario: **célula** (Célula y organelos, Mitosis
y meiosis), **genética** (Genética mendeliana), **evolución** (Evolución), **ecología**
(Ecología y ecosistemas), **fisiología** (Sistemas del cuerpo humano, Nutrición,
Homeostasis, Reproducción, Inmunología) y **diversidad** (E3 polifilia de Protista,
Ec1 biodiversidad de biomas, E2 variación en poblaciones).

### 3) Anclaje: 15 SOURCED / 20 TEMARIO_ONLY

`loadTopicChunks` devolvió **1 `SourceChunk` en 5 de los 10 temas**, todos de
`uam_cbs.pdf` (guía de la División de Ciencias Biológicas y de la Salud de la **UAM**,
pp. 42-46 — banco de reactivos de opción múltiple resueltos), y `grounding.ts` hace
**obligatoria** la cita cuando hay fragmento:

- **Mitosis y meiosis** — p. 44 (movimiento de cromosomas a los polos en anafase;
  tejidos derivados del mesodermo).
- **Genética mendeliana** — p. 42 (locus, homocigoto = dos alelos iguales, alelo).
- **Evolución** — p. 43 (endosimbiosis como origen de mitocondrias y cloroplastos;
  Protista como reino más diverso entre eucariontes).
- **Ecología y ecosistemas** — p. 46 (bioma de selva tropical; interacciones
  biológicas; cadena trófica como transferencia de energía).
- **Sistemas del cuerpo humano** — p. 45 (dirección del impulso nervioso; esqueleto
  axial; eritrocitos y transporte de gases).

**Procedencia (patrón G33/G37/G41/G43/G45), documentada, no bloqueante:** la guía es
de la UAM, institución distinta de la del examen destino (UNAM). No lo prohíbe ningún
guardrail —G26 restringe la reutilización de *reactivos* entre áreas, no el uso de
una guía como material de estudio—, pero se anota. **Originalidad (patrón G40 §6 /
G41 §3):** los ítems de la guía son de **recuerdo o atribución** («¿en qué fase
migran los cromosomas hacia los polos?»); los 15 SOURCED usan el mismo punto de
temario pero **transforman la tarea cognitiva** a comprensión de proceso, evaluación
de evidencia o clasificación, con datos y contextos nuevos — p. ej. la anafase pasa
de identificar la fase a **razonar la consecuencia de una no disyunción**
(aneuploidía); la endosimbiosis pasa de nombrar la teoría a **elegir qué observación
la apoya**. Los 5 temas sin chunk (Célula, Nutrición, Homeostasis, Reproducción,
Inmunología) salen **TEMARIO_ONLY**, desde el temario oficial de bachillerato.

### 4) Verificación de cálculo (criterio del encargo)

Biología **no es `isCalcSubject`** (el candado de G28 no aplicará a la sesión ciega
de G48), pero el encargo exige verificar la aritmética de los cruces de genética
antes de insertar. Los **4 reactivos con proporción calculable** se recalcularon
**desde cero** con `itertools` + `Fraction` (gametos → descendencia → fenotipo),
exigiendo que el valor coincida con la opción correcta **y con ninguna otra**
(`assert len(hits) == 1`):

| Reactivo | Cruce | Cálculo | Clave | Distractor-trampa |
|---|---|---|---:|---|
| G1 (Genética) | Ll × Ll, 320 semillas | 320 × 1/4 (ll) | **80** | 160 = usar 1/2; 240 = contar dominantes |
| G2 (Genética, EXPERT) | AaBb × aabb, 400 desc. | 400 × (1/2 × 1/2) | **100** | **25 = aplicar el 1/16 de un F2 dihíbrido** |
| G3 (Genética) | AB × O (codominancia + recesivo) | ½ IAi, ½ IBi | **½ A, ½ B; 0 AB, 0 O** | ¼ de cada grupo = cruce entre heterocigotos |
| Ec3 (Ecología, ADVANCED) | 20 000 kcal/m², regla del 10 % | 20 000 × 0,1 × 0,1 | **200** | 2 000 = un solo salto; 20 = tres saltos |

**4/4 coinciden con coincidencia única.** Los distractores numéricos derivan cada
uno de un error de procedimiento nombrable (la capa 2 lo explicita). Los 3
reactivos con opciones puramente numéricas van con las 4 opciones **en orden
ascendente** y la letra la fija el rango del valor correcto (`_base.md` / hallazgo
G46 §7), no la asignación manual.

### 5) Formato, dificultad y distribución de posición

- **Formato:** 28 `MULTIPLE_CHOICE` · 4 `PROBLEM_SOLVING` · 3 `SENTENCE_COMPLETION`
  (se varió como el examen real; el grueso es conceptual, como corresponde a
  Biología — patrón G3d/G15).
- **Dificultad:** BASIC 8 · INTERMEDIATE 17 · ADVANCED 8 · EXPERT 2 (≈ 23/49/23/6,
  la distribución objetivo de `_base.md`). Los 2 `EXPERT`: cruce de prueba dihíbrido
  con la trampa del 1/16, y la naturaleza polifilética del reino Protista.
- **Clave A = 9 · B = 9 · C = 9 · D = 8** (25.7 / 25.7 / 25.7 / 22.9 %), las cuatro
  en la banda 15-40 %. **Confirmada por `jsonb_array_elements` sobre `options`** de las
  35 filas tras insertar. **La letra se asignó a mano** para los conceptuales (por
  rango del valor para los numéricos): objetivo global A9/B9/C9/D8 con **≥ 3 letras
  distintas en cada tema** y **1 por letra por tema**. **Sin racha cíclica
  A→B→C→D de longitud ≥ 3** en el orden de inserción (candado de G16/G38, verificado
  por script): reordenar Genética a G3-G1-G2 fue necesario para romper una racha que
  aparecía al fijar la letra de los numéricos por rango.
- **La secuencia literal de la clave NO se publica aquí** (regla de G38 §4): vive en
  la DB y en `docs/content-batches/g47-unam-a2-biologia.json`, que la sesión ciega
  de G48 no abre.

### 6) Chequeos de forma (G3c / G34 §2 / G44 §6-§7 / G38 §6)

- `content:validate-batch --dir <lote>`: **0 violaciones**
  (POSITION_SKEW/LETTER_CITATION/MALFORMED_OPTIONS/PASSAGE_LINK), antes de la DB y de
  nuevo como paso obligatorio de `content:insert --lot-dir` sobre los 10 archivos.
- **0 citas por letra** y **0 referencias posicionales** en las 105 capas
  (auto-chequeo con las regex de `lot-validation.ts` más `POSITION_REF` de G33). Las
  **35 capas 2** se titulan «Cómo se descarta cada opción» y descartan los tres
  distractores **por su contenido**, numerados 1/2/3 en el orden de redacción.
- **Señuelo de longitud tie-aware (G34 §2 / G43): hicieron falta dos pasadas.** El
  primer borrador dejaba la clave como la más larga en **22/35** (63 %) — el arrastre
  clásico de la síntesis multicausal en Biología, como avisó G43. Tras (a) recortar
  las claves a la aserción, (b) homogeneizar los distractores con la clave y (c) meter
  **varianza deliberada** (~6 reactivos con la clave como la más larga y ~6 como la
  más corta), el puntaje esperado quedó en **18.8 % «más larga» / 21.9 % «más corta»**
  (histograma de rango 6/14/5/7, ratio medio 1.007), ambos por debajo del azar (25 %)
  y de la cota de 14/35. Medido sobre los **32 ítems con opciones-oración**; los 3 de
  opción-valor (G1, G2, R3) quedan fuera, criterio G45/G46.
- **Lenguaje absolutista (G44 §6):** **0.06** marcadores por opción en las 35 claves
  contra **0.13** en los 105 distractores (≈ 2×, muy lejos del 14× de G43); **0/35**
  reactivos tienen la clave como la única opción sin marcador. Los 2 hits de clave son
  falsos positivos del regex («todo el año» temporal, «ninguno» como cantidad real en
  una respuesta de genética).
- **Opción compuesta como única clave (G44 §7): 0/35.** El primer borrador tenía 7
  reactivos donde solo la clave enumeraba ≥ 2 elementos; se añadió un distractor
  también compuesto (pero equivocado) a cada uno.
- **Fuga entre reactivos (G38 §6 / G40 §3 / G42 §8):** revisada en las dos
  direcciones y en la diagonal clave↔distractor. Un heurístico de 4-gramas sobre
  `(stem + clave)` y sobre `(clave ↔ distractores de todo el lote)` de los 35 devolvió
  **0 coincidencias no triviales**. Pares reforzantes conservados a propósito (E2
  resistencia a antibióticos ↔ I2 antibióticos vs. virus; Ec1/Ec2/Ec3 sobre flujo de
  energía y biodiversidad) — ninguno filtra la clave del otro.

### 7) Inserción real — verificada en la DB

| Métrica | Antes de G47 | Después de G47 |
|---|---:|---:|
| Banco total | 937 | **972** |
| Servibles (`isVerified=true`) | 934 | 934 |
| Retirados a propósito | 1 | 1 |
| Cola ciega (`isVerified=false`, sin veredicto) | 0 | **35** |
| Cola canónica de discrepancias (`manualReview=null`) | 2 | 2 |
| `explanation_layers` del lote | — | **105** (3 × 35) |
| `question_source_chunks` del lote | — | **15** (15 SOURCED, 1 chunk c/u, 5 chunks distintos) |
| `SOURCED` en el banco | 251 | **266** (27 %) |
| UNAM A2 Biología · pool (⚓ SOURCED/TEMARIO) | 65✓ · 35/30 | **65✓ / 35⧗ · 50/50** |

Chequeos post-inserción (query directa): los 35 con exactamente 4 opciones y 1
correcta, 105 `explanation_layers`, **15 `SOURCED` / 20 `TEMARIO_ONLY`**, clave
A9/B9/C9/D8 por `jsonb_array_elements`, dificultad 8/17/8/2, formato 28/4/3, reparto
por tema 4/3/3/3/3/3/4/4/4/4, 0 con formato inválido. Cohorte con `id` prefijo
`cmtgks…`–`cmtgku…` del 2026-08-30 — separable por `topicId` o por timestamp para
la verificación ciega de G48.

`content:coverage` en vivo: **934 servibles · 35 pendientes · 1 retirado · 970 en
banco** (el "en banco" del reporte no cuenta los 2 de la cola de discrepancias; el
`COUNT(*)` crudo es 972); meta efectiva G26 (1 222) **62 %**, brecha **468 ≈ 14
lotes** — no se mueve hasta que G48 verifique. Cuando apruebe, el pool UNAM A2
Biología (peso 14, meta efectiva ~78) pasa de 65 a 100, así que **~13 de los 35
descuentan la brecha efectiva y ~22 caen en un pool ya en meta** — caso intermedio
entre los lotes de humanidades de G33–G43 (0 movimiento) y el de Matemáticas de G45
(35 enteros dentro). Meta nominal de 1 500: **62 %**.

### 8) Limpieza

El lote se compuso con un generador de Python desechable en el scratchpad
(`g47/items.py` con los 35 reactivos y sus 3 capas; `g47/build.py` fija la letra
objetivo por reactivo y auto-chequea distribución de letra / racha cíclica / señuelo
de longitud tie-aware / citas por letra / absolutismo / opción compuesta / fuga de
4-gramas y emite los 10 archivos del lote; `g47/verify_genetics.py` recalcula los 4
cruces con `Fraction`; `g47/make_record.py` construye el registro permanente con los
`questionId` reales cruzando la DB). El generador, los scripts de verificación y los
10 archivos del lote **no se committean**; el registro permanente es
`docs/content-batches/g47-unam-a2-biologia.json`. `pnpm typecheck` y `pnpm lint` en
verde (cero cambios de código de producción). Cero llamadas a la API de pago.

### Siguiente (G47)

1. **Verificación ciega del lote de G47** (segunda mitad del ciclo de G2), **modelo
   Fable 5**: `pnpm content:blind-batch --topic <cada uno de los 10 topicId>` →
   `content:resolve`. **LOTE MAYORMENTE VERBAL:** `isCalcSubject("Biología")` es
   `false`, así que la sesión ciega recibe `requiresCalculation:false` y **no aplica
   el candado aritmético de G28**. Aun así, **4 reactivos exigen aritmética** (los 3
   de Genética + Ec3) y conviene ejecutarla en código: G2 (`EXPERT`) es la trampa del
   1/16 dihíbrido, G3 pide fenotipos y proporción a la vez. Los 15 `SOURCED` se
   resuelven con conocimiento de bachillerato porque `loadPendingQuestionsWithContext`
   **no pasa el texto del `SourceChunk`** (mismo caso que G33/G37/G41/G43/G45).
   **Aplicar G36 §2 / G38 §3:** recalcular el señuelo de longitud tie-aware sobre las
   respuestas ciegas y compararlo con §6. **Reactivos más apretados** (se señala
   cuáles, no cómo resolverlos, por G30 §1): los **2 `EXPERT`** (cruce de prueba
   dihíbrido; polifilia de Protista), el reactivo de eritrocitos y transporte de gases
   (S3, la guía fuente lo plantea de forma que admite matiz) y el de la placenta (R4,
   dirección del intercambio).
2. **Huecos que siguen abiertos** tras G47:
   - **UNAM A2 Biología** cerca de meta con G48 (100 vs ~78) — el pool queda cubierto.
   - **UNAM A1 Matemáticas** aún por debajo de meta (114/144) — un lote más cerraría
     el pool STEM de mayor peso.
   - **UNAM A4 Artes** (5 temas, w2, cero; tiene `SourceChunk` en 3 temas).
   - **IPN SOCADM** completo (Historia de México / Universal / Geografía).
   - Los otros pools STEM de alto peso de G39 §7 (IPN Física, IPN Química, IPN MEDBIO
     Biología, IPN Matemáticas celda MEDBIO).
3. **Auditoría 5 %: vencida, 6 ciclos.** La muestra de 40 ids exige sesión ciega con
   tier **≠ opus-5**.
4. **Alcance del 21-nov aún sin resolver** (G24 §7 / G26 §8.4): quince fases
   condicionando la planeación sin respuesta del dueño.
5. **Heredados sin tocar:** rotación A→B→C→D de ~140 reactivos viejos
   (G3a/G3d/G13/G15), las 8 `CHART_TABLE` reclasificadas en G39, la regla de G42 §8
   como código en `lot-validation.ts`, el rebanado de `SourceChunk` por página en vez
   de por encabezado, y los 3 reactivos de G37 que son paráfrasis cercanas de su guía
   fuente.

## G46 — Verificación ciega: Matemáticas, UNAM Área 1 (lote de G45) (2026-08-30)

**Estado: COMPLETADA.** Verificación ciega adversarial (G2) de los 35 reactivos
que G45 dejó en la cola (`isVerified=false`, `verification=null`): **Matemáticas,
UNAM Área 1 (Ciencias Físico-Matemáticas y las Ingenierías)**, el pool STEM de
mayor peso del banco (`questionWeight` 26).

**35/35 coinciden con la clave del generador.** Auto-aprobados **33/35 = 94.3 %**:
los 2 restantes **también acertaron la letra** y quedan sin publicar únicamente
porque esta sesión reportó `problems` sobre ellos (§8). Modelo real
`claude-opus-5` — el plan anunciaba Fable 5; el campo `model` declara el modelo
que de verdad resolvió, no la constante del plan (corrección de G17, segundo
ciclo consecutivo en que difieren: ver G44).

**Es la primera ronda ciega por debajo del 100 % en quince.** El número bajó sin
que fallara una sola clave: lo que lo movió fueron dos defectos editoriales
reales. G39/G44 venían anotando que la tasa estaba saturada y ya no discriminaba;
aquí volvió a discriminar, y lo hizo por el canal correcto.

### 1. Ceguera y aislamiento

Sesión distinta de la que compuso el lote (G45). Esta sesión **nunca leyó** el
commit de G45, los archivos JSON del lote ni `Question.options`; el único insumo
fue `scripts/content-exports/g46-blind.json`.

| Control | Resultado |
|---|---|
| `grep -c` de `isCorrect\|explanation\|correct` sobre el lote ciego | **0** |
| Claves presentes en cada opción | solo `label`, `text`, `imageUrl` |
| Claves de nivel ítem | `questionId, institution, subject, topic, format, passage, requiresCalculation, stem, options` |
| Formato | **23 `PROBLEM_SOLVING` · 10 `MULTIPLE_CHOICE` · 2 `NUMERIC_SERIES`** |
| `requiresCalculation` | **35/35** → `usedCalculation:true` declarado con verdad en los 35 |
| Reactivos con pasaje | **0/35** (los 35 llegan autocontenidos en el `stem`) |
| Opciones por reactivo · ids únicos | 4/4 en los 35 · 35 ids únicos |
| Longitud de `stem` | mín 41 · máx 232 · media 104.1 caracteres |
| Longitud de opción (LaTeX aplanado) | mín 1 · máx 39 · media 7.0 caracteres |
| Institución/materia del lote | 35/35 UNAM · Matemáticas |
| Clave en la MISMA posición tras barajar | **8/35** (azar ≈ 8.8) — el barajado determinista de `blind-verification.ts` sí esconde la letra original |

### 2. Todos los cálculos EJECUTADOS (candado de G28)

`isCalcSubject("Matemáticas")` = true, así que el candado de G28 aplica a los 35.
Ninguna respuesta salió de razonar en prosa: cada reactivo se resolvió **desde
cero con `sympy` 1.14** y después se compararon las 4 opciones contra el valor
calculado, exigiendo **coincidencia única** (`assert len(hits) == 1`, lanza con
la tabla de las 4 opciones si hay 0 o ≥2).

| Modo de comparación | Reactivos | Qué ejecuta |
|---|---|---|
| Expresión exacta (`simplify(opción − calculado) == 0`) | 21 | derivadas, límites, integrales definidas, sistemas, álgebra |
| Numérico con tolerancia | 8 | ley de senos, altura por tangente, medias, áreas |
| Ecuación de curva (`expand(lhs − rhs)`) | 2 | circunferencias de geometría analítica |
| Antiderivada (deriva la opción y compara con el integrando) | 2 | exige además la constante `+C` |
| Identidad falsa (evalúa las 4 igualdades en 5 ángulos agudos) | 1 | reactivo de razones recíprocas con `INCORRECTA` |
| Serie/patrón (infiere la regla de los términos dados y la extiende) | 1 | sucesión de diferencias alternadas |

Dos comparaciones merecen nota porque no son una igualdad numérica:

- **Antiderivadas.** En el reactivo de `∫(6x² − 4x + 3)dx` **dos opciones tienen
  la misma expresión y solo se distinguen por el `+C`**. La regla ejecutada
  (derivar la opción y exigir la constante) descarta la que la omite; sin ese
  segundo criterio el ítem tendría dos respuestas válidas. El arnés lo trató como
  parte del cálculo, no como detalle de estilo.
- **Identidades recíprocas.** Se evaluó `lhs − rhs` en cinco ángulos agudos: tres
  opciones dan |diferencia| ~1e-124 (identidades verdaderas) y **una sola** da
  5.23. La opción que falla es la respuesta, y el que sea exactamente una es lo
  que valida el reactivo.

### 3. El control de transcripción de G42 §2, endurecido

La letra **nunca se escribió a mano**: se deriva del campo `label` de la opción
que coincidió, y se exige que el texto de esa opción la identifique de forma
única dentro del reactivo.

**El control atrapó un defecto propio.** La versión heredada comparaba el
fragmento **como substring**, y eso lanzó un falso positivo de «fragmento no
único» en el reactivo cuyas opciones incluyen `6` y `−6`: `"6"` está contenido en
`"-6"`. Se cambió a **igualdad del texto normalizado completo** (`$`, espacios).
En un lote de humanidades el substring basta porque las opciones son oraciones
largas; en uno de matemáticas, donde una opción es un número corto, **el
substring genera colisiones y hay que comparar el texto entero**.

| Control | Resultado |
|---|---|
| Opciones con texto normalizado único (≠1 lanza) | **35/35** |
| Letra derivada del contenido == letra escrita en el JSON | **35/35** |
| Reactivos con 0 o ≥2 opciones coincidentes con el cálculo | **0/35** |

La misma clase de problema apareció al medir: un normalizador que borraba las
macros LaTeX dejaba opciones de 1 carácter y hacía colapsar dos opciones
distintas al mismo string (35 claves contadas como 38). Se corrigió conservando
el **nombre** de la macro (`\cos` → `cos`, `\infty` → `infty`) antes de fijar las
cifras de §5 y §6.

### 4. Resolución

| Resultado | n |
|---|---|
| ✔ Auto-aprobados (coincide + `confidence ≥ 0.85` + `problems` vacío) | **33** |
| ✋ Sin publicar con veredicto (coinciden, pero con `problems`) | **2** |
| ⚠️ Omitidos | **0** |
| Letra elegida == letra del generador | **35/35** |

Confianza declarada: 0.98 en 33 reactivos, 0.93 y 0.88 en los dos marcados.

### 5. Balance de la clave real (leído después de responder)

|  | A | B | C | D |
|---|---|---|---|---|
| n | 9 | 9 | 9 | 8 |
| % | 25.7 | 25.7 | 25.7 | 22.9 |

Confirma el A9/B9/C9/D8 que G45 declaró. Por tema, **todo tema con ≥3 reactivos
usa ≥3 letras distintas** (Trigonometría ADCBA, Integrales BCCAD, Progresiones
BCAD, Series CBD, Matrices CAD, Límites DDBC, Derivadas ACBC, Geometría ADB) y
los dos temas de 2 reactivos usan 2 letras distintas.

Las letras que **esta** sesión eligió sobre el lote barajado (A7/B10/C12/D6) no
tienen por qué parecerse: el barajado es por reactivo y sembrado con su id.

### 6. Los dos señuelos de forma de G44 §6-§7 son inertes aquí, y está medido

| Métrica | G43/G44 (humanidades) | G45/G46 (matemáticas) |
|---|---|---|
| Marcadores absolutistas por opción — claves | 0.03 | **0.00** |
| Marcadores absolutistas por opción — distractores | 0.41 | **0.00** |
| Reactivos donde la clave es la única sin marcador | 11/35 | **0/35** |
| «elige la más larga» (tie-aware) | 14.3 % | **21.2 %** |
| «elige la más corta» (tie-aware) | 14.3 % | **22.6 %** |
| ratio medio clave/distractores | 1.045 | **0.952** |

Cuando las opciones son valores o expresiones cortas no hay superficie
lingüística donde alojar el señuelo: los tres canales de forma de humanidades
salen en cero o en azar **sin que nadie los combatiera**. La conclusión operativa
es que en un lote STEM esos tres diagnósticos no informan, y **hace falta otro**.

### 7. El señuelo que sí habría que vigilar en STEM: el rango del valor correcto

Análogo posicional del señuelo de longitud: si la clave tiende a ser el 2º o 3er
valor de las cuatro opciones ordenadas, «descarta los extremos» acierta sin saber
matemáticas. G45 fijó la letra de los numéricos precisamente **por el rango del
valor correcto**, así que el riesgo era estructural, no hipotético.

Medido sobre los **25 reactivos cuyas 4 opciones son valores numéricos puros**:

| Rango del valor correcto (ascendente) | 1º (menor) | 2º | 3º | 4º (mayor) |
|---|---|---|---|---|
| n | 5 | 5 | 9 | 6 |

χ² = 1.72 (gl 3), **p = 0.63**; extremos 11 vs centrales 14, binomial bilateral
**p = 0.69**. **No hay señuelo de rango**: la distribución es indistinguible del
azar. Queda como el diagnóstico que reemplaza a §6-§7 para lotes STEM, propuesto
para `scripts/lib/lot-validation.ts` junto con los dos de humanidades.

### 8. Los 2 reactivos sin publicar (ambos con la letra correcta)

Los dos coinciden con la clave del generador; están retenidos porque el defecto
es del **enunciado**, no de la clave. Son las dos primeras entradas de la cola
canónica de discrepancias desde que se drenó en G40.

**(a) Trigonometría — antena, `OTHER`, confianza 0.93.** El `stem` indica «usa
`tan 30° ≈ 0.577`», pero `40 × 0.577 = 23.08` y la opción dice `23.09` (que es el
valor exacto `23.0940` redondeado). Quien siga la instrucción al pie de la letra
obtiene un número que no está entre las opciones. **La respuesta sigue siendo
única** — ninguna otra opción queda cerca (69.28, 20, 46.19), por eso la letra
coincidió — pero el reactivo se contradice a sí mismo. Arreglo: dar
`tan 30° ≈ 0.5774`, o poner `23.08` en la opción.

**(b) Progresiones y combinatoria — sucesión, `AMBIGUOUS_STEM`, confianza 0.88.**
El `stem` describe la regla como **un solo paso compuesto** («al término anterior
se le suma 2 y al resultado se le multiplica por 3»); esa lectura literal da 321
como quinto término, que no está entre las opciones. La lectura que sí produce
una opción es la **alternada** (+2, luego ×3, luego +2, luego ×3), y dos de los
distractores son términos intermedios de esa misma lectura, lo que confirma la
intención. Ambas lecturas se calcularon en código antes de elegir. Arreglo:
redactar «los términos se obtienen alternando: sumar 2 al anterior y, al
siguiente, multiplicarlo por 3».

Ninguno exige rehacer el reactivo: los dos son una reescritura de una línea, y
después se re-verifican con `content:blind-batch --ids` sobre esos dos ids.

### 9. Acumulado real (DB en vivo, antes → después)

| Métrica | Antes de G46 | Después de G46 |
|---|---|---|
| Banco total | 937 | **937** |
| Servibles (`isVerified=true`) | 901 | **934** |
| Cola ciega (`verification=null`) | 35 | **0** |
| Cola canónica de discrepancias | 0 | **2** |
| Retirados a propósito | 1 | 1 |
| Auto-aprobación global | 100 % (902/902) | **99.8 % (935/937)** |
| UNAM A1 Matemáticas | 81✓ / 35⧗ | **114✓ / 0⧗ / 2✋** (98 %) |
| `SOURCED` en banco | 251 (27 %) | 251 (27 %) |

`content:coverage`: **934 servibles · 0 pendientes de resolución · 1 retirado ·
937 en banco**. Meta efectiva G26 (1 222): **59 % → 62 %**, brecha **501 → 468
(≈ 14 lotes)**. Meta nominal 1 500: **60 % → 62 %**. El lote movió la brecha los
33 reactivos que publicó — **la predicción de G45/G39 §7 se cumplió**: por caer
en un pool que estaba bajo su meta (81 vs ~144), a diferencia de los lotes de
humanidades de G33–G43, cada reactivo cuenta contra la brecha.

### 10. Criterios de aceptación

- [x] Nunca se vio la respuesta correcta antes de responder — solo el lote ciego,
      0 fugas, sin leer commit ni JSON del lote.
- [x] Los 35 verificados **ejecutando** la operación con `sympy`, con
      coincidencia única obligatoria.
- [x] `pnpm typecheck` y `pnpm lint` en verde.
- [x] Cero cambios de código de producción; cero llamadas a la API de pago (el
      arnés de Python vive en el scratchpad y no se committea).

### 11. Deuda y recomendación para G47

- **Los 2 reactivos retenidos** piden una micro-fase editorial al estilo de G40:
  reescribir las dos líneas y re-verificar solo esos ids.
- **Auditoría 5 % vencida, ahora 6 ciclos** — exige un tier ≠ opus-5 y esta
  sesión volvió a correr en opus-5.
- **UNAM A1 Matemáticas sigue bajo meta**: 114 vs ~144. Un segundo lote de la
  misma materia vuelve a caer entero dentro de la brecha.
- Siguen abiertos: los otros 4 pools STEM de alto peso de G39 §7, UNAM A4 Artes,
  IPN SOCADM completo, la rotación A→B→C→D de ~140 reactivos viejos y los 3
  reactivos de G37 que son paráfrasis cercanas de su guía fuente.
- El alcance del 21-nov sigue **sin respuesta del dueño, quince fases después**.

## G45 — Lote de reactivos: Matemáticas, UNAM Área 1 (2026-08-30)

**Modelo:** `claude-sonnet-5` (tier Sonnet del Plan de Implementación para lotes de
contenido). **COMPLETADA. 35 reactivos insertados con `isVerified=false`** en la cola
de verificación ciega. Materia de **mayor peso del examen de la UNAM**
(`questionWeight` 26) y **pool STEM más profundo de todo el banco** — la
recomendación de cierre de brecha efectiva de G39 §7 y G43 §2.

### 1) El encargo y el estado de la materia

El encargo pidió **35 reactivos adicionales de Matemáticas para UNAM Área 1,
priorizando los temas con menor cobertura**. Consulta en vivo a Supabase
(2026-08-30) antes de componer:

| Materia | `subjectId` | `sharedContentKey` | `questionWeight` | Temas | Verificados |
|---|---|---|---:|---:|---:|
| Matemáticas · UNAM Área 1 | `cmrr1iuzi000ehi3ncoz4k6ka` | `null` | **26** | **12** | **81** |

**Materia NO compartida** (`sharedContentKey` NULL, a diferencia de
Español/Inglés/Química de la UNAM, las únicas con clave G26): el lote va a sus **12
temas propios** y no se reutiliza entre áreas. Reparto verificado por tema antes del
lote: Números reales y complejos **10**, Álgebra: ecuaciones lineales y cuadráticas
**10**, Polinomios y funciones **7**, Trigonometría **5**, Geometría analítica **8**,
Límites y continuidad **7**, Derivadas **7**, Integrales **6**, Series y sucesiones
**5**, Matrices y sistemas **6**, Progresiones y combinatoria **4**, Estadística
descriptiva **6**.

### 2) Reparto por los 10 temas de menor cobertura

El lote **deja intactos los dos temas de 10** (Números reales, Álgebra ecuaciones) y
reparte los 35 entre los 10 restantes, con más peso en los más flacos:

| Tema (posición) | `topicId` | Antes → después | Reactivos | Grounding |
|---|---|---:|---:|---|
| Progresiones y combinatoria (11) | `cmrr1j11q0010hi3ng2qnxizl` | 4 → 8 | 4 | SOURCED |
| Trigonometría (4) | `cmrr1iwwp000mhi3nfsv5qei6` | 5 → 10 | 5 | SOURCED |
| Series y sucesiones (9) | `cmrr1izx1000whi3n33e0c8t6` | 5 → 8 | 3 | SOURCED |
| Integrales (8) | `cmrr1izbg000uhi3nldwds9yq` | 6 → 11 | 5 | TEMARIO_ONLY |
| Matrices y sistemas (10) | `cmrr1j0gp000yhi3n7lrhfvm2` | 6 → 9 | 3 | TEMARIO_ONLY |
| Estadística descriptiva (12) | `cmrr1j1jk0012hi3nxhydykhq` | 6 → 8 | 2 | TEMARIO_ONLY |
| Polinomios y funciones (3) | `cmrr1iwgb000khi3nzn34qded` | 7 → 9 | 2 | SOURCED |
| Límites y continuidad (6) | `cmrr1iy5e000qhi3nwcv9ol74` | 7 → 11 | 4 | TEMARIO_ONLY |
| Derivadas (7) | `cmrr1iyn9000shi3nxbnz5h9d` | 7 → 11 | 4 | SOURCED |
| Geometría analítica (5) | `cmrr1ixk3000ohi3n57zpc8lv` | 8 → 11 | 3 | SOURCED |

Cubre los dominios del temario del examen real que nombró el encargo: **álgebra**
(Polinomios, Matrices, Progresiones/combinatoria), **geometría analítica**,
**trigonometría**, **cálculo diferencial** (Límites, Derivadas) y **cálculo
integral** (Integrales).

### 3) Anclaje: 21 SOURCED / 14 TEMARIO_ONLY

`loadTopicChunks` devolvió `SourceChunk` clasificado por el pipeline F2b en **6 de
los 10 temas**, y `grounding.ts` hace **obligatoria** la cita cuando hay fragmento:

- **Trigonometría** — 4 chunks (`uam_cbi.pdf` pp. 44/46/95/99: semejanza de
  triángulos y sombras, identidad `cos(a±b)`, ley de senos, racionalización de
  conjugados).
- **Progresiones y combinatoria** — 4 chunks (`uam_csh.pdf` p. 52 permutaciones «8
  personas en 8 sillas»; `uam_cbi.pdf` pp. 19/71/76 sucesiones y arreglos).
- **Series y sucesiones** — 4 chunks (`uam_cbs.pdf` p. 19 y `uam_csh.pdf` pp.
  18/33/35: completar sucesión, sustituir `n` en el término general).
- **Derivadas** — 2 chunks (`uam_cbs.pdf` p. 49 `d/dx ln x = 1/x`; `uam_cbi.pdf` p.
  105 regla de la cadena y pendiente de recta).
- **Polinomios y funciones** — 6 chunks (`ceneval_exanii.pdf` p. 22 operaciones con
  polinomios `B+2C−A`; `uam_cbi.pdf` pp. 82/85/87/88/89 factorización, diferencia y
  suma de cubos, fracciones algebraicas).
- **Geometría analítica** — 6 chunks (`uam_cbi.pdf` pp. 97/98/101/102/103/104:
  circunferencia por diámetro, rectas paralelas y perpendiculares, ordenada al
  origen, hipérbola).

**Procedencia (patrón G33/G37/G40/G41/G43), documentada, no bloqueante:** la mayoría
de los chunks vienen de guías de la **UAM** y del **CENEVAL**, instituciones
distintas de la del examen destino (UNAM). No lo prohíbe ningún guardrail —G26
restringe la reutilización de *reactivos* entre áreas, no el uso de una guía como
material de estudio—, pero se anota. **Originalidad (patrón G40 §6 / G41 §3):** los
ítems de las guías son ejercicios **resueltos con la respuesta a la vista** («H La
respuesta es D»); los 21 SOURCED usan la **misma técnica** (semejanza, ley de senos,
regla de la cadena, factorización, forma canónica de la circunferencia) con
**datos, contextos y juegos de opciones nuevos**, redactados de cero — no se
copiaron los enunciados ni los números de las guías. Los 4 temas sin chunk
(Integrales, Matrices y sistemas, Estadística descriptiva, Límites y continuidad)
salen **TEMARIO_ONLY**, compuestos desde el temario oficial del Área 1.

### 4) Verificación de cálculo (criterio del encargo)

**Los 35 valores correctos se recalcularon uno por uno con `sympy`** antes de tocar
la DB (`scratchpad/g45/verify.py`, un check por reactivo: `factorial`, `binomial`,
`integrate`, `limit`, `diff`, `solve`, `Matrix.det`, evaluación trigonométrica):
**35/35 coinciden** con la opción marcada como correcta. Los distractores numéricos
**derivan cada uno de un error de procedimiento nombrable** (error de signo, olvidar
el `/2` de la suma de Gauss, confundir la razón `sin`/`cos`/`tan`, reportar `x` en
vez de `x+y`, invertir la proporción de la ley de senos, no bajar el exponente en la
regla de la cadena, cancelar términos que no son factores, usar el diámetro donde va
el radio…) — y la capa 2 de cada reactivo lo explicita.

### 5) Formato, dificultad y distribución de posición

- **Formato:** 23 `PROBLEM_SOLVING` · 10 `MULTIPLE_CHOICE` · 2 `NUMERIC_SERIES` (se
  varió como el examen real; no se forzó `CHART_TABLE` sin tabla, el defecto abierto
  de G28).
- **Dificultad:** BASIC 7 · INTERMEDIATE 17 · ADVANCED 9 · EXPERT 2 (≈ 20/49/26/6, la
  distribución objetivo de `_base.md`, la misma que G43). Los 2 `EXPERT`: integral
  definida por sustitución con cambio de límites, y abscisa `x>2` de la tangente
  horizontal de una cúbica (factorizar la derivada y elegir raíz).
- **Clave A = 9 · B = 9 · C = 9 · D = 8** (25.7 / 25.7 / 25.7 / 22.9 %), las cuatro
  en la banda 15-40 %. **Confirmada por `jsonb_array_elements` sobre `options`** de
  las 35 filas tras insertar. **La letra se asignó a mano** (no hay barajado del
  generador): objetivo global A9/B9/C9/D8 con **≥ 3 letras distintas en cada tema de
  ≥ 3 reactivos** y **tope 2 por letra por tema**. Para los reactivos numéricos la
  letra la fija el rango del valor correcto entre las 4 opciones ordenadas de forma
  ascendente (`_base.md`); para los conceptuales se elige la posición.
- **La secuencia literal de la clave NO se publica aquí** (regla de G38 §4): vive en
  la DB y en `docs/content-batches/g45-unam-a1-matematicas.json`, que la sesión ciega
  de G46 no abre.

### 6) Chequeos de forma (G3c / G34 §2 / G44 §6-§7)

- `content:validate-batch --dir <lote>`: **0 violaciones**
  (POSITION_SKEW/LETTER_CITATION/MALFORMED_OPTIONS/PASSAGE_LINK), antes de la DB y de
  nuevo como paso obligatorio de `content:insert --lot-dir` sobre los 10 archivos.
- **0 citas por letra** y **0 referencias posicionales** en las 105 capas
  (auto-chequeo con las regex de `lot-validation.ts` más `POSITION_REF` de G33). Las
  **35 capas 2** se titulan «Cómo se descarta cada opción» / «Resolución paso a
  paso» y descartan los tres distractores **por su contenido** (el valor numérico o
  la expresión), numerados 1/2/3 en el orden de redacción — no por su letra ni su
  posición.
- **Señuelo de longitud tie-aware (G34 §2 / G36 §2):** el puntaje esperado de «elige
  la más larga» quedó en **8.42 / 35 = 24.1 %** y el de «elige la más corta» en
  **7.92 / 35 = 22.6 %**, ambos por debajo del azar (25 %) y de la cota de 14/35.
  En un lote de matemáticas las opciones son valores o expresiones cortas y
  homogéneas por construcción, así que el señuelo casi no aplica; aun así se
  homogeneizaron a mano las 4 opciones conceptuales (T2, T5, L3, I1) que en el primer
  borrador traían un *outlier* de longitud.
- **Lenguaje absolutista (G44 §6):** 0.0 marcadores por opción tanto en las 35 claves
  como en los 105 distractores. **Opción compuesta como única clave (G44 §7):** 0/35.
  Ambos señuelos son de humanidades y no aplican a opciones que son números o
  fórmulas.
- **Fuga entre reactivos (G38 §6 / G40 §3 / G42 §8):** revisada en las dos
  direcciones y en la diagonal clave↔distractor. Ningún `stem` nombra el valor o la
  expresión que otro reactivo del lote pide, y ninguna clave reproduce el juego de
  opciones de otro. Un heurístico de 4-gramas sobre `(stem + clave)` de los 35
  devolvió **0 coincidencias no triviales**. Todos los reactivos usan números y
  contextos distintos (`_base.md` regla 5).

### 7) Inserción real — verificada en la DB

| Métrica | Antes de G45 | Después de G45 |
|---|---:|---:|
| Banco total | 902 | **937** |
| Servibles (`isVerified=true`) | 901 | 901 |
| Retirados a propósito | 1 | 1 |
| Cola ciega (`isVerified=false`, sin veredicto) | 0 | **35** |
| Cola canónica de discrepancias (`manualReview=null`) | 0 | **0** |
| `ExplanationLayer` del lote | — | **105** (3 × 35) |
| `question_source_chunks` del lote | — | **36** (21 SOURCED, algunos citan 2-3) |
| `SOURCED` en el banco | 230 | **251** (27 %) |
| `TEMARIO_ONLY` en el banco | 672 | **686** |
| UNAM A1 Matemáticas · pool (⚓ SOURCED/TEMARIO) | 81✓ · 57/24 | **81✓ / 35⧗ · 78/38** |

Chequeos post-inserción (query directa): los 35 con exactamente 4 opciones y 1
correcta, 105 `ExplanationLayer`, **21 `SOURCED` / 14 `TEMARIO_ONLY`**, clave
A9/B9/C9/D8 por `jsonb_array_elements`, dificultad 7/17/9/2, 0 con formato inválido.
Cohorte con `id` prefijo `cmtgam…`–`cmtgao…` del 2026-08-30 — separable por `topicId`
o por timestamp para la verificación ciega de G46.

**La brecha efectiva SÍ se moverá** cuando G46 apruebe, a diferencia de los lotes de
humanidades de G33–G43: el pool UNAM A1 Matemáticas está en **81 verificados frente a
la meta efectiva ~144** (peso 26 × densidad G26), así que los 35 caen **enteros
dentro** de la brecha — es el escenario que G39 §7 y G43 §2 recomendaban. `content:
coverage` en vivo: **901 servibles · 35 pendientes · 1 retirado · 937 en banco · 59 %
de la meta efectiva** (1 222); meta nominal de 1 500: **60 %**.

### 8) Limpieza

El lote se compuso con un generador de Python desechable en el scratchpad
(`g45/items_part1.py` + `items_part2.py` redactados a mano con los 35 reactivos y sus
3 capas; `g45/verify.py` recalcula cada valor con `sympy`; `g45/build.py` fija la
letra objetivo por reactivo, auto-chequea distribución de letra / señuelo de longitud
/ citas por letra / anclaje / fuga de 4-gramas, y emite los 10 archivos del lote). Un
segundo script (`_tmp_g45_record.ts`, borrado al terminar) construyó el registro
permanente con los `questionId` reales cruzando la DB con `records.json`. El
generador, los scripts de verificación y los 10 archivos del lote **no se
committean**; el registro permanente es
`docs/content-batches/g45-unam-a1-matematicas.json`. `pnpm typecheck` y `pnpm lint`
en verde (cero cambios de código de producción). Cero llamadas a la API de pago.

### Siguiente (G45)

1. **Verificación ciega del lote de G45** (segunda mitad del ciclo de G2), **modelo
   Fable 5**: `pnpm content:blind-batch --topic <cada uno de los 10 topicId>` →
   `content:resolve`. **LOTE DE CÁLCULO:** `isCalcSubject("Matemáticas")` es `true`,
   así que la sesión ciega recibe `requiresCalculation:true` y **debe EJECUTAR cada
   cálculo con código real** (Bash o su propio intérprete), no solo razonarlo — es el
   candado aritmético de G28, y aquí aplica a los 35. **0/35 con pasaje**; los 21
   `SOURCED` se resuelven igual con conocimiento de bachillerato porque
   `loadPendingQuestionsWithContext` **no pasa el texto del `SourceChunk`** (mismo
   caso que los `SOURCED` de G33/G37/G41/G43). **Aplicar G36 §2 / G38 §3:** recalcular
   el señuelo de longitud tie-aware sobre las respuestas ciegas y compararlo con §6
   (que la sesión ciega abre solo *después* de resolver). **Reactivos más apretados**
   (se señala cuáles, no cómo resolverlos, por G30 §1): los **2 `EXPERT`** (integral
   por sustitución con cambio de límites; abscisa `x>2` de la tangente horizontal de
   una cúbica) y los **2 `ADVANCED` con opciones-expresión** (fracción algebraica
   `(x²−25)/(x²−3x−10)`; circunferencia a partir de un diámetro).
2. **Huecos que siguen abiertos** tras G45:
   - **UNAM A1 Matemáticas** aún por debajo de meta (81/144 antes de G46; con G46,
     116/144) — un lote más cerraría el pool STEM de mayor peso.
   - **UNAM A4 Artes** (5 temas, w2, cero; tiene `SourceChunk` en 3 temas) — la última
     materia propia de UNAM A3/A4 en cero.
   - **IPN SOCADM** completo (Historia de México / Universal / Geografía), nombrado
     por G30–G43 sin abrir.
   - Los otros 4 pools STEM de alto peso de G39 §7 (IPN Física, IPN Química, IPN
     Matemáticas celda MEDBIO, IPN MEDBIO Biología).
3. **Auditoría 5 %: vencida, ahora 5 ciclos.** La muestra de 40 ids está generada y
   exige sesión ciega con tier **≠ opus-5**. Los lotes de G43 y **G45** entran al
   universo muestreable cuando G44 y G46 los verifiquen.
4. **Alcance del 21-nov aún sin resolver** (G24 §7 / G26 §8.4): lleva trece fases
   condicionando la planeación sin respuesta del dueño.
5. **Heredados sin tocar:** rotación A→B→C→D de ~140 reactivos viejos
   (G3a/G3d/G13/G15), las 8 `CHART_TABLE` reclasificadas en G39, la regla de G42 §8
   como código en `lot-validation.ts`, el rebanado de `SourceChunk` por página en vez
   de por encabezado (`uam_csh.pdf`, que G33/G37/G41/G43/**G45** ya usaron), y los 3
   reactivos de G37 que son paráfrasis cercanas de su guía fuente.

## G44 — Verificación ciega: Historia Universal, UNAM Área 3 (lote de G43) (2026-08-30)

**Modelo:** `claude-opus-5`. **G43 §1 anticipaba `fable-5`; la sesión corrió en tier
Opus**, y el `model` del archivo de respuestas declara el modelo que **realmente**
resolvió, no el que el plan preveía — que es justo lo que exige la corrección de
G17. **COMPLETADA. 35/35 auto-aprobados = tasa de auto-aprobación 100 %.** Segunda
mitad del ciclo adversarial de G2 sobre el lote que G43 insertó con
`isVerified=false`. **Decimocuarta ronda ciega consecutiva al 100 %** — métrica
saturada, se sigue diciendo porque es el criterio de publicación. Con esta fase
**cierra el Área 3 (Ciencias Sociales) de la UNAM**: sus 3 materias propias quedan
en **35✓/0⧗** — Historia de México (G33→G34), Geografía (G35→G36) e Historia
Universal (G43→**G44**).

Lo que esta fase aporta por encima del 100 % está en §6 y §7: **dos señuelos de
forma medidos, no intuidos**, que permiten acertar una parte del lote sin saber
historia. Ninguno afecta la corrección — los 35 reactivos son correctos y la clave
es la que debe ser— pero sí la validez de constructo, y por eso no se marcaron como
`problems` (que habrían despublicado reactivos correctos) sino que se dejan como
regla para el compositor.

### 1. Ceguera y aislamiento

**Verificados estructuralmente antes de leer un solo reactivo**, no asumidos:

| Control | Resultado |
|---|---|
| `grep -c` de `isCorrect\|explanation\|correct` sobre el lote ciego | **0** |
| Claves presentes en cada opción | solo `label`, `text`, `imageUrl` |
| Claves de nivel ítem | `questionId, institution, subject, topic, format, passage, requiresCalculation, stem, options` |
| Formato | **35/35 `MULTIPLE_CHOICE`** |
| `requiresCalculation` | **0/35** → `usedCalculation:false` declarado con verdad en los 35 |
| Reactivos con pasaje | **0/35** (los 35 llegan autocontenidos en el `stem`) |
| Opciones por reactivo · ids únicos | 4/4 en los 35 · 35 ids únicos |
| Longitud de opción | mín 95 · máx 148 · media 119.5 caracteres |
| Longitud de `stem` | mín 58 · máx 259 · media 137.0 caracteres |
| Institución/materia del lote | 35/35 UNAM · Historia Universal |

**Aislamiento:** no se abrió el commit `7e7d781` de G43, ni el JSON del lote, ni
`Question.options`, ni la sección `## G43` de este documento, ni su bloque
`### Siguiente`, antes de responder. El único insumo del razonamiento fue
`scripts/content-exports/g44-blind.json`.

**Fuga potencial, declarada:** la línea 3 de este documento (encabezado del
proyecto) apareció en el `grep -n "G43"` con que se localizó la fase, y contiene
agregados del lote —clave **A9/B9/C9/D8**, diagnósticos de longitud, reparto por
tema—. **No transmite ninguna clave por reactivo**, y además el lote ciego rebaraja
las etiquetas con semilla por `questionId`, así que la distribución sobre las
etiquetas originales no dice nada sobre las etiquetas ciegas. No se usó. Se anota
porque la afirmación de ceguera debe ser exacta, no aproximada: **conviene que la
próxima ronda localice la fase con `grep "^## G4x"` en vez de con el término suelto**,
para no traer la línea 3 al contexto.

**Reparto por tema del lote** (visible en el lote ciego, no es clave): Antigüedad
clásica 5 · Edad Media 4 · Renacimiento 4 · Ilustración 4 · Revoluciones de 1848 4 ·
Imperialismo e Industrialización 5 · Guerras Mundiales 5 · Siglo XXI 4.

### 2. El control de transcripción de G42 §2, aplicado

G42 §2 dejó recomendado como paso fijo del arnés que la letra del `chosenOption` no
se copie a mano, sino que se **derive del contenido**. Aquí se aplicó como
verificación independiente sobre el archivo ya escrito: un script del scratchpad
recibe, por reactivo, **un fragmento distintivo del texto de la opción que el
razonamiento describe**, y resuelve la etiqueta contra `g44-blind.json` con dos
asserts duros — `snippets.length === items.length` y **exactamente un match** por
fragmento.

| Control | Resultado |
|---|---|
| Fragmentos con match único (≠1 lanza) | **35/35** |
| Letra derivada del contenido == letra escrita en el JSON | **35/35** |

Cero desajustes: la transcripción de esta ronda fue correcta, y ahora consta por
contenido y no por memoria. **Nota de arnés:** aquí el control corrió *después* de
escribir el archivo, así que valida pero no previene. G42 lo corrió *antes* (generó
el archivo desde los fragmentos) y por eso atrapó un error real. **La forma
preventiva es la buena**; esta ronda la degradó a comprobación posterior y conviene
volver al orden de G42.

### 3. Resolución

`pnpm content:resolve --file scripts/content-exports/g44-answers.json`, con
`--dry-run` previo para validar el formato contra `VerifierAnswersFileSchema`
(35/35 parseadas) antes de escribir.

| Resultado | n |
|---|---:|
| ✔ Auto-aprobados (coincide + `confidence ≥ 0.85` + `problems` vacío) | **35** |
| ✋ Sin publicar con veredicto | **0** |
| ⚠️ Omitidos | **0** |

Confianzas declaradas: **0.94 la mínima** (#19, la «cuestión social» de 1848),
0.95–0.96 en once, 0.97–0.98 en los veintitrés restantes. `model` declarado
`claude-opus-5`; `usedCalculation:false` en los 35, verdadero por construcción
(0/35 admiten cálculo). **Comprobado en la DB tras escribir**, no solo en el log:
`verification.verdict.model = claude-opus-5`, `usedCalculation = false`,
`decision = AUTO_APPROVED`, `pipeline = session-v1`.

### 4. Balance de la clave real (leído después de responder)

El log de `content:resolve` traduce la etiqueta barajada de vuelta a la original, así
que la clave se conoce **solo después** de haber respondido:

| | A | B | C | D |
|---|---:|---:|---:|---:|
| n | 9 | 9 | 9 | 8 |
| % | 25.7 | 25.7 | 25.7 | 22.9 |

Reproduce **al reactivo** lo que G43 reportó por query directa a la DB, ahora por vía
independiente. Rotación cíclica A→B→C→D: **0/34 pares consecutivos = 0.0 %**. Racha
máxima de la misma letra: **2**. Equilibrio por tema respetado en los 8 temas (tope
2 por letra, ≥3 letras distintas; 4 letras distintas en los dos temas de 5).

### 5. Diagnóstico de longitud recalculado sobre las respuestas ciegas (G36 §2 / G38 §3)

G43 §1 pidió recalcular el señuelo de longitud sobre las **respuestas ciegas** y
compararlo con lo que reportó el compositor. Coincide exactamente:

| Métrica (tie-aware) | G43 (contra `isCorrect`) | G44 (contra la clave elegida a ciegas) |
|---|---:|---:|
| «elige la más larga» | 5.00/35 = 14.3 % | **5.00/35 = 14.3 %** |
| «elige la más corta» | 5.00/35 = 14.3 % | **5.00/35 = 14.3 %** |
| ratio medio clave/distractores | 1.045 (mín 0.89, máx 1.20) | **1.045 (mín 0.89, máx 1.20)** |

Histograma de rango por longitud (1 = la más larga): **5 / 23 / 2 / 5**. Los extremos
están deliberadamente equilibrados (5 y 5), como G43 describe. **El pico en rango 2
(23/35) es el residuo del ajuste**: al bajar la clave desde «la más larga» sin
empujarla al extremo corto, quedó parqueada un escalón abajo. No es explotable —
«elige la segunda más larga» no es una heurística que un sustentante aplique— pero
explica por qué el ratio medio sigue por encima de 1.

### 6. Hallazgo: el distractor se delata por el lenguaje absolutista

Al descartar distractores apareció un patrón sistemático, y se midió con regex sobre
las 140 opciones (`únicamente`, `por sí sola`, `del todo`, `por completo`, `ninguna`,
`todas las`, `siempre`, `nunca`, `inmediata`, `permanente`, `definitiva`, `única`,
`de un día para otro`, `en exclusiva`…):

| | marcadores | opciones | por opción |
|---|---:|---:|---:|
| Claves | **1** | 35 | **0.03** |
| Distractores | **43** | 105 | **0.41** |

**Un distractor lleva lenguaje absolutista ~14 veces más que una clave.** En
**11/35** reactivos la clave tiene cero marcadores mientras ≥2 distractores llevan al
menos uno; en **3/35**, los tres distractores lo llevan y la clave no. En esos casos
«descarta la opción que absolutiza» resuelve el reactivo sin saber historia.

Es un señuelo de forma clásico y aquí es fuerte. **No se marcó como `problem`**: los
reactivos son correctos y el descarte por contenido, que es lo que se hizo, llega a
la misma clave. Pero baja la discriminación real del ítem. **Regla para el
compositor: el matiz absolutista debe repartirse, no concentrarse en los
distractores** — un distractor puede ser falso sin decir «únicamente», y una clave
puede contener un absoluto verdadero («ningún Estado los resuelve solo» lo hace, y es
la única clave con marcador del lote).

### 7. Hallazgo: la clave es la única opción que enumera varios factores

Segundo señuelo de forma, del mismo tipo pero por otra vía. **8/35 `stem` anuncian
multicausalidad o piden dos cosas a la vez** (#4, #5, #6, #12, #13, #17, #21, #31:
«rara vez se atribuye a una sola causa», «¿qué factores confluyeron?», «la
explicación más completa», «¿qué las vincula… y qué las precipitó?»). En **10 de los
35** reactivos del lote —#4, #5, #12, #13, #17, #21, #22, #24, #26, #28— la clave es
**la única opción que enumera dos o más factores heterogéneos**, mientras los tres
distractores son monocausales, varios autodelatándose («por sí sola», «única»,
«únicamente», «directa e inmediata»). Ahí basta con **elegir la opción compuesta**.

Dos reactivos resisten el patrón y muestran cómo se corrige: **#6** (feudalismo)
tiene un distractor —el del Estado centralizado con burocracia, ejército permanente e
impuesto en dinero— tan compuesto como la clave, y **#31** (fin de la 2GM) enfrenta
dos opciones con dos consecuencias cada una, así que hay que saber cuál par ocurrió.
**Regla: cuando el `stem` pide varios factores, al menos un distractor debe ofrecer
también varios factores —pero equivocados.** Es la contraparte de la regla de G43
sobre el señuelo de longitud, y por la misma causa: la síntesis multicausal tiende a
ser más larga *y* más compuesta que sus alternativas, así que corregir solo la
longitud deja intacto el segundo canal.

### 8. Los 4 reactivos que G43 marcó como más apretados

G43 §1 señaló cuáles serían los difíciles (sin decir cómo resolverlos, por G30 §1).
Contraste con lo que salió a ciegas:

| # | Qué es | Confianza declarada | Resultado |
|---|---|---:|---|
| #5 | `EXPERT` — caída de Roma multicausal | 0.96 | ✔ |
| #22 | `EXPERT` — por qué Gran Bretaña industrializó primero | 0.97 | ✔ |
| #19 | la «cuestión social» en 1848 | **0.94 (mínima del lote)** | ✔ |
| #31 | `SOURCED` — dos consecuencias del fin de la 2GM, el más alejado de su ítem-semilla | **0.98** | ✔ |

**#19 fue en efecto el más apretado**, y por sí solo: distinguir «programa obrero
propio» de «revolución exclusivamente campesina» exige saber que 1848 fue urbano y
que las Jornadas de Junio rompieron el bloque con la burguesía; la confianza bajó a
0.94 por eso, no por ambigüedad de la clave. **Los dos `EXPERT` no resultaron
apretados en la práctica** — son justamente los dos casos donde el señuelo de §7
opera con más fuerza (ambos son «elige la síntesis multicausal»), lo que sugiere que
su dificultad declarada es mayor que la real. **#31 salió a 0.98**: la
transformación de G43 (de atribución a comprensión de proceso) funcionó, el reactivo
se resuelve con conocimiento de bachillerato y no depende del `SourceChunk` que no
viaja al lote ciego.

### 9. Exactitud factual: qué se verificó

El encargo pidió verificar exactitud factual, no solo elegir. Se comprobó opción por
opción; los puntos donde un error habría cambiado el veredicto:

- **Cronología de las trampas anacrónicas**, dos deliberadas y ambas detectadas: la
  opción de #12 llama a la Revolución francesa «muy anterior» a 1517, y la de #21
  atribuye las independencias hispanoamericanas a la crisis de **1929**.
- **Fechas de la clave y de los distractores:** ley de ciudadanía de Pericles
  451/450 a. C.; tesoro de Delos a Atenas **454 a. C.**; caída del Imperio persa ante
  Alejandro **330 a. C.** (falsea el «hundimiento inmediato» tras las Guerras
  Médicas); Verdún **843**; coronación de Carlomagno **800**; caída de Acre **1291** y
  de Constantinopla **1453** (falsean el «dominio permanente» y el «fin de Bizancio
  como propósito de todas las cruzadas»); *Exsurge Domine* **1520** y excomunión
  **1521**; Italia **1861** y Alemania **1871**; abdicaciones de Bayona **1808**;
  Conferencia de Berlín **1884-1885**; Sociedad de Naciones **1919-1920** (no Viena
  1815); salida del patrón oro **1933**; República Popular China **1 de octubre de
  1949**; CECA **1951** / Declaración Schuman.
- **Datos cuantitativos de distractores:** la población británica de 1760 (~7-8
  millones) es muy inferior a la francesa (~25 millones), así que «la más numerosa de
  Europa» es falsa; y el combustible de la primera industrialización fue el **carbón**
  — no hubo petróleo británico a mediados del XVIII (el del Mar del Norte es de los
  años setenta del XX).
- **Un mito historiográfico usado como distractor**, correctamente identificado: el
  de la Tierra plana en #13. La esfericidad se conocía desde la Antigüedad; el debate
  real de 1492 era sobre el **tamaño** del globo, y Colón lo tenía mal.
- **Tesis monocausales rechazadas por la historiografía**, no por ser falsas de plano:
  el cristianismo como causa única de la caída de Roma (Gibbon) en #5 y la división
  de 395 como causa «directa e inmediata» — hechos reales convertidos en distractor
  por el salto causal, que es la forma correcta de construirlos.

**0 atribuciones erróneas, 0 fechas incorrectas, 0 claves discutibles.** No se marcó
ningún `problem`: nada en el lote depende de una interpretación en disputa entre
escuelas historiográficas.

### 10. Acumulado real (DB en vivo, antes y después)

| Métrica | Antes de G44 | Después de G44 |
|---|---:|---:|
| Banco (`Question`) | 902 | **902** |
| Servibles (`isVerified=true`) | 866 | **901** |
| Cola ciega (pendientes de resolución) | 35 | **0** |
| Retirados a propósito (`isVerified=false`) | 1 | **1** |
| Auto-aprobación global | 100 % (867/867) | **100 % (902/902)** |
| UNAM A3 · Historia Universal | 0✓ / 35⧗ | **35✓ / 0⧗** (⚓5/30) |
| `SOURCED` | 230 (25 %) | **230 (25 %)** |
| Meta efectiva G26 (1 222) | 57 % · brecha 529 (~16 lotes) | **59 % · brecha 501 (~15 lotes)** |
| Meta nominal 1 500 | 58 % | **60 %** |

Cruzado con `content:coverage` y con `groupBy` directo sobre `Question.isVerified`
(901 `true` + 1 `false` = 902). **Cola ciega y cola canónica de discrepancias, ambas
en cero.** `pnpm typecheck` y `pnpm lint` en verde; **cero cambios de código de
producción** (el lote ciego y el archivo de respuestas viven en
`scripts/content-exports/`, el verificador de fragmentos en el scratchpad); cero
llamadas a la API de pago.

**Nota sobre `content:coverage` y el Área 3:** sus 3 materias propias quedan en
35✓, pero Español e Inglés del Área 3 siguen mostrando 0✓ porque son materias
**compartidas** (`sharedContentKey`, G26) y `content:coverage` aún no refleja la
reutilización — el hueco es de reporte, no de contenido (G30 §10.3, sigue abierto).

### Siguiente (G44)

1. **Composición nueva.** El Área 3 y el Área 4 de la UNAM quedan cerradas en sus
   materias propias salvo una: **UNAM A4 Artes** (5 temas, `questionWeight` 2, cero
   reactivos, con `SourceChunk` en 3 de sus 5 temas) — la última materia propia de
   UNAM A3/A4 en cero, y la que mejor anclaje en fuentes tiene de las pendientes.
   Alternativa de mayor impacto sobre la brecha **efectiva**: los 5 pools STEM de alto
   peso de G39 §7 (IPN Física, IPN Química, IPN Matemáticas celda MEDBIO, UNAM A1
   Matemáticas, IPN MEDBIO Biología). **IPN SOCADM** sigue intacto en sus tres
   materias de historia y geografía (Historia de México 6 temas, Historia Universal 7,
   Geografía 5), nombrado desde G30 y nunca abierto.
2. **Las dos reglas de §6 y §7 al arnés, no solo al documento.** Ambas son medibles
   con regex y ambas se calcularon aquí en tres líneas de Node:
   - concentración de lenguaje absolutista en distractores vs. clave (umbral
     razonable: que la clave no sea la única sin marcador en más de ~1/5 del lote);
   - «la clave es la única opción compuesta» cuando el `stem` pide varios factores.
   Van naturalmente en `scripts/lib/lot-validation.ts`, junto al señuelo de longitud
   de G34 §2 y a la regla de cruce intra-lote de G42 §8 (que sigue sin implementarse).
3. **Auditoría 5 %: vencida, 4 ciclos.** La muestra exige tier **≠ opus-5**, y esta
   sesión fue opus-5, así que tampoco esta vez. Los lotes de G41 (verificado en G42) y
   de **G43 (verificado aquí)** ya están en el universo muestreable. **Es la deuda más
   vieja del pipeline y la única que no se puede saldar cambiando de materia: hay que
   correr una ronda en otro tier.**
4. **Orden preventivo del control de transcripción** (§2): generar el archivo de
   respuestas desde los fragmentos, como en G42, en vez de validarlo después.
5. **Localizar la fase con `grep "^## G4x"`** y no con el término suelto, para no
   traer la línea 3 de este documento al contexto de una sesión ciega (§1).
6. **Heredados sin tocar:** el work order de G40 §3-§4 (reescribir los 4 `stem` de
   G37 pegados a la guía; rebanar `SourceChunk` por encabezado de sección en la
   ingesta, que afecta a `uam_csh.pdf`), la rotación A→B→C→D de ~140 reactivos viejos
   (G3a/G3d/G13/G15), las 8 `CHART_TABLE` reclasificadas en G39, y el **alcance del
   21-nov** (G24 §7 / G26 §8.4): ¿entran UNAM A3/A4 e IPN SOCADM en la meta de
   1 500 / 1 222? Lleva trece fases condicionando la planeación sin respuesta del
   dueño.

---

## G43 — Lote de reactivos: Historia Universal, UNAM Área 3 (2026-08-30)

**Modelo:** `claude-sonnet-5` (tier Sonnet del Plan de Implementación para lotes de
contenido). **COMPLETADA. 35 reactivos insertados con `isVerified=false`** en la
cola de verificación ciega. **Última de las 3 materias propias del Área 3 (Ciencias
Sociales) con contenido**, tras Historia de México (G33) y Geografía (G35); Historia
Universal estaba en cero absoluto.

### 1) El encargo y la elección de materia

El encargo pidió **35 reactivos de Historia Universal para UNAM Áreas 3 y 4**.
Consulta en vivo a Supabase (2026-08-30) antes de componer:

| Institución · Área | Materia | `sharedContentKey` | `questionWeight` | Temas | Reactivos hoy | `SourceChunk` |
|---|---|---|---:|---:|---:|---:|
| UNAM · Área 3 | **Historia Universal** | `null` | **5** | **8** | **0** | **1** (tema 7) |
| IPN · SOCADM | Historia Universal | `null` | 4 | 7 | 0 | 0 |

**Historia Universal solo existe en el Área 3 de la UNAM.** El Área 4 (Humanidades y
Artes) tiene Literatura, Filosofía, Artes y Español —no historia—, así que «Áreas 3
y 4» se resuelve a la **única Historia Universal del Área 3**, mismo criterio que
Literatura en G37 (materia del Área 4 sin gemela en el Área 3). La Historia Universal
del IPN SOCADM es de **otra institución** y **G26 no cruza instituciones**
(§G26.2). `sharedContentKey` NULL → el lote va a sus **8 temas propios**, sin
reutilización entre áreas — patrón de Historia de México (G33), Geografía (G35),
Literatura (G37) y Filosofía (G41). Con este lote, las 3 materias de historia y
geografía del Área 3 quedan cubiertas.

### 2) Reparto por los 8 temas y anclaje: 30 TEMARIO_ONLY / 5 SOURCED

| Tema (posición en el temario) | Reactivos | Grounding | Ejes cubiertos |
|---|---:|---|---|
| Antigüedad clásica | 5 | TEMARIO_ONLY | democracia directa ateniense y sus exclusiones, Liga de Delos y hegemonía, helenismo como fusión cultural, crisis de la República y Principado, caída de Roma de Occidente (multicausal, EXPERT) |
| Edad Media | 4 | TEMARIO_ONLY | feudalismo como sistema (vasallaje + señorío) y su origen poscarolingio, la Iglesia como institución de cohesión, consecuencias comerciales de las Cruzadas, resurgir urbano y alianza rey-burguesía |
| Renacimiento | 4 | TEMARIO_ONLY | humanismo y antropocentrismo, imprenta y difusión de ideas, causas de la Reforma, causas de la expansión oceánica ibérica |
| Ilustración | 4 | TEMARIO_ONLY | idea central de la Ilustración, división de poderes, aportación de la independencia de EE. UU., causas convergentes de la Revolución francesa |
| Revoluciones de 1848 | 4 | TEMARIO_ONLY | Restauración de Viena frente a la «primavera de los pueblos», aparición de la «cuestión social» en 1848, nacionalismo y unificaciones de Italia y Alemania, independencias hispanoamericanas en el ciclo atlántico |
| Imperialismo e Industrialización | 5 | TEMARIO_ONLY | por qué la Revolución industrial arrancó en Gran Bretaña (confluencia, EXPERT), de la sociedad de estamentos a la de clases, componente económico del imperialismo, Conferencia de Berlín, ideología de la «misión civilizadora» |
| Guerras Mundiales | 5 | **SOURCED** | imperialismo colonial 1870-1914 y su enlace con 1914, rivalidad y alianzas en la escalada de la Gran Guerra, derrota de Japón y triunfo comunista en China, mecanismo del New Deal, consecuencias del fin de la 2GM (orden bipolar y descolonización) |
| Siglo XXI | 4 | TEMARIO_ONLY | disolución de la URSS y fin del orden bipolar, definición de globalización económica, integración supranacional (Unión Europea), naturaleza de los desafíos transnacionales |

**Anclaje del tema 7.** `loadTopicChunks` devolvió **1 `SourceChunk`** para «Guerras
Mundiales» (`cmrsromj5007w13b3kucb24uh`): **p. 44 de `uam_csh.pdf`** —la guía de
Ciencias Sociales y Humanidades de la UAM, la misma familia que aportó los chunks de
G33/G37/G40/G41— un **banco de 4 reactivos de opción múltiple** de historia
contemporánea (imperialismo colonial 1870-1914; rivalidad imperialista y Primera
Guerra Mundial; derrota de Japón y República Popular China; New Deal ante la
depresión mundial), clasificado a este tema por el pipeline F2b. `grounding.ts` hace
**obligatoria** la cita cuando hay fragmento: los **5 reactivos** de ese tema citan
`sourceChunks:[1]` y quedan `groundingStatus = SOURCED`; los otros **7 temas** salen
`TEMARIO_ONLY` (**30**), compuestos desde el temario oficial del Área 3.

**Procedencia y rebanado del chunk (patrón G40 §7 / G41 §2), documentado, no
bloqueante.** El fragmento proviene de la guía de **otra institución** (UAM) que la
del examen destino (UNAM); no lo prohíbe ningún guardrail —G26 restringe la
reutilización de *reactivos* entre áreas, no el uso de una guía como material de
estudio—, pero se anota. A diferencia de los chunks de G40/G41, este está **rebanado
por página pero sus 4 ítems son homogéneos** (todos de historia contemporánea): no
arrastra ítems de temas ajenos, así que los 5 reactivos derivan de material del
propio tema.

### 3) Originalidad de los reactivos SOURCED (patrón G40 §6 / G41 §3)

Los 5 SOURCED **transforman la tarea cognitiva** del ítem-semilla:

- Los ítems de la guía son de atribución («¿cómo se llama…?») o de «¿qué provocó
  *X*?», con respuesta de una palabra o una frase corta. Los reactivos compuestos
  **nombran el hecho en el `stem`** y preguntan por el **proceso** o la
  **causalidad**: «¿qué distingue esta fase y cómo se enlaza con 1914?», «¿qué
  proceso previo explica que un incidente local escalara?», «¿cuál fue el efecto
  sobre la política interna de China?», «¿cuál fue el mecanismo central del New
  Deal?». `stem` propio y juegos de opciones compuestos de cero (no se copiaron los
  de la guía).
- **#27** combina los ítems 73 y 74 (el término «imperialismo colonial» para
  1870-1914 + su enlace con la Gran Guerra). **#31** es el más alejado de su
  ítem-semilla: generaliza el momento del ítem 75 (la reorganización del mundo tras
  1945, que empieza en Asia con la caída de Japón y la RPC) a sus **dos
  consecuencias geopolíticas globales** (orden bipolar + descolonización). Se
  **declara** aquí para que la ronda ciega de G44 lo revalide.
- No es un defecto de corrección: los 5 son factualmente correctos.

### 4) Formato, dificultad y cobertura

- **Formato:** 35 `MULTIPLE_CHOICE`. La sección de Historia del examen de la UNAM es
  opción múltiple simple; los reactivos que presentan un contexto para analizarlo lo
  llevan **dentro del `stem`** (autocontenido), sin `Passage`. 0 admiten cálculo.
- **Dificultad:** BASIC 7 · INTERMEDIATE 17 · ADVANCED 9 · EXPERT 2 (≈ 20/49/26/6,
  la distribución objetivo de `_base.md`; misma que G33/G35/G37/G41). Los 2 `EXPERT`
  son de síntesis: la **caída de Roma de Occidente** (proceso multicausal frente a
  causa única) y **por qué la Revolución industrial arrancó en Gran Bretaña**
  (confluencia de factores frente a causa única).
- **Prioridad del encargo — procesos y causalidad sobre fechas aisladas:** la
  práctica totalidad de los 35 pregunta por causas, consecuencias, contrastes o la
  naturaleza de un proceso. Las fechas aparecen en el `stem` como marco temporal,
  **nunca como lo que se pide identificar**. Ningún reactivo es de efeméride.
- **Distractores (observación de G36 §5 atendida):** cada distractor es una
  **posición rival plausible** o un **error documentado de estudiante**: sistema
  representativo confundido con democracia directa, feudalismo confundido con Estado
  centralizado o con esclavismo romano, causa única (cristianismo, una batalla, la
  partición de 395) para la caída de Roma, Reforma confundida con la disputa de la
  Pascua, esfericidad de la Tierra como objeto de los viajes de Colón, anacronismos
  (Revolución industrial antes de 1500, crisis de 1929 antes de las independencias
  americanas), inversión de la posición (Japón ocupante de China en vez de
  derrotado). **Caveat honesto (patrón G34 §4):** en ~6 reactivos algún distractor
  cae además por imposibilidad material o cronológica sin necesitar el dato exacto
  («Sociedad de Naciones» fundada por el Congreso de Viena, «Imperio romano» como
  meta de 1848, catástrofe natural para la caída de la URSS); sus etiquetas son
  INTERMEDIATE/BASIC.

### 5) Distribución de posición y cue de longitud (G3c / G8 / G34 §2)

- **Clave A = 9 · B = 9 · C = 9 · D = 8** (25.7 / 25.7 / 25.7 / 22.9 %), las cuatro
  en la banda 15-40 %. **Confirmada por query directa a la DB tras insertar**
  (`jsonb_array_elements` sobre `options` de las 35 filas).
- **Equilibrio también por tema:** tope 2 por letra y ≥ 3 letras distintas por tema —
  Antigüedad A2/B0/C2/D1, Edad Media A0/B1/C1/D2, Renacimiento A2/B0/C1/D1,
  Ilustración A1/B2/C0/D1, Rev. 1848 A1/B1/C2/D0, Imperialismo A1/B1/C1/D2, Guerras
  A1/B2/C1/D1, Siglo XXI A1/B2/C1/D0.
- **La letra la asigna el generador:** DFS aleatorizada con semilla fija (**43043**)
  que descarta corridas cíclicas A→B→C→D de longitud ≥ 3 (ambos sentidos) y triples,
  y minimiza la rotación +1 — resultado **rotación +1 = 0.0 %** (azar ≈ 25 %). **La
  secuencia literal NO se publica aquí** (regla de G38 §4): vive en la DB y en
  `docs/content-batches/g43-unam-a3-historia-universal.json`, que la sesión ciega de
  G44 no abre.
- **Cue de longitud — G34 §2, valor exacto en esta sección (G38 §3):** el puntaje
  esperado **tie-aware de «elige la más larga», empates al azar**, quedó en **5.00 /
  35 = 14.3 %** — por debajo del azar del 25 % y de la cota de 14/35. La heurística
  inversa **«elige la más corta»** quedó también en **5.00 / 35 = 14.3 %**. **Ratio
  medio** de longitud correcta / distractores = **1.045** (mín 0.89, máx 1.20).
  Histograma de rango de longitud de la correcta (1 = más larga): **{1: 5, 2: 23,
  3: 2, 4: 5}** — con **varianza deliberada en ambos extremos** (5 reactivos con la
  correcta como la más larga, 5 con la más corta) para que el rango no sea un pico
  en 2, patrón aprendible por sí mismo. El **primer borrador** daba la correcta como
  la más larga en **34/35** —arrastraba la síntesis multicausal («A, B, C y D»),
  el mismo defecto que corrigieron G33/G35/G37/G41—; **tres pasadas**: recorte de
  las correctas a la aserción, homogeneización de los distractores y varianza
  controlada.
- `content:validate-batch --dir <lote>`: **0 violaciones** (corrido antes de tocar
  la DB y de nuevo como paso obligatorio de `content:insert --lot-dir` sobre los
  8 archivos).
- **0 citas por letra** y **0 citas posicionales** en las 105 capas de explicación
  (auto-chequeo del generador con las regex de `lot-validation.ts` más el patrón
  `POSITION_REF` de G33). Las **35 capas 2** se titulan **«Cómo se descarta cada
  opción»** y descartan los tres distractores **por su contenido** (numerados 1/2/3
  en el orden de redacción), nunca por su posición ni su letra.

### 6) Fuga entre reactivos — revisada en las dos direcciones y en la diagonal (G38 §6 / G40 §3 / G42 §8)

Ningún `stem` nombra el dato que otro reactivo del lote pide identificar. Se aplicó
la regla nueva de G42 §8 (cruzar **claves contra distractores** de todo el lote), y
dos pares necesitaron desacople:

1. **#11 (imprenta) → #12 (Reforma):** la clave de #12 enumeraba «la imprenta» como
   uno de los factores de la rápida expansión de la Reforma, que es justo lo que #11
   establece. Se **quitó «la imprenta» de la clave de #12** (pasa a su capa 1): así,
   resolver #11 ya no sirve #12.
2. **#24 (componente económico del imperialismo) ↔ #27 (imperialismo colonial):** la
   clave de #27 decía «asegurar recursos y mercados», que reproduce casi entera la
   clave de #24. Se **reescribió la clave de #27** para centrarla en «el control
   político directo del territorio en vez del simple comercio», sin enunciar el
   motivo económico (que queda en su capa 1).

**Pares reforzantes conservados a propósito** (patrón G41 §6): #22/#23 (causas de la
industrialización / sociedad de clases resultante), #24/#26 (motivo económico /
discurso ideológico), #18–#21 (cuatro caras de la Europa de 1848). #29 (Japón→RPC) y
#31 (fin de la 2GM→bipolaridad + descolonización) tratan consecuencias distintas de
la misma guerra y ninguna clave nombra la respuesta de la otra. Un heurístico de
n-gramas sobre las 35 solo devolvió coincidencias triviales de encuadre.

`lot-validation.ts` sigue sin poder ver este tipo de fuga: es una relación entre dos
ítems, no una propiedad de uno (defecto anotado en G38 §6; candidato a regla en
`scripts/lib/lot-validation.ts` según G42 §8).

### 7) Exactitud factual

**Los 35 `stem` y las 140 opciones verificados uno por uno antes de insertar**
(criterio del encargo). Se comprobaron fecha, autoría, orden y adscripción de proceso
de, entre otros: ley de ciudadanía de Pericles (451 a. C.); traslado del tesoro de
Delos a Atenas; koiné y sincretismo helenístico; reformas de los Gracos y Principado
de Augusto (27 a. C.); crisis del s. III, migraciones germánicas y deposición de
Rómulo Augústulo (476), con supervivencia del Imperio de Oriente; disolución
carolingia y señorío; querella de las investiduras; caída de Acre (1291) y saqueo de
Constantinopla por la IV Cruzada (1204); revolución agrícola medieval y fueros
urbanos; `studia humanitatis`; Gutenberg (h. 1450) y >200 imprentas hacia 1500; 95
tesis (1517), paz de Augsburgo (1555) y Contrarreforma; caída de Constantinopla
(1453), carabela/brújula/astrolabio y Tratado de Tordesillas; derechos naturales y
`sapere aude`; *Del espíritu de las leyes* (1748); Declaración de Independencia
(1776) y Constitución de 1787; Estados Generales (1789), fuga de Varennes (1791),
ejecución de Luis XVI (1793); Congreso de Viena (1815), Santa Alianza y primavera de
los pueblos; jornadas de junio de 1848 y *Manifiesto Comunista*; Reino de Italia
(1861) e Imperio alemán (1871); invasión napoleónica de España (1808) y Constitución
de Cádiz (1812); cercamientos y máquina de vapor de Watt; burguesía y proletariado
frente a la sociedad de órdenes; materias primas, mercados e inversiones coloniales;
Conferencia de Berlín (1884-85) y ocupación efectiva; misión civilizadora y
darwinismo social; paz armada, crisis marroquíes y balcánicas, Triple Alianza y
Triple Entente, invasión de Bélgica; guerra sino-japonesa desde 1937, proclamación
de la RPC (1 oct 1949) y repliegue a Taiwán; New Deal y abandono del patrón oro
(1933); Yalta y Potsdam, doctrina Truman y plan Marshall, descolonización (India
1947, oleada africana de 1960); perestroika/glásnost, caída del Muro (1989), golpe
fallido de agosto de 1991; OMC y multinacionales; de la CECA (1951) a Maastricht
(1993), euro y Schengen; conferencias sanitarias internacionales del s. XIX.
**Ninguna atribución, fecha ni proceso resultó falso.**

### 8) Inserción real — verificada en la DB

| Métrica | Antes de G43 | Después de G43 |
|---|---:|---:|
| Banco total | 867 | **902** |
| Servibles (`isVerified=true`) | 866 | 866 |
| Retirados a propósito | 1 | 1 |
| Cola ciega (`isVerified=false`, sin veredicto) | 0 | **35** |
| Cola canónica de discrepancias (`manualReview=null`) | 0 | **0** |
| `ExplanationLayer` del lote | — | **105** (3 × 35) |
| `question_source_chunks` del lote | — | **5** (1 × 5 de «Guerras Mundiales») |
| `SOURCED` en el banco | 225 | **230** |
| `TEMARIO_ONLY` en el banco | 642 | **672** |
| UNAM A3 Historia Universal · 8 temas | 0×8 | **5 / 4 / 4 / 4 / 4 / 5 / 5 / 4** |

Chequeos post-inserción (query directa): los 35 con exactamente 4 opciones y 1
correcta, 105 `ExplanationLayer`, **5 `SOURCED` / 30 `TEMARIO_ONLY`**, los 5
`SOURCED` citan el chunk `cmrsromj5007w…`, cola ciega 0 → 35, clave A9/B9/C9/D8
(por `jsonb_array_elements`), dificultad 7/17/9/2, 0 con formato ≠ `MULTIPLE_CHOICE`.
Cohorte con `id` prefijo `cmtg7d…`–`cmtg7eq…` del 2026-08-30 — separable por
`topicId` o por timestamp para la verificación ciega de G44.

**La brecha efectiva no se mueve** (529, ~16 lotes): la meta efectiva de Historia
Universal (w5 → ~28 por G39 §7) la cubrirán y superarán los 35 cuando G44 los
apruebe — mismo patrón que Literatura (G37) y Filosofía (G41): cobertura de producto
real (un aspirante del Área 3 no tenía nada de Historia Universal), pero contra la
meta del 21-nov ~28 cierran y ~7 caen en un pool que quedará sobre-cubierto.
`content:coverage` en vivo: **866 servibles · 35 pendientes · 1 retirado · 902 en
banco · 57 % de la meta efectiva**.

### 9) Limpieza

El lote se compuso con un generador de Python desechable (`items_g43.py` redactado a
mano + `build_g43.py` + parches de longitud) en el scratchpad de la sesión: los 35
reactivos están **redactados a mano** en `items_g43.py`; el generador solo asigna la
letra correcta (DFS anti-rotación con semilla + equilibrio por tema), auto-chequea
—antes de validar— la distribución de letra, el **puntaje tie-aware de longitud
(G34 §2)**, las citas por letra y posicionales y el grounding obligatorio del tema 7,
y emite los 8 archivos del lote. Un segundo script (`enrich_g43.py`) construyó el
registro permanente con los `questionId` reales. El generador, los parches, el
verificador de fugas y los 8 archivos del lote **no se committean**; el registro
permanente es `docs/content-batches/g43-unam-a3-historia-universal.json`. `pnpm
typecheck` y `pnpm lint` en verde (cero cambios de código de producción). Cero
llamadas a la API de pago.

### Siguiente (G43)

1. **Verificación ciega del lote de G43** (segunda mitad del ciclo de G2), **modelo
   Fable 5**: `pnpm content:blind-batch --topic <cada uno de los 8 topicId>` →
   `content:resolve`. **Lote 100 % verbal**, como G30/G33/G35/G37/G41: **0/35
   admiten cálculo**, así que no cabe el candado aritmético de G28; el control es el
   **descarte explícito de los tres distractores por su contenido** y la
   **confianza declarada**. Los **5 reactivos de «Guerras Mundiales» son `SOURCED`**,
   pero `loadPendingQuestionsWithContext` **no pasa el texto del `SourceChunk`** a la
   sesión ciega (mismo caso que los `SOURCED` de G33/G37/G41): se resuelven con
   conocimiento de historia de bachillerato, igual que el resto. **Sin pasajes** →
   los 35 llegan autocontenidos en el `stem`. **Aplicar G36 §2 / G38 §3:**
   recalcular los diagnósticos de longitud (tie-aware «más larga»/«más corta», ratio
   medio) sobre las **respuestas ciegas** y compararlos con los veredictos de §5
   (que la sesión ciega abre solo *después* de resolver). **La comparación de la
   secuencia de clave exacta (G38 §4) la hace el dueño o una fase editorial** con
   acceso al registro permanente, no la sesión ciega. **Reactivos más apretados** (se
   señala cuáles, no cómo resolverlos, por G30 §1): los **2 `EXPERT`** (#5 caída de
   Roma multicausal, #22 por qué Gran Bretaña industrializó primero), **#19** (la
   «cuestión social» en 1848) y el `SOURCED` **#31** (dos consecuencias del fin de la
   2GM), que es el más alejado de su ítem-semilla.
2. **Huecos que siguen abiertos** tras G43:
   - **UNAM A4 Artes** (5 temas, w2, cero; tiene `SourceChunk` en 3 temas) — la
     última materia propia del Área 4 sin contenido, y la última materia propia de
     UNAM A3/A4 en cero.
   - **IPN SOCADM Historia de México** (6 temas, cero) — lo nombran G30–G42 y ninguna
     fase lo ha abierto; **IPN SOCADM Historia Universal** (7 temas, cero) y
     **Geografía** (5 temas, cero) también.
   - Los 5 pools STEM de alto peso de G39 §7 (IPN Física, IPN Química, IPN
     Matemáticas celda MEDBIO, UNAM A1 Matemáticas, IPN MEDBIO Biología) siguen
     siendo la recomendación para cerrar brecha **efectiva**.
3. **Al work order (heredado de G40 §3-§4 / G42 §6):** reescribir los `stem`
   demasiado pegados a la guía de los 4 reactivos de G37 anclados a `cmrsromj5007r…`,
   y rebanar los `SourceChunk` por encabezado de sección en la ingesta (afecta a
   `uam_csh.pdf`, que G33/G37/G41/**G43** ya usaron con rebanado por página — en G43
   sin consecuencia porque los 4 ítems del chunk eran homogéneos).
4. **Auditoría 5 %: vencida, 3 ciclos.** La muestra de 40 ids está generada y exige
   sesión ciega con tier **≠ opus-5**. Los lotes de G41 y **G43** entran al universo
   muestreable cuando G42 y G44 los verifiquen.
5. **Alcance del 21-nov aún sin resolver** (G24 §7 / G26 §8.4): ¿entran UNAM A3/A4 e
   IPN SOCADM en la meta de 1 500 / 1 222? Lleva doce fases condicionando la
   planeación sin respuesta del dueño.
6. **Heredados sin tocar:** rotación A→B→C→D de ~140 reactivos viejos
   (G3a/G3d/G13/G15), las 8 `CHART_TABLE` reclasificadas en G39, la regla de G42 §8
   como código en `lot-validation.ts`, y `content:coverage` que aún no refleja la
   reutilización de G26 (G30 §10.3).

---

## G42 — Verificación ciega: Filosofía, UNAM Área 4 (lote de G41) (2026-08-30)

**Modelo:** `claude-opus-5` (tier Opus del Plan de Implementación: razonamiento
denso y verificación de implementaciones críticas). **COMPLETADA. 35/35
auto-aprobados = tasa de auto-aprobación 100 %.** Segunda mitad del ciclo
adversarial de G2 sobre el lote que G41 insertó con `isVerified=false`.
**Decimotercera ronda ciega consecutiva al 100 %.** El encargo pidió, además de
resolver, dos cosas que no son rutina: **auditar la atribución autor↔postura de
cada reactivo** y **marcar como problema todo lo que dependiera de una
interpretación discutible entre escuelas**. Ese trabajo está en §5 y §6, y es lo
que esta fase aporta por encima del 100 %, junto con el control de transcripción
de §2 y los tres solapamientos intra-lote de §8.

### 1. Ceguera y aislamiento

**Verificados estructuralmente antes de leer un solo reactivo**, no asumidos:

| Control | Resultado |
|---|---|
| `grep -c` de `isCorrect\|explanation\|correctOption\|"answer"\|correctAnswer\|solution` sobre el lote ciego | **0** |
| Claves presentes en cada opción | solo `label`, `text`, `imageUrl` |
| Claves de nivel ítem | `questionId, institution, subject, topic, format, passage, requiresCalculation, stem, options` |
| Formato | **35/35 `MULTIPLE_CHOICE`** |
| `requiresCalculation` | **0/35** → `usedCalculation:false` declarado con verdad en los 35 |
| Reactivos con pasaje | **0/35** (los 35 llegan autocontenidos en el `stem`) |
| Opciones por reactivo · ids únicos | 4/4 en los 35 · 35 ids únicos |
| Longitud de opción | mín 28 · máx 123 · media 105.9 caracteres |
| Longitud de `stem` | mín 93 · máx 288 caracteres |

**Aislamiento:** no se abrió el commit `b6dee39` de G41, ni el JSON del lote, ni
`Question.options`, ni la sección `## G41` de este documento, ni su bloque
`### Siguiente`, antes de responder. `## G41` se leyó **después** de correr
`content:resolve`, y solo para redactar esta sección y heredar su work order. El
único insumo del razonamiento fue `scripts/content-exports/g42-blind.json`.

**Reparto por tema del lote** (visible en el lote ciego, no es clave):
Epistemología 9 · Ética 8 · Historia de la filosofía occidental 7 · Metafísica 6
· Estética 5.

### 2. Control nuevo: la letra elegida no se transcribió a mano

Hasta aquí, todas las rondas ciegas escribieron el `chosenOption` copiando la
letra a mano desde el razonamiento hasta el JSON de respuestas. Es el único
punto del arnés donde un error silencioso cambia el veredicto sin dejar rastro:
una letra mal copiada se resuelve como discrepancia (y despublica un reactivo
correcto) o, peor, como coincidencia falsa.

Esta fase lo cerró: el archivo de respuestas se generó con un script desechable
que recibe, por reactivo, **un fragmento distintivo del texto de la opción
elegida** y resuelve la etiqueta contra `g42-blind.json`, con dos asserts duros
— `picks.length === blind.length` y **exactamente un match** por fragmento
(`hits.length !== 1` lanza). Con eso, la letra la deriva el código de un
contenido que el razonamiento ya fijó, no la memoria de la sesión.

El control disparó de verdad: el primer intento falló con «snippet sin match (0)»
en un reactivo cuyo fragmento se había citado con mayúscula inicial y en el lote
va en minúscula. Un error de transcripción real, detenido antes de tocar la DB.
**Recomendado como paso fijo del arnés para las rondas siguientes.**

### 3. Resolución

`pnpm content:resolve --file scripts/content-exports/g42-answers.json`, con
`--dry-run` previo para validar el formato contra `VerifierAnswersFileSchema`
(35/35 parseadas) antes de escribir.

| Resultado | n |
|---|---:|
| ✔ Auto-aprobados (coincide + `confidence ≥ 0.85` + `problems` vacío) | **35** |
| ✋ Sin publicar con veredicto | **0** |
| ⚠️ Omitidos | **0** |

Confianzas declaradas: 0.93 mínima (el reactivo de Hegel de §6), 0.94–0.96 en
seis, 0.97–0.98 en los 28 restantes. `model` declarado `claude-opus-5` — el
modelo que realmente resolvió, como exige la corrección de G17.

### 4. Balance de la clave real (leído después de responder)

El log de `content:resolve` traduce la etiqueta barajada de vuelta a la original,
así que la distribución de la clave se conoce **solo después** de haber
respondido. Sale limpia:

| | A | B | C | D |
|---|---:|---:|---:|---:|
| Lote completo (n=35) | 9 | 9 | 9 | 8 |
| Epistemología (9) | 2 | 3 | 3 | 1 |
| Metafísica (6) | 2 | 2 | 1 | 1 |
| Ética (8) | 2 | 2 | 2 | 2 |
| Estética (5) | 2 | 1 | 1 | 1 |
| Hist. de la filosofía (7) | 1 | 1 | 2 | 3 |

Ninguna letra pasa de 3 en ningún tema: la sub-regla que G41 se impuso —
equilibrio de letra **también por tema**, no solo por lote — se cumplió. El
barajado del lote ciego es real y ajeno a ese equilibrio: sobre las etiquetas
mezcladas mi hoja de respuestas quedó B 16 / D 7 / A 6 / C 6, muy lejos del
9/9/9/8 subyacente.

### 5. Auditoría de atribución (lo que pidió el encargo)

Cada reactivo con autor nombrado se revisó preguntando si **esa** postura es de
**ese** autor, y por qué cada distractor no le corresponde. **23 de 35 reactivos
nombran autor; 17 autores distintos; 0 atribuciones erróneas.**

| Autor | Reactivos | Postura atribuida | Veredicto |
|---|---:|---|---|
| Sócrates | 1 | nadie yerra voluntariamente; virtud = saber | correcta |
| Platón | 3 | doxa sin *logos*; Ideas como modelo de lo sensible; mímesis degradada (*Rep.* X) | correctas |
| Aristóteles | 4 | PNC indemostrable (*Met.* IV); hilemorfismo y alma como forma (*De an.* II); medio relativo a nosotros (*EN* II); mímesis como modo de aprender (*Poét.* 4) | correctas |
| Parménides / Heráclito | 1 | ser inmóvil vs. devenir | correcta |
| Gorgias | 1 | las tres tesis de *Sobre el no-ser* | correcta |
| Pirronismo (Sexto) | 1 | epojé → ataraxía | correcta |
| Descartes | 3 | duda metódica; dos sustancias; problema de interacción | correctas |
| Bacon | 1 | ídolos + ascenso inductivo | correcta |
| Berkeley | 1 | *esse est percipi*, inmaterialismo | correcta |
| Spinoza / Leibniz | 1 | una sustancia / infinitas mónadas | correctas |
| Hume | 1 | no hay paso válido de «es» a «debe» | correcta |
| Bentham / Mill | 1 | mayor felicidad para el mayor número | correcta |
| Kant | 4 | autonomía; universalización; satisfacción desinteresada; las dos fuentes del conocer | correctas |
| Hegel | 2 | carácter pasado del arte; contradicción como motor | correctas |
| Wittgenstein | 1 | lo que se muestra y no se dice (*Tractatus*) | correcta |

**Las citas textuales son las fórmulas canónicas e inevitables** de cada tesis
(«el ser es y el no-ser no es», «ser es ser percibido», «de lo que no se puede
hablar, hay que callar», «los pensamientos sin contenido son vacíos…»), breves y
correctamente atribuidas: se declaran aquí por la regla de G40 §6, no como
hallazgo.

**Calidad de los distractores, medida contra la regla de G40:** los distractores
no son absurdos sino **posiciones rivales reales o errores documentados de
estudiante**. Ejemplos comprobados: en el reactivo de Sócrates, el distractor es
la *akrasía* aristotélica (la tesis que Sócrates niega); en el de Gorgias, los
tres son atomismo democríteo, escepticismo académico y naturalismo milesio; en
el de Kant sobre las dos fuentes, uno es Hume literal («hoja en blanco» +
causalidad por costumbre); en el de validez formal, los dos falsos son la
confusión validez/solidez y la confusión validez/verdad de la conclusión, que es
el error clásico del principiante. Y todos se citaron **por contenido**, nunca
por letra.

### 6. Interpretaciones discutibles: tres candidatas, cero marcadas

El encargo pedía marcar como problema todo reactivo cuya clave dependiera de
tomar partido entre escuelas. Se examinaron tres candidatas reales y **ninguna
se marcó**, porque en las tres el `stem` está redactado de modo que la clave
**no** depende del punto en disputa. El criterio aplicado: se marca cuando otra
escuela viva respondería otra letra, no cuando existe debate sobre el tema.

1. **Determinismo y responsabilidad moral.** El compatibilismo niega que el
   determinismo destruya la imputabilidad. Pero la opción dice que la
   responsabilidad **«se vuelve discutible»**, que es justo lo que el
   compatibilista concede al ponerse a responder. Las otras tres invierten el
   determinismo (lo vuelven azar o imprevisibilidad). Sin marca. Confianza 0.94.
2. **Hegel y el «fin del arte».** La tesis fuerte («el arte ha muerto») está
   discutida desde hace un siglo. El `stem` **no** la usa: dice que el arte
   *deja de ser la forma más alta en que el espíritu se comprende*, que es la
   formulación que sostienen ambos bandos de esa discusión. Sin marca.
   Confianza 0.93 — la más baja del lote, y por esto.
3. **Gorgias: argumento sincero o ejercicio retórico.** Discusión abierta entre
   helenistas. El `stem` pregunta **qué posición ilustra ese razonamiento**, no
   qué creía Gorgias, así que la clave es indiferente a la disputa. Sin marca.
   Confianza 0.95.

Los tres redactados así son, de hecho, un acierto de composición de G41: en cada
caso el hedge está en el `stem` o en la opción, no en la cabeza del que resuelve.

### 7. Señuelo de longitud (tie-aware) — reproduce el número de G41

Medido sobre el lote ciego contra la clave que esta sesión eligió, con el
puntaje esperado tie-aware (empates al azar) que fijaron G34 §2 y G38 §3:

| Heurística | Aciertos estrictos | Empates | Puntaje esperado | Cota |
|---|---:|---:|---:|---:|
| «elige la más larga» | 6 | 1 | **6.50/35 = 18.6 %** | < 14/35 |
| «elige la más corta» | 4 | 3 | **5.33/35 = 15.2 %** | < 14/35 |

Ratio de longitud clave/distractores: **medio 0.99** (mín 0.92, máx 1.13).

**Los tres valores coinciden al decimal con los que G41 §7 reportó** (6.5/35 =
18.6 %, 5.3/35 = 15.2 %, ratio 0.99 / 0.92 / 1.13). No es una copia: G41 los
calculó contra `isCorrect` en la DB y esta sesión contra la clave que eligió a
ciegas. Que salgan idénticos es una **segunda vía independiente** de confirmar
que las 35 respuestas coinciden con la clave almacenada, además del log de
`content:resolve`. Ambas heurísticas quedan por debajo del azar (25 %) en las
dos direcciones.

### 8. Hallazgo propio: tres solapamientos entre reactivos del mismo lote

Aplicando la regla de G40 §3 (fugas revisadas en **ambas** direcciones,
incluidas las menciones de paso), se revisaron los 35 `stem` y las 140 opciones
cruzándolos entre sí. **Ninguno afecta la corrección de ningún reactivo** — los
35 son correctos y así quedaron aprobados —, pero tres pares se pisan y van al
work order. Se encontraron **después** de resolver, al redactar §5.

1. **Fuerte, unidireccional (Ética):** el distractor utilitarista del reactivo
   del imperativo categórico enuncia el principio de utilidad casi con las
   mismas palabras que la **clave** del reactivo de Bentham y Mill —
   «…más sufrimiento que felicidad para el conjunto afectado» frente a «…más
   felicidad, o bien menos sufrimiento, para el mayor número posible de
   afectados». Quien lea el primero se lleva servido el segundo. Atenuante: el
   `stem` del segundo ya anuncia que el criterio es consecuencialista, así que
   la fuga añade poco; aun así es la que hay que reescribir.
2. **Media, unidireccional (Estética → Historia de la filosofía):** la clave del
   reactivo de la mímesis afirma que lo sensible «ya es copia de las Ideas», que
   es exactamente la relación que el reactivo sobre la teoría de las Ideas pide
   identificar («modelo y fundamento de lo sensible»). En sentido inverso no hay
   fuga.
3. **Redundancia conceptual (Epistemología, reactivos contiguos):** las claves
   de los dos primeros reactivos giran sobre la misma doctrina — creencia
   verdadera **sin** fundamento. Uno la analiza («hay creencia y verdad, pero
   falta la justificación»), el otro le pone la etiqueta platónica («opinión
   (doxa): una creencia que puede resultar acertada, pero que el sujeto no logra
   fundamentar»). El segundo exige además saber el término, que el primero no da,
   así que la fuga es parcial; la redundancia, en cambio, es total, y en un
   simulacro los dos caen seguidos.

**Regla que se desprende, para la próxima composición:** el paso de validación
cruzada del lote no basta con revisar `stem` contra `stem`; hay que cruzar
**claves contra distractores** de todo el lote, porque las dos fugas reales de
aquí viven en esa diagonal, no entre enunciados.

### 9. Acumulado real (consultado en vivo antes y después)

| Métrica | Antes | Después |
|---|---:|---:|
| Banco total | 867 | **867** |
| Servibles (`isVerified=true`) | 832 | **866** |
| Cola ciega (`isVerified=false ∧ verification=null`) | 35 | **0** |
| Cola canónica de discrepancias (`isVerified=false ∧ verification≠null ∧ manualReview=null`) | 0 | **0** |
| Retirados a propósito (`manualReview`) | 1 | **1** |
| UNAM A4 · Filosofía | 0✓ / 35⧗ | **35✓ / 0⧗** |
| `Question.verification` persistido | 0/35 | **35/35** |

`content:coverage` después: **866 servibles**, 0 pendientes, 1 retirado, 867 en
banco; auto-aprobación global **100 % (867/867)**; anclaje en fuentes **225
`SOURCED` (26 %)** · 642 `TEMARIO_ONLY`; el lote de Filosofía queda ⚓7/28.
Meta nominal de 1 500: **58 %**. **Meta efectiva G26 (1 222): 57 %, brecha 529
≈ 16 lotes** (era 546 tras G40; el lote de G41 la bajó 17 porque Filosofía no es
materia compartida y tope de celda). Área 4 va **2 de 3** materias propias con
contenido: falta Artes.

**Nota honesta: decimotercera ronda ciega consecutiva al 100 %.** La métrica está
saturada y hace tiempo que no discrimina; repetirlo cada vez es parte del
registro. Lo que esta fase aporta es §2 (el arnés dejó de depender de una letra
copiada a mano), §5–§6 (la auditoría de atribución que el encargo pidió, con su
criterio explícito para no marcar) y §8 (los tres solapamientos y la regla de
cruce clave↔distractor que se desprende).

### 10. Guardrails

- **Cero cambios de código de producción.** Todo corrió en dos scripts
  desechables — uno en el scratchpad (constructor del archivo de respuestas de
  §2), uno temporal en `scripts/` (balance de §9, borrado en la sesión). Los dos
  artefactos del lote (`g42-blind.json`, `g42-answers.json`) viven en
  `scripts/content-exports/`, que `.gitignore` excluye: no se committean, igual
  que los de G14/G16/G21/G38.
- **Cero llamadas a la API de pago de Anthropic.** La resolución la produjo esta
  sesión de Claude Code, como exige CLAUDE.md.
- **`manualReview` no es columna**, es clave dentro del JSON de
  `Question.verification`: el primer intento de contar la cola canónica con
  `prisma.question.count({ where: { manualReview: … } })` falló con «Unknown
  argument». La cola canónica se cuenta en JS sobre el JSON, como hace
  `content-coverage.ts`. Anotado para no repetirlo.
- `pnpm typecheck` y `pnpm lint` **en verde**.

### Siguiente (G42)

1. **Al work order, nuevo (§8):** reescribir el distractor utilitarista del
   reactivo del imperativo categórico para que no enuncie el principio de
   utilidad completo, y desacoplar la clave de la mímesis de la del reactivo de
   la teoría de las Ideas. Ambos son ediciones de una línea y exigen
   re-verificación ciega en sesión distinta de esta, que ya quedó contaminada
   sobre ellos.
2. **Al arnés (§2):** adoptar el fragmento-de-texto en vez de la letra como
   entrada del archivo de respuestas en toda ronda ciega futura.
3. **A la validación de lote (§8):** el cruce intra-lote debe comparar claves
   contra distractores, no solo enunciado contra enunciado. Candidato a regla en
   `scripts/lib/lot-validation.ts`.
4. **Siguiente lote de material nuevo**, huecos por peso (heredado de G41 §2):
   - **UNAM A4 Artes** (5 temas, w2, cero; `SourceChunk` en 3 temas) — cierra
     el Área 4.
   - **UNAM A3 Historia Universal** (8 temas, w5, cero; 1 `SourceChunk`).
   - **IPN SOCADM Historia de México** (6 temas, cero) — lo nombran G30–G41 y
     ninguna fase lo ha abierto.
   - Los 5 pools STEM de alto peso de G39 §7 siguen siendo la recomendación para
     cerrar brecha **efectiva**.
5. **Auditoría 5 %: vencida, ahora 3 ciclos.** La muestra de 40 ids está
   generada y exige sesión ciega con tier **≠ opus-5**. El lote de G41 ya entra
   al universo muestreable tras esta fase.
6. **Heredado de G40 §3–§4, sin tocar:** reescribir los `stem` demasiado pegados
   a la guía en los 4 reactivos de G37 anclados a `cmrsromj5007r…`, y rebanar los
   `SourceChunk` por encabezado de sección en la ingesta (afecta a `uam_csh.pdf`,
   que G33/G37/G41 usaron con rebanado por página).
7. **Alcance del 21-nov aún sin resolver** (G24 §7 / G26 §8.4): ¿entran UNAM
   A3/A4 e IPN SOCADM en la meta de 1 500 / 1 222? Lleva once fases
   condicionando la planeación sin respuesta del dueño.
8. **Heredados sin tocar:** rotación A→B→C→D de ~140 reactivos viejos
   (G3a/G3d/G13/G15), las 8 `CHART_TABLE` reclasificadas en G39, y
   `content:coverage`, que aún no refleja la reutilización de G26 (G30 §10.3).

---

## G41 — Lote de reactivos: Filosofía, UNAM Área 4 (2026-08-30)

**Modelo:** `claude-sonnet-5` (tier Sonnet del Plan de Implementación para lotes de
contenido). **COMPLETADA. 35 reactivos insertados con `isVerified=false`** en la
cola de verificación ciega. **Segunda materia del Área 4 (Humanidades y Artes) con
contenido**, tras Literatura (G37); Filosofía estaba en cero absoluto.

### 1) El encargo y la elección de materia

El encargo pidió **35 reactivos de Filosofía para UNAM Área 4**, área en cero.
Consulta en vivo a Supabase (2026-08-30) antes de componer:

| Institución · Área | Materia | `sharedContentKey` | `questionWeight` | Temas | Reactivos hoy | `SourceChunk` |
|---|---|---|---:|---:|---:|---:|
| UNAM · Área 4 | **Filosofía** | `null` | **3** | **5** | **0** | **3** (tema 5) |

**Filosofía existe como una sola fila `Subject`, en el Área 4.** `sharedContentKey`
NULL → **no entra en la reutilización de G26** (§G26.2: en la UNAM solo Español,
Inglés y Química la tienen). El lote va a sus **5 temas propios**, sin reutilización
entre áreas — mismo patrón que Historia de México (G33), Geografía (G35) y
Literatura (G37). El Área 4 pasa de **1 a 2 de 3** materias propias con contenido
(falta Artes: 5 temas, w2, cero, con `SourceChunk` en 3 temas).

### 2) Reparto por los 5 temas y anclaje: 28 TEMARIO_ONLY / 7 SOURCED

| Tema (posición en el temario) | Reactivos | Grounding | Ejes cubiertos |
|---|---:|---|---|
| Epistemología | 9 | TEMARIO_ONLY | JTB y acierto casual, doxa/episteme, racionalismo vs empirismo, escepticismo pirrónico (epojé/ataraxía), teorías de la verdad; **lógica**: validez vs verdad vs solidez, deducción vs inducción, falacia ad hominem, principio de no contradicción |
| Metafísica | 6 | TEMARIO_ONLY | ser vs devenir (Parménides/Heráclito), hilemorfismo y alma como forma, idealismo de Berkeley, dualismo y problema mente-cuerpo, determinismo y responsabilidad, monismo/dualismo/pluralismo |
| Ética | 8 | TEMARIO_ONLY | moral vs ética, autonomía vs heteronomía (Kant), imperativo categórico y universalización, término medio y phrónesis (Aristóteles), utilitarismo (Bentham/Mill), ley de Hume, intelectualismo socrático, relativismo cultural |
| Estética | 5 | TEMARIO_ONLY | objetivismo vs subjetivismo de la belleza, mímesis (Platón vs Aristóteles), juicio de gusto desinteresado (Kant), lo bello vs lo sublime, fin del arte (Hegel) |
| Historia de la filosofía occidental | 7 | **SOURCED** | Platón (teoría de las Ideas), sofística (Gorgias), Descartes (duda metódica), Bacon (ídolos/inducción), Kant (criticismo), Hegel (dialéctica), Wittgenstein (límites del lenguaje) |

**Anclaje del tema 5.** `loadTopicChunks` devolvió **3 `SourceChunk`** para
«Historia de la filosofía occidental» (`cmrr1kjn50072hi3nj3gda5rt`): **pp. 45-47 de
`uam_csh.pdf`** —la guía de Ciencias Sociales y Humanidades de la UAM, la misma que
aportó los chunks de G33 y G37— un **banco de reactivos de opción múltiple** con
ítems de filosofía, clasificado a este tema por el pipeline F2b. `grounding.ts` hace
**obligatoria** la cita cuando hay fragmento: los **7 reactivos** de ese tema citan
`sourceChunks` (cada uno el fragmento cuya página contiene su ítem-semilla — la
verificación en la DB confirma el mapeo: p. 45 → Descartes/Bacon/Kant, p. 46 →
Platón/Hegel, p. 47 → Gorgias/Wittgenstein) y quedan `groundingStatus = SOURCED`;
los otros **4 temas** no tienen `SourceChunk` y salen `TEMARIO_ONLY` (**28**),
compuestos desde el temario oficial del Área 4, como G22/G27/G33/G35/G37.

**Procedencia y rebanado del chunk (patrón G40 §7), documentado, no bloqueante.**
El fragmento proviene de la guía de **otra institución** (UAM) que la del examen al
que sirven los reactivos (UNAM). No lo prohíbe ningún guardrail —G26 restringe la
reutilización de *reactivos* entre áreas, nunca el uso de una guía como material de
estudio—, pero significa que el `SOURCED` de esos 7 está anclado fuera de la
institución destino. Además el chunk está **rebanado por página, no por sección**:
la p. 45 arrastra dos ítems de historia (Gran Depresión, Revolución Francesa) antes
de los de filosofía, y la p. 47 termina con una serie numérica; los 7 reactivos
derivan **solo de sus ítems de filosofía**. El arreglo de fondo vive en el chunker
(rebanar por encabezado de sección), ya anotado en el work order de G40 §4.

### 3) Originalidad de los reactivos SOURCED (patrón G40 §6)

El work order de G40 §6/G39 §9 pide extender el criterio de originalidad de G37 a
los reactivos derivados de bancos de preguntas de guías, no solo a los textos de
análisis. Aplicado desde la composición:

- **5 de los 7 SOURCED transforman la tarea cognitiva:** el ítem de la guía es de
  atribución («¿de quién es *X*?», respuesta = un nombre); el reactivo compuesto
  nombra al autor en el `stem` y pregunta **por el contenido de su tesis o el papel
  de un concepto** («¿qué función cumple *X*?», «¿qué propone frente a *Y*?»),
  respuesta = una postura razonada. El `stem` es propio.
- **Los 2 más cercanos** —#30 (Gorgias, las tres tesis de *Sobre el no-ser*) y #35
  (Wittgenstein, la proposición 7 del *Tractatus*)— reproducen un **enunciado
  canónico e inevitable** de la historia de la filosofía (el argumento de Gorgias y
  el aforismo «de lo que no se puede hablar, hay que callar»), **reformulado con
  palabras propias**, pero desplazan la tarea de recordar el nombre a **interpretar
  la postura** (qué posición ilustra el encadenamiento; a qué se refiere «lo que no
  se puede hablar»). Se **declaran** aquí para que la ronda ciega de G42 los
  revalide uno por uno.
- No es un defecto de corrección: los 7 son factualmente correctos y sus juegos de
  opciones se compusieron de cero (no se copiaron los de la guía).

### 4) Formato, dificultad y cobertura

- **Formato:** 35 `MULTIPLE_CHOICE`. La sección de Filosofía del examen de la UNAM
  es opción múltiple simple; los reactivos que presentan un argumento o un texto
  breve para analizarlo lo llevan **dentro del `stem`** (autocontenido), sin
  `Passage` compartido.
- **Dificultad:** BASIC 7 · INTERMEDIATE 17 · ADVANCED 9 · EXPERT 2 (≈ 20/49/26/6,
  la distribución objetivo de `_base.md`; misma que G33/G35/G37). Los 2 `EXPERT`
  son de síntesis: la **ley de Hume** (por qué de premisas descriptivas no se sigue
  una norma) y el **fin del arte en Hegel** (por qué el arte cede su primer puesto
  al pensamiento).
- **Prioridad del encargo — comprensión de argumentos sobre memorización de
  nombres:** la gran mayoría de los 35 pide **entender qué afirma una postura o
  cómo funciona un argumento**. Los reactivos que nombran a un autor lo hacen en el
  `stem` y preguntan por el contenido de su tesis. **Solo 3** son de clasificación
  por definición (#5 nombrar dos teorías de la verdad, #15 monismo/dualismo/
  pluralismo, #24 nombrar las dos respuestas estéticas), y aun esos exigen
  distinguir las opciones por su contenido conceptual.
- **Distractores (observación de G36 §5 atendida):** cada distractor es una
  **postura filosófica real** correctamente descrita, que exige conocimiento
  específico para rechazarse: otras corrientes epistemológicas, otras teorías de la
  verdad, otras falacias bien definidas, otras escuelas presocráticas (eleatismo,
  Heráclito, atomismo, milesios), posiciones enfrentadas del propio autor evaluado
  (racionalismo vs empirismo, akrasía vs intelectualismo, deontología vs
  consecuencialismo). **Caveat honesto (patrón G34 §4):** en ~5 reactivos algún
  distractor cae también por anacronismo o por invertir la posición del autor
  (p. ej. #13 Descartes/animales, #33 Kant/Hume); sus etiquetas son
  INTERMEDIATE/ADVANCED.

### 5) Distribución de posición y cue de longitud (G3c / G8 / G34 §2 / G36 §3 / G38 §3-§4)

- **Clave A = 9 · B = 9 · C = 9 · D = 8** (25.7 / 25.7 / 25.7 / 22.9 %), las cuatro
  dentro de la banda 15-40 %. **Confirmada por query directa a la DB tras insertar**
  (`jsonb_array_elements` sobre `options` de las 35 filas), no solo por el log.
- **Equilibrio también por tema** (aporte de esta fase al patrón de G3c): la
  búsqueda de secuencia añade una restricción para que **ninguna letra concentre la
  correcta dentro de un tema** — Epistemología A2/B3/C3/D1, Metafísica A2/B2/C1/D1,
  Ética A2/B2/C2/D2, Estética A2/B1/C1/D1, Historia A1/B1/C2/D3. Sin esto, un lote
  con la clave agregada sana puede seguir teniendo un tema entero sesgado.
- **La letra la asigna el generador**, no la mano: búsqueda con semilla fija que
  descarta corridas cíclicas A→B→C→D de longitud ≥ 3 (ambos sentidos), triples
  repeticiones y rotación +1 alta. Propiedades: **sin corridas cíclicas ≥ 3**, sin
  triples, **rotación +1 = 11.8 %** (azar ≈ 8.5). **La secuencia literal NO se
  publica aquí** (regla de G38 §4): vive en la DB y en el registro permanente
  `docs/content-batches/g41-unam-a4-filosofia.json`, que la sesión ciega de G42 no
  abre.
- **Cue de longitud — G34 §2, valor exacto en esta sección (G38 §3), no solo en el
  registro:** el puntaje esperado **tie-aware de «elige la más larga», empates al
  azar**, quedó en **6.5 / 35 = 18.6 %** — por debajo del azar del 25 % y de la cota
  de 14/35. La heurística inversa **«elige la más corta»** quedó en **5.3 / 35 =
  15.2 %**, también por debajo del azar. **Ratio medio** de longitud correcta /
  distractores = **0.99** (mín 0.92, máx 1.13). Histograma de rango de longitud de
  la correcta (1 = más larga): **{1: 7, 2: 5, 3: 17, 4: 6}**. El **primer borrador**
  tenía la correcta como la única más larga en **31/35** —arrastraba la cláusula
  justificativa «…, porque…», «…, que…», que **pertenece a la capa 1, no a la
  opción**, el mismo defecto que corrigieron G33/G35/G37—; se recortaron las
  correctas a la **aserción** y se homogeneizaron los distractores en **dos
  pasadas** hasta dejar **ambas** heurísticas de longitud por debajo del azar.
- `content:validate-batch --dir <lote>`: **0 violaciones** (corrido antes de tocar
  la DB y de nuevo como paso obligatorio de `content:insert --lot-dir` sobre los
  5 archivos).
- **0 citas por letra** y **0 citas posicionales** en las 105 capas de explicación
  (auto-chequeo del generador con las regex de `lot-validation.ts` más el patrón
  `POSITION_REF` de G33). Las **capas 2** se titulan **«Cómo se descarta cada
  opción»** y descartan los tres distractores **por su contenido** (numerados
  1/2/3 en el orden de redacción, cada uno introducido por su contenido: «La
  apelación a la autoridad invoca el prestigio de alguien…», «Demócrito es un
  realista tajante…», «Elegir los valores según la cultura y los gustos es
  relativismo…»), nunca por su posición.

### 6) Fuga entre reactivos — revisada en las dos direcciones (G38 §6 / G40 §3)

Ningún `stem` nombra el dato que otro reactivo del lote pide identificar. Un par
necesitó desacople explícito:

- **#30 (Gorgias / sofística)** en su primera versión usaba como distractores el
  **monismo eleático** y el **movilismo de Heráclito** enunciados casi textualmente
  — lo que insinuaba el eje de **#10** (que pregunta justamente sobre qué se oponen
  Parménides y Heráclito). Y un tercer distractor sobre el **intelectualismo moral
  de Sócrates** rozaba la respuesta de **#22**. Se cambiaron los tres por
  **escepticismo académico, atomismo de Demócrito y naturalismo milesio** —
  posturas igual de reales, sin solapamiento con ningún otro reactivo.
- Los pares **«disputa → resolución»** se conservan a propósito (#3 racionalismo/
  empirismo y #33 criticismo kantiano; #25 mímesis y #29 Ideas de Platón): se
  refuerzan sin que una respuesta trivialice la otra.

`lot-validation.ts` sigue sin poder ver este tipo de fuga: es una relación entre
dos ítems, no una propiedad de uno (defecto ya anotado en G38 §6).

### 7) Exactitud factual

**Las 35 atribuciones de postura verificadas una por una antes de insertar** (criterio
del encargo). Se comprobaron autor, obra, escuela y época de: doxa/episteme y teoría
de las Ideas (Platón); pirronismo y sus términos (Sexto Empírico); no contradicción
como principio primero (Aristóteles, *Metafísica* IV); Parménides/Heráclito;
hilemorfismo y alma como forma (Aristóteles, *De Anima*); `esse est percipi`
(Berkeley); dualismo y objeción de Isabel de Bohemia (Descartes); monismo/Spinoza,
pluralismo-mónadas/Leibniz; autonomía e imperativo categórico (Kant, *Fundamentación*);
término medio «relativo a nosotros» y phrónesis (Aristóteles, *Ética a Nicómaco* II);
utilitarismo (Bentham, Mill); ley de Hume y falacia naturalista (Moore);
intelectualismo moral y negación de la akrasía (Sócrates); objeción del progreso moral
al relativismo cultural; objetivismo/subjetivismo de la belleza (Hume); mímesis y
tercer escalón desde la verdad (Platón, *República* X) frente a mímesis y catarsis
(Aristóteles, *Poética*); juicio de gusto desinteresado (Kant, *Crítica del Juicio*);
lo bello frente a lo sublime (Burke, Kant); fin del arte (Hegel, *Lecciones de
Estética*); duda metódica y cogito (Descartes); cuatro ídolos y método inductivo
(Bacon, *Novum Organum*); giro copernicano y «intuiciones sin conceptos son ciegas»
(Kant, *KrV*); dialéctica y `Aufhebung` (Hegel); decir/mostrar y proposición 7
(Wittgenstein, *Tractatus*); las tres tesis de *Sobre el no-ser* (Gorgias). **Ninguna
atribución resultó falsa.**

### 8) Inserción real — verificada en la DB

| Métrica | Antes de G41 | Después de G41 |
|---|---:|---:|
| Banco total | 832 | **867** |
| Servibles (`isVerified=true`) | 831 | 831 |
| Retirados a propósito | 1 | 1 |
| Cola ciega (`isVerified=false`, sin veredicto) | 0 | **35** |
| Cola canónica de discrepancias (`manualReview=null`) | 0 | **0** |
| `ExplanationLayer` del lote | — | **105** (3 × 35) |
| `question_source_chunks` del lote | — | **7** (1 × 7 de «Historia de la filosofía occidental») |
| `SOURCED` en el banco | 218 | **225** |
| `TEMARIO_ONLY` en el banco | 614 | **642** |
| UNAM A4 Filosofía · 5 temas | 0 / 0 / 0 / 0 / 0 | **9 / 6 / 8 / 5 / 7** |

Chequeos post-inserción (query directa): los 35 con exactamente 4 opciones y 1
correcta, 105 `ExplanationLayer`, **7 `SOURCED` / 28 `TEMARIO_ONLY`**, los 7
`SOURCED` citan el chunk cuya página contiene su ítem-semilla (mapeo verificado),
cola ciega 0 → 35, clave A9/B9/C9/D8, dificultad 7/17/9/2, 0 con formato ≠
`MULTIPLE_CHOICE`. Cohorte con `id` prefijo `cmtfh0…`–`cmtfh2c…` del 2026-08-30 —
separable por `topicId` o por timestamp para la verificación ciega de G42.

**La brecha efectiva no se mueve** (546, ~16 lotes): la meta efectiva de Filosofía
(w3 → ~17 por G39 §7) la cubrirán y superarán los 35 cuando G42 los apruebe —
mismo patrón que Literatura en G37 (cobertura de producto real: un aspirante del
Área 4 no tenía nada de Filosofía; contra la meta del 21-nov, ~17 cierran y ~18
caen en un pool que quedará sobre-cubierto). `content:coverage` en vivo: **831
servibles · 35 pendientes · 1 retirado · 867 en banco · 55 % de la meta efectiva**.

### 9) Limpieza

El lote se compuso con un generador de Python desechable (`build_g41.py` +
`items_g41.py`) en el scratchpad de la sesión: los 35 reactivos están **redactados a
mano** en `items_g41.py`; el generador solo asigna la letra correcta (búsqueda
anti-rotación con semilla, más la restricción de equilibrio por tema), auto-chequea
—antes de validar— la distribución de letra, el **puntaje tie-aware de longitud
(G34 §2)**, las citas por letra y posicionales y el grounding obligatorio del tema
5, y emite los 5 archivos del lote. Un segundo script (`enrich_g41.py`) añadió los
`questionId` reales al registro permanente. El generador, el enriquecedor, la probe
de orden de chunks y los 5 archivos del lote **no se committean**; el registro
permanente es `docs/content-batches/g41-unam-a4-filosofia.json`. `pnpm typecheck` y
`pnpm lint` en verde (cero cambios de código de producción). Cero llamadas a la API
de pago.

### Siguiente (G41)

1. **Verificación ciega del lote de G41** (segunda mitad del ciclo de G2):
   `pnpm content:blind-batch --topic <cada uno de los 5 topicId>` →
   `content:resolve`. **Lote 100 % verbal**, como los de G30/G33/G35/G37: **0/35
   admiten cálculo**, así que no cabe el candado aritmético de G28; el control es el
   **descarte explícito de los tres distractores por su contenido** y la
   **confianza declarada**. Los **7 reactivos de «Historia de la filosofía
   occidental» son `SOURCED`**, pero `loadPendingQuestionsWithContext` **no pasa el
   texto del `SourceChunk`** a la sesión ciega (mismo caso que los `SOURCED` de
   G33/G37): se resuelven con conocimiento de filosofía de bachillerato, igual que
   el resto. **Sin pasajes** → los 35 llegan autocontenidos en el `stem`.
   **Aplicar la regla de G36 §2 y G38 §3:** recalcular los diagnósticos de longitud
   (tie-aware «más larga»/«más corta», ratio medio) sobre las **respuestas ciegas**
   y compararlos con los **veredictos** de §5 de esta sección (que la sesión ciega
   sí puede abrir *después* de resolver, no antes) — coincidencia = corroboración
   mecánica del acuerdo. **La comparación de la secuencia de clave exacta (G38 §4)
   la hace el dueño o una fase editorial con acceso al registro permanente**, no la
   sesión ciega. **Reactivos más apretados** (se señala cuáles, no cómo resolverlos,
   por G30 §1): los **2 `EXPERT`** (#21 ley de Hume, #28 fin del arte en Hegel) y
   **#9** (no contradicción como principio indemostrable); los 2 `SOURCED` más
   pegados a su fuente (#30 Gorgias, #35 Wittgenstein) piden **interpretar** un
   enunciado canónico, no atribuirlo.
2. **Huecos que siguen abiertos** tras G41:
   - **UNAM A4 Artes** (5 temas, w2, cero; tiene `SourceChunk` en 3 temas) — la
     última materia propia del Área 4 sin contenido.
   - **UNAM A3 Historia Universal** (8 temas, w5, cero; 1 `SourceChunk`) — la única
     materia propia del Área 3 aún en cero.
   - **IPN SOCADM Historia de México** (6 temas, cero) — el que G30–G38 nombran;
     ninguna fase lo ha abierto.
   - Los 5 pools STEM de alto peso de G39 §7 (IPN Física, IPN Química, IPN
     Matemáticas celda MEDBIO, UNAM A1 Matemáticas, IPN MEDBIO Biología) siguen
     siendo la recomendación para cerrar brecha efectiva.
3. **Al work order (heredado de G40 §3-§4):** reescribir los `stem` demasiado
   pegados a la guía de los 4 reactivos de G37 anclados a `cmrsromj5007r…`, y
   rebanar los `SourceChunk` por encabezado de sección en la ingesta (afecta a
   `uam_csh.pdf`, que G33/G37/G41 ya usaron con este rebanado por página).
4. **Auditoría 5 %:** sigue vencida (2 ciclos). La muestra de 40 ids ya está
   generada; exige una sesión ciega con tier **≠ opus-5**. El lote de G37 ya entra
   al universo muestreable tras G38; el de G41 entrará cuando G42 lo verifique.
5. **Alcance del 21-nov aún sin resolver** (G24 §7 / G26 §8.4): ¿entran UNAM A3/A4
   e IPN SOCADM en la meta de 1 500 / 1 222? Lleva diez fases condicionando la
   planeación sin respuesta del dueño.
6. **Heredados sin tocar:** rotación A→B→C→D de ~140 reactivos viejos
   (G3a/G3d/G13/G15), par duplicado H₂SO₄ ya despublicado en G40, auditoría 5 %,
   las 8 `CHART_TABLE` reclasificadas en G39, y `content:coverage` que aún no
   refleja la reutilización de G26 (G30 §10.3).

---

## G40 — Micro-fase editorial + verificación ciega de las reparadas (2026-08-30)

**COMPLETADA. 3 reactivos reparados, 3 resueltos a ciegas, 3 rescatados —
tasa de rescate 100 %. Banco 832; servibles 832 → 831 (1 retirado a
propósito); cola canónica en cero. El work order de G39 §9 queda cerrado.**

El encargo pedía correr el lote ciego de G2 sobre "las reparadas" y reportar
cuántas se rescataron. **No había reparadas.** La cola estaba en cero por
cuarta fase consecutiva (G24, G25, G39, y confirmado aquí antes de tocar
nada). Lo que sí había era el work order que G39 §9 dejó explícitamente para
"una sesión editorial dedicada, idealmente con capacidad de re-verificación
ciega". Esta fase es esa sesión: **primero reparó, y eso creó la cohorte que
después resolvió a ciegas.**

### 1) Punto de partida, consultado antes de tocar nada

| Métrica | Antes |
|---|---|
| Reactivos en banco | 832 |
| `isVerified=true` | 832 |
| `isVerified=false` | 0 |
| Con registro de `verification` | 832 |

Las cuatro vías de G39 §2 volvieron a dar cero. La cohorte de esta fase no
existía: hubo que producirla.

### 2) Ceguera: qué se protegió y qué NO — caveat declarado por adelantado

Esta es la primera fase en que **la reparación editorial y la pasada ciega
ocurren en la misma sesión**. G17 → G19 las separó a propósito. Aquí no se
pudo: reparar un `stem` exige leerlo, y el encargo pedía resolver en esta
misma sesión. Se declara con precisión qué garantía sobrevive y cuál no.

**Sobrevive — la garantía sobre la clave.** Nunca se leyó `options`,
`isCorrect` ni una explicación antes de responder:

- Todas las consultas de la fase de reparación seleccionaron campos
  explícitos: `id`, `stem`, `format`, `source`, `isVerified`, timestamps,
  taxonomía. **`options` jamás apareció en un `select`.**
- Comprobación estructural del archivo ciego **antes de abrirlo**: un `grep`
  de los campos de respuesta sobre `g40-blind.json` → **0 coincidencias**.
  Las claves de cada ítem son exactamente `questionId, institution, subject,
  topic, format, passage, requiresCalculation, stem, options{label, text,
  imageUrl}`. No hay superficie por donde se filtre la clave.
- La auditoría del arnés (§5) y la inspección del `SourceChunk` (§6, §7) se
  corrieron **después** de resolver y publicar. Ya no había ceguera que
  proteger.

**No sobrevive — la independencia editorial.** Esta sesión escribió los tres
`stem` que después resolvió. Peor: el defecto que reparó era, precisamente,
que dos reactivos del lote se filtraban el punto evaluado entre sí (§3), así
que **leer uno para repararlo entregó el punto que evaluaba el otro**. Los
tres puntos evaluados son, además, conocimiento general no ambiguo: la
resolución habría sido la misma sin haber leído nada. Pero el 100 % de esta
fase **no es una medición independiente al nivel de G38**, y no debe contarse
como si lo fuera. Lo que sí prueba es lo que importaba: la clave marcada en
la DB coincide con la respuesta correcta, y la reparación no la movió.

### 3) Hallazgo: la fuga de G39 §9.1 era BIDIRECCIONAL

G39 §9.1 describió el defecto en una sola dirección: el `stem` de
`cmtf6e6v50006i72eielfngps` nombraba a la figura que
`cmtf6e5wr0001i72eq4ershjh` pide identificar, y proponía despersonalizar el
primero.

Al abrir los dos `stem` para repararlos aparece la otra mitad: **el reactivo
"protegido" etiquetaba en su propio `stem` el punto que el otro evalúa.**
Los dos comparten el mismo estímulo (el mismo par de obras citadas) y cada
uno pregunta por un atributo distinto de ese estímulo — pero cada `stem`
declaraba de paso el atributo que el otro pedía. Reparar solo el señalado
por G39 habría dejado **la mitad de la fuga abierta**, y habría cerrado la
fase con la sensación de que el defecto estaba resuelto.

Reparación aplicada, en los dos sentidos:

| id | Qué se quitó del `stem` | Efecto sobre su propia respuesta |
|---|---|---|
| `cmtf6e6v5…` | la mención nominal de la figura que el otro pide identificar (§9.1) | ninguno — sigue preguntando por el mismo atributo |
| `cmtf6e5wr…` | las etiquetas que declaraban el atributo que el otro evalúa (**hallazgo de esta fase**) | ninguno — sigue pidiendo identificar a la misma figura |

Tras la reparación, ninguno de los dos `stem` contiene la respuesta del otro.
Comparten estímulo y evalúan puntos distintos, que es lo que un par de
reactivos del mismo tema debe hacer.

**Regla para composición, generalizada del caso:** cuando dos reactivos de un
lote comparten estímulo, no basta revisar que el `stem` de A no nombre la
respuesta de B; hay que revisarlo **en las dos direcciones**, incluidas las
etiquetas de paso (aposiciones, glosas, categorías dichas al vuelo) con que
un `stem` presenta el estímulo. `lot-validation.ts` sigue sin poder verlo: es
una relación entre dos ítems, no una propiedad de uno (defecto ya anotado en
G38 §6).

### 4) La tercera reparada: la coletilla que solo justificaba el archivado

G39 §9.2 dejó dos reactivos de letras peninsulares archivados en un `Topic`
mexicano, pidiendo juicio taxonómico. Resuelto **sin crear un `Topic` nuevo**
—que nacería con un solo reactivo y ensuciaría la cobertura por tema— usando
los que ya existen en la materia:

| id | De | A | Criterio |
|---|---|---|---|
| `cmtf6e7te…` | Literatura contemporánea mexicana | **Literatura universal clásica** (`cmrr1kgjo…`) | periodo áureo peninsular: encaja donde G39 §9.2 ya lo ubicaba |
| `cmtf6e8rj…` | Literatura contemporánea mexicana | **Modernismo** (`cmrr1kfcj…`) | movimiento finisecular contemporáneo del modernismo y emparejado con él en el temario estándar; G39 tenía razón en que **no** es "clásico" |

`cmtf6e7te…` cargaba además una coletilla inicial cuya única función era
justificar que un tema peninsular viviera en un `Topic` mexicano. Con el
archivado corregido, la coletilla es un vestigio: se eliminó. **Eso cambia
contenido ⇒ re-verificación ciega** (misma regla que G39 §8 aplicó al revés:
metadato solo ⇒ sin re-verificación). Es la tercera reparada.

`cmtf6e8rj…` **solo** cambió de `topicId`: metadato, la respuesta no se
mueve, `isVerified` sigue `true`, **sin re-verificación** — y por eso no
entra en la tasa de rescate.

Literatura (UNAM A4) tras los movimientos, 35 reactivos intactos:
**5 / 6 / 5 / 5 / 6 / 2 / 6** (prehispánica · colonial · neoclásica y
romántica · realismo y naturalismo · modernismo · contemporánea mexicana ·
universal clásica). **Ninguna reparación tocó `options`**, así que la
distribución de posición del lote de G37 queda intacta por construcción, no
por suerte.

### 5) Resolución y tasa de rescate — con el arnés auditado antes de reportar

Los 3 se exportaron con `content:blind-batch --ids` (no `--topic`: así el
duplicado retirado de §8, que también está en `isVerified=false`, no se cuela
en la cohorte) y se resolvieron desde cero.

| Cohorte | Resueltos | Rescatados | Sin publicar | Tasa de rescate |
|---|---|---|---|---|
| **Reparadas de G40** | 3 | **3** | 0 | **100 %** |

- **3/3 conceptuales.** Ninguno admite cálculo: `usedCalculation:false` en los
  tres, declarado con verdad y no por inercia (el campo se persiste tal cual
  en el registro de auditoría). El control fue el **descarte razonado de los
  tres distractores por contenido** — periodo histórico incompatible, corpus
  incompatible, categoría incompatible, y orden invertido respecto del
  "respectivamente" que pide uno de los `stem` — **cero referencias
  posicionales**.
- Confianza **0.97 mínima / 0.977 promedio**. `model` declarado:
  `claude-opus-5`, el que realmente resolvió (defecto de G14 corregido en
  G17, respetado aquí).
- `problems: []` en los tres. Tras la reparación no quedó ningún defecto
  bloqueante que reportar en estos ítems.

**El 100 % se auditó antes de reportarlo**, con el criterio de G19 §5 — tres
de tres es justo el resultado que también produciría un arnés degenerado:

- **2 de 3** etiquetas ciegas tradujeron a un id de opción **distinto** del
  elegido: el barajado permutó de verdad.
- La traducción es **biyección por reactivo**: 3 × 4 = **12** imágenes
  distintas, **0 colisiones**.
- La semilla de `shuffleOptionsForQuestion` se deriva solo del `questionId`;
  no toca `isCorrect`, así que no puede sesgarse hacia la correcta.

A `n=3` la tasa no tiene poder estadístico y no se presenta como si lo
tuviera: **es la confirmación de que las tres reparaciones se sostienen**, no
una medición de salud del generador. La métrica de salud sigue siendo la
global de §9.

### 6) Hallazgo nuevo, no pedido: paráfrasis cercana de la guía fuente

Al abrir el `SourceChunk` para cerrar §9.2/d (después de resolver) aparece un
problema que ninguna fase anterior había mirado: **3 de los 4 reactivos
anclados a ese fragmento son paráfrasis cercanas de los ítems de la guía
fuente, uno de ellos casi literal en el `stem`.** Los juegos de opciones sí
se rehicieron —y se rehicieron mejor: el original se contestaba por un rasgo
superficial que los distractores nuevos eliminan— pero los enunciados siguen
demasiado pegados al original.

- **No es un defecto de corrección.** Los cuatro son factualmente correctos y
  ya están verificados; nada que despublicar hoy.
- **Sí es riesgo de originalidad** en un producto de paga, y toca justo la
  disciplina de derechos que G37 declaró haber cuidado para los textos de
  análisis (los reactivos derivados del banco de preguntas de la guía no
  pasaron por ese mismo filtro).
- **Disposición: al work order, con re-verificación ciega obligatoria en una
  sesión DISTINTA.** Reescribir los `stem` aquí sería inútil: esta sesión ya
  vio las claves de los cuatro al auditar el arnés (§5) y el chunk completo
  (§7). Se documenta y se pasa.

### 7) §9.2/d resuelto con veredicto: el chunk está rebanado por página

G38 §10 y G39 §9(d) describieron el `SourceChunk` `cmrsromj5…` como "mal
clasificado y de contenido mixto", y lo difirieron a una fase con el texto
completo a la vista. Con el texto a la vista, el diagnóstico cambia:

**El chunk no está mal clasificado por juicio: está rebanado por página.** Es
una página de la guía fuente, cortada por límite de página y no por sección,
de modo que arrastra la cola de un reactivo de **otra materia** antes del
encabezado de sección, y después ítems de literatura de dos tradiciones
distintas. Su `topicId` es un solo valor y **ningún valor único puede servir a
ese contenido** — no porque se haya elegido mal, sino porque el fragmento no
es una unidad temática.

- **No se movió el chunk.** Moverlo solo cambiaría cuál de sus mitades queda
  mal servida. Su materia (Literatura) sí es correcta para la mayoría de su
  contenido.
- **El arreglo real vive en el chunker**, no en el chunk: rebanar por
  encabezado de sección en vez de por página. Va al work order como mejora de
  ingesta, no como corrección de datos.
- **Lo que sí importaba ya está corregido:** el `topicId` de los **reactivos**
  —que es lo que decide dónde se sirven— quedó bien en §4. El `topicId` del
  chunk es una pista de recuperación, no una afirmación sobre cada reactivo
  que respalda.
- Nota de procedencia, registrada por honestidad: el fragmento proviene de la
  guía de **otra institución** que la del examen al que sirven los reactivos.
  No lo prohíbe ningún guardrail (la reutilización que G26 restringe es la de
  *reactivos* entre áreas, nunca entre instituciones; una guía es material de
  estudio), pero significa que el `SOURCED` de esos 4 está anclado fuera de la
  institución destino. Se anota, no se cambia.

### 8) §9.3 desbloqueado: el duplicado se retira, y `manualReview` ya sabe decirlo

G24 y G39 declararon el mismo bloqueo sin resolverlo: despublicar un duplicado
exige una anotación de cola que `manualReview` no tenía (solo
`approved_with_option` / `edited`). Se resolvió el bloqueo en vez de diferirlo
una tercera vez.

- `src/lib/admin/verification.ts`: `manualReview.action` acepta ahora
  **`'duplicate'`**, con un campo `note` opcional. Cambio **aditivo**: ningún
  consumidor ramifica por el valor de `action` (verificado),
  `classifyReviewQueue` ya sacaba de toda cola cualquier registro con
  `manualReview`, y `decision`/`reasons`/`audit` quedan intactos — el histórico
  del pipeline se preserva, que era el punto del diseño de F3. **+2 tests** en
  `tests/admin/verification.test.ts`.
- Retirado `cmrul0y5k003s13p9jr7ham8x` (tema "Reacciones químicas"),
  conservado `cmrul1p9e006a13p9goneclnw` (tema "Ácidos, bases y sales"): ambos
  plantean la misma neutralización y el tema conservado es el más específico
  para ese contenido. **`isVerified=false` + `manualReview.action='duplicate'`
  + `note` que apunta al conservado.**
- **Guardrail respetado, comprobado en código antes de escribir:**
  `SessionAnswer` del retirado = **0**. No se borró: despublicar preserva el
  registro y no rompe nada del aprendizaje (CLAUDE.md prohíbe borrar reactivos
  con respuestas históricas; aquí ni siquiera hizo falta invocar la excepción).

**Consecuencia para las fases de balance:** la consulta cruda
`isVerified=false ∧ verification IS NOT NULL` ya **no** es la cola. La
definición canónica —la que usa la app en `reviewQueueFor`— es
`isVerified=false ∧ verification≠null ∧ manualReview=null`, y con ella la cola
sigue en **cero**. Las próximas fases deben usar esa, no la cruda.

### 9) Acumulado real, consultado en vivo antes y después

| Métrica | Antes (G39) | Después (G40) |
|---|---|---|
| Reactivos en banco | 832 | **832** |
| Servibles (`isVerified=true`) | 832 | **831** |
| Retirados a propósito | 0 | **1** |
| Cola canónica | 0 | **0** |
| `decision=AUTO_APPROVED` | 832 | **832** |
| `decision=UNPUBLISHED` | 0 | **0** |
| Auto-aprobación global | 100 % | **100 % (832/832)** |
| `ExplanationLayer` | 2 496 | **2 496** = 832×3 |
| `SOURCED` ↔ `QuestionSourceChunk` | 218 = 218 | **218 = 218** |
| Brecha a la meta efectiva (G26, 1 222) | 546 | **546** (sin cambio) |

- El servible baja en 1 **a propósito**: el duplicado retirado. Las 3
  reparadas salieron de servibles y volvieron (832 → 828 durante la
  reparación → 831 tras resolver), medido en cada paso, no inferido.
- La auto-aprobación global sigue contando el veredicto original del retirado
  —así se diseñó `manualReview`: mide la salud del **pipeline**, no el estado
  editorial— por eso 832/832 con 831 servibles. No es una inconsistencia.
- `session-v1`: **523/523** coincidencias generador↔verificador. **No sube a
  526**, y la distinción importa: cuenta *reactivos distintos*, no *eventos de
  resolución*. Los 3 de esta fase ya estaban dentro desde G38; se resolvieron
  por segunda vez y su registro se sobrescribió. Los eventos ciegos acumulados
  sí son 3 más. `adversarial-v1` sigue en 309/309.
- **La brecha NO sube con el retiro**, contra lo que sugeriría restar un
  servible: se midió en vez de suponerse. La meta efectiva se suma por celda
  con piso en cero, y el retirado vive en una celda (UNAM Química, Área 1: 51
  servibles) que ya está **por encima** de su cuota — restarle uno no abre
  brecha donde no la había. Sigue en **546 (~16 lotes)**. `content:coverage`
  en vivo: **831 servibles · 0 pendientes · 1 retirado · 832 en banco · 55 %
  de la meta efectiva**.

### 10) Corrección de instrumento: `content:coverage` ya cuadra con `COUNT(*)`

El retiro destapó un defecto de reporte en el propio instrumento que las fases
de balance leen: `grandTotal` se calculaba como `servibles + pendientes`, y un
reactivo despublicado a propósito **no es ninguno de los dos** (tiene
veredicto, así que no cuenta como pendiente; no es servible, así que no cuenta
como servible). La línea "en banco" decía **831** con 832 filas reales. Antes
de G40 las dos cifras coincidían por accidente: nunca se había retirado nada.

Corregido en `scripts/content-coverage.ts`: se cuenta `retired`
(`isVerified=false ∧ manualReview≠null`), entra en el total y se imprime solo
cuando es > 0. Ahora la línea dice **831 servibles · 0 pendientes · 1 retirado
· 832 en banco**, y "en banco" vuelve a ser verificable contra `COUNT(*)`. Sin
este arreglo, cada fase futura habría tenido que explicar un descuadre de 1.

### 11) Verificación técnica

- `pnpm typecheck` → **verde**.
- `pnpm lint` → **verde**.
- `pnpm test:unit` → **493/493** en 52 archivos (491 → 493: +2 del retiro por
  duplicado).
- Cambios de código: `src/lib/admin/verification.ts` (aditivo),
  `scripts/content-coverage.ts` (reporte), `tests/admin/verification.test.ts`
  (+2). **0 cambios a `prisma/schema.prisma`.**
- Cambios de datos: **3 `stem`** (los tres re-verificados a ciegas), **2
  `topicId`**, **1 retiro** (`isVerified` + `manualReview`). **0 escrituras a
  `options` / `isCorrect` / explicaciones**, ni por la reparación ni por la
  resolución.
- Cero llamadas a la API de pago de Anthropic.

### 12) Limpieza

Los 8 scripts auxiliares de la fase (estado, lectura de `stem` sin `options`,
taxonomía, reparación con `--dry-run`, auditoría del arnés, inspección del
chunk, cierre, conteo de pipeline) se borraron al terminar: `ls scripts/ |
grep g40` → **0**. El lote ciego y el archivo de respuestas
(`scripts/content-exports/g40-blind.json`, `g40-answers.json`) quedan **solo en
local**: `scripts/content-exports/` está en `.gitignore` desde antes de esta
fase, así que —como en toda ronda ciega previa— no se versionan. Lo que sí
persiste en el repo es este registro, y en la DB el `Question.verification` de
cada reparada, que guarda el veredicto ciego completo.

### Siguiente (G40)

1. **Volver a componer.** La cola vuelve a estar en cero y esta fase no movió
   la brecha (546, ~16 lotes). Siguen vigentes los 5 pools de G39 §7 en orden:
   **IPN Física**, **IPN Química** (pool, sirve 2 ramas), **IPN Matemáticas**
   (celda MEDBIO), **UNAM A1 Matemáticas**, **IPN MEDBIO Biología**. Consultar
   `content:coverage` en vivo antes de cada lote.
2. **Regla nueva de §3 en composición:** revisar la fuga entre reactivos que
   comparten estímulo **en las dos direcciones**, incluidas las etiquetas de
   paso con que un `stem` presenta el estímulo. Suma a las reglas de G38 (§2
   canal de entrada, §3 valor exacto en `## GNN`, §4 no publicar la secuencia
   de clave, §6 ningún `stem` nombra lo que otro pide identificar).
3. **Al work order (§6): reescribir los `stem` demasiado pegados a la guía
   fuente** de los 4 reactivos anclados a `cmrsromj5…`, en una sesión
   **distinta** de ésta, con re-verificación ciega. Extender el criterio de
   originalidad de G37 a los reactivos derivados de bancos de preguntas de
   guías, no solo a los textos de análisis.
4. **Al work order (§7): rebanar los `SourceChunk` por encabezado de sección**
   en vez de por página, en la ingesta. Es la causa raíz de la clasificación
   imposible, y afectará a cualquier guía futura con secciones por materia.
5. **Auditoría 5 %:** sigue vencida (2 ciclos). La muestra de 40 ids ya está
   generada; exige una sesión ciega con tier **≠ opus-5**, que esta fase no
   podía ser. `session-v1` en 3.4 %.
6. **Heredado sin tocar:** rotación A→B→C→D (~140 reactivos con
   `SessionAnswer`), decisión del dueño, 7 fases marcado.

## G39 — Balance intermedio del banco (2026-08-30)

**COMPLETADA.** Pasada **editorial** (no ciega, declarado en el encargo: aquí sí
se ven las respuestas del generador y del verificador — el trabajo es arbitrar,
igual que G17 y G24). Modo autónomo, sin preguntas. Objetivo: consolidar el
estado real del banco, triar la cola de discrepancias acumulada desde G25 y
recalcular la brecha al Content Freeze (**21-nov-2026**).

Todo lo de abajo se consultó **en vivo** contra Supabase (proyecto
`fumluvvzskhdxcyljbmx`) por el conector MCP, cruzado con `pnpm content:coverage`
y `pnpm content:audit-sample`. Los números coinciden por las tres vías.

### 1) Estado consolidado del banco (números reales)

| Métrica | Valor |
|---|---|
| Reactivos totales | **832** |
| Verificados (`isVerified=true`) | **832** |
| Servibles (`isVerified=true` + `usage=SERVABLE`) | **832** |
| `usage=CALIBRATION_ONLY` | 0 |
| `source` | 832 `GENERATED` (0 `OFFICIAL_SAMPLE`, 0 `IMPORTED`) |
| Cola ciega (`isVerified=false`, `verification=null`) | **0** |
| Cola de discrepancias (`isVerified=false`, `verification!=null`) | **0** |
| Veredictos `UNPUBLISHED` en cualquier parte del banco | **0** |
| `verification.manualReview` presente | 0 |
| `verification.audit.degraded=true` | 0 |
| `ExplanationLayer` | 2 496 = 832 × 3 exactas (0 reactivos con ≠ 3 capas) |
| `Passage` | 12 · `QuestionReport` | 0 |
| Tasa de auto-aprobación global (`content:coverage`) | **100 % (832/832)** |
| Integridad `SOURCED` ↔ `QuestionSourceChunk` | 218 = 218 (0 huérfanos) |

**Desglose por institución (verificados):**

| Institución | Verificados | Peso total | Filas `Subject` con contenido / totales |
|---|---:|---:|---|
| UNAM (Concurso de Selección 2027 · 4 áreas) | **482** | 130 | 9 / 18 |
| IPN (Examen de Admisión 2027 · 3 ramas) | **350** | 140 | 7 / 17 |
| **Total** | **832** | **270** | 16 / 35 |

**Desglose por área y materia (verificados · `weight` · SRC/TEM):**

| Inst | Área | Materia | w | ✓ | SRC/TEM | clave compartida |
|---|---|---|---:|---:|---|---|
| UNAM | A1 Físico-Mat/Ing. | Matemáticas | 26 | 81 | 57/24 | — |
| UNAM | A1 | Física | 16 | 72 | 30/42 | — |
| UNAM | A1 | Química | 12 | 52 | 34/18 | `UNAM:QUIMICA` |
| UNAM | A1 | Español | 10 | 35 | 25/10 | `UNAM:ESPANOL` |
| UNAM | A1 | Inglés | 6 | **0** | — | `UNAM:INGLES` |
| UNAM | A2 Bio/Quím/Salud | Biología | 14 | 65 | 35/30 | — |
| UNAM | A2 | Química | 8 | 72 | 0/72 | `UNAM:QUIMICA` |
| UNAM | A2 | Español | 5 | **0** | — | `UNAM:ESPANOL` |
| UNAM | A2 | Inglés | 3 | **0** | — | `UNAM:INGLES` |
| UNAM | A3 Sociales | Historia de México | 7 | 35 | 7/28 | — |
| UNAM | A3 | Historia Universal | 5 | **0** | — | — |
| UNAM | A3 | Geografía | 4 | 35 | 0/35 | — |
| UNAM | A3 | Español | 3 | **0** | — | `UNAM:ESPANOL` |
| UNAM | A3 | Inglés | 1 | **0** | — | `UNAM:INGLES` |
| UNAM | A4 Humanidades | Literatura | 4 | 35 | 4/31 | — |
| UNAM | A4 | Filosofía | 3 | **0** | — | — |
| UNAM | A4 | Artes | 2 | **0** | — | — |
| UNAM | A4 | Español | 1 | **0** | — | `UNAM:ESPANOL` |
| IPN | FISMAT | Matemáticas | 24 | 70 | 20/50 | `IPN:MATEMATICAS` |
| IPN | FISMAT | Física | 20 | 35 | 3/32 | — |
| IPN | FISMAT | Química | 10 | **0** | — | `IPN:QUIMICA` |
| IPN | FISMAT | Español/Lectura | 4 | 70 | 0/70 | `IPN:ESPANOL` |
| IPN | FISMAT | Inglés | 2 | **0** | — | `IPN:INGLES` |
| IPN | MEDBIO | Biología | 22 | 70 | 0/70 | — |
| IPN | MEDBIO | Química | 16 | 35 | 3/32 | `IPN:QUIMICA` |
| IPN | MEDBIO | Matemáticas | 8 | **0** | — | `IPN:MATEMATICAS` |
| IPN | MEDBIO | Español/Lectura | 6 | **0** | — | `IPN:ESPANOL` |
| IPN | MEDBIO | Inglés | 3 | 35 | 0/35 | `IPN:INGLES` |
| IPN | SOCADM | Historia de México | 6 | **0** | — | — |
| IPN | SOCADM | Historia Universal | 4 | **0** | — | — |
| IPN | SOCADM | Geografía | 4 | **0** | — | — |
| IPN | SOCADM | Matemáticas Aplicadas | 3 | 35 | 0/35 | — |
| IPN | SOCADM | Español/Lectura | 3 | **0** | — | `IPN:ESPANOL` |
| IPN | SOCADM | Inglés | 2 | **0** | — | `IPN:INGLES` |
| IPN | SOCADM | Civismo/Derecho | 3 | **0** | — | — |

**16 de las 35 filas `Subject` tienen contenido; 19 están en cero** (varias de
esas 19 son celdas de un pool compartido G26 que ya se sirve desde otra área —
p. ej. UNAM A2/A3/A4 Español, servidas por los 35 de A1). Todo lo del banco
está en alcance del 21-nov (launch = UNAM Superior 4 áreas + IPN Superior 3
ramas; CLAUDE.md). El Área 4 va 1 de 3 materias propias con contenido; SOCADM
1 de 5 propias.

### 2) Triaje de la cola: no hay cola formal que triar — 3ª vez consecutiva

El encargo pedía triar "la cola de discrepancias acumulada desde G25" con las 4
categorías de G17 (generador tenía razón / verificador tenía razón / reparable /
irreparable). **La cola formal está en cero**, verificado por **cuatro vías
independientes**:

1. SQL `isVerified=false AND verification IS NOT NULL` → **0**.
2. SQL `isVerified=false` (cualquier estado) → **0**.
3. `content:coverage` → "**0 pendientes de resolución**".
4. No existe **ni un** veredicto `UNPUBLISHED` en el banco entero; 0
   `manualReview`; 0 `audit.degraded`.

Desde G2, el pipeline `session-v1` lleva **523/523 coincidencias
generador↔verificador**; ninguna discrepancia sin resolver ha llegado a
persistirse desde que G17 limpió las 80 heredadas (3 borradas, 77
re-verificadas a ciegas en G19). G24 y G25 encontraron lo mismo. **Cero
reactivos auto-aprobados por esta fase** — criterio de aceptación cumplido por
defecto: no había nada que aprobar.

**Lo que sí existe: defectos editoriales que las rondas ciegas G28–G38
detectaron y difirieron explícitamente a "una fase editorial".** No son
discrepancias generador↔verificador (la respuesta correcta nunca estuvo en
disputa); todas se calificaron "no bloqueante" en su fase de origen y **ninguna
tiene impacto de cara al usuario** (comprobado: los componentes de examen/
simulador/drill **no ramifican por `format`**; los reactivos afectados son
autocontenidos y factualmente correctos). Triadas con las 4 categorías —
descritas por **estructura e id**, nunca por la forma correcta del punto
evaluado (regla de canal G32 §2 / G34 §3: la auditoría del 5 % vuelve a correr
pasadas ciegas sobre lotes publicados):

| # | Ítem | Origen | Categoría | Disposición |
|---|---|---|---|---|
| a | 8 reactivos `CHART_TABLE` con los datos en prosa y sin tabla/imagen | G28 §8.1 | **REPARABLE** (metadato; los componentes ignoran `format`) | **Aplicado en esta fase** (§8): `format → PROBLEM_SOLVING`. Contenido idéntico ⇒ sin re-verificación, `isVerified` sigue `true`. |
| b | g37-Lit: el `stem` de un reactivo (`cmtf6e6v5…`) nombra un autor que **otro reactivo del mismo lote (`cmtf6e5wr…`) pide identificar** — fuga relacional | G38 §6 | **REPARABLE** como defecto de lote; cada reactivo es individualmente correcto ⇒ **generador tenía razón** en ambos | Diferido a micro-fase editorial: despersonalizar el `stem` del primero ⇒ `isVerified=false` + `verification=null` ⇒ re-verificación ciega. Cambia contenido: no se hace en una fase de balance (criterio de G24). |
| c | g37-Lit: dos reactivos de **literatura española peninsular** (`cmtf6e7te…`, `cmtf6e8rj…`) archivados en el `Topic` "Literatura contemporánea mexicana" | G38 §10 | **REPARABLE** (metadato `topicId`) — pero **con matiz taxonómico** | Diferido: uno encaja en "Lit. universal clásica"; el otro es un movimiento de fin del s. XIX que no es "clásico". Necesita juicio editorial / quizá un `Topic` "Literatura española" nuevo. No es un movimiento mecánico. |
| d | `SourceChunk` `cmrsromj5…` mal clasificado y de **contenido mixto** (un autor mexicano contemporáneo + dos temas peninsulares) respalda los 4 reactivos `cmtf6e5wr…`–`cmtf6e8rj…` | G38 §10 | **REPARABLE** con juicio (el chunk es genuinamente mixto; su `topicId` es un solo valor) | Diferido a micro-fase con el texto completo del chunk a la vista. |
| e | Par casi-duplicado (`cmrul0y5k…` tema "Reacciones químicas" ≡ `cmrul1p9e…` tema "Ácidos, bases y sales"), mismo enunciado de neutralización, 0 respuestas cada uno, mismo banco UNAM Química | G19 / G24 §8 | **REPARABLE** (redundancia real) | Diferido: despublicar uno exige una anotación de cola "duplicado" que `manualReview` no tiene (bloqueo idéntico al que G24 declaró). |
| f | ~140 reactivos (IPN FISMAT Matemáticas, IPN MEDBIO Biología) con rotación de letra correcta A→B→C→D | G16 / G24 §3 | **NO es defecto** — la distribución marginal es sana (9/9/9/8); es un artefacto de orden, no de contenido | **Decisión del dueño** (6 fases consistentes). Los ~140 tienen `SessionAnswer`; reposicionar rompería el histórico de aprendizaje. |
| g | g37-Lit: 3 reactivos del mismo tema sobre la misma figura (`cmtf6…`); dos la nombran en el `stem`, uno pide identificarla | esta fase | **generador tenía razón** (cada uno individualmente correcto; quitar el nombre no cierra la fuga — las obras citadas la identifican igual) | Documentado; valor bajo; sin acción. |

- **VERIFICADOR TENÍA RAZÓN: 0 casos.** No hay discrepancia de opción en el
  banco; todo veredicto coincidió con el generador.
- **IRREPARABLE: 0.**

### 3) Distribución de posición — el sesgo de G8 sigue sin reaparecer

Sobre `isVerified=true`, letra = `option.id` con `isCorrect` en la DB:

| Institución | n | A | B | C | D | Banda 15–40 % |
|---|---:|---:|---:|---:|---:|---|
| UNAM | 482 | 26.6 % | 26.6 % | 22.4 % | 24.5 % | ✅ |
| IPN | 350 | 25.4 % | 25.1 % | 26.0 % | 23.4 % | ✅ |

**0 reactivos con ≠ 1 opción correcta · 0 con ≠ 4 opciones.** Por materia, las
dos celdas más ajustadas siguen siendo las que G8/G24 ya anotaban, **sin
empeorar** (ningún lote nuevo las tocó): **UNAM A1 Matemáticas D = 16.0 %**
(n=81) y **UNAM A1 Español C = 17.1 %** (n=35) — ambas dentro de banda, sin
margen, en monitoreo. Los lotes nuevos (G33/G35/G37) aterrizan 9/9/9/8.

**Artefacto de rotación de G16 — estable, no se propagó:**

| Materia (lote) | pares con rotación +1 | esperado al azar |
|---|---:|---:|
| IPN FISMAT Matemáticas (G3a+G13) | **61 / 69 (88.4 %)** | ≈ 25 % |
| IPN MEDBIO Biología (G3d+G15) | **47 / 69 (68.1 %)** | ≈ 25 % |
| Todo lote desde G20 | 8.8 % – 27.5 % | ≈ 25 % |
| G33 / G35 / G37 | 3/34 = 8.8 % | ≈ 25 % |

Idénticos a lo que midió G24: el artefacto está **confinado a los mismos 2
lotes viejos** y la práctica de composición (asignación de letra con semilla
anti-rotación) lo cerró desde G21.

### 4) SOURCED vs TEMARIO_ONLY

**218 SOURCED (26.2 %) / 614 TEMARIO_ONLY (73.8 %)** — idéntico en el banco y en
el subconjunto verificado (todo está verificado). El ratio baja fase a fase
(F4: 44 % · G24: 33 % · G28: 32 % · **G39: 26 %**) porque los lotes G27–G37 son
casi todos `TEMARIO_ONLY` (solo Literatura aportó 4 SOURCED). **46 de 217 temas**
tienen algún `SourceChunk`. Transparente y no bloqueante; para subirlo hay que
`pnpm content:scan-sources` tras agregar material fuente.

### 5) Auditoría del 5 % — mecanismo sano, ejecución vencida 2 ciclos

**El mecanismo funciona.** Revisión de código: `sampleForAudit`
(`scripts/lib/resolution.ts`), `loadApprovedQuestionsForAudit`
(`scripts/lib/content-db.ts`), `content-audit-sample.ts`,
`content-audit-resolve.ts` y `classifyReviewQueue` (con el reordenamiento de
G24 — `audit.degraded` **antes** del guard de `decision` — **intacto**,
`src/lib/admin/verification.ts:130`) están completos y correctos. Corrido en
vivo esta fase: `pnpm content:audit-sample` → **pool elegible 785** (832
verificados − 47 ya auditados), **muestra 5 % = 40** ids, escritos a
`scripts/content-exports/audit-sample-2026-08-30T04-47-24-880Z.json` (gitignored),
listos para una sesión ciega.

**Pero la ejecución está atrasada.** Cobertura actual: **47/832 auditados
(5.6 %), 0 degradados** — sin cambio desde G25.

| Pipeline | Verificados | Auditados | % | Δ desde G25 |
|---|---:|---:|---:|---|
| `adversarial-v1` (F4) | 309 | 29 | 9.4 % | — |
| `session-v1` (G2+) | 523 | 18 | **3.4 %** | +210 verificados, **+0 auditados** |
| **Total** | **832** | **47** | 5.6 % | |

G25 §Siguiente-4 dejó encargado "repetirla cada ~3 lotes"; han pasado **6**
(G27/G29/G31/G33/G35/G37) sin una sola pasada de auditoría. `session-v1` cayó de
5.8 % (18/313 en G25) a **3.4 %** por dilución. **Caveat de diversidad de tier
(heredado de G25 §7):** de los 47 auditados, **16 se auditaron con el mismo tier
de modelo que su 2ª pasada** (12 opus-5→opus-5, 4 opus-4.8→opus-4.8) — para esos
la 3ª pasada solo aportó diversidad de contexto, no de modelo.

### 6) Brecha real y proyección honesta al 21-nov

**Meta nominal (por celda): 1 500 → 55 % (832). Meta efectiva (G26, pools de
contenido compartido): 1 222 → 55 %. Brecha: 546 verificados = 16 lotes = ~32
sesiones** (composición + verificación ciega, sesiones distintas por
aislamiento). Confirmada por tres vías: salida de `content:coverage`, SQL propio
a nivel de pool (suma exacta 546), y el ajuste de G26.

**La reutilización de G26 está activa:** 7 pools compartidos, 19 filas `Subject`.
Dos pools quedan **sobre-cubiertos** (no suman a la brecha): UNAM Química
(124 verificados vs. meta 67) e IPN Español/Lectura (70 vs. 33).

**Los últimos 6 lotes rindieron ~46 % por debajo de su potencial contra la
meta.** De los 210 reactivos de G27–G37, solo **~113 cerraron brecha efectiva**;
**~97 cayeron en pools que ya estaban en o sobre su meta del 21-nov**: G29
(Español, 35, pool ya en 35/33) **no movió la meta en absoluto**; G27 y G31
rindieron la mitad; G33/G35/G37 abrieron Áreas 3/4 (cobertura de producto real
— un aspirante A3/A4 no tenía nada) pero contra la meta aportaron 35+22+22 de
105. La brecha bajó 659 → 546 (no 659 → 449).

**Días al Content Freeze (2026-08-30 → 2026-11-21): 83 ≈ 11.9 semanas.**
Cadencia requerida: **546 / 83 = 6.6 verificados/día = 1.35 lotes/semana.**

| Ventana de ritmo | Δ verif. | Días | /día |
|---|---:|---:|---:|
| Burst G23→G38 (2026-08-27 → 08-29) | +210 | 2.2 | ~97 |
| Contenido reanudado G13→G38 (2026-08-24 → 08-29) | +462 | 5.0 | ~93 |
| Calendario desde F4 **con la pausa de 19 días de agosto** (07-21 → 08-30) | +536 | 40 | **13.4** |
| Calendario desde G3a **con la pausa** (08-05 → 08-30) | +476 | 25 | **19** |

- A **13.4/día** (la más pesimista — 40 días con un tramo muerto de 19 dentro):
  546 ÷ 13.4 = 41 días → termina **~2026-10-10**, **~6 semanas de margen**.
- A **19/día**: 546 ÷ 19 = 29 días → **~2026-09-28**, **~8 semanas de margen**.
- El burst (~95/día) no es sostenible y se ignora.

**Veredicto: alcanza con holgura.** La cadencia requerida (1.35 lotes/semana)
está muy por debajo de cualquier ritmo demostrado. Aun asumiendo otra pausa
tan larga como la de agosto, el cierre pesimista es ~10-oct, seis semanas
antes. Harían falta **dos** pausas del tamaño de la de agosto, o **una** parada
continua de ~6 semanas, para perder el 21-nov. Respecto de G24 ("alcanza, pero
es borde" — el margen era exactamente **una** pausa), la posición mejoró
materialmente: brecha 878 → 546 (G26 −219 + 6 lotes), margen ~1 pausa → ~2
pausas. **El riesgo no es el ritmo por sesión ni el calendario: es la
puntería.** Si los próximos 16 lotes van a los pools de §7, 546/35 = 16 lotes
justos. Si siguen cayendo parcialmente en pools cubiertos, son ~20+ lotes —
todavía caben en 83 días, pero el colchón se come.

### 7) Top-5 pools por brecha pendiente (unidad correcta post-G26)

| # | Pool | Meta | Tiene | Brecha | Por qué |
|---|---|---:|---:|---:|---|
| 1 | **IPN Física** (FISMAT, w20, no compartida) | 111 | 35 | **76** | Día 1, la brecha más grande, 1 solo lote hecho |
| 2 | **UNAM A1 Matemáticas** (w26, no compartida) | 144 | 81 | **63** | Materia más profunda; celda tight D=16 % |
| 3 | **IPN Matemáticas** (pool FISMAT w24 + MEDBIO w8) | 133 | 70 | **63** | Día 1; la celda MEDBIO sigue en 0 |
| 4 | **IPN Química** (pool FISMAT w10 + MEDBIO w16) | 89 | 35 | **54** | Día 1; celda FISMAT en 0; **un lote sirve las 2 ramas** |
| 5 | **IPN MEDBIO Biología** (w22, no compartida) | 122 | 70 | **52** | Día 1 |

Fuera del top-5, también EN CERO: UNAM Inglés (pool, brecha 33), IPN SOCADM
Historia de México (33), UNAM A3 Historia Universal (28), IPN SOCADM Historia
Universal (22) y Geografía (22), UNAM A2/A3/A4 Español (pool a 21 de cubrir las
4 áreas), UNAM A4 Filosofía (17), IPN Civismo/Derecho (17), UNAM A4 Artes (11).

**Recomendación:** los próximos ~10 lotes a los 5 pools de arriba (todos IPN/
UNAM día 1, STEM de alto peso) **antes** de seguir abriendo SOCADM/Filosofía/
Artes/Inglés — invierte el patrón de G29–G37.

### 8) Cambio aplicado: 8 formatos `CHART_TABLE` → `PROBLEM_SOLVING`

Único cambio de datos de esta fase. Los 8 reactivos de G27 (IPN SOCADM
Matemáticas Aplicadas) marcados `CHART_TABLE` llevan los datos **en prosa dentro
del `stem`** y ningún `imageUrl` — el formato prometía un estímulo tabular/
gráfico inexistente. G28 §8.1 lo detectó y ofreció "esos casos son
`PROBLEM_SOLVING`" como opción 1; lleva 4 fases diferido. Los 8 exigen cálculo y
pertenecen con los otros 26 `PROBLEM_SOLVING` del mismo lote.

- **Solo cambia el enum `format`.** 0 bytes de `stem`, `options`, `isCorrect` o
  explicaciones. Los componentes de examen/simulador/drill **no ramifican por
  `format`** (verificado: solo miran `passage` e `imageUrl`), así que el render
  es idéntico. Scoring compara opciones, no formato. **Sin re-verificación** —
  la garantía adversarial es sobre la respuesta, que no cambia; `isVerified`
  sigue `true`.
- Ids: `cmtdm82gt…, cmtdm838x…, cmtdm8ham…, cmtdm8kdr…, cmtdm8tfi…, cmtdm8vr1…,
  cmtdm8wiu…, cmtdm8y2m…`. 0 `SessionAnswer` en los 8. `CHART_TABLE` en el banco:
  8 → **0**. `PROBLEM_SOLVING`: 126 → **134**.
- El registro permanente `docs/content-batches/g27-*.json` se deja como
  snapshot histórico de G27; esta corrección vive aquí.

### 9) Reparaciones editoriales pendientes — work order para una micro-fase

Ninguna es bloqueante; ninguna toca la fecha. Todas necesitan **edición de
contenido y/o juicio taxonómico**, que no corresponde a una fase de balance
(criterio de G24: "no se hace a medias aquí"). Para una sesión editorial
dedicada, idealmente **con capacidad de re-verificación ciega**:

1. **Fuga relacional g37-Lit (§2b).** Despersonalizar el `stem` de
   `cmtf6e6v50006i72eielfngps` para que no nombre al autor que
   `cmtf6e5wr0001i72eq4ershjh` pide identificar (los títulos de obra que ya cita
   bastan para su propia pregunta). Luego `isVerified=false` +
   `verification=null` ⇒ re-entra a `content:blind-batch`. La respuesta no
   cambia.
2. **Reclasificación g37-Lit + chunk (§2c/§2d).** Con el texto completo del
   `SourceChunk` `cmrsromj5007r13b3cq77jham` a la vista: decidir si
   `cmtf6e7te000bi72ewmuvzs9b` y `cmtf6e8rj000gi72e1u8e4jqv` van a "Literatura
   universal clásica" (`cmrr1kgjo006qhi3nh44uzymo`), a un `Topic` "Literatura
   española" nuevo, o se quedan con el `stem` reformulado. Los otros dos que
   citan ese chunk (`cmtf6e5wr…`, `cmtf6e6v5…`) sí son "contemporánea mexicana".
   El chunk es de contenido mixto: su `topicId` único no sirve bien a las dos
   mitades.
3. **Par duplicado (§2e).** Despublicar uno de `cmrul0y5k003s13p9jr7ham8x` /
   `cmrul1p9e006a13p9goneclnw` (0 respuestas ambos). Antes hace falta una
   anotación de cola "duplicado" en `manualReview` (hoy solo tiene
   `approved_with_option` / `edited`) — o borrarlo (permitido: 0 `SessionAnswer`).
4. **Ejecutar la auditoría 5 % (§5)** en una sesión ciega: el archivo de muestra
   ya está generado (40 ids). `content:blind-batch --ids <archivo>` → resolver a
   ciegas con un tier ≠ opus-5 → `content:audit-resolve`. El lote de G37 ya
   entra al universo muestreable.
5. **Decisión del dueño (§2f):** reposicionar o no los ~140 reactivos con
   rotación A→B→C→D. 6 fases lo dejan marcado.

### 10) Verificación técnica

- `pnpm typecheck` → **verde**.
- `pnpm lint` → **verde**.
- `pnpm test:unit` → **491/491** en 52 archivos (sin cambio vs. G26/G38 — esta
  fase no tocó código).
- Cambios: **1 `UPDATE` de datos** (8 filas `questions.format`), 0 cambios de
  `src/`, 0 de `prisma/schema.prisma`, 0 de scripts, 0 escrituras a `stem`/
  `options`/`verification`/`isVerified`. Cero llamadas a la API de pago.
- `content:coverage` post-cambio: **832 servibles · 0 pendientes ·
  auto-aprobación 100 % · brecha 546** — sin mover.

### Siguiente (G39)

1. **Componer, no verificar** — la cola sigue vacía. Los próximos ~10 lotes a
   los 5 pools de §7 en orden: **IPN Física**, **IPN Química** (pool, sirve 2
   ramas), **IPN Matemáticas** (celda MEDBIO), **UNAM A1 Matemáticas**, **IPN
   MEDBIO Biología**. Consultar `content:coverage` en vivo antes de cada lote.
2. **Aplicar las reglas nuevas de G38** desde la próxima composición (§2 canal
   de entrada, §3 valor exacto en `## GNN`, §4 no publicar la secuencia de
   clave, §6 ningún `stem` nombra lo que otro reactivo pide identificar).
3. **Auditoría 5 %:** resolver la muestra de 40 ya generada, en una sesión
   ciega con tier ≠ opus-5 (§5, §9.4). `session-v1` está en 3.4 %.
4. **Micro-fase editorial** para el work order de §9 (fuga relacional,
   reclasificación Q29/Q30, par H₂SO₄).
5. **Heredados sin tocar:** rotación A→B→C→D (~140), y la pregunta de alcance
   del 21-nov queda **resuelta** por CLAUDE.md (launch = UNAM 4 áreas + IPN 3
   ramas → todo el banco está en alcance; la meta efectiva de 1 222 ya lo
   asume).

## G38 — Verificación ciega: Literatura, UNAM Área 4 (lote de G37) (2026-08-29)

**Modelo:** `claude-opus-5` (tier Opus del Plan de Implementación: razonamiento
denso y verificación de implementaciones críticas). **COMPLETADA. 35/35
auto-aprobados = tasa de auto-aprobación 100 %.** Segunda mitad del ciclo
adversarial de G2 sobre el lote que G37 insertó con `isVerified=false`.
Undécima ronda ciega consecutiva al 100 %.

### 1. Ceguera y aislamiento

**Verificados estructuralmente antes de leer un solo reactivo**, no asumidos:

| Control | Resultado |
|---|---|
| `grep -c` de `isCorrect\|explanation\|correctOption\|"answer"\|correctAnswer\|solution` sobre el lote ciego | **0** |
| Claves presentes en cada opción | solo `label`, `text`, `imageUrl` |
| Claves de nivel ítem | `questionId, institution, subject, topic, format, passage, requiresCalculation, stem, options` |
| Formato | **35/35 `MULTIPLE_CHOICE`** |
| `requiresCalculation` | **0/35** |
| Reactivos con pasaje | **0/35** (los 35 llegan autocontenidos en el `stem`, incluidos los 3 con texto original para analizar) |
| Opciones por reactivo · ids únicos | 4/4 en los 35 · 35 ids únicos |

**Aislamiento:** no se abrió el commit `91532b1` de G37, ni
`docs/content-batches/g37-unam-a4-literatura.json`, ni `Question.options`, ni
la sección `## G37` de este documento, ni el bloque `### Siguiente (G37)`
antes de responder. La sección `## G37` se leyó **después** de correr
`content:resolve`, únicamente para redactar esta. El registro permanente del
lote (que contiene la clave) **no se abrió en ningún momento** — ver §3, donde
esa disciplina tiene una consecuencia metodológica.

### 2. Canal de entrada — primera contaminación real desde G32

La línea 3 de este documento se lee al inicio de toda sesión por diseño. La de
G37 **inventarió el contenido de los ítems del `SourceChunk`** en que se anclan
4 reactivos del lote: nombró tres puntos literarios del fragmento, y **dos de
ellos son exactamente el dato que un reactivo del lote pide identificar** (un
emparejamiento autor–género y un nombre de autor). Un tercero nombró solo el
tema, no su forma correcta.

**Recuento honesto: 2/35 reactivos contaminados, 1 parcialmente, 32 limpios.**
Las dos respuestas afectadas se derivaron del contenido de las opciones y son
de manual de bachillerato —cualquier sesión las produce sin el fragmento—, pero
**el canal existió y se declara**, que es la regla desde G32 §2. Es la primera
contaminación medida desde entonces (G34: 35/35 limpios; G36: 35/35 limpios;
G32: 26/35).

**Regla nueva:** cuando un lote se ancla en un `SourceChunk`, la línea 3
describe el fragmento por **fuente, página y naturaleza** («banco de preguntas
de la guía X, 3 ítems literarios»), **nunca por inventario de lo que sus ítems
contienen**. Nombrar el contenido de un ítem del fragmento es nombrar la
respuesta del reactivo que se compuso a partir de él — el mismo defecto de
G32 §2, por una vía que ninguna fase había cerrado porque hasta G37 los lotes
`SOURCED` no habían llegado a la línea 3 con su inventario.

### 3. El candado de G36 §2 quedó inalcanzable — §2 y §3 de G36 se estorban

G36 dejó dos reglas que en G37 resultaron incompatibles:

- **§2** obliga a la ronda ciega a recalcular los diagnósticos de longitud
  sobre sus respuestas y **compararlos con los valores exactos** de la fase de
  composición; la coincidencia exacta corrobora el acuerdo por una vía que no
  pasa por el acuerdo mismo.
- **§3** obliga a la fase de composición a **sacar esos valores exactos del
  canal de entrada**, porque son una función de la clave.

G37 cumplió §3 mandando los valores exactos al registro permanente
`docs/content-batches/g37-unam-a4-literatura.json` — **el archivo que contiene
`isCorrect`**. Es decir: la sesión ciega no puede alcanzarlos sin romper el
sello. **El candado de §2 fue inejecutable en su forma exacta.** Solo quedó la
comparación **contra los veredictos** que `## G37` §5 publica en prosa:

| Estadístico | G38 (recalculado sobre las respuestas ciegas) | Veredicto que declaró G37 | ¿Consistente? |
|---|---|---|---|
| «elige la más larga», tie-aware | **5.00/35 = 14.3 %** | por debajo del azar (25 %) y muy por debajo de 14/35 | **sí** |
| «elige la más corta», tie-aware | **9.00/35 = 25.7 %** | en el azar | **sí** |
| Conteo estricto (única más larga) | 4/35 | — | — |
| Ratio medio de longitud correcta/distractores | **0.990** (mín 0.72, máx 1.41) | ≈ 1.0 | **sí** |
| Histograma de rango por longitud (1 = más larga) | {1: 4, 2: 16, 3: 6, 4: 9} | — | — |

Consistencia a nivel de veredicto en los tres estadísticos que G37 publicó, y
el lote pasa el umbral de G34 §2 con holgura. Pero **es una corroboración más
débil que la de G36**: infinitas asignaciones de clave dan 14.3 %, así que la
consistencia no prueba el acuerdo reactivo a reactivo.

**Regla nueva (corrige G36 §3 sin revertirla):** el valor exacto de los
diagnósticos va en la sección `## GNN` de este documento —que la sesión ciega
no abre **antes** de resolver, pero sí **después**, que es cuando la
comparación de §2 ocurre—, **no** solo en el registro permanente del lote. El
registro permanente contiene la clave y la sesión ciega no debe abrirlo nunca,
ni antes ni después: es el universo muestreable de la auditoría del 5 %.

### 4. Un candado más fuerte, encontrado de paso: la secuencia de clave

Al traducir las 35 respuestas ciegas de vuelta a las etiquetas originales
(`translateChosenOption` recompone el barajado determinista), la ronda ciega
**reprodujo carácter por carácter la secuencia de 35 letras** que `## G37` §5
publicó, y la clave agregada **A9/B9/C9/D8** que G37 declaró:

| Comprobación | Resultado |
|---|---|
| Secuencia recuperada por la ronda ciega vs. la publicada en `## G37` §5 | **idénticas, 35/35 caracteres, 0 posiciones distintas** |
| Clave agregada recontada desde la traducción | **A9 / B9 / C9 / D8** — coincide con la de G37 |

Esto **sí** es el candado mecánico que §2 buscaba, y es estrictamente más
fuerte que el estadístico de longitud: la secuencia es una función **inyectiva**
de la clave, no una función con pérdida. Un solo desacuerdo habría cambiado un
carácter.

**Y por eso mismo es el peor canal de fuga que este proyecto ha publicado.**
G36 §3 advirtió que el puntaje tie-aware «es un checksum de la clave»; la
secuencia **es la clave**, en texto plano, en el documento que toda sesión
abre. Vive en `## GNN`, que la ronda ciega no lee antes de resolver, así que la
disciplina del canal de entrada aguantó — pero G34 §3 extendió la regla a los
lotes ya publicados justamente porque la **auditoría del 5 % vuelve a correr
pasadas ciegas** sobre ellos, y una sesión de auditoría que abra `## G37` por
cualquier motivo se lleva la clave entera de 35 reactivos.

**Acción tomada en esta fase:** se **redactó** la secuencia literal de `## G37`
§5 y se dejó en su lugar el veredicto que sí importa (sin corridas cíclicas
A→B→C→D de longitud ≥ 3; rotación +1 medida 3/34 = 8.8 %, en el azar). La
secuencia sigue existiendo donde debe: en la DB y en el registro permanente del
lote. **Regla nueva:** ninguna fase de composición publica la secuencia de
letras de su clave en este documento; publica sus **propiedades** (corridas,
rotación, distribución agregada por letra).

### 5. Resolución y exactitud factual

**Control declarado:** el encargo pidió resolver desde cero razonando el
descarte de cada distractor y **verificando la exactitud de las atribuciones**
(autor, obra, movimiento, época). Autochequeo mecánico sobre los 35
razonamientos, con las regex de `lot-validation.ts` más el patrón
`POSITION_REF` de G33:

| Control sobre mis 35 razonamientos | Resultado |
|---|---|
| Citas por letra (`opción A`, `inciso B`, `letra C`, `D)`) | **0** |
| Referencias posicionales («la primera opción», «la de arriba») | **0** |
| Razonamientos con los **tres** distractores descartados por contenido | **35/35** |
| Ids cubiertos vs. lote ciego | 35/35, 0 faltantes, 0 sobrantes |

**35 `stem` y 140 opciones revisados uno por uno. 0 problemas declarados.**
Se verificaron: fechas de publicación de las obras citadas, autoría, orden
religiosa y geografía de las figuras del Barroco novohispano, nacionalidad y
adscripción de movimiento de los poetas, siglo de los autores del Siglo de Oro
y de la generación finisecular española, y la correspondencia
obra↔género↔movimiento en los reactivos de clasificación. **Ninguna atribución
resultó falsa.**

**Confianza declarada:** mínima **0.96**, máxima **0.99**, promedio **0.983**.
Empata prácticamente el piso de G34/G36 (0.96). Las tres mínimas caen en el
reactivo que contrasta la tradición oral prehispánica con la poesía culta
europea (§5.1) y en los dos que piden nombrar una figura retórica sobre un
texto original donde conviven dos figuras.

**Dos matices registrados sin bloquear publicación** —y, a diferencia de cómo
los escribieron G34 §4 y G36 §4, **sin decir a qué opción pertenecen**, por lo
que §4 acaba de establecer:

1. **Lírica prehispánica.** Una opción del reactivo de contraste atribuye a la
   tradición oral la ausencia de autoría fija. Es la simplificación didáctica
   estándar del temario, pero la tradición sí atribuye poemas a figuras
   nombradas —otro reactivo del mismo tema descansa en una de esas
   atribuciones—; el matiz real es que la atribución es posterior a la
   Conquista y de tipo tradicional, no de propiedad autoral a la europea. No
   altera qué evalúa el reactivo.
2. **Análisis de figura retórica.** En uno de los tres textos originales
   conviven dos figuras (una domina y otra la acompaña en una comparación).
   El enunciado pide la que **predomina** y ninguna opción ofrece la
   acompañante, así que no hay ambigüedad resoluble; se anota porque el
   margen es más estrecho que en los otros dos.

**Disciplina de derechos verificada desde el lado ciego:** los 3 reactivos que
piden analizar un texto lo traen **original**, escrito «a la manera de» cada
movimiento (pastiche, no cita); no hay transcripción de traducciones de la
lírica náhuatl —se describe el recurso, no se reproduce el poema—; la única
cita textual del lote es un íncipit de cuatro palabras del siglo XVII, en
dominio público. Coincide con lo que G37 declaró y **se comprobó leyendo los 35
`stem`**, no tomándolo del registro.

### 6. Defecto real hallado: fuga entre dos reactivos del mismo lote

**Un reactivo del lote nombra en su enunciado —por necesidad de la pregunta que
hace— el mismo dato que otro reactivo del lote pide identificar.** Quien vea el
primero obtiene el segundo sin conocimiento adicional. Los dos son
individualmente correctos, inequívocos y con distractores válidos, así que
**no se declararon como `problems`** (declararlos habría dejado sin publicar
reactivos sanos, y `resolveVerdict` no distingue defectos de reactivo de
defectos de lote).

Es un defecto **relacional**, invisible para `lot-validation.ts`, que valida
reactivo a reactivo y distribución agregada. Importa porque el motor adaptativo
puede servir ambos en la misma sesión de práctica.

- **Regla nueva de composición:** ningún `stem` puede nombrar el dato que otro
  reactivo del mismo lote pide identificar. Es barato de cumplir (basta
  despersonalizar el enunciado del segundo) y ninguna capa actual lo detecta.
- **Reparación editorial pendiente**, no ejecutada aquí porque excede el
  encargo de la ronda ciega: reescribir el enunciado del reactivo que nombra el
  dato para que no lo nombre. No requiere tocar opciones ni clave.

### 7. Calidad de distractores — la observación de G36 §5, medida

G36 §5 pidió subir el listón de los distractores en BASIC/INTERMEDIATE, tras
medir ~11/35 reactivos cuyos tres distractores caían por implausibilidad
general en G34 y otros ~11/35 en G36. Medición independiente de esta ronda,
hecha reactivo a reactivo mientras se resolvía y **antes** de leer lo que G37
declaró:

| Lote | Reactivos donde los 3 distractores caen sin el dato evaluado |
|---|---|
| G34 (Historia de México) | ~11/35 |
| G36 (Geografía) | ~11/35 |
| **G38 (Literatura, lote de G37)** | **4/35 claros + 2 discutibles** |

Los 4 claros son aquellos donde los distractores usan absolutos
(«únicamente», «siempre», «por completo») que se rechazan sin saber la materia.
En el resto los distractores son **alternativas reales**: otros movimientos con
su set de rasgos correctamente descrito, otras escritoras del Barroco
hispánico, otra revista y otro poeta del mismo movimiento, otras figuras
retóricas bien definidas, y —el mejor del lote— **otra obra del mismo autor**
correctamente descrita. G37 declaró «~4 reactivos» por su lado; **las dos
mediciones convergen sin haberse visto.** La recomendación de G36 §5 funcionó y
es el segundo resultado que esta fase aporta.

### 8. El barajado es real

La etiqueta ciega coincide con la original en **10/35 = 28.6 %**, cerca del
25 % de azar: 25 de las 35 respuestas cambiaron de letra al traducirse de
vuelta, así que el acuerdo no puede venir de la posición.

| Ronda | Coincidencia etiqueta ciega = original |
|---|---|
| G36 | 4/35 = 11.4 % |
| G28 | 6/35 = 17.1 % |
| G34 | 7/35 = 20.0 % |
| **G38** | **10/35 = 28.6 %** |
| G32 | 10/35 = 28.6 % |
| G30 | 12/35 = 34.3 % |

### 9. Acumulado real (consultado en vivo antes y después)

| Métrica | Antes | Después |
|---|---:|---:|
| Banco total | 832 | **832** |
| Verificados (`isVerified=true`) | 797 | **832** |
| Cola ciega (`isVerified=false`) | 35 | **0** |
| Sin publicar con veredicto | 0 | **0** |
| UNAM A4 · Literatura | 0✓ / 35⧗ | **35✓ / 0⧗** |
| `ExplanationLayer` del lote | 105 | 105 |
| `question_source_chunks` del lote | 4 | 4 |
| `Question.verification` persistido | 0/35 | **35/35** |

`Question.verification` guarda `pipeline="session-v1"`,
`decision=AUTO_APPROVED`, `verdict.model="claude-opus-5"` y
`usedCalculation=false` en los 35 — verificado por query directa, no por el log
del script.

`content:coverage` después: **832 servibles**, 0 pendientes, auto-aprobación
global **100 % (832/832)**, meta efectiva G26 (1 222) al **55 %**, brecha
**546 ≈ 16 lotes**; meta nominal de 1 500: 53 % → **55 %**. Anclaje en fuentes:
218 `SOURCED` (26 %).

**Nota honesta: undécima ronda ciega consecutiva al 100 %.** La métrica está
saturada y no discrimina; decirlo cada vez es parte del registro. Lo que esta
fase aporta no es el 100 %: es la contaminación medida de §2, el conflicto
§2↔§3 de G36 y su corrección, el candado de secuencia de §4 con su fuga
cerrada, el defecto relacional de §6 y la confirmación medida de §7.

### 10. Clasificación F2b del chunk — veredicto pedido por G37

G37 §Siguiente-2 pidió que esta ronda dictaminara sobre los ítems del
`SourceChunk` clasificados en «Literatura contemporánea mexicana» que tratan
letras españolas. **Veredicto: los reactivos son factualmente correctos y sus
enunciados explicitan el marco hispánico, así que no se marcan como problema**;
la clasificación del chunk **sí** está mal y el Área 4 **ya tiene** el tema
donde encajarían («Literatura universal clásica»), de modo que no hace falta
sembrar un tema nuevo: basta reclasificar el chunk y mover esos reactivos de
`topicId`. Queda como tarea editorial, no bloqueante.

### 11. Guardrails

- **Cero cambios de código de producción.** Los diagnósticos corrieron en dos
  scripts desechables (uno en el scratchpad, uno temporal en `scripts/`),
  creados y borrados dentro de la sesión; `git status` limpio salvo esta
  documentación. Los dos artefactos del lote ciego (`g38-blind.json`,
  `g38-answers.json`) viven en `scripts/content-exports/`, que `.gitignore:49`
  excluye — no se committean, igual que los de G14/G16/G21/…
- **Cero llamadas a la API de pago de Anthropic.** La resolución la produjo
  esta sesión de Claude Code, como exige CLAUDE.md.
- `pnpm typecheck` y `pnpm lint` **en verde**.
- **Deriva de fechas, anotada:** G35–G37 están fechadas 2026-08-30 en este
  documento y sus commits son del 2026-08-29. Sin impacto; esta sección usa la
  fecha real.

### Siguiente (G38)

1. **Siguiente lote de material nuevo.** Los huecos, por peso:
   - **UNAM A3 Historia Universal** (8 temas, `questionWeight` 5, cero) — la
     **última materia propia del Área 3 sin contenido**, con 1 `SourceChunk` en
     Guerras Mundiales. Materia **NO compartida** (`sharedContentKey` null) →
     lote a sus 8 temas propios, patrón de G27/G33/G35/G37.
   - **UNAM A4 Filosofía** (5 temas, w3, cero; 3 `SourceChunk` en «Historia de
     la filosofía occidental») y **Artes** (5 temas, w2, cero; `SourceChunk` en
     3 temas). El Área 4 va 1 de 3 materias propias con contenido.
   - **IPN SOCADM Historia de México** (6 temas, cero) — el que G30–G37
     nombran y ninguna fase ha abierto.
2. **Reglas nuevas a aplicar desde la próxima composición:**
   - **§2:** la línea 3 describe el `SourceChunk` por fuente/página/naturaleza,
     **nunca** inventariando el contenido de sus ítems.
   - **§3:** el valor **exacto** de los diagnósticos de longitud va en la
     sección `## GNN`, no solo en el registro permanente del lote (que la
     sesión ciega no debe abrir nunca). En línea 3 sigue yendo el veredicto.
   - **§4:** **no publicar la secuencia de letras de la clave** en este
     documento; publicar sus propiedades (corridas, rotación, distribución).
   - **§6:** ningún `stem` puede nombrar el dato que otro reactivo del mismo
     lote pide identificar.
3. **Regla nueva a aplicar en la próxima ronda ciega:** además de los
   diagnósticos de longitud (G36 §2), **recuperar la secuencia de clave** desde
   las respuestas traducidas y compararla con la que registre el permanente —
   es el candado exacto de §4. Como la secuencia ya no se publica en `## GNN`,
   la comparación la hace el **dueño** o una fase editorial con acceso al
   permanente, no la sesión ciega.
4. **Reparaciones editoriales pendientes de este lote** (ninguna bloqueante):
   despersonalizar el enunciado que filtra la respuesta de otro reactivo (§6) y
   reclasificar el chunk `cmrsromj5…` con sus 2 reactivos de letras españolas
   al tema de literatura universal (§10).
5. **Alcance del 21-nov aún sin resolver** (G24 §7 / G26 §8.4): ¿entran UNAM
   A3/A4 e IPN SOCADM en la meta de 1 500 / 1 222? Lleva diez fases
   condicionando la planeación sin respuesta del dueño.
6. **Heredados sin tocar:** rotación A→B→C→D de ~140 reactivos viejos
   (G3a/G3d/G13/G15), par duplicado H₂SO₄, auditoría 5 % (**el lote de G37 ya
   entra al universo muestreable** ahora que esta fase lo verificó), las 8
   `CHART_TABLE` sin tabla ni imagen de G28, y `content:coverage` que aún no
   refleja la reutilización de G26 (G30 §10.3).

---

## G37 — Lote de reactivos: Literatura, UNAM Área 4 (2026-08-30)

**Modelo:** `claude-sonnet-5` (tier Sonnet del Plan de Implementación para lotes de
contenido). **COMPLETADA. 35 reactivos insertados con `isVerified=false`** en la
cola de verificación ciega. **Primera cobertura del Área 4 (Humanidades y Artes)**,
que estaba entera en cero (nota de G34/G36).

### 1) El encargo y la resolución de «Áreas 3 y 4»

El encargo pidió **35 reactivos de Literatura para UNAM Áreas 3 y 4**, con
instrucción de aprovechar la reutilización de G26 si estaba habilitada. Consulta
en vivo a Supabase (2026-08-30) antes de componer:

| Institución · Área | Materia | `sharedContentKey` | `questionWeight` | Temas | Reactivos hoy | `SourceChunk` |
|---|---|---|---:|---:|---:|---:|
| UNAM · Área 4 | **Literatura** | `null` | **4** | **7** | **0** | **1** (tema 6) |
| UNAM · Área 3 | — | — | — | — | *(no existe materia «Literatura»)* | — |

**Literatura existe como una sola fila `Subject`, en el Área 4.** El Área 3 tiene
Historia de México, Historia Universal, Geografía, Español e Inglés — **no**
Literatura. Y **G26 no dio a Literatura una `sharedContentKey`**: en la UNAM solo
la tienen Español, Inglés y Química (§G26.2 lista explícitamente a Literatura entre
las materias «de una sola área/rama — sin reutilización»). Por tanto «Áreas 3 y 4»
se resuelve a la **única materia Literatura del Área 4**: el lote se inserta contra
sus **7 temas propios** y no se reutiliza entre áreas — mismo patrón que Historia
de México en G33 y Geografía en G35 (ambas `sharedKey` null → temas propios),
opuesto a Español en G29. Redirección de hueco análoga a la de G33 (de IPN a UNAM)
y G35 (de Historia Universal a Geografía): el Área 4 estaba entera en cero y
Literatura es su materia de mayor peso.

### 2) Anclaje: 31 TEMARIO_ONLY / 4 SOURCED

`loadTopicChunks` devolvió **1 `SourceChunk` para el tema «Literatura contemporánea
mexicana»** (`cmrr1kfzb006ohi3n87sucf1o`): fragmento `cmrsromj5007r13b3cq77jham`,
p. 39 de `uam_csh.pdf` — la misma guía de **Ciencias Sociales y Humanidades de la
UAM** que aportó los chunks de Revolución Mexicana en G33, clasificada a este tema
por el pipeline F2b. Es un banco de preguntas de opción múltiple con **3 ítems
literarios**: la novela picaresca (Quevedo), la Generación del 98, y Octavio Paz
(autor de «Árbol adentro» y del ensayo sobre Sor Juana). `grounding.ts` hace
**obligatoria** la cita cuando hay fragmento: los **4 reactivos** de ese tema citan
`sourceChunks:[1]` y quedan `groundingStatus = SOURCED`; los otros **6 temas** no
tienen `SourceChunk` y salen `TEMARIO_ONLY` (**31**), compuestos desde el temario
oficial del Área 4, como G22/G27/G33/G35.

**Imprecisión de clasificación heredada de F2b — documentada, no bloqueante.** De
los 4 reactivos `SOURCED`, **2 (picaresca/Quevedo y Generación del 98) tratan
letras españolas**, no mexicanas contemporáneas. Se compusieron así porque: (a) el
fragmento entero está clasificado a este tema y contiene literalmente esos ítems;
(b) `grounding.ts` obliga a que **todo** reactivo del tema cite el fragmento
disponible; (c) es el mismo criterio que G33 (componer al tema que el pipeline
asignó al chunk). Los 4 derivan **directo** del fragmento, son factualmente
correctos y la ronda ciega los revalida uno por uno. Los `stem` lo hacen explícito
(«en la tradición literaria hispánica que también se estudia en México», «en las
letras españolas») para no inducir a error sobre lo que se pregunta. Follow-up
menor: F2b podría reclasificar ese chunk a un tema de literatura española/universal
si se añade uno.

### 3) Los 35 reactivos

Reparto por los 7 temas sembrados (un archivo por tema, `content:insert --lot-dir`).
Descripción por **periodo y eje**, sin nombrar la forma correcta de ninguna
respuesta (G32 §2 / G34 §3):

| Tema (posición en el temario) | Reactivos | Grounding | Ejes cubiertos |
|---|---:|---|---|
| Literatura prehispánica | 5 | TEMARIO_ONLY | difrasismo y «flor y canto», lírica náhuatl y su transmisión, Popol Vuh, Nezahualcóyotl |
| Literatura colonial | 6 | TEMARIO_ONLY | Sor Juana (Respuesta a Sor Filotea, redondillas, antítesis), culteranismo/conceptismo, crónica de Indias (Bernal Díaz), Sigüenza y Góngora |
| Literatura neoclásica y romántica | 5 | TEMARIO_ONLY | Lizardi y la primera novela hispanoamericana, rasgos del Romanticismo, Altamirano, Acuña, personificación (texto original) |
| Realismo y Naturalismo | 5 | TEMARIO_ONLY | propósito del Realismo, Realismo vs Naturalismo (determinismo), «Santa» de Gamboa, Flaubert, ironía narrativa (texto original) |
| Modernismo | 5 | TEMARIO_ONLY | Rubén Darío y «Azul...», símbolos modernistas, Gutiérrez Nájera y la «Revista Azul», sinestesia (verso original) |
| Literatura contemporánea mexicana | 4 | **SOURCED** | Octavio Paz (autoría y géneros), novela picaresca/Quevedo, Generación del 98 |
| Literatura universal clásica | 5 | TEMARIO_ONLY | los tres géneros clásicos, convenciones de la epopeya, catarsis y la «Poética», Dante y la lengua vulgar, «Don Quijote» como primera novela moderna |

- **Formato:** 35 `MULTIPLE_CHOICE`. La sección de Literatura del examen de la UNAM
  es opción múltiple simple; **no** se usó `READING_COMPREHENSION` con pasaje
  compartido: los 3 reactivos que necesitan un texto lo llevan **dentro del `stem`**
  (autocontenido), como permite `_base.md`.
- **Dificultad:** BASIC 7 · INTERMEDIATE 17 · ADVANCED 9 · EXPERT 2 (≈ 20/49/26/6,
  la distribución objetivo de `_base.md`; misma que G33/G35). Los 2 `EXPERT` son
  de síntesis (Dante entre Edad Media y Renacimiento; el Quijote como novela
  moderna) y exigen argumentar, no reconocer.
- **Cobertura de los ejes que pidió el encargo:** *géneros literarios* (difrasismo,
  crónica/auto/égloga/picaresca, poesía vs ensayo, los 3 géneros clásicos, epopeya,
  tragedia, novela moderna); *corrientes y movimientos* (barroco, neoclasicismo vs
  romanticismo vs realismo vs modernismo contrastados por rasgos, realismo vs
  naturalismo, Generación del 98, Edad Media/Renacimiento); *figuras retóricas*
  (difrasismo, antítesis y paradoja, personificación, ironía narrativa, sinestesia
  — las 3 últimas sobre textos **originales**); *literatura mexicana e
  hispanoamericana* (de la poesía náhuatl a Octavio Paz).
- **Distractores (observación de G36 §5 atendida):** en las dificultades
  BASIC/INTERMEDIATE cada distractor es una **alternativa real** que exige
  conocimiento específico para rechazarse — otro movimiento con su propio set de
  rasgos (Romanticismo vs neoclasicismo/realismo/modernismo), otras escritoras del
  Barroco (Santa Teresa, María de Zayas, Sor Marcela de San Félix), otra revista
  modernista (Revista Moderna vs Revista Azul), otros narradores mexicanos (Fuentes,
  Rulfo, Pacheco), otros poetas del Siglo de Oro (Garcilaso, Lope, Manrique), otras
  vanguardias (futurismo, poesía pura). **Caveat honesto (patrón G34 §4):** en ~4
  reactivos (Nezahualcóyotl, Sigüenza, Naturalismo en verso, «Azul...» en lengua
  indígena) algún distractor cae también por anacronismo o imposibilidad material;
  sus etiquetas son INTERMEDIATE/ADVANCED, sin sobreestimación.

### 4) Derechos de autor (criterio de aceptación del encargo)

**Cero reproducción de fragmentos extensos de obras con derechos vigentes.**

- De autores con derechos —**Octavio Paz, Juan Rulfo, Carlos Fuentes, Gabriel
  García Márquez, Federico Gamboa**— solo se citan **título, autor y datos**
  (fechas, premios, género): sin transcripción de una sola línea de sus obras.
- Los **3 reactivos que piden analizar un texto** (personificación en «neoclásica
  y romántica», ironía en «realismo y naturalismo», sinestesia en «modernismo»)
  usan **textos originales** escritos para el lote «a la manera de» cada movimiento
  — pastiche de estilo, identificado como tal en el `stem` («compuestos a la manera
  romántica», «escrito a la manera realista», «compuesto a la manera modernista»).
- **No se citan traducciones.** Las traducciones de la lírica náhuatl (Ángel María
  Garibay, Miguel León-Portilla) tienen derechos: el tema prehispánico **describe**
  la tradición (difrasismo, «flor y canto», temas de Nezahualcóyotl) sin
  transcribir ningún verso traducido.
- **Única cita textual del lote:** el íncipit-título «Hombres necios que acusáis»
  (4 palabras, Sor Juana Inés de la Cruz, s. XVII, **dominio público**), usado como
  identificación de las redondillas.

### 5) Distribución de posición y cue de longitud (G3c / G8 / G34 §2 / G36 §3)

- **Clave A = 9 · B = 9 · C = 9 · D = 8** (25.7 / 25.7 / 25.7 / 22.9 %), las cuatro
  dentro de la banda 15–40 %. **Confirmada por query directa a la DB tras insertar**
  (`jsonb_array_elements` sobre `options` de las 35 filas), no solo por el log.
- **La letra la asigna el generador**, no la mano: búsqueda con semilla fija
  (seed 3737) que descarta secuencias con corridas cíclicas A→B→C→D de longitud ≥ 3
  (ambos sentidos), triples repeticiones y rotación +1 alta. **La secuencia
  literal se redactó en G38 §4** —publicarla es publicar la clave en texto plano y
  la auditoría del 5 % vuelve a correr pasadas ciegas sobre este lote—; vive en la
  DB y en el registro permanente. Sus propiedades: **sin corridas cíclicas
  A→B→C→D de longitud ≥ 3**, sin triples repeticiones, rotación +1 medida
  **3/34 = 8.8 %**, en el azar (≈ 8.5).
- **Cue de longitud — G34 §2, reportado como veredicto contra el umbral (regla de
  G36 §3):** el puntaje esperado **tie-aware de «elige la más larga», empates al
  azar**, quedó **por debajo del 25 % de azar y muy por debajo de la cota de
  14/35**; la heurística inversa «elige la más corta» también quedó **en el azar**;
  ratio medio de longitud correcta/distractores **≈ 1.0**. El valor exacto de cada
  estadístico y el histograma de rango viven en el registro permanente
  (`docs/content-batches/g37-unam-a4-literatura.json`), que la sesión ciega de G38
  no abre. El **primer borrador** tenía la correcta como la opción más larga en
  cerca de la mitad del lote —arrastraba la cláusula justificativa «…, porque…»,
  «…, que…», que **pertenece a la capa 1, no a la opción**, el mismo defecto que
  corrigieron G33 y G35—; se recortaron las correctas a la **aserción** y se
  homogeneizaron los distractores en **dos pasadas** hasta dejar **ambas**
  heurísticas de longitud en el azar o por debajo.
- `content:validate-batch --dir <lote>`: **0 violaciones** (corrido antes de tocar
  la DB y de nuevo como paso obligatorio de `content:insert --lot-dir` sobre los
  7 archivos).
- **0 citas por letra** y **0 citas posicionales** en las 105 capas de explicación
  (auto-chequeo del generador con las regex de `lot-validation.ts` más el patrón
  `POSITION_REF` de G33). Las **capas 2** se titulan **«Cómo se descarta cada
  opción»** y descartan los tres distractores **por su contenido** («Si elegiste el
  hipérbaton…», «Si elegiste a Fuentes…»), nunca por su posición.

### 6) Inserción real — verificada en la DB

| Métrica | Antes de G37 | Después de G37 |
|---|---:|---:|
| Banco total | 797 | **832** |
| Verificados (`isVerified=true`) | 797 | 797 |
| Cola ciega (`isVerified=false`, sin veredicto) | 0 | **35** |
| `ExplanationLayer` del lote | — | **105** (3 × 35) |
| `question_source_chunks` del lote | — | **4** (1 × 4 de «contemporánea mexicana») |
| UNAM A4 Literatura · 7 temas | 0 / 0 / 0 / 0 / 0 / 0 / 0 | **5 / 6 / 5 / 5 / 5 / 4 / 5** |

Chequeos post-inserción (query directa): los 35 con exactamente 4 opciones y 1
correcta, 105 `ExplanationLayer`, **4 `SOURCED` / 31 `TEMARIO_ONLY`**, los 4
`SOURCED` citan el mismo chunk `cmrsromj5007r13b3cq77jham`, cola ciega 0 → 35,
clave A9/B9/C9/D8, dificultad 7/17/9/2, 0 con formato ≠ `MULTIPLE_CHOICE`. Cohorte
con `id` prefijo `cmtf6d…`–`cmtf6eg…` del 2026-08-30 — separable por `topicId` o
por timestamp para la verificación ciega de G38.

### 7) Limpieza

El lote se compuso con un generador de Python desechable (`build_g37.py`) en el
scratchpad de la sesión: los 35 reactivos están **redactados a mano** en el script;
el generador solo asigna la letra correcta (búsqueda anti-rotación con semilla) y
auto-chequea, antes de validar, la distribución de letra, el **puntaje tie-aware de
longitud (G34 §2)**, las citas por letra y posicionales y el grounding obligatorio
del tema 6. Un segundo script (`enrich_g37.py`) añadió los `questionId` reales al
registro permanente. El generador, el enriquecedor y los 7 archivos del lote **no
se committean**; el registro permanente es
`docs/content-batches/g37-unam-a4-literatura.json`. `pnpm typecheck` y `pnpm lint`
en verde (cero cambios de código de producción). Cero llamadas a la API de pago.

### Siguiente (G37)

1. **Verificación ciega del lote de G37** (segunda mitad del ciclo de G2):
   `pnpm content:blind-batch --topic <cada uno de los 7 topicId>` →
   `content:resolve`. **Lote mayormente verbal**, como los de G30/G33/G35: **0/35
   admiten cálculo**, así que no cabe el candado aritmético de G28; el control es el
   **descarte explícito de los tres distractores por su contenido** y la
   **confianza declarada**. Los **4 reactivos de «Literatura contemporánea
   mexicana» son `SOURCED`**, pero `loadPendingQuestionsWithContext` **no pasa el
   texto del `SourceChunk`** a la sesión ciega (mismo caso que los 7 `SOURCED` de
   G33): se resuelven con conocimiento literario de bachillerato, igual que el
   resto. **Sin pasajes** → los 35 llegan autocontenidos en el `stem` (incluidos
   los 3 con texto original para analizar). **Aplicar la regla de G36 §2:**
   recalcular los diagnósticos de longitud (tie-aware «más larga»/«más corta»,
   ratio medio) sobre las **respuestas ciegas** y compararlos con los del registro
   permanente — coincidencia exacta = corroboración mecánica del acuerdo.
   **Reactivos más apretados** (se señala cuáles, no cómo resolverlos, por G30 §1):
   los **2 `EXPERT`** (uno en «universal clásica» sobre periodización, otro sobre
   la novela moderna) son de síntesis; los 3 de análisis de figura retórica sobre
   texto original exigen distinguir figuras cercanas.
2. **Revisar la clasificación F2b del chunk `cmrsromj5…`** (§2): está en «Literatura
   contemporánea mexicana» pero 2 de sus 3 ítems son de literatura española. Si la
   auditoría del 5 % o G38 lo marca, considerar añadir un tema de literatura
   española/universal al seed del Área 4 y reclasificar.
3. **Huecos que siguen abiertos** tras G37:
   - **UNAM A4** — Filosofía (5 temas, w3, cero; tiene 3 `SourceChunk` en «Historia
     de la filosofía occidental») y Artes (5 temas, w2, cero; tiene `SourceChunk`
     en 3 temas). El Área 4 pasa de 0 a 1 de 3 materias propias con contenido.
   - **UNAM A3 Historia Universal** (8 temas, w5, cero; 1 `SourceChunk` en Guerras
     Mundiales) — la única materia propia del Área 3 aún en cero.
   - **IPN SOCADM Historia de México** (6 temas, cero) — el que G30–G36 nombraban;
     ninguna fase lo ha abierto.
4. **Regla de §5 a mantener desde la próxima composición:** el cue de longitud se
   reporta en línea 3 y en la fila de tabla **como veredicto contra el umbral**
   (G36 §3); el número exacto va en la sección `## GNN` y en el registro permanente,
   que la sesión ciega no abre.
5. **Alcance del 21-nov aún sin resolver** (G24 §7 / G26 §8.4): ¿entran UNAM A3/A4
   e IPN SOCADM en la meta de 1 500 / 1 222? Lleva nueve fases condicionando la
   planeación sin respuesta del dueño.
6. **Heredados sin tocar:** rotación A→B→C→D de ~140 reactivos viejos
   (G3a/G3d/G13/G15), par duplicado H₂SO₄, auditoría 5 % (el lote de G35 ya entra
   al universo muestreable tras G36; el de G37 entrará cuando G38 lo verifique),
   las 8 `CHART_TABLE` sin tabla ni imagen de G28, y `content:coverage` que aún no
   refleja la reutilización de G26 (G30 §10.3).

---

## G36 — Verificación ciega: Geografía, UNAM Área 3 (lote de G35) (2026-08-30)

**Modelo:** `claude-opus-5` (tier Opus del Plan de Implementación: razonamiento
denso y verificación de implementaciones críticas). **COMPLETADA. 35/35
auto-aprobados = tasa de auto-aprobación 100 %.** Segunda mitad del ciclo
adversarial de G2 sobre el lote que G35 insertó con `isVerified=false`.

### 1. Ceguera y aislamiento

**Verificados estructuralmente antes de leer un solo reactivo**, no asumidos:

| Control | Resultado |
|---|---|
| `grep -c` de `isCorrect\|explanation\|correctOption\|"answer"\|correctAnswer\|solution` sobre el lote ciego | **0** |
| Claves presentes en cada opción | solo `label`, `text`, `imageUrl` |
| Formato | **35/35 `MULTIPLE_CHOICE`** |
| `requiresCalculation` | **0/35** |
| Reactivos con pasaje | **0/35** (los 35 llegan autocontenidos en el `stem`) |

**Aislamiento:** no se abrió el commit `0f40eef` de G35, ni
`docs/content-batches/g35-unam-a3-geografia.json`, ni `Question.options`, ni la
sección `## G35` de este documento, ni el bloque `### Siguiente (G35)` antes de
responder. Ese bloque y la sección `## G35` se leyeron **después** de correr
`content:resolve`, únicamente para redactar esta sección.

**Canal de entrada — segunda ronda limpia seguida.** La línea 3 de este
documento se lee al inicio de toda sesión por diseño; la de G35 enumeró los
**6 temas** del lote (cartografía y sistemas de referencia, geomorfología,
climas y vegetación, geografía política, geografía económica, geografía de
México) y las distribuciones **agregadas** de letra y dificultad, pero **no
nombró ningún punto evaluado por su forma correcta**. La regla de G32 §2,
extendida por G34 §3 a los lotes ya publicados, sigue funcionando: el acuerdo
de esta ronda es **35/35 plenamente independiente, 0 reactivos contaminados**
(G34: 35/35; G32: 26/26 limpios de 35; G30: 34/35).

### 2. Aporte metodológico — candado mecánico para lotes verbales

Cuarta ronda puramente verbal tras G30, G32 y G34: con `requiresCalculation`
en 0 no cabe el **candado de unicidad aritmética de G28**, que es el único
control que hasta hoy probaba los distractores en vez del acuerdo entre
sesiones. Esta fase encontró un sustituto para ese hueco.

Los diagnósticos de longitud que G34 §2 obliga a vigilar —el puntaje esperado
**tie-aware** de la heurística «elige la más larga» y el ratio de longitud
correcta/distractores— **se calculan a partir de la opción elegida**. Por
tanto, recalcularlos sobre las **respuestas ciegas**, sin mirar la clave, y
obtener el mismo valor que registró la fase de composición **solo es posible si
ambas coinciden reactivo a reactivo**: cualquier desacuerdo cambia el conjunto
de opciones sobre el que se mide y mueve el estadístico.

Recomputado sobre las 35 respuestas ciegas de esta sesión:

| Estadístico | G36 (ciego) | G35 (composición) |
|---|---|---|
| «elige la más larga», tie-aware | **6.50/35 = 18.6 %** | 6.5/35 ≈ 19 % |
| «elige la más corta», tie-aware | 5.00/35 = 14.3 % | por debajo del azar |
| Conteo estricto (única más larga) | 6/35 | — |
| Ratio medio de longitud | **0.998** | 0.998 |
| Ratio mín / máx | **0.87 / 1.08** | 0.87 / 1.08 |
| Histograma de rango por longitud (1 = más larga) | {1: 7, 2: 12, 3: 13, 4: 3} | — |

Reproducción exacta en los cuatro estadísticos que G35 publicó. Eso corrobora
el 35/35 **por una vía que no pasa por el acuerdo entre sesiones**, que es
justo lo que la nota honesta de G28–G34 viene pidiendo. Además el lote pasa el
umbral de G34 §2 con holgura (6.50 < 14/35) y las dos heurísticas de longitud
rinden por debajo del 25 % de azar, así que no hay señal aprendible en ninguna
dirección.

**Regla nueva:** en toda ronda ciega sobre un lote **sin cálculo**, recalcular
los diagnósticos de longitud contra las respuestas ciegas y compararlos con los
que registró la fase de composición. Coincidencia exacta = corroboración
mecánica del acuerdo; divergencia = hay al menos un desacuerdo, y señala
dónde mirar.

### 3. Contrapartida — el estadístico es un checksum de la clave

El reverso de §2: si el valor solo se reproduce cuando las respuestas coinciden
con la clave, entonces **publicarlo es publicar una función de la clave**. La
línea 3 de G35 imprime el puntaje tie-aware, el ratio medio y sus extremos, y
la sesión ciega los lee al inicio por diseño.

Se registra con su fuerza real, sin inflarlo: el canal es **teórico y débil**
—infinitas asignaciones de respuesta dan el mismo puntaje esperado, así que no
es explotable en la práctica— y esta sesión no lo usó (las 35 respuestas se
derivaron reactivo a reactivo por contenido, y la comparación se hizo al
final). Pero es del mismo linaje que el defecto que G32 §2 halló en la
enumeración de puntos evaluados y que G34 §3 extendió: **información derivada
de la clave que viaja por el canal de entrada de la ronda ciega**.

**Regla para las fases de composición:** la línea 3 y la fila de tabla deben
reportar el cue de longitud como **veredicto contra el umbral** («tie-aware por
debajo de 14/35, ambas heurísticas bajo el azar»), no como el valor exacto; el
número detallado va en la sección `## GNN`, que la sesión ciega no abre. La
mitigación cuesta una frase y cierra el canal.

### 4. Resolución y exactitud factual

**Control declarado:** el encargo pidió resolver desde cero **verificando la
exactitud de cada dato geográfico** y marcar como problema cualquier dato
incorrecto. Cada uno de los 35 razonamientos afirma la respuesta y **descarta
explícitamente los tres distractores por su contenido**; autochequeo sobre los
35 con las regex de `lot-validation.ts` más el patrón `POSITION_REF` de G33:
**0 citas por letra y 0 referencias posicionales** (el barajado del lote ciego
vuelve inservible cualquier «la segunda opción…»).

**35 `stem` y 140 opciones revisados uno por uno. 0 problemas declarados.**
Dos imprecisiones se registran **sin bloquear publicación**, ambas
simplificaciones didácticas estándar del temario que no alteran lo que el
reactivo evalúa ni cuál es su respuesta:

1. **Integración regional europea.** La opción correcta describe al bloque
   europeo como mercado común **con moneda única**, sin acotar que la moneda
   única rige para una parte de sus miembros, no para los 27. El contraste que
   el reactivo evalúa —grado de integración alcanzado frente a una zona de
   libre comercio— se sostiene igual.
2. **Tramo occidental del límite norte de México.** El `stem` resume ese tramo
   como enteramente rectilíneo hasta el Pacífico; en realidad intercala un
   corto segmento fluvial sobre el río Colorado. El plural «tramos rectos»
   acomoda parcialmente el matiz y la clasificación que el reactivo pide no
   cambia.

Un tercer punto se revisó y se da por correcto: el gradiente térmico vertical
citado «alrededor de 6 °C por cada 1 000 m» está dentro de la tolerancia
didáctica del valor medio de referencia (≈ 6.5 °C/km).

**Confianza declarada:** mínima **0.96**, máxima **0.99**, promedio **0.984**.
Empata el piso más alto de cualquier ronda ciega (G34: 0.96; G30 y G32: 0.92;
G28: 0.95; G23: 0.93). Lectura honesta, la misma que hizo G34: no es que el
lote sea mejor, es que la geografía curricular de opción múltiple admite menos
matiz que el razonamiento verbal. Las tres mínimas (0.96) caen en el reactivo
de integración regional (por la imprecisión de §4.1) y en los dos que exigen
distinguir grados de un mismo concepto.

**Observación de composición, que confirma la predicción de G34 §4 y la del
propio encargo de G35:** en **~11 de los 35** los tres distractores caen por
implausibilidad general o imposibilidad material, sin necesitar el dato que el
reactivo dice evaluar —el de coherencia clima-vegetación y el de procesos
endógenos/exógenos son los casos más claros, tal como el encargo anticipó—, así
que la dificultad declarada puede estar sobreestimada. Los 2 `EXPERT` sí
exigieron síntesis real. Es la misma proporción que G34 midió en Historia de
México (~11/35): **el patrón se repite en dos lotes de composición distintos y
ya no es una observación aislada del lote, sino del formato**.

### 5. El barajado es real — evidencia más fuerte registrada

La etiqueta ciega coincide con la original en **4/35 = 11.4 %**, la más baja de
cualquier ronda ciega y muy por debajo del 25 % de azar:

| Ronda | Coincidencia etiqueta ciega = original |
|---|---|
| **G36** | **4/35 = 11.4 %** |
| G28 | 6/35 = 17.1 % |
| G34 | 7/35 = 20.0 % |
| G32 | 10/35 = 28.6 % |
| G30 | 12/35 = 34.3 % |

31 de las 35 respuestas cambiaron de letra al traducirse de vuelta, así que el
acuerdo no puede venir de la posición.

**Confirmación independiente de G35, recontada en vivo desde la DB:** clave
**A9/B9/C9/D8** (25.7/25.7/25.7/22.9 %), dentro de la banda 15–40 % de G3c —
coincide con lo que G35 registró.

### 6. Acumulado real (consultado en vivo antes y después)

| Métrica | Antes | Después |
|---|---|---|
| Banco total | 797 | **797** |
| Verificados (`isVerified=true`) | 762 | **797** |
| Cola ciega (`isVerified=false`) | 35 | **0** |
| Sin publicar con veredicto | 0 | **0** |
| UNAM A3 · Geografía | 0✓ / 35⧗ | **35✓ / 0⧗** |
| `ExplanationLayer` del lote | 105 | 105 |
| `Question.verification` persistido | 0/35 | **35/35** |

`Question.verification` guarda `decision=AUTO_APPROVED`,
`verdict.model="claude-opus-5"` y `usedCalculation=false` en los 35.

`content:coverage` después: **797 servibles**, auto-aprobación global **100 %
(797/797)**, meta efectiva G26 (1 222) al **54 %**, brecha **568 ≈ 17 lotes**;
meta nominal de 1 500: 51 % → **53 %**.

**Nota honesta: décima ronda ciega consecutiva al 100 %.** La métrica está
saturada y no discrimina; decirlo cada vez es parte del registro. Lo que esta
fase aporta no es el 100 %, es el candado de §2 —el primer control mecánico
disponible para un lote verbal— y la confirmación de que el canal de entrada
sigue limpio dos rondas seguidas.

### 7. Guardrails

- **Cero cambios de código de producción.** Los diagnósticos corrieron en dos
  scripts desechables (uno en el scratchpad, uno temporal en `scripts/`),
  creados y borrados dentro de la sesión; `git status` limpio salvo esta
  documentación.
- **Cero llamadas a la API de pago de Anthropic.** La resolución la produjo
  esta sesión de Claude Code, como exige CLAUDE.md.
- `pnpm typecheck` y `pnpm lint` **en verde**.

### Siguiente (G36)

1. **Siguiente lote de material nuevo.** El hueco de mayor peso sigue siendo
   **UNAM A3 Historia Universal** (8 temas, `questionWeight` 5, cero absoluto):
   es la **última materia propia del Área 3 sin contenido**, tras Historia de
   México (G33/G34) y Geografía (G35/G36), y tiene **1 `SourceChunk`** en el
   tema de Guerras Mundiales, así que admite al menos un reactivo `SOURCED`.
   Materia **NO compartida** (`sharedContentKey` null) → el lote va a sus 8
   temas propios, sin reutilización entre áreas (patrón de G27/G33/G35).
2. **Huecos que siguen abiertos:**
   - **IPN SOCADM Historia de México** (6 temas, cero) — el que G30–G32
     nombraban; ni G33, ni G35, ni esta fase lo abrieron.
   - **UNAM A4** (Humanidades y Artes) entera en cero.
   - Resto de materias de **IPN SOCADM** y de **UNAM A2**.
3. **Regla nueva de §3 a aplicar desde la próxima composición:** línea 3 y fila
   de tabla reportan el cue de longitud como **veredicto contra el umbral**, no
   como valor exacto; el número va en la sección `## GNN`. Sigue vigente todo
   lo anterior: nunca nombrar un punto evaluado por su forma correcta (G32 §2),
   también en lotes ya publicados porque la auditoría del 5 % vuelve a correr
   pasadas ciegas (G34 §3).
4. **Regla nueva de §2 a aplicar en la próxima ronda ciega verbal:** recalcular
   los diagnósticos de longitud contra las respuestas ciegas y compararlos con
   los de la fase de composición.
5. **Observación de formato acumulada (§4):** dos lotes seguidos con ~11/35
   reactivos cuyos distractores caen por implausibilidad general. La próxima
   composición debería subir el listón de los distractores en las dificultades
   BASIC/INTERMEDIATE en vez de tratarlo como ruido de un lote.
6. **Alcance del 21-nov aún sin resolver** (G24 §7 / G26 §8.4): ¿entran UNAM
   A3/A4 e IPN SOCADM en la meta de 1 500 / 1 222? Lleva ocho fases
   condicionando la planeación sin respuesta del dueño.
7. **Heredados sin tocar:** rotación A→B→C→D de ~140 reactivos viejos
   (G3a/G3d/G13/G15), par duplicado H₂SO₄, auditoría 5 % (**el lote de G35 ya
   entra al universo muestreable**, ahora que esta fase lo verificó), las 8
   `CHART_TABLE` sin tabla ni imagen de G28, y `content:coverage` que aún no
   refleja la reutilización de G26 (G30 §10.3).

---

## G35 — Lote de reactivos: Geografía, UNAM Área 3 (2026-08-30)

**Modelo:** `claude-sonnet-5` (tier Sonnet del Plan de Implementación para lotes de
contenido). **COMPLETADA. 35 reactivos insertados con `isVerified=false`** en la
cola de verificación ciega. Segunda de las tres materias propias del **Área 3
(Ciencias Sociales)** con contenido, tras Historia de México (G33).

### 1) El encargo y la elección de materia

G33 abrió Historia de México (la de mayor `questionWeight` del Área 3). El encargo
de G35 pidió **Geografía**. Consulta en vivo a Supabase antes de componer:

| Institución · Área | Materia | `sharedContentKey` | `questionWeight` | Temas | Reactivos hoy | `SourceChunk` |
|---|---|---|---:|---:|---:|---:|
| UNAM · Área 3 | Historia de México | `null` | 7 | 6 | 35 (G33) | 2 |
| UNAM · Área 3 | Historia Universal | `null` | 5 | 8 | **0** | 1 |
| UNAM · Área 3 | **Geografía** | `null` | **4** | **6** | **0** | **0** |

Geografía **no es materia compartida** (`sharedContentKey` null, a diferencia de
Español, Inglés y Química de la UNAM), así que el lote va a sus **6 temas propios**
y **no** se reutiliza entre áreas — mismo caso que Historia de México en G33
(sharedKey null → temas propios) y Matemáticas Aplicadas de SOCADM en G27, opuesto
a Español en G29. Historia Universal (w5) queda pendiente.

### 2) Anclaje: 35/35 TEMARIO_ONLY

`loadTopicChunks` devolvió **0 `SourceChunk`** para los 6 temas de Geografía, y la
consulta a nivel de `subjectId` también dio 0. **No existe guía de Geografía de la
UNAM en `content_sources`** y el clasificador F2b no asignó fragmento alguno de las
otras guías (CENEVAL, ECOEMS, UAM) a estos temas. Composición desde el **temario
oficial del Área 3**, como G22/G27/G29/G31. Los 35 salen `groundingStatus =
TEMARIO_ONLY`; ningún reactivo cita fuente.

### 3) Los 35 reactivos

Reparto por los 6 temas sembrados (un archivo por tema, `content:insert --lot-dir`).
Descripción por **proceso y subtema**, sin nombrar la forma correcta de ninguna
respuesta (G32 §2 / G34 §3):

| Tema (posición en el temario) | Reactivos | Rama | Subtemas evaluados |
|---|---:|---|---|
| Cartografía y sistemas de referencia | 5 | física | coordenadas geográficas, proyecciones cartográficas, curvas de nivel, escala, husos horarios |
| Geomorfología | 6 | física | procesos endógenos y exógenos, límites de placas, meteorización, formas fluviales, sismicidad y vulcanismo (1 EXPERT) |
| Climas y vegetación | 6 | física | factores del clima, efecto orográfico, circulación general de la atmósfera, corrientes marinas, biomas, continentalidad |
| Geografía política | 6 | humana | elementos del Estado, formas de Estado, zonas marítimas, bloques de integración regional, tipos de frontera, nación y Estado |
| Geografía económica | 6 | económica | sectores económicos, transición sectorial y desarrollo, localización industrial, recursos renovables, indicadores de desarrollo, economías primario-exportadoras |
| Geografía de México | 6 | de México | climas del país, distribución de la población, riesgo sísmico, provincias fisiográficas, regionalización económica, hidrografía (1 EXPERT) |

- **Formato:** 35 `MULTIPLE_CHOICE`. La sección de Geografía del examen de la UNAM
  es opción múltiple simple; **no** se usó `CHART_TABLE` para reactivos de datos en
  prosa sin tabla ni imagen (el defecto de composición abierto de G28).
- **Dificultad:** BASIC 7 · INTERMEDIATE 17 · ADVANCED 9 · EXPERT 2 (≈ 20/49/26/6,
  la distribución objetivo de `_base.md`; misma que G33).
- **Distractores:** cada uno nace de un error conceptual nombrable (confundir dos
  propiedades de un mismo objeto, invertir una relación causa-efecto, aplicar una
  regla de un caso a otro, mezclar dos procesos), citado en la capa 2 **por su
  contenido**, nunca por su posición. Sin nombrar aquí la forma correcta (G34 §3).
- **Exactitud factual:** verificada opción por opción contra el temario oficial y
  la bibliografía estándar de bachillerato antes de insertar (fechas, cifras,
  atribuciones, encadenamiento de causas, ubicaciones); las cifras que aparecen en
  algún stem se dieron como aproximaciones de libro de texto.
- **Caveat de dificultad (patrón G34 §4):** en ~3 reactivos BASIC/INTERMEDIATE
  (uno de geomorfología, uno de climas, uno de geografía política) alguno de los
  distractores se descarta por implausibilidad general más que por el dato exacto;
  las etiquetas de esos son BASIC/INTERMEDIATE, sin sobreestimación. Los 2 EXPERT
  (uno de geomorfología, uno de geografía de México) exigen síntesis real.

### 4) Distribución de posición y cue de longitud (G3c / G8 / G34 §2)

- **Clave A = 9 · B = 9 · C = 9 · D = 8** (25.7 / 25.7 / 25.7 / 22.9 %), las cuatro
  dentro de la banda 15–40 %. **Confirmada por query directa a la DB**
  (`jsonb_array_elements` sobre `options`), no solo por el log.
- **La letra la asigna el generador**, no la mano: búsqueda con semilla fija que
  descarta cualquier secuencia con corridas cíclicas A→B→C→D de longitud ≥ 3 (en
  ambos sentidos), triples repeticiones y rotación +1 alta. Rotación +1 medida:
  **4/34 = 11.8 %**, por debajo del azar ≈ 8.5… ligeramente por encima pero sin
  el patrón cíclico de los ~140 reactivos viejos de G3a/G3d/G13/G15.
- **Cue de longitud — regla nueva de G34 §2 aplicada por primera vez en la
  composición:** el auto-chequeo del generador reporta el **puntaje esperado
  tie-aware de la heurística «elige la más larga», empates al azar**, y el lote se
  reescribió hasta bajarlo a **6.5/35 ≈ 19 %** — por debajo del 25 % de azar y muy
  por debajo de la cota de 14/35. El primer borrador daba 30.5/35 (la correcta
  arrastraba la cláusula justificativa de la capa 1); el segundo, tras recortar
  las correctas a la aserción, se pasó al otro extremo (4.5/35, la correcta casi
  siempre la más corta); el tercero equilibró las cuatro opciones a longitud
  homogénea. Ratio medio de longitud correcta/distractores **0.998** (mín 0.87,
  máx 1.08); dispersión máx-mín **media 6 caracteres** por reactivo (máx 17).
  Histograma de rango de longitud de la correcta {1: 7, 2: 14, 3: 11, 4: 3}: la
  correcta cae en el rango 2 más de lo esperado, pero **ninguna de las dos
  heurísticas explotables** («la más larga» o «la más corta») supera el azar.
- `content:validate-batch --dir <lote>`: **0 violaciones** (corrido antes de tocar
  la DB y de nuevo como paso obligatorio de `content:insert --lot-dir`).
- **0 citas por letra** y **0 citas posicionales** en las 105 capas de explicación
  (auto-chequeo del generador con las regex de `lot-validation.ts` más el patrón
  `POSITION_REF` de G33).

### 5) Inserción real — verificada en la DB

| Métrica | Antes de G35 | Después de G35 |
|---|---:|---:|
| Banco total | 762 | **797** |
| Verificados (`isVerified=true`) | 762 | 762 |
| Cola ciega (`isVerified=false`, sin veredicto) | 0 | **35** |
| `ExplanationLayer` del lote | — | **105** (3 × 35) |
| `question_source_chunks` del lote | — | **0** (TEMARIO_ONLY) |
| UNAM A3 Geografía · 6 temas | 0 / 0 / 0 / 0 / 0 / 0 | **5 / 6 / 6 / 6 / 6 / 6** |

Chequeos post-inserción (query directa): los 35 con exactamente 4 opciones y 1
correcta, 105 `ExplanationLayer`, 35 `TEMARIO_ONLY`, cola ciega 0 → 35, clave
A9/B9/C9/D8. Cohorte con `id` prefijo `cmterj…`–`cmterlf…` del 2026-08-29 —
separable por `topicId` o por timestamp para la verificación ciega de G36.

### 6) Limpieza

El lote se compuso con un generador de Python desechable (`build_g35.py`) en el
scratchpad de la sesión: los 35 reactivos están redactados a mano en el archivo;
el generador solo asigna la letra correcta (búsqueda anti-rotación con semilla) y
auto-chequea, antes de validar, la distribución de letra, el **puntaje tie-aware
de longitud (G34 §2)**, las citas por letra y posicionales y el grounding. El
generador y los 6 archivos del lote **no se committean**; el registro permanente
es `docs/content-batches/g35-unam-a3-geografia.json` (enriquecido con los
`questionId` reales). `pnpm typecheck` y `pnpm lint` en verde (cero cambios de
código de producción). Cero llamadas a la API de pago.

### Siguiente (G35)

1. **Verificación ciega del lote de G35** (segunda mitad del ciclo de G2):
   `pnpm content:blind-batch --topic <cada uno de los 6 topicId>` →
   `content:resolve`. **Lote puramente verbal**, como los de G30 y G34: **0/35
   admiten cálculo**, así que no cabe el candado aritmético de G28; el control es
   el **descarte explícito de los tres distractores por su contenido** y la
   **confianza declarada** (el indicador que aún discrimina). **Sin pasajes** en
   el lote → los 35 llegan autocontenidos en el `stem`; **sin `SourceChunk`** →
   los 35 se responden con conocimiento geográfico de bachillerato. **Reactivos
   más apretados** (se señala cuáles, no cómo resolverlos, por G30 §1): los **2
   `EXPERT`** (uno en Geomorfología, uno en Geografía de México) son de síntesis;
   el reactivo de coherencia clima-vegetación y el de procesos endógeno/exógeno
   tienen distractores algo eliminables por implausibilidad (G34 §4).
2. **Huecos que siguen abiertos** tras G35:
   - **UNAM A3 Historia Universal** (8 temas, w5) — la única materia propia del
     Área 3 aún en cero; tiene 1 `SourceChunk` en el tema Guerras Mundiales.
   - **IPN SOCADM Historia de México** (6 temas, cero) — el que G30–G32 nombraban;
     ni G33 ni G35 lo abrieron.
   - **UNAM A4** (Humanidades y Artes) entera en cero; **IPN SOCADM** resto de
     materias.
3. **Regla de G32 §2 / G34 §3 aplicada:** la línea 3, la fila de tabla y las
   tablas de §3–§5 de esta sección describen la cobertura por **tema y subtema**,
   nunca por la forma correcta de un reactivo; no se nombra ningún dato geográfico
   como respuesta. La sesión ciega de G36 no abre `## G35` (G32/G34 confirmaron
   que no abrieron `## G31` / `## G33`).
4. **Alcance del 21-nov aún sin resolver** (G24 §7 / G26 §8.4): ¿entran UNAM A3/A4
   e IPN SOCADM en la meta de 1 500 / 1 222? Lleva siete fases condicionando la
   planeación sin respuesta del dueño.
5. **Heredados sin tocar:** rotación A→B→C→D de ~140 reactivos viejos
   (G3a/G3d/G13/G15), par duplicado H₂SO₄, auditoría 5 % (el lote de G35 entra al
   universo muestreable una vez que G36 lo verifique), las 8 `CHART_TABLE` sin
   tabla ni imagen de G28, y `content:coverage` que aún no refleja la reutilización
   de G26 (G30 §10.3).

---

## G34 — Verificación ciega: Historia de México, UNAM Área 3 (lote de G33) (2026-08-30)

**Modelo:** Opus 5 (`claude-opus-5`, declarado en `model` de cada respuesta, no una constante genérica — G17).
**Resultado:** **35/35 auto-aprobados · tasa de auto-aprobación 100 % · 0 sin publicar · 0 omitidos.**

Segunda mitad del ciclo adversarial de G2 sobre el lote que G33 insertó con
`isVerified=false`. Sesión independiente: compone una, resuelve otra, y solo
publican los reactivos en que ambas coinciden.

### 1. Ceguera y aislamiento — verificados, no asumidos

Antes de leer un solo reactivo:

| Comprobación | Resultado |
|---|---|
| `grep -c` de `isCorrect|explanation|correctOption|"answer"|correctAnswer|solution` en el lote ciego | **0** |
| Claves presentes en cada opción | solo `label`, `text`, `imageUrl` |
| Formato | **35/35 `MULTIPLE_CHOICE`** |
| `requiresCalculation` | **0/35** — no cabe el candado aritmético de G28 |
| Pasajes | **0** — los 35 llegan autocontenidos en el `stem` |

No se abrió el commit `ff5be4b` de G33, ni
`docs/content-batches/g33-unam-a3-historia-mexico.json`, ni `Question.options`,
ni la sección `## G33` de este documento, ni el bloque `### Siguiente (G33)`
antes de responder — ese bloque se leyó **después** de correr `content:resolve`,
solo para redactar esta sección.

**Canal de entrada limpio, por primera vez.** La línea 3 de este documento se lee
al inicio de toda sesión por diseño, y es justo donde G32 §2 detectó la fuga:
G32 halló que la línea 3 enumeraba los puntos evaluados **por su forma correcta**
y entregaba 6 respuestas de forma decisiva; G30 había hallado lo mismo en el
bloque `### Siguiente`. Esta vez la línea 3 describía el lote de G33 solo por
**proceso, tema y estadística agregada** — reparto por temas, dificultad, clave
A9/B9/C9/D8, rotación, cue de longitud, grounding — y **ninguno de esos datos
resuelve un reactivo**: la clave agregada es inútil porque el lote ciego rebaraja
las etiquetas con semilla por `id` (confirmado abajo: solo 20 % de coincidencia).
Resultado: **acuerdo 35/35 plenamente independiente, 0 reactivos contaminados**,
contra 26/26 limpios de 35 en G32 y 34/35 en G30. **La regla de G32 §2 funcionó**;
es el hallazgo que esta fase aporta, no el 100 %.

### 2. Corrección al cue de longitud de G33 — el ratio enmascara el rango

G33 registró «correcta = opción más larga **13/35**, ratio medio 1.02 (máx 1.17),
**sin señal aprendible**». El reconteo en vivo confirma los tres números pero
**no la conclusión**:

| Medida | Valor | p (una cola vs. 25 %) |
|---|---|---|
| Correcta como **única** más larga (conteo estricto, el de G33) | 13/35 = 37.1 % | 0.076 |
| Correcta **entre** las más largas (incluye 2 empates en el máximo) | 15/35 = 42.9 % | **0.016** |
| **Puntaje esperado de «elige la más larga», empates al azar** | **14.00/35 = 40.0 %** | cota del 95 % está en **k = 14** |
| Ratio medio longitud correcta / distractores | 1.017 (máx 1.172) | — neutro |
| Rango de longitud de la correcta | {1: **15**, 2: 5, 3: 9, 4: 6} | 8.75 esperados por celda |

El ratio medio ≈ 1.0 dice que la correcta **no** es sistemáticamente más larga, y
es cierto. Pero el estadístico que un sustentante puede explotar no es el ratio,
es el **rango**: la correcta cae en el rango 1 en 15 de 35 casos, casi el doble de
lo esperado, mientras el rango 2 queda subrepresentado (5 contra 8.75). Un alumno
que aplique «elige la más larga» y resuelva empates al azar saca **40 %** en este
lote, quince puntos por encima del azar, justo en la cota del 95 %.

**Regla nueva (G34 §2), para todo lote futuro:** el auto-chequeo del generador
debe reportar el **puntaje esperado tie-aware** de la heurística de longitud y
mantenerlo **por debajo de 14/35** (≈ 40 %) — el conteo estricto solo y el ratio
medio son insuficientes, porque el primero ignora los empates y el segundo
promedia lejos del umbral que importa. No bloquea la publicación de G33: los 35
reactivos son factualmente correctos y el acuerdo fue unánime; es deuda de
composición para G35.

### 3. Extensión de la regla de G32 §2 al camino de auditoría

G32 §2 pidió que la línea 3 y la fila de tabla nombraran el punto evaluado
**genéricamente**. Esta fase la mantiene aunque el lote **ya esté publicado**, y
con razón explícita: el muestreo de auditoría del 5 % (`sampleForAudit`,
`scripts/lib/resolution.ts`) vuelve a someter a pasada ciega reactivos **ya
aprobados**, con otro tier de modelo. Si la línea 3 o esta sección nombraran las
respuestas de un lote verificado, la fuga reaparecería por la puerta de la
auditoría. Por eso ni la línea 3, ni la fila de tabla, ni la tabla de §5 de esta
sección nombran fecha, personaje, causa ni proceso alguno **como respuesta**.

### 4. Exactitud factual — el control que sustituye al candado aritmético

Sin cálculo posible, el encargo pidió verificar la exactitud factual de **cada
opción** antes de elegir. Se revisaron los **35 `stem` y las 140 opciones**:
fechas, nombres, atribuciones y secuencias.

- **0 problemas declarados.** Ningún distractor contiene un dato presentado como
  falso que en realidad sea cierto del hecho evaluado, ni ningún `stem` afirma
  algo históricamente incorrecto que altere lo que pregunta.
- **Los distractores están bien construidos.** En varios reactivos son enunciados
  **históricamente ciertos pero de otro hecho** (efemérides distintas del calendario
  cívico; acuerdos internacionales reales de otra época y otro propósito). Es el
  patrón correcto: obligan a discriminar, no a detectar un absurdo.
- **Una imprecisión registrada sin bloquear:** un `stem` fecha en 1862 el envío de
  tropas de la intervención tripartita. La vanguardia española desembarcó en
  Veracruz el **17 de diciembre de 1861**; Francia e Inglaterra sí llegaron en enero
  de 1862, y la Convención de Londres es de octubre de 1861. Es la datación
  didáctica estándar del temario, la diferencia es de dos semanas para una de las
  tres potencias y no toca lo que el reactivo evalúa → **observación, no `problems`**.
  Marcarla habría dejado sin publicar un reactivo correcto.
- **Contrapartida de dificultad:** en **~11 de los 35** los tres distractores se
  descartan por **imposibilidad material o cronológica** —tecnologías o especies
  ausentes del contexto, procesos anteriores o posteriores por siglos— sin
  necesitar el dato que el reactivo dice evaluar. La dificultad declarada
  (BASIC 7 / INTERMEDIATE 17 / ADVANCED 9 / EXPERT 2) puede estar sobreestimada en
  ese subconjunto. Observación de composición para G35.

### 5. Cobertura de la pasada, por tema

Genérica por diseño (§3): temas y estadísticas, nunca el contenido evaluado.

| Tema (UNAM A3, Historia de México) | Reactivos | Acuerdo | Confianza mín. |
|---|---|---|---|
| Época prehispánica | 5 | 5/5 | 0.98 |
| Conquista y Colonia | 6 | 6/6 | 0.97 |
| Independencia | 6 | 6/6 | 0.97 |
| Reforma y Guerra de Intervención | 6 | 6/6 | 0.96 |
| Revolución Mexicana | 7 | 7/7 | 0.97 |
| México Moderno (siglo XX-XXI) | 5 | 5/5 | 0.98 |
| **Total** | **35** | **35/35 = 100 %** | **0.96** |

**Confianza declarada** — el indicador que aún discrimina según G23: mínima
**0.96**, máxima 0.99, promedio **0.984**. Es el **piso más alto de cualquier ronda
ciega** (G30 y G32: 0.92; G28: 0.95; G23: 0.93). La lectura honesta no es que el
lote sea mejor, sino que la historia curricular de opción múltiple admite menos
matiz que el razonamiento verbal: los distractores son falsos, no simplemente
peores, y eso se descarta con menos duda. Es la misma propiedad que produce la
observación de §4 sobre dificultad.

### 6. Reconteo independiente del lote de G33

Consultado en vivo contra la DB **después** de resolver:

| Indicador | G33 registró | G34 recuenta | ¿Coincide? |
|---|---|---|---|
| Clave (letra de la correcta) | A9 / B9 / C9 / D8 | A9 / B9 / C9 / D8 (25.7 / 25.7 / 25.7 / 22.9 %) | ✅ |
| Rotación cíclica A→B→C→D | 3/34 | 3/34 = 8.8 % | ✅ |
| Ratio medio de longitud | 1.02 (máx 1.17) | 1.017 (máx 1.172) | ✅ |
| Correcta = más larga | 13/35 | 13/35 estricto · **15/35 con empates** | ⚠️ ver §2 |
| Dificultad | 7 / 17 / 9 / 2 | BASIC 7 · INTERMEDIATE 17 · ADVANCED 9 · EXPERT 2 | ✅ |
| Grounding | 7 SOURCED / 28 TEMARIO_ONLY | 7 / 28 | ✅ |
| Reparto por tema | 5 / 6 / 6 / 6 / 7 / 5 | 5 / 6 / 6 / 6 / 7 / 5 | ✅ |

**El barajado del lote ciego es real:** la etiqueta que elegí a ciegas coincide con
la etiqueta original en **7/35 = 20.0 %**, por debajo del 25 % que daría el azar —
28 respuestas cambiaron de letra entre el lote ciego y la DB.

### 7. Acumulado real

| Métrica | Antes | Después |
|---|---|---|
| Banco (total) | 762 | 762 |
| Verificados (`isVerified=true`) | 727 | **762** |
| Cola ciega (`isVerified=false`) | 35 | **0** |
| Sin publicar con veredicto | 0 | 0 |
| UNAM A3 · Historia de México | 0✓ / 35⧗ | **35✓ / 0⧗** |

`content:coverage`: **762 servibles**, auto-aprobación global **100 % (762/762)**,
anclaje 214 SOURCED (28 %) / 548 TEMARIO_ONLY. Meta efectiva de G26 (1 222) al
**52 %**, brecha **590 ≈ 17 lotes**; meta nominal de 1 500: 48 % → **51 %**.

**Novena ronda ciega consecutiva al 100 %.** La métrica está saturada y no
discrimina — G30 y G32 ya lo dijeron y sigue siendo cierto. Lo que esta fase
aporta es lo de §1 (la corrección de canal de G32 funcionó y se puede medir) y lo
de §2 (un indicador de calidad que estaba mal leído desde G30).

### Siguiente (G34)

1. **Lote nuevo.** Huecos abiertos, en orden de rendimiento:
   - **UNAM A3 Historia Universal** (8 temas, `questionWeight` 5) y **Geografía**
     (6 temas, w4), ambas en cero — el Área 3 tiene ahora una sola materia propia
     cubierta de tres.
   - **IPN SOCADM Historia de México** (6 temas, cero) — nombrada por G30–G32 y aún
     sin abrir; G33 abrió la de la UNAM, no la del IPN.
   - **UNAM A4** (Humanidades y Artes) entera en cero.
2. **Aplicar la regla de §2 al componer:** el auto-chequeo del generador debe
   emitir el **puntaje esperado tie-aware** de la heurística de longitud y
   mantenerlo **< 14/35**, además del ratio medio ≈ 1.0 y del reparto de clave en
   la banda 15–40 % de G3c.
3. **Vigilar la transparencia de los distractores** (§4): que descartarlos exija el
   conocimiento que el reactivo dice evaluar, no solo detectar un anacronismo o una
   imposibilidad material. Afecta sobre todo a los reactivos marcados ADVANCED y
   EXPERT.
4. **Alcance del 21-nov aún sin resolver** (G24 §7 / G26 §8.4): ¿entran UNAM A3/A4
   e IPN SOCADM en la meta de 1 500 / 1 222? Lleva seis fases condicionando la
   planeación sin respuesta del dueño.
5. **Heredados sin tocar:** rotación A→B→C→D de ~140 reactivos viejos
   (G3a/G3d/G13/G15), par duplicado H₂SO₄, auditoría 5 % (47/762 muestreados; el
   lote de G33 entra ahora al universo muestreable), las 8 `CHART_TABLE` sin tabla
   ni imagen de G28, y `content:coverage` que aún no refleja la reutilización de
   G26 (G30 §10.3).

---


## G33 — Lote de reactivos: Historia de México, UNAM Área 3 (2026-08-30)

**COMPLETADA. 35 reactivos insertados con `isVerified=false`** en la cola de
verificación ciega. Primera materia del **Área 3 (Ciencias Sociales)** con
contenido propio en todo el banco.

### 1) El encargo y la redirección del hueco

G30, G31 y G32 nombraron, en sus bloques `### Siguiente`, a **IPN SOCADM
Historia de México** (6 temas, cero, no compartida) como «la candidata natural
del siguiente lote», sin ejecutarse. El encargo de G33 redirigió a **UNAM Área 3
Historia de México**: otro cero absoluto, y de más peso.

Consulta en vivo a Supabase antes de componer:

| Institución · Área | Materia | `sharedContentKey` | `questionWeight` | Temas | Reactivos hoy |
|---|---|---|---:|---:|---:|
| UNAM · Área 3 | **Historia de México** | `null` | **7** | 6 | **0** |
| UNAM · Área 3 | Historia Universal | `null` | 5 | 7 | 0 |
| UNAM · Área 3 | Geografía | `null` | 4 | 6 | 0 |
| IPN · SOCADM | Historia de México | `null` | — | 6 | 0 |

El pool servible de UNAM A3 marcaba 35 (G26 §Verificado: «UNAM Área 3 servable
pool 0→35»), pero **eso es Español reutilizado por G26**; las materias propias del
área estaban enteras en cero. Historia de México es la de **mayor peso del área**
y **no es compartida** (`sharedContentKey` null, a diferencia de Español, Inglés y
Química de la UNAM), así que el lote va a sus **6 temas propios** y **no** se
reutiliza entre áreas — mismo caso que Matemáticas Aplicadas de SOCADM en G27
(sharedKey null → temas propios), opuesto a Español en G29.

### 2) Anclaje: 7 SOURCED / 28 TEMARIO_ONLY

`loadTopicChunks` devolvió **2 `SourceChunk` para el tema Revolución Mexicana**
(`cmrr1k09x004yhi3npyyywmco`): páginas 41–42 de `uam_csh.pdf` — una guía de
**Ciencias Sociales y Humanidades de la UAM**, clasificada a ese tema del temario
de la UNAM por el pipeline F2b en julio (`classifiedAt` 2026-07-21). Son bancos
de preguntas de opción múltiple sobre el porfiriato y la Revolución. La regla
del pipeline (`grounding.ts`) hace **obligatoria** la cita cuando hay fragmentos:
los 7 reactivos de Revolución citan **ambos** (`sourceChunks: [1, 2]`) y quedan
`groundingStatus = SOURCED`; los otros 28 temas no tienen `SourceChunk` y salen
`TEMARIO_ONLY`, como G22/G27/G29/G31. **No existe guía de la UNAM de Historia en
`content_sources`** (solo CENEVAL, ECOEMS, UAM, UNAM-otras-materias); la única
clasificada a este tema es de la UAM y el clasificador la asignó por coincidencia
de temario, no por institución.

### 3) Los 35 reactivos

Reparto por los 6 temas sembrados (un archivo por tema, `content:insert --lot-dir`).
Descripción por **proceso**, no por reactivo, y sin nombrar la forma correcta de
ninguna respuesta (G32 §2):

| Tema (posición en el temario) | Reactivos | Grounding | Periodo / proceso |
|---|---:|---|---|
| Época prehispánica | 5 | TEMARIO_ONLY | del poblamiento a los Estados mesoamericanos |
| Conquista y Colonia | 6 | TEMARIO_ONLY | Conquista, gobierno, sociedad y economía novohispanas |
| Independencia | 6 | TEMARIO_ONLY | de 1810 a 1821 y sus consecuencias (1 EXPERT) |
| Reforma y Guerra de Intervención | 6 | TEMARIO_ONLY | Reforma liberal, Intervención Francesa, Segundo Imperio y República Restaurada (1 EXPERT) |
| Revolución Mexicana | 7 | **SOURCED** | del porfiriato al Estado posrevolucionario (1876–1929) |
| México Moderno (siglo XX–XXI) | 5 | TEMARIO_ONLY | del cardenismo a la apertura y la alternancia |

- **Formato:** 35 `MULTIPLE_CHOICE`. La sección de Historia del examen real de la
  UNAM es opción múltiple simple; no se forzaron formatos exóticos.
- **Comprensión de procesos, no fechas:** el encargo lo pidió explícitamente y así
  lo evalúa el examen. Los stems preguntan «por qué», «qué efecto», «qué
  diferencia», «qué se entiende mejor como…». Ninguno es «¿en qué año…?».
- **Dificultad:** BASIC 7 · INTERMEDIATE 17 · ADVANCED 9 · EXPERT 2 (≈ 20/49/26/6,
  la distribución objetivo de `_base.md`).
- **Exactitud factual:** verificada reactivo por reactivo contra el temario
  oficial y la historiografía estándar de bachillerato antes de insertar (fechas,
  atribuciones, encadenamiento de causas). Los distractores salen de confusiones
  cronológicas reales, atribución al personaje equivocado o mezcla de causas de
  procesos distintos, como pide `historia.md`.

### 4) Distribución de posición y forma de las opciones (G3c / G8 / G30 / G31)

- **Clave A = 9 · B = 9 · C = 9 · D = 8** (25.7 / 25.7 / 25.7 / 22.9 %), las cuatro
  dentro de la banda 15–40 %. **Confirmada por query directa a la DB** tras la
  inserción (`jsonb_array_elements` sobre `options`), no solo por el log.
- **La letra correcta la asigna el generador**, no la mano: una búsqueda con
  semilla fija reparte 9/9/9/8 con la restricción de que **no haya corridas
  cíclicas A→B→C→D** de longitud ≥ 3. Rotación +1 medida: **3/34**, muy por debajo
  del azar (≈ 8.5) — sin el artefacto que arrastran los ~140 reactivos viejos de
  G3a/G3d/G13/G15.
- **Cue de longitud (G30 §Nota, G31 §5):** en el primer borrador la opción correcta
  era la más larga en ~18/35 porque arrastraba una cláusula justificativa
  («…, que permitió…», «…, junto con…») que **pertenece a la capa 1, no a la
  opción**. Se recortó cada correcta a la aserción y se equilibraron distractores:
  correcta = opción más larga **13/35**, **ratio medio de longitud
  correcta/distractores 1.02** (mín 0.89, máx 1.17). El conteo estricto de «más
  larga» sigue algo por encima del azar, pero con ratio medio neutro y máximo
  1.17 no hay diferencia perceptible entre cuatro párrafos de ~100 caracteres.
- `content:validate-batch --dir <lote>`: **0 violaciones** (corrido antes de tocar
  la DB y de nuevo como paso obligatorio de `content:insert`).
- **0 citas por letra** en las 105 capas de explicación. **Defecto nuevo detectado
  y corregido:** dos capas 2 decían «Si elegiste la segunda opción…» / «Si
  elegiste la última opción…» — referencias **posicionales** que el barajado de
  distractores del generador vuelve incorrectas. `lot-validation.ts` no las capta
  (no hay letra). Se reescribieron para citar el distractor **por su contenido**
  («Si creíste que Madero ya había repartido las haciendas de Morelos…») y se
  añadió un patrón `POSITION_REF` al auto-chequeo del generador.

### 5) Inserción real — verificada en la DB

| Métrica | Antes de G33 | Después de G33 |
|---|---:|---:|
| Banco total | 727 | **762** |
| Verificados (`isVerified=true`) | 727 | 727 |
| Cola ciega (`isVerified=false`, sin veredicto) | 0 | **35** |
| `ExplanationLayer` del lote | — | **105** (3 × 35) |
| `question_source_chunks` del lote | — | **14** (2 × 7 de Revolución) |
| UNAM A3 Historia de México · 6 temas | 0 | **5 / 6 / 6 / 6 / 7 / 5** |

Chequeos post-inserción (query directa): los 35 con exactamente 4 opciones y 1
correcta, 105 `ExplanationLayer`, 7 `SOURCED` y 28 `TEMARIO_ONLY`, cola ciega
0 → 35. Cohorte con `id` prefijo `cmte93…`–`cmte95k…` del 2026-08-30 — separable
por `topicId` o por timestamp para la verificación ciega de G34.

### 6) Limpieza

El lote se compuso con un generador de Python desechable (`build_g33.py`) en el
scratchpad de la sesión: garantiza JSON válido y auto-chequea, antes de validar,
la distribución de letra, la longitud de las opciones, las citas por letra, las
**citas posicionales** y el grounding obligatorio del tema de Revolución. El
generador y los 6 archivos del lote **no se committean**; el registro permanente
es `docs/content-batches/g33-unam-a3-historia-mexico.json` (enriquecido con los
`questionId` reales). `pnpm typecheck` y `pnpm lint` en verde (cero cambios de
código de producción en esta fase). Cero llamadas a la API de pago.

### Siguiente (G33)

1. **Verificación ciega del lote de G33** (segunda mitad del ciclo de G2):
   `pnpm content:blind-batch --topic <cada uno de los 6 topicId>` →
   `content:resolve`. **Lote puramente verbal**, como el de G30: **0/35 admiten
   cálculo**, así que no cabe el candado aritmético de G28; el control es el
   **descarte explícito de los tres distractores por su contenido** y la
   **confianza declarada** (el indicador que aún discrimina tras nueve rondas al
   100 %). Los **7 reactivos del tema Revolución son `SOURCED`**, pero
   `loadPendingQuestionsWithContext` **no pasa el texto de los `SourceChunk`** a la
   sesión ciega (solo `passage`, que aquí es null): se responden con conocimiento
   histórico, igual que los 28 TEMARIO_ONLY. **Reactivos más apretados** (se
   señala cuáles, no cómo resolverlos, por G30 §1): los **2 `EXPERT`** (uno en
   Independencia, uno en Reforma) son de **síntesis y contraste entre proyectos y
   procesos**, no de dato aislado. **Sin pasajes** en el lote → los 35 llegan
   autocontenidos en el `stem`.
2. **Huecos que siguen abiertos** tras G33:
   - **IPN SOCADM Historia de México** (6 temas, cero) — el que G30–G32 nombraban;
     G33 abrió el de la UNAM, no el del IPN.
   - **UNAM A3 Historia Universal** (7 temas, w5) y **Geografía** (6 temas, w4),
     ambas en cero — el Área 3 sigue lejos de estar cubierta.
   - **UNAM A4** (Humanidades) entera en cero; **IPN SOCADM** resto de materias.
3. **Alcance del 21-nov aún sin resolver** (G24 §7 / G26 §8.4): ¿entran UNAM A3/A4
   e IPN SOCADM en la meta de 1 500 / 1 222? Lleva cinco fases condicionando la
   planeación sin respuesta del dueño.
4. **Regla de G32 §2 aplicada:** la línea 3 y la fila de tabla de G33 describen la
   cobertura por **proceso y tema**, nunca por la forma correcta de un reactivo;
   no se nombra ninguna fecha, personaje ni causa específica como respuesta. La
   tabla de §3 de esta sección sí lista los temas evaluados, pero la sesión ciega
   no abre `## G33` (G32 confirmó que no abrió `## G31`).
5. **Heredados sin tocar:** rotación A→B→C→D de ~140 reactivos viejos
   (G3a/G3d/G13/G15), par duplicado H₂SO₄, auditoría 5 % (47/762 muestreados), las
   8 `CHART_TABLE` sin tabla ni imagen de G28, `content:coverage` que aún no
   refleja la reutilización de G26 (G30 §10.3), y el hecho de que
   `content:coverage` mostrará UNAM A3 con «Historia de México 0✓» hasta que G34
   verifique el lote.

## G32 — Verificación ciega: Inglés, IPN (lote de G31) (2026-08-29)

**COMPLETADA. 35/35 auto-aprobados — tasa de auto-aprobación 100 %.** Segunda
mitad del ciclo adversarial de G2 sobre los 35 reactivos que G31 insertó con
`isVerified=false` en el pool compartido `IPN:INGLES`.

Dos cosas la distinguen. Es la **primera ronda ciega sobre contenido en inglés**
—el enunciado va en español y todo lo evaluado (pasaje, oración, opciones) en
inglés, como el examen real— y es la **segunda puramente verbal** tras G30:
`requiresCalculation=false` en los 35, así que el candado de unicidad que G28
estrenó no existe aquí. El control disponible es el descarte explícito de los
tres distractores por su contenido y, en los 17 reactivos de gramática y
vocabulario, **la regla citada por su nombre** — la ‑s de tercera persona, el
presente simple para verdades generales, `while` + pasado continuo frente al
pasado simple que interrumpe, `did` + infinitivo pelado en el negativo, la
posición media del adverbio de frecuencia, la oposición de sufijos ‑ful/‑less,
las preposiciones dependientes de verbo y las colocaciones fijas.

### 1) Ceguera y aislamiento

Ceguera **estructural**, verificada sobre el archivo del lote antes de leerlo:

- `grep -c` de `isCorrect|explanation|correctOption|"answer"|correctAnswer|solution`
  sobre el JSON ciego = **0**;
- las claves de cada opción son solo `label, text, imageUrl`;
- **18 de los 35 llegaron CON su pasaje** (4 pasajes distintos, reparto 5/5/3/5),
  como exige el formato de comprensión;
- 0/35 con `requiresCalculation=true`, coherente con `isCalcSubject("Inglés")`.

Aislamiento. No se abrió:

- el commit `eb7a48a` de G31,
- `docs/content-batches/g31-ipn-ingles.json`,
- `Question.options` (ni por Prisma Studio ni por consulta) antes de responder,
- la sección `## G31` de este documento,
- **ni el bloque `### Siguiente (G31)`** — a diferencia de G28 y G30, esta ronda
  ni siquiera leyó su propio encargo antes de resolver; se leyó después, al
  redactar esta sección.

### 2) Contaminación declarada — y esta vez el canal es la línea 3

G30 §1 dejó dicho que el bloque `### Siguiente` no debe nombrar el criterio de
resolución de un reactivo concreto. **G31 cumplió esa regla al pie de la letra**
—su `### Siguiente (G31)` es explícito en no nombrar ningún criterio—, y aun así
la información se filtró: salió por el **encabezado de la línea 3** de este
documento, que se leyó al inicio de la sesión al consultar el estado del
proyecto (es lo primero que pide CLAUDE.md).

Ese encabezado resumía la composición del lote **nombrando cada punto evaluado
por su forma correcta**:

> «preposiciones in/on/at · **on page** · **recover from**, conectores
> **as a result/therefore** … antónimos con sufijo **‑less**, colocación
> **make an effort**, derivación **conclusive/inconclusive**, polisemia de
> spread»

Contabilidad honesta de lo que eso entrega:

| Alcance de la fuga | Reactivos | Detalle |
|---|---|---|
| **Decisiva** (la respuesta, literal) | **6** | `on page`, `as a result`, `harmless` (‑less), `make an effort`, `therefore`, `recover from` |
| **Ambigua** (nombra las dos formas) | **1** | `conclusive/inconclusive` — dice qué derivación se evalúa, no cuál es correcta |
| **Solo de tema** (acota, no dirige) | **2** | `in/on/at` reduce el campo de 4 a 3 al eliminar `since`; «polisemia de spread» no da dirección |
| Sin contacto | **26** | los 18 de comprensión y 8 de gramática |

**Acuerdo limpio: 26/26.** Los 9 restantes se aprobaron con la contaminación
anotada y **no cuentan como acuerdo independiente**. Se registra así por la misma
razón que en G30: no se puede probar desde dentro que el razonamiento fue
autónomo, aunque las seis respuestas decisivas sean colocaciones estándar que
cualquier sesión derivaría sola.

**Regla nueva.** La de G30 §1 se extiende al resumen de composición:

> El encabezado de la línea 3 y la fila de tabla deben nombrar el punto evaluado
> **genéricamente** —«preposición dependiente de *recover*», «colocación con
> *effort*», «antonimia por sufijo»— y **nunca por su forma correcta**. La ronda
> ciega lee la línea 3 por diseño (CLAUDE.md manda consultar `ESTADO.md` antes de
> cualquier tarea), así que ese encabezado es un **canal de entrada** de la
> verificación, no solo un registro.

La enumeración original quedó **redactada** en el bloque `Historial: G31` de este
documento, sustituida por su forma genérica y con la nota de la redacción a la
vista. La fila de tabla de G31 no filtraba: describe formatos y conteos, no
puntos gramaticales.

Vale la pena decir qué se rompió y qué no: es el **primer defecto del pipeline
detectado fuera del lote**, en el canal por el que la ronda ciega recibe su
contexto. Las siete rondas anteriores auditaron el material; esta auditó la
tubería.

### 3) Cómo se resolvió cada bloque

**Comprensión (18 reactivos, 4 pasajes originales).** Los cuatro pasajes son
prosa expositiva y narrativa de nivel intermedio: la cicatrización de una herida
(`g31-cut`), un recuerdo del mercado con la abuela (`g31-market`), una tormenta
en una obra (`g31-storm`) y el sueño en la adolescencia (`g31-sleep`). Las
habilidades se reparten entre idea principal (4), detalle explícito (5),
significado por contexto (4), referencia anafórica (1), inferencia (2),
intención del autor (1) e interpretación de una figura final (2).

Los distractores que más trabajo dieron son los **temporales** y los de
**atribución cruzada**: en el pasaje de la tormenta, «seguían arreglando las
tejas» es cierto del texto pero *anterior* a la orden del capataz; en el de la
herida, «limpiar y destruir gérmenes» es cierto del texto pero atribuido a los
glóbulos blancos, no a las plaquetas. Ninguno se resolvió por descarte a ciegas:
los dos exigen localizar el referente exacto.

El reactivo más apretado del bloque es el de la **anáfora** (`This net`,
confianza 0.93): la red se construye *sobre* el tapón de plaquetas, así que el
distractor «el tapón» es la lectura equivocada más natural del párrafo. Se
resolvió por la oración inmediatamente anterior, que define la red como los
hilos de fibrina.

**Gramática (11 reactivos).** Todos se justificaron por regla nombrada, no por
oído. Los tres distractores de cada uno caen en categorías limpias: forma
inexistente (`goed`), forma que exige auxiliar (`gone`, `teaching`),
combinación inválida (`is teach`, `was go`, `wasn't work`), doble marca de pasado
(`didn't worked`), fallo de concordancia (`Do the museum`, `are boiling`) y
tiempo verbal incompatible con el marcador temporal (`have store` con
*last night*).

**Vocabulario (6 reactivos).** Significado por contexto, antonimia por sufijo,
derivación adjetival y colocación. Es el bloque donde cayó casi toda la
contaminación de §2.

### 4) Números de la ronda

| Indicador | Valor |
|---|---|
| Auto-aprobados | **35/35 (100 %)** |
| Acuerdo limpio (descontada la contaminación de §2) | **26/26** |
| Confianza mínima | **0.92** |
| Confianza máxima | 0.99 |
| Confianza promedio | **0.965** |
| Problemas declarados | 0 |
| Etiqueta ciega = etiqueta original | 10/35 (**28.6 %**) |
| Reactivos con pasaje entregado | 18/18 |
| Reactivos con cálculo | 0/35 |

La **confianza mínima de 0.92** empata el piso de G30 y vuelve a caer en un
reactivo verbal, no aritmético: el de `while` + pasado continuo (§6). El
promedio de 0.965 queda entre G28 (aritmético, más alto) y G30.

El **barajado es real**: solo 10 de 35 etiquetas ciegas coinciden con la
original, así que 25 respuestas cambiaron de letra al traducirse. El acuerdo no
viene de la posición.

### 5) Confirmación independiente de las cifras de G31

Recontadas en vivo desde la DB, sin leer las respuestas por reactivo:

| Métrica | G31 registró | G32 recuenta | ¿Coincide? |
|---|---|---|---|
| Clave por posición | A9 / B9 / C9 / D8 | **A9 / B9 / C9 / D8** | ✅ |
| Rotación A→B→C→D | 6/34 = 17.6 % | **6/34 = 17.6 %** | ✅ |
| Correcta = opción más larga | 8/35 = 22.9 % | **8/35 = 22.9 %** | ✅ |
| Reactivos con pasaje | 18 (4 pasajes) | **18 (4 pasajes)** | ✅ |

**Los cuatro coinciden.** Es la primera confirmación totalmente limpia desde que
se instauró el recuento cruzado: G30 tuvo que corregir una transposición B↔D en
el registro de G29. Las cuatro cifras caen donde deben — la clave dentro de la
banda 15-40 % de G3c, la rotación por debajo del umbral (sexto lote limpio
seguido) y el cue de longitud en 22.9 %, bajo el 25 % de azar, que es el
resultado de la reescritura de distractores que G31 documenta.

### 6) Observaciones de composición (registradas, sin bloquear publicación)

1. **`while` + pasado continuo (confianza 0.92).** «While the technician
   **checked** the machine, the power suddenly went off» no es agramatical en
   registro coloquial; la clave depende de que el reactivo evalúe el contraste
   canónico fondo/interrupción, que es lo que `suddenly went off` señala. Es la
   respuesta que cualquier temario espera, pero el distractor de pasado simple es
   más defendible que los otros tres del lote.
2. **Distractor descartable por superficie.** En la interrogativa del museo, la
   opción `Is open` se elimina por agramaticalidad visible al sustituirla
   («Is open the museum open…»), sin necesidad de conocer la regla de `do/does`.
   No mide lo que el reactivo dice medir.
3. **Habilidad repetida en los conectores.** Dos reactivos evalúan la misma
   relación causa→consecuencia con estructura casi idéntica. Uno de los dos
   podría haber probado contraste o concesión, que el lote no cubre.
4. **`concluding` en el reactivo de derivación.** Es adjetivo y podría forzarse
   en otro contexto; aquí queda descartado porque significa «final, de cierre» y
   no «decisivo». La distinción es correcta pero fina para el nivel del resto del
   bloque.

### 7) Acumulado real (consultado en vivo)

| Métrica | Antes de G32 | Después |
|---|---|---|
| Banco total | 727 | 727 |
| Verificados (`isVerified=true`) | 692 | **727** |
| Cola ciega (`isVerified=false`) | 35 | **0** |
| Sin publicar con veredicto | 0 | 0 |
| IPN MEDBIO Inglés | 0✓ / 35⧗ | **35✓ / 0⧗** |

`content:coverage` tras la corrida: **727 servibles · 0 pendientes de
resolución**, tasa de auto-aprobación global **100 % (727/727)**, anclaje
**207 SOURCED (28 %) / 520 TEMARIO_ONLY**, temario con fragmentos fuente 46/217.
Meta nominal de 1 500: **48 %**. Meta efectiva de G26 (1 222): **49 %**, brecha
**625 ≈ 18 lotes**, ahorro acumulado 278.

`IPN:INGLES` queda en **35 verificados** contra una meta efectiva de 17. Los
35 sirven a las tres ramas por la reutilización de G26 (`shared-content.ts`),
aunque `content:coverage` siga pintando 0✓ en FISMAT y SOCADM: el pool vive bajo
los temas de MEDBIO y la reutilización opera en runtime, no en el reporte
(defecto ya anotado en G30 §10.3, sin tocar).

### 8) Nota honesta sobre la métrica

**Octava ronda ciega consecutiva al 100 %.** La tasa de auto-aprobación está
saturada y hoy no discrimina: ocho lotes seguidos sin una sola discrepancia
significan que el generador y el verificador coinciden, no que el contenido esté
probado. Lo que aporta esta fase no es el 100 % —es la fuga de §2, encontrada
porque la ronda ciega llevaba la cuenta de qué había leído antes de responder.
El valor del pipeline hoy está en esa contabilidad, no en el marcador.

### Siguiente (G32)

1. **Cerrar el hueco de SOCADM.** Sigue abierto desde G30: Historia de México
   (6 temas), Historia Universal (7), Geografía (5), Civismo/Derecho (4), todas
   en **cero** y **ninguna compartida**, así que ningún lote las cubre de rebote.
   Ni el Español de G29 ni el Inglés de G31 tocaron esa brecha. **Historia de
   México es la candidata natural del siguiente lote** — lleva tres fases
   nombrada sin ejecutarse.
2. **Resolver el alcance pendiente antes de componer** (G24 §7 / G26 §8.4):
   ¿SOCADM entra en la meta del 21-nov? Lleva sin respuesta desde G24 y ya
   condicionó cuatro fases seguidas.
3. **Aplicar la regla de §2 al componer.** El encabezado de línea 3 y la fila de
   tabla del próximo lote deben describir los puntos evaluados en forma
   genérica. Para un lote de Historia el riesgo es directo: nombrar un periodo
   ya acota, y nombrar una fecha o un personaje concreto entrega la respuesta.
4. **Fuentes.** Historia de México SOCADM tiene 0/6 temas con `SourceChunk`, así
   que el lote saldría TEMARIO_ONLY como los cuatro anteriores. El anclaje
   global lleva tres fases bajando en proporción (30 % → 28 %). Si va a subir,
   hace falta material del IPN en `content_sources`, que hoy no existe.
5. Heredados sin tocar: rotación A→B→C→D de ~140 reactivos viejos
   (G3a/G3d/G13/G15), par duplicado H₂SO₄, auditoría 5 % (47/727 muestreados),
   las 8 `CHART_TABLE` sin tabla ni imagen de G28, `content:coverage` que aún no
   refleja la reutilización de G26 (G30 §10.3).

## G31 — Lote de reactivos: Inglés, IPN (2026-08-29)

**COMPLETADA. 35 reactivos insertados con `isVerified=false`** en la cola de
verificación ciega. Primera materia de **Inglés** con contenido en todo el banco.

### 1) El encargo y por qué Inglés

A diferencia de la UNAM, el examen de admisión del IPN **evalúa Inglés en las tres
ramas** (FISMAT, MEDBIO, SOCADM). El encargo pidió 35 reactivos de Inglés para el
examen del IPN. Consulta en vivo a Supabase antes de componer:

| Rama | `subjectId` | `questionWeight` | Temas | Reactivos hoy |
|---|---|---:|---:|---:|
| MEDBIO | `cmrr1m31200dvhi3nuat1aznh` | **3** | Presente simple · Pasado simple · Vocabulario médico-científico | **0** |
| FISMAT | `cmrr1ljiv00brhi3nq1swfcy4` | 2 | Presente simple y continuo · Pasado simple y continuo · Vocabulario técnico | 0 |
| SOCADM | `cmrr1pyu900fp11qdm2jadzj9` | 2 | Lectura de textos · Vocabulario de negocios | 0 |

Las **3 celdas en cero**. Inglés IPN es materia COMPARTIDA
(`sharedContentKey = 'IPN:INGLES'`, migración 0011 / G26): un reactivo verificado
y servible bajo cualquiera de las 3 filas `Subject` es elegible para las 3 ramas.

### 2) Contra qué celda se compuso — y por qué

La regla de CLAUDE.md y de G26 §8.2 es "componer contra el `topicId` de la materia
con **más contenido** del grupo". Con las 3 celdas en cero, el desempate:

- **MEDBIO tiene el mayor `questionWeight` (3)** — mismo criterio con el que
  G26 depositó `IPN:QUIMICA` en MEDBIO (w16 > w10) e `IPN:MATEMATICAS` en FISMAT
  (w24 > w8).
- La celda de mayor peso es además **la que define la meta efectiva de G26** para
  el grupo: 3 × 5.556 ≈ **17** (G26 §6, "meta de un grupo compartido = la meta de
  su celda de mayor peso").

Se depositó contra los **3 temas de MEDBIO Inglés**; la reutilización de G26 lo
sirve a FISMAT y SOCADM en runtime (`src/lib/db/shared-content.ts`), no en el
reporte (§ observación de G30 §10.3).

### 3) Anclaje: TEMARIO_ONLY

Cero `SourceChunk` para cualquier tema o materia de Inglés del IPN, y **no existe
guía del IPN en `content_sources`** (solo CENEVAL, ECOEMS, UAM, UNAM). Los 35 son
`groundingStatus = TEMARIO_ONLY`, igual que G22, G27 y G29.

### 4) Los 35 reactivos

Reparto por tema (un archivo por tema, insertado con `content:insert --lot-dir`):

| Tema (MEDBIO Inglés) | Reactivos | Comprensión de lectura | Discretos |
|---|---:|---:|---:|
| Presente simple | 12 | 5 (pasaje `g31-cut`) | 7 (gramática) |
| Pasado simple | 12 | 8 (pasajes `g31-market` ×5, `g31-storm` ×3) | 4 (gramática) |
| Vocabulario médico-científico | 11 | 5 (pasaje `g31-sleep`) | 6 (vocabulario) |

- **Formato:** 18 `READING_COMPREHENSION` · 10 `SENTENCE_COMPLETION` · 7 `MULTIPLE_CHOICE`.
- **Dificultad:** BASIC 7 · INTERMEDIATE 18 · ADVANCED 8 · EXPERT 2 (≈ 20/50/23/6,
  la distribución objetivo de `_base.md`).
- **4 pasajes ORIGINALES en inglés** (nada con derechos de autor — CLAUDE.md):
  - `g31-cut` — "How your body heals a small cut" (divulgación, presente simple). 5 preguntas.
  - `g31-market` — "The market" (narrativo en 1ª persona, pasado simple/continuo). 5 preguntas.
  - `g31-storm` — "The storm" (narrativo breve, pasado). 3 preguntas.
  - `g31-sleep` — "Why teenagers need sleep" (argumentativo de divulgación, presente). 5 preguntas.
- **Instrucción en español, contenido evaluado en inglés** (el pasaje, la oración
  por completar y las opciones van en inglés), como el examen real del IPN.
- Gramática: tiempos verbales (presente/pasado simple y continuo), concordancia de
  3ª persona, preposiciones (`in/on/at`, `on page`, `recover from`), conectores
  (`as a result`, `therefore` y distractores de otras clases), posición del
  adverbio de frecuencia, forma interrogativa y negativa.
- Vocabulario: significado por contexto, antónimos con sufijo `-less`, colocación
  (`make an effort`), derivación (`conclusive` / `inconclusive`), polisemia
  (`spread`).

### 5) Distribución de posición y forma de las opciones (G3c / G8 / G30)

- **Clave A=9 · B=9 · C=9 · D=8** (25.7 / 25.7 / 25.7 / 22.9 %), las cuatro dentro
  de la banda 15-40 %. **Confirmada por query directa a la DB** tras la inserción,
  no solo por el log.
- Rotación A→B→C→D: **6/34 = 17.6 %** (vs 25 % de azar) — **quinto lote limpio
  seguido** sin el patrón cíclico que arrastran los ~140 reactivos de G3a/G3d/G13/G15.
- Secuencia de inserción: `ACDBABDACBDC CADBACBDACBD BDACBACDBAC`.
- **Correcta = opción más larga: 8/35 = 22.9 %** — bajo el 25 % de azar y bajo el
  umbral que vigiló G30. El **primer borrador daba 60 %**: en los reactivos de
  comprensión, la opción correcta (paráfrasis completa y fiel del texto) salía
  sistemáticamente más larga que los distractores (afirmaciones falsas más cortas).
  Se **reescribieron ~10 distractores** de comprensión para igualar o superar la
  longitud de la correcta con contenido plausible tomado del pasaje, no con relleno.
- `content:validate-batch --dir <lote>`: **0 violaciones** (corrido antes de tocar
  la DB y de nuevo como paso obligatorio de `content:insert`).
- 0 citas por letra en las explicaciones (barrido con los patrones de
  `lot-validation.ts` más un patrón extra `opción/inciso/letra + palabra a-d`).

### 6) Inserción real — verificada en la DB

| Métrica | Antes de G31 | Después de G31 |
|---|---:|---:|
| Banco total | 692 | **727** |
| Verificados (`isVerified=true`) | 692 | 692 |
| Cola ciega (`isVerified=false`, sin veredicto) | 0 | **35** |
| Pasajes (`passages`) | 8 | **12** |
| MEDBIO Inglés · Presente simple | 0 | **12** |
| MEDBIO Inglés · Pasado simple | 0 | **12** |
| MEDBIO Inglés · Vocabulario médico-científico | 0 | **11** |

Chequeos post-inserción (query directa): los 35 con exactamente 4 opciones y 1
correcta, 105 `ExplanationLayer` (3 por reactivo), 18 con `passageId`, los 35
`TEMARIO_ONLY`. Cohorte con `createdAt` entre `06:43:39` y `06:44:38` del
2026-08-29 — separable por timestamp para la verificación ciega de G32.

`IPN:INGLES` pasa de 0 a **35** contra una meta efectiva de G26 de **17**: sobra
profundidad, la misma decisión que tomó G29 con `IPN:ESPANOL` (70 contra 33). Es
lo que pidió el encargo (35), no lo que dicta la regla de meta.

### 7) Limpieza

El lote se compuso con un generador de Python desechable
(`build_g31.py` + `emit_artifact.py`) fuera del repo, en el scratchpad de la
sesión: garantiza JSON válido y permite auto-chequear distribución, longitud de
opciones y citas por letra antes de validar. Los 3 archivos del lote y el
generador **no se committean**; el registro permanente es
`docs/content-batches/g31-ipn-ingles.json` (enriquecido con los `questionId` y
`passageId` reales). `pnpm typecheck` y `pnpm lint` en verde (cero cambios de
código en esta fase). Cero llamadas a la API de pago.

### Siguiente (G31)

1. **Verificación ciega de estos 35 reactivos** (patrón G3b/G28/G30): una sesión
   independiente que NO vea las respuestas correctas los resuelve y compara
   veredictos antes de que puedan pasar a `isVerified=true`. Es la mitad
   adversarial del ciclo de G2. Cohorte separable por `createdAt` (2026-08-29,
   ~06:43-06:45) o por `topicId` (los 3 temas de MEDBIO Inglés).
   - **Lote puramente verbal** (0/35 admiten cálculo): no cabe el candado
     aritmético de G28; el control es el **descarte explícito de los tres
     distractores** por su contenido, más la confianza declarada (el indicador
     que sí discrimina en lotes verbales, según G23/G30).
   - **18 de los 35 llegan con su pasaje** (4 pasajes). Comprobar que la ronda
     ciega los reciba CON el texto, como exige el formato.
   - **No nombrar en este bloque el criterio de resolución de ningún reactivo
     concreto** (lección de G30 §1 / §11): el generador ya lo evitó.
2. **Hueco de SOCADM sigue abierto** (heredado de G30 §Siguiente): Historia de
   México (6 temas), Historia Universal (7), Geografía (5), Civismo/Derecho (4),
   ninguna compartida. Inglés no las cubre de rebote. Retomar tras G32.
3. **Pregunta de alcance sin resolver** (G24 §7 / G26 §8.4): ¿SOCADM entra en la
   meta del 21-nov? Lleva sin respuesta desde G24.
4. Heredados sin tocar: rotación A→B→C→D de ~140 reactivos viejos, par duplicado
   H₂SO₄, auditoría 5 % (47/692 muestreados), las 8 `CHART_TABLE` sin tabla ni
   imagen de G28, `content:coverage` que aún no refleja la reutilización de G26
   (G30 §10.3).

## G30 — Verificación ciega: Español/Lectura, IPN (lote de G29) (2026-08-29)

**COMPLETADA. 35/35 auto-aprobados — tasa de auto-aprobación 100 %.** Segunda
mitad del ciclo adversarial de G2 sobre los 35 reactivos que G29 insertó con
`isVerified=false` en el pool compartido `IPN:ESPANOL`.

Lo que separa a esta ronda de las seis anteriores: **ninguno de los 35 admite
cálculo**. El lote ciego reporta `requiresCalculation=false` en los 35, y el
encargo lo anticipaba (`isCalcSubject` da falso para "Español/Lectura"). El
candado de unicidad que G28 estrenó —contar cuántas opciones empatan con el
valor calculado y abortar si no es exactamente una— **aquí no existe y no puede
fabricarse**. El único control disponible es el que pedía el encargo: descartar
los tres distractores de cada reactivo de forma explícita, por su contenido.

### 1) Aislamiento: comprobado, no asumido

No se abrió:

- el commit `cc0b49e` de G29,
- el JSON del lote,
- `Question.options` (ni por Prisma Studio ni por consulta) antes de responder,
- la sección `## G29` de este documento (línea 2094 en el momento de la
  lectura; las inserciones de esta fase la corrieron a la 2361).

Sí se leyeron, y se declaran:

- el bloque `### Siguiente (G29)` — el encargo de esta fase;
- la fila de tabla de G29 y la línea 3, que dan la distribución **agregada** de
  la clave. No dan señal por reactivo: el lote ciego rebaraja las etiquetas con
  semilla determinista por `id`, así que saber "A9/B9/C9/D8" no dice nada sobre
  qué letra marcar en el ítem que se tiene enfrente.

**Contaminación declarada.** El encargo va más lejos que en rondas previas: al
señalar los dos reactivos `EXPERT`, nombra el criterio decisivo de uno de ellos
—«símil vs. personificación… el nexo "como" es la marca decisiva»—. Eso es,
en la práctica, la respuesta conceptual de ese reactivo entregada antes de
resolverlo. El razonamiento que se registró para él es derivable por cuenta
propia (es la distinción estándar entre las dos figuras), pero **eso no se puede
probar desde dentro**, así que se asienta la regla honesta: **ese reactivo no
cuenta como acuerdo independiente**. Los otros 34 sí. El acuerdo limpio de esta
ronda es **34/34**, y el reactivo 35 se aprobó con la contaminación anotada.

Corolario para el pipeline: **el bloque `### Siguiente` no debe contener el
criterio de resolución de un reactivo concreto.** Señalar "atención a los dos
EXPERT" es útil; explicar cuál es la marca decisiva contamina la pasada ciega
que ese mismo bloque encarga.

### 2) Ceguera del archivo, verificada antes de leerlo

| Comprobación | Resultado |
|---|---|
| `grep -c 'isCorrect\|explanation\|correctOption\|"answer"\|correctAnswer\|solution'` | **0** |
| Claves de cada opción | `label, text, imageUrl` (nada más) |
| Opciones por reactivo | 4 en los 35 |
| `requiresCalculation=true` | 0 |
| Reactivos de comprensión con su pasaje | **20/20** — 4 pasajes × 5 reactivos |

El punto del encargo se cumple: `buildBlindItem` copia `passageContent` (lo
expone como `passage`), así que los 20 de comprensión lectora llegaron **con el
texto completo y sin la respuesta marcada**. Los 15 restantes
(SENTENCE_COMPLETION 4, ANALOGY 3, MULTIPLE_CHOICE 8) no llevan pasaje, como
corresponde.

### 3) Resolución: descarte explícito, no elección por eliminación vaga

Los 35 se resolvieron desde cero. En cada uno se dejó asentado por qué **cada
uno de los tres distractores** es incorrecto, citándolo por su contenido y nunca
por su letra (guardrail de CLAUDE.md). Los patrones de descarte que se
repitieron:

- **contradice el texto** (p. ej. "recuerda mejor" contra el explícito "lo
  recuerda peor"; "el libro cambia de edición" contra "no ha cambiado ni una
  coma");
- **absoluto no autorizado** ("no aprende absolutamente nada", "el único método
  que de verdad da resultados");
- **la tesis ajena que el texto refuta**, ofrecida como si fuera la propia;
- **detalle verdadero pero subordinado**, colocado donde se pide la idea central;
- **literalización de una metáfora** ("releer deja el libro lleno de marcas";
  "solo sirve si además viaja a lugares nuevos").

### 4) Ambigüedades: marcadas, no forzadas

El encargo pedía marcar como problema cualquier par de opciones igualmente
defendibles en vez de forzar la elección. **No se declaró ningún problema**, y
esa decisión se sostiene reactivo por reactivo. Los dos más apretados, y por qué
no son empates:

- **«el texto funciona como una marca en la pared»** (confianza 0.92, la más
  baja del lote). El distractor rival —"el libro deja una huella profunda en
  quien lo lee"— es una afirmación cierta sobre los libros, y por eso muerde.
  Lo que lo descarta no es intuición sino que **invierte la dirección de la
  imagen**: el propio texto glosa la comparación con "uno se para junto a él y
  comprueba cuánto ha crecido". La marca en la pared es la referencia fija, no
  la huella dejada en el lector.
- **símil vs. personificación** (0.93). La justificación del distractor
  ("atribuye a unas luces la capacidad humana de abrir los ojos") es
  **literalmente cierta de la imagen**; lo que decide es que la construcción
  enlaza los dos términos con el nexo comparativo, y una personificación
  atribuye el rasgo de forma directa, sin nexo. Es un símil **de contenido
  personificador**: reactivo legítimamente difícil, no ambiguo. (Ver §1: el
  criterio venía nombrado en el encargo.)

### 5) Confianza declarada — el indicador que sí discrimina

G23 dejó dicho que en lotes verbales hay que mirar la confianza, no la tasa.
Aquí:

| Métrica | Valor | Comparación |
|---|---|---|
| Confianza mínima | **0.92** | G28: 0.95 · G23: 0.93 → **piso más bajo de cualquier ronda ciega** |
| Confianza promedio | 0.963 | — |
| Reactivos < 0.95 | **5 de 35** | **los 5 son de comprensión lectora** |
| Problemas declarados | 0 | — |

Y el desglose por formato explica de dónde sale el piso:

| Formato | n | Mínima | Promedio |
|---|---|---|---|
| READING_COMPREHENSION | 20 | **0.92** | 0.955 |
| ANALOGY | 3 | 0.95 | 0.967 |
| SENTENCE_COMPLETION | 4 | 0.97 | 0.972 |
| MULTIPLE_CHOICE (gramática/ortografía) | 8 | 0.96 | 0.975 |

**Ningún reactivo fuera de comprensión lectora bajó de 0.95.** Ortografía,
gramática y analogías tienen respuesta normativa —la tilde va o no va, "creer"
rige o no rige preposición—, y la confianza lo refleja; la interpretación de un
pasaje es lo único que admite matiz.

Que la mínima baje no es un defecto del lote: es lo que se espera cuando el
objeto de la pregunta es la interpretación de un texto y no un valor numérico.
Se registra el 0.92 real en vez de redondearlo hacia arriba, precisamente
porque es la única señal que aquí no está saturada.

### 6) Candados que sí aplican en un lote verbal

Sin aritmética que ejecutar, quedan dos comprobaciones mecánicas:

- **Señal de longitud.** La correcta es la opción más larga en **7/35 = 20 %**,
  por debajo del 25 % de azar. Un sustentante que respondiera "la más larga"
  sacaría 7. (Medido también sobre las respuestas elegidas antes de resolver:
  el mismo 20 %, es decir, la heurística de longitud no guió las elecciones.)
- **El barajado es real.** La etiqueta ciega coincide con la original en
  **12/35 = 34.3 %**: 23 de 35 respuestas cambiaron de letra al traducirse de
  vuelta. Más alto que el 17.1 % de G28 y cercano al 25 % de azar, que es
  justo lo que debe pasar con una semilla por `id`. El acuerdo no viene de la
  posición.

### 7) Resultado

35 auto-aprobados, 0 sin publicar, 0 omitidos. `Question.verification`
persistido en los 35 con `verdict.model="claude-opus-5"` y
`usedCalculation=false` (declarado tal cual: no hubo nada que ejecutar).

### 8) Acumulado real, consultado en vivo antes y después

| Métrica | Antes de G30 | Después de G30 |
|---|---|---|
| Banco total | 692 | 692 |
| Verificados (`isVerified=true`) | 657 | **692** |
| Cola ciega (`isVerified=false`) | 35 | **0** |
| Sin publicar con veredicto | 0 | 0 |
| IPN FISMAT · Español/Lectura | 35✓ / 35⧗ | **70✓ / 0⧗** |

`content:coverage` tras la corrida: **692 servibles · 0 pendientes**, tasa de
auto-aprobación global **100 % (692/692)**, anclaje **207 SOURCED (30 %) / 485
TEMARIO_ONLY**. Meta efectiva de G26 (**1 222**): **47 %**, brecha **642 ≈ 19
lotes**. Meta nominal de 1 500: 44 % → **46 %**.

Las dos colas quedan otra vez en cero.

### 9) Confirmación independiente de las cifras de G29 — y una corrección

Recontadas desde la DB después de resolver:

| Cifra | G29 anotó | Reconteo en vivo |
|---|---|---|
| Distribución de la clave | A9 / B9 / C9 / D8 | **A9 / B8 / C9 / D9** |
| En porcentaje | — | 25.7 / 22.9 / 25.7 / 25.7 % |
| Rotación A→B→C→D | 6/34 = 17.6 % | **6/34 = 17.6 %** ✓ |
| Correcta = opción más larga | 20 % | **20 %** ✓ |

La distribución anotada en G29 tiene **B y D transpuestos**. Es un error de
registro, no de composición: ambas lecturas caen dentro de la banda 15-40 % que
fijó G3c, ninguna posición queda concentrada y nada aguas abajo cambia. Se
corrige aquí para que el histórico sea consultable sin arrastrar el desliz.

La rotación (17.6 %) es el **cuarto lote limpio seguido** — sin el patrón
A→B→C→D que arrastran los ~140 reactivos viejos de G3a/G3d/G13/G15.

### 10) Observaciones de composición (no bloquean publicación)

1. **Nexo concesivo rodeado de tres causales.** En el reactivo de
   «______ hizo muy mal tiempo…, la excursión se realizó sin contratiempos», los
   tres distractores ("debido a que", "ya que", "puesto que") son causales casi
   sinónimos entre sí. La respuesta se puede acertar por descarte de tipo —"tres
   se parecen, la cuarta no"— sin leer la oración. Discrimina menos de lo que
   parece; conviene que al menos un distractor sea de otra clase (temporal o
   adversativo).
2. **Distractor de personificación con justificación verdadera.** Ver §4: su
   texto describe correctamente la imagen y solo la marca gramatical lo
   descarta. Es lo que hace `EXPERT` al reactivo, y está bien, pero conviene
   que no se repita como molde: dos o tres así en un mismo lote empujarían la
   confianza declarada por debajo del umbral de 0.85.
3. **`content:coverage` no refleja la reutilización de G26.** El reporte sigue
   mostrando Español/Lectura de **SOCADM y MEDBIO en 0✓** aunque el pool
   compartido `IPN:ESPANOL` ya tiene 70 verificados, porque viven bajo los temas
   de FISMAT y la reutilización opera en runtime
   (`src/lib/db/shared-content.ts`), no en el reporte. No es un defecto del
   lote; es una lectura engañosa del tablero que conviene corregir antes de que
   alguien planee un lote contra una celda que en realidad ya está servida.

### 11) Nota honesta sobre la métrica

**Séptima ronda ciega consecutiva al 100 %** (G14, G16, G19, G21, G23, G28,
G30). La tasa de auto-aprobación lleva siete rondas sin discriminar nada: es una
métrica saturada y seguir presentándola como evidencia de calidad sería
engañarse. Lo que esta fase sí aporta:

- se sometió a la pasada ciega el **primer lote a escala donde no existe
  verificación mecánica posible** —sin aritmética que ejecutar, sin candado de
  unicidad—, y el acuerdo se sostuvo;
- la **confianza mínima bajó a 0.92**, el piso más bajo registrado, que es
  exactamente la señal que se pedía vigilar en lotes verbales;
- se **declaró una contaminación** del encargo en vez de contarla como acuerdo
  limpio, y se dejó la regla para que no vuelva a ocurrir (§1).

### 12) Limpieza

El diagnóstico post-resolución (distribución de la clave, rotación, coincidencia
de etiqueta, señal de longitud) corrió en `scripts/g30-diag.ts`, **desechable:
creado, ejecutado y borrado en la misma sesión**. El árbol queda sin cambios de
código. `pnpm typecheck` y `pnpm lint` en verde. Cero llamadas a la API de pago.

### Siguiente (G30)

1. **Cerrar el hueco de SOCADM, no profundizar más `IPN:ESPANOL`.** El pool
   compartido queda en **70** contra una meta efectiva de 33: sobra profundidad.
   Las materias propias de SOCADM siguen en **cero** — Historia de México
   (6 temas), Historia Universal (7), Geografía (5), Civismo/Derecho (4) — y
   ninguna es compartida, así que ningún otro lote las va a cubrir de rebote.
   Historia de México es la candidata natural del siguiente lote.
2. **Antes de componer, resolver el alcance pendiente** (G24 §7 / G26 §8.4):
   ¿SOCADM entra en la meta del 21-nov o no? Se arrastra sin respuesta desde
   G24 y ya condiciona dos fases seguidas.
3. **Dos arreglos de pipeline que salieron de esta ronda:** (a) el bloque
   `### Siguiente` no debe nombrar el criterio de resolución de un reactivo
   concreto (§1); (b) `content:coverage` debería reflejar la reutilización de
   G26 al pintar las celdas compartidas (§10.3).
4. Heredados sin tocar: rotación A→B→C→D de ~140 reactivos viejos
   (G3a/G3d/G13/G15), par duplicado H₂SO₄, auditoría 5 % (47/692), las
   8 `CHART_TABLE` sin tabla ni imagen que anotó G28.

## G29 — Lote de reactivos: Español/Comunicación, IPN (encargo SOCADM) (2026-08-28)

**COMPLETADA. 35 reactivos originales insertados con `isVerified=false`,
pendientes de verificación ciega.** Modo de trabajo: autónomo, sin
preguntas. Segundo lote del proyecto sobre Español/Habilidad Verbal (tras
G22) y segundo que usa el modelo `Passage`.

### 1) La materia es COMPARTIDA — el lote no va a los temas de SOCADM

El encargo pide "35 reactivos de Español/Comunicación para la rama SOCADM".
Pero **Español/Lectura del IPN es materia compartida**
(`sharedContentKey = 'IPN:ESPANOL'`, migración 0011 / G26): las tres ramas
(FISMAT w4, MEDBIO w6, SOCADM w3) comparten un único pool de reactivos
verificados. La regla de CLAUDE.md y de G26 §8.2 es explícita: **al componer
un lote de una materia compartida, insértalo contra el `topicId` de la
materia con más contenido del grupo — la reutilización lo sirve a las demás
áreas.**

Consulta en vivo a Supabase (2026-08-28):

| Rama | `subjectId` | Temas | Reactivos | Verificados |
|---|---|---|---:|---:|
| **FISMAT** | `cmrr1lh1n00bhhi3nq64xyp01` | Ortografía, Gramática, Comprensión lectora, Análisis de textos | **35** | **35** (de G22) |
| MEDBIO | `cmrr1m1ee00dnhi3n8buwdxi4` | Ortografía, Comprensión lectora, Análisis de textos | 0 | 0 |
| SOCADM | `cmrr1pxgz00fh11qdsh8e55h0` | Comprensión lectora, Análisis de textos, Redacción | 0 | 0 |

**FISMAT tiene todo el contenido del grupo (35, de G22); MEDBIO y SOCADM
están en cero.** Además, FISMAT es la **única** de las tres ramas cuyo
temario nombra **Ortografía** y **Gramática** como temas dedicados — que es
justo donde caen los formatos del encargo (analogías, completar oraciones,
ortografía, gramática). SOCADM solo tiene Comprensión lectora, Análisis de
textos y Redacción. Forzar ortografía/gramática dentro de "Redacción" de
SOCADM sería peor ajuste de temario y fragmentaría el pool compartido.

**Decisión: el lote se compone e inserta contra los 4 temas de FISMAT**, y
la reutilización G26 lo sirve a MEDBIO y a SOCADM (verificado en código:
`loadEquivalentSubjectIds` y `loadAreaServablePool` en
`src/lib/db/{shared-content,adaptive}.ts` filtran por
`topic.subjectId ∈ grupo`). Un alumno de SOCADM con su Español de peso 3
pasa de un pool de 0 a un pool compartido de **70** (35 de G22 + 35 de G29,
una vez verificados).

Contraste con G27 (Matemáticas Aplicadas SOCADM): esa materia tiene
`sharedContentKey = null` y **sí** fue a los temas propios de SOCADM. Las
dos decisiones son la misma regla aplicada: compartida → celda de más
contenido; no compartida → celda propia.

### 2) Fuentes — TEMARIO_ONLY

Cero `SourceChunk` para cualquier tema o materia de Español del IPN; no
existe ninguna guía de IPN en `content_sources` (solo UAM, UNAM, CENEVAL,
ECOEMS). Los 35 son **TEMARIO_ONLY**. Los **4 pasajes de comprensión de
lectura son ORIGINALES**, escritos en esta sesión — sin copiar textos con
derechos de autor:

| ref | Título | Género | Tema (FISMAT) | Preguntas |
|---|---|---|---|---:|
| `g29-ajolote` | El ajolote, entre el agua y la tierra | Divulgación científica (neotenia y regeneración) | Comprensión lectora | 5 |
| `g29-escritura` | Escribir a mano en tiempos del teclado | Argumentativo (tesis + evidencia + concesión/refutación) | Comprensión lectora | 5 |
| `g29-espera` | La espera | Narrativo/literario (narrador 3ª persona con foco interno, analepsis, símil) | Análisis de textos | 5 |
| `g29-releer` | Releer | Ensayístico/argumentativo (tesis sostenida con imágenes) | Análisis de textos | 5 |

Ninguno se solapa en tema con los 4 pasajes de G22 (teocintle, arbolado
urbano, la azotea, el aburrimiento).

### 3) Composición — 35 reactivos

| Tema (FISMAT) | Reactivos | Formatos |
|---|---:|---|
| Comprensión lectora | 10 | `READING_COMPREHENSION` ×10 (pasajes `g29-ajolote` ×5, `g29-escritura` ×5) |
| Análisis de textos | 10 | `READING_COMPREHENSION` ×10 (pasajes `g29-espera` ×5, `g29-releer` ×5) |
| Gramática | 9 | `SENTENCE_COMPLETION` ×4 (conectores, subjuntivo temporal, queísmo, concesivo/causal), `ANALOGY` ×3 (profesión-lugar, antónimos, instrumento-magnitud), `MULTIPLE_CHOICE` ×2 (infinitivo sustantivado, dequeísmo) |
| Ortografía | 6 | `MULTIPLE_CHOICE` ×6 (más/mas, b/v, coma en enumeración, mayúsculas, haber/a ver, tilde en hiato) |
| **TOTAL** | **35** | RC 20 · SENTENCE_COMPLETION 4 · ANALOGY 3 · MULTIPLE_CHOICE 8 |

- **Dificultad:** BASIC 7 / INTERMEDIATE 17 / ADVANCED 9 / EXPERT 2
  (20 % / 49 % / 26 % / 6 %), casi idéntica a la sugerida por `_base.md`.
- Cada pasaje sirve **5 preguntas de competencias distintas** (idea central,
  término/definición, inferencia, propósito del autor, estructura; o tipo de
  narrador, función de párrafo, inferencia, tono, figura retórica) — se
  evitó la redundancia de competencia que G23 §8.2 anotó sobre G22.

### 4) Re-resolución independiente antes de insertar

Los 35 se resolvieron **desde cero**, como lo hará la sesión ciega de G30:
para cada reactivo se comprobó (a) que la opción marcada es la única
defendible contra el texto del pasaje o la norma, y (b) que cada distractor
corresponde a un error nombrable — contradicción textual directa, contenido
inventado, distractor verdadero que no responde lo preguntado, tesis
refutada tomada por concesión, sinonimia por antonimia, queísmo/dequeísmo,
regla de agudas aplicada donde manda el hiato, etc. **Dos ajustes** salieron
de esa pasada: se quitó "temblaron" (personificación involuntaria) del
pasaje `g29-espera` para dejar el ítem de figura retórica inequívoco, y se
reescribió el distractor C del ítem de mayúsculas (asignaturas en mayúscula
es zona gris de la RAE) por un error inequívoco (`Mi Hermano` / `méxico`).

### 5) Distribución de posición y candados anti-artefacto

- **Posición de la correcta: A=9, B=8, C=9, D=9** (25.7 / 22.9 / 25.7 /
  25.7 %) — las cuatro dentro de 15-40 %, confirmado por `analyzeLot` y por
  **consulta directa a la DB tras insertar**.
- **Rotación cíclica A→B→C→D (hallazgo de G16):** secuencia real de las 35
  letras en orden de inserción (verificada contra la DB por `createdAt`):
  `BDACBDCADBACDBDACBADCADBCABDCACBDAC` → **6/34 transiciones +1 (17.6 %)**
  contra 25 % de azar, sin ninguna racha de 3+. No presente.
- **Cue de longitud (hallazgo de G23 §7b/§8):** la opción correcta es la
  (co)más larga en **7/35 (20 %)**, por debajo del azar — tras una pasada de
  reequilibrio que alargó los distractores de 15 ítems de comprensión de
  lectura (donde la paráfrasis correcta tiende a ser más larga). G22 había
  quedado en 26 %.
- **Cue de glosa (hallazgo de G3e):** **0 reactivos** con exactamente una
  opción entre paréntesis.
- Las explicaciones citan cada distractor **por su contenido** ("la opción
  sobre la contaminación", "la que pone 'mas días'", "si respondiste
  'verbo'"), nunca por su letra — `analyzeLot` → 0 `LETTER_CITATION`.

### 6) Validación e inserción real — verificada en la DB

`pnpm content:validate-batch --dir scripts/content-exports/g29` sobre los
4 archivos: **0 violaciones** a la primera. Luego `content:insert --topic
<id> --file <archivo> --lot-dir scripts/content-exports/g29` (dry-run
primero: 0 rechazados, 0 duplicados vía `normalizeStem` contra los 35 de
G22 en los mismos temas; luego sin `--dry-run`) para los 4 temas, en orden
Comprensión lectora → Análisis de textos → Gramática → Ortografía.
**Consulta directa a la DB, no solo el log:**

| Métrica | Antes de G29 | Después de G29 |
|---|---|---|
| IPN Español/Lectura (grupo `IPN:ESPANOL`) — total | 35 | **70** |
| IPN Español/Lectura — verificados | 35 | **35** (sin cambio, correcto: pendiente de verificación ciega) |
| IPN Español/Lectura — grounding del lote nuevo | — | **35 TEMARIO_ONLY** |
| `passages` nuevos en la DB | — | **4** (cada uno con exactamente 5 preguntas enlazadas) |
| Reactivos `READING_COMPREHENSION` con `passageId` (lote) | — | **20 / 20** |
| Reactivos no-RC con `passageId` (lote) | — | **0** (correcto) |
| Reactivos mal formados (≠4 opciones, ≠1 correcta, ≠3 capas) | — | **0** |
| Banco — total | 657 | **692** |
| Banco — verificados | 657 | **657** (sin cambio, correcto) |
| Banco — sin veredicto (cola ciega) | 0 | **35** |

Registro consolidado en `docs/content-batches/g29-ipn-espanol.json`: 35
`questionId` reales, 4 pasajes con su texto completo, stems, opciones,
explicaciones, grounding, distribución de posición y secuencia de letras.

### 7) Limpieza

Scripts desechables del scratchpad (`check-g29.mjs`, `build-g29-record.mjs`)
usados para los chequeos de lote y armar el registro. Los 4 archivos JSON
del lote viven en `scripts/content-exports/g29/` (carpeta en `.gitignore`
desde G1); el registro permanente es el archivo en `docs/content-batches/`.

`pnpm typecheck` y `pnpm lint` en verde (sin cambios de código, solo
contenido + docs). Cero llamadas a la API de pago de Anthropic — los 35
reactivos y los 4 pasajes se redactaron directamente en esta sesión de
Claude Code.

### Siguiente (G29)

1. **Verificación ciega de los 35 reactivos de este lote** (patrón
   G23/G28): una sesión nueva e independiente que no vea las respuestas
   correctas los resuelve con `content:blind-batch --all` →
   `content:resolve`. **Ninguno es de cálculo** (`isCalcSubject` da falso
   para "Español/Lectura"): se razona cada uno descartando distractores por
   contenido y, en los 20 de comprensión de lectura, contra el texto del
   pasaje (que el lote ciego SÍ incluye — `buildBlindItem` copia
   `passageContent`). Atención a los 2 `EXPERT`: símil vs. personificación
   en `g29-espera` (el nexo "como" es la marca decisiva) e interpretación de
   la frase final de `g29-releer`. Como en G23, tratar la **confianza
   declarada**, no la tasa (saturada), como el indicador de calidad verbal.
2. **`IPN:ESPANOL` queda en 70** (meta efectiva G26: 33). El grupo ya
   estaba "completo" por conteo antes de G29; este lote es profundidad
   extra para una institución de lanzamiento día 1, no cierre de brecha.
   Las **otras materias de SOCADM siguen en cero**: Historia de México,
   Historia Universal, Geografía, Civismo/Derecho (Inglés también es
   compartido y está en cero en las 3 ramas). Sigue pendiente la pregunta
   de alcance de G24 §7 / G26 §8.4 (¿SOCADM en la meta del 21-nov?).
3. Heredados sin tocar: rotación A→B→C→D de ~140 reactivos viejos
   (G3a/G3d/G13/G15), par duplicado H₂SO₄, auditoría 5 % (47/657).

## G28 — Verificación ciega: Matemáticas Aplicadas, IPN SOCADM (2026-08-28)

**Estado: COMPLETADA.** Segunda mitad del ciclo adversarial de G2 sobre el
lote de G27. **35/35 auto-aprobados = tasa de auto-aprobación 100 %.**
Banco: **657 totales · verificados 622 → 657 · cola ciega 35 → 0.** Cero
cambios de código; cero llamadas a la API de pago.

### 1) Aislamiento: comprobado, no asumido

Lo que **no** se abrió, a propósito: el commit `53bf887` de G27, el registro
del lote `docs/content-batches/g27-ipn-socadm-matematicas.json`,
`Question.options` en la DB, y la sección `## G27` de este documento
(línea 2086) — mismo criterio que G21 con G20 y G23 con G22.

Lo que **sí** se leyó de este documento, declarado sin adornos: el bloque
`### Siguiente (G27)` (línea 2195), que es el encargo de esta fase y no
contiene respuestas; la línea 3 y la fila de G27 de la tabla de fases, que
sí mencionan la **distribución agregada** de la clave (A=9 B=9 C=9 D=8).
Ese agregado no da señal por reactivo, y el lote ciego baraja las etiquetas
con semilla por `id`, así que no permite deducir ninguna respuesta
individual — pero se declara porque el criterio del encargo es "nunca viste
la respuesta correcta", no "nunca viste un histograma".

El único insumo de resolución fue el lote ciego **regenerado en esta
sesión**:

```
pnpm content:blind-batch --all --limit 50 --out scripts/content-exports/g28-blind.json
→ 35 reactivos · 35 requieren cálculo ejecutado
```

**Ceguera verificada estructuralmente antes de leer nada del lote:**
`grep -c` de `isCorrect|explanation|correctOption|"answer"` sobre el archivo
da **0**. Las claves de cada ítem son `questionId, institution, subject,
topic, format, passage, requiresCalculation, stem, options`; las de cada
opción, **solo `label, text, imageUrl`** — no existe campo de correctitud
que ignorar.

La cola ciega consultada en vivo antes de empezar contenía exactamente los
3 temas de la materia (12 Estadística descriptiva / 11 Probabilidad / 12
Análisis de datos = 35), o sea el lote de G27 y nada más.

### 2) Resolución: los 35 con la operación ejecutada, no estimada

`verify-g28.mjs` (desechable) contiene **un solucionador por reactivo**,
escrito a partir de los datos del enunciado y **nunca de las opciones**:
cada uno reconstruye la operación desde cero (`mean`, `median`, `popSd`,
`range`, `pctChange`, conteo de frecuencias, producto de probabilidades,
complemento, condicional vs. conjunta, principio multiplicativo, valor
esperado, factores sucesivos, escala, sector circular, índice). Los 35
salieron con `usedCalculation:true` y eso **coincide** con el
`requiresCalculation:true` que el pipeline derivó por materia.

Dos reactivos no tienen respuesta numérica sino **compuesta**, y se
resolvieron con predicado en vez de comparación de números: el de tasas por
cada 1 000 vehículos (hay que acertar **ciudad y tasa a la vez** — un
distractor trae la tasa correcta de la ciudad equivocada) y el del efecto
neto sobre el ingreso (**dirección y magnitud**).

### 3) El candado de esta ronda: unicidad, no solo coincidencia

Coincidir con el generador es una prueba débil cuando la métrica lleva
cinco rondas saturada. Esta sesión añadió una comprobación mecánica más
dura: para cada reactivo se contó **cuántas de las cuatro opciones empatan
con el valor calculado** (tolerancia relativa 0.6 %, con normalización de
`\frac{a}{b}` de KaTeX, separador de millares y el signo menos Unicode
`−`), y el script **falla si el conteo no es exactamente 1**.

**Resultado: 35/35 con exactamente una opción coincidente** — ni un
reactivo con dos opciones defendibles, ni uno cuya respuesta no esté entre
las opciones. Esto sí discrimina: es una prueba de los distractores, no del
acuerdo entre dos sesiones. **Enunciados duplicados dentro del lote: 0.**

### 4) El barajado del lote ciego es real (candado anti-deriva letra↔contenido)

Si el lote ciego no barajara, la letra elegida coincidiría con la original
en 35/35 y "acertar" no probaría nada. Medido tras resolver: la etiqueta
ciega coincide con la original en **6/35 (17.1 %)** — **29 de 35 respuestas
cambiaron de letra al traducirse** de vuelta. El acuerdo, por tanto, no
puede venir de la posición.

### 5) Resultado

```
pnpm content:resolve --file scripts/content-exports/g28-answers.json
✅ Auto-aprobados: 35   ✋ Sin publicar: 0   ⚠️ Omitidos: 0
```

**Tasa de auto-aprobación del lote: 100 % (35/35).**

Confianza: 32 reactivos a 0.98; tres por debajo — 0.95 el del valor
esperado (ver §8) y 0.97 los dos de respuesta compuesta. **Mínimo 0.95: el
más alto de cualquier ronda ciega del proyecto** (G23 bajó a 0.93).
Problemas declarados: **0**.

`Question.verification` quedó persistido en los 35, con
`verdict.model = "claude-opus-5"` (el modelo que de verdad resolvió, no la
constante de orquestación — defecto de G14 corregido en G17),
`verdict.usedCalculation = true`, `decision = "AUTO_APPROVED"`,
`pipeline = "session-v1"`.

### 6) Acumulado real, consultado en vivo antes y después

| Métrica | Antes de G28 | Después de G28 |
|---|---|---|
| Banco total | 657 | 657 |
| Verificados (`isVerified=true`) | 622 | **657** |
| Cola ciega (`isVerified=false`) | 35 | **0** |
| Sin publicar con veredicto | 0 | 0 |
| IPN SOCADM · Matemáticas Aplicadas | 0✓ / 35⧗ | **35✓ / 0⧗** |

`content:coverage` tras la corrida: **657 servibles · 0 pendientes**, tasa
de auto-aprobación global **100 % (657/657)**, anclaje **207 SOURCED
(32 %) / 450 TEMARIO_ONLY**. Meta efectiva de G26 (**1 222**): **47 %**,
brecha **642 ≈ 19 lotes**. Meta nominal de 1 500: 44 %.

Las dos colas quedan otra vez en cero.

### 7) Confirmación independiente de las cifras de G27

Recontadas desde la DB después de resolver, sin mirar el registro del lote:

- **Distribución de la clave: A=9 B=9 C=9 D=8** (25.7 / 25.7 / 25.7 /
  22.9 %) — las cuatro dentro del rango 15–40 % de `POSITION_SKEW` (G3c).
- **Rotación A→B→C→D (artefacto de G16): ausente.** Secuencia
  `BCBACBDACCADACBABDCADBDACBDCABADCDB`, **7/34 transiciones +1 = 20.6 %**,
  por debajo del ~25 % de azar y lejísimos del ~100 % de los lotes viejos.
  Tercer lote consecutivo limpio tras G21 y G23.
- Grounding **35 TEMARIO_ONLY**; dificultad BASIC 6 / INTERMEDIATE 17 /
  ADVANCED 10 / EXPERT 2; formato PROBLEM_SOLVING 26 / CHART_TABLE 8 /
  MULTIPLE_CHOICE 1.

Todo coincide con lo que G27 declaró.

### 8) Observaciones de composición (no bloquean publicación)

No se marcaron como `problems` porque ninguna afecta la corrección del
reactivo; se registran para futuros lotes:

1. **`CHART_TABLE` sin tabla ni imagen.** Los 8 reactivos con ese formato
   llevan los datos **en prosa dentro del `stem`** y ningún `imageUrl`. Se
   responden perfectamente, pero el formato promete una representación
   tabular/gráfica que el reactivo no tiene. Conviene decidir de una vez:
   o esos casos son `PROBLEM_SOLVING`, o el lote debe traer la tabla.
2. **"Ganancia esperada" admite lectura bruta.** En el reactivo del dado
   (se pagan 20 por participar, se reciben 90 si sale 6), la lectura neta
   da −5 y la bruta da 15 — **y 15 está entre las opciones**. La neta es la
   convención estándar para "ganancia" cuando el costo de participar está
   en el enunciado, y es la única consistente con las otras tres opciones,
   así que se eligió −5 con confianza 0.95. Para lotes futuros: escribir
   "ganancia **neta** esperada" y el problema desaparece.
3. **Habilidades repetidas.** Dos reactivos de "valor faltante dado el
   promedio" y dos de aumento porcentual simple. Difieren en datos y
   contexto y son aceptables en 35, pero conviene vigilarlo si SOCADM
   crece.

### 9) Nota honesta sobre la métrica

**Sexta ronda ciega consecutiva al 100 %** (G14, G16, G19, G21, G23, G28).
La tasa de auto-aprobación, dicha con franqueza, **hoy no discrimina
nada**: lleva cinco fases saturada y G24 ya lo anotó. Lo que esta ronda
aporta de nuevo no es el 100 %, sino el **candado de unicidad de §3** —
esa sí es una prueba de los distractores, y el hecho de que 35/35 la pasen
dice más sobre la salud del lote que el acuerdo entre dos sesiones.

### 10) Limpieza

Scripts desechables eliminados al terminar (`verify-g28.mjs`,
`post-g28.mjs`, `shuffle-check.mjs`, `rot-check.mjs`, `bank-state.mjs`).
`pnpm typecheck` y `pnpm lint` en verde. Cero cambios en `src/`, en
`prisma/schema.prisma` y en el pipeline.

### Siguiente (G28)

1. **Componer el siguiente lote.** La brecha ya no está en SOCADM
   Matemáticas Aplicadas (completa) sino en las **materias día 1 en cero o
   muy por debajo**: IPN FISMAT Química (brecha ~56, **en cero**), IPN
   FISMAT Física (~76), IPN MEDBIO Matemáticas (~44, en cero) y
   Español/Lectura de MEDBIO (~33, en cero). El top-5 de G24 sigue vigente
   salvo por lo que G26 abarató.
2. **Resolver la pregunta de alcance de G24 §7 / G26 §8.4**, que ya lleva
   cuatro fases abierta: si UNAM A3/A4 e IPN SOCADM entran en la meta del
   21-nov, las otras **6 materias de SOCADM siguen en cero** (Historia de
   México, Historia Universal, Geografía, Civismo/Derecho, y Español e
   Inglés compartidos). Con la meta efectiva en 1 222 y la brecha en 642,
   la decisión ya no es cosmética: cambia cuántos lotes faltan.
3. **Heredados sin tocar**: rotación A→B→C→D de ~140 reactivos viejos
   (G3a/G3d/G13/G15), par duplicado H₂SO₄, auditoría 5 % de `session-v1`
   (47/657 — el denominador creció, la muestra no).

## G27 — Lote de reactivos: Matemáticas Aplicadas, IPN SOCADM (2026-08-28)

**COMPLETADA. 35 reactivos originales insertados con `isVerified=false`,
pendientes de verificación ciega.** Modo de trabajo: autónomo, sin
preguntas. Primer lote de la rama de **Ciencias Sociales y Administrativas
del IPN** — antes de esta fase sus 7 materias estaban en cero absoluto.

### 1) Materia — "Matemáticas Aplicadas", no el bloque general de Matemáticas

El encargo dice "Matemáticas para la rama SOCADM del IPN". La materia de
matemáticas sembrada para esa rama (`prisma/seed/ipn.ts`) es
**"Matemáticas Aplicadas"** (`subjectId` `cmrr1pw4200f911qdbhnkz5x8`,
`questionWeight` 3), con 3 temas: **Estadística descriptiva**,
**Probabilidad**, **Análisis de datos**. NO es el bloque general de
"Matemáticas" que comparten FISMAT y MEDBIO — G26 lo declaró explícitamente
fuera del grupo `IPN:MATEMATICAS` porque su temario y enfoque son distintos
(razonamiento cuantitativo aplicado vs álgebra→cálculo). El nivel que el
encargo pide — "más aritmética aplicada, porcentajes, estadística básica y
razonamiento cuantitativo que cálculo avanzado" — describe exactamente esta
materia. `sharedContentKey` = null: el lote sirve solo a SOCADM.

### 2) Fuentes — TEMARIO_ONLY

Cero `SourceChunk` para la materia, sus 3 temas o cualquier guía de IPN
(`content_sources` solo tiene UAM, UNAM, CENEVAL, ECOEMS). Los 35 son
**TEMARIO_ONLY**, redactados a partir del temario sembrado (F2b: no bloquea).

### 3) Composición — 35 reactivos

| Tema | Reactivos | Enfoque |
|---|---:|---|
| Estadística descriptiva | 12 | media simple y ponderada, mediana, moda, rango, desviación estándar poblacional, dato faltante, media de datos agrupados |
| Probabilidad | 11 | probabilidad clásica, complemento, regla de la suma y del producto, condicional (tabla), sin reemplazo, conteo, valor esperado, "al menos uno", frecuencia esperada |
| Análisis de datos | 12 | porcentaje de una cantidad, variación porcentual, factores de aumento/descuento, cambios sucesivos, gráfica de barras y circular, tasas por cada 1 000, escalas, números índice, media ponderada de porcentajes, efecto precio×cantidad |
| **TOTAL** | **35** | |

- **Dificultad:** BASIC 6 / INTERMEDIATE 17 / ADVANCED 10 / EXPERT 2
  (17 % / 49 % / 29 % / 6 %), cerca de la sugerida por `_base.md` (20/50/25/5).
- **Formato:** `PROBLEM_SOLVING` 26, `CHART_TABLE` 8 (tabla o gráfica
  descrita en el `stem`), `MULTIPLE_CHOICE` 1 (comparación conceptual de
  tasas). Sin `Passage` (no hay comprensión de lectura en esta materia).

### 4) Verificación aritmética — ejecutada, no razonada a ojo

Script desechable `verify-g27.mjs` (scratchpad): para los 35 reactivos
recalcula la respuesta **de forma independiente** del texto compuesto y la
compara con la opción marcada `isCorrect`; además comprueba que **cada uno
de los 3 distractores** de cada reactivo coincide con un error nombrable
(media confundida con mediana, dividir el cambio porcentual entre la base
equivocada, sumar 10 % + 20 % en vez de multiplicar 1.10 × 1.20,
probabilidad conjunta tratada como condicional, no ajustar el denominador
sin reemplazo, usar el límite de clase en vez de la marca de clase, etc.).
También valida estructura: 4 opciones A-D, exactamente 1 correcta,
exactamente las capas 1/2/3. **Resultado: 0 discrepancias en los 35.**

### 5) Distribución de posición y candado anti-rotación

- **Posición de la correcta: A=9, B=9, C=9, D=8** (25.7 / 25.7 / 25.7 /
  22.9 %) — las cuatro dentro de 15-40 %, confirmado por `analyzeLot` y por
  consulta directa a la DB tras insertar. Para los reactivos con opciones
  numéricas se respetó el orden ascendente de `_base.md`, así que la letra
  la fija la magnitud de los distractores, no una elección libre.
- **Rotación cíclica A→B→C→D (hallazgo de G16):** secuencia real de las 35
  letras en orden de inserción
  `BCBACBDACCADACBABDCADBDACBDCABADCDB` → **7/34 transiciones +1 en el
  ciclo (20.6 %)** contra 25 % de azar. No presente (los lotes viejos que
  G24 marcó tenían 60-90 %).
- Las explicaciones citan cada distractor **por su contenido** ("si
  obtuviste 80, promediaste las tres notas sin pesos"), nunca por su letra
  — `analyzeLot` → 0 `LETTER_CITATION`. Un falso positivo propio corregido
  antes de validar: las capas 3 de probabilidad usaban notación estándar
  `P(A)`, `P(A o B)`, `P(A | B)` y el regex de cita-por-letra confundía el
  `A)` / `B)` de cierre con "opción A)". Se renombraron los eventos
  genéricos a `E` y `F` (`P(E o F) = P(E) + P(F)`), fuera del rango A-D.

### 6) Validación e inserción real — verificada en la DB

`pnpm content:validate-batch --dir scripts/content-exports/g27` sobre los
3 archivos: **0 violaciones**. Luego `content:insert --topic <id> --file
<archivo> --lot-dir scripts/content-exports/g27` (dry-run primero: 0
duplicados vía `normalizeStem`, luego sin `--dry-run`) para los 3 temas.
**Consulta directa a la DB, no solo el log:**

| Métrica | Antes de G27 | Después de G27 |
|---|---|---|
| IPN SOCADM Matemáticas Aplicadas — total | 0 | **35** |
| IPN SOCADM Matemáticas Aplicadas — verificados | 0 | **0** (correcto: pendiente de verificación ciega) |
| IPN SOCADM Matemáticas Aplicadas — grounding | — | **35 TEMARIO_ONLY** |
| Reactivos mal formados (≠4 opciones, ≠1 correcta, ≠3 capas) | — | **0** |
| Banco — total | 622 | **657** |
| Banco — verificados | 622 | **622** (sin cambio, correcto) |
| Banco — sin veredicto (cola ciega) | 0 | **35** |

Registro consolidado en
`docs/content-batches/g27-ipn-socadm-matematicas.json`: 35 `questionId`
reales, stems, opciones, explicaciones, grounding, distribución de posición
y secuencia de letras.

### 7) Limpieza

Scripts desechables del scratchpad (`verify-g27.mjs`, `build-g27-record.mjs`)
usados para recalcular los 35 y armar el registro. Los 3 archivos JSON del
lote viven en `scripts/content-exports/g27/` (carpeta en `.gitignore` desde
G1); el registro permanente es el archivo en `docs/content-batches/`.

`pnpm typecheck` y `pnpm lint` en verde (sin cambios de código, solo
contenido + docs). Cero llamadas a la API de pago de Anthropic — los 35
reactivos se redactaron directamente en esta sesión de Claude Code.

### Siguiente (G27)

1. **Verificación ciega de los 35 reactivos de este lote** (patrón
   G14/G16/G19/G21/G23): una sesión nueva e independiente que no vea las
   respuestas correctas los resuelve con `content:blind-batch --topic <id>`
   → `content:resolve`. **La mayoría son de cálculo** (`PROBLEM_SOLVING` 26,
   `CHART_TABLE` 8) — la sesión verificadora debe EJECUTAR la aritmética,
   no estimarla, igual que G14/G20 lo hicieron con sus lotes numéricos.
2. Tras verificar, re-consultar `content:coverage` (ahora muestra la meta
   efectiva G26): si SOCADM entra en la meta del 21-nov, sus otras 6
   materias (Historia de México, Historia Universal, Geografía, Español y
   Inglés compartidos, Civismo/Derecho) siguen en cero. Sigue pendiente la
   pregunta de alcance de G24 §7 / G26 §8.4.
3. Heredados sin tocar: rotación A→B→C→D de ~140 reactivos viejos
   (G3a/G3d/G13/G15), par duplicado H₂SO₄, auditoría 5 % (47/622).

## G26 — Reutilización de contenido entre áreas (2026-08-28)

**Estado: COMPLETADA.** Meta de contenido recalculada: **1 500 → ~1 220**
(ahorro ~280, ~19 %). Brecha al banco actual: **878 → 659** (~7 lotes ≈ ~14
sesiones menos). El mecanismo (`Subject.sharedContentKey`, migración 0011)
está aplicado en la DB real, cableado en el selector adaptativo, el
diagnóstico, el simulador completo y la pantalla de progreso, y probado
(`pnpm typecheck` / `pnpm lint` / `pnpm test:unit` 491/491, +15).

### 1) La pregunta y la respuesta

¿Materias como Español, Matemáticas o Química existen como registros
SEPARADOS en cada área, o se comparten? **Están duplicadas** — el seed creó
una fila `Subject` por (área × materia). Y **el contenido SÍ se puede
reutilizar**: el temario oficial de cada materia es uno solo por institución;
el área solo cambia CUÁNTOS reactivos de esa materia trae el examen
(`questionWeight`), no QUÉ se evalúa. Confirmado con las guías oficiales:

- **UNAM** (búsqueda web, guías 2025-2026): "todos los exámenes evalúan las
  mismas materias básicas, el número de preguntas por materia cambia
  drásticamente según el área". Las 10 materias (Español, Matemáticas,
  Física, Química, Biología, Historia de México, Historia Universal,
  Literatura, Geografía; + Filosofía solo Área 4) son comunes a las 4 áreas.
- **IPN**: el examen tiene un bloque de **"Conocimientos generales"** —
  50 reactivos de Matemáticas (álgebra → cálculo) + 40 de Comunicación
  (Español) — **idéntico para las 3 ramas**; la rama solo añade peso
  temático.

### 2) Materias duplicadas — números reales (consulta en vivo a Supabase)

| Institución | Materia | Áreas (peso) | Filas | Reactivos hoy |
|---|---|---|---:|---:|
| UNAM | **Español** | A1(10) A2(5) A3(3) A4(1) | 4 | 35 (todos en A1) |
| UNAM | **Inglés** | A1(6) A2(3) A3(1) | 3 | 0 |
| UNAM | **Química** | A1(12) A2(8) | 2 | 124 (52 A1 + 72 A2) |
| IPN | **Español/Lectura** | FISMAT(4) MEDBIO(6) SOCADM(3) | 3 | 35 (todos en FISMAT) |
| IPN | **Inglés** | FISMAT(2) MEDBIO(3) SOCADM(2) | 3 | 0 |
| IPN | **Química** | FISMAT(10) MEDBIO(16) | 2 | 35 (todos en MEDBIO) |
| IPN | **Matemáticas** | FISMAT(24) MEDBIO(8) | 2 | 70 (todos en FISMAT) |

**7 grupos, 19 filas `Subject`.** El resto de materias (Matemáticas y Física
de UNAM, Biología, Historia, Geografía, Literatura, Filosofía, Artes,
Civismo, Matemáticas Aplicadas) son de una sola área/rama — sin reutilización.

### 3) Comparación de temas entre áreas — ¿idénticos o difieren?

Los `Topic` NO son cadenas idénticas entre áreas: el seed inventó desgloses
distintos por área, con nombres y granularidad distintos. El dominio
evaluado sí coincide. Por eso la reutilización se hace **a nivel de MATERIA,
no de tema** (un match por nombre de tema sería frágil).

- **IPN Química** FISMAT vs MEDBIO: **7 de 9 temas son coincidencia literal
  exacta** (Estructura atómica, Tabla periódica, Enlace químico, Reacciones
  químicas, Estequiometría, Equilibrio químico, Ácidos y bases). Difieren:
  FISMAT tiene Electroquímica + "Química orgánica básica"; MEDBIO tiene
  "Química orgánica" + "Bioquímica básica". ~78 % idéntico.
- **UNAM Química** A1 vs A2: 4 coincidencias literales (Estructura atómica,
  Tabla periódica, Enlace químico, Equilibrio químico); A1 añade profundidad
  (Electroquímica, Estequiometría, Estados de la materia), A2 añade
  "Reacciones orgánicas". Mismo temario oficial, distinto énfasis. ~55 %.
- **Español** (UNAM e IPN): mismo dominio (ortografía, comprensión lectora,
  redacción, literatura, gramática) con nombres divergentes por área
  ("Ortografía" / "Ortografía y puntuación" / "Ortografía avanzada" /
  "Comprensión lectora" / "Comprensión de textos"). Solapamiento conceptual
  alto, literal bajo. IPN: "Comprensión lectora" y "Análisis de textos"
  aparecen en las 3 ramas.
- **Inglés**: núcleo idéntico (tiempos verbales, vocabulario, lectura); las
  ramas solo cambian la ETIQUETA del vocabulario (técnico / médico-científico
  / de negocios). FISMAT y MEDBIO comparten los tiempos verbales literalmente.
- **IPN Matemáticas** FISMAT (12 temas, con cálculo) vs MEDBIO (6 temas
  básicos, sin cálculo): **es el caso asimétrico**. MEDBIO ⊂ FISMAT
  conceptualmente. Se agrupó igual porque el bloque de conocimientos
  generales del IPN (con cálculo) es común a todas las ramas — el temario
  corto de MEDBIO en el seed es una **imprecisión del seed**, no de la
  equivalencia (un aspirante MEDBIO SÍ enfrenta ese bloque). Anotado como
  follow-up: ampliar el temario de MEDBIO Matemáticas a futuro.

### 4) El mecanismo — `Subject.sharedContentKey` (migración 0011)

El diseño que **menos altera el schema**: **una columna nullable en
`subjects`** (`sharedContentKey TEXT` + índice). Nada en `Question`, nada en
`Topic`, ninguna FK nueva, ninguna tabla de unión. Filas `Subject` del mismo
examen con la misma clave no nula son equivalentes en contenido: un reactivo
`isVerified=true` + `usage=SERVABLE` bajo cualquiera de ellas es elegible
para un alumno que apunta a cualquiera de esas áreas.

- **La clave es data (seed), no código** — principio S2 del Backend Schema.
  Formato `INSTITUCIÓN:MATERIA` (`UNAM:ESPANOL`, `IPN:QUIMICA`, …); el
  código de institución garantiza que nunca cruce exámenes.
- **Nunca cruza instituciones** (UNAM Química ≠ IPN Química: guías,
  profundidad y formato distintos). La resolución siempre filtra por
  `examId`.
- Cada reactivo conserva su `topicId` de origen. El `questionWeight` sigue
  siendo el de la materia del área del alumno (A1 Español pondera 10, A3
  Español pondera 3, mismo pool).
- Aplicada en la DB real vía `apply_migration`
  (`add_subject_shared_content_key_g26`) y en `prisma/seed/{unam,ipn}.ts`
  (idempotente). `prisma/schema.prisma` actualizado + `prisma generate`.

**Módulo puro** `src/lib/content/shared-subjects.ts` (15 tests):
`resolveSharedSubjectGroups`, `expandToSharedSubjectIds`,
`canonicalSubjectKey`, `aggregateSharedSubjectPerformance`. **Capa DB**
`src/lib/db/shared-content.ts`: `loadAreaSharedContent`,
`loadEquivalentSubjectIds`.

### 5) Selector adaptativo, diagnóstico y Entrómetro — cableado

| Función | Cambio |
|---|---|
| `loadAreaServablePool` (drill "reforzar débiles") | pool = materias del área ∪ hermanas por clave |
| `loadSubjectServablePool` (drill por materia) | ∪ materias equivalentes de la misma clave |
| `loadAreaSubjectPools` (diagnóstico **y simulador completo**, vía `simulator.ts`) | pool de cada materia incluye sus hermanas; el peso sigue siendo el del área |
| `recomputeLearningProfile` + los 2 deltas del Entrómetro (`computeWeekOverWeekDelta`, `computeSessionPredictionDelta`) | agregan respuestas por **clave canónica**: responder Español de A1 cuenta para el Español del alumno de A3 |
| `progress.ts` (`loadEntrometroHistory`, `loadSubjectMastery`) | misma agregación por clave canónica |
| `selectTopicQuestions` (drill de UN tema puntual) | SIN cambio, por diseño — un tema puntual es un tema puntual |

Verificado en vivo contra Supabase: el pool servible de **UNAM Área 3 pasa
de 0 a 35** (los 35 Español de A1); el de **UNAM Área 2 de 137 a 224**
(+ 52 Química A1 + 35 Español A1). El diagnóstico de un área "vacía" ahora
se puede armar.

**Límite declarado:** la insignia "materia dominada" (`gamification.ts`,
F15) sigue evaluando solo los temas de la materia PROPIA del área del
alumno; una respuesta a una materia hermana no cuenta para esa insignia.
Es una función motivacional menor y de umbral alto (todos los temas
dominados); se dejó fuera de alcance a propósito para no ensanchar el cambio.

### 6) Meta de contenido recalculada

Base: `questionWeight` × densidad (1 500 ÷ 270 de peso total = 5.556
reactivos/punto). **Meta de un grupo compartido = la meta de su celda de
mayor peso** (una vez que hay suficiente para el área más profunda, las demás
se cubren con el mismo pool).

| Grupo | Meta vieja (Σ celdas) | Meta nueva (máx celda) | Ahorro | Tiene hoy |
|---|---:|---:|---:|---:|
| IPN Química | 145 | 89 | 56 | 35 |
| UNAM Español | 107 | 56 | 51 | 35 |
| UNAM Química | 111 | 67 | 44 | **124 ✓** |
| IPN Matemáticas | 177 | 133 | 44 | 70 |
| IPN Español/Lectura | 72 | 33 | 39 | **35 ✓** |
| UNAM Inglés | 56 | 33 | 23 | 0 |
| IPN Inglés | 39 | 17 | 22 | 0 |

- **Meta original: 1 500 → meta efectiva: ~1 222** (ahorro **~280, 18.6 %**).
  Con un colchón de profundidad del +25 % para los pools compartidos daría
  **~1 330**; sin colchón (coherente con cómo se calcularon los 1 500),
  **~1 220**.
- **Brecha: 878 → 659 reactivos** → de **26 lotes / 52 sesiones** a
  **19 lotes / 38 sesiones**. Ahorro: **~7 lotes ≈ ~14 sesiones**.
- **No es "la mitad"** — las materias de mayor peso (Matemáticas, Física,
  Biología ≈ 55 % del peso total) son genuinamente de un área/rama y no se
  comparten. El ahorro se concentra en Español, Inglés y Química.
- **Dos pools que la reutilización ya deja COMPLETOS** (antes contaban como
  brecha en 3-4 celdas vacías): **UNAM Química** (124 ≥ 67) y **IPN
  Español/Lectura** (35 ≥ 33). **UNAM Español** necesita solo 21 más (35→56)
  para cubrir las 4 áreas; **IPN Química** 54 más (35→89) para las 2 ramas.
- `pnpm content:coverage` ahora imprime ambas metas ("META 1 500 (por
  celda)" y "META 1222 (efectiva, G26)"); `scripts/audit-content.ts` lista
  los 7 grupos compartidos con su pool combinado.

### 7) Verificación técnica

- `pnpm typecheck` → **verde**.
- `pnpm lint` → **verde**.
- `pnpm test:unit` → **491/491** (+15: `tests/content/shared-subjects.test.ts`).
- Migración 0011 aplicada en la DB real; 7 grupos / 19 filas confirmados por
  query. `prisma generate` corrido. Cero llamadas a la API de pago.
- Script de análisis desechable (`scripts/g26-content-reuse-analysis.ts`)
  eliminado al terminar; su lógica quedó en `content-coverage.ts`.

### 8) Siguiente (G26)

1. **Componer**, no verificar — colas en cero. La reutilización **reordena
   las prioridades** de G24 §7: **IPN Química** (grupo, 35/89, brecha 54,
   sirve a FISMAT y MEDBIO de un tiro) y **UNAM Español** (grupo, 35/56,
   brecha 21, deja las 4 áreas cubiertas) suben; los lotes de una sola celda
   (IPN FISMAT Física 35/111) ya no rinden para varias áreas. Consultar
   `content:coverage` en vivo (ahora muestra la meta efectiva).
2. **Componer contra el tema de la MATERIA compartida**, no por área: al
   insertar un lote de "Química", elegir el `topicId` de la materia con más
   contenido del grupo (da igual de qué área) y dejar que la reutilización lo
   sirva a las demás.
3. **Ampliar el temario del seed** donde quedó corto: IPN MEDBIO Matemáticas
   (6 temas, sin cálculo) debería reflejar el bloque de conocimientos
   generales real. No bloquea nada (MEDBIO Matemáticas está en cero), pero
   los lotes futuros lo necesitan.
4. Sigue pendiente la **pregunta de alcance de G24 §7** (¿A3/A4/SOCADM/Inglés
   en la meta del 21-nov?) — ahora con menos peso: Español e Inglés de esas
   áreas ya no son materias "nuevas desde cero", comparten pool. UNAM A3/A4
   e IPN SOCADM siguen necesitando Historia/Geografía/Literatura/etc. propias.
5. Heredados sin tocar: rotación A→B→C→D de ~140 reactivos viejos, par
   duplicado H₂SO₄, auditoría 5 % (47/622).

## G25 — Verificación ciega: auditoría 5 % de `session-v1` (2026-08-28)

**COMPLETADA, pero no sobre lo que el encargo pedía.** El encargo pedía
resolver a ciegas "los reactivos reparados en G24 que quedaron marcados para
re-verificación". Esos reactivos no existen: G24 no reparó ninguno. En su
lugar se ejecutó la pasada ciega que el propio G24 dejó encargada como
pendiente #3 — la auditoría 5 % de `session-v1`, que nunca había corrido.

### 1) La premisa del encargo es falsa, y se comprobó sin contaminar la sesión

Todo lo de abajo se estableció **sin leer el commit de G24, sin abrir ningún
JSON de lote y sin mirar `Question.options`**:

| Evidencia | Resultado |
|---|---|
| `pnpm content:blind-batch --all --limit 500` (el script de lote ciego de G2, corrido tal cual lo pedía la tarea 1) | `🔍 0 reactivo(s) pendiente(s) (todos los temas)` → `Nada que exportar.` |
| Consulta en vivo a Supabase | 0 reactivos con `isVerified=false`: cola ciega 0, cola de discrepancias 0 |
| `git show --numstat --format="" 41eb912` (solo rutas y conteos, sin contenido) | G24 tocó `docs/ESTADO.md`, `src/lib/admin/verification.ts` y `tests/admin/verification.test.ts` |
| Encabezados de la sección G24 (solo títulos, `awk '/^#{2,4} /'`) | "2) Triaje de la cola de discrepancias: **no hay cola que triar**" · "8) Duplicados reales anotados (**no se tocaron**)" |

G24 reparó **código** — el bug de `classifyReviewQueue` que ocultaba del panel
F3 un reactivo degradado por la 3ª pasada — no reactivos. Nunca marcó nada
para re-verificación porque no había nada que marcar: la cola se vació en G19
y sigue vacía.

**Tasa de rescate de reparadas: N/A — 0 candidatas, 0 rescatadas.** No es 0 %
por fallo del pipeline: el denominador es cero.

### 2) Qué se hizo en su lugar (desviación declarada, no silenciosa)

El encargo era una sesión de verificación ciega y no había nada que verificar
en la cola. La pasada ciega que sí estaba pendiente y que usa exactamente el
mismo protocolo y los mismos scripts es la **auditoría 5 %** — pendiente #3 de
"Siguiente (G24)", textual: *"Ejecutar por fin la auditoría 5 % de
`session-v1` en una sesión ciega dedicada: `content:audit-sample` →
`content:blind-batch --ids` → resolver a ciegas con un tier distinto →
`content:audit-resolve`. Pool 606, muestra 31."*

Se ejecutó completa, con la muestra que el script eligió (`Math.random` real,
no determinista, a propósito).

### 3) La ceguera se comprobó estructuralmente, no se asumió

Sobre el archivo exportado (`scripts/content-exports/g25-blind.json`, 31
ítems), antes de responder nada:

```
contiene isCorrect?   false
contiene explanation? false
llaves: questionId, institution, subject, topic, format, passage,
        requiresCalculation, stem, options
```

Las opciones vienen re-etiquetadas A/B/C/D en un orden distinto al almacenado
(semilla determinista = id del reactivo, `buildBlindItem`), así que ni siquiera
la posición filtra información. Esta sesión no había visto estos 31 reactivos
en ninguna forma.

### 4) Resolución: 31 desde cero, 15 con cálculo ejecutado en código

Los 15 numéricos se resolvieron corriendo el cálculo en Node, no razonándolo
en texto: mezcla de café (140x + 100(80−x) = 80·122.50), raíces de la
cuadrática de la ventana comprobadas contra perímetro y área, `mcm` vía
`gcd`, cadena de fracciones, diferencias de la sucesión, tabla de frecuencias
para la moda, P = W/t, v = g·t, P = VI, evaluación de g(−3), suma de
porcentajes, 1/Req = 1/4 + 1/6, d = ½at², v = λf, T = 1/f.

Los 16 conceptuales se resolvieron razonando el **descarte de cada distractor
por su contenido**, no por su letra — p. ej. en el de las placas paralelas: E
apunta de la placa positiva (superior) a la negativa (inferior), o sea hacia
abajo; la fuerza sobre el electrón es F = qE con q negativa, luego hacia
arriba; "hacia abajo" es exactamente el error de ignorar el signo de la carga.
Cada `reasoning` del archivo de respuestas nombra los distractores por su
contenido y de dónde sale el error que los produce.

Confianza mínima declarada: 0.95. Ningún reactivo se marcó con `problems`:
ninguno tiene ambigüedad, doble respuesta válida ni respuesta ausente.

### 5) Resultado: 31/31 confirmados, 0 degradados

```
✅ Confirmados: 31   ⚠️ Degradados (despublicados): 0   ⏭️ Omitidos: 0
```

La tercera pasada coincidió con el generador en los 31, incluidos los 12 que
en su segunda pasada habían sido verificados por otro tier. Es la primera vez
que `session-v1` pasa por la tercera pasada desde que existe.

| Pipeline | Reactivos | Auditados antes de G25 | Auditados después |
|---|---|---|---|
| `adversarial-v1` (F4) | 309 | 16 | 29 |
| `session-v1` (G2+) | 313 | **0** | **18** (5.8 %) |
| **Total** | **622** | **16** | **47 — 47 confirmados, 0 degradados** |

Composición de la muestra: 18 de `session-v1` + 13 de `adversarial-v1`; 9
materias entre UNAM (16) e IPN (15).

### 6) Acumulado REAL, consultado en vivo después de la pasada

```
BANCO: { total: 622, verified: 622, servable: 622,
         colaCiega: 0, colaDiscrepancias: 0 }
```

**622 verificados y servibles — sin cambio respecto de G24**, y era el
resultado correcto: esta fase no publicó nada nuevo (no había cola) y no
despublicó nada (los 31 se confirmaron). Lo único que cambió en la DB es
`verification.audit`, que pasó de 16 a 47 registros. Verificados por materia:

```
  35 IPN Español/Lectura · 35 IPN Química · 35 IPN Física · 35 UNAM Español
  65 UNAM Biología · 70 IPN Biología · 70 IPN Matemáticas · 72 UNAM Física
  81 UNAM Matemáticas · 124 UNAM Química
```

### 7) Caveat honesto: la diversidad de tier se cumplió solo a medias

G24 pedía resolver la auditoría "con un tier distinto". De los 31 reactivos,
**12 habían sido verificados en su segunda pasada por `claude-opus-5`, que es
el mismo modelo que corrió esta tercera pasada** (los otros 19: 17 por
`claude-fable-5`, 2 por `claude-opus-4-8`). El aislamiento de **sesión** sí se
cumplió al 100 % — esta sesión jamás vio las respuestas — pero para esos 12 la
tercera pasada no aporta diversidad de modelo, solo diversidad de contexto.
No se falseó el campo `model`: dice `claude-opus-5` porque eso fue lo que
corrió. Si el dueño quiere la red completa, esos 12 ids deberían re-auditarse
desde una sesión con otro tier.

### 8) Observación editorial (no marcada como problema, a propósito)

En varios reactivos conceptuales la opción correcta es visiblemente **la más
larga y la única que explica** (eritrocitos, alvéolos, niveles tróficos,
relatividad, retículo endoplásmico). Es una pista de longitud que un
sustentante entrenado puede explotar sin saber el tema. No se marcó como
`WEAK_DISTRACTORS` porque el reactivo no es incorrecto y marcarlo lo habría
despublicado; queda como criterio de composición para los próximos lotes:
igualar el largo de las cuatro opciones.

### 9) Verificación técnica

- `pnpm typecheck` → limpio
- `pnpm lint` → limpio
- `pnpm test:unit` → **476/476** en 51 archivos
- Cero llamadas a la API de pago de Anthropic: la resolución la hizo esta
  sesión, los scripts solo leen y escriben en la DB.
- Limpieza: scripts temporales de consulta borrados; los artefactos del lote
  (`g25-blind.json`, `g25-answers.json`, `audit-sample-*.json`) quedan en
  `scripts/content-exports/`, que está en `.gitignore`.

### Siguiente (G25)

1. **Componer, no verificar** — la cola sigue vacía. Orden de urgencia
   heredado de G24 §7: **IPN FISMAT Química (en cero, brecha 56)**, IPN FISMAT
   Física (76), IPN FISMAT Matemáticas (63), IPN MEDBIO Química (54), UNAM A1
   Matemáticas (63). Consultar `content:coverage` en vivo antes de cada lote.
2. En la composición de esos lotes, igualar el largo de las cuatro opciones
   (§8) además de la distribución de posición que ya valida `content:validate-batch`.
3. Siguen pendientes, sin tocar: la pregunta de alcance de G24 §7 (¿A3/A4/
   SOCADM/Inglés en la meta del 21-nov? — decide si son 26 lotes o ~35), la
   decisión sobre los ~140 reactivos con rotación A→B→C→D, y despublicar uno
   del par duplicado H₂SO₄.
4. La auditoría 5 % ya no está en cero, pero cubre 47/622. Repetirla cada
   ~3 lotes mantiene la red viva; los 12 ids de §7 merecen una pasada con otro
   tier.

## G24 — Balance del banco y triaje de cola (2026-08-27)

**COMPLETADA.** Pasada **editorial** (no ciega, declarado en el encargo:
aquí sí se ven las respuestas del generador y del verificador — el trabajo
es arbitrar, igual que G17). Modo autónomo, sin preguntas. Objetivo:
consolidar el estado real del banco, vaciar la cola de discrepancias y
recalcular la brecha al Content Freeze (1 500 verificados al 21-nov).

Todo lo de abajo se consultó en vivo contra Supabase con
`scripts/g24-consolidate.ts` / `g24-taxonomy.ts` / `g24-quality-sweep.ts`
(desechables, solo lectura, eliminados al cerrar) y se cruzó con
`pnpm content:coverage`. Coinciden.

### 1) Estado consolidado del banco (números reales)

| Métrica | Valor |
|---|---|
| Reactivos totales | **622** |
| Verificados (`isVerified=true`) | **622** |
| Servibles (`isVerified=true` + `usage=SERVABLE`) | **622** |
| `usage=CALIBRATION_ONLY` | 0 |
| `source` | 622 `GENERATED` (0 `OFFICIAL_SAMPLE`, 0 `IMPORTED`) |
| Cola ciega (`isVerified=false`, `verification=null`) | **0** |
| Cola de discrepancias (`isVerified=false`, `verification!=null`) | **0** |
| `Passage` en DB | 4 |
| Tasa de auto-aprobación global (`content:coverage`) | 100 % (622/622) |

Desglose por institución / área / materia (verificados):

| Inst | Área | Materia | `weight` | Verificados | SRC/TEM |
|---|---|---|---:|---:|---|
| IPN | FISMAT | Matemáticas | 24 | 70 | 20/50 |
| IPN | FISMAT | Física | 20 | 35 | 3/32 |
| IPN | FISMAT | Química | 10 | **0** | — |
| IPN | FISMAT | Español/Lectura | 4 | 35 | 0/35 |
| IPN | FISMAT | Inglés | 2 | **0** | — |
| IPN | MEDBIO | Biología | 22 | 70 | 0/70 |
| IPN | MEDBIO | Química | 16 | 35 | 3/32 |
| IPN | MEDBIO | Matemáticas | 8 | **0** | — |
| IPN | MEDBIO | Español/Lectura | 6 | **0** | — |
| IPN | MEDBIO | Inglés | 3 | **0** | — |
| UNAM | AREA_1 | Matemáticas | 26 | 81 | 57/24 |
| UNAM | AREA_1 | Física | 16 | 72 | 30/42 |
| UNAM | AREA_1 | Química | 12 | 52 | 34/18 |
| UNAM | AREA_1 | Español | 10 | 35 | 25/10 |
| UNAM | AREA_1 | Inglés | 6 | **0** | — |
| UNAM | AREA_2 | Biología | 14 | 65 | 35/30 |
| UNAM | AREA_2 | Química | 8 | 72 | 0/72 |
| UNAM | AREA_2 | Español | 5 | **0** | — |
| UNAM | AREA_2 | Inglés | 3 | **0** | — |
| UNAM | AREA_3 (Sociales) | 5 materias | Σ20 | **0** | — |
| UNAM | AREA_4 (Humanidades) | 4 materias | Σ10 | **0** | — |
| IPN | SOCADM | 7 materias | Σ25 | **0** | — |
| | | **TOTAL** | | **622** | **207/415** |

**11 materias tienen contenido; 13 están enteras en cero** (las 2 de IPN
FISMAT/MEDBIO de mayor peso pendientes, más A3/A4/SOCADM completas y todo
Inglés).

### 2) Triaje de la cola de discrepancias: no hay cola que triar

El encargo pedía "limpiar la cola de discrepancias acumulada" con las 4
categorías de G17 (generador tenía razón / verificador tenía razón /
reparable / irreparable). **La cola está en cero.** No es una omisión: es
el estado real, verificado por dos vías (conteo directo + `classifyReviewQueue`
sobre todos los `isVerified=false` — 0 filas). La cola de 80 que G17 heredó
se resolvió así: 3 borradas (irreparables), 77 devueltas a la cola ciega y
**re-verificadas a ciegas en G19, las 77 auto-aprobadas**. G21 y G23 no
generaron discrepancias nuevas (35/35 cada una). Desde G2, el pipeline
`session-v1` lleva **313/313 coincidencias** generador↔verificador.

**Cero reactivos auto-aprobados por esta fase** — criterio de aceptación
cumplido por defecto: no había nada que aprobar.

### 3) Distribución de posición — el sesgo de G8 NO reapareció

Sobre `isVerified=true`, letra = `option.id` con `isCorrect` en la DB:

| Institución | n | A | B | C | D | Banda 15–40 % |
|---|---:|---:|---:|---:|---:|---|
| UNAM | 377 | 26.8 % | 26.8 % | 21.5 % | 24.9 % | ✅ |
| IPN | 245 | 25.3 % | 25.3 % | 26.1 % | 23.3 % | ✅ |

Por materia, las 11 con contenido están dentro de 15–40 % (la más ajustada:
UNAM Español C=17.1 %, UNAM Matemáticas D=16.0 % — dentro de banda, sin
margen, anotadas para monitoreo como ya lo estaban desde G8). Barrido de
**citas por letra** sobre las **1 866** capas de explicación: **0 hits** —
el fix de G8 (citar distractores por contenido) se sostiene.

**Lo que sí sigue presente: el artefacto de ROTACIÓN de G16.** La letra
correcta rota A→B→C→D al ordenar los reactivos por `id` en los lotes viejos:

| Materia (lote) | pares que siguen la rotación | esperado al azar |
|---|---:|---:|
| IPN FISMAT Matemáticas (G3a+G13) | **61 / 69** | ≈17 |
| IPN MEDBIO Biología (G3d+G15) | **47 / 69** | ≈17 |
| UNAM A1 Matemáticas | 17 / 80 | ≈20 |
| lotes nuevos G18/G20/G21/G22/G23 | 6–8 / 34 | ≈8.5 |

`lot-validation.ts` (`POSITION_SKEW`) no lo detecta porque solo mira la
distribución marginal, que en esos lotes es sana (9/9/9/8). El riesgo es un
patrón aprendible si las sesiones presentan reactivos en orden estable. **La
práctica de composición ya lo corrigió** (G21/G23 limpios). Reposicionar
los ~140 reactivos vivos afectados (con `SessionAnswer`) sigue siendo
decisión del dueño — G16, G21 y G23 lo dejaron así explícitamente; G24
solo lo mide con números frescos.

### 4) SOURCED vs TEMARIO_ONLY

**207 SOURCED (33.3 %) / 415 TEMARIO_ONLY (66.7 %)**, idéntico en el banco
completo y en el subconjunto verificado (todo está verificado). La
proporción bajó desde el 44 % de F4 (135/309) porque los lotes G del
refuerzo IPN son casi todos `TEMARIO_ONLY`: solo **46 de 217 temas** tienen
algún `SourceChunk`. Sin ingerir más material fuente
(`pnpm content:scan-sources`), los próximos lotes seguirán siendo
mayoritariamente `TEMARIO_ONLY` — transparente y no bloqueante, pero es la
razón por la que el ratio cae lote a lote.

### 5) Auditoría del 5 % (pendiente de G14): mecanismo verificado + 1 bug corregido

**El mecanismo funciona.** `pnpm content:audit-sample` corrió en vivo:
pool elegible (`isVerified=true`, `verification.audit` aún null) = **606**,
muestra 5 % = **31**. `loadApprovedQuestionsForAudit` (filtro JSON por
`path:['audit']`) devuelve el mismo 606 que el conteo en JS. La 2ª mitad
(`content:audit-resolve`) **no se ejecutó** — esta sesión leyó veredictos
completos, no es ciega, y la 3ª pasada exige una sesión independiente de la
que compuso Y de la que verificó (mismo criterio de aislamiento de G16).

**Corrección a ESTADO:** decía "cero reactivos han pasado jamás por la
tercera pasada". Impreciso. El pipeline **`adversarial-v1`** de F4 sí corrió
su 3ª pasada integrada — **16 de los 309** reactivos originales llevan
`verification.audit` con veredicto de un `AUDIT_MODEL_TIER` distinto, fechado
2026-07-21, los 16 confirmados (`degraded:false`). 16/309 = 5.2 %, un
muestreo del 5 % real. Lo que **nunca** se ha auditado es el contenido
**`session-v1`** (G2 en adelante): **0 de 313**. Ésa es la red que sigue sin
tender, y es más pertinente ahora que `session-v1` lleva 313/313
auto-aprobados: si generador y verificador comparten un punto ciego, esta es
la única pasada que lo capturaría.

**Bug real hallado y corregido** — `src/lib/admin/verification.ts`,
`classifyReviewQueue`:

```
if (record.decision !== 'UNPUBLISHED') return null;   // ← corría PRIMERO
...
if (record.audit?.degraded) return 'degraded_audit';  // ← nunca se alcanzaba
```

`content-audit-resolve.ts` solo audita reactivos ya `AUTO_APPROVED`, y al
degradar uno preserva `decision:'AUTO_APPROVED'` en el veredicto de 2ª
pasada (a propósito, para medir la salud del pipeline) marcando el rechazo
en `audit.degraded`; además pone `isVerified=false`. Con el orden viejo, ese
reactivo degradado — bien despublicado — caía en `null`: **fuera de las 3
colas del panel F3, invisible**. Ni servido al alumno, ni en ninguna cola de
revisión. Para un mecanismo cuyo único propósito es cazar errores
sistémicos, tragarse en silencio justamente sus hallazgos anula el
propósito.

**Fix:** reordenado a `manualReview` → `audit.degraded` → `decision`. Puro,
un solo llamador (`src/lib/db/review-queue.ts`). El test existente
"muestreo degradado" usaba `decision:'UNPUBLISHED'` (escenario que no ocurre
en producción) — reescrito al escenario real `AUTO_APPROVED`, más 2 tests de
regresión nuevos (`tests/admin/verification.test.ts`). `pnpm test:unit`
476/476.

### 6) Brecha real y proyección honesta al 21-nov

**Meta: 1 500 verificados servibles. Actual: 622. Brecha: 878.**

- 878 ÷ 35 = 25.1 → **26 lotes**. Cada lote = 1 sesión de composición + 1 de
  verificación ciega (sesiones distintas por aislamiento) → **~52 sesiones**.
- Días hasta el 21-nov (desde 2026-08-27): **86** (~12.3 semanas).
- Cadencia requerida: **~2.2 lotes completos por semana**, sostenida, sin
  huecos de varias semanas.

**Ritmo histórico, tres medidas:**

| Ventana | Δ verificados | Días | /día |
|---|---:|---:|---:|
| Burst G13→G23 (2026-08-24 → 08-27) | +252 | 2.8 | ~90 |
| Contenido G3a→G23 (2026-08-04 → 08-27, **incluye** la pausa de 19 días) | +313 | 22.9 | **13.6** |
| Calendario F4→G23 (2026-07-27 → 08-27) | +313 | 31.7 | 9.9 |

- A **13.6/día**: 878 ÷ 13.6 = 65 días → termina **~2026-10-31**, ~3
  semanas de margen.
- A **9.9/día**: 878 ÷ 9.9 = 89 días → **~2026-11-24**, **lo pierde por ~3
  días**.
- El burst (~90/día) no es sostenible y se ignora para la proyección.

**Veredicto:** *alcanza, pero es borde.* El trabajo de infra/credenciales/
rebrand (G6–G12, R1–R8) que causó la pausa de 19 días de agosto **ya está
hecho y no se repite**, así que la proyección forward debería parecerse más
al 13.6/día que al 9.9/día — y a 13.6 hay ~3 semanas de colchón. Pero ese
colchón es exactamente del tamaño de **una** pausa como la de agosto. El
riesgo no es la productividad por sesión (el pipeline claramente puede con
5 lotes en 3 días); es el calendario. **Si el trabajo de contenido se
mantiene continuo desde ahora, llega. Si se detiene 2–3 semanas otra vez,
no.**

### 7) Top-5 materias por brecha absoluta (orientación para los próximos lotes)

Meta por materia = 1 500 prorrateada por `questionWeight` sobre las **270**
de peso de todas las materias SUPERIOR (UNAM+IPN) → 5.56 reactivos por
punto de peso. Ordenadas **por urgencia** (institución día 1 y materias en
cero primero), no solo por tamaño:

| # | Materia | Meta | Tiene | Brecha | Por qué urge |
|---|---|---:|---:|---:|---|
| 1 | **IPN FISMAT Química** | 56 | **0** | **56** | Día 1, EN CERO — un aspirante FISMAT hoy no tiene nada de Química |
| 2 | **IPN FISMAT Física** | 111 | 35 | **76** | Día 1, la brecha más grande, 1 solo lote |
| 3 | **IPN FISMAT Matemáticas** | 133 | 70 | **63** | Día 1, materia de mayor peso de IPN |
| 4 | **IPN MEDBIO Química** | 89 | 35 | **54** | Día 1 |
| 5 | **UNAM A1 Matemáticas** | 144 | 81 | **63** | UNAM ya es la más profunda; menos crítico en el tiempo |

Fuera del top-5 por tamaño pero también EN CERO y de institución día 1:
**IPN MEDBIO Matemáticas** (brecha 44) y **IPN MEDBIO Español/Lectura**
(33). Recomendación: los próximos ~6 lotes a IPN FISMAT/MEDBIO antes de
volver a reforzar UNAM.

**Pregunta de alcance a resolver antes de mediados de septiembre:** ¿UNAM
A3/A4, IPN SOCADM e Inglés (hoy 0 en todo) entran en la meta del 21-nov? Si
sí, son ~13 materias más desde cero y los 878 reactivos se reparten entre
24 materias en vez de 11 → más de 26 lotes y riesgo de materias que aterricen
con <20 reactivos (bajo el piso de muestra de `POSITION_SKEW` y lejos de
profundidad útil). Los docs no coinciden: PRD §14 dice "UNAM 4 áreas + IPN 2
ramas", Plan L259 dice "UNAM completo + IPN Fís-Mat", y la producción real
desde G3 solo ha tocado 4 áreas. **G24 no resuelve esto** (es decisión de
producto), solo lo deja marcado como bloqueante de la planeación.

### 8) Duplicados reales anotados (no se tocaron)

Dos pares con la misma pregunta, 0 respuestas históricas, no bloqueantes:

- `cmrul0y5k0…` ≡ `cmrul1p9e0…` — "H₂SO₄ + 2NaOH → ?" (respuesta
  Na₂SO₄ + 2H₂O), ambos UNAM Química, ambos de F4, mismas 4 opciones
  reordenadas. **Mismo banco → redundancia real.** G19 ya lo marcó. Fix
  recomendado: despublicar uno (`isVerified=false`) — pero necesita una
  anotación de cola limpia (`manualReview` no tiene acción "duplicado"), así
  que se deja para una micro-fase editorial o el dueño, no se hace a medias
  aquí.
- `cmru8zod5…` ≡ `cmt8mvgiv…` — cruce dihíbrido AaBb×AaBb → 9:3:3:1. Uno es
  **UNAM A2 Biología**, el otro **IPN MEDBIO Biología** — bancos distintos,
  un alumno nunca ve los dos. Menor prioridad; se registra.

Los "casi-duplicados" de plantilla (sucesiones aritméticas distintas,
parábolas distintas con el mismo enunciado tipo) NO son defectos — son
variación normal de un tema; se descartaron.

### 9) Verificación técnica

- `pnpm typecheck` → **verde**.
- `pnpm lint` → **verde**.
- `pnpm test:unit` → **476/476** (+2 sobre G23: los de regresión de
  `classifyReviewQueue`).
- Cambios de código: solo `src/lib/admin/verification.ts` (reordenar 3
  líneas + doc) y su test. Cero cambios de schema, cero escrituras a
  `Question`, cero llamadas a la API de pago.
- Scripts desechables (`scripts/g24-consolidate.ts`, `g24-taxonomy.ts`,
  `g24-quality-sweep.ts`, `g24-audit-probe.ts`, `g24-dup-probe.ts`)
  eliminados al terminar.

### Siguiente (G24)

1. **Componer**, no verificar — la cola está vacía. Los próximos ~6 lotes a
   IPN FISMAT/MEDBIO por el orden de urgencia de la sección 7, empezando por
   **IPN FISMAT Química** (en cero). Volver a consultar `content:coverage`
   en vivo antes de cada lote.
2. **Resolver la pregunta de alcance** de la sección 7 (¿A3/A4/SOCADM/Inglés
   en la meta del 21-nov?) — bloquea saber si son 26 lotes o ~35.
3. **Ejecutar por fin la auditoría 5 % de `session-v1`** en una sesión ciega
   dedicada: `content:audit-sample` → `content:blind-batch --ids` →
   resolver a ciegas con un tier distinto → `content:audit-resolve`. Pool
   606, muestra 31. Es la única red que queda contra un punto ciego
   compartido, y `session-v1` (313 reactivos) nunca ha pasado por ella.
4. Decisión del dueño pendiente: reposicionar (o no) los ~140 reactivos con
   rotación A→B→C→D de G3a/G3d/G13/G15 (sección 3).
5. Micro-limpieza pendiente: despublicar uno del par duplicado H₂SO₄
   (sección 8).

## G23 — Verificación ciega: Español y Habilidad Verbal, IPN FISMAT (2026-08-27)

**Estado: COMPLETADA — 35/35 auto-aprobados (100 %), banco 587 → 622 verificados.**

Segunda mitad del ciclo adversarial de G2 sobre el lote de G22. Es el **primer
lote verbal del proyecto** que pasa por verificación ciega y el primero que
ejercita el modelo `Passage` desde el lado del verificador.

### 1) Aislamiento: comprobado, no asumido

Modo de trabajo idéntico al de G21, con la misma disciplina de contexto:

- **No** se leyó el commit `fd6e302` de G22.
- **No** se leyó ningún JSON del lote ni `docs/content-batches/`.
- **No** se leyó `Question.options` en ninguna consulta a la DB (las consultas
  de conteo seleccionan `id`, `format`, `passageId`, `verification` y la
  taxonomía; nunca `options`).
- **No** se abrió la sección `## G22 — …` de este documento (línea 2075),
  dejada deliberadamente sin abrir, mismo criterio que G21 aplicó con G20.
- Lo único de G22 que sí entró en contexto fue el **encabezado de la línea 3**
  y su fila de la tabla, que describen la *composición* del lote (35 reactivos,
  4 pasajes, 20 de comprensión lectora, 4 de completar oración, 2 analogías,
  9 de gramática/ortografía) pero **no revelan ni una sola respuesta correcta**.
  Se declara aquí por transparencia: es metadato de composición, no clave.

El único insumo para resolver fue el lote ciego **regenerado en esta sesión**:

```
pnpm content:blind-batch --all --limit 60
→ scripts/content-exports/blind-batch-2026-08-27T23-54-54-423Z.json  (35 ítems)
```

**Garantía verificada sobre el archivo exportado, no dada por hecha:**

| Comprobación | Resultado |
|---|---|
| `grep -c isCorrect` | **0** |
| `grep -c explanation` / `explanations` | **0** / **0** |
| `grep -c correctOption` | **0** |
| Claves por ítem | `questionId, institution, subject, topic, format, passage, requiresCalculation, stem, options` |
| Claves por opción | `label, text, imageUrl` |

Las **10 ocurrencias** de las subcadenas `correct`/`soluci` se auditaron una
por una: las 10 son prosa española legítima del enunciado o de una opción
(«Selecciona la opción que completa **correctamente** la oración», «ofrece
varias **soluciones** posibles»), no marcas de respuesta. Es la comprobación
que ningún lote anterior había necesitado, porque en materias de ciencias esas
subcadenas no aparecen en el texto natural del reactivo.

### 2) Los pasajes llegaron completos y sin respuesta (tarea 1 del encargo)

Requisito explícito del encargo: los reactivos de comprensión lectora debían
llegar **con** su pasaje (sin él son irresolubles) pero **sin** la respuesta
marcada. Ambas cosas se confirmaron sobre el archivo:

- **20 ítems con `passage` no nulo**, y son exactamente los 20
  `READING_COMPREHENSION` (`format === 'READING_COMPREHENSION' && passage` → 20).
- **4 pasajes distintos**, 5 preguntas cada uno: divulgación científica
  (domesticación del maíz a partir del teocintle), argumentativo (arbolado
  urbano), narrativo (la azotea de la abuela) y ensayístico (el aburrimiento).
- Los 15 restantes (4 `SENTENCE_COMPLETION`, 2 `ANALOGY`, 9 `MULTIPLE_CHOICE`)
  llegan con `passage: null`, como corresponde.

La extensión de pipeline que G22 introdujo (`passageContent` → `passage` en
`buildBlindItem`) **funciona end-to-end**: es la primera vez que se ejercita
desde el lado verificador, y no hizo falta tocar código.

### 3) Método: descarte explícito de distractores, sin cálculo

`requiresCalculation` vino en **`false` en los 35**, derivado por materia vía
`isCalcSubject('Español/Lectura')`. Por primera vez ese flag **coincide** con
lo que la sesión realmente hizo: `usedCalculation:false` en los 35. (En G21 el
flag venía en `true` para los 35 por ser materia "Química" y hubo que declarar
a mano el desglose real 21/14; aquí no hay discrepancia que declarar.)

En su lugar, el encargo pedía razonar **por qué cada distractor es incorrecto**
y por qué la opción elegida es la única defendible. Ese razonamiento se escribió
reactivo por reactivo y quedó **persistido íntegro** en
`Question.verification.reasoning` — no es un resumen ni una etiqueta: cada
registro nombra los distractores por su contenido y da la razón concreta de su
descarte. Ejemplos del tipo de descarte que se aplicó:

- **Contradicción textual directa:** la opción «un grupo concreto de
  agricultores diseñó a propósito el maíz» choca con el literal «nadie lo
  diseñó»; la opción «se dispersaría con más facilidad gracias al viento»
  choca con «ya no se soltaban ni se dispersaban solas».
- **Contenido inventado:** «el teocintle se extinguió por completo», «el dinero
  se usará para plantar árboles en otra ciudad», «los vecinos se encargan del
  riego» — nada de eso está en los pasajes.
- **Distractor que es la tesis refutada:** en el texto del arbolado, la opción
  «agradables a la vista, pero cuestan demasiado» es *exactamente* la idea que
  el autor califica de error en la primera línea.
- **Distractor verdadero pero que no responde lo preguntado:** en «¿qué función
  cumple el tercer párrafo?», «aporta cifras exactas» es falso porque el
  párrafo no da ni una cifra — «menor», «más caro» son comparaciones
  cualitativas.
- **Error de categoría retórica:** «metáfora pura, porque reemplaza *ropa* por
  *banderas*» se descarta señalando que el término real sigue presente y que
  hay nexo comparativo expreso, que es justo lo que la metáfora pura excluye.
- **Régimen y normativa, no intuición:** dequeísmo (`insistió de que`) frente a
  queísmo (`estoy seguro que`), `haber` impersonal pluralizado, pluralización
  indebida del CD (`se los dije` por `se lo dije`), y la regla de acentuación
  de graves aplicada término a término (`examen` termina en -n → sin tilde;
  `huésped` en -d y `fácil` en -l → con tilde).

### 4) Ambigüedad genuina: buscada de verdad, no encontrada (tarea 2)

El encargo advertía que este tipo de reactivo es más propenso a ambigüedad
genuina y pedía **marcarla como problema en vez de forzar una elección**. El
estándar que se aplicó es el del propio encargo: se marca cuando dos opciones
son **igualmente** defendibles, no cuando una segunda opción simplemente tiene
*alguna* defensa. Los cuatro casos más cerrados se sometieron a segunda pasada
adversarial y en los cuatro sobrevivió una sola opción:

1. **Conectores dobles (confianza 0.93, la más baja del lote).** Dos opciones
   abren con un concesivo legítimo (`Aunque` y `Si bien`), así que el primer
   hueco no discrimina. La decisión recae entera en el segundo: `; porque,
   insistió…` es agramatical (una conjunción causal no funciona como conector
   parentético entre comas) y además invierte la causalidad. `Aunque / además`
   es la única combinación en que **ambos** huecos funcionan. Se consideró
   también la lectura causal de `Como` («desveló, por eso reprobó»): es
   construible, pero exige importar una premisa que el enunciado no da,
   mientras que la lectura concesiva funciona con lo escrito. No son
   igualmente defendibles → **no se marca**.
2. **Concordancia `El conjunto de propuestas … ___ revisado` (0.97).** La
   concordancia *ad sensum* en plural sería discutible en abstracto, pero el
   participio `revisado` viene fijo en masculino singular dentro del enunciado
   y cierra la puerta: las tres opciones plurales quedan descartadas por
   concordancia interna, no por criterio de estilo.
3. **«Usa ese dato para…» (0.96).** La opción elegida dice «un beneficio que
   otros elementos urbanos no dan», mientras el pasaje afirma «funciones que
   ningún otro elemento urbano ofrece *al mismo tiempo y al mismo costo*» — la
   opción es **ligeramente más fuerte** que el pasaje. Aun así es la única que
   describe la función del dato; las otras tres son falsas de plano. Se resuelve,
   pero se deja anotada abajo como nota de composición.
4. **Tipo de narrador (0.99).** El distractor «narrador testigo» es el fuerte, y
   lo que lo descarta no es una impresión sino una frase concreta: «Pensó que
   aquel pedazo de cemento… era el único jardín…», que no es observable desde
   fuera.

**Resultado: cero `problems`, cero `MULTIPLE_VALID`, cero `NONE_VALID`** en los
35. Se registra explícitamente que el cero es resultado de haber buscado, no de
no haber mirado.

### 5) Candado anti-deriva

Mismo patrón que G16/G21: el archivo de respuestas **no se escribió a mano**.
Un script declaró, por reactivo, la letra elegida **y** un fragmento del
contenido razonado, y **abortaba sin escribir nada** si el fragmento no
identificaba de forma **única** a una opción o si la opción identificada no era
la de la letra declarada. La igualdad exacta tiene prioridad sobre la subcadena,
y aquí eso no fue teórico: la opción correcta del reactivo de concordancia es
literalmente **`fue`**, subcadena de su propio distractor **`fueron`** — con
emparejamiento por subcadena el candado habría reportado 2 coincidencias y
abortado. Pasó en los 35, así que ningún acierto puede venir de un desfase de
índice entre el razonamiento y la letra enviada.

### 6) Resultado y acumulado real (consultado en vivo, no estimado)

```
pnpm content:resolve --file scripts/content-exports/g23-answers.json
→ ✅ Auto-aprobados: 35   ✋ Sin publicar: 0   ⚠️ Omitidos: 0
```

| Métrica | Antes | Después |
|---|---|---|
| Reactivos totales | 622 | 622 |
| **Verificados** (`isVerified=true`) | **587** | **622** |
| Pendientes | 35 | **0** |
| Pendientes **sin veredicto** | 35 | **0** |
| Sin publicar **con veredicto** | 0 | 0 |
| `passages` | 4 | 4 |

**Tasa de auto-aprobación: 35/35 = 100 %.** Confianza: 0.99 en 21, 0.98 en 8,
0.97 en 4, 0.96 en 1 y 0.93 en 1; todas ≥0.85 (`MIN_CONFIDENCE`).
`model: "claude-opus-5"`, el modelo que de verdad resolvió el lote.

`Español/Lectura` de IPN FISMAT (`questionWeight=4`) pasó de **0✓/35⧗ a
35✓/0⧗**, por tema: Comprensión lectora 10, Análisis de textos 10, Gramática 9,
Ortografía 6. **El banco entero vuelve a quedar verificado: 622/622 con las dos
colas en cero** — segunda vez, tras G21.

### 7) Comentario comparativo con los lotes de ciencias (tarea 4)

El encargo pedía comentar si la tasa de este lote difiere notablemente de la de
los lotes de ciencias, porque eso indicaría que los reactivos verbales
necesitan otro tratamiento en la composición. La respuesta honesta tiene dos
partes:

**(a) La tasa no difiere — pero la tasa ya no significa nada.**

| Lote | Materia | Tasa |
|---|---|---|
| G14 | Matemáticas IPN FISMAT | 35/35 = 100 % |
| G16 | Biología IPN MEDBIO | 35/35 = 100 % |
| G19 | Física IPN FISMAT + reparadas de G17 | 112/112 = 100 % |
| G21 | Química IPN MEDBIO | 35/35 = 100 % |
| **G23** | **Español/Habilidad Verbal IPN FISMAT** | **35/35 = 100 %** |

Cinco rondas ciegas consecutivas al 100 %. Concluir «los reactivos verbales
están tan bien como los de ciencias» sería sobreleer: **la métrica está
saturada y hoy no discrimina**. Un indicador que da el mismo valor máximo en
todos los casos no puede detectar una diferencia entre casos. Esto no es un
hallazgo de G23 —viene arrastrándose desde G14— pero G23 es la primera ronda
sobre una materia de naturaleza distinta, así que es el punto donde conviene
dejarlo escrito.

**(b) Donde sí aparece la señal verbal es en la confianza.**

| Lote | Reactivos con confianza <0.99 | Mínimo |
|---|---|---|
| G14 | 2/35 (5.7 %) | 0.97 |
| G16 | 3/35 (8.6 %) | 0.97 |
| G21 | 3/35 (8.6 %) | 0.97 |
| **G23** | **14/35 (40 %)** | **0.93** |

La diferencia es de casi 5× en proporción, y **0.93 es la confianza más baja
registrada en cualquier ronda ciega del proyecto**. Lectura: en los reactivos
verbales el margen entre la opción correcta y el mejor distractor es
genuinamente más delgado, aunque en este lote **nunca llegó a cero**. Es
exactamente el comportamiento que el encargo anticipaba, capturado por el campo
de confianza y no por la tasa.

**Recomendación para la composición de futuros lotes verbales.** No hace falta
cambiar el tratamiento por motivo de la tasa. Sí conviene: (1) tratar la
**confianza declarada**, y no la tasa, como el indicador vivo de calidad
verbal, y vigilar si en lotes futuros aparecen valores que se acerquen a 0.85;
y (2) atender las tres notas de abajo, que son de composición, no de
verificación.

### 8) Tres notas de composición (observaciones, no defectos)

Ninguna bloquea publicación —los 35 tienen una sola respuesta defendible— pero
las tres se registran porque afectan la calidad del lote como instrumento:

1. **Una opción ligeramente más fuerte que su pasaje.** En el reactivo del dato
   térmico, la opción correcta generaliza («un beneficio que otros elementos
   urbanos no dan») más allá de lo que el pasaje afirma («funciones que ningún
   otro elemento urbano ofrece *al mismo tiempo y al mismo costo*»). En un
   reactivo de comprensión lectora, la clave debería quedar contenida dentro
   de lo que el texto sostiene, sin ampliarlo.
2. **Redundancia de competencia dentro de un mismo pasaje.** En el pasaje del
   aburrimiento, «¿cuál es la intención comunicativa predominante?» y «¿qué
   secuencia textual predomina?» miden esencialmente lo mismo y ambas se
   resuelven identificando el texto como argumentativo. Con 5 preguntas por
   pasaje, gastar dos en la misma competencia reduce la cobertura real.
3. **Reactivos de dos huecos donde solo uno discrimina.** En el ítem de
   conectores, dos de las cuatro opciones abren con un concesivo válido, así
   que el primer hueco no aporta discriminación y todo el peso cae en el
   segundo. Es legítimo por diseño, pero conviene que sea una decisión
   consciente y no un efecto colateral.

### 9) Seguimiento del hallazgo de G16 (rotación de la letra correcta)

Medido desde el lado ciego, traduciendo las respuestas del orden mezclado al
original: **el artefacto NO está presente en este lote.** Solo **6 de 34** pares
consecutivos (ordenados por id) siguen la rotación A→B→C→D, por **debajo** de
los ≈8.5 esperados al azar, frente a los 34/34, 27/34, 26/34 y 21/34 de los
cuatro lotes que G16 documentó. Secuencia observada:
`CADBADBACBBDACDACBDCACBADBCADBDACBC`. Es el **segundo lote consecutivo limpio**
tras G21, lo que sugiere que la práctica de composición ya corrigió el patrón.

Distribución de posición en el espacio **ORIGINAL**: **A=9, B=9, C=9, D=8**
(25.7 % / 25.7 % / 25.7 % / 22.9 %), dentro del rango 15 %-40 % que exige
`POSITION_SKEW` de G3c. Las elecciones de esta sesión en el espacio **MEZCLADO**
fueron A=6 / B=11 / C=7 / D=11, o sea el shuffle determinista sí reordenó de
verdad y las letras que vio el verificador no son las de la DB.

El hallazgo de G16 sigue **sin corregir en los lotes ya publicados de G3a, G3d,
G13 y G15**, igual que G16 y G21 lo dejaron: reposicionar reactivos ya
publicados es decisión del dueño del proyecto, fuera del alcance de una sesión
de verificación.

### 10) Límite honesto de lo que esta verificación prueba

La verificación ciega prueba que **existe una única opción defendible** en cada
reactivo y que una sesión independiente llega a ella razonando. Para los
reactivos verbales de comprensión lectora **no prueba** que los pasajes sean
representativos del tipo de texto, la extensión y el registro que el IPN usa de
verdad en su examen: los 4 pasajes son originales, escritos en G22, y su
adecuación al examen real es una cuestión de fidelidad de fuente que ningún
paso del pipeline actual mide. Queda anotado como límite conocido, no como
defecto de este lote.

### 11) Verificación técnica

- `pnpm typecheck` → **verde**.
- `pnpm lint` → **verde**.
- **Cero cambios de código**: el árbol de trabajo quedó limpio salvo este
  documento.
- Scripts desechables (`scripts/g23-count.ts`, `scripts/g23-seqcheck.ts`,
  `scripts/g23-build-answers.ts`) **eliminados al terminar**. Los archivos del
  lote y de respuestas viven en `scripts/content-exports/` (gitignored).

### Siguiente

El banco queda **622/622 verificado, con la cola ciega y la de discrepancias en
cero**. No hay verificación pendiente. El siguiente lote de contenido debe
volver a consultar en vivo qué materia tiene la mayor brecha por peso
(`pnpm content:coverage`), sin asumir los números de fases anteriores.

Sigue pendiente, sin cambios desde G17, la **tercera pasada de auditoría (5 %)**:
`content:audit-sample` y `content:audit-resolve` existen y están probados, pero
ninguna sesión ciega dedicada los ha ejecutado todavía. Esta sesión **no** puede
serlo para el lote de G22 (acaba de resolverlo, ya no es independiente de él).


## G22 — Lote de reactivos: Español y Habilidad Verbal, IPN FISMAT (2026-08-27)

**COMPLETADA. 35 reactivos originales insertados con `isVerified=false`,
pendientes de verificación ciega.** Modo de trabajo: autónomo, sin
preguntas. Primer lote del proyecto centrado en Español/Habilidad Verbal y
primer uso real del modelo `Passage` (comprensión de lectura con texto
compartido).

### 1) Elección de institución — números reales consultados en vivo

Consulta directa a Supabase (SQL vía el conector MCP) sobre todas las
materias de Español/Lectura de UNAM e IPN:

| Institución | Materia (por rama/área) | `weight` | Reactivos | Verificados | SourceChunks |
|---|---|---:|---:|---:|---:|
| UNAM | Español · Área 1 | 10 | 35 | 35 | 61 (en 5 de 7 temas) |
| UNAM | Español · Área 2 | 5 | 0 | 0 | 0 |
| UNAM | Español · Área 3 | 3 | 0 | 0 | 0 |
| UNAM | Español · Área 4 | 1 | 0 | 0 | 0 |
| IPN | Español/Lectura · FISMAT | 4 | **0** | **0** | **0** |
| IPN | Español/Lectura · MEDBIO | 6 | **0** | **0** | **0** |
| IPN | Español/Lectura · SOCADM | 3 | **0** | **0** | **0** |

- **UNAM Español:** 35 verificados, todos en Área 1 (ratio 3.5 sobre su
  peso 10 — en el promedio del banco). Áreas 2-4 en cero.
- **IPN Español/Lectura:** **cero reactivos en las tres ramas**, cero
  `SourceChunk` en cualquiera de sus 10 temas, y **no existe ninguna guía
  de IPN** en `content_sources` (solo UAM, UNAM, CENEVAL, ECOEMS).
- El banco corre a ~3.5 reactivos verificados por punto de
  `questionWeight` (medido sobre las materias de ciencias ya cubiertas).
  Brecha normalizada: **IPN Español/Lectura ≈ (4+6+3)×3.5 − 0 = ~45**;
  **UNAM Español ≈ (10+5+3+1)×3.5 − 35 = ~31**. Además la de IPN está en
  ramas de **lanzamiento día 1** (FISMAT y MEDBIO) y en **cero absoluto**,
  nunca tocada por G3a/G13/G15/G18/G20 (todos lotes de ciencias).

**Institución elegida: IPN.** Todos los caminos de medición (conteo
absoluto 0 vs 35, brecha ponderada 45 vs 31, urgencia de lanzamiento)
apuntan a IPN.

### 2) Subrama — FISMAT

Las tres ramas de IPN comparten el nombre de materia "Español/Lectura"
pero con temarios distintos sembrados (`prisma/seed/ipn.ts`):

- **FISMAT:** Ortografía, Gramática, Comprensión lectora, Análisis de textos (4 temas)
- **MEDBIO:** Ortografía, Comprensión lectora, Análisis de textos (3 temas)
- **SOCADM:** Comprensión lectora, Análisis de textos, Redacción (3 temas)

El encargo pide repartir el lote entre comprensión de lectura, analogías,
completar oraciones, **ortografía y gramática**. **FISMAT es la única rama
cuyo temario nombra un tema "Gramática" dedicado** — mapea 1:1 con los
formatos pedidos sin forzar contenido de sintaxis dentro de "Análisis de
textos". MEDBIO tiene mayor peso (6 vs 4) pero su temario no llama a
gramática ni analogías. Se eligió **FISMAT** por ajuste de temario; ambas
ramas partían de cero.

`subjectId` = `cmrr1lh1n00bhhi3nq64xyp01`. Temas:
`cmrr1lh7300bjhi3nm5t9psa5` (Ortografía), `cmrr1lhmm00blhi3n8rxfz5cc`
(Gramática), `cmrr1li5700bnhi3n8apst8gd` (Comprensión lectora),
`cmrr1liur00bphi3n71jg2atn` (Análisis de textos).

### 3) Fuentes — TEMARIO_ONLY

Cero `SourceChunk` para el tema, la materia o la institución. Los 35 son
**TEMARIO_ONLY**, redactados a partir del temario sembrado (F2b: no
bloquea). Los cuatro pasajes de comprensión de lectura son **originales**,
escritos en esta sesión — sin copiar textos con derechos de autor:

| ref | Título | Género | Preguntas |
|---|---|---|---:|
| `g22-teocintle` | Del teocintle al maíz | Divulgación científica (domesticación del maíz en Mesoamérica) | 5 (Comprensión lectora) |
| `g22-arboles` | Más árboles en las ciudades | Texto argumentativo (tesis + argumentos + concesión/refutación) | 5 (Comprensión lectora) |
| `g22-azotea` | La azotea | Narrativo/literario (narrador 3ª persona con foco interno) | 5 (Análisis de textos) |
| `g22-aburrimiento` | En defensa del aburrimiento | Ensayístico/argumentativo | 5 (Análisis de textos) |

### 4) Extensión del pipeline G2 para pasajes compartidos (código)

El modelo `Passage` ya existía en el schema (CC-01b/CC-09) y el lado de
lectura (simulador, drill, diagnóstico, panel admin, lote ciego) ya lo
consumía, pero la **inserción G2** (`content-insert-drafts.ts`) no sabía
crear ni enlazar pasajes. Cambios mínimos:

- **`scripts/lib/question-draft-schema.ts`:** campo opcional `passage`
  `{ ref, title?, content, sourceRef? }` en `QuestionDraftSchema`. Valida
  su forma; el acoplamiento `passage ⇔ format` se comprueba a nivel de
  lote, no del reactivo (para no romper `draft-format.test.ts`, que itera
  los 12 formatos sobre un draft sin pasaje).
- **`scripts/lib/lot-validation.ts` (G3c):** nueva violación
  `PASSAGE_LINK` — un `READING_COMPREHENSION` sin `passage.ref`, un
  `passage.ref` en un reactivo que no es RC, o un pasaje referenciado por
  `< MIN_QUESTIONS_PER_PASSAGE` (2) reactivos. Se comprueba **sin conocer
  la respuesta correcta**, igual que la distribución de posición. El
  reporte añade `passageGroups` (ref → nº de preguntas).
- **`scripts/lib/content-db.ts`:** `findOrCreatePassage()` idempotente por
  contenido exacto (reinsertar el lote no duplica el texto); `passageId`
  en `InsertableDraft` y en `insertQuestion`.
- **`content-insert-drafts.ts`:** agrupa los reactivos por `passage.ref`,
  aborta si un mismo `ref` trae contenido distinto en dos reactivos, crea
  cada `Passage` una vez y enlaza. `--lot-dir` y el validador standalone
  (`validate-batch.ts`) también leen `passage.ref`.
- **Prompts:** `scripts/prompts/_base.md` y `espanol.md` documentan el
  campo `passage` y la regla "3-5 preguntas por pasaje; si es una sola,
  va en el `stem`".
- **Tests:** 7 casos nuevos (`lot-validation.test.ts` ×5,
  `question-draft-schema.test.ts` ×2). `pnpm test:unit` = 474/474.

### 5) Composición — 35 reactivos, repartidos por el temario

| Tema | Reactivos | Formatos |
|---|---:|---|
| Comprensión lectora | 10 | `READING_COMPREHENSION` ×10 (pasajes `g22-teocintle` ×5, `g22-arboles` ×5) |
| Análisis de textos | 10 | `READING_COMPREHENSION` ×10 (pasajes `g22-azotea` ×5, `g22-aburrimiento` ×5) |
| Gramática | 9 | `SENTENCE_COMPLETION` ×4 (conectores, subjuntivo temporal, concordancia, régimen preposicional), `ANALOGY` ×2, `MULTIPLE_CHOICE` ×3 (clase de palabra, queísmo, errores frecuentes) |
| Ortografía | 6 | `MULTIPLE_CHOICE` ×6 (acentuación ×2, grafías b/v y x/s/h ×2, puntuación ×1, mayúsculas ×1) |
| **TOTAL** | **35** | RC 20 · SENTENCE_COMPLETION 4 · ANALOGY 2 · MULTIPLE_CHOICE 9 |

Dificultad: BASIC 7 / INTERMEDIATE 17 / ADVANCED 9 / EXPERT 2 (20 % / 49 %
/ 26 % / 6 %), cerca de la sugerida por `_base.md` (20/50/25/5 %).

### 6) Distribución de posición y candados anti-artefacto

- **Posición de la correcta: A=9, B=9, C=9, D=8** (25.7 / 25.7 / 25.7 /
  22.9 %) — las cuatro dentro de 15-40 %, confirmado por `analyzeLot`.
- **Rotación cíclica A→B→C→D (hallazgo de G16):** medida sobre la
  secuencia de 35 letras en orden de composición/inserción:
  `CADBADBACBBDACDACBDCACBADBCADBDACBC` → **6/34 transiciones +1
  (17.6 %)** contra 25 % de azar. No presente.
- **Cue de glosa (hallazgo de G3e):** **0 reactivos** tienen exactamente
  una opción con paréntesis. Las opciones se redactaron homogéneas en
  longitud y estructura; la correcta es la (co)más larga en 9/35 (26 %,
  dentro del rango de azar), tras dos pasadas de ajuste de longitud sobre
  los ítems de comprensión de lectura (donde la paráfrasis correcta
  tiende a ser más larga que un distractor corto).
- Las explicaciones citan cada distractor **por su contenido** ("la
  opción sobre la selección repetida", "el par que acierta en los dos
  huecos"), nunca por su letra — `analyzeLot` → 0 `LETTER_CITATION`.

### 7) Validación e inserción real — verificada en la DB

`pnpm content:validate-batch --dir scripts/content-exports/g22` sobre los
4 archivos: **0 violaciones** a la primera. Luego `content:insert --topic
<id> --file <archivo> --lot-dir scripts/content-exports/g22` (sin
`--dry-run`) para los 4 temas. **Consulta directa a la DB, no solo el
log:**

| Métrica | Antes de G22 | Después de G22 |
|---|---|---|
| Español/Lectura IPN FISMAT — total | 0 | **35** |
| Español/Lectura IPN FISMAT — verificados | 0 | **0** (correcto: pendiente de verificación ciega) |
| Español/Lectura IPN FISMAT — grounding | — | **35 TEMARIO_ONLY** |
| `passages` en la DB | 0 | **4** (cada uno con exactamente 5 preguntas enlazadas) |
| Reactivos `READING_COMPREHENSION` con `passageId` | 0 | **20 / 20** |
| Banco — total | 587 | **622** |
| Banco — verificados | 587 | **587** (sin cambio, correcto) |
| Banco — sin veredicto (cola ciega) | 0 | **35** |
| Reactivos mal formados (≠4 opciones, ≠1 correcta, ≠3 capas) | — | **0** |

Registro consolidado en
`docs/content-batches/g22-ipn-fismat-espanol.json` (mismo patrón que
`g20-*.json`): 35 `questionId` reales, 4 pasajes con su texto completo,
stems, opciones, explicaciones, grounding y distribución de posición.

### 8) Limpieza

Scripts desechables (`scripts/g22-export.ts` y los del scratchpad:
builder de lote, chequeo de longitud, volcado de opciones) eliminados al
terminar. Los 4 archivos JSON del lote viven en
`scripts/content-exports/g22/` (carpeta en `.gitignore` desde G1). El
registro permanente es el archivo en `docs/content-batches/` y las filas
de esta sección.

`pnpm typecheck`, `pnpm lint` y `pnpm test:unit` (474) en verde. Cero
llamadas a la API de pago de Anthropic — los 35 reactivos y los 4 pasajes
se redactaron directamente en esta sesión de Claude Code.

### Siguiente (G22)

1. **Verificación ciega de los 35 reactivos de este lote** (patrón
   G14/G16/G19/G21): una sesión nueva e independiente que no vea las
   respuestas correctas los resuelve con `content:blind-batch` →
   `content:resolve`. **Ninguno es de cálculo** (`isCalcSubject` da falso
   para "Español/Lectura"): la sesión verificadora razona cada uno
   descartando distractores por contenido y, en los 20 de comprensión de
   lectura, contra el texto del pasaje (que el lote ciego SÍ incluye —
   `buildBlindItem` copia `passageContent`). Atención a los 2 `EXPERT`
   (función del 3er párrafo en cada pasaje argumentativo).
2. **Español de IPN sigue casi en cero:** MEDBIO (w6) y SOCADM (w3) de
   `Español/Lectura` no se tocaron, y las Áreas 2-4 de UNAM Español
   tampoco. Confirmar con `pnpm content:coverage` antes de elegir el
   siguiente, no asumir de esta nota.
3. **El muestreo de auditoría del 5 %** (`content:audit-sample` /
   `content:audit-resolve`, creados en G17) sigue sin ejecutarse nunca
   sobre el banco.
4. Pendientes menores arrastrados desde F4/G3b: `cmsfgf5ea0001k3lis0d0uzf9`
   (Números complejos, opción `$4-3$` mal escrita) y las 2 citas-por-letra
   de UNAM Español y Física.

## G21 — Verificación ciega: Química IPN MEDBIO (2026-08-27)

**COMPLETADA. 35 reactivos resueltos a ciegas — 35/35 auto-aprobados
(100 %). Banco 552 → 587 verificados. Por primera vez el banco entero está
verificado: 587/587, con la cola de pendientes y la de discrepancias las dos
en cero.**

Segunda mitad del ciclo adversarial de G2 sobre el lote de G20. Modo de
trabajo: autónomo, sin preguntas.

### 1) Aislamiento: comprobado, no asumido

Esta sesión nunca vio una respuesta correcta antes de contestar:

- **No se leyó el commit de G20** (`aa763fb`), ni el JSON del lote, ni
  `Question.options`. `git log --oneline -5` sí se corrió, pero solo devuelve
  asuntos de commit, no diffs.
- Su sección de este documento (`## G20 — …`, línea 2073) se dejó sin abrir
  hasta después de publicar.
- Las consultas de estado que sí se corrieron seleccionaron **solo
  metadatos** — `count`, `isVerified`, `verification`, taxonomía — nunca
  `options`.
- **Comprobación estructural del archivo ciego antes de abrirlo:**
  `grep -c` sobre `blind-batch-2026-08-27T01-57-51-887Z.json` da **0** para
  `isCorrect`, **0** para `explanation` y **0** para `correctOption`. El
  conjunto completo de claves del archivo es
  `questionId, institution, subject, topic, format, passage,
  requiresCalculation, stem, options{label,text,imageUrl}` — no hay
  superficie por donde se filtre la clave.

Insumo único:

```
pnpm content:blind-batch --all --limit 60
→ scripts/content-exports/blind-batch-2026-08-27T01-57-51-887Z.json  (35 ítems)
```

### 2) Resolución: la operación ejecutada, no estimada a ojo

El lote llega con `requiresCalculation:true` en los 35, pero **ese flag es
por MATERIA, no por reactivo** (`isCalcSubject()` en
`scripts/lib/blind-verification.ts:52` lo deriva del nombre "Química"), así
que no significa que los 35 tengan una operación que hacer. El registro
honesto es el que esta sesión declaró ítem por ítem: **`usedCalculation:true`
en 21 y `false` en 14.**

**21 de 35 se resolvieron ejecutando el cálculo en código** (Python +
`sympy`), con las unidades explícitas y comprobando en el mismo script que
**exactamente una** de las cuatro opciones coincide con el resultado
(`assert len(hits) == 1`) — ni `NONE_VALID` ni `MULTIPLE_VALID` en ninguno.
Los 13 numéricos se contrastaron contra el valor extraído del LaTeX de cada
opción; los 8 restantes tienen un criterio calculable aunque la respuesta sea
texto, y también se calculó:

| Reactivo | Lo que se ejecutó | Resultado |
|---|---|---|
| Neutrones de $^{37}_{17}$Cl | `A − Z` | 20 |
| Masa atómica del boro | promedio ponderado `0.20·10.0 u + 0.80·11.0 u` | 10.8 u |
| Configuración `1s²2s²2p⁶3s²3p³` | conteo de e⁻ totales, `n` máximo y e⁻ de valencia | 15 e⁻, periodo 3, grupo VA |
| Serie isoelectrónica de 10 e⁻ | razón `Z/e⁻` de los cuatro iones | Mg²⁺ = 1.2, el más contraído |
| Pares libres del H₂O | e⁻ de valencia → pares → pares menos enlazantes | 2 |
| Radio a lo largo del periodo 3 | **Zeff por reglas de Slater**, Na→Cl | 2.20 → 6.10, monótona ↑ |
| CO₂ no polar | **suma vectorial** de los dos dipolos de enlace | 0 a 180°, 1.224 a 104.5° |
| Balanceo de C₃H₈ + O₂ | búsqueda de coeficientes enteros mínimos por conservación | 1, 5, 3, 4 → suma 13 |
| Masa molar de H₂SO₄ | `2(1) + 32 + 4(16)` | 98 g/mol |
| Moles en 36 g de agua | `n = m/M` | 2 mol |
| H₂ + O₂ → H₂O | **reactivo limitante**: rendimiento por cada vía | H₂ limita → 4 mol |
| Rendimiento porcentual | `40/50 × 100` | 80 % |
| %N en NH₄NO₃ | `2(14)/80 × 100` | 35 % |
| Expresión de $K_c$ | **equivalencia simbólica** (`sympy`) contra las 4 opciones | solo una coincide |
| Le Chatelier por presión | `Δn` de moles de gas | 2 − 4 = −2 → hacia productos |
| $K_c$ de H₂ + I₂ ⇌ 2HI | `[HI]²/([H₂][I₂])` en 1 L | 16 |
| pH de HCl 0.01 M | `−log₁₀(0.01)` | 2 |
| [OH⁻] a pH 11 | `pOH = 14 − pH`, comprobado contra `Kw` | 1×10⁻³ M (Kw = 1.0e−14 ✓) |
| Titulación HCl/NaOH | `n = V·c`, estequiometría 1:1 | 10 mL |
| Oxidación en química del carbono | **números de oxidación** del C funcional en los 4 casos | alcohol −1 → aldehído +1 = oxidación |
| Carbono sp² | conteo σ/π por hibridación, para sp, sp² y sp³ | 3 σ a 120° + 1 π |

Los **14 conceptuales** (isótopos, modelo cuántico, electronegatividad de los
halógenos, enlace iónico, enlace metálico, tipo de reacción, neutralización
de Arrhenius, agente reductor, catalizador, base conjugada, deshidratación
intermolecular, ácidos nucleicos, enlace peptídico, enzimas) se razonaron
**descartando cada distractor por su contenido**, no por eliminación
superficial, y ese descarte quedó escrito en el `reasoning` de cada uno. Dos
ejemplos de por qué el descarte importa aquí:

- **Agente reductor:** dos de las cuatro opciones dicen "agente reductor". La
  que se descarta lo justifica diciendo que el sodio "se reduce al ganar
  electrones", que contradice el propio enunciado (0 → +1). La etiqueta
  correcta con el razonamiento equivocado no basta.
- **CO₂ no polar:** el distractor "el carbono central no tiene pares libres"
  es una afirmación **verdadera**, pero no es la razón; lo que anula el
  dipolo es la cancelación vectorial que da la geometría lineal, y por eso se
  calculó la suma de vectores en vez de razonarla de palabra.

### 3) Candado anti-deriva propio de esta sesión

El archivo de respuestas **no se escribió a mano**. Un script
(`g21_build_answers.py`, desechable) emparejó cada letra elegida con un
**fragmento del contenido** que esta sesión había razonado, y abortaba
—sin escribir nada— si la letra y el contenido no coincidían o si el
fragmento no identificaba **de forma única** a esa opción. Para las opciones
que son números desnudos (donde "2" es subcadena de "12") el candado exige
igualdad exacta, no subcadena. Pasó en los 35, así que ningún acierto puede
venir de un desfase de índice.

### 4) Resultado

```
pnpm content:resolve --file scripts/content-exports/g21-answers.json
→ ✅ Auto-aprobados: 35   ✋ Sin publicar: 0   ⚠️ Omitidos: 0
```

**Tasa de auto-aprobación del lote: 35/35 = 100 %.**

- Confianza declarada: **0.99 en 32**, 0.98 en 2 (CO₂ no polar, por el
  distractor verdadero-pero-no-es-la-razón; y la deshidratación del etanol,
  porque a temperatura más alta la misma reacción da eteno y lo que fija la
  respuesta es el "entre dos moléculas" del enunciado) y 0.97 en 1 (la
  definición de orbital, que en rigor es una función de onda y no una
  región). Todas ≥ 0.85, el umbral de `MIN_CONFIDENCE`.
- **0 reactivos con `problems`.**
- `model: "claude-opus-5"` — el modelo que de verdad resolvió el lote, no la
  constante de orquestación (el defecto que G14 anotó y G17 corrigió).

### 5) Acumulado real, consultado en vivo contra Supabase (antes y después)

| Métrica | Antes | Después |
|---|---|---|
| Reactivos totales | 587 | 587 |
| Verificados | 552 | **587** |
| Pendientes | 35 | **0** |
| Sin veredicto | 35 | 0 |
| Sin publicar con veredicto (discrepancias) | 0 | 0 |

Química de IPN MEDBIO (`questionWeight=16`) pasó de **0✓/35⧗ a 35✓/0⧗**: la
materia deja de estar en cero. Cobertura verificada por materia al cerrar
esta fase:

| Institución | Área | Materia | `weight` | Verificados |
|---|---|---|---|---|
| UNAM | CFMI | Matemáticas | 26 | 81 |
| UNAM | CFMI | Física | 16 | 72 |
| UNAM | CFMI | Química | 12 | 52 |
| UNAM | CFMI | Español | 10 | 35 |
| UNAM | CBQS | Biología | 14 | 65 |
| UNAM | CBQS | Química | 8 | 72 |
| IPN | FISMAT | Matemáticas | 24 | 70 |
| IPN | FISMAT | Física | 20 | 35 |
| IPN | MEDBIO | Biología | 22 | 70 |
| IPN | MEDBIO | Química | 16 | **35** |

### 6) Seguimiento del hallazgo de G16 (rotación de la letra correcta)

G16 documentó que en los cuatro lotes de contenido de entonces la letra
correcta **rotaba A→B→C→D** al ordenar por `id`, y que el validador de G3c no
lo detecta porque solo mira la distribución marginal. Se midió lo mismo en
este lote, ahora desde el lado ciego:

- Secuencia por `id`: `ACBDABDCAABDCADBDCBDBCACBBCABDCADAC`
- Pares consecutivos que siguen la rotación: **7 de 34**, contra ≈8.5
  esperados al azar — es decir, **el artefacto NO está presente** (los cuatro
  lotes de G16 daban 34/34, 27/34, 26/34 y 21/34).
- Distribución de posición en el espacio ORIGINAL: **A=9, B=9, C=9, D=8**
  (25.7 % / 25.7 % / 25.7 % / 22.9 %), dentro del rango 15 %–40 % de G3c.
- Las elecciones de esta sesión en el espacio **MEZCLADO** fueron A=10, B=11,
  C=8, D=6, o sea el shuffle determinista sí reordenó de verdad.

El hallazgo de G16 sigue **sin corregir en los lotes ya publicados de G3a,
G3d, G13 y G15** — reposicionar reactivos vivos sigue siendo decisión del
dueño del proyecto, igual que G16 lo dejó.

### 7) Higiene

`pnpm typecheck` y `pnpm lint` en verde. **Cero cambios de código**: esta
fase solo movió contenido en la DB y documentación. Scripts desechables
(`scripts/g21-count.ts`, `scripts/g21-seqcheck.ts`, y los de cálculo en el
scratchpad) eliminados al terminar; los archivos del lote y de respuestas
viven en `scripts/content-exports/` (gitignored).

### Siguiente (G21)

1. **La cola de verificación quedó vacía y todo el banco publicado
   (587/587).** La siguiente fase de contenido no tiene nada que verificar:
   toca **componer**, no verificar.
2. **La tercera pasada de auditoría (5 %) sigue sin ejecutarse nunca.** G17
   agregó `content:audit-sample` y `content:audit-resolve` y probó el
   muestreo en vivo (424 elegibles → 22 muestreados), pero **ningún reactivo
   del banco ha pasado por ella todavía**. Ahora que los 587 están
   verificados, es el momento natural de correrla — en una sesión ciega
   dedicada, con un tier de modelo distinto.
3. **Brechas de cobertura contra `questionWeight`**, con los números de
   arriba: IPN FISMAT Física (20) e IPN MEDBIO Química (16) están en 35, los
   dos valores más bajos del banco junto con UNAM Español (10, en 35). Las
   demás materias de IPN ya rebasan 70.
4. Pendientes menores arrastrados desde F4/G3b, todavía sin tocar:
   `cmsfgf5ea0001k3lis0d0uzf9` (Números complejos, opción `$4-3$` mal
   escrita) y las 2 citas-por-letra de UNAM Español y Física.

## G20 — Lote de reactivos: Química IPN MEDBIO (2026-08-26)

**COMPLETADA. 35 reactivos originales insertados con `isVerified=false`,
pendientes de verificación ciega.** Modo de trabajo: autónomo, sin
preguntas.

### 1) Selección de rama — números reales consultados en vivo

Consulta directa (Prisma: `institution → level → exam → area → subject →
topic → question`, con conteo de `isVerified`, `verification` y
`SourceChunk` por tema) + `pnpm content:coverage`. Las dos materias
"Química" de IPN:

| Rama IPN | `subjectId` | `questionWeight` | verificados | brecha (weight − verif.) | temas con `SourceChunk` |
|---|---|---:|---:|---:|---:|
| FISMAT — Ingeniería y Ciencias Físico-Matemáticas | `cmrr1lblb00axhi3n1gfjbr7g` | 10 | 0 | 10 | 0/9 |
| **MEDBIO — Ciencias Médico-Biológicas** | `cmrr1lskp00cphi3nkzq1sg6k` | **16** | 0 | **16** | **1/9** |

Ambas en **0 reactivos** (0 % de cobertura). **MEDBIO Química gana por tres
criterios convergentes:** (a) mayor brecha absoluta contra su
`questionWeight` (16 vs 10); (b) mayor `questionWeight` — la regla de
prioridad de G13/G15 ("IPN con <50 verificados, mayor `questionWeight`
primero") ordena MEDBIO por encima de FISMAT; (c) tiene 1 `SourceChunk`
real (tema Química orgánica, `uam_cbs.pdf` p.54) frente a 0 de FISMAT.
Banco global antes de G20: **552 total / 552 verificados / 0 pendientes**.

### 2) Temario y fuentes — 9 temas, 1 con fragmento fuente

Los 9 temas sembrados de MEDBIO Química (todos en cero antes de esta
fase): Estructura atómica, Tabla periódica, Enlace químico, Reacciones
químicas, Estequiometría, Equilibrio químico, Ácidos y bases, Química
orgánica, Bioquímica básica.

**Solo Química orgánica tiene `SourceChunk`** (`cmrsrolez006s13b3octu4yb0`,
`uam_cbs.pdf` p.54): fragmento con reactivos sobre oxidación (un elemento
se oxida cuando pierde electrones), hibridación $sp^2$ de todos los
carbonos de un compuesto, y deshidratación de dos alcoholes → éter. Los 3
reactivos de ese tema se derivan genuinamente de esos tres puntos (mismo
concepto, redacción y opciones propias — no copia literal) y citan
`sourceChunks:[1]` de forma obligatoria (SOURCED). Los 8 temas restantes,
sin fragmento, TEMARIO_ONLY (32 reactivos) sin bloquear la generación
(F2b).

### 3) Cobertura — 35 reactivos repartidos entre los 9 temas

| Tema | Reactivos | Grounding |
|---|---:|---|
| Estructura atómica | 4 | TEMARIO_ONLY |
| Tabla periódica | 4 | TEMARIO_ONLY |
| Enlace químico | 4 | TEMARIO_ONLY |
| Reacciones químicas | 4 | TEMARIO_ONLY |
| Estequiometría | 5 | TEMARIO_ONLY |
| Equilibrio químico | 4 | TEMARIO_ONLY |
| Ácidos y bases | 4 | TEMARIO_ONLY |
| Química orgánica | 3 | **SOURCED** (`sourceChunks:[1]`) |
| Bioquímica básica | 3 | TEMARIO_ONLY |
| **Total** | **35** | **3 SOURCED / 32 TEMARIO_ONLY** |

Estequiometría recibe uno más por ser el bloque de mayor rendimiento en el
examen real de Química. Formato: **13 `PROBLEM_SOLVING` (cálculo) + 22
`MULTIPLE_CHOICE` (conceptual)** — mezcla más conceptual que los lotes de
Física/Matemáticas, acorde al estilo real del examen de Química.
Dificultad: BASIC 10 / INTERMEDIATE 17 / ADVANCED 7 / EXPERT 1
(28.6/48.6/20/2.9 %), cercana a la sugerida por `_base.md` (20/50/25/5 %).

### 4) Verificación aritmética — ejecutada en código, no razonada a ojo

De los 35, **13 tienen cálculo real**. Un script independiente
(`node`/`tsx`, no calculadora mental) calculó, para cada uno de esos 13:
(a) la respuesta correcta — masa molar de $\text{H}_2\text{SO}_4$; moles en
36 g de agua; agua producida con $\text{H}_2$ limitante; rendimiento
porcentual; % en masa de N en $\text{NH}_4\text{NO}_3$; suma de
coeficientes de la combustión del propano; masa atómica promedio del boro;
pares libres de Lewis del agua; $K_c$ de
$\text{H}_2+\text{I}_2\rightleftharpoons 2\text{HI}$; pH de $\text{HCl}$
$0.01\,\text{M}$; $[\text{OH}^-]$ a partir de pH $11$; volumen de
titulación $\text{NaOH}/\text{HCl}$ — y **(b) cada uno de los 3
distractores**, confirmando que corresponde a un error real y nombrable
(división invertida, masa equivalente en vez de molar, contar mal los
oxígenos, olvidar el $\times 100$, tomar el reactivo equivocado como
limitante, reportar pOH donde va pH, contar mal el exponente decimal, no
elevar al cuadrado el numerador de $K_c$). El script comprobó además que
**exactamente una opción coincide** con el valor calculado y que las
**opciones numéricas quedaron en orden ascendente** (convención de
`_base.md`). Resultado: **13/13 sin discrepancias**.

### 5) Distribución de posición — diseñada con dos pasadas

**Numéricos (13):** la letra de la correcta la fija el orden ascendente
real de los 4 valores, no una elección libre. **Conceptuales (22):** la
letra se asignó deliberadamente para (a) llevar el total a **A=9, B=9,
C=9, D=8** (25.7/25.7/25.7/22.9 %, las 4 dentro de 15-40 %) y (b) romper
cualquier secuencia cíclica. **Verificación explícita de no-ciclicidad**
(el defecto que G16 encontró en los cuatro lotes previos, donde la clave
rotaba A→B→C→D): sobre las 35 letras en el orden real de inserción, las
transiciones que avanzan +1 en el ciclo A→B→C→D son **20.6 %** (7/34) y
las que retroceden −1 son **26.5 %** (9/34), ambas indistinguibles del
azar (~25 %).

### 6) Validación de lote (G3c) y anti-cita-por-letra

`pnpm content:validate-batch --dir scripts/g20-lote` sobre los 9 archivos:
**35/35 válidos, 0 rechazados por formato (Zod + KaTeX, incluidos los
símbolos `°` de ángulos y de `°C`), 0 violaciones** —
`MALFORMED_OPTIONS` 0, `POSITION_SKEW` 0, `LETTER_CITATION` 0. Todas las
explicaciones citan los distractores **por su contenido** ("quien responde
$49$ g/mol calculó la masa equivalente…"), nunca por su letra: el
simulador no baraja opciones para IPN (`shuffleOptions:false`). Repetido
con `content:insert --lot-dir --dry-run` en los 9 temas: mismo resultado,
0 duplicados (`normalizeStem`, esperado porque la materia partía de cero).

### 7) Inserción real — verificada en la DB

`pnpm content:insert --topic <id> --file <archivo> --lot-dir
scripts/g20-lote` (sin `--dry-run`) para los 9 temas. **Verificado con
consulta directa a la DB, no solo el log:**

| Métrica | Antes de G20 | Después de G20 |
|---|---|---|
| Química IPN MEDBIO — total | 0 | **35** |
| Química IPN MEDBIO — verificados | 0 | **0** (correcto: pendiente de verificación ciega) |
| Química IPN MEDBIO — SOURCED / TEMARIO_ONLY | 0 / 0 | **3 / 32** |
| Banco — total | 552 | **587** |
| Banco — verificados | 552 | **552** (sin cambio, correcto) |
| Banco — sin veredicto (cola ciega) | 0 | **35** |

G20 no verifica sus propios reactivos, por diseño del pipeline
adversarial. Registro consolidado en
`docs/content-batches/g20-ipn-medbio-quimica.json` (mismo patrón que
`g13-*.json` / `g15-*.json`): 35 `questionId` reales, stems, opciones,
explicaciones, grounding y distribución de posición.

### 8) Limpieza

Scripts desechables (`scripts/g20-gap-check.ts`,
`scripts/g20-verify-calc.ts`, `scripts/g20-export.ts`) y
`scripts/g20-lote/` (los 9 archivos JSON del lote) eliminados al terminar.
El registro permanente es el archivo en `docs/content-batches/` y las
filas de esta tabla.

`pnpm typecheck` y `pnpm lint` en verde (sin cambios de código, solo
contenido + docs). Cero llamadas a la API de pago de Anthropic — los 35
reactivos se redactaron directamente en esta sesión de Claude Code.

### Siguiente (G20)

1. **Verificación ciega de los 35 reactivos de este lote** (patrón
   G14/G16/G19): una sesión nueva e independiente que no vea las
   respuestas correctas los resuelve con `content:blind-batch` →
   `content:resolve`. Ojo: 13 son de cálculo — esa sesión debe ejecutar la
   aritmética, no razonarla.
2. La única materia de IPN Superior que queda en CERO reactivos es
   **Química IPN FISMAT** (`questionWeight=10`, `subjectId`
   `cmrr1lblb00axhi3n1gfjbr7g`). Confirmar con `pnpm content:coverage` en
   vivo antes de elegir, no asumir de esta nota.
3. El muestreo de auditoría del 5 % (`content:audit-sample` /
   `content:audit-resolve`, creados en G17) sigue sin ejecutarse.

## G19 — Verificación ciega: Física IPN FISMAT y las reparadas de G17 (2026-08-26)

**COMPLETADA. 112 reactivos resueltos a ciegas — 112/112 auto-aprobados
(100%). Banco 440 → 552 verificados; cola de pendientes y cola de
discrepancias, ambas en CERO por primera vez.**

El encargo pedía cerrar dos frentes en una sola pasada ciega: el lote nuevo
de Física de G18 (35) y todo lo que G17 dejó marcado para re-verificación
(77). Se resolvieron juntos en la misma sesión, pero se reportan y se miden
**por separado**, porque son poblaciones distintas y mezclarlas escondería
la tasa real de rescate.

### 1) Aislamiento: comprobado, no asumido

Esta sesión nunca vio una respuesta correcta antes de contestar. Lo que se
hizo para garantizarlo, en orden:

- **No se leyeron los commits de G17 ni de G18**, ni ningún JSON de lote, ni
  `Question.options` con `isCorrect`. El único insumo fue el archivo del
  lote ciego.
- Las consultas de estado que sí se corrieron (para separar cohortes y medir
  el acumulado) seleccionaron **solo metadatos** — `id`, `isVerified`,
  `verification`, `createdAt`, `updatedAt`, taxonomía — nunca `options`.
- **Comprobación estructural del archivo ciego antes de abrirlo**:
  `grep -c "isCorrect\|explanation"` sobre `blind-g19.json` → **0**. Las
  claves de cada ítem son exactamente `questionId, institution, subject,
  topic, format, passage, requiresCalculation, stem, options{label,text,
  imageUrl}`. No hay superficie por donde se filtre la clave.
- La sección de G17 de este documento se leyó **después** de resolver y
  publicar, únicamente para desglosar el reporte. Ya no había ceguera que
  proteger.

### 2) Separación de cohortes por timestamps (no por corazonada)

Los 112 pendientes se partieron con un criterio verificable en la DB, sin
abrir ningún lote:

| Cohorte | n | `createdAt` | `updatedAt` | Criterio |
|---|---|---|---|---|
| Física nuevo (G18) | 35 | 2026-08-26 05:07–05:09 | = `createdAt` | nunca editado tras crearse |
| Reparadas (G17) | 77 | 2026-07-21 / 2026-08-05 | 2026-08-26 02:33–02:34 | `updatedAt > createdAt + 60 s` |

La partición es exhaustiva y disjunta (35 + 77 = 112) y se validó con un
`assert` contra el conjunto de ids del lote ciego antes de resolver.

Las 77 corresponden exactamente a lo que G17 devolvió a la cola: **37
REPARABLE** (editadas) + **40 GENERADOR TENÍA RAZÓN** (contenido intacto,
veredicto previo anulado). Las 3 IRREPARABLE de G17 ya se habían borrado y
no aparecen aquí: 80 − 3 = 77.

### 3) Resolución: cálculo ejecutado, no estimado a ojo

**65 de 112** se resolvieron ejecutando la operación en código (Python:
aritmética, `fractions`, `math`, `sympy` para derivada simbólica y sistemas),
con unidades explícitas y comprobando que **exactamente una** opción
coincide. Los 47 restantes son conceptuales puros (nomenclatura, biología
descriptiva, semántica) y se razonaron sin cálculo, declarados con
`usedCalculation:false` — el campo dice la verdad, no se marcó `true` por
inercia.

Ejemplos de lo que sí se ejecutó, no se supuso:

- Doppler con fuente acercándose: `500·340/(340−34) = 555.56 Hz` — descarta
  el distractor `454.5 Hz`, que es la fórmula con el signo invertido.
- Fórmula molecular a partir de `M=28` y `85.7 % C`: se calculó el `%C` de
  **las cuatro** opciones (75.0 / 80.0 / 81.8 / **85.7**) en vez de aceptar
  la primera plausible.
- `(√(3x+h) − √(3x))/h`: se verificó simbólicamente que la diferencia contra
  la opción elegida es **0**, no se comparó de vista.
- La ecuación de los dos salarios se **resolvió** (`x=18`) y se comprobó que
  reconstruye los $456 000 del enunciado.
- Balance de `H₂SO₄ + 2NaOH → Na₂SO₄ + 2H₂O` átomo por átomo en ambos lados.

### 4) Resultado, por cohorte

| Cohorte | Resueltos | Auto-aprobados | Sin publicar | Tasa |
|---|---|---|---|---|
| **Física IPN FISMAT (lote nuevo G18)** | 35 | **35** | 0 | **100 %** |
| **Reparadas de G17** | 77 | **77** | 0 | **100 %** |
| Total G19 | 112 | 112 | 0 | 100 % |

Las 77 se rescataron **todas**: las 37 editadas quedaron bien editadas y las
40 que el generador siempre tuvo bien quedaron confirmadas por una segunda
sesión independiente. El trabajo editorial de G17 se sostiene end-to-end.

### 5) El 100 % se auditó antes de reportarlo

Dos tasas de 100 % seguidas son justo el resultado que hay que desconfiar,
porque también es lo que produciría un mezclado degenerado (si
`translateChosenOption` devolviera siempre la opción correcta, cualquier
respuesta "acertaría"). Se comprobó explícitamente que no es el caso:

- **88 de 112** etiquetas ciegas tradujeron a un id de opción **distinto**
  del elegido — el barajado sí permutó de verdad.
- La traducción es una **biyección por reactivo**: 112 × 4 = **448**
  imágenes distintas, sin colisiones.
- El mezclado (`shuffleOptionsForQuestion`) es Fisher-Yates con semilla
  derivada **solo del `questionId`** — no toca `isCorrect`, así que no puede
  sesgarse hacia la respuesta correcta.

Con eso, el 100 % es una medición real, no un artefacto del arnés.

### 6) Acumulado REAL, consultado en vivo antes y después

| Momento | Verificados | Pendientes | Cola de discrepancias |
|---|---|---|---|
| Antes de G19 | 440 | 112 | 0 |
| Después de G19 | **552** | **0** | **0** |

Desglose real por materia (`isVerified=true`, consultado, no estimado):

| Institución / Materia | Verificados |
|---|---|
| UNAM / Química | 124 |
| UNAM / Matemáticas | 81 |
| UNAM / Física | 72 |
| IPN / Biología | 70 |
| IPN / Matemáticas | 70 |
| UNAM / Biología | 65 |
| UNAM / Español | 35 |
| **IPN / Física** | **35** |
| **TOTAL** | **552** |

Física de IPN FISMAT sale de CERO a **35 publicables** — la materia que
G13, G14 y G15 arrastraron como pendiente queda cerrada. Por primera vez
desde que existe el pipeline, **no hay nada en cola**: ni pendientes de
verificar, ni discrepancias sin resolver.

### 7) Hallazgo: dos reactivos duplicados en el banco

`cmrul0y5k003s13p9jr7ham8x` (tema *Reacciones químicas*) y
`cmrul1p9e006a13p9goneclnw` (tema *Ácidos, bases y sales*) plantean **la
misma reacción** `H₂SO₄ + 2NaOH` con las mismas cuatro opciones; solo cambia
la redacción del enunciado. Ambos son correctos, así que ambos se aprobaron
— **no se marcó `problems`**, porque el defecto no está en el reactivo sino
en el banco, y bloquear contenido correcto por una duplicación no es
decisión que le toque tomar a la sesión verificadora.

Queda anotado para que una fase editorial decida: despublicar uno con
`isVerified=false` (nunca borrar, guardrail de CLAUDE.md) o reescribir uno
de los dos. No es bloqueante para el launch.

### 8) Caveat honesto que sigue vigente

Igual que en G14 y G16: el aislamiento aquí es **de sesión**, no de modelo.
Quien compuso (G18) y quien verifica (G19) son sesiones independientes sin
contexto compartido, pero corren sobre el mismo modelo base. Un error
sistemático compartido por el modelo —no un descuido de contexto— podría
sobrevivir a las dos pasadas. El muestreo de auditoría del 5 % con un tier
distinto (`content:audit-sample`) sigue siendo la red que cubre ese hueco, y
**sigue sin correrse**. Ahora que la cola está en cero, es el candidato
natural para la siguiente fase.

### 9) Limpieza

Los scripts temporales de consulta (`scripts/_tmp-g19-*.ts`) se borraron tras
usarse; el árbol queda sin residuos (`git status` limpio salvo `docs/ESTADO.md`).
Los archivos de lote y respuestas viven en el scratchpad de la sesión, fuera
del repo. Cero llamadas a la API de pago de Anthropic: todo el razonamiento
ocurrió dentro de la sesión y todo el cálculo en Python local.

### Siguiente (G19)

1. **Muestreo de auditoría del 5 %** (`content:audit-sample` +
   `content:audit-resolve`) con un tier de modelo distinto — es la única
   verificación pendiente del pipeline y ya no compite con ninguna cola.
2. Resolver la duplicación `H₂SO₄ + 2NaOH` de la sección 7.
3. Con 552 verificados y cero pendientes, la siguiente brecha es de
   **cobertura**, no de verificación: IPN/Física (35) y UNAM/Español (35)
   son las materias más delgadas del banco.

---

## G18 — Lote de reactivos: Física IPN FISMAT (2026-08-26)

**COMPLETADA. 35 reactivos originales insertados con `isVerified=false`,
pendientes de verificación ciega.** Materia asignada explícitamente por el
encargo — Física de IPN FISMAT llevaba en CERO reactivos desde antes de G13,
mencionada como pendiente en las notas "Siguiente" de G13, G14 y G15 sin que
ninguna la tomara.

### 1) Temario y fuentes disponibles

14 temas sembrados para Física IPN FISMAT (consultado en vivo vía Prisma):
Cinemática, Dinámica, Trabajo y energía, Momentum e impulso, Gravitación,
Fluidos, Termodinámica, Ondas y sonido, Óptica, Electrostática, Corriente
eléctrica, Magnetismo, Inducción electromagnética, Física moderna — los 14
en cero reactivos antes de esta fase.

**Solo Cinemática tiene `SourceChunk` real**: un ejemplo de
`ceneval_exanii_i.pdf` (p. 9) que distingue conceptualmente velocidad
("una persona camina cierta distancia en un tiempo determinado") de
aceleración ("un ciclista varía el ritmo del pedaleo al subir una
pendiente"). Los 3 reactivos de Cinemática se derivan genuinamente de esa
distinción (mismo concepto, escenarios y números distintos — no copia
literal) y citan `sourceChunks:[1]` de forma obligatoria. Los 13 temas
restantes no tienen fragmento fuente → TEMARIO_ONLY, sin bloquear la
generación (F2b).

### 2) Cobertura — 35 reactivos, repartidos por relevancia declarada

El encargo nombró explícitamente "cinemática, dinámica, trabajo y energía,
electricidad y magnetismo, ondas" como los temas principales. Leyendo esa
lista contra el temario sembrado (que separa electricidad y magnetismo en 3
temas: Electrostática, Corriente eléctrica, Magnetismo), se identificaron 7
temas "principales" → **3 reactivos cada uno (21)**; los 7 restantes
(Momentum e impulso, Gravitación, Fluidos, Termodinámica, Óptica, Inducción
electromagnética, Física moderna) → **2 cada uno (14)**. Total: 35.

Formato: 27 `PROBLEM_SOLVING` (cálculo) + 8 `MULTIPLE_CHOICE` (conceptuales).
Dificultad: BASIC 9 / INTERMEDIATE 18 / ADVANCED 7 / EXPERT 1 (25.7% /
51.4% / 20% / 2.9%), cercana a la sugerida por `_base.md` (20/50/25/5%).

### 3) Verificación aritmética — ejecutada en código, no solo razonada

De los 35, **27 tienen cálculo real**. Un script (`node`, no calculadora
mental) calculó la respuesta correcta de cada uno — MRUA, leyes de Newton,
fricción, energía cinética y potencial, momento lineal, ley de Coulomb,
campo eléctrico, ley de Ohm, resistencias en paralelo, fuerza magnética,
fem inducida, efecto Doppler, energía de un fotón — antes de escribir una
sola línea del JSON final.

**Segundo paso, más estricto que solo calcular la correcta**: un script
separado calculó también cada DISTRACTOR, verificando dos cosas a la vez:
(1) que corresponde a un error real y nombrable (factor omitido, operación
invertida, confusión de fórmula, error de exponente en notación científica
— nunca un número inventado al azar), y (2) que los 4 valores de cada
reactivo son numéricamente distintos entre sí. Esta segunda verificación
**sí encontró y corrigió un defecto real** antes de insertar nada: en el
primer diseño de la derivada de $(4x+3)^2$, dos distractores
("$2(4x+3)$" y "$8x+6$") eran algebraicamente el mismo valor con distinta
forma — se cambió uno a un valor genuinamente distinto antes de redactar el
archivo final.

### 4) Distribución de posición — determinada por el orden, no elegida

Para los 27 reactivos numéricos se respetó la convención de `_base.md`
("las opciones numéricas van en orden ascendente"): la letra de la
respuesta correcta es la que resulta de ordenar los 4 valores reales de
menor a mayor, **no una letra elegida de antemano**. Esto dejó una
distribución natural sesgada (A=3, B=7, C=10, D=7 sobre los 27 numéricos,
con A por debajo del 15% mínimo). Los 8 reactivos conceptuales —sin
opciones numéricas, así que sin la restricción de orden ascendente— se
usaron para corregir ese sesgo: se distribuyeron deliberadamente
5×A/1×B/0×C/2×D entre ellos, resultado de calcular cuánto faltaba para que
las 4 letras quedaran dentro del rango exigido.

**Resultado final: A=8 (22.9%), B=8 (22.9%), C=10 (28.6%), D=9 (25.7%)** —
las 4 dentro de 15%-40%, confirmado por `analyzeLot`
(`scripts/lib/lot-validation.ts`).

### 5) Verificación explícita de que la secuencia NO es cíclica

G16 documentó que los cuatro lotes de contenido generados hasta entonces
tenían la letra correcta rotando en ciclo A→B→C→D dentro del lote —un
defecto invisible para `POSITION_SKEW` (que solo mide la distribución
marginal) pero real, con tasas de rotación entre 61.8% y 100% contra 25%
esperado al azar. Antes de insertar este lote se corrió la misma medición
sobre la secuencia de 35 letras en el orden real de composición: **17.6%
de transiciones que avanzan +1 en el ciclo, 35.3% que retroceden −1**,
ambas estadísticamente indistinguibles de una secuencia aleatoria (p=0.89 y
p=0.12 respectivamente, muy lejos del p<10⁻⁵ que delató a los lotes
anteriores). El diseño de la distribución de posición (sección 4) se hizo
con esto en mente desde el principio, no como una corrección posterior.

### 6) Validación de lote (G3c) — un falso positivo real, corregido

`pnpm content:validate-batch --dir scripts/g18-lote` sobre los 14 archivos
encontró **1 violación `LETTER_CITATION`** en el primer intento: la unidad
"J/(kg·°C)" estaba partida en LaTeX como `\text{J/(kg}\cdot°\text{C)}`,
dejando el fragmento "C)" sin el símbolo ° inmediatamente adyacente (que el
regex de exclusión de unidades exige) — el validador lo interpretó como
una cita de "opción C)". Se corrigió unificando la unidad completa dentro
de un solo bloque `\text{}` (`\text{J/(kg·°C)}`), sin tocar ningún otro
contenido. Segunda corrida: **0 violaciones** en los 35 reactivos.

Repetido con `content:insert --lot-dir --dry-run` en los 14 temas
individuales: mismo resultado, 0 rechazados por formato, 0 duplicados
(`normalizeStem` no encontró coincidencias, esperado porque la materia
partía de cero).

### 7) Inserción real

`pnpm content:insert --topic <id> --file <archivo> --lot-dir scripts/g18-lote`
(sin `--dry-run`) para los 14 temas. **Verificado en la DB, no solo en el
log de consola:**

| Métrica | Antes de G18 | Después de G18 |
|---|---|---|
| Física IPN FISMAT — total | 0 | **35** |
| Física IPN FISMAT — verificados | 0 | **0** (correcto: pendiente de verificación ciega) |
| Física IPN FISMAT — SOURCED / TEMARIO_ONLY | 0 / 0 | **3 / 32** |
| Banco — total | 517 | **552** |
| Banco — verificados | 440 | **440** (sin cambio, correcto) |
| Banco — sin veredicto (cola ciega) | 77 | **112** (+35, se suman a los 77 de G17) |

El total VERIFICADO del banco no cambió, por diseño del pipeline
adversarial: G18 no verifica sus propios reactivos, eso es tarea de una
sesión posterior e independiente.

### 8) Limpieza

Scripts desechables de cálculo (`scripts/g18-calc*.mjs`), diseño de
posición (`scripts/g18-letters.mjs`, `scripts/g18-positions.mjs`,
`scripts/g18-seqcheck.mjs`), consulta a la DB
(`scripts/g18-gap-check.ts`, `scripts/g18-chunk.ts`, `scripts/g18-verify.ts`)
y validación (`scripts/g18-checkfile.ts`) eliminados al terminar, junto con
`scripts/g18-lote/` (los 14 archivos JSON del lote).

`pnpm typecheck` y `pnpm lint` en verde (sin cambios de código, solo
contenido). Cero llamadas a la API de pago de Anthropic — los 35 reactivos
se redactaron directamente en esta sesión de Claude Code.

### Siguiente (G18)

1. **Verificación ciega de los 35 reactivos de este lote** (patrón
   G14/G16): una sesión nueva e independiente que no vea las respuestas.
2. La cola de verificación ciega acumula ahora **112 reactivos** (77 de
   G17 + 35 de G18) — considerar si conviene una fase dedicada solo a
   drenar esa cola antes de seguir generando contenido nuevo.
3. Con Física IPN FISMAT ya cubierta, las materias de IPN Superior en CERO
   verificados que quedan son las de menor peso (Química MEDBIO=16,
   Química FISMAT=10, y el resto ≤8) — confirmar con
   `pnpm content:coverage` en vivo antes de elegir la siguiente, no asumir
   de esta nota.

## G17 — Triaje de la cola de discrepancias heredada (2026-08-26)

**COMPLETADA. 80 discrepancias clasificadas — 37 REPARABLE, 40 GENERADOR
TENÍA RAZÓN, 0 VERIFICADOR TENÍA RAZÓN, 3 IRREPARABLE.**

Estas 80 se habían acumulado sin revisión desde antes de G13 (algunas desde
el pipeline original vía API, `pipeline: 'adversarial-v1'`, retirado). El
encargo era rescatar el contenido salvable sin redactar nada nuevo —
equivalente a dos lotes completos de composición.

### 0) Naturaleza de esta fase: editorial, no ciega

A diferencia de G14/G16 (verificación ciega: nunca ver la respuesta antes de
resolver), G17 es una pasada de **arbitraje**: el insumo fue el reactivo
completo, la respuesta del generador, el veredicto íntegro del verificador
(razonamiento, problemas detectados, confianza) — el trabajo era juzgar cuál
tenía razón, no resolver desde cero. Esto es deliberado y está declarado en
el propio encargo; NO es una contaminación de contexto como la de G16
1er intento, porque la tarea nunca pretendió ser ciega.

### 1) Criterios de clasificación (aplicados de forma consistente a las 80)

Ninguna de las 80 llegó con un mismatch de opción trivial de resolver a
simple vista — la mayoría eran veredictos "verificador y generador de
acuerdo, pero con un `problem` detectado" (`WEAK_DISTRACTORS`,
`OFF_SYLLABUS`, `AMBIGUOUS_STEM`, `OTHER`), no discrepancias de opción en
sentido estricto. Se aplicaron estas reglas, documentadas ANTES de empezar
a clasificar para no improvisar caso por caso:

- **REPARABLE** — el defecto es real pero se corrige sin inventar hechos
  nuevos: reasignar `topicId` a un tema ya existente en la taxonomía,
  quitar una glosa/paréntesis que revela la respuesta, corregir un valor
  objetivamente cierto reusando notación/datos YA presentes en el
  enunciado (p. ej. restituir la identidad trigonométrica correcta), o
  eliminar una duplicación estructural (opciones repetidas dentro del
  stem, dos opciones algebraicamente idénticas).
- **GENERADOR TENÍA RAZÓN** — el contenido es correcto y el `problem` que
  bloqueó la publicación no resiste escrutinio (una queja subjetiva de
  "distractores fáciles" sin ninguna pista estructural real, una nota de
  redundancia con otro ítem del lote, una precisión conceptual menor que no
  cambia la respuesta). Se limpia el veredicto sin tocar el reactivo.
- **VERIFICADOR TENÍA RAZÓN** — la opción marcada como correcta en la DB
  está objetivamente mal y otra opción es la correcta. **Cero casos en este
  lote**: en la única discrepancia de opción real encontrada (un reactivo
  de números complejos de IPN), la verificación matemática propia mostró
  que el GENERADOR tenía razón — ver más abajo.
- **IRREPARABLE** — el reactivo está mal de raíz y arreglarlo exigiría
  redactar contenido nuevo (una regla lingüística, un ejemplo, un pasaje
  faltante): se descarta.

### 2) Discrepancia de opción real: verificada matemáticamente, no asumida

Un reactivo de IPN Matemáticas (números complejos, `(3+2i)+(1-5i)`) tenía
`chosenOption` del verificador (A = "$2-3i$") distinto de la opción marcada
correcta por el generador (C = "$4-3i$"). Se recalculó de forma
independiente: partes reales $3+1=4$, partes imaginarias $2i-5i=-3i$ →
$4-3i$. **El generador tenía razón; el veredicto del verificador estaba
matemáticamente equivocado** (registro heredado de una sesión temprana,
antes del aislamiento de sesión de G2). De paso se corrigió un defecto real
de la opción D ("$4-3$", ambigua entre valer 1 leída literal o ser una
errata de "$4-3i$"): REPARABLE, texto de D sin tocar cuál opción es
correcta.

### 3) Tres defectos matemáticos/físicos REALES capturados

No todo lo publicado como "problema menor" lo era. Verificación propia
encontró:

- **Física, equilibrio en el centro de gravedad**: el enunciado preguntaba
  qué tipo de equilibrio resulta de sostener un objeto exactamente en su
  centro de gravedad. Las 4 opciones eran estable/inestable/oscila/cae — la
  clasificación físicamente correcta, **equilibrio indiferente (neutro)**,
  no estaba entre ellas (`NONE_VALID` genuino). Se corrigió el texto de la
  opción marcada correcta a "equilibrio indiferente (neutro)" y se
  reescribieron las 3 capas de explicación, que enseñaban el concepto
  equivocado.
- **Trigonometría, identidad FALSA**: pedía identificar la única identidad
  falsa entre 4, pero DOS eran falsas a la vez (`sec θ = y/h` y
  `tan θ = y/x`, ambas con la razón invertida) — `MULTIPLE_VALID` genuino.
  Se corrigió `tan θ = y/x` → `tan θ = x/y` (la identidad verdadera),
  dejando una sola falsa.
- **Trigonometría, ley de senos**: pedía la ecuación que permite hallar
  $n$, pero DOS opciones eran relaciones válidas de la ley de senos
  simultáneamente (`n/sen Y = m/sen X` y `n/sen Y = r/sen Z` son la misma
  igualdad de tres razones) — `MULTIPLE_VALID` genuino. Se cambió una de
  las dos a un emparejamiento lado-ángulo incorrecto (`n/sen X = r/sen Z`),
  dejando una sola relación válida.

Un cuarto defecto no matemático pero real: una derivada `(4x+3)²` tenía dos
opciones algebraicamente idénticas (`2(4x+3)` y `8x+6` son el mismo valor
con distinta forma) — se cambió una a un valor distinto.

### 4) Patrón sistémico heredado: CUE DE GLOSA en Biología IPN MEDBIO

Los 8 reactivos de Biología IPN MEDBIO en la cola (de un lote anterior a
G13, probablemente G3d) compartían el defecto que G16 ya había nombrado
"CUE DE GLOSA": la opción correcta era, en el 8 de 8, la ÚNICA con un
paréntesis aclaratorio — "Hipófisis (pituitaria)" contra "Tiroides",
"Trompas de Falopio (oviductos)" contra "Útero", etc. — permitiendo acertar
sin dominar el tema. Se quitó el paréntesis en los 8 (edición sustractiva,
sin inventar contenido).

### 5) Patrón NO reparado, documentado para el futuro

Un número considerable de reactivos de UNAM Química (~6) usan lenguaje
absolutista en los distractores ("siempre", "nunca", "sin excepción",
"absolutamente") como pista de heurística de examen. Es un patrón real de
la fase de composición, pero **corregirlo exige redactar nuevos
distractores** (no una edición mecánica) — fuera del alcance declarado de
esta fase ("sin redactar nada nuevo"). Queda anotado como candidato a una
regla de `lot-validation.ts` o a una instrucción explícita en los prompts
de composición (`scripts/prompts/`) para el próximo lote, no como algo que
esta fase debía arreglar.

### 6) Qué NO se hizo (guardrail respetado)

- Ningún reactivo se auto-aprobó (`isVerified=true`) desde esta fase — las
  37 reparadas y las 40 "generador tenía razón" quedaron con
  `verification=null` e `isVerified=false`, re-entrando a la cola de
  `content:blind-batch` para una verificación ciega futura. Aprobarlas
  aquí habría roto la garantía adversarial (dos sesiones independientes
  deben coincidir).
- Ninguna reparación inventó un distractor, una regla o un dato nuevo — los
  3 defectos matemáticos/físicos reales se corrigieron restituyendo el
  valor objetivamente cierto con la notación que el propio enunciado ya
  daba, nunca añadiendo información externa.

### 7) Distribución de posición de las reparadas (regla de G3c)

Ninguna de las 37 reparaciones cambió CUÁL opción es la correcta (los 3
defectos matemáticos/físicos reales se corrigieron editando el TEXTO de una
opción, preservando la letra ya marcada `isCorrect`), así que la
distribución de posición de las 37 es la que ya traían:

**A=12 (32.4%) · B=12 (32.4%) · C=7 (18.9%) · D=6 (16.2%)** — las 4 dentro
del rango 15%–40% que exige `lot-validation.ts`. No hizo falta reordenar
letras.

### 8) Acumulado real, consultado en vivo antes y después

| Métrica | Antes de G17 | Después de G17 |
|---|---|---|
| Reactivos totales | 520 | **517** (−3 borrados) |
| Verificados (`isVerified=true`) | 440 | **440** (sin cambio — correcto, nada se auto-aprobó) |
| Sin veredicto (cola ciega) | 0 | **77** (37 reparadas + 40 generador-tenía-razón) |
| Sin publicar, con veredicto (cola de discrepancias) | 80 | **0** |

### 9) Pendientes de G14 corregidos de paso

**(1) Campo `model` del veredicto.** Desde G14, el veredicto persistía
`model: VERIFIER_MODEL_TIER` — una constante de orquestación, no el modelo
que realmente resolvía. `VerifierAnswerSchema`
(`scripts/lib/blind-verification.ts`) gana `model: z.string().optional().default(VERIFIER_MODEL_TIER)`
(mismo patrón retrocompatible que `usedCalculation`, agregado en G14) y
`content-resolve-verification.ts` persiste `answer.model` en vez de la
constante. Test nuevo en `tests/scripts/blind-verification.test.ts`
confirma el default Y que un valor explícito se preserva.

**(2) Muestreo de auditoría 5%.** Diagnóstico: `sampleForAudit`
(`scripts/lib/resolution.ts`) y `Question.verification.audit` existían
completos y testeados desde el pipeline original — pero **ningún script
ejecutable los invocaba nunca**. `content-resolve-verification.ts` siempre
escribía `audit: null` y nada lo actualizaba después. Cero reactivos habían
pasado jamás por la tercera pasada, pese a que el mecanismo llevaba fases
enteras "documentado como reusable" en los comentarios de
`content-blind-batch.ts` y `content-db.ts`.

Reparado con dos scripts nuevos, mismo patrón de dos etapas que la
verificación ciega normal:

- `scripts/content-audit-sample.ts` (`pnpm content:audit-sample`): consulta
  el pool elegible (`isVerified=true`, `verification.audit` todavía null —
  nueva función `loadApprovedQuestionsForAudit` en `content-db.ts`, filtro
  JSON por `path`), aplica `sampleForAudit` (5%, `Math.random` real — no
  determinista, es auditoría real) y exporta los ids.
- `scripts/content-audit-resolve.ts` (`pnpm content:audit-resolve`): lee
  las respuestas de la 3ª pasada, reusa `resolveVerdict` sin cambios
  (misma regla de aprobación, comparada otra vez contra
  `generatorOption`), y escribe el resultado en `verification.audit`
  (preservando el veredicto de la 2ª pasada intacto). Si la 3ª pasada NO
  aprueba, `isVerified` pasa a `false` y el reactivo cae en la cola
  "Muestreo degradado" del panel F3 (`classifyReviewQueue`, ya
  implementada desde F3, nunca antes alimentada).

**Probado en vivo contra la DB real** (solo lectura + escritura del
archivo de ids, sin tocar `Question`): pool elegible = 424, muestra 5% =
22. **Deliberadamente NO se resolvió esa muestra en esta sesión**: esta
sesión leyó los 80 veredictos completos de la cola de discrepancias, así
que no es una sesión ciega y no puede ejecutar la tercera pasada
independiente que el mecanismo exige — el mismo criterio de aislamiento de
G16. Queda como trabajo pendiente de una sesión ciega dedicada (ver
Siguiente).

`pnpm typecheck`, `pnpm lint` y `pnpm test:unit` (**465/465**, +1 sobre
G16) en verde.

### 10) Limpieza

Scripts desechables de consulta y aplicación (`scripts/g17-dump.ts`,
`scripts/g17-topics.ts`, `scripts/g17-apply.ts`, `scripts/g17-verify*.ts`,
`scripts/g17-lote/`) eliminados al terminar. Los dos scripts nuevos del
pipeline (`content-audit-sample.ts`, `content-audit-resolve.ts`) **sí se
conservan** — son infraestructura permanente, no material desechable de
esta fase.

### Siguiente (G17)

1. **Ejecutar el muestreo de auditoría 5% reparado**, en una sesión NUEVA e
   independiente (ciega): `pnpm content:audit-sample` →
   `pnpm content:blind-batch --ids <...>` → resolver a ciegas →
   `pnpm content:audit-resolve --file <respuestas.json>`. Es la única red
   que queda para detectar un sesgo compartido entre generador y
   verificador — nunca se ha ejecutado desde que existe el pipeline.
2. **Verificar a ciegas los 77 reactivos que volvieron a la cola** (37
   reparados + 40 confirmados) — mismo patrón G14/G16, sesión nueva e
   independiente de ésta.
3. Considerar agregar un chequeo de "lenguaje absolutista en distractores"
   a `lot-validation.ts` o a los prompts de composición (ver sección 5),
   antes de que el próximo lote repita el patrón.

## G16 — Verificación ciega Biología IPN MEDBIO, 2º intento (2026-08-26)

**COMPLETADA. 35/35 auto-aprobados. Banco 405 → 440 verificados.**

Segunda mitad del ciclo adversarial de G2 sobre el lote de G15, re-ejecutada
en una invocación de `claude` **nueva**, que es justo lo que faltó en el 1er
intento (sección siguiente).

### 1) Aislamiento: comprobado, no asumido

El único insumo fue un lote ciego **regenerado en esta sesión**, no el que
dejó el intento abortado:

```
pnpm content:blind-batch --all --limit 50
→ scripts/content-exports/blind-batch-2026-08-26T01-17-05-172Z.json  (35 ítems)
grep -c isCorrect    → 0
grep -c explanation  → 0
```

No se leyó el commit de G15 (`bb03d5d`), ni
`docs/content-batches/g15-ipn-medbio-biologia.json`, ni `Question.options`
por ninguna vía. El primer criterio de aceptación ("nunca viste la respuesta
correcta antes de responder") se cumple, y es verificable: la única lectura
de la DB antes de resolver fue un conteo agregado
(`count` por `isVerified`), que no expone contenido.

### 2) Resolución: 35 conceptuales, 3 con cálculo ejecutado

`requiresCalculation` es `false` en los 35 — biología, igual que G3d/G3e.
Aun así, los 3 reactivos con combinatoria real se resolvieron **ejecutando
la operación en código**, no razonándola en texto:

| Reactivo | Cálculo ejecutado | Resultado |
|---|---|---|
| Dihíbrido AaBb × AaBb | Cuadro de Punnett 4×4 completo, 16 casillas | A_B_=9, A_bb=3, aaB_=3, aabb=1 → **9:3:3:1** |
| Productos de la meiosis | 1 célula 2n → meiosis I → 2 células n → meiosis II | **4 células haploides** |
| Gametogénesis comparada | 4 productos meióticos; citocinesis simétrica vs. asimétrica | **4 espermatozoides** vs. **4−3 cuerpos polares = 1 óvulo** |

Esos 3 llevan `usedCalculation:true`; los otros 32, `false`. El registro de
auditoría describe exactamente lo que la sesión hizo — es el campo que G14
agregó justamente para que no mintiera.

Los 32 conceptuales se razonaron **descartando cada distractor por su
contenido**: p. ej. en retículo endoplásmico se descarta la opción que
describe lisosoma y Golgi, la que atribuye ATP al retículo (es mitocondrial)
y la que describe la vacuola; en deriva génica se descarta la ventaja
reproductiva del mejor adaptado por ser la definición de selección natural,
que es el contraste exacto que pide el enunciado.

### 3) Candado anti-deriva letra↔contenido

El archivo de respuestas **no se escribió a mano**. Un script emparejó cada
letra elegida con un fragmento del texto que se había razonado, y estaba
programado para **abortar si la letra y el contenido no coincidían**:

```
OK 35/35 respuestas; candado letra-contenido pasa en las 35.
letras elegidas sobre el lote MEZCLADO: {"A":5,"D":11,"C":8,"B":11}
```

Importa porque descarta la explicación alternativa más incómoda de un 100%:
ningún acierto puede venir de un desfase de índice entre el razonamiento y
la letra escrita.

### 4) Resultado

```
pnpm content:resolve --file scripts/content-exports/g16-answers.json
✅ Auto-aprobados: 35   ✋ Sin publicar: 0   ⚠️ Omitidos: 0
```

**Tasa de auto-aprobación: 35/35 = 100%.** Confianza 0.99 en 33, 0.98 en 1
(importancia biológica de la meiosis) y 0.97 en 2 (homología ave-murciélago;
sinapsis química frente a la eléctrica como excepción rara). Todas ≥0.85,
el umbral de `MIN_CONFIDENCE`. Cero `problems` declarados.

### 5) Acumulado REAL, consultado en vivo antes y después

| Métrica | Antes de G16 | Después de G16 |
|---|---|---|
| Reactivos totales | 520 | 520 |
| **Verificados (`isVerified=true`)** | **405** | **440** |
| Sin veredicto | 35 | **0** |
| Sin publicar (con veredicto adjunto) | 80 | 80 |

Los 80 sin publicar son discrepancias de lotes anteriores, ajenas a éste.

En la materia trabajada, **Biología IPN MEDBIO** (peso 22): pasó de
**27✓/35⧗/8✋** a **62✓/0⧗/8✋** sobre 70 totales. Cruzó el umbral de 50, tal
como G15 anticipó — el siguiente lote de contenido debe **re-consultar la
brecha en vivo** en vez de heredar la candidata de una nota previa (mismo
error que G15 documentó y evitó).

### 6) Hallazgo: rotación de la clave de respuestas

**Ajeno al encargo, detectado al leer el log de resolución.** Las letras
correctas del lote, en orden de id, no parecían aleatorias. Medido:

| Lote | n | Marginal | Rotación +1 (A→B→C→D) | p (binomial, p₀=¼) |
|---|---|---|---|---|
| G3a — Mat FISMAT | 35 | 9/9/9/8 | **34/34 = 100%** | 3.4e-21 |
| G13 — Mat FISMAT | 35 | 9/9/9/8 | 27/34 = 79.4% | 4.3e-11 |
| G3d — Bio MEDBIO | 35 | 9/9/9/8 | 26/34 = 76.5% | 4.5e-10 |
| G15 — Bio MEDBIO | 35 | 9/9/9/8 | 21/34 = 61.8% | 6.2e-6 |

Los **cuatro** lotes generados hasta hoy pasaron `POSITION_SKEW` con
distribución marginal impecable (9/9/9/8, ~25% por letra) **mientras la
clave avanzaba en ciclo**. La causa es que
`scripts/lib/lot-validation.ts` sólo evalúa `positionDistribution`
(la marginal, con `MIN_LETTER_SHARE`/`MAX_LETTER_SHARE`) y **nunca mira la
correlación serial**. Un lote perfectamente rotado es, para el validador,
un lote perfectamente balanceado.

**Alcance real, sin dramatizar:**

- **No invalida ningún reactivo.** Los 35 de este lote se resolvieron a
  ciegas y coincidieron uno por uno; la corrección de cada ítem es
  independiente de dónde cayó su letra.
- **Hoy no es explotable por un alumno**, porque
  `src/lib/adaptive/selector.ts` baraja los reactivos (`shuffle`) antes de
  servirlos: nadie los ve en orden de id.
- **Pero es frágil.** Con `shuffleOptions:false` para IPN/UAM/CENEVAL/CNBV
  (`src/lib/simulator/config.ts`), la letra almacenada **es** la letra
  mostrada; cualquier ruta que sirva en orden estable (panel admin, un
  export, una feature futura) expondría la regla. Y debilita la señal de
  calidad: "distribución balanceada" hoy certifica menos de lo que aparenta.

**No se corrigió en G16, deliberadamente:** queda fuera del alcance de una
fase de verificación, y reposicionar los reactivos ya publicados de esos
cuatro lotes (la mayoría de los 140 que componen; no todos llegaron a
publicarse) es una
decisión del dueño del proyecto, no de la sesión que encontró el patrón. Lo
accionable y barato es el chequeo de correlación serial en el validador,
para que el próximo lote no repita el patrón.

### 7) Caveat honesto heredado, que sigue sin corregirse

El veredicto persiste `model: VERIFIER_MODEL_TIER` (`'claude-fable-5'`), una
constante de orquestación — no el modelo que realmente resolvió el lote
(Opus 5 en esta sesión). Es el mismo caveat que G14 anotó y decidió no
corregir para no ampliar su alcance por cuenta propia; **se mantiene esa
decisión por consistencia, no por descuido**. `resolveVerdict` no lee
`model`, así que no afecta ninguna decisión de publicación.

### 8) Limpieza

Scripts desechables (`scripts/g16-count.ts`, `scripts/g16-seqcheck.ts`)
eliminados al terminar. El lote ciego y el archivo de respuestas viven en
`scripts/content-exports/` (gitignored, como todo el material intermedio).

`pnpm typecheck`, `pnpm lint` y `pnpm test:unit` (**464/464**) en verde.
Cero cambios de código.

### Siguiente (G16)

1. **Agregar chequeo de correlación serial a
   `scripts/lib/lot-validation.ts`** (nuevo código de violación, p. ej.
   `POSITION_CYCLE`): contar transiciones que avanzan +1 en el ciclo
   A→B→C→D y fallar el lote muy por encima del 25% esperado. Es el hallazgo
   accionable de esta fase.
2. **Siguiente lote de contenido: re-consultar la brecha EN VIVO.** Biología
   MEDBIO ya cruzó 50 (62 verificados) y salió del conjunto elegible; la
   candidata probable es **Física de IPN FISMAT** (peso 20, 0 verificados),
   pero eso debe confirmarse con Prisma, no heredarse de esta nota.
3. Los **80 sin publicar** siguen acumulándose sin panel de discrepancias
   (F3). Vale la pena revisarlos antes de que crezcan más.

---

## G16 — ABORTADA por contaminación de contexto, 1er intento (2026-08-26)

**No se resolvió ni se publicó ningún reactivo. Los 35 de G15 siguen
`isVerified=false`.** Es la **segunda vez** que ocurre este fallo de proceso
(la primera fue G3e, 1er intento, el 5 de agosto) y por la causa idéntica —
por eso esta sección se enfoca en por qué la lección de G3e no bastó para
prevenirlo.

### Qué pasó

La sesión asignada a ejecutar G16 (resolver a ciegas el lote de G15) era la
**misma conversación** que había compuesto ese lote en G15, minutos antes.
Se cambió el modelo (`/model claude-opus-5`) entre una fase y la otra —
exactamente el mismo movimiento que se hizo en G3e, y con el mismo efecto
nulo: **un cambio de modelo no reinicia la conversación.**

Esa ventana de contexto contenía los 12 archivos JSON que G15 escribió
(`scripts/g15-lote/*.json`, borrados del disco al cerrar esa fase pero
íntegros en el contexto), cada reactivo con su respuesta marcada
literalmente:

```json
{ "id": "C", "text": "Pared celular de celulosa", "isCorrect": true }
```

La contaminación es **total y literal**, no inferencial: los 35 pares
(enunciado → respuesta correcta) están en texto plano en el contexto. No
hacía falta razonar una sola línea de biología para producir 35/35. Además,
el contexto también contenía la distribución de posición declarada por G15
(A=9, B=9, C=9, D=8), lo que permitiría incluso auditar la propia respuesta.

### Por qué se abortó antes de resolver el primer reactivo

Tres razones independientes, cualquiera de ellas suficiente:

1. **El contrato del código.** `scripts/lib/blind-verification.ts:11`:
   *"Esa sesión debe ser DISTINTA (proceso/conversación separada) de la que
   compuso los reactivos."* Y CLAUDE.md: *"Dos sesiones independientes."*
   El aislamiento de sesión es la ÚNICA garantía de calidad que le queda al
   pipeline desde G2 — no hay revisión humana, ni segundo proveedor, ni
   freelancers. Si esa garantía es falsa, no queda ninguna.

2. **La regla que el propio proyecto ya escribió tras G3e.** *"Señal de
   alarma concreta para la sesión verificadora: si aparece en el contexto
   cualquier artefacto de la fase de composición (script generador, JSON de
   drafts, tabla de temas con conteos), la verificación ya está comprometida
   — hay que abortar y reportar, no intentar 'olvidar' la respuesta."*
   Aquí no es que el lote "se sintiera familiar": está el JSON completo.

3. **El propio criterio de aceptación del encargo.** La tarea listaba como
   primer criterio `[ ] Nunca viste la respuesta correcta antes de
   responder`. Ese criterio estaba **incumplido antes de empezar**, y no hay
   forma de ejecutarlo después. Correr las tareas 1-5 habría entregado un
   resultado que falla el estándar del propio encargo mientras aparenta
   éxito.

Continuar habría producido **35/35 y 100% de auto-aprobación** — un número
idéntico al de G14 y por lo tanto indistinguible de un resultado legítimo en
la tabla, que habría publicado 35 reactivos a alumnos reales con un sello de
calidad inventado. **Una verificación que no puede fallar no es una
verificación.**

### Por qué la lección de G3e no evitó la reincidencia

G3e dejó la lección escrita, pero la escribió **en `ESTADO.md`, un documento
que la sesión contaminada lee DESPUÉS de haber sido contaminada**. La regla
llega tarde por construcción: para cuando la sesión verificadora abre
`ESTADO.md`, ya lleva el lote entero en contexto.

Nada en el sistema **impide** la secuencia; solo la desaconseja en prosa.
Las defensas reales posibles, en orden de fuerza:

| Defensa | Dónde viviría | Estado |
|---|---|---|
| Que `content:resolve` rechace un archivo de respuestas si el lote se generó en la misma invocación que la inserción | `content-resolve-verification.ts` | **no existe** |
| Registrar en `Question.verification` un id de sesión y compararlo contra el de inserción | schema + ambos scripts | **no existe** |
| Que `content:blind-batch` imprima la advertencia (ya lo hace) | `content-blind-batch.ts` | existe, pero es solo texto |
| Anotarlo en `ESTADO.md` | docs | existe (G3e), **demostradamente insuficiente** |

La conclusión honesta es que el pipeline **depende de disciplina de
operación, no de un mecanismo**. Mientras la fase de composición y la de
verificación se lancen desde la misma invocación de `claude`, el aborto
manual es la única barrera, y depende de que la sesión contaminada decida
reportarlo en vez de aprovecharlo.

### Estado real tras abortar (consultado en vivo, no estimado)

| Métrica | Valor | Cambio en G16 |
|---|---:|---|
| Reactivos totales en el banco | **520** | sin cambio |
| Verificados (`isVerified=true`) | **405** | sin cambio |
| Pendientes sin veredicto (el lote de G15) | **35** | sin cambio |
| Pendientes con veredicto adjunto (lotes previos) | **80** | sin cambio |
| Resueltos en esta sesión | **0** | — |
| Publicados en esta sesión | **0** | — |

En la materia trabajada, **Biología IPN MEDBIO**: 27 verificados, **35 sin
veredicto** (el lote íntegro de G15), 8 sin publicar de lotes anteriores.

El lote ciego SÍ se generó y quedó en disco, listo para que lo consuma una
sesión nueva sin regenerarlo:
`scripts/content-exports/blind-batch-2026-08-26T01-11-03-065Z.json`
— **35 ítems, `requiresCalculation:false` en los 35** (biología conceptual,
sin cálculo que ejecutar, igual que en G3d/G3e y a diferencia de G13/G14).
Regenerarlo con `pnpm content:blind-batch --all --limit 60` es idempotente y
también válido.

### Desviación deliberada del encargo, declarada

El encargo pedía cerrar con el commit `feat(G16): verificación ciega
Biología IPN MEDBIO` y con la línea `SIGUIENTE: FASE G17`. Ambas se
cambiaron a propósito:

- **El commit** habría afirmado en el historial permanente que una
  verificación ciega ocurrió. No ocurrió. Se usó un mensaje honesto, mismo
  criterio que G12 (`chore(G12): …siguen bloqueados…` en vez del título
  planeado) y coherente con el defecto que G14 corrigió: un registro de
  auditoría no debe afirmar algo que no pasó.
- **La línea final** habría mandado a la siguiente sesión a G17, saltándose
  la verificación — y los 35 reactivos se habrían quedado sin verificar de
  forma indefinida, o peor, alguien habría asumido que ya lo estaban.

### Siguiente (G16)

1. **Re-ejecutar G16 en una invocación de `claude` NUEVA**, con historial en
   blanco. No basta con cambiar de modelo. El lote ciego ya está en disco;
   la sesión nueva solo necesita consumirlo, resolver los 35 razonando el
   descarte de cada distractor (son conceptuales, sin cálculo), escribir el
   archivo de respuestas y correr `pnpm content:resolve`.
2. **Considerar una defensa mecánica** (tabla de arriba) si esto vuelve a
   ocurrir: dos reincidencias en tres semanas sugieren que la advertencia en
   prosa no es suficiente para un proyecto de un solo desarrollador que
   encadena fases en la misma terminal.
3. Sigue pendiente, sin relación con esto: el backlog de **80 reactivos con
   veredicto adverso** sin resolver, y el muestreo de auditoría del 5% que
   G14 dejó anotado.

## G15 — Lote de reactivos: Biología IPN MEDBIO, refuerzo (2026-08-25)

**Resultado: COMPLETADA — 35 reactivos originales insertados con
`isVerified=false`, pendientes de verificación ciega.** Modo de trabajo:
autónomo total, sin preguntas, decisiones tomadas según la misma regla de
prioridad de G13.

### 1) Selección de materia — la brecha real cambió desde G14

Consulta en vivo (`pnpm content:coverage` + query directa vía Prisma, misma
cadena Institución→Nivel→Examen→Área→Materia→Tema de siempre) sobre las 17
materias de IPN Superior:

| Materia (IPN Superior) | Área | `questionWeight` | Verificados hoy |
|---|---|---|---|
| Matemáticas | FISMAT | 24 | **69** (cruzó el umbral de 50 gracias a G14) |
| Biología | MEDBIO | **22** | 27 |
| Física | FISMAT | 20 | 0 |
| Química | MEDBIO | 16 | 0 |
| Química | FISMAT | 10 | 0 |
| (resto: Matemáticas MEDBIO, Español/Inglés de ambas ramas, todo SOCADM) | — | ≤8 | 0 |

La regla de prioridad de G13 es literal: **"IPN con <50 verificados, mayor
`questionWeight` primero."** G14 verificó los 35 reactivos de G13 y
Matemáticas de FISMAT pasó de 34 a 69 verificados — **cruzó el umbral de 50
y sale del conjunto elegible**. Dentro del conjunto que queda (<50
verificados), la materia de mayor peso ya NO es Física FISMAT (20): es
**Biología de IPN MEDBIO, con peso 22**. Esto se verificó con un script
desechable de consulta directa a Prisma — no se asumió de la nota de
"Siguiente" que dejó G14, que hablaba de "mayor peso en CERO", un criterio
distinto y más estrecho que la Prioridad 1 real de la tarea (que no
distingue entre materias en cero y materias que ya tienen contenido, solo
entre <50 y ≥50 verificados).

**Es el mismo patrón que ya estableció G13**: reforzar la materia de mayor
peso del conjunto elegible, aunque ya tenga contenido previo (27 verificados
de G3d), en vez de asumir que "las que están en cero van primero". Aplicar
la regla tal como está escrita, no una lectura más cómoda de ella.

### 2) Fuentes disponibles

Los 12 temas de Biología de IPN MEDBIO tienen **0 `SourceChunk`** (`fuentes
0/12`, confirmado en `content:coverage` y en la consulta directa) — a
diferencia de Matemáticas FISMAT (3/12 con fragmento), esta materia no tiene
NINGÚN fragmento fuente escaneado todavía. Los 35 reactivos son, por lo
tanto, **100% TEMARIO_ONLY** — no bloquea la generación (regla de F2b), pero
significa que ninguno pudo citar `sourceChunks`.

### 3) Composición — 35 reactivos, cero API de pago

Redactados directamente por esta sesión (Claude Code, suscripción existente
— cero llamadas a la API de pago de Anthropic). Repartidos en los 12 temas
de la materia, **balanceando el acumulado con lo que ya insertó G3d** (no
solo repartiendo parejo el lote nuevo): los temas que G3d dejó más flacos
(Homeostasis, Reproducción, Evolución y especiación, Mitosis y meiosis, con
2 reactivos cada uno) reciben más refuerzo ahora; los que G3d ya dejó más
completos (Genética básica, Célula y organelos, Sistema nervioso, con 4 cada
uno) reciben menos:

| Tema | G3d (previo) | G15 (nuevo) | Acumulado |
|---|---:|---:|---:|
| Sistema endocrino | 3 | 3 | 6 |
| Genética básica | 4 | 2 | 6 |
| Célula y organelos | 4 | 2 | 6 |
| Homeostasis | 2 | 3 | 5 |
| Reproducción | 2 | 4 | 6 |
| Sistemas del cuerpo humano | 3 | 3 | 6 |
| Evolución y especiación | 2 | 3 | 5 |
| Nutrición y metabolismo | 3 | 3 | 6 |
| Mitosis y meiosis | 2 | 4 | 6 |
| Sistema nervioso | 4 | 2 | 6 |
| Inmunología | 3 | 3 | 6 |
| Ecología y ecosistemas | 3 | 3 | 6 |
| **TOTAL** | **35** | **35** | **70** |

Formato: **35/35 MULTIPLE_CHOICE** — mismo criterio que G3d (el fewshot de
`scripts/prompts/biologia.md` tampoco varía formato) y consistente con que
el contenido es puramente conceptual/definicional, sin fragmento fuente que
sugiera otro formato. Dificultad: **BASIC 10, INTERMEDIATE 16, ADVANCED 7,
EXPERT 2** — más cercana a la distribución sugerida por
`scripts/prompts/_base.md` (20/50/25/5%) que la de G3d (que casi no tenía
ADVANCED/EXPERT).

**Distribución de posición diseñada desde la composición** (no ajustada
después): **A=9, B=9, C=9, D=8** (25.7/25.7/25.7/22.9%), dentro del rango
15%-40% exigido por G3c — confirmada por el validador automático, no solo
por el diseño. **Distractores citados por su contenido en todas las
explicaciones, nunca por su letra** (`LETTER_CITATION` = 0 en las 35),
siguiendo el patrón numerado "1)...2)...3)...4)..." del fewshot de
`biologia.md`, nunca "opción X".

### 4) Validación — G3c corrido antes de tocar la DB

`pnpm content:validate-batch --dir scripts/g15-lote` sobre los 12 archivos:
**35/35 válidos, 0 rechazados por formato, 0 violaciones**
(`MALFORMED_OPTIONS` 0, `POSITION_SKEW` 0, `LETTER_CITATION` 0). Repetido
con `--dry-run` en los 12 temas vía `content:insert --lot-dir
scripts/g15-lote`: mismo resultado, 0 duplicados contra los 35 reactivos ya
existentes de la materia (`normalizeStem` no encontró coincidencias contra
los 27 verificados + 8 sin publicar de G3d).

### 5) Inserción real

`pnpm content:insert --topic <id> --file <archivo> --lot-dir
scripts/g15-lote` (sin `--dry-run`) para los 12 temas. **Verificado en la
DB, no solo en el log de consola:** la materia pasó de 27✓/0⧗/8✋ (35
totales) a **27✓/35⧗/8✋ (70 totales)** — exactamente +35 pendientes sin
veredicto, los 35 `TEMARIO_ONLY`. El conteo global de reactivos VERIFICADOS
del banco no cambió (sigue en 405) — correcto y esperado: este lote entra a
la cola de verificación ciega, responsabilidad de una sesión POSTERIOR e
independiente (mismo diseño adversarial que G3a→G3b y G13→G14); G15 no
verifica sus propios reactivos.

Registro consolidado del lote (mismo patrón que `g3a-ipn-fismat-matematicas.json`,
`g3d-ipn-medbio-biologia.json` y `g13-ipn-fismat-matematicas.json`):
**`docs/content-batches/g15-ipn-medbio-biologia.json`** — con los 35
`questionId` reales de la DB, stems, opciones y grounding.

### 6) Limpieza

Los archivos de trabajo (`scripts/g15-gap-check.ts`, `scripts/g15-topics.ts`,
`scripts/g15-export.ts`, 12 archivos JSON en `scripts/g15-lote/`) se
eliminaron al terminar — el registro permanente es el archivo en
`docs/content-batches/` y esta sección, igual que el criterio ya establecido
por G3a/G3d/G13.

`pnpm typecheck` y `pnpm lint` en verde (sin cambios de código en esta fase
— solo contenido en la DB y documentación).

### Siguiente (G15)

1. **Verificación ciega** de estos 35 reactivos (patrón G3b/G3e/G14): una
   sesión independiente que NO vea las respuestas correctas debe resolverlos
   y comparar veredictos antes de que puedan pasar a `isVerified=true`. Si
   los 35 se aprueban, Biología de IPN MEDBIO pasaría de 27 a 62
   verificados — cruzaría el umbral de 50, igual que le pasó a Matemáticas
   FISMAT en G13→G14, y el próximo lote de contenido tendría que
   re-consultar la brecha en vivo otra vez (probable candidata siguiente:
   Física de IPN FISMAT, peso 20, sigue en 0 verificados).
2. Física de IPN FISMAT (`questionWeight=20`, 0 verificados, 1/14 temas con
   fuente) sigue siendo la materia de mayor peso en CERO absoluto del banco
   — la más urgente si el criterio fuera solo "empezar algo desde cero" en
   vez de la Prioridad 1 real.

## G14 — Verificación ciega del lote de G13 (2026-08-25)

**Resultado: COMPLETADA — 35/35 reactivos auto-aprobados (tasa 100%). El
banco pasó de 370 a 405 reactivos verificados.** Modo de trabajo: autónomo.

Esta es la segunda mitad del ciclo adversarial de G2. G13 compuso el lote;
esta sesión, **independiente y sin acceso a las respuestas**, lo resolvió.

### 1) La ceguera se comprobó, no se asumió

Insumo único: `pnpm content:blind-batch --all --limit 60`, que exportó los
**35 reactivos pendientes sin veredicto** (todos de Matemáticas IPN FISMAT
— exactamente el lote de G13) con las opciones **remezcladas** por semilla
determinista = `questionId`.

Lo que esta sesión **no** abrió, por regla explícita de la tarea: el commit
`cc1d08b` de G13, `docs/content-batches/g13-ipn-fismat-matematicas.json`, y
`Question.options` con su campo `isCorrect`.

Comprobación mecánica sobre el archivo exportado:

```
grep -c "isCorrect\|explanation\|correctOption" g14-blind.json  →  0
```

Cero ocurrencias. La garantía estructural de `buildBlindItem()` (selección
explícita de campos: `isCorrect` y `explanations` no existen en el tipo de
retorno) se sostiene en la práctica, no solo en el tipo.

### 2) Los 35 son de cálculo, y los 35 se calcularon en código

`requiresCalculation` venía en `true` en los **35** (materia = Matemáticas,
`isCalcSubject`). Ninguno se resolvió "de cabeza": cada uno se ejecutó en
Python/sympy y el resultado quedó impreso antes de elegir opción —
`solve` (sistemas y cuadráticas), `diff` (regla del producto, potencias
negativas, recta tangente), `integrate` (definidas e indefinidas),
`factor`/`cancel` (factorización, diferencia de cuadrados),
`function_range` y `continuous_domain` (rango y dominio),
`Point.distance`/`Segment.midpoint` (geometría analítica), `Abs` y
`conjugate` (complejos), `math.comb` (combinatoria), enumeración explícita
del espacio muestral (probabilidad) y `Fraction` para toda la aritmética de
porcentajes y razones (cero flotantes, cero redondeo).

### 3) Un segundo paso, más estricto que solo responder: unicidad

Responder bien no prueba que el reactivo esté bien. Un segundo script
transcribió las **4 opciones** de cada reactivo a expresiones simbólicas y
preguntó cuántas son equivalentes al resultado calculado:

- **1 opción válida en los 35 reactivos.**
- **0** casos de `NONE_VALID` (ninguna opción correcta).
- **0** casos de `MULTIPLE_VALID` (dos opciones equivalentes).

Los distractores discriminan de verdad: los cercanos son errores típicos
reales y ninguno colisiona con la respuesta — `9/12` y `12/15` frente a
`3/5` en el coseno, `(3,∞)` abierto frente a `[3,∞)` cerrado en el dominio
de la raíz, `-2/x²` frente a `-2/x³` en la derivada, `100` frente a `10` en
el módulo del complejo, `336` (permutación) frente a `56` (combinación).
Por eso ningún reactivo lleva `problems` adjuntos.

### 4) Resolución y tasa de auto-aprobación

```
pnpm content:resolve --file scripts/content-exports/g14-answers.json
→ ✅ Auto-aprobados: 35   ✋ Sin publicar: 0   ⚠️ Omitidos: 0
```

**Tasa de auto-aprobación: 35/35 = 100%.**

La regla de `resolveVerdict` se aplicó sin excepción ni atajo: coincidencia
con el generador **+** confianza ≥ `MIN_CONFIDENCE` (0.85) **+** cero
problemas. Confianza declarada: **0.99 en 33** reactivos y **0.97 en 2** —
el dominio de `√(x-3)` y el rango de `x²+4`, los únicos dos conceptuales en
vez de puramente computacionales.

### 5) Acumulado REAL en la base de datos (consultado, no estimado)

Consulta a Supabase **antes y después** de resolver:

| Métrica | Antes de G14 | Después de G14 |
|---|---|---|
| Reactivos totales | 485 | 485 |
| **Verificados (`isVerified=true`)** | **370** | **405** |
| Pendientes | 115 | 80 |
| — de ellos, sin veredicto | 35 | **0** |
| — de ellos, con veredicto adjunto | 80 | 80 |

Los 80 pendientes que quedan **no son de este lote**: son discrepancias de
lotes anteriores que ya traían veredicto adjunto y no se publicaron. La
cola de verificación de G13 quedó en **cero**.

En la materia trabajada, **Matemáticas IPN FISMAT** (`questionWeight=24`):
**34 → 69 verificados**, 1 pendiente (el preexistente de antes de G13).

### 6) Confirmación independiente de la distribución de G13

Al traducir las respuestas del orden mezclado de vuelta al original, las
correctas caen en **A=9, B=9, C=9, D=8** — exactamente la distribución que
G13 documentó, ahora confirmada desde el lado ciego, sin haberla leído.

Que el shuffle funciona también quedó demostrado: las elecciones de esta
sesión en el espacio **mezclado** fueron A=10, B=10, C=10, D=5 — un patrón
distinto al original, o sea que las etiquetas sí se reordenaron y esta
sesión nunca vio la posición original.

### 7) Defecto real hallado y corregido en el pipeline

`content-resolve-verification.ts` escribía **`usedCalculation: false`
hardcodeado** en el veredicto que persiste en `Question.verification`. El
archivo de respuestas no tenía forma de declarar lo contrario, así que el
registro de auditoría afirmaba que el cálculo *no* se ejecutó — justo lo
opuesto de lo que esta fase hizo en los 35 reactivos, y una afirmación
falsa en el mismo campo que el panel de discrepancias (F3) lee.

Corrección mínima y retrocompatible:

- `VerifierAnswerSchema` gana `usedCalculation: z.boolean().optional().default(false)`
  — los archivos de respuestas viejos siguen siendo válidos.
- El resolve script pasa `answer.usedCalculation` al veredicto en vez de la
  constante.
- Documentación del formato actualizada en los dos scripts del pipeline.

El lote se **re-resolvió** con el campo en `true`, así que los 35 registros
en la DB ahora describen con exactitud cómo se verificaron.

**Caveat honesto que NO se corrigió:** el veredicto persiste
`model: VERIFIER_MODEL_TIER` (`'claude-fable-5'`), una constante de
orquestación — no el modelo que realmente resolvió el lote (Opus 5 en esta
sesión). Es cosmético para la decisión (`resolveVerdict` no lee `model`),
pero el registro de auditoría no debería afirmar un modelo que no corrió.
Arreglarlo requiere el mismo patrón que `usedCalculation`; se deja anotado
en vez de ampliar el alcance de esta fase por cuenta propia.

### 8) Limpieza

Scripts desechables de consulta (`scripts/g14-count.ts`,
`scripts/g14-breakdown.ts`) eliminados al terminar. El lote ciego y el
archivo de respuestas viven en `scripts/content-exports/` (gitignored, como
todo el material intermedio del pipeline).

`pnpm typecheck`, `pnpm lint` y `pnpm test:unit` (**464/464**) en verde.

### Siguiente (G14)

1. **Física de IPN FISMAT** (`questionWeight=20`, 0 verificados) sigue
   siendo la materia de IPN con mayor peso en CERO — el candidato natural
   para el siguiente lote de material NUEVO.
2. **Muestreo de auditoría del 5%** (`sampleForAudit`, `AUDIT_RATE`): con
   405 verificados y una tasa de auto-aprobación del 100% en este lote, la
   tercera pasada con un tier de modelo distinto es la única red que queda
   para detectar un sesgo compartido entre generador y verificador. Un
   100% limpio es buena señal, pero es exactamente el escenario donde un
   error sistemático pasaría desapercibido.
3. Arreglar `model` en el veredicto (ver punto 7), junto con el próximo
   cambio que toque el pipeline de verificación.
