// Datos crudos del lote G78 — IPN SOCADM, Historia de México (40 reactivos).
// Cada item: { topic, difficulty, stem, correct, distractors:[3], layer1, layer2, layer3 }
// `topic` es el índice 1-6 sobre TOPIC_IDS (ver tmp-g78-build.mjs).
//
// Las 4 opciones de cada reactivo se redactaron con longitud comparable a
// propósito (G77): la clave se acortó a su núcleo factual en vez de alargar
// los distractores con relleno artificial.

export const TOPIC_IDS = [
  'cmrr1m4yj00e5hi3n4yntho8j', // 1. Época prehispánica
  'cmrr1m5je00e7hi3no7bd2uta', // 2. Conquista y Colonia
  'cmrr1m65x00e9hi3ntzmrsbni', // 3. Independencia
  'cmrr1m6sm00ebhi3nqy8msmtx', // 4. Reforma y Guerra de Intervención
  'cmrr1m7ae00edhi3ndvipzn8h', // 5. Revolución Mexicana
  'cmrr1m7pt00efhi3nzqvt35wv', // 6. México Moderno (siglo XX-XXI)
];

export const ITEMS = [
  // ── 1. Época prehispánica (6) ──
  {
    topic: 1, difficulty: 'BASIC',
    stem: '¿Qué factor explica principalmente el paso de grupos nómadas a aldeas permanentes en Mesoamérica hacia el 2500 a.C.?',
    correct: 'El maíz domesticado dio un excedente alimentario capaz de sostener aldeas fijas.',
    distractors: [
      'El comercio antillano introdujo el cultivo en terrazas hacia el año 2500 a.C.',
      'Los animales de tiro permitieron transportar cosechas entre distintos valles.',
      'Los yacimientos cercanos de obsidiana atrajeron población hacia las riberas de los ríos.',
    ],
    layer1: 'La agricultura del maíz, ya domesticado hacia esa fecha, producía suficiente alimento almacenable como para que un grupo dejara de depender de la caza-recolección itinerante.',
    layer2: 'El excedente agrícola liberó tiempo y mano de obra para otras actividades (cerámica, construcción, organización religiosa), sentando las bases de las aldeas y después de las ciudades mesoamericanas.',
    layer3: 'Mesoamérica no tuvo animales de tiro (caballo, buey) antes de la Colonia, así que esa opción es anacrónica; la obsidiana y el comercio antillano fueron relevantes en otros procesos, pero no explican el sedentarismo temprano.',
  },
  {
    topic: 1, difficulty: 'INTERMEDIATE',
    stem: '¿Cuál era la función principal de la Triple Alianza formada por Tenochtitlan, Texcoco y Tlacopan?',
    correct: 'Repartirse el control militar y el tributo de los pueblos sometidos del valle.',
    distractors: [
      'Imponer el náhuatl como única lengua obligatoria en todo el territorio mexica.',
      'Sustituir los cultos locales por uno único dedicado a Huitzilopochtli.',
      'Reservarse el comercio exclusivo con los reinos purépechas del occidente.',
    ],
    layer1: 'La alianza de 1428 entre las tres ciudades-Estado organizó campañas conjuntas de conquista y repartió el tributo obtenido, con Tenochtitlan como socio dominante.',
    layer2: 'Cada pueblo conquistado seguía gobernado por su propia nobleza, pero pagaba tributo en bienes y servicio militar a la Triple Alianza; no hubo imposición lingüística ni religiosa uniforme.',
    layer3: 'El náhuatl se difundió como lengua de prestigio, pero nunca fue obligatorio; los cultos locales convivieron con el de Huitzilopochtli; y con los purépechas la relación fue de conflicto armado, no de comercio exclusivo.',
  },
  {
    topic: 1, difficulty: 'INTERMEDIATE',
    stem: '¿Por qué la expansión militar mexica dependía estrechamente de su sistema de tributos?',
    correct: 'Las conquistas sumaban pueblos tributarios que sostenían con bienes a la capital.',
    distractors: [
      'Las conquistas buscaban sobre todo prisioneros para el comercio de esclavos.',
      'Las conquistas garantizaban nuevas tierras de cultivo directo para la nobleza guerrera.',
      'Las conquistas perseguían ante todo el control de las rutas de sal del golfo.',
    ],
    layer1: 'Cada pueblo vencido quedaba obligado a entregar tributo periódico (alimentos, textiles, materiales, mano de obra), que era la base económica del poder mexica.',
    layer2: 'Este mecanismo permitía a Tenochtitlan sostener a su población, su ejército y su clase gobernante sin depender solo de la agricultura del Valle de México.',
    layer3: 'Los prisioneros de guerra se destinaban sobre todo al sacrificio ritual, no a un mercado de esclavos organizado; el reparto de tierra a guerreros existía pero no era el motor de la expansión; la sal era un tributo más, no el objetivo central.',
  },
  {
    topic: 1, difficulty: 'BASIC',
    stem: '¿Qué propósito cumplía el uso simultáneo del Tonalpohualli (260 días) y el Xiuhpohualli (365 días) en Mesoamérica?',
    correct: 'Unir el ciclo ritual de 260 días con el ciclo agrícola-solar de 365 días.',
    distractors: [
      'Registrar por separado los linajes de la nobleza y los del pueblo común.',
      'Anunciar con precisión los eclipses solares que marcaban el fin de una era.',
      'Fijar un calendario militar independiente del calendario del comercio.',
    ],
    layer1: 'El Tonalpohualli marcaba los días propicios para ritos y decisiones, mientras el Xiuhpohualli seguía el ciclo solar de siembra y cosecha; juntos formaban la "rueda calendárica" de 52 años.',
    layer2: 'Ambos calendarios corrían en paralelo y su coincidencia cada 52 años era motivo de una ceremonia mayor (el Fuego Nuevo), central en la cosmovisión mesoamericana.',
    layer3: 'No existía un calendario separado para linajes, ni uno exclusivamente militar o comercial; la predicción de eclipses era una habilidad astronómica asociada, pero no el propósito de tener dos calendarios.',
  },
  {
    topic: 1, difficulty: 'INTERMEDIATE',
    stem: 'Además de comerciar, ¿qué función adicional cumplían los pochteca en la sociedad mexica?',
    correct: 'Servían como informantes y espías del Estado en los territorios donde comerciaban.',
    distractors: [
      'Administraban los templos principales de las provincias tributarias.',
      'Dirigían el reclutamiento de soldados para las campañas de conquista.',
      'Supervisaban la construcción de los caminos hacia las costas del imperio.',
    ],
    layer1: 'Su movilidad por territorios lejanos les daba acceso a información política y militar valiosa, que reportaban al gobierno mexica.',
    layer2: 'Por esa doble función, los pochteca gozaban de privilegios especiales (su propio dios patrono, tribunales propios) y en ocasiones sus agravios en tierra extranjera justificaban una guerra.',
    layer3: 'La administración de templos correspondía al sacerdocio, el reclutamiento militar a los propios señores guerreros, y la construcción de caminos a la mano de obra tributaria, no a los comerciantes.',
  },
  {
    topic: 1, difficulty: 'ADVANCED',
    stem: '¿Qué explica la existencia de los tlacotin (personas en servidumbre) dentro de la sociedad mexica?',
    correct: 'Se llegaba a esa condición por deudas o delitos, y no era hereditaria.',
    distractors: [
      'Era una condición hereditaria impuesta solo a los pueblos recién conquistados.',
      'Se reservaba únicamente a los prisioneros de guerra destinados al sacrificio.',
      'Surgía por haber nacido fuera del matrimonio dentro del calpulli.',
    ],
    layer1: 'A diferencia de la esclavitud colonial o de otras sociedades antiguas, el tlacotin mexica podía comprar su libertad y sus hijos nacían libres.',
    layer2: 'Esta condición funcionaba como una forma de servidumbre temporal y contractual, ligada a circunstancias económicas o penales concretas, no a un origen étnico o de nacimiento.',
    layer3: 'No dependía de ser de un pueblo conquistado, ni del nacimiento fuera del matrimonio; los prisioneros de guerra tenían un destino ritual distinto, separado del sistema de servidumbre interno.',
  },

  // ── 2. Conquista y Colonia (7) ──
  {
    topic: 2, difficulty: 'BASIC',
    stem: '¿Qué factor fue determinante para que Hernán Cortés lograra vencer al imperio mexica en 1521?',
    correct: 'Las alianzas con pueblos como los tlaxcaltecas, rivales históricos de Tenochtitlan.',
    distractors: [
      'La superioridad numérica de las tropas españolas sobre los ejércitos mexicas.',
      'El uso exclusivo de armas de fuego, del todo desconocidas en Mesoamérica.',
      'El respaldo económico inmediato de la Corona española a la expedición.',
    ],
    layer1: 'Los tlaxcaltecas y otros pueblos resentidos por el dominio tributario mexica aportaron la mayoría de los combatientes que sitiaron Tenochtitlan.',
    layer2: 'Sin esos miles de guerreros aliados, la reducida tropa española no habría podido sostener un sitio prolongado contra una ciudad de cientos de miles de habitantes.',
    layer3: 'Los españoles eran una minoría numérica, no una mayoría; usaban pólvora pero en cantidades limitadas, y la expedición de Cortés fue financiada de forma privada, sin respaldo económico inicial de la Corona.',
  },
  {
    topic: 2, difficulty: 'INTERMEDIATE',
    stem: '¿Por qué las epidemias como la viruela tuvieron un impacto demográfico tan devastador en la población indígena tras 1520?',
    correct: 'La falta de inmunidad previa a enfermedades traídas de Europa y África.',
    distractors: [
      'La contaminación deliberada de las fuentes de agua por los conquistadores.',
      'La prohibición colonial del uso de remedios medicinales indígenas.',
      'Un clima húmedo del altiplano que solo favorecía a los patógenos europeos.',
    ],
    layer1: 'Al no haber existido contacto previo con virus como el de la viruela, la población americana no había desarrollado defensas inmunológicas frente a ellos.',
    layer2: 'Este fenómeno, junto con el trabajo forzado y la desarticulación de la producción agrícola local, provocó un colapso demográfico de hasta el 80-90% en un siglo.',
    layer3: 'No hubo un plan deliberado de contaminación de agua; la medicina indígena siguió practicándose y en muchos casos se integró a la colonial; y el clima no determinaba la susceptibilidad a estos virus, que afectaban por igual distintas regiones.',
  },
  {
    topic: 2, difficulty: 'INTERMEDIATE',
    stem: '¿En qué consistía el sistema de encomienda durante la Colonia temprana?',
    correct: 'Un grupo indígena quedaba asignado a un español a cambio de tributo y trabajo.',
    distractors: [
      'Una repartición de tierra baldía entre los colonos sin ninguna obligación con la Corona.',
      'Un impuesto que la Corona cobraba de forma directa, sin intermediarios.',
      'Un contrato salarial voluntario entre trabajadores indígenas y hacendados.',
    ],
    layer1: 'La encomienda no otorgaba tierra ni propiedad sobre las personas, sino el derecho a cobrar tributo y exigir trabajo de una comunidad indígena determinada.',
    layer2: 'A cambio, el encomendero debía costear la evangelización y, en teoría, el bienestar de los encomendados, aunque en la práctica el abuso fue generalizado y motivó denuncias como las de Bartolomé de las Casas.',
    layer3: 'No era una simple repartición de tierra vacía, ni un cobro directo de la Corona sin intermediarios, ni una relación salarial voluntaria: el indígena encomendado no elegía ni podía negarse a la relación.',
  },
  {
    topic: 2, difficulty: 'BASIC',
    stem: '¿Cuál fue una estrategia común de las órdenes religiosas para evangelizar a la población indígena en el siglo XVI?',
    correct: 'Aprender lenguas indígenas y adaptar símbolos previos al culto católico.',
    distractors: [
      'Prohibir por completo cualquier lengua distinta al español en los conventos.',
      'Trasladar a la población indígena a territorios peninsulares para instruirla.',
      'Sustituir de inmediato los templos indígenas por universidades laicas.',
    ],
    layer1: 'Frailes como los franciscanos elaboraron gramáticas y catecismos en náhuatl y otras lenguas, y aprovecharon similitudes entre símbolos indígenas y cristianos (cruces, ritos de purificación) para facilitar la conversión.',
    layer2: 'Esta adaptación explica fenómenos como el sincretismo religioso, visible por ejemplo en la construcción de templos católicos sobre antiguos centros ceremoniales.',
    layer3: 'No se prohibió el uso de lenguas indígenas en los conventos —al contrario, se estudiaron—; no hubo traslados masivos a la península; y los templos se sustituyeron por iglesias, no por universidades.',
  },
  {
    topic: 2, difficulty: 'INTERMEDIATE',
    stem: '¿Qué función cumplía el sistema de castas en la sociedad novohispana?',
    correct: 'Clasificaba a la población por origen étnico para fijar derechos e impuestos.',
    distractors: [
      'Organizaba a la población solamente según su lugar de nacimiento en Nueva España.',
      'Determinaba el reparto de tierra entre las distintas órdenes religiosas.',
      'Fijaba turnos de trabajo minero obligatorio por igual para todos los grupos.',
    ],
    layer1: 'Categorías como español, criollo, mestizo, mulato o indio definían el acceso a cargos públicos, la carga tributaria y hasta el tipo de vestimenta permitida.',
    layer2: 'El sistema buscaba mantener a los españoles peninsulares en la cúspide social y económica, limitando la movilidad de castas mixtas aunque tuvieran recursos.',
    layer3: 'El lugar de nacimiento (criollo vs. peninsular) era solo un eje de la clasificación, no el único; el reparto de tierras entre órdenes religiosas era un asunto distinto; y el trabajo minero forzado recaía sobre todo en la población indígena, no de forma pareja entre castas.',
  },
  {
    topic: 2, difficulty: 'ADVANCED',
    stem: '¿Por qué la minería de plata se convirtió en el eje de la economía novohispana durante el virreinato?',
    correct: 'La plata alimentaba el comercio con Asia y Europa y financiaba a la Corona.',
    distractors: [
      'Era el único producto cultivable en las zonas áridas del norte novohispano.',
      'Sustituía por completo a la agricultura como fuente de alimento colonial.',
      'Servía únicamente para acuñar moneda de uso interno en Nueva España.',
    ],
    layer1: 'Yacimientos como Zacatecas y Guanajuato produjeron enormes volúmenes de plata que salían por Veracruz y Acapulco hacia España y, vía la Nao de China, hacia Asia.',
    layer2: 'Ese flujo de metal precioso fue clave para el comercio global de la época y para sostener el gasto militar y administrativo del imperio español.',
    layer3: 'La plata no se "cultiva" (es un mineral); la agricultura siguió siendo esencial para alimentar a la población; y buena parte de la plata acuñada circulaba fuera de Nueva España, no solo internamente.',
  },
  {
    topic: 2, difficulty: 'ADVANCED',
    stem: '¿Qué buscaban las reformas borbónicas de la segunda mitad del siglo XVIII en Nueva España?',
    correct: 'Centralizar el poder real, subir la recaudación y frenar a los criollos en cargos.',
    distractors: [
      'Dar mayor autonomía política a los cabildos criollos frente al virrey.',
      'Reducir de forma permanente los impuestos a la producción minera novohispana.',
      'Fortalecer el poder económico de las órdenes religiosas sobre el comercio.',
    ],
    layer1: 'Los Borbones reorganizaron la administración (intendencias), reforzaron el cobro de impuestos y favorecieron a peninsulares sobre criollos en puestos de gobierno.',
    layer2: 'Este descontento criollo por el desplazamiento político, sumado a la crisis de 1808 en España, es considerado una causa de fondo del movimiento de independencia iniciado en 1810.',
    layer3: 'Las reformas restaron autonomía a los cabildos en vez de ampliarla; aumentaron, no redujeron, la presión fiscal sobre la minería; y buscaron reducir, no fortalecer, el poder económico de la Iglesia (expulsión de los jesuitas en 1767).',
  },

  // ── 3. Independencia (6) ──
  {
    topic: 3, difficulty: 'BASIC',
    stem: '¿Cuál fue una causa externa que detonó el movimiento de independencia en 1810?',
    correct: 'La invasión napoleónica a España debilitó la autoridad de la Corona en América.',
    distractors: [
      'La firma de un tratado comercial entre Nueva España e Inglaterra.',
      'La abolición de la esclavitud decretada por las Cortes de Cádiz.',
      'El reconocimiento inmediato de la independencia estadounidense.',
    ],
    layer1: 'En 1808 Napoleón invadió España y forzó la abdicación de Fernando VII, dejando un vacío de legitimidad que reabrió la pregunta de quién gobernaba en nombre del rey en las colonias.',
    layer2: 'Ese vacío alimentó tanto juntas autonomistas leales al rey cautivo como, poco después, movimientos abiertamente independentistas como el de Hidalgo.',
    layer3: 'No existió tal tratado comercial con Inglaterra en esos años; las Cortes de Cádiz no abolieron la esclavitud; y la independencia estadounidense (1776) fue anterior y no fue la causa inmediata de 1810.',
  },
  {
    topic: 3, difficulty: 'BASIC',
    stem: '¿Qué representó el llamado "Grito de Dolores" del 16 de septiembre de 1810?',
    correct: 'El inicio armado del movimiento insurgente encabezado por Miguel Hidalgo.',
    distractors: [
      'La proclamación oficial de independencia reconocida por la Corona.',
      'La firma del primer tratado de paz entre insurgentes y realistas.',
      'La convocatoria al primer congreso constituyente novohispano.',
    ],
    layer1: 'Hidalgo llamó a las armas a la población del Bajío contra el mal gobierno, marcando el arranque de una guerra que duraría once años.',
    layer2: 'La independencia no se logró ni se reconoció ese día; fue apenas el detonante de una lucha larga y con múltiples fases.',
    layer3: 'No hubo reconocimiento de la Corona en 1810, ni un tratado de paz en esa fecha, ni un congreso constituyente novohispano formal; ese tipo de organización política llegaría después, con Morelos.',
  },
  {
    topic: 3, difficulty: 'INTERMEDIATE',
    stem: '¿Qué aportó José María Morelos al movimiento insurgente tras la muerte de Hidalgo?',
    correct: 'Le dio un proyecto político al movimiento con los Sentimientos de la Nación.',
    distractors: [
      'Negoció con la Corona española el reconocimiento de la independencia.',
      'Trasladó de forma permanente la capital insurgente a la ciudad de Veracruz.',
      'Unificó al ejército insurgente con las tropas realistas bajo un solo mando.',
    ],
    layer1: 'Morelos convocó el Congreso de Chilpancingo (1813) y presentó un ideario que iba más allá de las armas: igualdad legal, fin de la esclavitud y soberanía popular.',
    layer2: 'Ese documento sentó bases que después influyeron en constituciones posteriores, dándole al movimiento un proyecto de nación, no solo una campaña militar.',
    layer3: 'No hubo negociación de independencia con la Corona en esos años, ni un traslado permanente de capital a Veracruz, ni mucho menos una fusión con el ejército realista, que siguió siendo el enemigo a vencer.',
  },
  {
    topic: 3, difficulty: 'INTERMEDIATE',
    stem: '¿Qué papel jugó el Plan de Iguala en la consumación de la independencia en 1821?',
    correct: 'Unió a insurgentes y realistas bajo las Tres Garantías, con Iturbide y Guerrero.',
    distractors: [
      'Estableció de inmediato una república federal como forma de gobierno.',
      'Decretó la expulsión total de los españoles peninsulares del país.',
      'Fue rechazado de inmediato por los antiguos jefes insurgentes, que siguieron la guerra.',
    ],
    layer1: 'El abrazo de Acatempan simbolizó la alianza entre Agustín de Iturbide (antes realista) y Vicente Guerrero (insurgente), que permitió una salida negociada tras años de guerra.',
    layer2: 'El plan proponía una monarquía constitucional y garantizaba la religión católica y la unión de todos los grupos, lo que le dio un respaldo amplio y rápido.',
    layer3: 'No se estableció una república en 1821 (llegaría hasta 1824); no hubo una expulsión masiva inmediata de peninsulares; y el plan fue precisamente lo contrario a un rechazo insurgente: unificó a las facciones en vez de dividirlas.',
  },
  {
    topic: 3, difficulty: 'ADVANCED',
    stem: '¿Por qué muchos criollos, inicialmente leales a la Corona, terminaron apoyando la independencia hacia 1820?',
    correct: 'Temieron que el liberalismo gaditano de 1812 afectara sus privilegios locales.',
    distractors: [
      'Recibieron financiamiento de Estados Unidos para separarse de España.',
      'Buscaban imponer de inmediato un sistema republicano de corte radical.',
      'Fueron obligados por la Iglesia novohispana a romper con la Corona.',
    ],
    layer1: 'El regreso del liberalismo gaditano en 1820 amenazaba fueros y propiedades de criollos y del clero, lo que los empujó a buscar la independencia como forma de conservar el orden social existente.',
    layer2: 'Este giro explica por qué la independencia se consumó de forma relativamente conservadora en 1821, con una alianza entre antiguos realistas e insurgentes, y no como una ruptura radical.',
    layer3: 'No hubo financiamiento estadounidense documentado para este viraje; los criollos que impulsaron el Plan de Iguala buscaban preservar privilegios, no un republicanismo radical; y la decisión no fue una orden institucional de la Iglesia, sino una convergencia de intereses.',
  },
  {
    topic: 3, difficulty: 'INTERMEDIATE',
    stem: '¿Qué factor explica que la guerra de independencia se prolongara durante once años (1810-1821)?',
    correct: 'Faltó un mando insurgente unificado frente a un ejército realista fuerte.',
    distractors: [
      'Hubo una ausencia casi total de apoyo popular durante toda la década.',
      'Tropas francesas intervinieron de forma directa a favor de los insurgentes.',
      'Estados Unidos reconoció la independencia mexicana desde 1811.',
    ],
    layer1: 'Tras la muerte de Hidalgo y Morelos, el movimiento se fragmentó en guerrillas regionales (como la de Guerrero en el sur), incapaces por sí solas de derrotar al ejército realista.',
    layer2: 'La guerra se sostuvo gracias a ese hostigamiento prolongado, hasta que el cambio político en España (1820) abrió la puerta a una salida negociada.',
    layer3: 'El movimiento sí tuvo apoyo popular importante, sobre todo en sus inicios; Francia no intervino a favor de los insurgentes; y Estados Unidos no reconoció la independencia mexicana en 1811, sino hasta después de consumada en los años 1820.',
  },

  // ── 4. Reforma y Guerra de Intervención (6) ──
  {
    topic: 4, difficulty: 'BASIC',
    stem: '¿Qué buscaban los liberales mexicanos con las Leyes de Reforma promulgadas entre 1855 y 1861?',
    correct: 'Reducir el poder de la Iglesia y el ejército, y separar al Estado de la religión.',
    distractors: [
      'Restaurar los privilegios coloniales que la independencia había suprimido.',
      'Fortalecer los lazos diplomáticos con España para recuperar territorio.',
      'Restablecer el sistema de castas para ordenar de nuevo a la población.',
    ],
    layer1: 'Leyes como la Ley Juárez, la Ley Lerdo y la Ley Iglesias limitaron los fueros del clero y del ejército y obligaron a desamortizar bienes eclesiásticos.',
    layer2: 'El objetivo de fondo era construir un Estado laico y moderno donde la ley civil, no los fueros corporativos, rigiera para todos por igual.',
    layer3: 'Estas leyes no restauraban privilegios coloniales —los eliminaban—; no buscaban reincorporar territorio a España; y el sistema de castas, abolido desde la independencia, no se reinstauró.',
  },
  {
    topic: 4, difficulty: 'BASIC',
    stem: '¿Qué principio central estableció la Constitución de 1857?',
    correct: 'Un Estado liberal con garantías individuales y supremacía del poder civil.',
    distractors: [
      'Una monarquía constitucional como forma definitiva de gobierno.',
      'La reinstauración de los fueros eclesiástico y militar.',
      'La anexión voluntaria de México a la Confederación americana.',
    ],
    layer1: 'La Constitución consagró derechos individuales y consolidó el proyecto liberal iniciado con las Leyes de Reforma, generando fuerte oposición conservadora.',
    layer2: 'Ese rechazo conservador fue tan intenso que desembocó, casi de inmediato, en la Guerra de Reforma entre 1858 y 1861.',
    layer3: 'La Constitución era republicana, no monárquica; eliminaba, no reinstauraba, los fueros; y no propuso ninguna anexión a un país extranjero.',
  },
  {
    topic: 4, difficulty: 'INTERMEDIATE',
    stem: '¿Qué enfrentó a liberales y conservadores en la Guerra de Reforma (1858-1861)?',
    correct: 'La disputa entre un Estado laico y federal y uno centralista con fueros clericales.',
    distractors: [
      'El control exclusivo de los puertos comerciales del golfo de México.',
      'La definición de los límites territoriales con Guatemala.',
      'El reparto de tierras comunales entre las distintas etnias indígenas.',
    ],
    layer1: 'Liberales, con Juárez a la cabeza, defendían la Constitución de 1857; los conservadores buscaban un régimen centralista, apoyado en el clero y el ejército, y llegaron a proponer una monarquía.',
    layer2: 'La guerra terminó con la victoria liberal, pero dejó al país exhausto y con una deuda que detonaría después la intervención extranjera.',
    layer3: 'El conflicto no giraba en torno al control portuario del golfo, ni a límites con Guatemala, ni al reparto de tierras indígenas; esos eran temas distintos al eje ideológico central de la guerra.',
  },
  {
    topic: 4, difficulty: 'INTERMEDIATE',
    stem: '¿Qué llevó a Francia, España e Inglaterra a intervenir militarmente en México en 1861?',
    correct: 'La suspensión del pago de la deuda externa que Juárez decretó por la crisis.',
    distractors: [
      'La negativa mexicana a comerciar con las potencias europeas.',
      'Un tratado previo que cedía territorio mexicano a cambio de armas.',
      'La expulsión de todos los ciudadanos europeos residentes en el país.',
    ],
    layer1: 'Tras años de guerra civil, el gobierno juarista no tenía recursos para pagar la deuda contraída con esas potencias y decretó una moratoria de dos años.',
    layer2: 'España e Inglaterra negociaron y se retiraron al poco tiempo (Convenios de La Soledad), pero Francia aprovechó el pretexto para avanzar hacia la Ciudad de México, con miras a un proyecto imperial más ambicioso.',
    layer3: 'México no cerró su comercio con Europa; no existió tal tratado de territorio por armas; y no hubo una expulsión masiva de europeos que motivara la intervención.',
  },
  {
    topic: 4, difficulty: 'INTERMEDIATE',
    stem: '¿Con qué propósito Napoleón III impulsó el establecimiento de Maximiliano de Habsburgo como emperador de México?',
    correct: 'Crear un imperio afín a Francia como contrapeso a Estados Unidos.',
    distractors: [
      'Devolver el territorio mexicano a la Corona española bajo un nuevo acuerdo.',
      'Financiar solo la construcción de vías férreas en el centro del país.',
      'Unificar a México y Francia bajo una sola estructura de gobierno.',
    ],
    layer1: 'Con Estados Unidos debilitado por su Guerra Civil (1861-1865), Francia vio la oportunidad de instalar un régimen monárquico aliado que ampliara su influencia en el continente.',
    layer2: 'El proyecto contó con apoyo de conservadores mexicanos, pero fracasó al fortalecerse la resistencia liberal y al retirar Napoleón III su respaldo militar en 1866-1867.',
    layer3: 'No se trataba de devolver el territorio a España, ni el proyecto se limitaba a obras ferroviarias; y el imperio buscaba ser un Estado mexicano gobernado por un europeo, no una fusión política con Francia.',
  },
  {
    topic: 4, difficulty: 'ADVANCED',
    stem: '¿Por qué la victoria republicana de 1867 fortaleció la figura de Benito Juárez y el proyecto liberal?',
    correct: 'Consolidó el triunfo del Estado laico y federal sobre el conservadurismo.',
    distractors: [
      'Permitió restablecer de inmediato los fueros militares abolidos antes.',
      'Obligó a México a aceptar un protectorado francés temporal en el sureste.',
      'Devolvió el control de las aduanas a las autoridades eclesiásticas.',
    ],
    layer1: 'El fusilamiento de Maximiliano en Querétaro y la restauración de la República en 1867 cerraron el ciclo de la Reforma con la victoria definitiva del proyecto liberal.',
    layer2: 'Juárez encabezó después la reconstrucción del país bajo los principios de la Constitución de 1857, sentando bases institucionales que perdurarían hasta el Porfiriato.',
    layer3: 'La restauración no reinstauró fueros militares —al contrario, reafirmó su abolición—; no se estableció ningún protectorado francés; y el control aduanero permaneció en manos del Estado civil, no de la Iglesia.',
  },

  // ── 5. Revolución Mexicana (8, incluye Porfiriato como antecedente) ──
  {
    topic: 5, difficulty: 'BASIC',
    stem: '¿Qué caracterizó al modelo económico impulsado durante el Porfiriato (1876-1911)?',
    correct: 'Atrajo inversión extranjera y modernizó infraestructura, con riqueza concentrada.',
    distractors: [
      'Repartió tierra de forma extendida entre comunidades campesinas del país.',
      'Cerró la economía mexicana a cualquier inversión proveniente del exterior.',
      'Nacionalizó de inmediato la industria petrolera y minera del país.',
    ],
    layer1: 'Porfirio Díaz impulsó ferrocarriles, minería y exportaciones con capital extranjero, logrando crecimiento económico pero excluyendo a la mayoría campesina y obrera de sus beneficios.',
    layer2: 'Esa concentración de tierra y riqueza, junto con la falta de libertades políticas, alimentó el descontento que estallaría en la Revolución de 1910.',
    layer3: 'El Porfiriato no repartió tierra a los campesinos —más bien las concentró en haciendas—; tampoco cerró la economía al capital extranjero, que fue central en su modelo; y la nacionalización petrolera ocurriría hasta 1938, con Cárdenas.',
  },
  {
    topic: 5, difficulty: 'INTERMEDIATE',
    stem: '¿Qué explica el creciente descontento social hacia el final del Porfiriato?',
    correct: 'La tierra concentrada en haciendas y la falta de libertades políticas.',
    distractors: [
      'La distribución equitativa de tierra entre campesinos sin acceso previo.',
      'La reducción sostenida de la jornada laboral en fábricas e industrias.',
      'El reconocimiento amplio de sindicatos independientes por el gobierno.',
    ],
    layer1: 'Millones de campesinos quedaron sin tierra propia, trabajando en haciendas bajo condiciones precarias, mientras el régimen reprimía cualquier oposición política.',
    layer2: 'Ese contraste entre modernización visible (ferrocarriles, edificios) y precariedad social explica por qué el llamado maderista de 1910 encontró tanto eco popular.',
    layer3: 'No hubo una distribución equitativa de tierra —el problema era justo lo contrario—; la jornada laboral no se redujo de forma generalizada; y el régimen reprimió, no favoreció, a los sindicatos independientes, como se vio en Cananea y Río Blanco.',
  },
  {
    topic: 5, difficulty: 'BASIC',
    stem: '¿Qué proponía Francisco I. Madero en el Plan de San Luis (1910)?',
    correct: 'Desconocer la reelección de Díaz y llamar a las armas el 20 de noviembre.',
    distractors: [
      'Reconocer la plena validez de las elecciones de 1910 bajo ciertas condiciones.',
      'Proponer una reforma agraria inmediata sin necesidad de movilización.',
      'Solicitar la intervención de Estados Unidos para mediar el conflicto.',
    ],
    layer1: 'Tras ser encarcelado y huir a Estados Unidos, Madero declaró nulas las elecciones que reeligieron a Díaz y convocó a las armas, dando inicio formal a la Revolución.',
    layer2: 'El plan tuvo eco en distintas regiones del país, sobre todo en el norte, donde figuras como Pascual Orozco y Francisco Villa se sumaron al llamado.',
    layer3: 'El plan rechazaba, no reconocía, las elecciones de 1910; sí contemplaba la vía armada, no solo reformas pacíficas; y no pedía mediación de Estados Unidos, sino movilización interna.',
  },
  {
    topic: 5, difficulty: 'INTERMEDIATE',
    stem: '¿Cuál era la demanda central del Plan de Ayala, promovido por Emiliano Zapata en 1911?',
    correct: 'La restitución inmediata de tierras comunales despojadas en el Porfiriato.',
    distractors: [
      'La convocatoria a nuevas elecciones bajo supervisión extranjera.',
      'La creación de un banco nacional para financiar la industria textil.',
      'El establecimiento de fueros especiales y permanentes para el ejército revolucionario.',
    ],
    layer1: 'Zapata rompió con Madero al considerar que este no cumplía su promesa de devolver la tierra a los pueblos, y exigió su restitución bajo el lema "Tierra y Libertad".',
    layer2: 'Este plan mantuvo al zapatismo como una fuerza autónoma con un programa social propio durante toda la década revolucionaria, influyendo después en el artículo 27 de la Constitución de 1917.',
    layer3: 'El plan no giraba en torno a elecciones supervisadas por potencias extranjeras, ni proponía un banco textil, ni buscaba fueros especiales para el ejército: su eje era estrictamente agrario.',
  },
  {
    topic: 5, difficulty: 'INTERMEDIATE',
    stem: '¿Qué consecuencia tuvo la llamada Decena Trágica de febrero de 1913?',
    correct: 'El asesinato de Madero y Pino Suárez, y la usurpación de Huerta.',
    distractors: [
      'La firma de un armisticio definitivo entre todas las facciones.',
      'La convocatoria inmediata a un congreso constituyente en Querétaro.',
      'El reconocimiento internacional del gobierno maderista por Alemania.',
    ],
    layer1: 'Durante esos combates en la capital, el general Huerta traicionó a Madero, lo obligó a renunciar y poco después ordenó su asesinato junto con el vicepresidente Pino Suárez.',
    layer2: 'La usurpación de Huerta reavivó la lucha armada, pues Venustiano Carranza desconoció su gobierno mediante el Plan de Guadalupe, iniciando la fase constitucionalista de la Revolución.',
    layer3: 'No hubo tal armisticio general en 1913; el Congreso Constituyente de Querétaro se reunió hasta 1916-1917; y no existió un reconocimiento alemán al gobierno de Madero en ese episodio.',
  },
  {
    topic: 5, difficulty: 'ADVANCED',
    stem: '¿Qué diferencia de fondo dividió a constitucionalistas (Carranza, Obregón) de convencionistas (Villa, Zapata) tras la caída de Huerta?',
    correct: 'El alcance del reparto agrario y el control del proceso posrevolucionario.',
    distractors: [
      'La forma de gobierno futura, pues un bando proponía monarquía y otro república.',
      'La postura ante Estados Unidos, pues un bando buscaba la anexión total.',
      'La religión oficial que debía adoptar el nuevo Estado mexicano.',
    ],
    layer1: 'La Convención de Aguascalientes (1914) intentó unir a las facciones, pero Carranza se negó a acatar sus acuerdos, y villistas y zapatistas exigían una reforma agraria más profunda que la que él estaba dispuesto a conceder.',
    layer2: 'Esa ruptura llevó a una nueva guerra civil dentro de la Revolución, resuelta militarmente a favor de los constitucionalistas hacia 1915-1916, lo que les permitió convocar el Congreso Constituyente.',
    layer3: 'Ningún bando proponía una monarquía; ninguno buscaba la anexión del país a Estados Unidos; y la disputa no era de carácter religioso, sino sobre el ritmo y la profundidad de las reformas sociales.',
  },
  {
    topic: 5, difficulty: 'INTERMEDIATE',
    stem: '¿Qué hizo innovadora a la Constitución de 1917 frente a otras constituciones de su época?',
    correct: 'Incorporó derechos sociales, como la reforma agraria y los laborales.',
    distractors: [
      'Estableció una monarquía parlamentaria inspirada en el modelo británico.',
      'Suprimió por completo la división de poderes en favor del Ejecutivo.',
      'Eliminó cualquier mención a la propiedad privada en el territorio nacional.',
    ],
    layer1: 'A diferencia del liberalismo clásico de 1857, centrado en libertades individuales, la de 1917 reconoció derechos colectivos como la jornada de ocho horas, el salario mínimo y la propiedad originaria de la nación sobre tierra y subsuelo.',
    layer2: 'Por esto se le considera pionera a nivel mundial en constitucionalismo social, anterior incluso a la Constitución de Weimar de 1919.',
    layer3: 'México siguió siendo una república, no una monarquía; la Constitución mantuvo la división de poderes, aunque con un Ejecutivo fuerte; y no eliminó la propiedad privada, sino que la subordinó al interés público en ciertos casos.',
  },
  {
    topic: 5, difficulty: 'ADVANCED',
    stem: '¿Qué papel cumplió la fundación del Partido Nacional Revolucionario (PNR) en 1929?',
    correct: 'Institucionalizó la lucha por el poder y redujo los alzamientos armados.',
    distractors: [
      'Restauró el sistema de reelección indefinida vigente en el Porfiriato.',
      'Disolvió al ejército revolucionario para sustituirlo por fuerzas extranjeras.',
      'Transfirió el poder legislativo completo a los gobiernos estatales.',
    ],
    layer1: 'Impulsado por Plutarco Elías Calles tras el asesinato de Álvaro Obregón, el PNR agrupó a caudillos y organizaciones regionales bajo una sola estructura para negociar el poder sin recurrir a las armas.',
    layer2: 'Ese partido, con sus posteriores transformaciones (PRM, PRI), se convirtió en el eje del sistema político mexicano durante más de setenta años.',
    layer3: 'El PNR no restauró la reelección indefinida —la sucesión pasó a negociarse dentro del partido, no por permanencia de una sola persona—; no disolvió al ejército a favor de fuerzas extranjeras; y no transfirió el poder legislativo a los estados, sino que reforzó el control central.',
  },

  // ── 6. México Moderno (siglo XX-XXI) (7) ──
  {
    topic: 6, difficulty: 'BASIC',
    stem: '¿Qué motivó al presidente Lázaro Cárdenas a expropiar la industria petrolera en 1938?',
    correct: 'Las compañías extranjeras incumplieron el fallo laboral de la Corte.',
    distractors: [
      'La necesidad de financiar la construcción de la red ferroviaria nacional.',
      'Una exigencia directa de Estados Unidos para regular los precios.',
      'El agotamiento de los yacimientos administrados por extranjeros.',
    ],
    layer1: 'Cuando las compañías petroleras se negaron a acatar la sentencia que las obligaba a mejorar condiciones laborales, Cárdenas decretó la expropiación el 18 de marzo de 1938.',
    layer2: 'La medida, respaldada por una amplia movilización popular que ayudó a pagar la indemnización, dio origen a Petróleos Mexicanos (Pemex) como empresa estatal.',
    layer3: 'La expropiación no buscaba financiar ferrocarriles; Estados Unidos, de hecho, se opuso inicialmente a la medida; y los yacimientos no estaban agotados, sino en plena explotación por las compañías extranjeras.',
  },
  {
    topic: 6, difficulty: 'INTERMEDIATE',
    stem: '¿En qué se diferenció el reparto agrario de Cárdenas del de gobiernos anteriores?',
    correct: 'Impulsó el ejido colectivo a gran escala como forma dominante de tierra.',
    distractors: [
      'Devolvió toda la tierra repartida a los antiguos hacendados porfiristas.',
      'Eliminó por completo la propiedad privada agrícola en todo el país.',
      'Concentró el reparto solo en las zonas urbanas del centro del país.',
    ],
    layer1: 'Cárdenas repartió más tierra que todos sus antecesores juntos, favoreciendo el ejido colectivo, especialmente en zonas como La Laguna y el Yaqui, ligado a la organización productiva comunitaria.',
    layer2: 'Este modelo buscaba dar viabilidad económica al campesinado organizado, a diferencia del reparto más limitado y disperso de gobiernos previos.',
    layer3: 'No hubo una devolución de tierras a los antiguos hacendados —fue lo contrario—; la propiedad privada agrícola continuó existiendo junto al ejido; y el reparto se concentró en zonas rurales, no urbanas.',
  },
  {
    topic: 6, difficulty: 'INTERMEDIATE',
    stem: '¿Qué caracterizó al periodo conocido como el "Milagro Mexicano" (décadas de 1940 a 1960)?',
    correct: 'Un crecimiento industrial sostenido por sustitución de importaciones.',
    distractors: [
      'Una apertura comercial total y la eliminación de aranceles externos.',
      'Un estancamiento económico prolongado por el aislamiento internacional.',
      'Una dependencia casi exclusiva de las exportaciones agrícolas.',
    ],
    layer1: 'El Estado protegió a la industria nacional con aranceles y subsidios, impulsando manufactura destinada al mercado interno en lugar de importar esos bienes.',
    layer2: 'El resultado fue un crecimiento económico sostenido de varias décadas, aunque con una industria poco competitiva a nivel internacional y creciente desigualdad social.',
    layer3: 'El periodo se caracterizó por proteger, no abrir, el mercado interno; hubo crecimiento, no estancamiento; y la industria manufacturera, no solo la exportación agrícola, fue el motor de la economía.',
  },
  {
    topic: 6, difficulty: 'BASIC',
    stem: '¿Qué exigía principalmente el movimiento estudiantil de 1968 en México?',
    correct: 'Exigía libertades democráticas y la liberación de los presos políticos.',
    distractors: [
      'Exigía la nacionalización inmediata de la banca y las telecomunicaciones.',
      'Exigía reducir el salario mínimo para frenar la inflación del país.',
      'Exigía la anexión de territorios centroamericanos al país mexicano.',
    ],
    layer1: 'El pliego petitorio estudiantil pedía, entre otras cosas, la derogación del delito de disolución social y la libertad de presos políticos, en un contexto de autoritarismo gubernamental.',
    layer2: 'El movimiento fue reprimido violentamente el 2 de octubre en Tlatelolco, un hecho que marcó profundamente la relación entre el Estado y la sociedad civil en las décadas siguientes.',
    layer3: 'El movimiento no giraba en torno a la nacionalización bancaria (que ocurriría hasta 1982), ni pedía reducir salarios, ni tenía ninguna demanda territorial centroamericana.',
  },
  {
    topic: 6, difficulty: 'INTERMEDIATE',
    stem: '¿Qué provocó la crisis de la deuda externa de 1982 en México?',
    correct: 'La caída del precio del petróleo y el alza de tasas de interés externas.',
    distractors: [
      'La cancelación unilateral de los tratados comerciales con Estados Unidos.',
      'Una sequía prolongada que eliminó por completo la producción agrícola.',
      'El cierre total de la frontera norte al comercio exterior del país.',
    ],
    layer1: 'Durante los años setenta México se endeudó fuertemente confiando en los altos precios del petróleo; cuando estos cayeron y las tasas de interés subieron, el país no pudo cubrir sus pagos.',
    layer2: 'La crisis obligó a una devaluación severa, a la nacionalización de la banca en 1982 y marcó el fin del modelo de sustitución de importaciones, abriendo paso a reformas de apertura económica en la década siguiente.',
    layer3: 'No hubo cancelación de tratados comerciales con Estados Unidos en ese momento; la crisis fue financiera, no derivada de una sequía agrícola; y la frontera norte no se cerró al comercio.',
  },
  {
    topic: 6, difficulty: 'INTERMEDIATE',
    stem: '¿Qué cambio estructural representó la entrada en vigor del Tratado de Libre Comercio de América del Norte (TLCAN) en 1994?',
    correct: 'El paso de un modelo proteccionista a uno de integración comercial abierta.',
    distractors: [
      'El regreso a un modelo de sustitución de importaciones más estricto.',
      'La suspensión temporal de relaciones diplomáticas con Canadá.',
      'La nacionalización de las industrias automotriz y electrónica del país.',
    ],
    layer1: 'El tratado eliminó gradualmente aranceles entre los tres países, consolidando el giro hacia la apertura comercial que México había iniciado desde su ingreso al GATT en 1986.',
    layer2: 'Esto transformó la estructura productiva mexicana, orientándola cada vez más hacia la exportación de manufacturas, en particular hacia Estados Unidos.',
    layer3: 'El TLCAN significó lo opuesto a un regreso proteccionista; no hubo suspensión de relaciones con Canadá, socio del propio tratado; y no implicó nacionalizar industrias, sino integrarlas al mercado privado regional.',
  },
  {
    topic: 6, difficulty: 'BASIC',
    stem: '¿Qué significó la elección presidencial del año 2000 para el sistema político mexicano?',
    correct: 'El fin de más de setenta años de gobierno del mismo partido en el poder.',
    distractors: [
      'El establecimiento definitivo de un sistema de partido único en el país.',
      'La suspensión indefinida de las elecciones presidenciales posteriores.',
      'El regreso a un régimen militar transitorio de cinco años en el país.',
    ],
    layer1: 'La victoria de Vicente Fox, de un partido distinto al que había gobernado desde 1929, marcó el fin de la hegemonía del PRI y una transición democrática pactada por vías electorales.',
    layer2: 'Este cambio fue posible gracias a reformas electorales previas que fortalecieron la autonomía de las instituciones encargadas de organizar y vigilar los comicios.',
    layer3: 'La alternancia significó justo lo contrario a un partido único permanente; las elecciones posteriores continuaron celebrándose con normalidad; y en ningún momento se instauró un gobierno militar transitorio.',
  },
];
