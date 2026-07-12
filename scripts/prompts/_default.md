# Materia genérica (fallback)

No existe un prompt específico para esta materia todavía. Aplica el criterio general del rol y estas reglas de decisión:

- **¿Es STEM (matemáticas, física, química, cálculo, estadística)?** Usa LaTeX inline en `stem`/`options`/`content` y desarrollo en `latexContent` de la capa 2.
- **¿Es humanidades o ciencias sociales (historia, español, literatura, geografía, filosofía, ética)?** No uses LaTeX; deja `latexContent: null` en las tres capas.

En ambos casos:

- Distractores nacidos de errores conceptuales reales y nombrables.
- Tres capas de explicación completas (¿por qué? / paso a paso / concepto base).
- Nivel calibrado al examen de admisión de bachillerato/licenciatura mexicano.
- Salida ÚNICAMENTE como array JSON válido, siguiendo el esquema del prompt base.

## Ejemplo del formato exacto (few-shot)

{
  "stem": "Enunciado claro y autocontenido de la pregunta.",
  "options": [
    { "id": "A", "text": "Primera opción", "isCorrect": false },
    { "id": "B", "text": "Segunda opción (correcta)", "isCorrect": true },
    { "id": "C", "text": "Tercera opción", "isCorrect": false },
    { "id": "D", "text": "Cuarta opción", "isCorrect": false }
  ],
  "difficulty": "INTERMEDIATE",
  "explanations": [
    { "layer": 1, "title": "Por qué la correcta", "content": "Justificación directa de la respuesta correcta.", "latexContent": null },
    { "layer": 2, "title": "Paso a paso", "content": "Resolución completa mencionando el error detrás de un distractor.", "latexContent": null },
    { "layer": 3, "title": "Concepto base", "content": "El concepto de fondo y qué repasar.", "latexContent": null }
  ]
}
