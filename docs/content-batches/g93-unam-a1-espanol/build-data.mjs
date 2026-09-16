// Datos fuente del lote G93 — 40 reactivos de Español, UNAM Área 1
// (pool compartido UNAM:ESPANOL, insertados contra el Subject de Área 1 por
// ser el de mayor contenido del grupo — regla G26). texts[0] es SIEMPRE la
// respuesta correcta; build.mjs la baraja con crypto.randomInt.
//
// topic: índice 1-7 → ver TOPIC_IDS/TOPIC_FILE_NAMES en build.mjs.
// sourceChunks: índices 1-based sobre los hasta 12 SourceChunk que
// loadTopicChunks(topicId, 12) carga para ESE tema (orden createdAt asc,
// confirmado con scripts/g93/peek-chunks.ts) — nunca de otro tema.

export const TOPIC_IDS = [
  'cmrr1jdtu002ghi3n7j7kc14q', // 1 Ortografía y puntuación
  'cmrr1je98002ihi3ndr1xdv8t', // 2 Morfosintaxis
  'cmrr1jes9002khi3nwx46c11d', // 3 Semántica
  'cmrr1jfdd002mhi3n55zq7o6c', // 4 Literatura medieval
  'cmrr1jfvg002ohi3ndoxs1etc', // 5 Literatura moderna
  'cmrr1jghp002qhi3nqdkertop', // 6 Redacción de textos
  'cmrr1jgz2002shi3nqpqjyheu', // 7 Comprensión lectora
];

