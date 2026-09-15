// G91 — 40 reactivos de Biología, IPN "Ciencias Médico-Biológicas".
//
// Selección justificada con números reales (censo antes de este lote, via
// `pnpm content:guard` + recuento SQL directo por peso de examen):
//   Biología (IPN Médico-Bio) es la materia con la MENOR densidad de
//   reactivos servibles relativa a su peso de TODO el catálogo activo
//   (UNAM SUPERIOR + IPN SUPERIOR, únicas instituciones con
//   NEXT_PUBLIC_ENABLE_* en true): peso 22, servía 70 -> 3.18 reactivos por
//   punto de peso, por debajo de la siguiente más baja (IPN Física, 3.5, y
//   del pool UNAM:ESPANOL, también 3.5). Es EXCLUSIVA de esta área (no
//   figura en la lista de materias con `sharedContentKey` de
//   src/lib/content/shared-subjects.ts: UNAM comparte Español/Inglés/
//   Química; IPN comparte Español/Inglés/Química/Matemáticas — Biología no).
//   Los 12 temas del temario tienen 0 SourceChunks -> 100% TEMARIO_ONLY.
//
// Reparto de los 40 reactivos, con más profundidad en los 2 temas más
// delgados (Evolución y especiación, Homeostasis: 5 cada uno antes de este
// lote, el mínimo de la materia) y cobertura general en los 10 restantes:
//   1  Célula y organelos              +2  (6->8)
//   2  Mitosis y meiosis               +2  (6->8)
//   3  Genética básica                 +3  (6->9)
//   4  Evolución y especiación         +4  (5->9)
//   5  Ecología y ecosistemas          +3  (6->9)
//   6  Sistemas del cuerpo humano      +4  (6->10)
//   7  Nutrición y metabolismo         +3  (6->9)
//   8  Homeostasis                     +4  (5->9)
//   9  Sistema nervioso                +4  (6->10)
//   10 Sistema endocrino               +3  (6->9)
//   11 Inmunología                     +4  (6->10)
//   12 Reproducción                   +4  (6->10)
//
// Todos los cálculos/ratios citados (cruzas mendelianas 3:1 y 9:3:3:1,
// ATP neto de la glucólisis, la regla del 10% de la pirámide energética,
// n=23/2n=46) se verificaron ejecutándolos en verify-calcs.mjs antes de
// insertar — obligatorio por CLAUDE.md para cualquier materia con cálculo.

export const TOPIC_IDS = [
  'cmrr1llci00c1hi3nt6n3ladi', // 1 Célula y organelos
  'cmrr1llxy00c3hi3n48gs3bc3', // 2 Mitosis y meiosis
  'cmrr1lmki00c5hi3nh1nfudgz', // 3 Genética básica
  'cmrr1lna200c7hi3ng99a01mt', // 4 Evolución y especiación
  'cmrr1lnwu00c9hi3n65dklvcg', // 5 Ecología y ecosistemas
  'cmrr1loic00cbhi3n5pmdjy4s', // 6 Sistemas del cuerpo humano
  'cmrr1lp0o00cdhi3ndgljb0oq', // 7 Nutrición y metabolismo
  'cmrr1lpnf00cfhi3nhjt742fa', // 8 Homeostasis
  'cmrr1lqap00chhi3ny40hb0kj', // 9 Sistema nervioso
  'cmrr1lqux00cjhi3nkigfso9u', // 10 Sistema endocrino
  'cmrr1lre900clhi3n7hblv5ld', // 11 Inmunología
  'cmrr1lrzg00cnhi3noybre7vu', // 12 Reproducción
];

