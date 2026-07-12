# Materia: Historia

Guía específica:

- Materia de humanidades: **nunca uses LaTeX** (`latexContent: null` en las tres capas).
- Enfócate en el temario de historia de México y universal del bachillerato mexicano (UNAM/IPN/EXANI).
- Los distractores salen de confusiones cronológicas reales, atribuir un hecho al personaje equivocado, o mezclar causas de procesos distintos.
- Evita fechas-trampa demasiado finas; mide comprensión de procesos, no memorización de días exactos.
- Redacta con neutralidad histórica; sin juicios de valor ni anacronismos.

## Ejemplos del formato exacto (few-shot)

Ejemplo 1 — Independencia de México (BASIC):

{
  "stem": "¿Con qué acontecimiento se marca convencionalmente el inicio de la guerra de Independencia de México en 1810?",
  "options": [
    { "id": "A", "text": "La promulgación de la Constitución de Apatzingán", "isCorrect": false },
    { "id": "B", "text": "El Grito de Dolores encabezado por Miguel Hidalgo", "isCorrect": true },
    { "id": "C", "text": "La firma de los Tratados de Córdoba", "isCorrect": false },
    { "id": "D", "text": "La entrada del Ejército Trigarante a la Ciudad de México", "isCorrect": false }
  ],
  "difficulty": "BASIC",
  "explanations": [
    {
      "layer": 1,
      "title": "El Grito de Dolores",
      "content": "La madrugada del 16 de septiembre de 1810, Miguel Hidalgo convocó al pueblo a levantarse en armas desde el pueblo de Dolores. Este llamado, conocido como el Grito de Dolores, marca el inicio convencional de la lucha independentista.",
      "latexContent": null
    },
    {
      "layer": 2,
      "title": "Ubicando cada opción en el tiempo",
      "content": "1) El Grito de Dolores (1810) inicia la guerra. 2) La Constitución de Apatzingán es de 1814, en plena guerra. 3) Los Tratados de Córdoba (1821) reconocen la Independencia. 4) La entrada del Ejército Trigarante (1821) la consuma. Las opciones incorrectas corresponden al final del proceso, no a su inicio: el error típico es confundir el comienzo con la consumación de 1821.",
      "latexContent": null
    },
    {
      "layer": 3,
      "title": "Etapas de la Independencia",
      "content": "La Independencia de México (1810-1821) suele dividirse en cuatro etapas: inicio (Hidalgo), organización (Morelos), resistencia (Guerrero) y consumación (Iturbide-Guerrero). Ubicar cada hecho en su etapa evita confundir inicio con final. Repasa: cronología y etapas de la guerra de Independencia.",
      "latexContent": null
    }
  ]
}

Ejemplo 2 — Revolución Mexicana (INTERMEDIATE):

{
  "stem": "¿Cuál fue el principal motivo por el que Francisco I. Madero proclamó el Plan de San Luis en 1910?",
  "options": [
    { "id": "A", "text": "Desconocer la reelección de Porfirio Díaz y convocar a un levantamiento armado", "isCorrect": true },
    { "id": "B", "text": "Establecer el reparto agrario de las haciendas", "isCorrect": false },
    { "id": "C", "text": "Nacionalizar la industria petrolera", "isCorrect": false },
    { "id": "D", "text": "Promulgar una nueva constitución política", "isCorrect": false }
  ],
  "difficulty": "INTERMEDIATE",
  "explanations": [
    {
      "layer": 1,
      "title": "El Plan de San Luis y el sufragio efectivo",
      "content": "El Plan de San Luis desconoció el resultado de las elecciones de 1910 —en las que Díaz se reeligió— bajo el lema 'Sufragio efectivo, no reelección', y llamó al pueblo a levantarse en armas el 20 de noviembre de 1910.",
      "latexContent": null
    },
    {
      "layer": 2,
      "title": "Separando causas de consecuencias",
      "content": "1) El motivo central del Plan fue político: la no reelección y el fraude electoral. 2) El reparto agrario fue bandera del zapatismo (Plan de Ayala, 1911), posterior. 3) La nacionalización del petróleo ocurrió en 1938 con Cárdenas. 4) La nueva constitución llegó en 1917. El error común es atribuir a Madero las demandas agrarias o petroleras, que pertenecen a otras etapas y líderes.",
      "latexContent": null
    },
    {
      "layer": 3,
      "title": "Causas de la Revolución Mexicana",
      "content": "La Revolución (1910-1920) combinó demandas políticas (antirreeleccionismo maderista) y sociales (agrarismo zapatista, obrerismo). Distinguir qué líder y qué plan representa cada demanda es clave para no mezclar procesos. Repasa: planes revolucionarios y sus autores.",
      "latexContent": null
    }
  ]
}
