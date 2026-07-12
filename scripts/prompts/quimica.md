# Materia: Química

Guía específica:

- Usa LaTeX para fórmulas y ecuaciones: subíndices $\\text{H}_2\\text{O}$, coeficientes de balanceo, notación de moles $\\text{mol}$.
- Los distractores salen de: no balancear la ecuación, confundir número atómico con masa atómica, invertir la relación estequiométrica, errores en cifras significativas.
- Para reactivos de balanceo o estequiometría, la capa 2 lleva `latexContent` con la ecuación balanceada.
- Verifica que las fórmulas químicas y las masas molares sean correctas antes de emitir.

## Ejemplos del formato exacto (few-shot)

Ejemplo 1 — estequiometría, balanceo (INTERMEDIATE):

{
  "stem": "Al balancear la ecuación $\\text{H}_2 + \\text{O}_2 \\rightarrow \\text{H}_2\\text{O}$, ¿cuál es la suma de los coeficientes estequiométricos mínimos enteros?",
  "options": [
    { "id": "A", "text": "$3$", "isCorrect": false },
    { "id": "B", "text": "$4$", "isCorrect": false },
    { "id": "C", "text": "$5$", "isCorrect": true },
    { "id": "D", "text": "$6$", "isCorrect": false }
  ],
  "difficulty": "INTERMEDIATE",
  "explanations": [
    {
      "layer": 1,
      "title": "Ecuación balanceada",
      "content": "El balanceo correcto es $2\\text{H}_2 + \\text{O}_2 \\rightarrow 2\\text{H}_2\\text{O}$. Los coeficientes son $2$, $1$ y $2$, cuya suma es $5$.",
      "latexContent": null
    },
    {
      "layer": 2,
      "title": "Resolución paso a paso",
      "content": "1) Cuenta los átomos de cada elemento en ambos lados. 2) Ajusta el oxígeno: hay 2 a la izquierda, así que necesitas 2 moléculas de agua. 3) Eso da 4 hidrógenos a la derecha, por lo que se requieren $2\\text{H}_2$. 4) Suma los coeficientes $2 + 1 + 2 = 5$. Si obtuviste $3$, sumaste los coeficientes dejando el $1$ del $\\text{O}_2$ sin contar o no balanceaste.",
      "latexContent": "2\\text{H}_2 + \\text{O}_2 \\rightarrow 2\\text{H}_2\\text{O} \\\\ 2 + 1 + 2 = 5"
    },
    {
      "layer": 3,
      "title": "Ley de conservación de la masa",
      "content": "Balancear una ecuación química aplica la ley de conservación de la masa: el número de átomos de cada elemento debe ser igual en reactivos y productos. Un coeficiente ausente se entiende como $1$ y sí cuenta en la suma. Repasa: balanceo por tanteo y conservación de la materia.",
      "latexContent": null
    }
  ]
}

Ejemplo 2 — estructura atómica (BASIC):

{
  "stem": "El número atómico del sodio ($\\text{Na}$) es 11 y su número de masa es 23. ¿Cuántos neutrones tiene un átomo neutro de sodio?",
  "options": [
    { "id": "A", "text": "$11$", "isCorrect": false },
    { "id": "B", "text": "$12$", "isCorrect": true },
    { "id": "C", "text": "$23$", "isCorrect": false },
    { "id": "D", "text": "$34$", "isCorrect": false }
  ],
  "difficulty": "BASIC",
  "explanations": [
    {
      "layer": 1,
      "title": "Neutrones = masa − número atómico",
      "content": "El número de neutrones se obtiene restando el número atómico ($Z = 11$) al número de masa ($A = 23$): $23 - 11 = 12$.",
      "latexContent": null
    },
    {
      "layer": 2,
      "title": "Resolución paso a paso",
      "content": "1) El número atómico $Z = 11$ es el número de protones. 2) El número de masa $A = 23$ es la suma de protones y neutrones. 3) Neutrones $= A - Z = 23 - 11 = 12$. Si respondiste $11$, diste el número de protones; si respondiste $23$, diste el número de masa completo; si sumaste, obtuviste $34$.",
      "latexContent": null
    },
    {
      "layer": 3,
      "title": "Estructura del átomo",
      "content": "El número atómico ($Z$) identifica al elemento y cuenta sus protones; el número de masa ($A$) suma protones y neutrones. En un átomo neutro, los electrones igualan a los protones. Repasa: partículas subatómicas, número atómico, número de masa e isótopos.",
      "latexContent": null
    }
  ]
}
