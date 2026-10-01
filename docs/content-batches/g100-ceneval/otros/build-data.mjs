export const TOPICS = [
  { id: 'cmrr1kxll009jhi3n8g2zoku1', file: '1-ipn-ecuaciones.json', name: 'Ecuaciones lineales y cuadráticas (IPN)' },
  { id: 'cmrr1l37m00a5hi3n0nuo6d74', file: '2-ipn-cinematica.json', name: 'Cinemática (IPN)' },
  { id: 'cmrr1iwgb000khi3nzn34qded', file: '3-unam-polinomios-funciones.json', name: 'Polinomios y funciones (UNAM)' },
];

// Orden FIJO: verify-calcs.mjs recalcula cada reactivo por su índice en este arreglo.
export const ITEMS = [
  // ───────────── Tema 1: Ecuaciones lineales y cuadráticas ─────────────
  // 0 · MC BASIC · lineal con fracciones
  {
    topic: 1,
    stem: 'Resuelve la ecuación $\\dfrac{x+1}{2}-\\dfrac{x-3}{4}=4$. ¿Cuál es el valor de $x$?',
    correct: '$x=11$',
    distractors: ['$x=17$', '$x=-1$', '$x=21$'],
    difficulty: 'BASIC',
    format: 'MULTIPLE_CHOICE',
    layer1:
      'En una ecuación lineal con fracciones conviene multiplicar ambos lados por el mínimo común múltiplo de los denominadores para eliminarlas. Después se reducen términos semejantes y se despeja la incógnita.',
    layer2:
      'El mínimo común múltiplo de 2 y 4 es 4, así que se multiplica toda la ecuación por 4: $2(x+1)-(x-3)=16$. Al distribuir, el signo menos afecta a los dos términos del paréntesis: $2x+2-x+3=16$, es decir $x+5=16$. Por tanto $x=11$. Comprobación: $\\dfrac{12}{2}-\\dfrac{8}{4}=6-2=4$.',
    layer3:
      'El valor $x=17$ sale de olvidar que el signo menos cambia también el $-3$ y escribir $2x+2-x-3=16$. El valor $x=-1$ aparece cuando se multiplica el lado izquierdo por 4 pero el 4 del lado derecho se deja sin multiplicar. El valor $x=21$ resulta de pasar el 5 al otro lado con el signo equivocado, sumándolo en lugar de restarlo.',
  },
  // 1 · MC INTERMEDIATE · discriminante / raíz doble
  {
    topic: 1,
    stem: '¿Para qué valor de $k$ la ecuación $3x^2-12x+k=0$ tiene una única solución real (una raíz doble)?',
    correct: '$k=12$',
    distractors: ['$k=36$', '$k=4$', '$k=2$'],
    difficulty: 'INTERMEDIATE',
    format: 'MULTIPLE_CHOICE',
    layer1:
      'Una ecuación cuadrática $ax^2+bx+c=0$ tiene una sola solución real cuando su discriminante $b^2-4ac$ es igual a cero. Esa condición permite despejar el parámetro desconocido.',
    layer2:
      'Aquí $a=3$, $b=-12$ y $c=k$. Se iguala el discriminante a cero: $(-12)^2-4(3)k=0$, es decir $144-12k=0$, de donde $k=12$. Comprobación: $3x^2-12x+12=3(x-2)^2$, que tiene la raíz doble $x=2$.',
    layer3:
      'El valor $k=36$ se obtiene al olvidar el coeficiente $a=3$ y plantear $144-4k=0$. El valor $k=4$ aparece al pensar que $k$ es el cuadrado de la raíz doble $x=2$, sin multiplicar por $a$. El valor $k=2$ confunde el parámetro con la propia raíz doble.',
  },
  // 2 · PS ADVANCED · radical con raíz extraña
  {
    topic: 1,
    stem: '¿Cuál es el conjunto solución, en los números reales, de la ecuación $\\sqrt{x+7}+5=x$?',
    correct: '$\\{9\\}$',
    distractors: ['$\\{2,\\,9\\}$', '$\\{2\\}$', '$\\{-9,\\,-2\\}$'],
    difficulty: 'ADVANCED',
    format: 'PROBLEM_SOLVING',
    layer1:
      'Para resolver una ecuación con un radical se aísla la raíz y se eleva al cuadrado ambos lados. Como elevar al cuadrado puede introducir soluciones que no cumplen la ecuación original (raíces extrañas), todas las raíces obtenidas deben comprobarse en la ecuación inicial.',
    layer2:
      'Se aísla el radical: $\\sqrt{x+7}=x-5$. Al elevar al cuadrado: $x+7=x^2-10x+25$, lo que lleva a $x^2-11x+18=0$ y se factoriza como $(x-2)(x-9)=0$, con candidatos $x=2$ y $x=9$. Comprobación con $x=2$: $\\sqrt{9}+5=8\\neq 2$, así que es raíz extraña. Con $x=9$: $\\sqrt{16}+5=9$, correcto. El conjunto solución es $\\{9\\}$.',
    layer3:
      'El conjunto $\\{2,\\,9\\}$ se obtiene al resolver la cuadrática y no comprobar las raíces: el 2 no satisface la ecuación original. El conjunto $\\{2\\}$ conserva justo la raíz extraña y descarta la válida. El conjunto $\\{-9,\\,-2\\}$ proviene de factorizar con los signos invertidos, $(x+2)(x+9)$, que no corresponde a $x^2-11x+18$.',
  },
  // 3 · PS BASIC · sistema 2x2 con contexto
  {
    topic: 1,
    stem:
      'En una papelería, 3 cuadernos y 2 plumas cuestan 76 pesos en total, y 2 cuadernos y 5 plumas cuestan 113 pesos. ¿Cuánto cuesta una pluma?',
    correct: '17 pesos',
    distractors: ['14 pesos', '31 pesos', '59 pesos'],
    difficulty: 'BASIC',
    format: 'PROBLEM_SOLVING',
    layer1:
      'Un sistema de dos ecuaciones lineales con dos incógnitas se resuelve por eliminación o por sustitución. Se plantea una ecuación por cada compra, tomando como incógnitas el precio de un cuaderno $c$ y el de una pluma $p$.',
    layer2:
      'El sistema es $3c+2p=76$ y $2c+5p=113$. Para eliminar $p$, se multiplica la primera por 5 y la segunda por 2: $15c+10p=380$ y $4c+10p=226$. Restando, $11c=154$, luego $c=14$. Sustituyendo en la primera: $42+2p=76$, de modo que $2p=34$ y $p=17$. Comprobación en la segunda: $28+85=113$.',
    layer3:
      'El valor de 14 pesos es el precio del cuaderno, que es la primera incógnita que se despeja, no la que se pregunta. El valor de 31 pesos es la suma de ambos precios, $14+17$. El valor de 59 pesos aparece al sustituir $c=14$ y pasar el 42 sumando: $2p=76+42=118$.',
  },
  // 4 · PS BASIC · lineal con contexto (taxi)
  {
    topic: 1,
    stem:
      'Un taxi cobra 18 pesos de banderazo más 6 pesos por cada kilómetro recorrido. Si un pasajero pagó 96 pesos en total, ¿cuántos kilómetros recorrió?',
    correct: '13 km',
    distractors: ['19 km', '16 km', '5 km'],
    difficulty: 'BASIC',
    format: 'PROBLEM_SOLVING',
    layer1:
      'Un cobro con una parte fija y una parte proporcional se modela con una ecuación lineal: total = cuota fija + tarifa por unidad × cantidad. Se despeja la cantidad desconocida.',
    layer2:
      'Sea $k$ el número de kilómetros. La ecuación es $18+6k=96$. Se resta la cuota fija: $6k=78$. Se divide entre 6: $k=13$. Comprobación: $18+6(13)=18+78=96$ pesos.',
    layer3:
      'La cantidad de 19 km sale de sumar el banderazo al total en lugar de restarlo: $(96+18)/6$. La cantidad de 16 km ignora el banderazo y divide todo el pago entre la tarifa: $96/6$. La cantidad de 5 km resulta de intercambiar los papeles de los datos, restando la tarifa por kilómetro y dividiendo entre el banderazo: $(96-6)/18$.',
  },
  // 5 · PS INTERMEDIATE · edades
  {
    topic: 1,
    stem:
      'Hoy Pedro tiene 4 veces la edad de su hijo. Dentro de 6 años, la edad de Pedro será solo 3 veces la de su hijo. ¿Cuántos años tiene Pedro hoy?',
    correct: '48 años',
    distractors: ['12 años', '54 años', '36 años'],
    difficulty: 'INTERMEDIATE',
    format: 'PROBLEM_SOLVING',
    layer1:
      'En los problemas de edades se elige una incógnita para la edad actual de uno de los personajes y se expresa la otra en función de ella. Después se escribe cómo cambian ambas edades con el tiempo, sumando los mismos años a las dos.',
    layer2:
      'Sea $x$ la edad actual del hijo, de modo que Pedro tiene $4x$. Dentro de 6 años tendrán $x+6$ y $4x+6$, y se cumple $4x+6=3(x+6)$. Al distribuir: $4x+6=3x+18$, de donde $x=12$. Pedro tiene $4(12)=48$ años. Comprobación: dentro de 6 años, 54 y 18, y $54=3\\cdot 18$.',
    layer3:
      'La respuesta de 12 años es la edad del hijo, que es la incógnita auxiliar y no lo que se pregunta. La respuesta de 54 años es la edad que Pedro tendrá dentro de 6 años, no la de hoy. La respuesta de 36 años multiplica la edad del hijo por 3 en lugar de por 4, usando la razón que corresponde al futuro y no la de hoy.',
  },
  // 6 · PS INTERMEDIATE · mezclas
  {
    topic: 1,
    stem:
      'Un químico mezcla $x$ litros de una solución salina al 10 % con 20 litros de otra solución al 40 %, y obtiene una solución al 30 %. ¿Cuántos litros de la solución al 10 % utilizó?',
    correct: '10 litros',
    distractors: ['40 litros', '70 litros', '2 litros'],
    difficulty: 'INTERMEDIATE',
    format: 'PROBLEM_SOLVING',
    layer1:
      'En una mezcla, la cantidad de sal se conserva: la sal de las partes es igual a la sal de la mezcla final. Cada cantidad de sal es el volumen multiplicado por su concentración, y el volumen final es la suma de los volúmenes mezclados.',
    layer2:
      'La sal aportada es $0.10x+0.40(20)$ y la sal de la mezcla es $0.30(x+20)$. Se plantea $0.10x+8=0.30x+6$. Al agrupar: $2=0.20x$, y entonces $x=10$ litros. Comprobación: $1+8=9$ litros de sal y $0.30(30)=9$.',
    layer3:
      'El resultado de 40 litros aparece al olvidar que el volumen final incluye los 20 litros y escribir $0.10x+8=0.30x$. El resultado de 70 litros viene de pasar el 6 con el signo equivocado, escribiendo $0.10x+8=0.30x-6$. El resultado de 2 litros se queda en la ecuación $0.20x=2$ y toma el 2 como respuesta sin dividir entre 0.20.',
  },
  // 7 · PS INTERMEDIATE · cuadrática por área
  {
    topic: 1,
    stem:
      'El largo de un terreno rectangular mide 5 m más que su ancho y su área es de 126 m². ¿Cuál es el perímetro del terreno?',
    correct: '46 m',
    distractors: ['23 m', '66 m', '28 m'],
    difficulty: 'INTERMEDIATE',
    format: 'PROBLEM_SOLVING',
    layer1:
      'El área de un rectángulo es ancho por largo. Si el largo se expresa en función del ancho, el área da una ecuación cuadrática que se resuelve con la fórmula general, y solo se conserva la raíz positiva por ser una longitud.',
    layer2:
      'Sea $a$ el ancho; el largo es $a+5$. Entonces $a(a+5)=126$, es decir $a^2+5a-126=0$. El discriminante es $25+504=529=23^2$, así que $a=\\dfrac{-5\\pm 23}{2}$, con valores 9 y $-14$. Solo sirve $a=9$ m, y el largo es 14 m. El perímetro es $2(9+14)=46$ m. Comprobación: $9\\times 14=126$.',
    layer3:
      'El valor de 23 m es el semiperímetro, $9+14$, al que falta duplicar. El valor de 66 m aparece al tomar 14 como ancho y 19 como largo, es decir, al aplicar el "5 m más" a la raíz equivocada: $2(14+19)$. El valor de 28 m duplica solo el largo, $2\\times 14$, y deja fuera los otros dos lados.',
  },
  // 8 · PS INTERMEDIATE · suma y producto de raíces
  {
    topic: 1,
    stem: 'Una de las raíces de la ecuación $x^2-9x+k=0$ es el doble de la otra. ¿Cuánto vale $k$?',
    correct: '$k=18$',
    distractors: ['$k=27$', '$k=36$', '$k=9$'],
    difficulty: 'INTERMEDIATE',
    format: 'PROBLEM_SOLVING',
    layer1:
      'Si $x_1$ y $x_2$ son las raíces de $x^2+bx+c=0$, entonces $x_1+x_2=-b$ y $x_1x_2=c$ (relaciones de Vieta). La condición sobre las raíces se combina con la suma para encontrarlas, y con el producto se obtiene el parámetro.',
    layer2:
      'Sean las raíces $r$ y $2r$. Su suma es $r+2r=9$, así que $3r=9$ y $r=3$; las raíces son 3 y 6. El producto es $k=3\\cdot 6=18$. Comprobación: $x^2-9x+18=(x-3)(x-6)$.',
    layer3:
      'El valor $k=27$ multiplica la suma de las raíces por la raíz menor, $9\\cdot 3$, mezclando dos relaciones distintas. El valor $k=36$ es el cuadrado de la raíz mayor, $6^2$, en lugar del producto de ambas. El valor $k=9$ es el cuadrado de la raíz menor, $3^2$, y también deja fuera la otra raíz.',
  },

  // ───────────── Tema 2: Cinemática ─────────────
  // 9 · MC BASIC · MRU
  {
    topic: 2,
    stem:
      'Un ciclista recorre 540 metros en 1.5 minutos con rapidez constante. ¿Cuál es su rapidez en metros por segundo?',
    correct: '6 m/s',
    distractors: ['360 m/s', '810 m/s', '9 m/s'],
    difficulty: 'BASIC',
    format: 'MULTIPLE_CHOICE',
    layer1:
      'En el movimiento rectilíneo uniforme la rapidez es el cociente de la distancia entre el tiempo, $v=\\dfrac{d}{t}$. Para expresarla en metros por segundo, el tiempo debe estar en segundos.',
    layer2:
      'Primero se convierte el tiempo: $1.5\\ \\text{min}=1.5\\times 60=90\\ \\text{s}$. Luego $v=\\dfrac{540\\ \\text{m}}{90\\ \\text{s}}=6\\ \\text{m/s}$.',
    layer3:
      'El valor de 360 m/s sale de dividir entre 1.5 sin convertir los minutos, que daría 360 metros por minuto y no por segundo. El valor de 810 m/s multiplica la distancia por el tiempo en lugar de dividir. El valor de 9 m/s trata los 1.5 minutos como si fueran 60 segundos, porque $540/60=9$.',
  },
  // 10 · MC BASIC · caída libre
  {
    topic: 2,
    stem:
      'Una piedra se suelta desde el reposo en un puente y tarda 4 s en llegar al agua. Si se desprecia la resistencia del aire y $g=9.8\\ \\text{m/s}^2$, ¿qué altura tiene el puente?',
    correct: '78.4 m',
    distractors: ['39.2 m', '156.8 m', '19.6 m'],
    difficulty: 'BASIC',
    format: 'MULTIPLE_CHOICE',
    layer1:
      'En caída libre desde el reposo la posición vertical recorrida es $h=\\dfrac{1}{2}gt^2$, porque la velocidad inicial es cero y la aceleración es la gravedad.',
    layer2:
      'Se sustituye $t=4\\ \\text{s}$: $h=\\dfrac{1}{2}(9.8)(4)^2=\\dfrac{1}{2}(9.8)(16)=78.4\\ \\text{m}$.',
    layer3:
      'El valor de 39.2 m es el producto $gt$, que en realidad es la rapidez final en m/s y no una altura. El valor de 156.8 m se obtiene al olvidar el factor $\\dfrac{1}{2}$ de la fórmula. El valor de 19.6 m resulta de usar $\\dfrac{1}{2}gt$, sin elevar el tiempo al cuadrado.',
  },
  // 11 · PS BASIC · MRUA, frenado
  {
    topic: 2,
    stem:
      'Un tren avanza a 24 m/s y empieza a frenar con una aceleración constante de $-1.2\\ \\text{m/s}^2$ hasta detenerse. ¿Qué distancia recorre mientras frena?',
    correct: '240 m',
    distractors: ['720 m', '480 m', '20 m'],
    difficulty: 'BASIC',
    format: 'PROBLEM_SOLVING',
    layer1:
      'Cuando se conocen las velocidades inicial y final, la aceleración y se pide el desplazamiento, sin dato de tiempo, conviene la relación $v^2=v_0^2+2a\\Delta x$. La aceleración de frenado es negativa porque se opone al movimiento.',
    layer2:
      'Con $v=0$, $v_0=24\\ \\text{m/s}$ y $a=-1.2\\ \\text{m/s}^2$: $0=24^2+2(-1.2)\\Delta x$, es decir $0=576-2.4\\,\\Delta x$. Entonces $\\Delta x=\\dfrac{576}{2.4}=240\\ \\text{m}$. Comprobación: el tiempo de frenado es $t=\\dfrac{24}{1.2}=20\\ \\text{s}$ y $\\Delta x=\\dfrac{24}{2}\\cdot 20=240\\ \\text{m}$.',
    layer3:
      'El valor de 720 m resulta de usar $\\Delta x=v_0t+\\dfrac{1}{2}at^2$ con $t=20\\ \\text{s}$ y tomar la aceleración como positiva, de modo que se suma $480+240$ en lugar de restar. El valor de 480 m se obtiene al olvidar el 2 de $2a\\Delta x$, o al suponer que el tren mantiene su rapidez durante los 20 s. El valor de 20 m es en realidad el tiempo de frenado en segundos, no una distancia.',
  },
  // 12 · PS INTERMEDIATE · encuentro de dos móviles
  {
    topic: 2,
    stem:
      'Dos ciudades están a 300 km de distancia sobre una carretera recta. A las 8:00 h sale un autobús de la ciudad A hacia la B a 70 km/h y, a la misma hora, un auto sale de la B hacia la A a 80 km/h, ambos con rapidez constante. ¿A qué distancia de la ciudad A se cruzan?',
    correct: '140 km',
    distractors: ['160 km', '150 km', '2 100 km'],
    difficulty: 'INTERMEDIATE',
    format: 'PROBLEM_SOLVING',
    layer1:
      'Cuando dos móviles avanzan uno hacia el otro con rapidez constante, sus distancias recorridas suman la separación inicial, y ambos viajan el mismo tiempo hasta cruzarse. Con el tiempo de encuentro se calcula la posición.',
    layer2:
      'Si $t$ es el tiempo hasta el cruce, $70t+80t=300$, así que $150t=300$ y $t=2\\ \\text{h}$. El autobús recorre $70\\times 2=140\\ \\text{km}$ desde A. Comprobación: el auto recorre $80\\times 2=160\\ \\text{km}$ y $140+160=300\\ \\text{km}$.',
    layer3:
      'El valor de 160 km es la distancia que recorre el auto desde la ciudad B, no desde A. El valor de 150 km ubica el cruce en el punto medio, como si ambos vehículos fueran a la misma rapidez. El valor de 2 100 km sale de restar las rapideces, $t=\\dfrac{300}{80-70}=30\\ \\text{h}$, que corresponde a un móvil que persigue a otro y no a dos que se acercan de frente.',
  },
  // 13 · PS INTERMEDIATE · tiro vertical
  {
    topic: 2,
    stem:
      'Una pelota se lanza verticalmente hacia arriba con una rapidez inicial de 29.4 m/s. Considera $g=9.8\\ \\text{m/s}^2$ y sin resistencia del aire. ¿Qué altura máxima alcanza y cuánto tarda en volver al punto de lanzamiento?',
    correct: '44.1 m y 6 s',
    distractors: ['44.1 m y 3 s', '88.2 m y 6 s', '176.4 m y 6 s'],
    difficulty: 'INTERMEDIATE',
    format: 'PROBLEM_SOLVING',
    layer1:
      'En un tiro vertical la gravedad frena la subida con aceleración constante $-g$. En el punto más alto la velocidad es cero, y el movimiento de bajada es simétrico al de subida, de modo que el vuelo completo dura el doble que la subida.',
    layer2:
      'El tiempo de subida es $t_s=\\dfrac{v_0}{g}=\\dfrac{29.4}{9.8}=3\\ \\text{s}$. La altura máxima sale de $v^2=v_0^2-2gh$ con $v=0$: $h=\\dfrac{v_0^2}{2g}=\\dfrac{864.36}{19.6}=44.1\\ \\text{m}$. El tiempo hasta regresar al punto de lanzamiento es $2t_s=6\\ \\text{s}$.',
    layer3:
      'La respuesta de 44.1 m y 3 s da bien la altura, pero reporta solo el tiempo de subida y no el regreso al punto de lanzamiento. La respuesta de 88.2 m y 6 s usa $\\dfrac{v_0^2}{g}$, olvidando el 2 del denominador. La respuesta de 176.4 m y 6 s calcula la altura como una caída libre de 6 s, $\\dfrac{1}{2}g(6)^2$, cuando la pelota solo sube durante la mitad del vuelo.',
  },

  // ───────────── Tema 3: Polinomios y funciones ─────────────
  // 14 · MC BASIC · teorema del residuo
  {
    topic: 3,
    stem:
      '¿Cuál es el residuo que se obtiene al dividir $p(x)=2x^3-5x^2+3x-7$ entre $x-2$?',
    correct: '$-5$',
    distractors: ['$-49$', '$-17$', '$5$'],
    difficulty: 'BASIC',
    format: 'MULTIPLE_CHOICE',
    layer1:
      'El teorema del residuo establece que el residuo de dividir un polinomio $p(x)$ entre $x-a$ es el valor $p(a)$. Así no hace falta realizar la división completa.',
    layer2:
      'El divisor $x-2$ corresponde a $a=2$. Se evalúa: $p(2)=2(8)-5(4)+3(2)-7=16-20+6-7=-5$. El residuo es $-5$. Con división sintética con coeficientes 2, $-5$, 3, $-7$ y el valor 2 se obtienen 2, $-1$, 1 y finalmente $-5$, que coincide.',
    layer3:
      'El valor $-49$ proviene de evaluar $p(-2)$, es decir, de usar el cero de $x+2$ en lugar del de $x-2$. El valor $-17$ aparece al equivocar el signo del término $3x$ y calcular $16-20-6-7$. El valor $5$ es el opuesto del correcto y surge de creer que el residuo es $-p(2)$.',
  },
  // 15 · PS ADVANCED · raíces racionales + Vieta
  {
    topic: 3,
    stem:
      'El polinomio $p(x)=2x^3+x^2-13x+6$ tiene tres raíces racionales. ¿Cuál es la suma de los cuadrados de esas raíces?',
    correct: '$\\dfrac{53}{4}$',
    distractors: ['$\\dfrac{1}{4}$', '$-\\dfrac{51}{4}$', '$\\dfrac{27}{4}$'],
    difficulty: 'ADVANCED',
    format: 'PROBLEM_SOLVING',
    layer1:
      'Las posibles raíces racionales de un polinomio con coeficientes enteros son de la forma $\\dfrac{p}{q}$, con $p$ divisor del término independiente y $q$ divisor del coeficiente principal. Al encontrar una raíz, el teorema del factor permite dividir y reducir el grado hasta factorizar por completo.',
    layer2:
      'Entre los candidatos se prueba $x=2$: $p(2)=16+4-26+6=0$, así que $x-2$ es factor. La división sintética da $2x^2+5x-3=(2x-1)(x+3)$, luego $p(x)=(x-2)(2x-1)(x+3)$ y las raíces son $2$, $\\dfrac{1}{2}$ y $-3$. La suma de cuadrados es $4+\\dfrac{1}{4}+9=\\dfrac{53}{4}$. Con las relaciones de Vieta: suma $=-\\dfrac{1}{2}$, suma de productos por pares $=-\\dfrac{13}{2}$, y $\\left(-\\dfrac{1}{2}\\right)^2-2\\left(-\\dfrac{13}{2}\\right)=\\dfrac{1}{4}+13=\\dfrac{53}{4}$.',
    layer3:
      'El valor $\\dfrac{1}{4}$ es el cuadrado de la suma de las raíces, $\\left(-\\dfrac{1}{2}\\right)^2$, que no es la suma de los cuadrados. El valor $-\\dfrac{51}{4}$ resulta de usar el signo contrario para la suma de productos por pares, restando 13 en lugar de sumarlo. El valor $\\dfrac{27}{4}$ olvida el factor 2 en la identidad, calculando $\\dfrac{1}{4}+\\dfrac{13}{2}$.',
  },
];
