# Materia: Física

Guía específica:

- Incluye siempre unidades en el SI dentro de LaTeX: `$2\\,\\text{m/s}^2$`, `$12\\,\\text{N}$`.
- Los distractores salen de: omitir el factor ½ en cinemática, confundir $v = at$ con $d = \\frac{1}{2}at^2$, sumar en lugar de multiplicar en $F = ma$, errores de conversión de unidades.
- Cuida la consistencia física: los datos del enunciado deben ser realistas (velocidades, masas y tiempos plausibles).
- La capa 2 siempre lleva `latexContent` con el desarrollo.

## Ejemplos del formato exacto (few-shot)

Ejemplo 1 — cinemática, MRUA (INTERMEDIATE):

{
  "stem": "Un móvil parte del reposo con aceleración constante de $2\\,\\text{m/s}^2$. ¿Qué distancia recorre en $5\\,\\text{s}$?",
  "options": [
    { "id": "A", "text": "$10\\,\\text{m}$", "isCorrect": false },
    { "id": "B", "text": "$25\\,\\text{m}$", "isCorrect": true },
    { "id": "C", "text": "$50\\,\\text{m}$", "isCorrect": false },
    { "id": "D", "text": "$100\\,\\text{m}$", "isCorrect": false }
  ],
  "difficulty": "INTERMEDIATE",
  "explanations": [
    {
      "layer": 1,
      "title": "Distancia en MRUA desde el reposo",
      "content": "Como parte del reposo ($v_0 = 0$), la distancia es $d = \\frac{1}{2}at^2 = \\frac{1}{2}(2)(5)^2 = 25\\,\\text{m}$.",
      "latexContent": null
    },
    {
      "layer": 2,
      "title": "Resolución paso a paso",
      "content": "1) Identifica los datos: $v_0 = 0$, $a = 2\\,\\text{m/s}^2$, $t = 5\\,\\text{s}$. 2) Elige la ecuación de posición del MRUA. 3) Sustituye y calcula. Si obtuviste $50\\,\\text{m}$, olvidaste el factor $\\frac{1}{2}$ (el error más frecuente); si obtuviste $10\\,\\text{m}$, calculaste la velocidad final $v = at$ en lugar de la distancia.",
      "latexContent": "d = v_0 t + \\frac{1}{2}at^2 \\\\ d = 0 + \\frac{1}{2}(2\\,\\text{m/s}^2)(5\\,\\text{s})^2 \\\\ d = \\frac{1}{2}(2)(25) = 25\\,\\text{m}"
    },
    {
      "layer": 3,
      "title": "Ecuaciones del MRUA",
      "content": "En el movimiento rectilíneo uniformemente acelerado las tres ecuaciones clave son $v = v_0 + at$, $d = v_0 t + \\frac{1}{2}at^2$ y $v^2 = v_0^2 + 2ad$. Elige la que conecta los datos con la incógnita sin pasos intermedios. Repasa: MRUA y análisis dimensional para verificar resultados.",
      "latexContent": null
    }
  ]
}

Ejemplo 2 — dinámica, segunda ley de Newton (BASIC):

{
  "stem": "¿Cuál es la magnitud de la fuerza neta necesaria para que una masa de $4\\,\\text{kg}$ adquiera una aceleración de $3\\,\\text{m/s}^2$?",
  "options": [
    { "id": "A", "text": "$0.75\\,\\text{N}$", "isCorrect": false },
    { "id": "B", "text": "$7\\,\\text{N}$", "isCorrect": false },
    { "id": "C", "text": "$12\\,\\text{N}$", "isCorrect": true },
    { "id": "D", "text": "$24\\,\\text{N}$", "isCorrect": false }
  ],
  "difficulty": "BASIC",
  "explanations": [
    {
      "layer": 1,
      "title": "Aplicación directa de $F = ma$",
      "content": "La segunda ley de Newton establece $F = ma$. Sustituyendo, $F = (4\\,\\text{kg})(3\\,\\text{m/s}^2) = 12\\,\\text{N}$.",
      "latexContent": null
    },
    {
      "layer": 2,
      "title": "Resolución paso a paso",
      "content": "1) Identifica $m = 4\\,\\text{kg}$ y $a = 3\\,\\text{m/s}^2$. 2) La fuerza neta es el producto $F = ma$. 3) Multiplica: $F = 12\\,\\text{N}$. Si obtuviste $7\\,\\text{N}$, sumaste masa y aceleración en lugar de multiplicarlas; si obtuviste $0.75\\,\\text{N}$, dividiste $a$ entre $m$, que corresponde a otro despeje.",
      "latexContent": "F = ma = (4\\,\\text{kg})(3\\,\\text{m/s}^2) = 12\\,\\text{N}"
    },
    {
      "layer": 3,
      "title": "Segunda ley de Newton",
      "content": "La fuerza neta sobre un cuerpo es proporcional a su masa y a la aceleración que experimenta: $F = ma$, con unidades $1\\,\\text{N} = 1\\,\\text{kg} \\cdot \\text{m/s}^2$. De esta relación se despeja cualquiera de las tres variables. Repasa: leyes de Newton y unidades del SI.",
      "latexContent": null
    }
  ]
}
