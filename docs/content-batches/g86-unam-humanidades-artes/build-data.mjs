// Datos crudos del lote G86 — UNAM Humanidades y Artes, materia Artes (40 reactivos).
// Cada item: { topic, difficulty, stem, correct, distractors:[3], layer1, layer2, layer3, chunks }
// `topic` es el índice 1-5 sobre TOPIC_IDS (ver build.mjs). `chunks` son los
// índices 1-based (LOCALES a los SourceChunk de ESE tema) que el reactivo cita;
// [] para temas TEMARIO_ONLY (Escultura mexicana, Fotografía y cine).
//
// Las 4 opciones de cada reactivo se redactaron con longitud comparable desde
// la primera versión (lección de G77/G78/G82/G84): la clave no lleva relleno
// injustificado y, donde ayuda a igualar longitud, los distractores incluyen
// una cláusula descriptiva real (nunca vacía).
//
// Fuentes: 3 de los 5 temas (Artes visuales prehispánicas, Pintura colonial y
// moderna, Arquitectura) tienen SourceChunk real — fragmentos de una guía de
// preparación "Ciencias y Artes para el Diseño" (otra área de examen, con
// derechos de autor) que consisten en reactivos de opción múltiple YA
// REDACTADOS por terceros. Siguiendo el criterio de G75 ("ancla de FORMATO,
// nunca de texto"): se usaron únicamente los NOMBRES, OBRAS y CONCEPTOS que
// esos fragmentos confirman como parte del temario real (p. ej. que el
// examen distingue entre culturas olmeca/teotihuacana/maya/zapoteca/
// totonaca, o que espera saber quién pintó "Madre campesina", dónde está el
// Partenón, o quién construyó Ciudad Universitaria) — cada enunciado, cada
// opción y cada explicación se redactó desde cero, en ningún caso se copió
// ni una pregunta ni una opción de la guía. Escultura mexicana y Fotografía
// y cine no tienen SourceChunk → TEMARIO_ONLY.
//
// Verificación de atribuciones (obra-autor-movimiento): cada dato histórico
// (autoría de obras, fechas, hallazgos arqueológicos, premios) se contrastó
// contra el conocimiento general de historia del arte antes de escribirse;
// ver docs/ESTADO.md §G86 para el detalle de qué se verificó y con qué
// margen de certeza.
//
// Derechos de autor: se nombran obras, autores y movimientos y se describen
// sus características SIN reproducir el poema/canción/texto de ninguna obra
// literaria o musical — el único tema con analogía literaria (Fotografía y
// cine) no cita texto alguno, solo hechos históricos y de producción.

export const TOPIC_IDS = [
  'cmrr1kkcp0076hi3niiqepvuy', // 1. Artes visuales prehispánicas (SOURCED, 1 chunk)
  'cmrr1kkw60078hi3nej9jigbs', // 2. Pintura colonial y moderna (SOURCED, 3 chunks)
  'cmrr1klcr007ahi3n55ojo30e', // 3. Escultura mexicana (TEMARIO_ONLY)
  'cmrr1klzq007chi3nqwo1jj60', // 4. Arquitectura (SOURCED, 1 chunk)
  'cmrr1kmka007ehi3n7pd7lvqe', // 5. Fotografía y cine (TEMARIO_ONLY)
];

