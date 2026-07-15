# Extracción — Guía ECOEMS (IPN-UNAM, Media Superior 2025)

**Fuente:** `docs/guias/guia_ECOEM.pdf` · **externalRef:** `ECOEMS-2025`
**Método:** render del PDF a imagen (PyMuPDF 2x) + lectura con visión. El texto embebido del PDF usa un cifrado de desplazamiento (+29) con pérdida de acentos, por lo que **la extracción fiable es por visión**, no por `pdftotext`.
**Licencia:** Guía oficial de uso público, D.R. © 2025 UNAM (CEIDE, DEE) e IPN — usada para calibración interna y atribución.

---

## Dato oficial clave

- **Examen conjunto IPN-UNAM de Media Superior** (proceso de asignación a bachillerato).
- **128 preguntas**, 3 horas (dato oficial, pág. 9 de la guía).
- **10 asignaturas** agrupadas en 3 campos formativos.

## Pesos oficiales derivados del conteo real

Los `questionWeight` **NO son estimaciones**: se derivaron contando cada pregunta por asignatura en la **clave de respuestas del examen muestra** (págs. 82-84), extraída íntegra por visión. Suma verificada = 128.

| Campo formativo | Asignatura | Peso oficial | Clave extraída | Texto transcrito |
|---|---|---|---|---|
| Lenguajes | Español | 12 | 12/12 | 4 |
| Lenguajes | Habilidad verbal | 16 | 16/16 | 1 |
| Saberes y pensamiento científico | Matemáticas | 12 | 12/12 | 7 |
| Saberes y pensamiento científico | Habilidad matemática | 16 | 16/16 | 1 |
| Saberes y pensamiento científico | Biología | 12 | 12/12 | 0 |
| Saberes y pensamiento científico | Física | 12 | 12/12 | 0 |
| Saberes y pensamiento científico | Química | 12 | 12/12 | 4 |
| Ética, naturaleza y sociedades | Historia | 12 | 12/12 | 0 |
| Ética, naturaleza y sociedades | Geografía | 12 | 12/12 | 0 |
| Ética, naturaleza y sociedades | Formación cívica y ética | 12 | 12/12 | 0 |
| | **TOTAL** | **128** | **128/128** | **17** |

- **Clave:** las 128 respuestas correctas + su código de tema (p. ej. `4.9`) están en `scripts/extraction/ecoems.answerkey.json`, extraídas y verificadas 1:1.
- **Texto transcrito:** 17 reactivos del examen muestra transcritos con fidelidad total (enunciado + 4 opciones + respuesta correcta cruzada contra la clave). Están en `scripts/extraction/ecoems.questions.json` con `source=OFFICIAL_SAMPLE`, `usage=CALIBRATION_ONLY`.

## Reactivos por formato (de los 17 transcritos)

- `MULTIPLE_CHOICE`: 13 (incluye sinónimos y matemáticas con LaTeX)
- `READING_COMPREHENSION`: 2 (con `Passage` compartido: Gutiérrez Nájera, Spare Parts)
- `CHART_TABLE`: 1 (serie de figuras de puntos, Habilidad matemática)
- `IMAGE_OPTIONS`: 0 transcritos (varios identificados en págs. 67-69; requieren recorte de imagen por opción — ver omitidos)

## Temario

El temario oficial jerárquico (asignatura → tema numerado) se transcribió de las págs. 11-20 y vive en `scripts/extraction/ecoems.taxonomy.json` (`topics`). Los códigos de tema de la clave (p. ej. Historia `10.2`, Geografía `5.7`) mapean a estos temas de primer nivel.

## Omitidos (con motivo) — política "cero inventados"

| Qué | Cuántos | Motivo |
|---|---|---|
| Texto de reactivo del examen muestra | 111 de 128 | **Extracción incremental.** Clave y peso capturados al 100%; el enunciado + opciones se transcriben por visión en corridas sucesivas. Re-ejecutar la ingesta es idempotente por `externalRef`, así que añadir los faltantes no duplica. |
| Reactivos con opciones-imagen (Habilidad matemática espacial, págs. 67-69) | ~10 | Las opciones son figuras; requieren recortar cada imagen y subirla como `imageUrl` por opción. El enunciado es transcribible pero sin las figuras el reactivo no es utilizable; se difiere a una corrida con extracción de imágenes. |

**Ningún reactivo fue inventado ni completado por inferencia.** Solo se registró lo leído con certeza; el resto está aquí, contabilizado.

## Discrepancias vs seeds previos (CC-07 / CC-08)

**Hallazgo principal: ECOEMS es un examen NUEVO, no una corrección de CC-07/CC-08.**

- **CC-07** sembró **UNAM _Superior_** (licenciatura). ECOEMS es **UNAM/IPN _Media Superior_** (bachillerato). Son **niveles distintos** → los pesos de ECOEMS **no contradicen ni corrigen** los de CC-07. Los `questionWeight` estimados de CC-07 (Matemáticas 26, etc., nivel Superior) siguen como `TODO-VERIFICAR`; ECOEMS no aporta evidencia sobre ellos.
- **CC-08** sembró **IPN Superior**; tampoco se cruza con ECOEMS (Media Superior).
- **Implicación de producto:** ECOEMS crea un examen **Media Superior** listo en datos, pero el launch del 6-ene-2027 es solo Superior (`NEXT_PUBLIC_ENABLE_MEDIA_SUPERIOR=false`). La taxonomía queda sembrada tras el feature flag, coherente con la estrategia de activación gradual (CLAUDE.md §Feature flags).
- **Sin conflicto de `code`:** las áreas ECOEMS usan códigos propios (`ECOEMS_LENGUAJES`, `ECOEMS_SABERES`, `ECOEMS_ETICA`) y cuelgan de un `Exam` distinto (Media Superior 2027), así que conviven con UNAM/IPN Superior sin colisión.

## Reproducibilidad

```bash
pnpm content:ingest --pdf docs/guias/guia_ECOEM.pdf \
  --institution UNAM --level MEDIA_SUPERIOR --year 2027 --dry-run
```

Idempotente por `ContentSource.externalRef = ECOEMS-2025` y `Question.externalRef`. Re-ejecutar corrige pesos y añade reactivos nuevos sin duplicar.
