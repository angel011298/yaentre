# Materia: Biología

Guía específica:

- Materia conceptual: normalmente **sin LaTeX** (`latexContent: null` en las tres capas), salvo alguna proporción o fórmula puntual.
- Los distractores salen de confusiones conceptuales reales: organelo con función equivocada, confundir mitosis con meiosis, mezclar niveles de organización, invertir causa y efecto en procesos.
- Usa terminología del temario oficial de bachillerato, no de nivel universitario avanzado.

## Ejemplos del formato exacto (few-shot)

Ejemplo 1 — biología celular (BASIC):

{
  "stem": "¿Cuál es el organelo responsable de la producción de energía (ATP) en las células eucariotas?",
  "options": [
    { "id": "A", "text": "El ribosoma", "isCorrect": false },
    { "id": "B", "text": "La mitocondria", "isCorrect": true },
    { "id": "C", "text": "El aparato de Golgi", "isCorrect": false },
    { "id": "D", "text": "El núcleo", "isCorrect": false }
  ],
  "difficulty": "BASIC",
  "explanations": [
    {
      "layer": 1,
      "title": "La mitocondria y la respiración celular",
      "content": "La mitocondria realiza la respiración celular, proceso que produce la mayor parte del ATP de la célula. Por eso se le llama la 'central energética' de la célula.",
      "latexContent": null
    },
    {
      "layer": 2,
      "title": "Descartando cada opción",
      "content": "1) El ribosoma sintetiza proteínas, no energía. 2) El aparato de Golgi empaqueta y distribuye proteínas. 3) El núcleo almacena el material genético. 4) Solo la mitocondria genera ATP mediante la respiración celular. El error común es elegir el núcleo por asociarlo con el 'control' de la célula, pero controlar no es producir energía.",
      "latexContent": null
    },
    {
      "layer": 3,
      "title": "Organelos y sus funciones",
      "content": "Cada organelo tiene una función especializada: mitocondria (energía), ribosoma (síntesis de proteínas), Golgi (empaquetado), retículo endoplásmico (transporte y síntesis), núcleo (información genética). Repasa: estructura de la célula eucariota y la función de cada organelo.",
      "latexContent": null
    }
  ]
}

Ejemplo 2 — genética (INTERMEDIATE):

{
  "stem": "En un cruce entre dos individuos heterocigotos (Aa × Aa) para un gen con dominancia completa, ¿qué proporción fenotípica se espera en la descendencia?",
  "options": [
    { "id": "A", "text": "1:1", "isCorrect": false },
    { "id": "B", "text": "1:2:1", "isCorrect": false },
    { "id": "C", "text": "3:1", "isCorrect": true },
    { "id": "D", "text": "9:3:3:1", "isCorrect": false }
  ],
  "difficulty": "INTERMEDIATE",
  "explanations": [
    {
      "layer": 1,
      "title": "Cruce monohíbrido Aa × Aa",
      "content": "En un cruce monohíbrido de heterocigotos con dominancia completa, el cuadro de Punnett da 3 individuos con el fenotipo dominante y 1 con el recesivo: proporción fenotípica 3:1.",
      "latexContent": null
    },
    {
      "layer": 2,
      "title": "Resolución paso a paso",
      "content": "1) Cruza Aa × Aa en un cuadro de Punnett. 2) Genotipos resultantes: 1 AA, 2 Aa, 1 aa (proporción 1:2:1). 3) Con dominancia completa, AA y Aa muestran el mismo fenotipo, así que 3 dominantes : 1 recesivo. El error frecuente es dar la proporción genotípica 1:2:1 cuando se pregunta la fenotípica; 9:3:3:1 corresponde a un cruce dihíbrido, no monohíbrido.",
      "latexContent": null
    },
    {
      "layer": 3,
      "title": "Leyes de Mendel",
      "content": "La primera ley (segregación) explica el cruce monohíbrido: los alelos se separan en la formación de gametos. Distingue siempre proporción genotípica (combinaciones de alelos) de fenotípica (rasgos observables). Repasa: cuadro de Punnett, dominancia completa y leyes de Mendel.",
      "latexContent": null
    }
  ]
}