export const ITEMS = [
  // ══════════════════════ 1. Artes visuales prehispánicas ══════════════════════
  {
    topic: 1, difficulty: 'BASIC', chunks: [1],
    stem: 'Las gigantescas cabezas talladas en bloques de basalto, que representan el rostro de gobernantes con cascos protectores, son una de las manifestaciones escultóricas más conocidas de esta cultura, considerada la civilización "madre" de Mesoamérica:',
    correct: 'La cultura olmeca, asentada principalmente en las zonas de Veracruz y Tabasco.',
    distractors: [
      'La cultura zapoteca, asentada en el valle de Oaxaca alrededor de Monte Albán.',
      'La cultura totonaca, asentada en la región central y costera de Veracruz.',
      'La cultura teotihuacana, asentada en el altiplano central mexicano.',
    ],
    layer1: 'Las cabezas colosales olmecas, algunas de más de dos metros de altura y varias toneladas de peso, se tallaron en basalto trasladado desde canteras distantes y representan retratos individualizados de gobernantes, identificables por el tocado o casco que portan.',
    layer2: 'La cultura olmeca (aprox. 1200-400 a.C.) es considerada la civilización "madre" de Mesoamérica porque varios de sus rasgos —el juego de pelota, el culto a deidades felinas, el uso del jade— reaparecen después en culturas posteriores como la maya y la zapoteca.',
    layer3: 'La escultura zapoteca de Monte Albán se asocia más con relieves de piedra ("danzantes") que con cabezas colosales; la totonaca es célebre por sus figuras cerámicas de rostro sonriente; y la teotihuacana destaca sobre todo en pintura mural y arquitectura piramidal, no en cabezas monumentales talladas.',
  },
  {
    topic: 1, difficulty: 'INTERMEDIATE', chunks: [1],
    stem: 'La pintura mural teotihuacana, como la que decora conjuntos habitacionales del sitio, se caracteriza principalmente por:',
    correct: 'El uso de colores planos y contornos delineados en negro para representar deidades y escenas rituales, como el llamado "Tlalocan".',
    distractors: [
      'El empleo del esfumado y el claroscuro para dar volumen realista a las figuras humanas.',
      'La representación de escenas de batalla con perspectiva narrativa continua, como en Bonampak.',
      'El uso exclusivo de relieves tallados en piedra en lugar de pintura sobre estuco.',
    ],
    layer1: 'Los murales de Teotihuacan (como los del conjunto de Tepantitla) se pintaron al fresco sobre estuco, con figuras de perfil, colores planos —rojos, verdes y azules obtenidos de minerales— y contornos negros bien definidos; una de sus escenas más citadas se ha interpretado como una representación del paraíso de Tláloc.',
    layer2: 'Este estilo plano y simbólico, sin intención de crear volumen realista, es característico del arte mesoamericano en general y distingue a la pintura prehispánica de convenciones posteriores como el esfumado renacentista europeo.',
    layer3: 'El esfumado y el claroscuro son técnicas de la pintura europea posterior (por ejemplo, renacentista), no mesoamericana; la perspectiva narrativa continua con escenas de batalla es propia de los murales mayas de Bonampak, no de Teotihuacan; y aunque Teotihuacan también tiene relieves, su pintura mural sí es abundante y central en su arte.',
  },
  {
    topic: 1, difficulty: 'INTERMEDIATE', chunks: [1],
    stem: 'Las estelas mayas —monumentos de piedra verticales, tallados en relieve y erigidos frente a templos y plazas— servían principalmente para:',
    correct: 'Conmemorar a un gobernante en fechas específicas del calendario, registrando su nombre, linaje y hazañas mediante glifos jeroglíficos.',
    distractors: [
      'Marcar exclusivamente los límites territoriales entre distintas ciudades-estado mayas.',
      'Servir como instrumentos astronómicos para calcular directamente los eclipses solares.',
      'Funcionar como ofrendas funerarias colocadas siempre dentro de las tumbas reales.',
    ],
    layer1: 'Las estelas mayas combinan la imagen del gobernante —a menudo con atributos de poder y ricos atavíos— con textos jeroglíficos que registran fechas del calendario de cuenta larga y eventos como su entronización, victorias militares o rituales de sangre.',
    layer2: 'Son una de las principales fuentes para reconstruir la historia dinástica de las ciudades mayas, porque a diferencia de otras culturas mesoamericanas, los mayas desarrollaron un sistema de escritura jeroglífica capaz de registrar nombres propios y fechas exactas.',
    layer3: 'No son marcadores territoriales ni instrumentos astronómicos de cálculo directo (aunque sí registran fechas, no "calculan" eclipses por sí mismas), y tampoco se colocaban típicamente dentro de tumbas: se erigían en espacios públicos, a la vista de la comunidad.',
  },
  {
    topic: 1, difficulty: 'INTERMEDIATE', chunks: [1],
    stem: 'El sitio maya de Bonampak, en Chiapas, es célebre en la historia del arte prehispánico principalmente por:',
    correct: 'Conservar murales polícromos casi completos que representan escenas de guerra, sacrificio y una corte real, descubiertos en 1946.',
    distractors: [
      'Conservar el registro escultórico más completo de cabezas colosales de gobernantes mayas.',
      'Ser el primer sitio maya en el que se identificaron códices pintados sobre papel amate.',
      'Concentrar la mayor colección de máscaras funerarias de jade de toda el área maya.',
    ],
    layer1: 'Los murales de Bonampak, distribuidos en tres cuartos de un mismo edificio, muestran con gran detalle una secuencia narrativa: preparativos, una batalla, la presentación de prisioneros y una ceremonia con danzantes, pintada con pigmentos que conservaron su color de forma excepcional.',
    layer2: 'Su hallazgo en 1946 fue relevante porque, a diferencia de la imagen entonces dominante de los mayas como una civilización pacífica dedicada solo a la astronomía, los murales documentaron con crudeza la guerra y el sacrificio como parte central de la vida política maya.',
    layer3: 'Las cabezas colosales son un rasgo olmeca, no maya; los códices sobre papel amate mayas que sobreviven (como el Dresde) no provienen de Bonampak; y aunque la máscara de Pakal en Palenque es célebre, Bonampak no se distingue por máscaras funerarias sino por su pintura mural.',
  },
  {
    topic: 1, difficulty: 'ADVANCED', chunks: [1],
    stem: 'Los relieves de piedra conocidos como "los danzantes", tallados en las paredes de un edificio de Monte Albán, muestran figuras humanas en posturas contorsionadas que hoy se interpretan principalmente como:',
    correct: 'Cautivos o enemigos derrotados, posiblemente sacrificados, y no bailarines en sentido literal.',
    distractors: [
      'Sacerdotes en trance ritual realizando una danza ceremonial para propiciar la lluvia.',
      'Gobernantes zapotecos retratados en el momento exacto de su entronización oficial.',
      'Comerciantes representados durante el intercambio de productos en el mercado de la ciudad.',
    ],
    layer1: 'Aunque el nombre "danzantes" proviene de la impresión inicial de los arqueólogos que los descubrieron, las posturas —cuerpos desnudos, ojos cerrados, algunas figuras con genitales mutilados— llevaron a reinterpretarlos como representaciones de prisioneros de guerra o víctimas de sacrificio, posiblemente vinculadas a la expansión militar zapoteca.',
    layer2: 'Monte Albán, capital zapoteca en el valle de Oaxaca activa desde aproximadamente el 500 a.C., usó este tipo de relieves como un mensaje público de poder político y militar hacia otras ciudades-estado rivales.',
    layer3: 'La lectura como danza ritual de lluvia es la interpretación antigua ya superada por la investigación posterior; no representan una entronización (que tendría atavíos de poder, no cuerpos desnudos y sometidos); y no hay evidencia de que representen una escena de mercado.',
  },
  {
    topic: 1, difficulty: 'BASIC', chunks: [1],
    stem: 'Las llamadas "caritas sonrientes", figurillas de cerámica con el rostro en expresión de alegría, son una de las manifestaciones más distintivas de esta cultura del centro de Veracruz, asociada también al sitio arqueológico de El Tajín:',
    correct: 'La cultura totonaca.',
    distractors: [
      'La cultura mixteca, asentada principalmente en la Mixteca de Oaxaca y Puebla.',
      'La cultura maya, asentada en el sureste mexicano y Centroamérica.',
      'La cultura olmeca, asentada en la costa del golfo de México.',
    ],
    layer1: 'Las "caritas sonrientes" son figurillas de barro, generalmente huecas, producidas en el centro de Veracruz durante el llamado Clásico Tardío; su expresión facial de sonrisa abierta las distingue de la mayoría de la figurilla mesoamericana, que suele mostrar rostros serios o hieráticos.',
    layer2: 'Se asocian a la cultura totonaca y a la región donde se ubica El Tajín, ciudad famosa por su Pirámide de los Nichos y por los relieves del juego de pelota que narran escenas de sacrificio ritual.',
    layer3: 'La mixteca es célebre sobre todo por su orfebrería y sus códices pictográficos; la maya por sus estelas y pintura mural narrativa; y la olmeca por sus cabezas colosales y figurillas de rasgos "baby-face", no por rostros sonrientes.',
  },
  {
    topic: 1, difficulty: 'INTERMEDIATE', chunks: [1],
    stem: 'El hallazgo arqueológico conocido como "Tumba 7" de Monte Albán, descubierto por Alfonso Caso en 1932, es especialmente relevante para la historia del arte prehispánico porque:',
    correct: 'Reveló un excepcional ajuar de orfebrería en oro, plata y piedras finas elaborado por artesanos mixtecos, quienes reutilizaron una tumba zapoteca anterior.',
    distractors: [
      'Contenía el primer ejemplo conocido de escritura jeroglífica maya sobre estuco.',
      'Confirmó el uso exclusivo de la técnica del mosaico de turquesa entre los zapotecos.',
      'Fue la primera evidencia arqueológica de pintura mural en el área maya.',
    ],
    layer1: 'Alfonso Caso encontró en la Tumba 7 de Monte Albán un conjunto de piezas de orfebrería —pectorales, anillos, una máscara de oro— de manufactura mixteca extraordinariamente fina, colocadas ahí cuando el pueblo mixteco reutilizó, siglos después, una tumba zapoteca construida originalmente para otro fin.',
    layer2: 'El hallazgo es clave porque demuestra el altísimo nivel técnico de la orfebrería mixteca (fundición a la cera perdida, filigrana) y porque documenta cómo distintos pueblos mesoamericanos reocuparon y resignificaron espacios sagrados de culturas anteriores.',
    layer3: 'No se trata de escritura jeroglífica maya ni de pintura mural del área maya —ambas ajenas a este hallazgo oaxaqueño—, y aunque el mosaico de turquesa sí existió en Mesoamérica (por ejemplo entre los mixtecos), la Tumba 7 se conoce sobre todo por su orfebrería, no por un uso exclusivo zapoteca de esa técnica.',
  },
  {
    topic: 1, difficulty: 'BASIC', chunks: [1],
    stem: 'En la historia del arte novohispano, el concepto que designa la fusión de elementos visuales y simbólicos de las culturas prehispánicas con las formas artísticas traídas de Europa durante el Virreinato se conoce como:',
    correct: 'Sincretismo.',
    distractors: [
      'Anacronismo, término que designa un error al ubicar algo fuera de su época.',
      'Sincronicidad, término asociado a la coincidencia significativa de eventos, no al arte.',
      'Fusión estilística tardía, expresión sin uso establecido en la historiografía del arte novohispano.',
    ],
    layer1: 'El sincretismo describe cómo artesanos y artistas indígenas, trabajando bajo la dirección de frailes y maestros europeos, incorporaron motivos, técnicas y significados propios de su tradición visual prehispánica dentro de los formatos religiosos católicos que se les encargaban, dando lugar a un arte novohispano con rasgos únicos.',
    layer2: 'Ejemplos citados con frecuencia son los atrios de conventos del siglo XVI decorados con motivos vegetales de raíz indígena, o el llamado "arte tequitqui", en el que canteros indígenas tallaban relieves religiosos cristianos con una sensibilidad visual heredada de la escultura prehispánica.',
    layer3: 'El anacronismo es un error de ubicación temporal, no un fenómeno artístico de fusión cultural; la sincronicidad es un concepto de otro campo, sin relación con la historia del arte; y "fusión estilística tardía" no es un término reconocido para este fenómeno específico.',
  },

  // ══════════════════════ 2. Pintura colonial y moderna ══════════════════════
  {
    topic: 2, difficulty: 'BASIC', chunks: [1],
    stem: 'El óleo titulado "Madre campesina" (1926), que retrata a una mujer indígena amamantando a su hijo con volúmenes depurados y una composición serena, es obra de:',
    correct: 'Diego Rivera.',
    distractors: [
      'David Alfaro Siqueiros.',
      'José Clemente Orozco.',
      'Carlos Mérida.',
    ],
    layer1: '"Madre campesina" pertenece a un periodo de la obra de Diego Rivera posterior a su etapa cubista en París, marcado por un "retorno al orden" de formas clásicas y volúmenes sólidos, poco antes de dedicarse de lleno al muralismo monumental.',
    layer2: 'Rivera es, junto con Siqueiros y Orozco, uno de "los tres grandes" del muralismo mexicano, movimiento impulsado tras la Revolución para llevar un arte público de contenido social e histórico a espacios institucionales.',
    layer3: 'Siqueiros y Orozco comparten con Rivera el proyecto muralista pero tienen estilos personales distintos —Siqueiros más dinámico y experimental con materiales industriales, Orozco más expresionista y trágico—; Carlos Mérida desarrolló un lenguaje más cercano a la abstracción geométrica de raíz maya, ajeno a esta obra.',
  },
  {
    topic: 2, difficulty: 'INTERMEDIATE', chunks: [1],
    stem: 'La técnica pictórica conocida como "esfumado", que consiste en difuminar los contornos y las transiciones de luz y sombra para lograr un efecto de suavidad casi sin líneas duras, se asocia de manera emblemática con esta pintura renacentista:',
    correct: 'La Gioconda (o Mona Lisa), de Leonardo da Vinci.',
    distractors: [
      'La Escuela de Atenas, de Rafael.',
      'El nacimiento de Venus, de Sandro Botticelli.',
      'La creación de Adán, de Miguel Ángel.',
    ],
    layer1: 'Leonardo da Vinci perfeccionó el esfumado (del italiano "sfumato", "como el humo") aplicando capas muy delgadas de pintura al óleo para que los bordes de las formas —como el contorno de la boca o los ojos de La Gioconda— se disuelvan gradualmente en la sombra, sin una línea que los delimite.',
    layer2: 'Esta técnica fue una de las grandes innovaciones del Renacimiento italiano para lograr una sensación de volumen y atmósfera más natural que la de la pintura medieval anterior, de contornos más definidos y planos.',
    layer3: 'La Escuela de Atenas de Rafael es célebre más bien por su dominio de la perspectiva arquitectónica y la composición de figuras; El nacimiento de Venus de Botticelli antecede al esfumado maduro y usa contornos lineales más definidos; y La creación de Adán de Miguel Ángel es un fresco que destaca por el dibujo anatómico, no por el esfumado.',
  },
  {
    topic: 2, difficulty: 'BASIC', chunks: [2],
    stem: 'En la teoría tradicional del color aplicada a la pintura (mezcla de pigmentos), los colores que no pueden obtenerse mezclando ningún otro color, y a partir de los cuales se derivan todos los demás, se llaman:',
    correct: 'Colores primarios.',
    distractors: [
      'Colores complementarios.',
      'Colores neutros.',
      'Colores análogos.',
    ],
    layer1: 'En el modelo pigmentario tradicional (rojo, amarillo y azul), los colores primarios son la base a partir de la cual se construyen los colores secundarios y terciarios mediante mezclas; ningún primario puede producirse combinando otros colores del círculo cromático.',
    layer2: 'Comprender esta jerarquía es una base elemental de la apreciación pictórica, porque permite reconocer cómo un artista construye armonías o contrastes de color a partir de un número reducido de pigmentos base.',
    layer3: 'Los complementarios son pares de colores opuestos en el círculo cromático (como rojo y verde) que se intensifican visualmente entre sí; los neutros son el blanco, el negro y los grises; y los análogos son colores vecinos en el círculo cromático — ninguno de los tres describe a los colores "base" de la mezcla.',
  },
  {
    topic: 2, difficulty: 'INTERMEDIATE', chunks: [2],
    stem: 'Al mezclar dos colores primarios en partes iguales dentro del modelo pigmentario tradicional (rojo, amarillo, azul), se obtiene un color secundario. ¿Cuál de las siguientes combinaciones corresponde correctamente a los tres colores secundarios?',
    correct: 'Naranja (rojo + amarillo), verde (amarillo + azul) y violeta (azul + rojo).',
    distractors: [
      'Café (rojo + azul), rosado (rojo + blanco) y gris (blanco + negro).',
      'Turquesa (azul + verde), magenta (rojo + violeta) y ocre (amarillo + café).',
      'Blanco (mezcla de los tres primarios) y sus dos variantes de tono más claro y más oscuro.',
    ],
    layer1: 'Naranja, verde y violeta son los tres colores secundarios del modelo pigmentario tradicional, cada uno resultado de mezclar dos primarios adyacentes en el círculo cromático.',
    layer2: 'Esta relación es la base para construir el círculo cromático completo (con los terciarios, mezcla de un primario y un secundario vecino) y para explicar por qué ciertos colores "combinan" o "contrastan" visualmente entre sí en una composición pictórica.',
    layer3: 'El café, el rosado y el gris no son secundarios en sentido estricto: son mezclas que involucran blanco, negro u otros colores además de dos primarios puros; el turquesa, el magenta y el ocre corresponden más bien a matices o colores terciarios; y mezclar los primarios en pigmento no produce blanco, sino un tono oscuro cercano al café o al gris.',
  },
  {
    topic: 2, difficulty: 'BASIC', chunks: [2],
    stem: 'En el dibujo y la pintura, la técnica llamada "perspectiva" tiene como propósito principal:',
    correct: 'Representar sobre una superficie plana la sensación de profundidad y volumen con que el ojo humano percibe el espacio tridimensional.',
    distractors: [
      'Registrar las medidas exactas y a escala real de los objetos representados.',
      'Sustituir el uso del color por el manejo exclusivo de líneas y contornos.',
      'Eliminar cualquier punto de fuga para lograr una composición completamente simétrica.',
    ],
    layer1: 'La perspectiva usa convenciones visuales —como líneas que convergen en uno o varios puntos de fuga, o la reducción del tamaño de los objetos conforme se alejan— para simular en una imagen bidimensional la profundidad que percibimos en el mundo real.',
    layer2: 'Su sistematización más influyente ocurrió durante el Renacimiento italiano (por ejemplo, en los estudios de Filippo Brunelleschi y Leon Battista Alberti), y desde entonces es una herramienta central de la apreciación y el análisis de la pintura occidental.',
    layer3: 'La perspectiva no busca medidas exactas a escala real, sino una ilusión convincente de profundidad; no implica renunciar al color; y lejos de eliminar los puntos de fuga, suele depender precisamente de ellos para construir esa ilusión.',
  },
  {
    topic: 2, difficulty: 'BASIC', chunks: [2],
    stem: 'Este grabador mexicano de finales del siglo XIX y principios del XX es reconocido por sus calaveras satíricas, entre ellas la imagen que con el tiempo se popularizaría bajo el nombre de "La Catrina":',
    correct: 'José Guadalupe Posada.',
    distractors: [
      'Leopoldo Méndez.',
      'Manuel Manilla.',
      'Gerardo Murillo, conocido como "Dr. Atl".',
    ],
    layer1: 'José Guadalupe Posada trabajó como grabador para publicaciones populares e ilustró hojas volantes con calaveras que satirizaban a distintos sectores de la sociedad porfiriana, usando el esqueleto como recurso para igualar simbólicamente a todas las clases sociales ante la muerte.',
    layer2: 'La calavera que Posada llamó "la calavera garbancera" —burlándose de quienes renegaban de su origen indígena imitando modas europeas— fue rebautizada años después como "La Catrina" y popularizada por Diego Rivera al incluirla en su mural "Sueño de una tarde dominical en la Alameda Central".',
    layer3: 'Leopoldo Méndez fue un grabador posterior, activo sobre todo en el Taller de Gráfica Popular del siglo XX; Manuel Manilla fue grabador contemporáneo de Posada pero no es a quien se atribuye esta calavera en particular; y "Dr. Atl" fue pintor y promotor cultural, no grabador de calaveras satíricas.',
  },
  {
    topic: 2, difficulty: 'INTERMEDIATE', chunks: [3],
    stem: 'El estilo artístico derivado del Renacimiento, caracterizado por la ornamentación abundante y el manejo dramático de luces y sombras, que en la Nueva España alcanzó una versión particularmente recargada conocida como "churrigueresco", se llama:',
    correct: 'Barroco.',
    distractors: [
      'Plateresco, estilo previo de transición entre el gótico tardío y el Renacimiento.',
      'Neoclásico, estilo posterior caracterizado por la sobriedad y la imitación de lo grecolatino.',
      'Mudéjar, estilo que combina elementos góticos con la tradición decorativa islámica.',
    ],
    layer1: 'El Barroco surgió en Europa a finales del siglo XVI y se caracteriza por el dinamismo compositivo, el contraste intenso de luces y sombras y una ornamentación abundante; en la Nueva España se enriqueció con motivos vegetales y decorativos de raíz indígena, dando lugar a variantes como el churrigueresco, de ornamentación aún más densa.',
    layer2: 'Ejemplos de esta corriente en México son el Altar de los Reyes de la Catedral Metropolitana o el Sagrario Metropolitano, con fachadas cubiertas casi por completo de relieves ornamentales.',
    layer3: 'El plateresco es anterior y combina rasgos góticos con los primeros elementos renacentistas; el neoclásico es la reacción posterior contra el exceso ornamental barroco, buscando líneas sobrias inspiradas en Grecia y Roma; y el mudéjar es un estilo español anterior que combina tradición gótica con decoración de raíz islámica, sin relación directa con el churrigueresco novohispano.',
  },
  {
    topic: 2, difficulty: 'ADVANCED', chunks: [3],
    stem: 'El conjunto arquitectónico de Ciudad Universitaria (UNAM), proyectado bajo los principios del funcionalismo y con un plan de conjunto a cargo de los arquitectos Mario Pani y Enrique del Moral, integra murales de artistas como Diego Rivera, Juan O\'Gorman y David Alfaro Siqueiros en sus fachadas. A este principio de unir arquitectura y mural en una sola obra se le conoce como:',
    correct: 'Integración plástica.',
    distractors: [
      'Sincretismo arquitectónico, término sin uso establecido para describir este fenómeno del siglo XX.',
      'Neoclasicismo mural, corriente que en realidad corresponde al siglo XIX mexicano.',
      'Muralismo funcional, expresión que invierte el orden real del concepto reconocido.',
    ],
    layer1: 'La "integración plástica" es el principio, impulsado especialmente por Diego Rivera, de concebir el edificio y su decoración mural como una sola obra desde el proyecto arquitectónico, en lugar de añadir la pintura después como un elemento decorativo separado.',
    layer2: 'Ciudad Universitaria, construida a mediados del siglo XX y declarada Patrimonio de la Humanidad por la UNESCO en 2007, es uno de los ejemplos más citados de este principio: el mosaico de piedras naturales de Juan O\'Gorman en la Biblioteca Central es parte estructural de la fachada, no un añadido posterior.',
    layer3: '"Sincretismo arquitectónico" no es el término establecido para este fenómeno (el sincretismo se usa más bien para la fusión prehispánico-europea del arte virreinal); el neoclasicismo mural mexicano corresponde a otro siglo y contexto; y "muralismo funcional" invierte la relación real entre ambos conceptos.',
  },

  // ══════════════════════ 3. Escultura mexicana (TEMARIO_ONLY) ══════════════════════
  {
    topic: 3, difficulty: 'BASIC', chunks: [],
    stem: 'Esta escultura monumental mexica, tallada en piedra volcánica y que representa a una deidad con falda de serpientes entrelazadas y un collar de manos y corazones, fue hallada en 1790 durante obras de repavimentación en la Plaza Mayor de la Ciudad de México:',
    correct: 'Coatlicue.',
    distractors: [
      'La Piedra del Sol o Calendario Azteca.',
      'La Piedra de Tízoc.',
      'El Chac Mool del Templo Mayor.',
    ],
    layer1: 'Coatlicue ("la de la falda de serpientes") es una escultura monolítica que combina símbolos de muerte y fertilidad —cráneos, manos, corazones, serpientes— para representar a una deidad terrestre mexica asociada al nacimiento y la muerte.',
    layer2: 'Fue descubierta el mismo año, 1790, en que también apareció la Piedra del Sol, ambas durante trabajos de nivelación del Zócalo capitalino ordenados por el virrey Revillagigedo; hoy se exhibe en el Museo Nacional de Antropología.',
    layer3: 'La Piedra del Sol es un disco calendárico, no una figura antropomorfa de pie; la Piedra de Tízoc es un monumento cilíndrico dedicado a conquistas militares de ese gobernante mexica; y el Chac Mool es una figura reclinada con un recipiente sobre el vientre, de tipo distinto al de Coatlicue.',
  },
  {
    topic: 3, difficulty: 'BASIC', chunks: [],
    stem: 'El gran disco de piedra basáltica, tallado con el rostro del sol al centro y símbolos calendáricos alrededor, hallado también en 1790 en la Plaza Mayor de la Ciudad de México, se conoce popularmente como:',
    correct: 'Piedra del Sol o Calendario Azteca.',
    distractors: [
      'Coatlicue.',
      'La Piedra de los Sacrificios.',
      'El Teocalli de la Guerra Sagrada.',
    ],
    layer1: 'La Piedra del Sol es un monumento circular de varias toneladas cuyo relieve central se interpreta como el rostro del sol o de la deidad Tonatiuh, rodeado de glifos que registran los cinco "soles" o eras cosmogónicas mexicas y otros elementos calendáricos.',
    layer2: 'A pesar de su nombre popular, los especialistas discuten si funcionó como calendario de uso práctico o más bien como un monumento cosmogónico y ritual de carácter simbólico; en cualquier caso es hoy una de las piezas más reconocidas del Museo Nacional de Antropología.',
    layer3: 'Coatlicue es una escultura antropomorfa vertical, no un disco calendárico; "la Piedra de los Sacrificios" no es el nombre reconocido de este monumento; y el Teocalli de la Guerra Sagrada es una escultura distinta, en forma de templo miniatura, asociada al gobernante Moctezuma II.',
  },
  {
    topic: 3, difficulty: 'ADVANCED', chunks: [],
    stem: 'En la escultura religiosa novohispana en madera policromada, la técnica que consiste en aplicar una capa de oro bajo la pintura y luego raspar el color siguiendo un patrón para que el oro asome, imitando el brocado de una tela rica, se llama:',
    correct: 'Estofado.',
    distractors: [
      'Encarnación, técnica dedicada específicamente a pintar las zonas de piel de la figura.',
      'Fundición a la cera perdida, técnica propia de la escultura en metal, no en madera.',
      'Talla directa, técnica que se refiere solo al tallado de la madera sin ningún acabado posterior.',
    ],
    layer1: 'El estofado permitía simular telas bordadas en oro sobre las vestimentas de santos y vírgenes tallados en madera: primero se doraba la superficie, después se cubría con pintura de color, y finalmente se raspaba siguiendo un dibujo para que el brillo del oro emergiera en el patrón deseado.',
    layer2: 'Esta técnica, junto con la encarnación —el pulido y pintura minuciosa de rostros y manos para imitar el tono de la piel—, era típica del taller de imaginería novohispana, donde distintos artesanos especializados intervenían en una misma escultura religiosa.',
    layer3: 'La encarnación es precisamente la técnica dedicada a la piel, no a las telas, por lo que no describe lo planteado; la fundición a la cera perdida es una técnica metalúrgica ajena a la madera; y la talla directa se refiere solo al proceso de esculpir la forma, sin el acabado decorativo descrito.',
  },
  {
    topic: 3, difficulty: 'INTERMEDIATE', chunks: [],
    stem: 'La escultura ecuestre en bronce conocida popularmente como "El Caballito", que representa al rey Carlos IV de España y hoy se exhibe en una plaza cercana al Palacio de Minería en la Ciudad de México, es obra de:',
    correct: 'Manuel Tolsá.',
    distractors: [
      'Francisco Eduardo Tresguerras.',
      'Antonio González Velázquez.',
      'Jerónimo de Balbás.',
    ],
    layer1: 'Manuel Tolsá, escultor y arquitecto valenciano activo en Nueva España, fundió esta estatua ecuestre en bronce a principios del siglo XIX; es considerada una de las obras cumbre de la escultura neoclásica novohispana por el dominio técnico que exigió su fundición en una sola pieza.',
    layer2: 'Tolsá también proyectó el Palacio de Minería y trabajó en la culminación neoclásica de las torres y la cúpula de la Catedral Metropolitana, por lo que es una figura central para entender el tránsito del barroco al neoclasicismo en el arte novohispano tardío.',
    layer3: 'Tresguerras fue un arquitecto y artista guanajuatense de la misma época pero no el autor de esta escultura; González Velázquez fue pintor, no escultor de esta obra; y Jerónimo de Balbás es más bien recordado como autor de retablos barrocos (como el Altar de los Reyes), un estilo y una técnica distintos a los de esta estatua neoclásica.',
  },
  {
    topic: 3, difficulty: 'INTERMEDIATE', chunks: [],
    stem: 'Este escultor y pintor jalisciense (1920-2006), asociado a la llamada generación de "la Ruptura" que se distanció del muralismo, es reconocido por sus voluminosas esculturas en bronce de aves y figuras estilizadas exhibidas en espacios públicos:',
    correct: 'Juan Soriano.',
    distractors: [
      'Mathias Goeritz.',
      'Francisco Zúñiga.',
      'Rufino Tamayo.',
    ],
    layer1: 'Juan Soriano desarrolló, sobre todo en la segunda mitad de su carrera, una obra escultórica de formas redondeadas y simplificadas —palomas, gatos y figuras humanas estilizadas— fundida en bronce a gran escala para plazas y jardines públicos.',
    layer2: 'Su trabajo se asocia a la generación de artistas que, desde mediados del siglo XX, buscó alejarse del contenido histórico y social del muralismo para explorar un lenguaje más personal, cercano en ocasiones a la abstracción y al humor visual.',
    layer3: 'Mathias Goeritz es reconocido más bien por la escultura monumental abstracta y su cercanía con la arquitectura (como las Torres de Satélite); Francisco Zúñiga se especializó en figuras femeninas indígenas de gran volumen, de estilo distinto al de Soriano; y Rufino Tamayo es conocido principalmente como pintor, no como escultor.',
  },
  {
    topic: 3, difficulty: 'INTERMEDIATE', chunks: [],
    stem: 'Las "Torres de Satélite", un conjunto de prismas triangulares de concreto pintados de colores que marcan la entrada a Ciudad Satélite, en el Estado de México, se realizaron en colaboración entre el arquitecto Luis Barragán y este escultor de origen alemán naturalizado mexicano:',
    correct: 'Mathias Goeritz.',
    distractors: [
      'Juan Soriano.',
      'Francisco Zúñiga.',
      'Sebastián (Enrique Carbajal).',
    ],
    layer1: 'Las Torres de Satélite (1957-1958) son cinco prismas de concreto de distintas alturas, sin función utilitaria más allá de señalar y embellecer el acceso a un desarrollo urbano; se consideran un ejemplo temprano de lo que Goeritz llamó "arquitectura emocional", pensada para provocar una experiencia estética y no solo práctica.',
    layer2: 'Mathias Goeritz, llegado a México en 1949, impulsó una escultura monumental y abstracta pensada en diálogo directo con el espacio urbano y arquitectónico, en contraste con la escultura figurativa de raíz indígena o histórica más común hasta entonces.',
    layer3: 'Ni Soriano ni Zúñiga participaron en este proyecto en particular, aunque ambos son escultores mexicanos relevantes del siglo XX; y Sebastián (Enrique Carbajal), conocido por esculturas geométricas monumentales como "La Puerta de México", pertenece a una generación posterior y tampoco intervino en esta obra.',
  },
  {
    topic: 3, difficulty: 'INTERMEDIATE', chunks: [],
    stem: 'Este escultor de origen costarricense, naturalizado mexicano, es reconocido por sus figuras monumentales de mujeres indígenas y mestizas, talladas o modeladas con volúmenes amplios y una presencia serena y monumental:',
    correct: 'Francisco Zúñiga.',
    distractors: [
      'Mathias Goeritz.',
      'Juan Soriano.',
      'Manuel Tolsá.',
    ],
    layer1: 'Francisco Zúñiga desarrolló, desde mediados del siglo XX, un estilo escultórico figurativo centrado en la representación de mujeres del campo y de comunidades indígenas mexicanas, con cuerpos de volúmenes amplios y actitudes de reposo o introspección.',
    layer2: 'A diferencia de la escultura abstracta y monumental que impulsó Mathias Goeritz en la misma época, la obra de Zúñiga se mantuvo dentro de una tradición figurativa, heredera en parte de la atención al tipo humano popular que ya estaba presente en el muralismo.',
    layer3: 'Goeritz es más bien representante de la escultura abstracta y monumental urbana; Soriano trabajó formas simplificadas de animales y figuras estilizadas, de espíritu distinto al realismo de Zúñiga; y Tolsá pertenece a un periodo anterior, el de la escultura neoclásica novohispana.',
  },
  {
    topic: 3, difficulty: 'BASIC', chunks: [],
    stem: 'En la escultura, la técnica llamada "talla" consiste en ir retirando material —de un bloque de piedra o madera— hasta lograr la forma deseada. Esto la distingue de otro procedimiento escultórico básico, el "modelado", que en cambio consiste en:',
    correct: 'Ir agregando y dando forma a un material blando y maleable, como el barro o la cera, hasta construir la figura.',
    distractors: [
      'Verter un material fundido, como el bronce, dentro de un molde previamente preparado.',
      'Ensamblar piezas ya elaboradas de distintos materiales para formar una sola obra tridimensional.',
      'Grabar líneas y texturas sobre una superficie plana, sin generar verdadero volumen.',
    ],
    layer1: 'El modelado es un procedimiento "aditivo": el escultor agrega y manipula un material blando —barro, cera, plastilina— construyendo la forma poco a poco, al contrario de la talla, que es "sustractiva" porque retira material de un bloque más grande.',
    layer2: 'Estos dos procedimientos, junto con la fundición (verter metal líquido en un molde) y el ensamblaje (unir piezas ya hechas), son las cuatro técnicas básicas que suele distinguir la apreciación escultórica para clasificar cómo se construyó una obra tridimensional.',
    layer3: 'Verter un material fundido en un molde describe la fundición, no el modelado; ensamblar piezas ya elaboradas describe el ensamblaje; y grabar líneas sobre una superficie plana no genera una obra tridimensional, por lo que corresponde más bien al grabado, una técnica de artes gráficas.',
  },

  // ══════════════════════ 4. Arquitectura ══════════════════════
  {
    topic: 4, difficulty: 'BASIC', chunks: [1],
    stem: 'Este arquitecto mexicano, célebre por su uso expresivo del color, la luz, el agua y los muros macizos en obras como la Casa Luis Barragán o la Cuadra San Cristóbal, fue en 1980 el primer y hasta ahora único mexicano en recibir el Premio Pritzker de Arquitectura:',
    correct: 'Luis Barragán.',
    distractors: [
      'Mario Pani.',
      'Juan O\'Gorman.',
      'Enrique del Moral.',
    ],
    layer1: 'Luis Barragán desarrolló, a partir de los años cuarenta, una arquitectura que combina la tradición constructiva mexicana —muros gruesos, patios, fuentes— con una sensibilidad muy personal por el color saturado, la luz filtrada y los planos de agua en reposo.',
    layer2: 'El Premio Pritzker, considerado el reconocimiento más importante de la disciplina a nivel mundial, distinguió en 1980 a Barragán por una obra que, aunque de escala mayoritariamente doméstica, tuvo una influencia internacional muy amplia en la arquitectura posterior.',
    layer3: 'Mario Pani y Enrique del Moral son conocidos sobre todo por el urbanismo y la arquitectura funcionalista de gran escala, como el plan maestro de Ciudad Universitaria, un lenguaje distinto al de Barragán; y Juan O\'Gorman es conocido tanto por la arquitectura funcionalista temprana como por el muralismo en mosaico, tampoco el autor de estas obras.',
  },
  {
    topic: 4, difficulty: 'BASIC', chunks: [1],
    stem: 'Esta ciudad amurallada maya, construida sobre un acantilado frente al mar Caribe en el actual estado de Quintana Roo, funcionó como un importante centro comercial costero durante el Posclásico:',
    correct: 'Tulum.',
    distractors: [
      'Palenque.',
      'Chichén Itzá.',
      'Uxmal.',
    ],
    layer1: 'Tulum se distingue de otras ciudades mayas por su ubicación sobre un acantilado costero y por estar rodeada de una muralla defensiva en tres de sus lados; su edificio principal, conocido como "El Castillo", pudo haber funcionado también como faro para orientar a las embarcaciones.',
    layer2: 'Su actividad como puerto y centro de intercambio —de productos como sal, obsidiana, cacao y textiles— fue especialmente intensa durante el Posclásico tardío, cuando otras grandes ciudades mayas del periodo Clásico, como Palenque, ya habían sido abandonadas.',
    layer3: 'Palenque se ubica tierra adentro, en Chiapas, y no tiene esta condición costera; Chichén Itzá, en el interior de Yucatán, es célebre por la pirámide de Kukulcán y su observatorio, no por ser un puerto amurallado; y Uxmal, también yucateca e interior, destaca por el estilo arquitectónico Puuc, distinto del contexto costero de Tulum.',
  },
  {
    topic: 4, difficulty: 'INTERMEDIATE', chunks: [1],
    stem: 'En esta ciudad maya de Chiapas, el arqueólogo Alberto Ruz Lhuillier descubrió en 1952, dentro del Templo de las Inscripciones, la tumba del gobernante Pakal, cubierta por una lápida con un relieve hoy célebre en la iconografía maya:',
    correct: 'Palenque.',
    distractors: [
      'Tulum.',
      'Monte Albán.',
      'Teotihuacan.',
    ],
    layer1: 'El hallazgo de la cámara funeraria de K\'inich Janaab\' Pakal bajo el Templo de las Inscripciones fue clave para confirmar que las pirámides mayas, además de basamentos de templos, también podían funcionar como monumentos funerarios para sus gobernantes, algo que hasta entonces se dudaba.',
    layer2: 'Palenque es además reconocida por la finura de sus relieves en estuco y por edificios como el Palacio, con su torre de varios niveles, considerados entre los logros arquitectónicos más refinados del periodo Clásico maya.',
    layer3: 'Tulum es una ciudad costera posclásica sin este hallazgo funerario; Monte Albán es un sitio zapoteca en Oaxaca, no maya; y Teotihuacan, en el altiplano central, corresponde a una cultura y una cronología distintas a la maya de Palenque.',
  },
  {
    topic: 4, difficulty: 'BASIC', chunks: [1],
    stem: 'La "Calzada de los Muertos", eje principal que atraviesa el sitio arqueológico de Teotihuacan y conecta sus dos pirámides más monumentales —la del Sol y la de la Luna—, es un ejemplo del urbanismo planificado de esta ciudad:',
    correct: 'Teotihuacan.',
    distractors: [
      'Tenochtitlan.',
      'Tula.',
      'Monte Albán.',
    ],
    layer1: 'Teotihuacan, una de las ciudades más grandes de la Mesoamérica antigua, se organizó a partir de un trazo urbano relativamente regular, con la Calzada de los Muertos como columna vertebral que articula sus principales conjuntos religiosos y habitacionales.',
    layer2: 'La Pirámide del Sol es una de las estructuras prehispánicas más grandes por volumen en Mesoamérica, y junto con la Pirámide de la Luna define visualmente el perfil monumental del sitio, cuya influencia cultural y comercial se extendió por buena parte de Mesoamérica durante el Clásico.',
    layer3: 'Tenochtitlan, la capital mexica, se organizó en torno a un recinto ceremonial distinto y sobre una isla lacustre, con un trazo diferente; Tula, capital tolteca, es célebre por sus atlantes, no por esta calzada; y Monte Albán, capital zapoteca, se asienta sobre una montaña nivelada artificialmente, con una configuración urbana distinta.',
  },
  {
    topic: 4, difficulty: 'INTERMEDIATE', chunks: [1],
    stem: 'La Catedral Metropolitana de la Ciudad de México, construida a lo largo de más de dos siglos, combina en un mismo edificio elementos de distintos estilos arquitectónicos sucesivos —desde rasgos barrocos hasta el remate neoclásico de sus torres y cúpula—. Este tipo de edificio, que refleja los cambios de gusto ocurridos durante su larga construcción, se describe como:',
    correct: 'Un edificio de estilo arquitectónico mixto o eclético, resultado de una obra prolongada en el tiempo.',
    distractors: [
      'Un edificio puramente plateresco, sin ninguna intervención posterior a su diseño original.',
      'Un edificio exclusivamente churrigueresco en la totalidad de su fachada y su estructura.',
      'Un edificio estrictamente funcionalista, proyectado en una sola etapa del siglo XX.',
    ],
    layer1: 'La construcción de la Catedral Metropolitana se extendió aproximadamente de 1573 a 1813, un periodo lo bastante largo para que distintas generaciones de arquitectos —entre ellos, hacia el final, Manuel Tolsá— intervinieran con el lenguaje arquitectónico dominante de su propia época.',
    layer2: 'Por eso conviven en el mismo edificio portadas de gusto más barroco, incluso con detalles churriguerescos en su interior (como el Altar de los Reyes, obra de Jerónimo de Balbás), junto con las torres y la cúpula de remate neoclásico diseñadas por Tolsá a principios del siglo XIX.',
    layer3: 'No es un edificio "puramente" plateresco ni "exclusivamente" churrigueresco, porque ambos son solo algunos de los estilos presentes, no la totalidad del edificio; y tampoco es funcionalista, un movimiento del siglo XX muy posterior a su construcción.',
  },
  {
    topic: 4, difficulty: 'BASIC', chunks: [1],
    stem: 'Esta pintura de gran formato, realizada en tonos de blanco, negro y gris, representa el sufrimiento causado por el bombardeo de una localidad vasca durante la Guerra Civil española de 1937, y es obra de:',
    correct: 'Pablo Picasso.',
    distractors: [
      'Salvador Dalí.',
      'Diego Rivera.',
      'Marc Chagall.',
    ],
    layer1: '"Guernica" responde al bombardeo de la localidad de Guernica por la aviación alemana e italiana en apoyo al bando franquista, en abril de 1937; Picasso, usando un lenguaje cercano al cubismo pero con una paleta reducida a blancos, negros y grises, transformó el hecho en una denuncia visual del horror de la guerra.',
    layer2: 'La obra se exhibió primero en el pabellón español de la Exposición Internacional de París de 1937 y hoy se conserva en el Museo Reina Sofía de Madrid; es una de las imágenes más reproducidas del arte del siglo XX como símbolo antibélico.',
    layer3: 'Salvador Dalí, aunque también español y activo en la misma época, desarrolló un lenguaje surrealista distinto y no es el autor de esta obra; Diego Rivera fue el gran muralista mexicano, ajeno a este episodio europeo; y Marc Chagall desarrolló una obra de raíz onírica y folclórica muy distinta a la denuncia directa de "Guernica".',
  },
  {
    topic: 4, difficulty: 'INTERMEDIATE', chunks: [1],
    stem: 'La Biblioteca Central de Ciudad Universitaria (UNAM), cuyas cuatro fachadas están cubiertas casi por completo con un mosaico hecho de piedras de colores naturales que narra episodios de la historia de México, fue decorada por:',
    correct: 'Juan O\'Gorman.',
    distractors: [
      'Diego Rivera.',
      'David Alfaro Siqueiros.',
      'Mathias Goeritz.',
    ],
    layer1: 'Juan O\'Gorman diseñó el mosaico de la Biblioteca Central utilizando piedras de distintas regiones de México seleccionadas por su color natural, sin pintura añadida, para representar de forma simbólica el pasado prehispánico, la época colonial y el México moderno en cada una de las caras del edificio.',
    layer2: 'El proyecto es uno de los ejemplos más citados de "integración plástica" en Ciudad Universitaria: el mosaico no se añadió después como decoración, sino que fue concebido como parte estructural de la fachada, cubriendo también el volumen ciego que protege el acervo bibliográfico del sol.',
    layer3: 'Diego Rivera y David Alfaro Siqueiros también participaron con obra mural en otros edificios de Ciudad Universitaria, pero no son los autores de este mosaico en particular; y Mathias Goeritz trabajó sobre todo en escultura monumental abstracta, no en este mosaico narrativo.',
  },
  {
    topic: 4, difficulty: 'INTERMEDIATE', chunks: [1],
    stem: 'La casa-estudio construida en San Ángel, Ciudad de México (1931-1932), formada por dos volúmenes independientes unidos por un puente y pensada para que trabajaran por separado Diego Rivera y Frida Kahlo, se considera uno de los primeros ejemplos de arquitectura funcionalista en América Latina, y fue proyectada por:',
    correct: 'Juan O\'Gorman.',
    distractors: [
      'Luis Barragán.',
      'Mario Pani.',
      'Carlos Obregón Santacilia.',
    ],
    layer1: 'Antes de dedicarse también al muralismo en mosaico, Juan O\'Gorman trabajó como arquitecto bajo la influencia directa del funcionalismo europeo —estructuras sencillas, sin ornamento, con la función determinando la forma— y proyectó esta casa-estudio a pedido de Diego Rivera.',
    layer2: 'El conjunto, hoy convertido en museo, se compone de dos edificios de distinto tamaño y color, conectados por un puente elevado, y refleja tanto los principios funcionalistas como la vida personal y de trabajo separada de la pareja de artistas.',
    layer3: 'Luis Barragán desarrolló más adelante un lenguaje muy distinto, alejado del funcionalismo estricto; Mario Pani es conocido sobre todo por conjuntos habitacionales y el plan de Ciudad Universitaria, no por esta casa en particular; y Carlos Obregón Santacilia, aunque arquitecto mexicano activo en una época cercana, no es el autor de esta obra.',
  },

  // ══════════════════════ 5. Fotografía y cine (TEMARIO_ONLY) ══════════════════════
  {
    topic: 5, difficulty: 'INTERMEDIATE', chunks: [],
    stem: 'El primer procedimiento fotográfico de uso práctico, presentado públicamente en 1839 y que producía una imagen única sobre una placa de metal plateado, se conoce como:',
    correct: 'Daguerrotipo, desarrollado por Louis Daguerre.',
    distractors: [
      'Calotipo, desarrollado por William Henry Fox Talbot.',
      'Heliografía, desarrollada por Nicéphore Niépce en la década de 1820.',
      'Fotograma, técnica que no requiere cámara ni lente.',
    ],
    layer1: 'El daguerrotipo, presentado en 1839 ante la Academia de Ciencias de Francia, producía una única imagen positiva directamente sobre una placa metálica sensibilizada, con gran nitidez de detalle pero sin posibilidad de hacer copias múltiples a partir de un negativo.',
    layer2: 'Su presentación pública en 1839 se considera convencionalmente el año de "nacimiento" oficial de la fotografía como técnica disponible más allá de experimentos individuales, aunque procesos anteriores —como la heliografía de Niépce en los años 1820— ya habían logrado fijar imágenes.',
    layer3: 'El calotipo de Talbot, desarrollado casi al mismo tiempo, sí permitía obtener copias múltiples a partir de un negativo de papel, una diferencia técnica importante frente al daguerrotipo; la heliografía de Niépce es anterior y de calidad más limitada; y el fotograma es una técnica sin cámara, distinta del proceso descrito.',
  },
  {
    topic: 5, difficulty: 'BASIC', chunks: [],
    stem: 'Este fotógrafo mexicano, considerado el más influyente de su país en el siglo XX, es autor de imágenes como "Obrero en huelga, asesinado" (1934) y "La buena fama durmiendo" (1938), cercanas en ocasiones a la sensibilidad surrealista:',
    correct: 'Manuel Álvarez Bravo.',
    distractors: [
      'Nacho López.',
      'Héctor García.',
      'Lola Álvarez Bravo.',
    ],
    layer1: 'Manuel Álvarez Bravo desarrolló, desde los años treinta, una fotografía que combina un fuerte interés documental por la vida cotidiana y popular mexicana con una composición cuidada y, en algunas series, una atmósfera onírica que atrajo el interés de artistas surrealistas como André Breton.',
    layer2: '"Obrero en huelga, asesinado" documenta el cuerpo de un trabajador muerto durante un conflicto laboral, mientras que "La buena fama durmiendo" es una imagen más enigmática y construida, ejemplo de su lado más cercano al surrealismo; ambas se cuentan entre sus obras más reproducidas.',
    layer3: 'Nacho López y Héctor García son fotógrafos mexicanos posteriores, reconocidos sobre todo por el fotoperiodismo de mediados del siglo XX; Lola Álvarez Bravo, su esposa durante un tiempo, fue también una fotógrafa notable por derecho propio, pero no es la autora de estas dos imágenes en particular.',
  },
  {
    topic: 5, difficulty: 'INTERMEDIATE', chunks: [],
    stem: 'Esta fotógrafa de origen italiano, activa en México durante los años veinte y vinculada al círculo de los muralistas y al Partido Comunista Mexicano, es reconocida por fotografías de composición geométrica como sus estudios de rosas y por imágenes de trabajadores y manifestaciones obreras:',
    correct: 'Tina Modotti.',
    distractors: [
      'Kati Horna.',
      'Graciela Iturbide.',
      'Lola Álvarez Bravo.',
    ],
    layer1: 'Tina Modotti llegó a México en 1923 y desarrolló, en poco más de una década, una obra fotográfica que combina un interés formal por la composición —muy influido por su pareja de entonces, el fotógrafo Edward Weston— con un fuerte compromiso político expresado en imágenes de obreros, campesinos y símbolos revolucionarios.',
    layer2: 'Su cercanía con muralistas como Diego Rivera y con movimientos políticos de izquierda de la época la convirtió en una figura central para entender el cruce entre fotografía, arte y política en el México posrevolucionario de los años veinte.',
    layer3: 'Kati Horna, fotógrafa húngara, llegó a México más tarde, tras la Guerra Civil española; Graciela Iturbide es una fotógrafa mexicana de generaciones posteriores, célebre por series como "Juchitán"; y Lola Álvarez Bravo, aunque contemporánea y también vinculada al ambiente artístico, desarrolló una obra y una trayectoria distintas a la de Modotti.',
  },
  {
    topic: 5, difficulty: 'BASIC', chunks: [],
    stem: 'El periodo del cine mexicano comprendido aproximadamente entre finales de los años treinta y los años cincuenta del siglo XX, caracterizado por una producción cinematográfica de gran popularidad y proyección internacional, con géneros como el melodrama rural y la comedia ranchera, se conoce como:',
    correct: 'La Época de Oro del cine mexicano.',
    distractors: [
      'El Nuevo Cine Mexicano, etiqueta que corresponde en realidad a un movimiento posterior de finales del siglo XX.',
      'El Cine de Ficheras, subgénero asociado más bien a las décadas de 1970 y 1980.',
      'El Cine Mudo Nacional, periodo anterior a la llegada del sonido al cine mexicano.',
    ],
    layer1: 'Durante la Época de Oro, la industria cinematográfica mexicana se benefició, entre otros factores, de la disminución de la producción hollywoodense de habla hispana y de las dificultades de otras industrias cinematográficas durante y después de la Segunda Guerra Mundial, lo que le permitió consolidar un mercado amplio en México y América Latina.',
    layer2: 'Figuras como Emilio "El Indio" Fernández en la dirección, Gabriel Figueroa en la fotografía, y actores como María Félix, Pedro Infante y Dolores del Río se volvieron referentes de este periodo, con películas que combinaban melodrama, folclor rural y una fuerte construcción de identidad nacional.',
    layer3: 'El Nuevo Cine Mexicano es una etiqueta usada para un movimiento de renovación posterior, ya en las últimas décadas del siglo XX; el cine de ficheras es un subgénero de comedia urbana de décadas posteriores; y el cine mudo nacional corresponde al periodo anterior, previo a la llegada del sonido a finales de los años veinte.',
  },
  {
    topic: 5, difficulty: 'INTERMEDIATE', chunks: [],
    stem: 'Este director de fotografía mexicano, célebre por sus composiciones de cielos cargados de nubes y su manejo dramático de la luz y la sombra, colaboró frecuentemente con el director Emilio "El Indio" Fernández en películas como "María Candelaria" (1943), y más tarde trabajó también con cineastas como Luis Buñuel y John Ford:',
    correct: 'Gabriel Figueroa.',
    distractors: [
      'Alex Phillips.',
      'Jack Draper.',
      'Rosalío Solano.',
    ],
    layer1: 'Gabriel Figueroa desarrolló un estilo fotográfico muy reconocible, con fuerte contraste de luces y sombras y encuadres que a menudo colocan cielos monumentales de nubes en la parte superior del cuadro, un recurso influido en parte por su acercamiento previo a fotógrafos y muralistas mexicanos.',
    layer2: 'Su colaboración con Emilio Fernández produjo algunas de las películas más representativas de la Época de Oro, y su prestigio técnico le permitió trabajar también con cineastas extranjeros de renombre, como el español Luis Buñuel durante su etapa mexicana y el estadounidense John Ford.',
    layer3: 'Alex Phillips, Jack Draper y Rosalío Solano fueron también directores de fotografía activos en el cine mexicano de esa época, con trabajo reconocido, pero ninguno de ellos es el autor de la fotografía de "María Candelaria" ni el colaborador más asociado a Emilio Fernández.',
  },
  {
    topic: 5, difficulty: 'ADVANCED', chunks: [],
    stem: 'El cineasta soviético, pionero de la teoría del montaje cinematográfico, que viajó a México a principios de los años treinta para filmar un proyecto —quedado inconcluso en su forma original— sobre la historia y la cultura del país, titulado "¡Que viva México!", fue:',
    correct: 'Serguéi Eisenstein.',
    distractors: [
      'Dziga Vertov.',
      'Luis Buñuel.',
      'Vsévolod Pudovkin.',
    ],
    layer1: 'Eisenstein filmó en México, entre 1930 y 1932, una gran cantidad de material pensado para retratar distintos episodios y regiones del país, desde el mundo prehispánico hasta la Revolución; problemas de financiamiento con su productor interrumpieron el proyecto antes de que Eisenstein pudiera editarlo él mismo.',
    layer2: 'El material filmado se editó después, sin su supervisión directa, en distintas versiones armadas por otras personas; aun así, el proyecto influyó en la manera en que el cine —mexicano e internacional— representaría después el paisaje y la cultura popular del país, incluyendo la fotografía posterior de Gabriel Figueroa.',
    layer3: 'Dziga Vertov y Vsévolod Pudovkin fueron también cineastas soviéticos y teóricos del montaje de la misma época, pero ninguno de los dos viajó a filmar este proyecto en México; y Luis Buñuel, aunque trabajó varios años en el cine mexicano, lo hizo más tarde y con una filmografía distinta, centrada en producciones de ficción como "Los olvidados".',
  },
  {
    topic: 5, difficulty: 'BASIC', chunks: [],
    stem: 'En el lenguaje cinematográfico, el proceso mediante el cual se seleccionan y ordenan los distintos planos filmados para construir el ritmo, el sentido y la narración de una película se conoce como:',
    correct: 'Montaje.',
    distractors: [
      'Encuadre, término que se refiere a lo que queda contenido dentro de los límites de la imagen.',
      'Doblaje, proceso de sustitución del audio original por otro grabado posteriormente.',
      'Guion técnico, documento escrito previo al rodaje que planea las tomas.',
    ],
    layer1: 'El montaje decide, entre otras cosas, la duración de cada plano, el orden en que se presentan los sucesos y las relaciones de sentido que surgen al yuxtaponer una imagen con otra; teóricos como Eisenstein defendieron que el choque entre dos planos podía generar una idea que ninguno de los dos contenía por separado.',
    layer2: 'Es una de las herramientas más estudiadas en la apreciación cinematográfica porque, a diferencia de otras artes, el cine puede alterar radicalmente el significado de una escena solo cambiando el orden o la duración de sus planos, sin modificar el material filmado en sí.',
    layer3: 'El encuadre se refiere a la composición dentro de un solo plano, no a la relación entre varios planos; el doblaje es un proceso de posproducción de sonido ajeno a la edición de imagen; y el guion técnico es un documento de planeación previo al rodaje, no el proceso de edición posterior.',
  },
  {
    topic: 5, difficulty: 'BASIC', chunks: [],
    stem: 'En el vocabulario técnico del cine, la toma que muestra el rostro de un personaje ocupando la mayor parte del encuadre, usada frecuentemente para resaltar una emoción o una reacción, se llama:',
    correct: 'Primer plano.',
    distractors: [
      'Plano general, que muestra a los personajes dentro de un espacio amplio que los contextualiza.',
      'Plano americano, que encuadra a los personajes aproximadamente de la rodilla hacia arriba.',
      'Plano detalle, que aísla un objeto o una parte muy pequeña de la escena, no el rostro completo.',
    ],
    layer1: 'El primer plano concentra la atención del espectador en el rostro del personaje, dejando fuera casi todo el entorno, y es uno de los recursos más usados para comunicar estados emocionales sin necesidad de diálogo.',
    layer2: 'Junto con el plano general (que muestra el entorno completo) y el plano americano (de uso frecuente en el cine de acción, para ver el cuerpo y las manos), forma parte de una escala de planos que el lenguaje cinematográfico usa de manera convencional para variar la distancia narrativa entre el espectador y la escena.',
    layer3: 'El plano general hace justamente lo contrario, mostrar el contexto amplio; el plano americano encuadra un fragmento mayor del cuerpo, no solo el rostro; y el plano detalle aísla un objeto pequeño o una parte del cuerpo distinta al rostro completo, como una mano o un ojo.',
  },
];
