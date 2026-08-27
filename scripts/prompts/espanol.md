# Materia: Español

Guía específica:

- Materia de humanidades: **nunca uses LaTeX** (`latexContent: null` en las tres capas).
- Cubre comprensión lectora, gramática, ortografía, semántica y análisis literario del temario de bachillerato.
- Los distractores salen de errores reales: confundir categorías gramaticales, reglas de acentuación mal aplicadas, sinónimos que no encajan en contexto, figuras retóricas confundidas.
- **Comprensión de lectura:** redacta pasajes ORIGINALES (divulgación científica, texto argumentativo, narrativo o ensayístico — los géneros del examen real), nunca copies textos con derechos de autor. Usa `format: "READING_COMPREHENSION"` y el objeto `passage` compartido (ver `_base.md`): 3-5 preguntas por pasaje, cada una repitiendo el mismo `passage` con el mismo `ref` y `content` exacto.
- Cuando una sola pregunta dependa de un fragmento corto, inclúyelo dentro del `stem` (autocontenido) y deja `passage: null`.

## Ejemplos del formato exacto (few-shot)

Ejemplo 1 — ortografía y acentuación (BASIC):

{
  "stem": "¿Cuál de las siguientes palabras está correctamente acentuada según las reglas de acentuación del español?",
  "options": [
    { "id": "A", "text": "exámen", "isCorrect": false },
    { "id": "B", "text": "carácter", "isCorrect": true },
    { "id": "C", "text": "facilmente", "isCorrect": false },
    { "id": "D", "text": "arbol", "isCorrect": false }
  ],
  "difficulty": "BASIC",
  "explanations": [
    {
      "layer": 1,
      "title": "'Carácter' es grave terminada en consonante distinta de n/s",
      "content": "'Carácter' es una palabra grave (llana) que termina en 'r', por lo que lleva tilde en la penúltima sílaba: ca-rác-ter. Las palabras graves se acentúan cuando terminan en consonante distinta de 'n' o 's'.",
      "latexContent": null
    },
    {
      "layer": 2,
      "title": "Revisando cada palabra",
      "content": "1) 'Examen' es grave terminada en 'n', así que NO lleva tilde: 'exámen' está mal. 2) 'Carácter' es grave terminada en 'r': SÍ lleva tilde. 3) 'Fácilmente' es correcta con tilde (el adverbio conserva la tilde del adjetivo 'fácil'): 'facilmente' está mal. 4) 'Árbol' es grave terminada en 'l': lleva tilde, así que 'arbol' está mal. El error frecuente es sobreacentuar 'examen' por analogía con su plural 'exámenes', que sí es esdrújula.",
      "latexContent": null
    },
    {
      "layer": 3,
      "title": "Reglas de acentuación",
      "content": "Agudas: tilde si terminan en vocal, 'n' o 's'. Graves: tilde si NO terminan en vocal, 'n' ni 's'. Esdrújulas: siempre llevan tilde. El cambio de número puede cambiar la clasificación (examen → exámenes). Repasa: clasificación de palabras por su acento y reglas generales de acentuación.",
      "latexContent": null
    }
  ]
}

Ejemplo 2 — comprensión lectora (INTERMEDIATE):

{
  "stem": "Lee el fragmento: «El descubrimiento no fue producto del azar, sino de años de observación meticulosa; sin embargo, pocos reconocieron ese esfuerzo en su momento». ¿Qué relación lógica expresa el conector 'sin embargo'?",
  "options": [
    { "id": "A", "text": "Causa", "isCorrect": false },
    { "id": "B", "text": "Consecuencia", "isCorrect": false },
    { "id": "C", "text": "Contraste u oposición", "isCorrect": true },
    { "id": "D", "text": "Adición", "isCorrect": false }
  ],
  "difficulty": "INTERMEDIATE",
  "explanations": [
    {
      "layer": 1,
      "title": "'Sin embargo' introduce oposición",
      "content": "El conector 'sin embargo' es adversativo: opone lo esperado (que se reconociera el esfuerzo) con lo ocurrido (que pocos lo reconocieron). Expresa contraste.",
      "latexContent": null
    },
    {
      "layer": 2,
      "title": "Analizando el conector en contexto",
      "content": "1) El fragmento afirma que hubo un gran esfuerzo. 2) 'Sin embargo' anuncia que lo que sigue contradice la expectativa lógica. 3) El resultado (pocos lo reconocieron) se opone a lo merecido. Por eso la relación es de contraste, no de causa ni de adición. El error común es confundir 'sin embargo' con un conector de consecuencia como 'por lo tanto', que expresaría una relación distinta.",
      "latexContent": null
    },
    {
      "layer": 3,
      "title": "Conectores y relaciones lógicas",
      "content": "Los conectores señalan la relación entre ideas: adversativos (sin embargo, pero) marcan contraste; consecutivos (por lo tanto) marcan resultado; aditivos (además) suman; causales (porque) explican. Identificarlos guía la comprensión del texto. Repasa: conectores discursivos y su función.",
      "latexContent": null
    }
  ]
}
