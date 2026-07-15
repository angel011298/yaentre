# Extracción — Guía IPN Nivel Superior 2025

**Fuente:** `docs/guias/Guia_IPN.pdf` · **externalRef:** `IPN-SUP-2025`
**Método:** PDF **escaneado** (132 páginas, doble página del libro por hoja, **sin texto embebido**). Extracción **por visión** (render 1.3x + lectura). `--scanned`.
**Licencia:** Guía oficial de uso público, © Instituto Politécnico Nacional — usada para calibración interna y atribución.

---

## Estructura observada

- Nivel **Superior** (licenciatura): "Conocimientos Generales" con Cálculo Integral, Física, etc.
- **3 ramas del conocimiento** (confirman las de CC-08):
  1. Ingeniería y Ciencias Físico Matemáticas (`IPN_FISMAT`)
  2. Ciencias Médico Biológicas (`IPN_MEDBIO`)
  3. Ciencias Sociales y Administrativas (`IPN_SOCADM`)
- Cada sección de práctica trae una tabla **"RESPUESTAS CORRECTAS (RC)"** que empareja nº de pregunta → letra. Esto hace el examen muestra **extraíble con certeza**.

## Carreras — nombres reales verificados

Se transcribieron de las páginas de "Oferta Educativa" los **nombres reales** de carrera por escuela (ESCOM, ESFM, ESIT, ENCB, ESM, ENMH, ESEO, CICS, UPIICSA…). Están en `scripts/extraction/ipn.taxonomy.json`.

**La guía NO publica aciertos mínimos de ingreso.** Por lo tanto `minAciertos` **no se puede derivar de esta fuente** y permanece `TODO-VERIFICAR` (fuente externa: estadísticas históricas de admisión IPN). El ingest de carreras **solo escribe el nombre**; no inventa cortes.

## Reactivos extraídos (muestra representativa)

3 reactivos de Física transcritos con fidelidad total (pág. PDF 132), con respuesta tomada de la tabla RC impresa y verificada por resolución:

| ref | Formato | Tema | RC |
|---|---|---|---|
| `IPN-SUP-2025#FIS-Q22` | MATCHING | Ondas (concepto↔descripción) | A (1A,2C,3B) |
| `IPN-SUP-2025#FIS-Q24` | MULTIPLE_CHOICE | Óptica (espejos a 40°) | C (8 imágenes) |
| `IPN-SUP-2025#FIS-Q25` | MULTIPLE_CHOICE | Óptica (refracción, LaTeX) | A |

En `scripts/extraction/ipn.questions.json`, `source=OFFICIAL_SAMPLE`, `usage=CALIBRATION_ONLY`.

## Omitidos (con motivo) — política "cero inventados"

| Qué | Motivo |
|---|---|
| Grueso del examen muestra (~130+ reactivos across las 132 páginas) | **Extracción incremental.** El PDF escaneado de 132 páginas a doble columna es denso; se transcribió una muestra representativa con su clave RC verificada. La ingesta es idempotente por `externalRef`, así que añadir secciones en corridas sucesivas no duplica. |
| Pesos oficiales por materia (`questionWeight`) | **No derivables aún:** no se extrajo una clave consolidada con conteo por materia como en ECOEMS. Los pesos de CC-08 siguen como estimación `TODO-VERIFICAR`. |
| `minAciertos` por carrera | La guía no los publica. Fuente equivocada para ese dato. |

## Discrepancias vs CC-08 (IPN Superior)

- **Ramas:** ✅ coinciden (FISMAT / MEDBIO / SOCADM).
- **Nombres de carrera:** CC-08 usó nombres aproximados con escuela (p. ej. "Medicina (ESM)"). El nombre **real** es "Médico Cirujano y Partero (ESM)". "Cirugía Dental (ESD)" de CC-08 no aparece como tal; la guía lista **Odontología** en CICS. → Los nombres de `ipn.taxonomy.json` **corrigen/precisan** los de CC-08.
- **`minAciertos`:** CC-08 los estimó (Medicina ~108, ESCOM ~102…). La guía **no** los confirma → **siguen `TODO-VERIFICAR`**. No se sobrescriben con datos inventados.
- **`questionWeight` por materia:** no derivables de esta guía → estimaciones de CC-08 **se mantienen** con su marca `TODO-VERIFICAR`.
- **`totalQuestions`=140:** se mantiene de CC-08; la guía no imprime un total consolidado explícito (marcado en la nota del artefacto).

## Reproducibilidad

```bash
pnpm content:ingest --pdf docs/guias/Guia_IPN.pdf \
  --institution IPN --level SUPERIOR --year 2027 --scanned --dry-run
```

Idempotente por `ContentSource.externalRef = IPN-SUP-2025`.