export const ITEMS = [
  // ── 1. Célula y organelos ──────────────────────────────────────────────
  {
    topic: 1,
    difficulty: 'BASIC',
    sourceChunks: [],
    stem: '¿Cuál organelo celular es responsable de sintetizar ATP mediante la respiración celular aeróbica?',
    correct: 'La mitocondria',
    distractors: ['El aparato de Golgi', 'El retículo endoplásmico liso', 'El lisosoma'],
    layer1: 'La mitocondria posee su propia doble membrana y las enzimas de la cadena respiratoria; ahí ocurren el ciclo de Krebs y la fosforilación oxidativa que producen la mayor parte del ATP celular.',
    layer2: '1) La glucólisis en el citosol produce piruvato. 2) El piruvato entra a la mitocondria. 3) Ahí el ciclo de Krebs y la cadena de transporte de electrones generan la mayoría del ATP mediante O2.',
    layer3: 'El aparato de Golgi empaca y modifica proteínas para su transporte, no produce ATP; el retículo liso sintetiza lípidos y participa en la desintoxicación; el lisosoma digiere macromoléculas con enzimas, sin generar energía.',
  },
  {
    topic: 1,
    difficulty: 'BASIC',
    sourceChunks: [],
    stem: '¿Cuál de las siguientes estructuras está presente en una célula vegetal típica pero ausente en una célula animal?',
    correct: 'El cloroplasto',
    distractors: ['La mitocondria', 'El núcleo', 'El ribosoma'],
    layer1: 'El cloroplasto es el organelo fotosintético que capta luz para producir glucosa; solo aparece en células con capacidad fotosintética, como las de plantas y algas.',
    layer2: '1) Ambas células, animal y vegetal, son eucariontes. 2) Comparten núcleo, mitocondrias y ribosomas. 3) Solo la vegetal añade cloroplastos, pared celular y una vacuola central grande.',
    layer3: 'La mitocondria, el núcleo y el ribosoma son organelos comunes a toda célula eucarionte, animal o vegetal, así que ninguno distingue a la célula vegetal por sí solo.',
  },

  // ── 2. Mitosis y meiosis ────────────────────────────────────────────────
  {
    topic: 2,
    difficulty: 'INTERMEDIATE',
    sourceChunks: [],
    stem: 'Al final de la meiosis, ¿cuántas células hijas se producen a partir de una célula diploide (2n), y en qué condición cromosómica quedan?',
    correct: 'Cuatro células haploides (n)',
    distractors: ['Dos células diploides (2n)', 'Cuatro células diploides (2n)', 'Dos células haploides (n)'],
    layer1: 'La meiosis incluye dos divisiones sucesivas (meiosis I y II) a partir de una sola replicación del ADN, así que el número de cromosomas se reduce a la mitad y el número de células se duplica dos veces.',
    layer2: '1) Una célula 2n replica su ADN una vez. 2) Meiosis I separa homólogos, dando 2 células n. 3) Meiosis II separa cromátidas hermanas, dando 4 células n en total.',
    layer3: 'Dos células diploides describiría el resultado de la mitosis, no de la meiosis; cuatro células diploides ignoraría la reducción cromosómica; dos células haploides se queda a la mitad del proceso, tras solo la primera división.',
  },
  {
    topic: 2,
    difficulty: 'BASIC',
    sourceChunks: [],
    stem: '¿En qué fase de la mitosis se separan las cromátidas hermanas y migran hacia polos opuestos de la célula?',
    correct: 'En la anafase',
    distractors: ['En la metafase', 'En la profase', 'En la telofase'],
    layer1: 'En la anafase las proteínas del cinetocoro se desprenden y las fibras del huso tiran de cada cromátida hermana hacia el polo celular correspondiente, separándolas físicamente.',
    layer2: '1) En metafase los cromosomas se alinean en el ecuador. 2) En anafase el centrómero se divide y cada cromátida es jalada a un polo. 3) En telofase se forman los nuevos núcleos.',
    layer3: 'En la metafase los cromosomas solo se alinean, sin separarse todavía; en la profase apenas se condensa la cromatina y se forma el huso; en la telofase las cromátidas ya llegaron a los polos y se están formando los núcleos hijos.',
  },

  // ── 3. Genética básica ─────────────────────────────────────────────────
  {
    topic: 3,
    difficulty: 'BASIC',
    sourceChunks: [],
    stem: 'Se cruzan dos plantas heterocigotas para un carácter con dominancia completa (Aa x Aa). ¿Qué proporción fenotípica se espera en la descendencia?',
    correct: '3 dominante : 1 recesivo',
    distractors: ['1 dominante : 2 intermedio : 1 recesivo', '1 dominante : 1 recesivo', '9 dominante : 3 : 3 : 1 recesivo'],
    layer1: 'El cuadro de Punnett para Aa x Aa da los genotipos AA, Aa, Aa y aa (1:2:1). Como A es dominante completo, AA y Aa comparten el mismo fenotipo, así que fenotípicamente queda 3:1.',
    layer2: '1) Gametos posibles de cada progenitor: A, a. 2) Combinaciones: AA, Aa, aA, aa. 3) Fenotipos: 3 muestran el rasgo dominante (AA, Aa, aA) y 1 el recesivo (aa).',
    layer3: '1:2:1 es la proporción GENOTÍPICA, no la fenotípica, y solo aplica si hubiera dominancia incompleta; 1:1 correspondería a una cruza de prueba (Aa x aa); 9:3:3:1 es la proporción de una cruza DIHÍBRIDA con dos genes, no de una sola.',
  },
  {
    topic: 3,
    difficulty: 'INTERMEDIATE',
    sourceChunks: [],
    stem: 'En una cruza dihíbrida AaBb x AaBb, con los dos genes en cromosomas distintos y dominancia completa en ambos, ¿cuál es la proporción fenotípica esperada en la descendencia?',
    correct: '9 : 3 : 3 : 1',
    distractors: ['3 : 1', '1 : 2 : 1', '1 : 1 : 1 : 1'],
    layer1: 'Con segregación independiente, cada gen se hereda por separado; el cuadro de Punnett de 16 combinaciones agrupa los fenotipos en 9 con ambos dominantes, 3 y 3 con uno dominante y uno recesivo, y 1 con ambos recesivos.',
    layer2: '1) Gametos posibles de cada progenitor: AB, Ab, aB, ab. 2) Las 16 combinaciones del cuadro se agrupan por fenotipo. 3) El resultado es 9 (A_B_) : 3 (A_bb) : 3 (aaB_) : 1 (aabb).',
    layer3: '3:1 es el resultado de una cruza MONOhíbrida con un solo gen, no de dos; 1:2:1 describe genotipos con dominancia incompleta en un solo gen; 1:1:1:1 sería el resultado de una cruza de prueba dihíbrida (AaBb x aabb), no de AaBb x AaBb.',
  },
  {
    topic: 3,
    difficulty: 'INTERMEDIATE',
    sourceChunks: [],
    stem: '¿Cuál es el propósito de una cruza de prueba (testcross), en la que un individuo de fenotipo dominante se cruza con uno homocigoto recesivo?',
    correct: 'Determinar si el individuo dominante es homocigoto o heterocigoto',
    distractors: ['Determinar el sexo de la descendencia resultante', 'Producir descendencia con dominancia incompleta', 'Aumentar la variabilidad genética de la población'],
    layer1: 'Un homocigoto recesivo solo aporta alelos recesivos, así que el fenotipo de la descendencia revela directamente qué gametos produjo el progenitor de fenotipo dominante, sin que su otro alelo quede oculto.',
    layer2: '1) Se cruza el individuo de fenotipo dominante (genotipo desconocido) con aa. 2) Si es AA, toda la descendencia es Aa (dominante). 3) Si es Aa, la mitad de la descendencia es aa (recesivo).',
    layer3: 'El sexo de la descendencia se define por los cromosomas sexuales, no por esta cruza; la dominancia incompleta es una propiedad del gen en cuestión, no algo que la cruza "produzca"; y una sola cruza dirigida no aumenta la variabilidad genética de una población.',
  },

  // ── 4. Evolución y especiación ──────────────────────────────────────────
  {
    topic: 4,
    difficulty: 'BASIC',
    sourceChunks: [],
    stem: '¿Cuál de los siguientes es un requisito indispensable para que opere la selección natural en una población?',
    correct: 'Que exista variación heredable entre los individuos',
    distractors: ['Que todos los individuos compartan el mismo genotipo', 'Que el ambiente permanezca completamente sin cambios', 'Que la reproducción sea exclusivamente asexual'],
    layer1: 'Sin variación heredable no hay rasgos distintos sobre los cuales el ambiente pueda favorecer a unos individuos sobre otros, y sin herencia esa ventaja no pasaría a la siguiente generación.',
    layer2: '1) Debe existir variación entre individuos. 2) Esa variación debe ser heredable. 3) Debe afectar la supervivencia o reproducción diferencial, para que la frecuencia de los rasgos favorables aumente con las generaciones.',
    layer3: 'Un genotipo idéntico en todos los individuos eliminaría la variación necesaria; un ambiente sin cambios no impide la selección, solo la hace menos evidente; y la selección natural también opera en poblaciones con reproducción sexual, que de hecho es la más común en la naturaleza.',
  },
  {
    topic: 4,
    difficulty: 'INTERMEDIATE',
    sourceChunks: [],
    stem: '¿Cómo se llama el proceso de formación de nuevas especies cuando una población se divide por una barrera geográfica que impide el flujo génico entre sus partes?',
    correct: 'Especiación alopátrica',
    distractors: ['Especiación simpátrica', 'Deriva génica', 'Convergencia evolutiva'],
    layer1: '"Alo-" significa "otro/distinto lugar": las dos poblaciones quedan geográficamente separadas, acumulan diferencias genéticas por su cuenta y con el tiempo dejan de poder reproducirse entre sí.',
    layer2: '1) Una barrera física (un río, una cordillera, un océano) divide a la población. 2) Cada grupo evoluciona por separado, sin flujo génico. 3) Con suficiente tiempo, las diferencias impiden la reproducción cruzada.',
    layer3: 'La especiación simpátrica ocurre SIN separación geográfica, dentro de la misma zona; la deriva génica es un mecanismo de cambio de frecuencias alélicas por azar, no un tipo de especiación; la convergencia evolutiva describe especies no emparentadas que desarrollan rasgos similares, lo opuesto a divergir de un ancestro común.',
  },
  {
    topic: 4,
    difficulty: 'INTERMEDIATE',
    sourceChunks: [],
    stem: 'Las extremidades anteriores de un humano y las aletas de una ballena comparten el mismo origen embrionario y el mismo esquema óseo, aunque cumplan funciones distintas. ¿Cómo se llama este tipo de estructuras?',
    correct: 'Estructuras homólogas',
    distractors: ['Estructuras análogas', 'Estructuras vestigiales', 'Estructuras convergentes'],
    layer1: 'Las estructuras homólogas comparten origen evolutivo (un ancestro común) aunque su función actual haya divergido; el mismo patrón óseo del brazo humano y la aleta de la ballena delata ese parentesco.',
    layer2: '1) Se comparan estructuras de dos especies. 2) Si el origen embrionario y la disposición ósea coinciden, hay homología, sin importar la función actual. 3) Brazo humano y aleta de ballena cumplen esa condición.',
    layer3: 'Las estructuras análogas cumplen la MISMA función pero tienen origen distinto (como el ala de un ave y la de un insecto); las estructuras vestigiales son remanentes sin función actual (como el apéndice); "estructuras convergentes" describe el resultado de la convergencia evolutiva, el fenómeno opuesto a la homología.',
  },
  {
    topic: 4,
    difficulty: 'ADVANCED',
    sourceChunks: [],
    stem: 'El efecto de cuello de botella describe una pérdida abrupta de variabilidad genética en una población. ¿En qué tipo de poblaciones es más pronunciado este efecto?',
    correct: 'En poblaciones pequeñas',
    distractors: ['En poblaciones muy grandes y estables', 'En poblaciones con apareamiento completamente al azar', 'En poblaciones sin mutación alguna'],
    layer1: 'La deriva génica, el mecanismo detrás del cuello de botella, actúa por azar de muestreo entre generaciones; ese azar pesa mucho más cuando la muestra de individuos sobrevivientes es pequeña.',
    layer2: '1) Un evento drástico reduce el tamaño de la población. 2) Los pocos sobrevivientes portan solo una fracción de los alelos originales. 3) Mientras más pequeña la población resultante, mayor la pérdida proporcional de variabilidad.',
    layer3: 'En poblaciones muy grandes el azar de muestreo pesa poco, así que la variabilidad se conserva mejor; el apareamiento al azar por sí solo no reduce el tamaño poblacional, que es la causa del efecto; y la ausencia de mutación no provoca un cuello de botella, solo limita la fuente de variación nueva.',
  },

  // ── 5. Ecología y ecosistemas ───────────────────────────────────────────
  {
    topic: 5,
    difficulty: 'BASIC',
    sourceChunks: [],
    stem: 'De acuerdo con la regla del 10%, si el nivel de los productores de un ecosistema contiene 10,000 kcal de energía disponible, ¿cuánta energía aproximadamente pasará al siguiente nivel trófico (herbívoros)?',
    correct: '1,000 kcal',
    distractors: ['10,000 kcal', '100 kcal', '5,000 kcal'],
    layer1: 'La regla del 10% describe que, en promedio, solo el 10% de la energía de un nivel trófico se transfiere al siguiente; el resto se pierde como calor metabólico o no es consumido ni digerido.',
    layer2: '1) Energía disponible en productores: 10,000 kcal. 2) Se transfiere el 10%: 10,000 x 0.10. 3) Resultado: 1,000 kcal disponibles para los herbívoros.',
    layer3: '10,000 kcal ignoraría por completo la pérdida de energía entre niveles; 100 kcal correspondería a aplicar la regla del 10% dos veces seguidas, saltándose un nivel trófico; 5,000 kcal supondría una transferencia del 50%, muy por encima de lo que ocurre realmente.',
  },
  {
    topic: 5,
    difficulty: 'BASIC',
    sourceChunks: [],
    stem: 'En la relación entre las abejas y las flores que polinizan, ambas especies obtienen un beneficio (alimento y reproducción, respectivamente). ¿Qué tipo de relación ecológica es esta?',
    correct: 'Mutualismo',
    distractors: ['Parasitismo', 'Comensalismo', 'Depredación'],
    layer1: 'El mutualismo es la interacción en la que las dos especies involucradas se benefician: la abeja obtiene néctar y la planta logra que su polen se transporte hacia otra flor.',
    layer2: '1) La abeja visita la flor por su néctar. 2) Al hacerlo, transporta polen entre flores. 3) La planta se poliniza y la abeja se alimenta: ambas ganan.',
    layer3: 'En el parasitismo una especie se beneficia y la otra resulta perjudicada; en el comensalismo una especie se beneficia sin afectar a la otra, positiva ni negativamente; en la depredación un organismo consume directamente a otro, sin el beneficio mutuo que hay entre abeja y flor.',
  },
  {
    topic: 5,
    difficulty: 'ADVANCED',
    sourceChunks: [],
    stem: '¿Cuál es la diferencia principal entre la sucesión ecológica primaria y la secundaria?',
    correct: 'La primaria inicia en un sustrato sin suelo previo, la secundaria donde ya existía suelo',
    distractors: [
      'La primaria ocurre solo en ecosistemas acuáticos, la secundaria solo en terrestres',
      'La primaria es más rápida porque no requiere especies colonizadoras pioneras',
      'La secundaria culmina en un ecosistema distinto al original, la primaria regresa al mismo',
    ],
    layer1: 'La sucesión primaria arranca desde cero, sobre roca desnuda o sedimento sin suelo (como tras una erupción volcánica); la secundaria ocurre donde el suelo sobrevivió a una perturbación (como un incendio o un campo abandonado), así que avanza más rápido.',
    layer2: '1) La primaria empieza sin suelo: primero llegan líquenes y musgos que lo van formando. 2) La secundaria ya cuenta con suelo y semillas latentes. 3) Por eso la secundaria alcanza más rápido un ecosistema maduro.',
    layer3: 'Ambos tipos de sucesión ocurren tanto en ambientes terrestres como acuáticos, no están restringidos a uno; la primaria es la MÁS LENTA de las dos, precisamente porque depende de especies pioneras que formen suelo desde cero; y ninguna de las dos garantiza regresar exactamente al ecosistema original, eso depende de las condiciones locales.',
  },

  // ── 6. Sistemas del cuerpo humano ───────────────────────────────────────
  {
    topic: 6,
    difficulty: 'BASIC',
    sourceChunks: [],
    stem: '¿Cuántas cavidades tiene el corazón humano y cómo se llaman en conjunto?',
    correct: 'Cuatro: dos aurículas y dos ventrículos',
    distractors: ['Tres: dos aurículas y un ventrículo', 'Dos: una aurícula y un ventrículo', 'Cuatro: cuatro ventrículos, sin aurículas'],
    layer1: 'El corazón humano es tetracameral: dos aurículas reciben la sangre que llega y dos ventrículos la bombean hacia fuera, separados en un lado derecho (circuito pulmonar) y uno izquierdo (circuito sistémico).',
    layer2: '1) La sangre entra a las aurículas. 2) Pasa a los ventrículos correspondientes. 3) Los ventrículos la bombean: el derecho a los pulmones, el izquierdo al resto del cuerpo.',
    layer3: 'Tres cavidades con un solo ventrículo describe más bien un corazón de anfibio; dos cavidades corresponde al corazón de un pez; y "cuatro ventrículos sin aurículas" no existe en ningún vertebrado, porque siempre hace falta una cámara receptora antes de bombear.',
  },
  {
    topic: 6,
    difficulty: 'BASIC',
    sourceChunks: [],
    stem: '¿En qué estructura del sistema respiratorio ocurre el intercambio gaseoso entre el aire inhalado y la sangre?',
    correct: 'En los alvéolos pulmonares',
    distractors: ['En la tráquea', 'En los bronquios', 'En la laringe'],
    layer1: 'Los alvéolos son diminutos sacos de pared muy delgada, rodeados de capilares sanguíneos; esa combinación de gran superficie y poca distancia permite que el oxígeno y el dióxido de carbono se difundan entre el aire y la sangre.',
    layer2: '1) El aire viaja por tráquea y bronquios hasta los bronquiolos. 2) Llega a los alvéolos, donde la pared es de una sola célula de grosor. 3) Ahí el O2 pasa a la sangre y el CO2 sale hacia el aire.',
    layer3: 'La tráquea y los bronquios solo conducen el aire, con paredes gruesas que no permiten el intercambio; la laringe participa en la fonación y protege la vía respiratoria durante la deglución, tampoco es sitio de intercambio gaseoso.',
  },
  {
    topic: 6,
    difficulty: 'INTERMEDIATE',
    sourceChunks: [],
    stem: '¿Qué enzima gástrica, activa en un medio ácido, inicia la digestión de las proteínas en el estómago?',
    correct: 'La pepsina',
    distractors: ['La amilasa salival', 'La lipasa pancreática', 'La tripsina'],
    layer1: 'La pepsina se secreta como pepsinógeno inactivo y el ácido clorhídrico del estómago la activa; a diferencia de la mayoría de las enzimas, funciona mejor en un pH muy ácido, cercano a 2.',
    layer2: '1) Las células gástricas secretan pepsinógeno y HCl. 2) El HCl activa al pepsinógeno en pepsina. 3) La pepsina rompe las proteínas de los alimentos en fragmentos más pequeños.',
    layer3: 'La amilasa salival digiere almidón y actúa en la boca, no en el estómago; la lipasa pancreática digiere lípidos, en el intestino delgado; la tripsina también digiere proteínas, pero se activa en el intestino delgado, en un medio básico, no en el ácido gástrico.',
  },
  {
    topic: 6,
    difficulty: 'BASIC',
    sourceChunks: [],
    stem: '¿Qué tejido conectivo fibroso une un músculo esquelético al hueso, transmitiendo la fuerza de la contracción para producir movimiento?',
    correct: 'El tendón',
    distractors: ['El ligamento', 'El cartílago', 'La fascia'],
    layer1: 'El tendón está formado por fibras de colágeno muy resistentes, dispuestas en paralelo, especializadas en transmitir la fuerza de tracción del músculo hacia el hueso al que se ancla.',
    layer2: '1) El músculo se contrae y genera fuerza. 2) Esa fuerza se transmite a través del tendón. 3) El tendón tira del hueso, produciendo el movimiento articular.',
    layer3: 'El ligamento une hueso con hueso, estabilizando la articulación, no transmite fuerza muscular; el cartílago recubre las superficies articulares y amortigua, no ancla músculos; la fascia envuelve y separa a los músculos entre sí, sin fijarlos directamente al hueso.',
  },

  // ── 7. Nutrición y metabolismo ───────────────────────────────────────────
  {
    topic: 7,
    difficulty: 'INTERMEDIATE',
    sourceChunks: [],
    stem: 'Durante la glucólisis, una molécula de glucosa se degrada hasta dos moléculas de piruvato. ¿Cuál es la ganancia NETA de ATP en este proceso?',
    correct: '2 ATP netos',
    distractors: ['4 ATP netos', '36 ATP netos', '0 ATP netos'],
    layer1: 'La glucólisis produce 4 ATP por fosforilación a nivel de sustrato, pero primero invierte 2 ATP para activar la glucosa; la ganancia neta es la resta de ambos.',
    layer2: '1) Se invierten 2 ATP para fosforilar la glucosa al inicio. 2) Se generan 4 ATP en los pasos posteriores. 3) Ganancia neta: 4 ATP producidos menos 2 ATP invertidos = 2 ATP.',
    layer3: '4 ATP netos ignora la inversión inicial de 2 ATP; 36 ATP netos corresponde aproximadamente al total de la respiración aeróbica COMPLETA (glucólisis + ciclo de Krebs + cadena respiratoria), no solo a la glucólisis; 0 ATP netos supondría que la inversión y la producción se cancelan por completo, lo cual no ocurre.',
  },
  {
    topic: 7,
    difficulty: 'BASIC',
    sourceChunks: [],
    stem: '¿Cuál de las siguientes vitaminas es liposoluble y puede almacenarse en el tejido adiposo y el hígado del cuerpo?',
    correct: 'Vitamina A',
    distractors: ['Vitamina C', 'Vitamina B12', 'Vitamina B1'],
    layer1: 'Las vitaminas liposolubles (A, D, E, K) se disuelven en grasas y pueden acumularse en tejidos grasos y en el hígado; la vitamina A, esencial para la visión y la piel, es una de ellas.',
    layer2: '1) Una vitamina liposoluble se disuelve en lípidos, no en agua. 2) Por eso el cuerpo puede almacenarla en grasa. 3) La vitamina A cumple esa condición; se obtiene de alimentos como el hígado y la zanahoria.',
    layer3: 'La vitamina C, la B12 y la B1 son hidrosolubles: se disuelven en agua, no se acumulan en tejido graso y el exceso que el cuerpo no usa se elimina por la orina en vez de almacenarse.',
  },
  {
    topic: 7,
    difficulty: 'INTERMEDIATE',
    sourceChunks: [],
    stem: '¿Qué se entiende por tasa metabólica basal (TMB)?',
    correct: 'La energía mínima que el cuerpo requiere en reposo para sus funciones vitales',
    distractors: [
      'La energía total que una persona gasta al realizar ejercicio intenso',
      'La cantidad de calorías que se pierden únicamente por respirar',
      'El total de proteínas que el cuerpo sintetiza a lo largo de un día',
    ],
    layer1: 'La TMB mide la energía que el cuerpo consume solo para mantener funciones esenciales en reposo absoluto (respiración, circulación, temperatura corporal), sin incluir actividad física ni digestión.',
    layer2: '1) Se mide en condiciones de reposo total, en ayuno, a temperatura ambiente confortable. 2) Refleja el gasto energético de órganos vitales funcionando. 3) Es la base sobre la que se suma la energía del ejercicio y la digestión.',
    layer3: 'El gasto de ejercicio intenso es energía ADICIONAL a la basal, no la basal en sí; reducirlo solo a la respiración deja fuera al resto de los órganos vitales; y la síntesis de proteínas es apenas una parte del gasto metabólico total, no su definición.',
  },

  // ── 8. Homeostasis ───────────────────────────────────────────────────────
  {
    topic: 8,
    difficulty: 'BASIC',
    sourceChunks: [],
    stem: '¿Cómo se define la homeostasis en un organismo?',
    correct: 'La capacidad de mantener un ambiente interno estable pese a cambios externos',
    distractors: [
      'El proceso de crecimiento acelerado de un organismo durante la pubertad',
      'La producción exclusiva de hormonas por las glándulas endocrinas',
      'La eliminación completa de desechos metabólicos del cuerpo',
    ],
    layer1: 'La homeostasis es el conjunto de mecanismos que mantienen constantes variables internas (temperatura, pH, glucosa) aunque el entorno externo cambie, gracias a sistemas de retroalimentación.',
    layer2: '1) Un sensor detecta un cambio en una variable interna. 2) Un centro de control compara ese valor con el punto normal. 3) Un efector corrige la desviación, devolviendo la variable a su rango estable.',
    layer3: 'El crecimiento en la pubertad es un proceso del desarrollo, no la definición general de homeostasis; producir hormonas es solo una herramienta que el cuerpo usa PARA lograr homeostasis, no la homeostasis misma; y ningún organismo elimina el 100% de sus desechos de forma instantánea.',
  },
  {
    topic: 8,
    difficulty: 'INTERMEDIATE',
    sourceChunks: [],
    stem: 'Cuando la glucosa en sangre sube después de una comida, el páncreas libera insulina, lo que hace que la glucosa vuelva a bajar. ¿Qué tipo de mecanismo de control representa este ejemplo?',
    correct: 'Retroalimentación negativa',
    distractors: ['Retroalimentación positiva', 'Inhibición competitiva', 'Reflejo somático'],
    layer1: 'En la retroalimentación negativa, la respuesta del cuerpo se opone al cambio inicial: la glucosa sube y la insulina actúa para bajarla, devolviendo el sistema a su punto de equilibrio.',
    layer2: '1) La glucosa sube tras comer. 2) El páncreas detecta el cambio y libera insulina. 3) La insulina hace que las células capten glucosa, y el nivel en sangre desciende de nuevo: el efecto revierte la causa.',
    layer3: 'La retroalimentación positiva AMPLIFICARÍA el cambio inicial en vez de revertirlo (como ocurre en el parto); la inhibición competitiva es un fenómeno de la cinética enzimática, no un mecanismo de control corporal; un reflejo somático controla músculo esquelético voluntario, no la regulación hormonal de la glucosa.',
  },
  {
    topic: 8,
    difficulty: 'INTERMEDIATE',
    sourceChunks: [],
    stem: '¿Qué mecanismo fisiológico ayuda a un humano a disminuir su temperatura corporal cuando hace mucho calor?',
    correct: 'La sudoración, que enfría la piel al evaporarse',
    distractors: [
      'La vasoconstricción de los vasos sanguíneos periféricos',
      'El escalofrío, que genera calor mediante contracción muscular',
      'El aumento del metabolismo basal para generar más calor',
    ],
    layer1: 'Al evaporarse, el sudor absorbe calor de la piel y lo disipa al ambiente, lo que enfría el cuerpo de forma directa cuando hace calor.',
    layer2: '1) Sube la temperatura corporal. 2) Las glándulas sudoríparas liberan sudor a la piel. 3) El sudor se evapora, absorbiendo calor y enfriando la superficie corporal.',
    layer3: 'La vasoconstricción periférica CONSERVA calor y ocurre en frío, no en calor; el escalofrío genera calor mediante contracciones musculares rápidas, también una respuesta al frío; y aumentar el metabolismo basal generaría todavía más calor, lo opuesto de lo que el cuerpo necesita ante el calor ambiental.',
  },
  {
    topic: 8,
    difficulty: 'INTERMEDIATE',
    sourceChunks: [],
    stem: '¿Cuál es el rango normal aproximado del pH de la sangre humana, que el cuerpo mantiene mediante amortiguadores y la acción de riñones y pulmones?',
    correct: '7.35 a 7.45',
    distractors: ['6.0 a 6.5', '8.0 a 8.5', '5.0 a 5.5'],
    layer1: 'La sangre humana se mantiene ligeramente básica, entre 7.35 y 7.45, gracias al amortiguador bicarbonato y a que los pulmones ajustan el CO2 exhalado mientras los riñones regulan la excreción de iones.',
    layer2: '1) El metabolismo genera constantemente CO2 y ácidos. 2) El sistema amortiguador bicarbonato neutraliza esos cambios de inmediato. 3) Pulmones y riñones ajustan a mediano plazo, manteniendo el pH en 7.35-7.45.',
    layer3: 'Un pH de 6.0-6.5 sería francamente ácido y correspondería a una acidosis grave, incompatible con la vida sostenida; 8.0-8.5 sería una alcalosis igual de peligrosa; y 5.0-5.5 es un pH muy ácido, propio de fluidos como el jugo gástrico, no de la sangre.',
  },

  // ── 9. Sistema nervioso ──────────────────────────────────────────────────
  {
    topic: 9,
    difficulty: 'BASIC',
    sourceChunks: [],
    stem: '¿Qué parte de la neurona se especializa en recibir señales de otras neuronas y transmitirlas hacia el cuerpo celular?',
    correct: 'Las dendritas',
    distractors: ['El axón', 'La vaina de mielina', 'El botón sináptico'],
    layer1: 'Las dendritas son prolongaciones cortas y ramificadas que reciben los estímulos de otras neuronas y los conducen hacia el cuerpo celular, en dirección opuesta a la del axón.',
    layer2: '1) Otra neurona libera neurotransmisor cerca de la dendrita. 2) La dendrita recibe la señal y genera un impulso eléctrico. 3) El impulso viaja hacia el cuerpo celular y de ahí hacia el axón.',
    layer3: 'El axón transmite la señal LEJOS del cuerpo celular, hacia la siguiente neurona; la vaina de mielina solo aísla al axón y acelera la conducción, sin recibir señales; el botón sináptico libera neurotransmisores al final del axón, en el otro extremo de la neurona.',
  },
  {
    topic: 9,
    difficulty: 'BASIC',
    sourceChunks: [],
    stem: '¿Qué estructuras conforman el sistema nervioso central (SNC)?',
    correct: 'El encéfalo y la médula espinal',
    distractors: ['Los nervios craneales y espinales', 'Los ganglios simpáticos y parasimpáticos', 'Los receptores sensoriales de la piel'],
    layer1: 'El SNC es el centro de procesamiento e integración: encéfalo y médula espinal reciben la información sensorial, la procesan y generan las órdenes que viajan hacia el resto del cuerpo.',
    layer2: '1) La información sensorial entra por nervios periféricos. 2) Llega al SNC (médula espinal y encéfalo) para procesarse. 3) El SNC envía una respuesta de vuelta por los nervios periféricos.',
    layer3: 'Los nervios craneales y espinales, los ganglios autónomos y los receptores de la piel forman parte del sistema nervioso PERIFÉRICO, encargado de conducir información hacia y desde el SNC, no de procesarla como centro de integración.',
  },
  {
    topic: 9,
    difficulty: 'INTERMEDIATE',
    sourceChunks: [],
    stem: 'En una sinapsis química, ¿qué sustancia libera la neurona presináptica hacia el espacio sináptico para comunicarse con la siguiente neurona?',
    correct: 'Neurotransmisores',
    distractors: ['Hormonas', 'Enzimas digestivas', 'Iones de calcio'],
    layer1: 'Los neurotransmisores (como acetilcolina o dopamina) se almacenan en vesículas de la neurona presináptica y se liberan hacia la hendidura sináptica, donde se unen a receptores de la neurona siguiente.',
    layer2: '1) Un impulso eléctrico llega a la terminal del axón. 2) Eso provoca que las vesículas liberen neurotransmisor al espacio sináptico. 3) El neurotransmisor se une a receptores de la neurona postsináptica, generando una nueva señal.',
    layer3: 'Las hormonas viajan por el torrente sanguíneo hacia órganos distantes, no cruzan directamente una sinapsis; las enzimas digestivas actúan en el tubo digestivo, sin relación con la transmisión nerviosa; los iones de calcio SÍ participan, pero disparando la liberación de neurotransmisor desde dentro de la neurona, no como la sustancia que cruza el espacio sináptico.',
  },
  {
    topic: 9,
    difficulty: 'INTERMEDIATE',
    sourceChunks: [],
    stem: 'Al tocar accidentalmente una superficie muy caliente, retiras la mano antes de sentir el dolor conscientemente. ¿Qué estructura coordina esta respuesta refleja tan rápida?',
    correct: 'La médula espinal',
    distractors: ['La corteza cerebral', 'El cerebelo', 'El hipotálamo'],
    layer1: 'En un arco reflejo simple, la señal sensorial entra a la médula espinal y de ahí sale directamente la orden motora, sin subir primero al cerebro; eso ahorra el tiempo que tomaría la percepción consciente.',
    layer2: '1) El receptor de dolor en la piel envía la señal por una neurona sensorial hacia la médula. 2) En la médula, una neurona intermedia conecta directamente con una motora. 3) La orden de retirar la mano sale de inmediato, antes de que el dolor se perciba en el cerebro.',
    layer3: 'La corteza cerebral sí participa, pero después, cuando ya percibes el dolor conscientemente, no en el reflejo inmediato; el cerebelo coordina el equilibrio y la precisión de movimientos voluntarios, no este tipo de reflejo; el hipotálamo regula funciones autónomas y hormonales, ajeno a este arco reflejo motor.',
  },

  // ── 10. Sistema endocrino ────────────────────────────────────────────────
  {
    topic: 10,
    difficulty: 'BASIC',
    sourceChunks: [],
    stem: '¿Qué glándula produce la insulina, la hormona que permite a las células captar la glucosa de la sangre?',
    correct: 'El páncreas',
    distractors: ['La glándula tiroides', 'Las glándulas suprarrenales', 'La hipófisis'],
    layer1: 'Las células beta de los islotes de Langerhans, dentro del páncreas, sintetizan y liberan insulina en respuesta al aumento de glucosa en sangre.',
    layer2: '1) La glucosa sube tras una comida. 2) Las células beta del páncreas lo detectan. 3) Liberan insulina, que permite a las células del cuerpo captar esa glucosa.',
    layer3: 'La tiroides regula el metabolismo general mediante T3 y T4, no la glucosa directamente; las suprarrenales producen cortisol y adrenalina, entre otras hormonas, pero no insulina; la hipófisis regula a otras glándulas mediante hormonas tróficas, sin producir insulina ella misma.',
  },
  {
    topic: 10,
    difficulty: 'INTERMEDIATE',
    sourceChunks: [],
    stem: '¿Qué efecto tiene un exceso de hormona tiroidea (hipertiroidismo) sobre el metabolismo del cuerpo?',
    correct: 'Lo acelera, aumentando el consumo de energía y la frecuencia cardiaca',
    distractors: [
      'Lo desacelera, provocando fatiga y aumento de peso',
      'No produce ningún efecto sobre el metabolismo',
      'Detiene por completo la producción de insulina',
    ],
    layer1: 'La hormona tiroidea regula la tasa metabólica de casi todas las células; en exceso, acelera el consumo de oxígeno y energía, elevando también la frecuencia cardiaca y la temperatura corporal.',
    layer2: '1) La tiroides libera T3 y T4 en exceso. 2) Estas hormonas aumentan la actividad metabólica celular. 3) El resultado clínico es pérdida de peso, taquicardia, y sensación de calor e inquietud.',
    layer3: 'La fatiga y el aumento de peso describen justo lo contrario, un hipoTIROIDISMO por falta de hormona tiroidea; decir que no hay efecto alguno contradice el papel central de esta hormona en el metabolismo; y la insulina la produce el páncreas, un órgano distinto, no directamente afectado por el exceso de hormona tiroidea.',
  },
  {
    topic: 10,
    difficulty: 'INTERMEDIATE',
    sourceChunks: [],
    stem: '¿Cuál es la diferencia principal entre una glándula endocrina y una glándula exocrina?',
    correct: 'La endocrina vierte su secreción a la sangre sin conductos; la exocrina usa conductos',
    distractors: [
      'La endocrina solo funciona durante la niñez; la exocrina, toda la vida',
      'La endocrina produce enzimas digestivas; la exocrina produce hormonas',
      'La endocrina se localiza solo en el cerebro; la exocrina, en el resto del cuerpo',
    ],
    layer1: 'Las glándulas endocrinas (como la tiroides) carecen de conductos y liberan hormonas directamente al torrente sanguíneo; las exocrinas (como las salivales o sudoríparas) usan conductos para verter su secreción a una superficie o cavidad.',
    layer2: '1) Una célula glandular sintetiza su producto. 2) Si la glándula es endocrina, lo libera directo a capilares sanguíneos cercanos. 3) Si es exocrina, lo transporta por un conducto hasta la piel o una cavidad, como la boca o el intestino.',
    layer3: 'Ambos tipos de glándula funcionan durante toda la vida, no solo en la niñez; es justo al revés: las exocrinas producen enzimas y otras secreciones (como saliva o sudor), y las endocrinas producen hormonas; y hay glándulas endocrinas y exocrinas repartidas por todo el cuerpo, no solo en el cerebro.',
  },

  // ── 11. Inmunología ──────────────────────────────────────────────────────
  {
    topic: 11,
    difficulty: 'INTERMEDIATE',
    sourceChunks: [],
    stem: '¿Cuál es una característica distintiva de la inmunidad adaptativa (específica) que la inmunidad innata NO tiene?',
    correct: 'Genera memoria inmunológica ante un patógeno específico',
    distractors: [
      'Actúa de forma inmediata ante cualquier patógeno, sin distinguir su tipo',
      'Incluye barreras físicas como la piel y las mucosas',
      'Está presente desde el nacimiento como primera línea de defensa',
    ],
    layer1: 'Solo la inmunidad adaptativa "recuerda" a un patógeno particular mediante linfocitos de memoria, lo que permite una respuesta más rápida y fuerte si ese mismo patógeno vuelve a presentarse.',
    layer2: '1) Un patógeno específico activa a linfocitos B y T especializados. 2) Algunos de esos linfocitos quedan como células de memoria. 3) Un segundo contacto con el mismo patógeno dispara una respuesta mucho más veloz.',
    layer3: 'Actuar de inmediato sin distinguir el tipo de patógeno, incluir barreras físicas y estar presente desde el nacimiento son justo los rasgos que definen a la inmunidad INNATA, la que no genera memoria específica.',
  },
  {
    topic: 11,
    difficulty: 'INTERMEDIATE',
    sourceChunks: [],
    stem: '¿Qué tipo de célula del sistema inmunitario se diferencia en célula plasmática y produce anticuerpos?',
    correct: 'El linfocito B',
    distractors: ['El linfocito T citotóxico', 'El macrófago', 'El neutrófilo'],
    layer1: 'Cuando un linfocito B reconoce su antígeno específico, se diferencia en célula plasmática, una fábrica especializada que secreta grandes cantidades de anticuerpos contra ese antígeno.',
    layer2: '1) El linfocito B reconoce un antígeno específico. 2) Con ayuda de linfocitos T colaboradores, se activa y prolifera. 3) Algunas de esas células se diferencian en células plasmáticas que secretan anticuerpos.',
    layer3: 'El linfocito T citotóxico destruye directamente a las células infectadas, sin producir anticuerpos; el macrófago fagocita patógenos y presenta antígenos, pero tampoco los produce; el neutrófilo es un fagocito de respuesta rápida, especializado en engullir patógenos, no en fabricar anticuerpos.',
  },
  {
    topic: 11,
    difficulty: 'INTERMEDIATE',
    sourceChunks: [],
    stem: '¿Cuál es el principio biológico detrás de la vacunación?',
    correct: 'Exponer al sistema inmunitario a un antígeno debilitado para generar memoria sin causar la enfermedad',
    distractors: [
      'Eliminar directamente al patógeno con antibióticos administrados por vía oral',
      'Elevar la temperatura corporal para destruir al patógeno antes de que se replique',
      'Sustituir de forma permanente la sangre del paciente por plasma con anticuerpos',
    ],
    layer1: 'La vacuna contiene una versión debilitada, inactivada o solo un fragmento del patógeno; eso basta para que el sistema inmunitario genere células de memoria específicas, sin que la persona desarrolle la enfermedad real.',
    layer2: '1) Se inyecta el antígeno debilitado o inactivo. 2) El sistema inmunitario lo reconoce y monta una respuesta adaptativa. 3) Quedan linfocitos de memoria, listos para responder rápido ante el patógeno real en el futuro.',
    layer3: 'Los antibióticos combaten bacterias directamente y no funcionan contra virus ni generan memoria inmunológica; la fiebre es una respuesta del cuerpo, no un mecanismo que las vacunas induzcan a propósito; y ninguna vacuna reemplaza la sangre del paciente, solo estimula su propio sistema inmunitario.',
  },
  {
    topic: 11,
    difficulty: 'BASIC',
    sourceChunks: [],
    stem: 'El enrojecimiento, el calor, la hinchazón y el dolor en una herida infectada son señales clásicas de, ¿qué proceso inmunitario?',
    correct: 'La inflamación',
    distractors: ['La necrosis', 'La anafilaxia', 'La autoinmunidad'],
    layer1: 'La inflamación es la respuesta inicial del cuerpo ante una infección o lesión: los vasos sanguíneos se dilatan y se vuelven más permeables, lo que produce enrojecimiento, calor, hinchazón y dolor mientras llegan células inmunitarias a combatir al patógeno.',
    layer2: '1) El tejido dañado o infectado libera señales químicas de alarma. 2) Los vasos sanguíneos cercanos se dilatan y permiten el paso de células inmunitarias. 3) Ese aumento de flujo y de células produce los cuatro signos clásicos.',
    layer3: 'La necrosis es la muerte del tejido por daño, una consecuencia posible, no la respuesta inmune activa en sí; la anafilaxia es una reacción alérgica grave y generalizada, no la respuesta local a una herida; la autoinmunidad ocurre cuando el sistema ataca tejido propio sano, algo distinto a defenderse de una infección real.',
  },

  // ── 12. Reproducción ─────────────────────────────────────────────────────
  {
    topic: 12,
    difficulty: 'BASIC',
    sourceChunks: [],
    stem: '¿Cuántos cromosomas aporta cada gameto humano (óvulo y espermatozoide) a la fecundación, y cuántos resultan en el cigoto?',
    correct: '23 cada gameto, 46 en el cigoto',
    distractors: ['46 cada gameto, 92 en el cigoto', '23 cada gameto, 23 en el cigoto', '46 cada gameto, 46 en el cigoto'],
    layer1: 'Los gametos son haploides (n=23), producto de la meiosis; al unirse óvulo y espermatozoide en la fecundación, se restaura el número diploide (2n=46) propio de las células somáticas humanas.',
    layer2: '1) Cada gameto aporta n=23 cromosomas. 2) El óvulo (23) se une al espermatozoide (23) en la fecundación. 3) El cigoto resultante queda con 2n=46 cromosomas.',
    layer3: '46 cromosomas por gameto correspondería a células diploides, no a gametos; 23 en el cigoto ignoraría que ambos gametos se combinan; y "46 cada gameto, 46 en el cigoto" no tiene sentido aritmético con la fusión de dos células.',
  },
  {
    topic: 12,
    difficulty: 'BASIC',
    sourceChunks: [],
    stem: '¿En qué parte del sistema reproductor femenino ocurre normalmente la fecundación?',
    correct: 'En las trompas de Falopio',
    distractors: ['En el útero', 'En el ovario', 'En la vagina'],
    layer1: 'El óvulo liberado por el ovario viaja hacia la trompa de Falopio, donde suele encontrarse con los espermatozoides que ascendieron desde la vagina; ahí, en el tercio externo de la trompa, ocurre normalmente la unión de ambos gametos.',
    layer2: '1) El ovario libera el óvulo en la ovulación. 2) El óvulo entra a la trompa de Falopio. 3) Los espermatozoides, tras ascender por el aparato reproductor, se encuentran ahí con el óvulo y ocurre la fecundación.',
    layer3: 'El útero es el sitio donde el embrión ya fecundado se implanta y se desarrolla, no donde ocurre la unión de los gametos; el ovario es de donde SALE el óvulo, antes de llegar a la trompa; la vagina es solo la vía de entrada de los espermatozoides, muy lejos todavía del óvulo.',
  },
  {
    topic: 12,
    difficulty: 'INTERMEDIATE',
    sourceChunks: [],
    stem: '¿Cuál es la función principal de la placenta durante el embarazo?',
    correct: 'Permitir el intercambio de nutrientes, gases y desechos entre madre y feto',
    distractors: [
      'Producir los óvulos que después serán fecundados',
      'Servir como el único sitio posible de fecundación del óvulo',
      'Sustituir a los pulmones del feto justo después de nacer',
    ],
    layer1: 'La placenta conecta la circulación materna y fetal sin mezclarlas directamente: a través de ella difunden oxígeno, nutrientes y anticuerpos hacia el feto, y dióxido de carbono y desechos hacia la madre.',
    layer2: '1) Vasos sanguíneos maternos y fetales se acercan mucho en la placenta, sin fusionarse. 2) Oxígeno y nutrientes cruzan hacia el feto por difusión. 3) CO2 y desechos metabólicos cruzan en sentido contrario, hacia la madre.',
    layer3: 'Los óvulos se producen en los ovarios desde antes del embarazo, no en la placenta; la fecundación ocurre en la trompa de Falopio, mucho antes de que exista placenta; y la placenta funciona SOLO durante el embarazo, dejando de existir tras el parto, cuando los pulmones del recién nacido empiezan a funcionar por sí solos.',
  },
  {
    topic: 12,
    difficulty: 'ADVANCED',
    sourceChunks: [],
    stem: '¿Qué evento hormonal desencadena la ovulación durante el ciclo menstrual?',
    correct: 'Un pico repentino de la hormona luteinizante (LH)',
    distractors: [
      'Una caída sostenida de estrógeno durante toda la fase folicular',
      'Un aumento gradual de progesterona desde el primer día del ciclo',
      'La ausencia total de FSH durante la fase lútea',
    ],
    layer1: 'Hacia la mitad del ciclo, el estrógeno alcanza un nivel alto que provoca, por retroalimentación positiva, un pico súbito de LH; ese pico de LH es la señal directa que hace que el folículo libere al óvulo.',
    layer2: '1) El folículo en maduración eleva el estrógeno durante la fase folicular. 2) El estrógeno alto dispara un pico de LH en la hipófisis. 3) El pico de LH provoca la ruptura del folículo y la liberación del óvulo: la ovulación.',
    layer3: 'Durante la fase folicular el estrógeno en realidad SUBE, no cae, conforme el folículo madura; la progesterona se eleva DESPUÉS de la ovulación, en la fase lútea, no desde el primer día del ciclo; y la FSH sí está presente en la fase lútea, en niveles bajos, pero su ausencia no es lo que dispara la ovulación.',
  },
];
