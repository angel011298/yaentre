# Materia: Matemáticas

Guía específica:

- Todos los desarrollos algebraicos van en LaTeX (`$...$` inline, `latexContent` en la capa 2).
- Los distractores numéricos salen de errores de procedimiento reales: error de signo, olvidar el coeficiente ½, confundir vértice con raíces, usar el perímetro donde va el área, etc.
- Verifica la aritmética dos veces antes de emitir el reactivo: un reactivo de matemáticas con la correcta mal calculada es inaceptable.
- Opciones numéricas siempre en orden ascendente.

## Ejemplos del formato exacto (few-shot)

Ejemplo 1 — álgebra, sistema de ecuaciones (INTERMEDIATE):

{
  "stem": "Si $2x + y = 7$ y $x - y = 2$, ¿cuál es el valor del producto $x \\cdot y$?",
  "options": [
    { "id": "A", "text": "$1$", "isCorrect": false },
    { "id": "B", "text": "$2$", "isCorrect": false },
    { "id": "C", "text": "$3$", "isCorrect": true },
    { "id": "D", "text": "$6$", "isCorrect": false }
  ],
  "difficulty": "INTERMEDIATE",
  "explanations": [
    {
      "layer": 1,
      "title": "Suma de ecuaciones",
      "content": "Al sumar ambas ecuaciones se elimina $y$, lo que da $3x = 9$, es decir $x = 3$. Sustituyendo en la segunda ecuación, $y = 1$. El producto pedido es $3 \\cdot 1 = 3$.",
      "latexContent": null
    },
    {
      "layer": 2,
      "title": "Resolución paso a paso",
      "content": "1) Suma las dos ecuaciones para eliminar $y$. 2) Despeja $x$. 3) Sustituye $x$ en cualquiera de las ecuaciones originales para obtener $y$. 4) Calcula el producto. Si obtuviste $1$, probablemente reportaste el valor de $y$ en lugar del producto; si obtuviste $2$, confundiste el producto con la diferencia $x - y$.",
      "latexContent": "(2x + y) + (x - y) = 7 + 2 \\\\ 3x = 9 \\implies x = 3 \\\\ 3 - y = 2 \\implies y = 1 \\\\ x \\cdot y = 3 \\cdot 1 = 3"
    },
    {
      "layer": 3,
      "title": "Sistemas de ecuaciones lineales 2×2",
      "content": "Un sistema de dos ecuaciones lineales con dos incógnitas se resuelve por suma y resta (eliminación), sustitución o igualación. La eliminación conviene cuando los coeficientes de una variable son opuestos o fáciles de igualar. Repasa: métodos de solución de sistemas 2×2 y comprobación de la solución.",
      "latexContent": null
    }
  ]
}

Ejemplo 2 — geometría, perímetro y área (BASIC):

{
  "stem": "Un rectángulo tiene un perímetro de $36\\,\\text{cm}$ y su largo mide el doble que su ancho. ¿Cuál es el área del rectángulo?",
  "options": [
    { "id": "A", "text": "$36\\,\\text{cm}^2$", "isCorrect": false },
    { "id": "B", "text": "$54\\,\\text{cm}^2$", "isCorrect": false },
    { "id": "C", "text": "$72\\,\\text{cm}^2$", "isCorrect": true },
    { "id": "D", "text": "$108\\,\\text{cm}^2$", "isCorrect": false }
  ],
  "difficulty": "BASIC",
  "explanations": [
    {
      "layer": 1,
      "title": "Del perímetro a los lados",
      "content": "Con ancho $a$ y largo $2a$, el perímetro es $2(a + 2a) = 6a = 36$, así que $a = 6$ y el largo es $12$. El área es $6 \\times 12 = 72\\,\\text{cm}^2$.",
      "latexContent": null
    },
    {
      "layer": 2,
      "title": "Resolución paso a paso",
      "content": "1) Nombra el ancho como $a$; el largo es $2a$. 2) Plantea el perímetro: $2(a + 2a) = 36$. 3) Resuelve: $a = 6$, largo $= 12$. 4) Área $=$ largo $\\times$ ancho $= 72$. Si respondiste $36$, confundiste el área con el valor del perímetro: son magnitudes distintas.",
      "latexContent": "P = 2(a + 2a) = 6a = 36 \\implies a = 6 \\\\ \\text{largo} = 2a = 12 \\\\ A = 12 \\times 6 = 72\\,\\text{cm}^2"
    },
    {
      "layer": 3,
      "title": "Perímetro vs. área",
      "content": "El perímetro mide el contorno (unidades lineales, cm) y el área mide la superficie (unidades cuadradas, cm²). En problemas con relaciones entre lados, traduce la relación a una sola variable antes de usar la fórmula. Repasa: fórmulas de perímetro y área de cuadriláteros.",
      "latexContent": null
    }
  ]
}

Ejemplo 3 — funciones, vértice de parábola (ADVANCED):

{
  "stem": "¿Cuáles son las coordenadas del vértice de la parábola $y = x^2 - 6x + 5$?",
  "options": [
    { "id": "A", "text": "$(-3, -4)$", "isCorrect": false },
    { "id": "B", "text": "$(3, -4)$", "isCorrect": true },
    { "id": "C", "text": "$(3, 4)$", "isCorrect": false },
    { "id": "D", "text": "$(6, 5)$", "isCorrect": false }
  ],
  "difficulty": "ADVANCED",
  "explanations": [
    {
      "layer": 1,
      "title": "Vértice con $h = -b/2a$",
      "content": "Para $y = ax^2 + bx + c$, la abscisa del vértice es $h = -\\frac{b}{2a} = -\\frac{-6}{2} = 3$. Evaluando, $y(3) = 9 - 18 + 5 = -4$. El vértice es $(3, -4)$.",
      "latexContent": null
    },
    {
      "layer": 2,
      "title": "Resolución paso a paso",
      "content": "1) Identifica $a = 1$, $b = -6$, $c = 5$. 2) Calcula $h = -b/2a = 3$. 3) Sustituye $x = 3$ en la función para obtener $k = -4$. Si obtuviste $(-3, -4)$, cometiste un error de signo al aplicar $-b/2a$; si obtuviste $(6, 5)$, leíste los coeficientes como coordenadas, que es el error de lectura más común en este reactivo.",
      "latexContent": "h = -\\frac{b}{2a} = -\\frac{(-6)}{2(1)} = 3 \\\\ k = (3)^2 - 6(3) + 5 = 9 - 18 + 5 = -4 \\\\ V(3, -4)"
    },
    {
      "layer": 3,
      "title": "Forma estándar y vértice de la parábola",
      "content": "Toda función cuadrática $y = ax^2 + bx + c$ tiene vértice en $\\left(-\\frac{b}{2a},\\, f\\left(-\\frac{b}{2a}\\right)\\right)$; también puede hallarse completando el cuadrado. El signo de $a$ indica si el vértice es mínimo ($a > 0$) o máximo ($a < 0$). Repasa: función cuadrática, completar el cuadrado y gráfica de la parábola.",
      "latexContent": null
    }
  ]
}