export const ITEMS = [
  // ───────────────────────── 1. Ortografía y puntuación (5) ─────────────────────────
  {
    topic: 1,
    stem: '¿Cuál de las siguientes oraciones usa correctamente la tilde diacrítica en las palabras "él/el"?',
    correct: 'Él llegó temprano a la reunión, pero el resto del equipo se retrasó.',
    distractors: [
      'El llegó temprano a la reunión, pero él resto del equipo se retrasó.',
      'Él llegó temprano a la reunión, pero él resto del equipo se retrasó.',
      'El llegó temprano a la reunión, pero el resto del equipo se retrasó.',
    ],
    difficulty: 'BASIC',
    sourceChunks: [3],
    layer1:
      'La tilde diacrítica distingue palabras que se escriben igual pero cumplen funciones distintas: "él" es pronombre personal (sujeto) y lleva tilde; "el" es artículo determinante y nunca la lleva.',
    layer2:
      '1) "Él llegó..." — "Él" sustituye a una persona (sujeto de "llegó"): pronombre, requiere tilde. 2) "...el resto del equipo..." — "el" antecede al sustantivo "resto": artículo, sin tilde.',
    layer3:
      'Las otras tres oraciones invierten o duplican el error: una acentúa el artículo, otra acentúa ambas palabras y otra no acentúa ninguna, así que ninguna respeta la regla en las dos apariciones a la vez.',
  },
  {
    topic: 1,
    stem: '¿Cuál de las siguientes oraciones usa correctamente la tilde diacrítica en las palabras "tú/tu"?',
    correct: 'Tú siempre olvidas tu mochila en el salón de clases.',
    distractors: [
      'Tu siempre olvidas tú mochila en el salón de clases.',
      'Tú siempre olvidas tú mochila en el salón de clases.',
      'Tu siempre olvidas tu mochila en el salón de clases.',
    ],
    difficulty: 'BASIC',
    sourceChunks: [3],
    layer1:
      '"Tú" es pronombre personal (sujeto) y lleva tilde; "tu" es adjetivo posesivo que antecede a un sustantivo ("mochila") y nunca la lleva.',
    layer2:
      '1) "Tú siempre olvidas..." — "Tú" es el sujeto de "olvidas": pronombre, tilde obligatoria. 2) "...tu mochila..." — "tu" indica posesión sobre "mochila": posesivo, sin tilde.',
    layer3:
      'Las otras oraciones invierten la tilde entre ambas palabras, acentúan las dos o no acentúan ninguna, así que ninguna cumple la regla en sus dos apariciones.',
  },
  {
    topic: 1,
    stem: 'Solo UNA de las siguientes oraciones usa correctamente "votar" (emitir un voto) frente a "botar" (arrojar, lanzar, hacer rebotar). ¿Cuál es?',
    correct: 'El ciudadano decidió votar por el candidato independiente en las elecciones locales.',
    distractors: [
      'El portero decidió votar la pelota fuera del área para evitar el gol.',
      'El reciclador ayudó a votar la basura orgánica en el contenedor correspondiente.',
      'El niño aprendió a votar el balón de baloncesto con la mano derecha.',
    ],
    difficulty: 'INTERMEDIATE',
    sourceChunks: [4],
    layer1:
      '"Votar" (con v) significa emitir un voto en una elección; "botar" (con b) significa arrojar, lanzar o hacer rebotar algo. Son homófonos que se distinguen únicamente por el contexto de significado, no por el sonido.',
    layer2:
      'La única oración donde el sentido es "emitir un voto" es la del ciudadano en unas elecciones: ahí corresponde "votar". En las otras tres el sentido real es "lanzar/arrojar" (el balón fuera del área, la basura al contenedor, hacer rebotar el balón), así que en las tres debió escribirse "botar".',
    layer3:
      'El portero no emite un voto, hace rebotar o lanza la pelota; el reciclador arroja la basura al contenedor; el niño hace rebotar el balón al driblar. Las tres usan el verbo equivocado para el sentido que describen.',
  },
  {
    topic: 1,
    stem: 'Solo UNA de las siguientes oraciones usa correctamente "cocer" (someter al fuego) frente a "coser" (unir con hilo y aguja). ¿Cuál es?',
    correct: 'Mi abuela sabe cocer los frijoles a fuego lento durante dos horas.',
    distractors: [
      'Mi abuela sabe coser los frijoles a fuego lento durante dos horas.',
      'La costurera aprendió a cocer un botón en menos de un minuto.',
      'La costurera aprendió a cocer un vestido completo para el desfile.',
    ],
    difficulty: 'INTERMEDIATE',
    sourceChunks: [4],
    layer1:
      '"Cocer" (con c) significa preparar un alimento por acción del calor; "coser" (con s) significa unir tela o material con hilo y aguja. Ambas se pronuncian igual en el español de México, por lo que solo el significado del contexto permite distinguirlas.',
    layer2:
      'Solo la oración de los frijoles a fuego lento describe una preparación con calor: ahí corresponde "cocer". En las otras tres el sentido real es "unir con hilo y aguja" (los frijoles no se cosen; el botón y el vestido se cosen, no se cuecen).',
    layer3:
      'La segunda oración usa "coser" donde el sentido pide "cocer" (los frijoles se someten al fuego, no se cosen); la tercera y la cuarta usan "cocer" donde el sentido pide "coser" (un botón y un vestido se unen con hilo, no se someten al fuego).',
  },
  {
    topic: 1,
    stem: '¿Cuál de las siguientes palabras es ESDRÚJULA (su sílaba tónica es la antepenúltima) y por eso SIEMPRE lleva tilde, sin importar en qué letra termine?',
    correct: 'matemáticas',
    distractors: ['camisa', 'camión', 'reloj'],
    difficulty: 'BASIC',
    sourceChunks: [1],
    layer1:
      'Una palabra es esdrújula cuando su sílaba tónica es la antepenúltima (la tercera contando desde el final). A diferencia de las agudas y las graves, cuya tilde depende de en qué letra terminan, las esdrújulas llevan tilde SIEMPRE, sin excepción.',
    layer2:
      '"ma-te-má-ti-cas": contando desde el final, "cas" es la 1ª sílaba, "ti" la 2ª y "má" la 3ª (antepenúltima) — ahí cae el golpe de voz, así que es esdrújula y por eso se escribe con tilde en la "á", sin importar que termine en "s".',
    layer3:
      '"camisa" es grave (el golpe cae en "mi", la penúltima) y termina en vocal, así que NO lleva tilde. "camión" es aguda (el golpe cae en "mión", la última) y termina en "n", así que SÍ lleva tilde — pero por ser aguda, no esdrújula. "reloj" es aguda y termina en "j" (ni vocal, ni n, ni s), así que NO lleva tilde. Ninguna de las tres es esdrújula.',
  },

  // ───────────────────────── 2. Morfosintaxis (5) ─────────────────────────
  {
    topic: 2,
    stem: '"Compré una computadora nueva y ___ instalé de inmediato." ¿Qué pronombre completa correctamente la oración, evitando repetir "una computadora nueva" y respetando su género y número?',
    correct: 'la',
    distractors: ['lo', 'los', 'les'],
    difficulty: 'BASIC',
    sourceChunks: [1],
    layer1:
      'El pronombre de complemento directo debe concordar en género y número con el sustantivo al que sustituye. "Una computadora nueva" es femenino singular, así que el pronombre correcto es "la".',
    layer2:
      '1) Identificar el antecedente: "una computadora nueva" (femenino, singular). 2) El complemento directo femenino singular se sustituye con "la": "...y la instalé de inmediato".',
    layer3:
      '"lo" es masculino singular (no concuerda en género); "los" es masculino plural (no concuerda en género ni número); "les" es pronombre de complemento INDIRECTO plural, no directo, así que ninguno de los tres respeta la concordancia ni la función que exige la oración.',
  },
  {
    topic: 2,
    stem: '¿Cuál de las siguientes oraciones tiene concordancia correcta entre sujeto y verbo?',
    correct: 'Los libros que compré la semana pasada llegaron esta mañana a mi casa.',
    distractors: [
      'Los libros que compré la semana pasada llegó esta mañana a mi casa.',
      'El libros que compré la semana pasada llegaron esta mañana a mi casa.',
      'Los libro que compré la semana pasada llegaron esta mañana a mi casa.',
    ],
    difficulty: 'BASIC',
    sourceChunks: [6],
    layer1:
      'El sujeto y el verbo deben concordar en número, y el artículo debe concordar en género y número con el sustantivo que acompaña. El sujeto de la oración es "los libros" (plural), así que el verbo debe ir en plural ("llegaron") y el artículo también en plural ("los").',
    layer2:
      '1) Sujeto: "los libros" (plural). 2) Verbo: debe ser "llegaron" (plural), no "llegó" (singular). 3) Artículo-sustantivo: "los libros" (ambos plural), no "el libros" ni "los libro" (mezcla de número).',
    layer3:
      'La segunda oración usa el verbo en singular ("llegó") con un sujeto plural; la tercera usa el artículo en singular ("El") con el sustantivo en plural ("libros"); la cuarta usa el sustantivo en singular ("libro") con el artículo en plural ("Los"). Las tres rompen alguna concordancia.',
  },
  {
    topic: 2,
    stem: 'La palabra "deshacer" está formada por...',
    correct: 'un prefijo negativo ("des-") más el verbo "hacer".',
    distractors: [
      'una raíz ("des-") más un sufijo verbal ("hacer").',
      'dos raíces distintas unidas sin ningún afijo.',
      'un sufijo diminutivo ("-hacer") más el adjetivo "des".',
    ],
    difficulty: 'INTERMEDIATE',
    sourceChunks: [4],
    layer1:
      'Un prefijo es un afijo que se antepone a una raíz o palabra base para modificar su significado. "des-" es un prefijo de sentido negativo o inverso (deshacer = invertir la acción de hacer), y "hacer" es la palabra base sobre la que actúa.',
    layer2:
      '1) Identificar la palabra base: "hacer" (verbo con significado propio y funcional por sí solo). 2) Identificar el elemento antepuesto: "des-" (no tiene significado independiente, solo modifica el sentido de "hacer" a su inverso). 3) Clasificar: prefijo + palabra base.',
    layer3:
      '"des-" no es una raíz (no tiene significado léxico propio, como sí lo tiene "hacer") ni un sufijo diminutivo (los diminutivos son sufijos que se AÑADEN al final, como "-ito", nunca al inicio); y "hacer" no es un afijo, es la palabra base, por lo que "dos raíces sin afijo" tampoco describe la estructura real.',
  },
  {
    topic: 2,
    stem: '"Espero que tú ___ a tiempo a la ceremonia." ¿Qué forma verbal completa correctamente la oración?',
    correct: 'llegues',
    distractors: ['llegas', 'llegarás', 'llegaste'],
    difficulty: 'INTERMEDIATE',
    sourceChunks: [1],
    layer1:
      'Los verbos que expresan deseo, duda o esperanza ("espero que...") exigen que el verbo de la cláusula subordinada vaya en modo subjuntivo, no en indicativo.',
    layer2:
      '1) "Espero que" introduce una cláusula subordinada de deseo. 2) Ese tipo de cláusula exige subjuntivo presente. 3) La forma de subjuntivo presente de "llegar" para "tú" es "llegues".',
    layer3:
      '"llegas" es indicativo presente, "llegarás" es indicativo futuro y "llegaste" es indicativo pretérito: las tres son formas del modo indicativo, que no puede usarse después de un verbo de deseo como "espero que".',
  },
  {
    topic: 2,
    stem: '"La profesora entregó los exámenes corregidos a los alumnos." ¿Cuál es el COMPLEMENTO DIRECTO de esta oración?',
    correct: 'los exámenes corregidos',
    distractors: ['la profesora', 'a los alumnos', 'corregidos'],
    difficulty: 'INTERMEDIATE',
    sourceChunks: [5],
    layer1:
      'El complemento directo es lo que recibe directamente la acción del verbo y puede sustituirse por "lo/la/los/las". Aquí el verbo es "entregó", y lo que se entrega es "los exámenes corregidos".',
    layer2:
      '1) Verbo: "entregó". 2) Pregunta clave: ¿qué entregó la profesora? → "los exámenes corregidos". 3) Prueba de sustitución: "La profesora LOS entregó a los alumnos" — el pronombre "los" confirma que ese es el complemento directo.',
    layer3:
      '"la profesora" es el sujeto, quien realiza la acción, no quien la recibe. "a los alumnos" responde a "¿a quién?" y lleva la preposición "a": es complemento indirecto. "corregidos" es solo un adjetivo que describe a "exámenes", no el complemento completo.',
  },

  // ───────────────────────── 3. Semántica (3) ─────────────────────────
  {
    topic: 3,
    stem: '¿Cuál palabra es ANTÓNIMO de "escaso"?',
    correct: 'Abundante',
    distractors: ['Reducido', 'Limitado', 'Moderado'],
    difficulty: 'BASIC',
    sourceChunks: [3],
    layer1:
      'Un antónimo es una palabra de significado opuesto. "Escaso" significa que hay poca cantidad de algo; su opuesto describe que hay mucha cantidad.',
    layer2:
      '1) Significado de "escaso": insuficiente, poco. 2) Buscar el término que expresa justo lo contrario: mucha cantidad, suficiente y de sobra → "abundante".',
    layer3:
      '"Reducido", "limitado" y "moderado" no son opuestos de "escaso": los tres describen igualmente poca o mediana cantidad, así que son sinónimos o cercanos a "escaso", no su antónimo.',
  },
  {
    topic: 3,
    stem: 'Completa la analogía: MÉDICO es a HOSPITAL como MAESTRO es a ____.',
    correct: 'Escuela',
    distractors: ['Pizarrón', 'Alumno', 'Diploma'],
    difficulty: 'BASIC',
    sourceChunks: [1],
    layer1:
      'Una analogía verbal exige encontrar la MISMA relación entre el segundo par que la que existe entre el primero. Entre "médico" y "hospital" la relación es "profesional : lugar donde ejerce su profesión".',
    layer2:
      '1) Relación del primer par: el médico ejerce su profesión en el hospital (persona → lugar de trabajo). 2) Aplicar la misma relación al maestro: el lugar donde el maestro ejerce su profesión es la escuela.',
    layer3:
      '"pizarrón" es una herramienta del maestro, no su lugar de trabajo (relación persona→herramienta, distinta a la del par original); "alumno" es una persona con quien interactúa, no un lugar; "diploma" es un documento, no un lugar. Ninguno reproduce la relación persona→lugar de trabajo.',
  },
  {
    topic: 3,
    stem: 'En la oración "Ese hombre tiene un corazón de piedra", la palabra "piedra" se usa de forma...',
    correct: 'connotativa, pues alude a la frialdad emocional, no al material del corazón.',
    distractors: [
      'denotativa, porque describe con precisión el material del que está hecho el corazón.',
      'técnica, porque pertenece al vocabulario especializado de la geología.',
      'literal, porque el corazón humano puede estar hecho de distintos minerales.',
    ],
    difficulty: 'ADVANCED',
    sourceChunks: [2],
    layer1:
      'La denotación es el significado literal y objetivo de una palabra; la connotación es un significado adicional, subjetivo o figurado que se le atribuye en un contexto. "Corazón de piedra" es una metáfora: no describe un material, sino una cualidad emocional (dureza, falta de compasión).',
    layer2:
      '1) Significado literal (denotativo) de "piedra": mineral sólido. 2) En la oración, "piedra" no se aplica literalmente al corazón (un órgano no puede ser mineral). 3) El sentido real que transmite es figurado: frialdad, insensibilidad. Por lo tanto, el uso es connotativo.',
    layer3:
      'La lectura "denotativa" y la "literal" asumen, de forma absurda, que el corazón está hecho físicamente de piedra; la lectura "técnica" confunde el uso figurado con vocabulario especializado de geología, que no tiene relación con el sentido emocional que transmite la frase.',
  },

  // ───────────────────────── 4. Literatura medieval (5, TEMARIO_ONLY) ─────────────────────────
  {
    topic: 4,
    stem: '¿Cuál es la obra literaria que se considera el poema épico medieval más antiguo conservado en lengua castellana, cuyo protagonista es el caballero Rodrigo Díaz de Vivar?',
    correct: 'El Cantar de Mio Cid',
    distractors: ['El Libro de Buen Amor', 'Los Milagros de Nuestra Señora', 'La Tragicomedia de Calisto y Melibea'],
    difficulty: 'BASIC',
    sourceChunks: [],
    layer1:
      'El Cantar de Mio Cid es un cantar de gesta anónimo, considerado el poema épico completo más antiguo conservado en castellano. Narra las hazañas del caballero Rodrigo Díaz de Vivar, "El Cid Campeador".',
    layer2:
      '1) La pista clave es "poema épico" y "protagonista Rodrigo Díaz de Vivar". 2) Esa combinación identifica de forma única al Cantar de Mio Cid, distinto de cualquier otra obra medieval castellana.',
    layer3:
      'El Libro de Buen Amor (Arcipreste de Hita) es una obra del siglo XIV sobre el amor, no un cantar de gesta. Los Milagros de Nuestra Señora (Gonzalo de Berceo) son relatos religiosos en verso, sin protagonista guerrero. La Tragicomedia de Calisto y Melibea (La Celestina) es una obra dialogada de finales del siglo XV sobre un amor trágico, no una epopeya.',
  },
  {
    topic: 4,
    stem: 'Gonzalo de Berceo, considerado el primer poeta de nombre conocido en lengua castellana, escribió sus obras siguiendo la estructura del...',
    correct: 'mester de clerecía, con estrofas de cuatro versos monorrimos llamadas cuaderna vía.',
    distractors: [
      'mester de juglaría, con versos de transmisión oral recitados por juglares errantes.',
      'romancero viejo, con versos octosílabos de rima asonante en los versos pares.',
      'cancionero petrarquista, con sonetos endecasílabos de tema amoroso.',
    ],
    difficulty: 'INTERMEDIATE',
    sourceChunks: [],
    layer1:
      'El mester de clerecía era la escuela de poetas cultos (clérigos formados) que escribían con una técnica fija: la cuaderna vía, estrofas de cuatro versos alejandrinos con una sola rima. Gonzalo de Berceo es su representante más antiguo conocido por nombre.',
    layer2:
      '1) Berceo era clérigo formado, no juglar popular. 2) Su técnica de composición es la cuaderna vía (cuatro versos, una sola rima). 3) Esa combinación define el mester de clerecía, distinto del mester de juglaría.',
    layer3:
      'El mester de juglaría era oral y popular, propio de juglares, no de clérigos como Berceo. El romancero viejo usa versos octosílabos con rima asonante, una forma distinta y posterior en su difusión masiva. El cancionero petrarquista y el soneto endecasílabo son formas renacentistas, ajenas por completo al siglo XIII de Berceo.',
  },
  {
    topic: 4,
    stem: 'El Arcipreste de Hita, Juan Ruiz, es el autor de una obra medieval que combina episodios cómicos, moralizantes y autobiográficos en torno al tema del amor. ¿Cómo se llama esa obra?',
    correct: 'El Libro de Buen Amor',
    distractors: ['El Cantar de Mio Cid', 'El Conde Lucanor', 'La Celestina'],
    difficulty: 'BASIC',
    sourceChunks: [],
    layer1:
      'El Libro de Buen Amor (siglo XIV) es la obra maestra del Arcipreste de Hita: mezcla relatos cómicos, enseñanzas morales y episodios narrados en primera persona sobre las aventuras amorosas del propio narrador.',
    layer2:
      '1) Autor mencionado: Arcipreste de Hita (Juan Ruiz). 2) Rasgos descritos: cómico + moralizante + autobiográfico + tema del amor. 3) Esa combinación de rasgos identifica de forma única al Libro de Buen Amor entre las obras medievales castellanas.',
    layer3:
      'El Cantar de Mio Cid es anónimo y épico, sin ninguno de esos rasgos. El Conde Lucanor es una colección de cuentos moralizantes de Don Juan Manuel, sin el componente autobiográfico ni el tema central del amor. La Celestina es de Fernando de Rojas, un siglo después, y no es una obra del Arcipreste de Hita.',
  },
  {
    topic: 4,
    stem: '"La Celestina", de Fernando de Rojas, publicada a finales del siglo XV, se considera una obra de TRANSICIÓN entre la literatura medieval y la renacentista principalmente porque...',
    correct: 'combina el didactismo moral medieval con personajes de psicología más individual, ya renacentista.',
    distractors: [
      'narra exclusivamente hazañas guerreras de un héroe medieval sin ningún rasgo renacentista.',
      'está escrita enteramente en verso, siguiendo la tradición del mester de clerecía medieval.',
      'fue compuesta de forma anónima y transmitida oralmente durante varias generaciones.',
    ],
    difficulty: 'ADVANCED',
    sourceChunks: [],
    layer1:
      'Una obra de "transición" conserva rasgos de la época anterior mientras anuncia la siguiente. La Celestina mantiene una visión moral y pesimista típica medieval, pero retrata a sus personajes con una psicología individual y un realismo que anticipan el Renacimiento.',
    layer2:
      '1) Rasgo medieval que conserva: el desenlace trágico como advertencia moral (didactismo). 2) Rasgo renacentista que anticipa: personajes con motivaciones y psicología individuales, no solo tipos morales. 3) La combinación de ambos es justo lo que define a una obra "de transición".',
    layer3:
      'La Celestina no narra hazañas guerreras (es una historia de amor y engaño en un entorno urbano); no está escrita en verso, sino mayoritariamente en prosa dialogada (forma de "comedia humanística"); y tiene autor conocido y reconocido, Fernando de Rojas, no es anónima ni de transmisión oral.',
  },
  {
    topic: 4,
    stem: 'El Romancero viejo, formado por composiciones populares y anónimas transmitidas oralmente durante la Edad Media, se caracteriza métricamente por...',
    correct: 'versos octosílabos con rima asonante en los versos pares.',
    distractors: [
      'versos alejandrinos con rima consonante agrupados en cuaderna vía.',
      'versos endecasílabos organizados en catorce líneas a manera de soneto.',
      'versos libres sin ningún patrón de rima ni de medida silábica.',
    ],
    difficulty: 'INTERMEDIATE',
    sourceChunks: [],
    layer1:
      'El romance es la forma métrica popular por excelencia de la lírica narrativa medieval castellana: series de versos octosílabos donde solo los versos pares comparten rima asonante, mientras los impares quedan sueltos.',
    layer2:
      '1) Medida silábica del romance: ocho sílabas por verso (octosílabo). 2) Patrón de rima: asonante (coinciden solo las vocales), y únicamente en los versos pares. 3) Esa combinación es la firma métrica reconocible del Romancero.',
    layer3:
      'Los versos alejandrinos con rima consonante en cuaderna vía corresponden al mester de clerecía, no al Romancero. El soneto de catorce versos endecasílabos es una forma renacentista italiana, muy posterior. Y el Romancero sí tiene un patrón fijo de rima asonante, así que no puede describirse como "verso libre sin ningún patrón".',
  },

  // ───────────────────────── 5. Literatura moderna (5, TEMARIO_ONLY) ─────────────────────────
  {
    topic: 5,
    stem: 'Miguel de Cervantes publicó en 1605 la primera parte de una novela que suele considerarse fundadora de la novela moderna occidental. ¿Cuál es esa obra?',
    correct: 'Don Quijote de la Mancha',
    distractors: ['La Celestina, de Fernando de Rojas', 'El Lazarillo de Tormes, anónimo', 'Las Novelas ejemplares, de 1613'],
    difficulty: 'BASIC',
    sourceChunks: [],
    layer1:
      'Don Quijote de la Mancha (1605, con segunda parte en 1615) es la obra de Cervantes reconocida universalmente como fundadora de la novela moderna, por su complejidad narrativa y la profundidad psicológica de sus personajes.',
    layer2:
      '1) Autor y año mencionados: Cervantes, 1605. 2) Esos dos datos identifican de forma única la primera parte de Don Quijote entre las obras del propio Cervantes y de la literatura española.',
    layer3:
      'La Celestina es de Fernando de Rojas, un siglo antes (finales del XV), no de Cervantes. El Lazarillo de Tormes es anónimo y anterior (mediados del XVI), de la tradición picaresca. Las Novelas ejemplares sí son de Cervantes, pero son relatos breves publicados en 1613, no la novela de 1605 descrita en el enunciado.',
  },
  {
    topic: 5,
    stem: 'Sor Juana Inés de la Cruz, escritora novohispana del Barroco del siglo XVII, es reconocida sobre todo por su defensa del derecho de las mujeres al conocimiento, expresada en poemas como...',
    correct: 'las redondillas que comienzan "Hombres necios que acusáis".',
    distractors: [
      'los sonetos amorosos reunidos bajo el título "Rimas".',
      'el poema "Canto a mí mismo", de tono autobiográfico.',
      'la oda "A la disciplina", escrita en su etapa como estudiante.',
    ],
    difficulty: 'INTERMEDIATE',
    sourceChunks: [],
    layer1:
      '"Hombres necios que acusáis" es la redondilla más célebre de Sor Juana Inés de la Cruz: cuestiona la doble moral de los hombres que reprochan a las mujeres conductas que ellos mismos provocan, y es su texto más asociado a la defensa del intelecto femenino.',
    layer2:
      '1) Autora mencionada: Sor Juana Inés de la Cruz. 2) Rasgo descrito: defensa del derecho de las mujeres al conocimiento. 3) La obra que corresponde de forma inconfundible a ese rasgo es "Hombres necios que acusáis".',
    layer3:
      '"Rimas" es la obra del poeta español Gustavo Adolfo Bécquer, del siglo XIX. "Canto a mí mismo" es del estadounidense Walt Whitman. "A la disciplina" es un título inventado que no corresponde a ninguna obra real de Sor Juana.',
  },
  {
    topic: 5,
    stem: 'El poeta nicaragüense Rubén Darío es considerado el fundador del movimiento literario hispanoamericano conocido como Modernismo, iniciado formalmente con la publicación de su libro...',
    correct: '"Azul...", en 1888.',
    distractors: ['"Cien años de soledad", en 1967.', '"Platero y yo", en 1914.', '"Veinte poemas de amor", en 1924.'],
    difficulty: 'INTERMEDIATE',
    sourceChunks: [],
    layer1:
      '"Azul..." (1888) es el libro de cuentos y poemas de Rubén Darío que renovó el lenguaje literario en español con influencias del simbolismo y el parnasianismo franceses, y que la crítica señala como el punto de arranque formal del Modernismo hispanoamericano.',
    layer2:
      '1) Autor: Rubén Darío. 2) Rasgo: obra fundadora del Modernismo. 3) El título y año que corresponden de forma única a ese hito son "Azul...", 1888.',
    layer3:
      '"Cien años de soledad" (1967) es de Gabriel García Márquez, del realismo mágico, ocho décadas después. "Platero y yo" (1914) es del español Juan Ramón Jiménez. "Veinte poemas de amor" (1924) es del chileno Pablo Neruda. Ninguna de las tres funda el Modernismo ni es de Rubén Darío.',
  },
  {
    topic: 5,
    stem: 'Federico García Lorca perteneció a la Generación del 27 y combinó en su obra la tradición popular española con la vanguardia; su libro de poemas más conocido, que fusiona el romance tradicional con imágenes surrealistas, es...',
    correct: 'el Romancero gitano.',
    distractors: ['el Cantar de Mio Cid.', 'las Soledades.', 'las Rimas y leyendas.'],
    difficulty: 'INTERMEDIATE',
    sourceChunks: [],
    layer1:
      'El Romancero gitano (1928) es el libro donde García Lorca retoma la forma tradicional del romance (verso octosílabo, rima asonante) para construir imágenes de vanguardia sobre el mundo gitano andaluz, mezclando lo popular con lo culto.',
    layer2:
      '1) Autor: García Lorca. 2) Rasgo: fusiona el romance tradicional con imágenes surrealistas/vanguardistas. 3) El título que corresponde de forma única a esa fusión es el Romancero gitano.',
    layer3:
      'El Cantar de Mio Cid es medieval y anónimo, sin ninguna vanguardia. Las Soledades son del poeta barroco Luis de Góngora (siglo XVII). Las Rimas y leyendas son del romántico Gustavo Adolfo Bécquer (siglo XIX). Ninguna es de García Lorca ni pertenece a la Generación del 27.',
  },
  {
    topic: 5,
    stem: 'Gabriel García Márquez, autor colombiano ganador del Premio Nobel de Literatura, es el máximo exponente del realismo mágico gracias a su novela...',
    correct: '"Cien años de soledad", publicada en 1967.',
    distractors: [
      '"La casa de los espíritus", publicada en 1982.',
      '"Pedro Páramo", publicada en 1955.',
      '"Rayuela", publicada en 1963.',
    ],
    difficulty: 'BASIC',
    sourceChunks: [],
    layer1:
      '"Cien años de soledad" (1967) narra la historia de la familia Buendía en el pueblo imaginario de Macondo, mezclando hechos cotidianos con elementos fantásticos narrados con total naturalidad: es la obra que consolidó a García Márquez como máximo referente del realismo mágico.',
    layer2:
      '1) Autor: Gabriel García Márquez. 2) Rasgo: máximo exponente del realismo mágico. 3) El título y año que corresponden de forma única son "Cien años de soledad", 1967.',
    layer3:
      '"La casa de los espíritus" (1982) es de la chilena Isabel Allende. "Pedro Páramo" (1955) es del mexicano Juan Rulfo, antecedente del realismo mágico pero no de García Márquez. "Rayuela" (1963) es del argentino Julio Cortázar. Ninguna es la novela de García Márquez descrita.',
  },

  // ───────────────────────── 6. Redacción de textos (9) ─────────────────────────
  {
    topic: 6,
    stem: '¿Cuál oración expresa correctamente una relación de CAUSA entre las dos ideas?',
    correct: 'Los alumnos llegaron tarde al examen porque el camión escolar se descompuso a medio camino.',
    distractors: [
      'Los alumnos llegaron tarde al examen; sin embargo, el camión escolar se descompuso a medio camino.',
      'Los alumnos llegaron tarde al examen aunque el camión escolar se descompuso a medio camino.',
      'Los alumnos llegaron tarde al examen; por lo tanto, el camión escolar se descompuso a medio camino.',
    ],
    difficulty: 'BASIC',
    sourceChunks: [1, 2],
    layer1:
      'Un conector causal ("porque") introduce el motivo de un hecho. Aquí el motivo del retraso es la descompostura del camión, así que la relación entre ambas ideas es de causa-efecto, y "porque" es el conector que la expresa.',
    layer2:
      '1) Efecto: los alumnos llegaron tarde. 2) Causa: el camión se descompuso. 3) El conector que enlaza un efecto con su causa es "porque".',
    layer3:
      '"sin embargo" expresa contraste, no causa, y aquí no hay ninguna oposición entre las ideas. "aunque" expresa concesión (algo ocurre a pesar de otra cosa), lo cual invertiría el sentido lógico. "por lo tanto" expresa consecuencia en el sentido opuesto: haría parecer que la descompostura fue CAUSADA por el retraso, cuando es al revés.',
  },
  {
    topic: 6,
    stem: '¿Cuál oración usa el conector adecuado para expresar una relación de CONTRASTE (oposición) entre las dos ideas?',
    correct: 'El pronóstico anunciaba lluvia para todo el fin de semana, pero el sábado amaneció completamente despejado.',
    distractors: [
      'El pronóstico anunciaba lluvia para todo el fin de semana, porque el sábado amaneció completamente despejado.',
      'El pronóstico anunciaba lluvia para todo el fin de semana, por lo tanto, el sábado amaneció completamente despejado.',
      'El pronóstico anunciaba lluvia para todo el fin de semana, además, el sábado amaneció completamente despejado.',
    ],
    difficulty: 'BASIC',
    sourceChunks: [1, 2],
    layer1:
      'Un conector adversativo ("pero") enlaza dos ideas que se oponen. Aquí el pronóstico anunciaba lluvia y en realidad el cielo estuvo despejado: son ideas contrarias, así que corresponde un conector de contraste.',
    layer2:
      '1) Primera idea: se anunció lluvia. 2) Segunda idea: en realidad hizo sol. 3) Como ambas ideas se oponen, el conector correcto es "pero".',
    layer3:
      '"porque" expresaría que el sol fue la CAUSA del pronóstico de lluvia, lo cual no tiene sentido lógico. "por lo tanto" expresaría que el sol fue la CONSECUENCIA del pronóstico, tampoco tiene sentido. "además" expresaría que ambas ideas se suman en el mismo sentido, cuando en realidad se contradicen.',
  },
  {
    topic: 6,
    stem: '¿Cuál oración expresa correctamente una relación de CONSECUENCIA entre las dos ideas?',
    correct: 'La planta llevaba tres semanas sin recibir agua, por lo tanto, sus hojas se marchitaron por completo.',
    distractors: [
      'La planta llevaba tres semanas sin recibir agua, sin embargo, sus hojas se marchitaron por completo.',
      'La planta llevaba tres semanas sin recibir agua, porque sus hojas se marchitaron por completo.',
      'La planta llevaba tres semanas sin recibir agua, aunque sus hojas se marchitaron por completo.',
    ],
    difficulty: 'BASIC',
    sourceChunks: [1, 2],
    layer1:
      'Un conector consecutivo ("por lo tanto") introduce el resultado de un hecho previo. Aquí la falta de agua es la causa, y las hojas marchitas son su consecuencia natural.',
    layer2:
      '1) Causa: tres semanas sin agua. 2) Consecuencia: las hojas se marchitaron. 3) El conector que enlaza una causa con su consecuencia es "por lo tanto".',
    layer3:
      '"sin embargo" señalaría una oposición que aquí no existe (la falta de agua y el marchitamiento no se contradicen, van en el mismo sentido). "porque" invertiría la causalidad, como si las hojas marchitas hubieran provocado la falta de agua. "aunque" expresaría que la planta se marchitó A PESAR de la falta de agua, lo contrario de lo que en realidad ocurrió.',
  },
  {
    topic: 6,
    stem: 'Un párrafo desarrolla estas tres ideas: el reciclaje reduce la basura en los rellenos sanitarios, ahorra energía en la fabricación de productos nuevos y disminuye la extracción de materias primas. ¿Cuál oración funciona mejor como ORACIÓN TEMÁTICA (la idea principal que introduce el párrafo)?',
    correct: 'El reciclaje ofrece beneficios ambientales que van más allá de la simple reducción de basura.',
    distractors: [
      'Los rellenos sanitarios de las grandes ciudades reciben toneladas de basura todos los días.',
      'Fabricar productos nuevos siempre requiere más energía que reciclar materiales usados.',
      'La extracción de materias primas ha aumentado de forma constante en las últimas décadas.',
    ],
    difficulty: 'INTERMEDIATE',
    sourceChunks: [1, 2],
    layer1:
      'La oración temática debe ser lo bastante general para introducir y unificar TODAS las ideas que desarrolla el párrafo, no solo una de ellas. Aquí el párrafo trata tres beneficios distintos del reciclaje, así que la oración temática debe anunciarlos como un conjunto.',
    layer2:
      '1) Identificar las tres ideas del párrafo: menos basura, ahorro de energía, menos extracción de materias primas. 2) Buscar la oración que las englobe a las tres sin limitarse a una sola. 3) "El reciclaje ofrece beneficios ambientales..." cubre las tres, mientras que las demás opciones solo tocan una.',
    layer3:
      'La oración sobre los rellenos sanitarios solo cubre la primera idea (basura); la de fabricar productos nuevos solo cubre la segunda (energía); la de la extracción de materias primas solo cubre la tercera. Ninguna de las tres introduce el párrafo completo, así que ninguna funciona como oración temática.',
  },
  {
    topic: 6,
    stem: "Lee el fragmento: 'Añada una taza de harina cernida, dos huevos y una pizca de sal; bata la mezcla durante tres minutos antes de verterla en el molde engrasado.' ¿A qué tipo de texto pertenece?",
    correct: 'Un texto instructivo, porque da indicaciones ordenadas para realizar un procedimiento.',
    distractors: [
      'Un texto narrativo, porque relata una sucesión de hechos vividos por un personaje.',
      'Un texto argumentativo, porque defiende una postura sobre el uso de ingredientes.',
      'Un texto descriptivo, porque detalla las características físicas de un platillo terminado.',
    ],
    difficulty: 'BASIC',
    sourceChunks: [1, 2],
    layer1:
      'Los textos instructivos dan indicaciones ordenadas, con verbos en modo imperativo o infinitivo, para que el lector realice un procedimiento paso a paso. El fragmento usa imperativos ("Añada", "bata") en una secuencia de acciones: es una receta, un texto instructivo típico.',
    layer2:
      '1) Identificar los verbos: "añada", "bata" — modo imperativo. 2) Identificar la estructura: pasos en orden ("primero... antes de..."). 3) Esa combinación (imperativos + secuencia de pasos) define al texto instructivo.',
    layer3:
      'No es narrativo porque no hay personajes ni hechos sucediendo en el tiempo, solo instrucciones. No es argumentativo porque no defiende ninguna postura ni da razones para convencer. No es descriptivo porque no detalla características de un platillo ya terminado, sino los pasos para prepararlo.',
  },
  {
    topic: 6,
    stem: '¿Cuál de las siguientes oraciones es adecuada para el registro FORMAL de una carta dirigida a una autoridad universitaria?',
    correct: 'Por medio de la presente, solicito a usted la revisión de mi expediente académico.',
    distractors: [
      'Oye, nada más te escribo para que le eches un ojo a mi expediente, va.',
      'Ahí te va mi expediente, échame la mano con eso cuando puedas, porfa.',
      'Te paso mi expediente para que lo revises cuando se te haga fácil, gracias.',
    ],
    difficulty: 'BASIC',
    sourceChunks: [1, 2],
    layer1:
      'El registro formal usa fórmulas de cortesía establecidas ("por medio de la presente", "solicito a usted"), pronombres de respeto y ausencia de coloquialismos. El registro informal usa muletillas, contracciones y expresiones coloquiales propias del habla cotidiana entre conocidos.',
    layer2:
      '1) Contexto: carta a una autoridad universitaria → exige registro formal. 2) Revisar cada opción: solo una usa fórmulas de cortesía y trato de "usted" sin coloquialismos. 3) Esa es la respuesta correcta.',
    layer3:
      'Las otras tres opciones usan expresiones propias del habla coloquial entre amigos ("oye", "va", "échame la mano", "porfa", "se te haga fácil"), impropias de una comunicación formal dirigida a una autoridad.',
  },
  {
    topic: 6,
    stem: "'Los ingenieros revisaron el puente durante tres días. Al final, lo declararon seguro para el tránsito pesado.' ¿A qué se refiere el pronombre 'lo' en la segunda oración?",
    correct: 'Al puente que revisaron los ingenieros.',
    distractors: ['A los tres días que duró la revisión.', 'Al tránsito pesado que circula por la zona.', 'Al grupo de ingenieros que hizo la revisión.'],
    difficulty: 'INTERMEDIATE',
    sourceChunks: [1, 2],
    layer1:
      'Un pronombre de complemento directo como "lo" sustituye a un sustantivo masculino singular mencionado antes (su antecedente), para evitar repetirlo. Aquí "lo" sustituye a "el puente", que es lo que fue declarado seguro.',
    layer2:
      '1) Buscar en la oración anterior un sustantivo masculino singular que pueda ser "declarado seguro": "el puente". 2) Confirmar con la prueba de sustitución: "declararon el puente seguro" = "lo declararon seguro". 3) "lo" se refiere al puente.',
    layer3:
      '"los tres días" es plural, no puede sustituirse por "lo" (singular). "el tránsito pesado" no fue declarado seguro, es aquello PARA lo que el puente se declaró seguro. "el grupo de ingenieros" es quien declara, no lo declarado: ninguno de los tres encaja como antecedente de "lo".',
  },
  {
    topic: 6,
    stem: "¿Cuál oración ROMPE la unidad temática del siguiente párrafo? 'El café llegó a América procedente de Etiopía a través de las rutas comerciales árabes. (1) Los primeros cultivos americanos se establecieron en el Caribe durante el siglo XVIII. (2) El maíz es uno de los cultivos más antiguos domesticados en Mesoamérica. (3) Hoy, países como Brasil y Colombia concentran buena parte de la producción mundial.'",
    correct: 'La oración que dice que el maíz es uno de los cultivos más antiguos domesticados en Mesoamérica.',
    distractors: [
      'La oración que dice que los primeros cultivos americanos se establecieron en el Caribe durante el siglo XVIII.',
      'La oración que dice que hoy, países como Brasil y Colombia concentran buena parte de la producción mundial.',
      'La oración que dice que el café llegó a América procedente de Etiopía a través de las rutas comerciales árabes.',
    ],
    difficulty: 'INTERMEDIATE',
    sourceChunks: [1, 2],
    layer1:
      'La unidad temática exige que todas las oraciones de un párrafo desarrollen el mismo tema. Este párrafo trata sobre la HISTORIA DEL CAFÉ en América; la oración sobre el maíz introduce un cultivo distinto y rompe esa unidad.',
    layer2:
      '1) Tema del párrafo: la trayectoria del café en América (origen, llegada, cultivo, producción actual). 2) Revisar cada oración: origen (Etiopía), primeros cultivos (Caribe), producción actual (Brasil/Colombia) — las tres hablan de café. 3) La oración del maíz habla de OTRO cultivo, así que no pertenece al tema.',
    layer3:
      'Las otras tres oraciones sí desarrollan la historia del café: su origen geográfico, dónde se cultivó primero en América y quién lo produce hoy. Solo la oración del maíz introduce un tema distinto al que el párrafo viene desarrollando.',
  },
  {
    topic: 6,
    stem: 'Un texto instructivo para plantar un árbol incluye estos pasos desordenados: (1) Rellena el hoyo con tierra y compacta ligeramente. (2) Cava un hoyo del doble de ancho que el cepellón. (3) Riega abundantemente después de sembrar. (4) Coloca el árbol centrado dentro del hoyo. ¿Cuál es el ORDEN correcto?',
    correct: 'Cavar el hoyo, colocar el árbol, rellenar con tierra y, al final, regar.',
    distractors: [
      'Colocar el árbol, cavar el hoyo, regar y, al final, rellenar con tierra.',
      'Regar, cavar el hoyo, colocar el árbol y, al final, rellenar con tierra.',
      'Rellenar con tierra, colocar el árbol, cavar el hoyo y, al final, regar.',
    ],
    difficulty: 'BASIC',
    sourceChunks: [1, 2],
    layer1:
      'Un texto instructivo de este tipo tiene un orden lógico obligado por dependencias físicas: no se puede colocar el árbol sin que exista el hoyo, no se puede rellenar sin haber colocado el árbol, y regar antes de rellenar dejaría el hoyo vacío de tierra.',
    layer2:
      '1) Debe existir el hoyo antes de colocar el árbol (cavar → colocar). 2) El árbol debe estar colocado antes de rellenar (colocar → rellenar). 3) Solo tiene sentido regar después de rellenar, para que el agua asiente la tierra (rellenar → regar). El único orden que respeta las tres dependencias es cavar, colocar, rellenar, regar.',
    layer3:
      'Colocar el árbol antes de cavar el hoyo es físicamente imposible. Regar antes de cavar o de rellenar dejaría el agua sin tierra que absorberla alrededor de la raíz. Rellenar con tierra antes de cavar el hoyo o de colocar el árbol tampoco tiene sentido físico: no hay nada que rellenar todavía.',
  },

  // ───────────────────────── 7. Comprensión lectora (8 = 2 pasajes × 4) ─────────────────────────
  {
    topic: 7,
    format: 'READING_COMPREHENSION',
    passage: {
      ref: 'g93-monarca',
      title: 'La migración de la mariposa monarca',
      content:
        'Cada otoño, millones de mariposas monarca emprenden un viaje de más de cuatro mil kilómetros desde el sur de Canadá y el norte de Estados Unidos hasta los bosques de oyamel en Michoacán y el Estado de México. Ninguna mariposa individual completa el recorrido de ida y vuelta: la travesía requiere hasta cuatro generaciones sucesivas, y solo la llamada "generación matusalén" —la que nace a finales del verano— vive lo suficiente, casi ocho meses, para llegar a México, hibernar y emprender el regreso hacia el norte. Los científicos todavía no comprenden del todo cómo estas mariposas, que jamás han estado antes en los bosques mexicanos, logran orientarse hacia el mismo sitio exacto donde hibernaron sus antepasados; se sospecha que combinan una brújula solar interna con sensibilidad al campo magnético terrestre. La deforestación en los sitios de hibernación y la pérdida de algodoncillo —su única planta huésped— a lo largo de la ruta han reducido drásticamente la población en las últimas décadas.',
    },
    stem: '¿Cuál es la idea principal del texto?',
    correct: 'Explica el fenómeno migratorio de la mariposa monarca hacia México y los retos que enfrenta.',
    distractors: [
      'Describe el ciclo de vida completo de la mariposa monarca, desde huevo hasta adulto.',
      'Compara la velocidad de vuelo de la mariposa monarca con la de otras especies migratorias.',
      'Explica el papel del algodoncillo en la reproducción de todas las especies de mariposas.',
    ],
    difficulty: 'BASIC',
    sourceChunks: [3],
    layer1:
      'La idea principal de un texto informativo es la que engloba todo lo que se desarrolla en él. Este texto trata la migración de la monarca (el viaje, las generaciones, la orientación) y termina señalando las amenazas que la ponen en riesgo.',
    layer2:
      '1) El texto describe el viaje migratorio (distancia, generaciones). 2) Explica cómo se orientan. 3) Señala las amenazas (deforestación, pérdida de algodoncillo). Los tres bloques giran en torno a un mismo eje: el fenómeno migratorio y sus retos.',
    layer3:
      'El texto no describe el ciclo de vida completo (huevo, larva, crisálida), solo menciona generaciones en el contexto del viaje. No compara velocidades de vuelo con otras especies. Y el algodoncillo se menciona como alimento/hábitat de la RUTA migratoria, no como parte de la reproducción de "todas las especies" de mariposas.',
  },
  {
    topic: 7,
    format: 'READING_COMPREHENSION',
    passage: { ref: 'g93-monarca' },
    stem: '¿Cuántas generaciones se requieren, según el texto, para completar el viaje de ida y vuelta?',
    correct: 'Hasta cuatro generaciones sucesivas.',
    distractors: ['Solo una generación, la "matusalén".', 'Exactamente dos generaciones, una de ida y una de vuelta.', 'Más de ocho generaciones a lo largo de un año.'],
    difficulty: 'BASIC',
    sourceChunks: [2],
    layer1:
      'Esta es una pregunta de detalle explícito: la respuesta está declarada literalmente en el texto ("la travesía requiere hasta cuatro generaciones sucesivas").',
    layer2:
      '1) Localizar la oración que menciona el número de generaciones. 2) El texto dice, sin ambigüedad, "hasta cuatro generaciones sucesivas". 3) Esa es la respuesta, sin necesidad de inferir nada.',
    layer3:
      'El texto NO dice que sea una sola generación (de hecho aclara que "ninguna mariposa individual completa el recorrido"), ni dos, ni más de ocho: el número explícito es cuatro.',
  },
  {
    topic: 7,
    format: 'READING_COMPREHENSION',
    passage: { ref: 'g93-monarca' },
    stem: 'En el texto, la expresión "generación matusalén" se refiere a...',
    correct: 'la generación que vive más tiempo y por eso logra completar el viaje hasta México.',
    distractors: [
      'la primera generación que nace cada primavera en Canadá.',
      'la generación que nunca migra y permanece todo el año en el norte.',
      'la generación que se reproduce con mayor frecuencia que las otras.',
    ],
    difficulty: 'INTERMEDIATE',
    sourceChunks: [4],
    layer1:
      'El nombre "matusalén" alude a la longevidad (por el personaje bíblico famoso por su larga vida). El texto explica que esa generación "vive lo suficiente, casi ocho meses, para llegar a México, hibernar y emprender el regreso" — es decir, vive más que las demás generaciones del ciclo.',
    layer2:
      '1) El texto asocia "matusalén" con una duración de vida específica: casi ocho meses. 2) Aclara que esa duración extra es justo lo que le permite completar el trayecto a México y volver. 3) Por lo tanto, "matusalén" designa a la generación de mayor longevidad del ciclo.',
    layer3:
      'El texto no dice que sea la primera generación de la primavera (al contrario, nace "a finales del verano"), ni que se quede todo el año en el norte (viaja a México), ni que se reproduzca con más frecuencia: el rasgo que el texto destaca es su longevidad, no su ritmo reproductivo.',
  },
  {
    topic: 7,
    format: 'READING_COMPREHENSION',
    passage: { ref: 'g93-monarca' },
    stem: 'De acuerdo con el texto, ¿qué ha causado la reducción de la población de mariposa monarca?',
    correct: 'La deforestación de los sitios de hibernación y la pérdida de algodoncillo en la ruta.',
    distractors: [
      'El aumento en la velocidad de los vientos durante la temporada de otoño.',
      'La competencia con otras especies de mariposas por el néctar de las flores.',
      'El uso de brújulas artificiales que confunden su orientación magnética natural.',
    ],
    difficulty: 'BASIC',
    sourceChunks: [4],
    layer1:
      'Pregunta de detalle explícito: la última oración del texto declara directamente las dos causas de la reducción de la población.',
    layer2:
      '1) Localizar la oración final del texto. 2) Identifica dos causas explícitas: deforestación en los sitios de hibernación y pérdida de algodoncillo en la ruta. 3) Esas son, literalmente, las causas que el texto menciona.',
    layer3:
      'El texto no menciona vientos más veloces, ni competencia con otras mariposas por néctar, ni brújulas artificiales: esas tres opciones no aparecen en ninguna parte del pasaje.',
  },
  {
    topic: 7,
    format: 'READING_COMPREHENSION',
    passage: {
      ref: 'g93-azotea',
      title: 'La azotea',
      content:
        'Cuando Mariana subió por primera vez a la azotea del edificio, el viento casi le arrebata el cuaderno de las manos. Había subido para terminar un dibujo que llevaba semanas posponiendo, pero la ciudad se veía distinta desde allá arriba: los coches parecían insectos de colores deslizándose entre las calles, y el ruido del tráfico llegaba apagado, como si alguien hubiera bajado el volumen del mundo. Se sentó junto al tinaco, abrió el cuaderno sobre las rodillas y empezó a trazar el contorno de los edificios vecinos. A la mitad del dibujo se dio cuenta de algo: llevaba tanto tiempo mirando la ciudad desde la calle que había olvidado cómo se veía desde arriba, con los techos de lámina, las antenas torcidas y la ropa tendida meciéndose entre azotea y azotea. Guardó el lápiz un momento, no para descansar la mano, sino para quedarse un rato nada más mirando.',
    },
    stem: '¿Cuál es la idea principal de este fragmento?',
    correct: 'Mariana descubre una perspectiva distinta de la ciudad al dibujar desde la azotea.',
    distractors: [
      'Mariana explica a un amigo por qué decidió aprender a dibujar paisajes urbanos.',
      'Mariana describe una discusión con sus vecinos sobre el uso de la azotea.',
      'Mariana narra un accidente que sufrió mientras subía las escaleras del edificio.',
    ],
    difficulty: 'BASIC',
    sourceChunks: [3],
    layer1:
      'La idea principal de un fragmento narrativo es el eje sobre el que gira toda la escena. Aquí, Mariana sube a dibujar y, en el proceso, descubre una vista de la ciudad que no conocía: ese descubrimiento es el centro del fragmento.',
    layer2:
      '1) Acción inicial: Mariana sube a la azotea a dibujar. 2) Desarrollo: observa la ciudad desde una perspectiva nueva. 3) Cierre: se detiene solo para mirar, señal de que la vista la sorprendió. Los tres momentos giran en torno al descubrimiento de esa perspectiva.',
    layer3:
      'El fragmento no incluye ningún diálogo con un amigo explicando una decisión, ninguna discusión con vecinos, ni ningún accidente en las escaleras: ninguno de esos hechos aparece en el texto.',
  },
  {
    topic: 7,
    format: 'READING_COMPREHENSION',
    passage: { ref: 'g93-azotea' },
    stem: 'Según el fragmento, ¿qué estaba haciendo Mariana en la azotea?',
    correct: 'Terminar un dibujo que llevaba semanas posponiendo.',
    distractors: ['Tender ropa que había lavado esa misma mañana.', 'Reparar una antena que se había torcido con el viento.', 'Buscar su cuaderno, que el viento le había arrebatado antes.'],
    difficulty: 'BASIC',
    sourceChunks: [2],
    layer1:
      'Pregunta de detalle explícito: el propio texto declara el propósito de Mariana en su segunda oración.',
    layer2:
      '1) Localizar la oración donde se explica el motivo de la subida. 2) El texto dice: "Había subido para terminar un dibujo que llevaba semanas posponiendo". 3) Esa es la respuesta literal.',
    layer3:
      'El texto menciona ropa tendida y antenas torcidas solo como parte del PAISAJE que Mariana observa desde arriba, no como actividades que ella realiza; y el cuaderno casi se le vuela, pero no lo pierde ni tiene que buscarlo.',
  },
  {
    topic: 7,
    format: 'READING_COMPREHENSION',
    passage: { ref: 'g93-azotea' },
    stem: '¿Por qué guardó el lápiz "no para descansar la mano, sino para quedarse un rato nada más mirando"?',
    correct: 'Porque quedó absorta contemplando la ciudad desde una perspectiva que no conocía.',
    distractors: ['Porque el viento le impedía seguir dibujando con precisión.', 'Porque terminó el dibujo antes de lo que esperaba.', 'Porque escuchó un ruido que la distrajo del cuaderno.'],
    difficulty: 'INTERMEDIATE',
    sourceChunks: [9],
    layer1:
      'Esta es una pregunta de inferencia: el texto no dice explícitamente "se quedó absorta", pero todo el fragmento anterior (la vista nueva, el darse cuenta de que había olvidado cómo se veía la ciudad desde arriba) lleva a esa conclusión.',
    layer2:
      '1) El fragmento previo describe el asombro de Mariana ante la vista. 2) La frase aclara que dejar el lápiz NO fue por cansancio (se descarta explícitamente esa razón). 3) La única explicación que encaja con el contexto es que se detuvo a contemplar, absorta, lo que estaba viendo.',
    layer3:
      'El texto no menciona que el viento le impidiera dibujar en ese momento (el viento se menciona solo al inicio); no dice que el dibujo estuviera terminado, sino "a la mitad"; y no se menciona ningún ruido que la distrajera del cuaderno.',
  },
  {
    topic: 7,
    format: 'READING_COMPREHENSION',
    passage: { ref: 'g93-azotea' },
    stem: 'En el fragmento, la frase "como si alguien hubiera bajado el volumen del mundo" sirve para...',
    correct: 'comparar la azotea con un lugar donde los sonidos de la calle llegan amortiguados.',
    distractors: [
      'explicar que Mariana había perdido parcialmente el oído por el viento.',
      'anunciar que la ciudad se había quedado sin electricidad esa tarde.',
      'señalar que los coches habían dejado de circular por completo esa tarde.',
    ],
    difficulty: 'ADVANCED',
    sourceChunks: [4],
    layer1:
      'Es una comparación (símil) que describe, de forma figurada, cómo se percibe el ruido de la calle desde la altura: no desaparece, pero llega "apagado", como si su volumen hubiera sido reducido deliberadamente.',
    layer2:
      '1) La oración completa dice "el ruido del tráfico llegaba apagado, como si alguien hubiera bajado el volumen del mundo". 2) "Apagado" ya indica que el sonido persiste, solo que más bajo. 3) La comparación refuerza esa idea de sonido amortiguado por la distancia/altura, no de silencio total ni de un fenómeno real.',
    layer3:
      'No hay ninguna mención a que Mariana perdiera el oído, a un apagón eléctrico, ni a que los coches dejaran de circular: el tráfico sigue ahí, solo que se percibe más bajo desde la azotea, que es justamente lo que la comparación figurada expresa.',
  },
];
