// Datos crudos del lote G82 — IPN SOCADM, Historia Universal (40 reactivos).
// Cada item: { topic, difficulty, stem, correct, distractors:[3], layer1, layer2, layer3 }
// `topic` es el índice 1-7 sobre TOPIC_IDS (ver build.mjs).
//
// Las 4 opciones de cada reactivo se redactaron con longitud comparable desde
// la primera versión (lección de G77/G78): la clave se compuso a su núcleo
// factual, sin relleno artificial en los distractores.
//
// Sin SourceChunk disponible para esta materia (los 7 temas, 0 fragmentos
// clasificados) → TEMARIO_ONLY en los 40, igual que G78.

export const TOPIC_IDS = [
  'cmrr1m8ge00ejhi3nobxqixy6', // 1. Antigüedad clásica
  'cmrr1m91l00elhi3nzjp96x5q', // 2. Edad Media
  'cmrr1m9mw00enhi3niofgzcbf', // 3. Renacimiento
  'cmrr1ma9u00ephi3nnwe565si', // 4. Ilustración y Liberalismo
  'cmrr1mawl00erhi3ng0vnf1vn', // 5. Industrialización
  'cmrr1mbjt00ethi3nm7qjb3ji', // 6. Guerras Mundiales
  'cmrr1ptdl00ev11qdtqra33sc', // 7. Siglo XXI
];

export const ITEMS = [
  // ── 1. Antigüedad clásica ──
  {
    topic: 1, difficulty: 'BASIC',
    stem: '¿Cuál era una característica central de la democracia directa en la Atenas clásica del siglo V a.C.?',
    correct: 'Excluía del voto a mujeres, esclavos y metecos (extranjeros residentes).',
    distractors: [
      'Todo habitante de la polis podía votar, sin distinción de origen o sexo.',
      'Un consejo hereditario de nobles decidía, sin consulta popular alguna.',
      'El voto se ejercía solo por representantes electos, nunca de forma directa.',
    ],
    layer1: 'La Asamblea (Ekklesía) decidía por voto directo de los ciudadanos, pero la ciudadanía plena se reservaba a hombres libres, adultos, nacidos de padre y madre atenienses.',
    layer2: 'Tras las reformas de Clístenes y en la Atenas de Pericles, esta exclusión (mujeres, esclavos, metecos) es precisamente lo que los historiadores subrayan al describir el alcance real de la "democracia" ateniense.',
    layer3: 'No hubo sufragio universal sin distinción; un consejo hereditario sin consulta popular describe una oligarquía, no una democracia; y el rasgo distintivo de Atenas fue el voto directo, no representativo.',
  },
  {
    topic: 1, difficulty: 'INTERMEDIATE',
    stem: '¿En qué se convirtió la Liga de Delos, fundada en 478 a.C. contra el peligro persa, bajo la conducción ateniense?',
    correct: 'En un instrumento de dominio imperial: Atenas controló el tesoro común.',
    distractors: [
      'En una confederación igualitaria que se disolvió tras vencer a Persia.',
      'En un tratado comercial exclusivo entre Atenas y Esparta por el Egeo.',
      'En una alianza militar con liderazgo rotativo entre las ciudades miembro.',
    ],
    layer1: 'El traslado del tesoro de Delos a Atenas (454 a.C.) y el uso del tributo aliado para fines propios convirtieron la alianza en un imperio (arjé) bajo control ateniense.',
    layer2: 'Esta transformación es central para explicar las tensiones que desembocaron en la Guerra del Peloponeso contra Esparta.',
    layer3: 'La liga no se disolvió tras la victoria persa, sino que continuó como instrumento de dominio; el voto no era igualitario, Atenas decidía; y el liderazgo no era rotativo, Atenas lo retuvo de forma permanente.',
  },
  {
    topic: 1, difficulty: 'BASIC',
    stem: '¿Qué caracterizó al periodo helenístico que siguió a las conquistas de Alejandro Magno?',
    correct: 'La fusión de elementos griegos con tradiciones orientales en los reinos sucesores.',
    distractors: [
      'El regreso de las polis griegas a un aislamiento cultural frente a Oriente.',
      'La imposición del politeísmo egipcio como única religión oficial en todo el imperio.',
      'La desaparición del griego como lengua de la administración y el comercio.',
    ],
    layer1: 'Tras la muerte de Alejandro (323 a.C.), su imperio se dividió en reinos sucesores (ptolemaico, seléucida, antigónida) donde el arte, la religión y el pensamiento griegos se mezclaron con tradiciones locales.',
    layer2: 'Centros como Alejandría, con su Biblioteca y Museion, ejemplifican esa fusión cultural que define lo "helenístico" frente a lo estrictamente "helénico" (griego clásico).',
    layer3: 'No hubo un repliegue aislacionista; ninguna religión única se impuso de forma oficial, sino un sincretismo; y el griego koiné, lejos de desaparecer, se difundió como lengua franca de la región.',
  },
  {
    topic: 1, difficulty: 'INTERMEDIATE',
    stem: '¿Qué problema estructural de la República romana tardía explica en buena medida su transformación en el Principado de Augusto?',
    correct: 'Ejércitos leales a su general, no al Senado, provocaron guerras civiles recurrentes.',
    distractors: [
      'La ausencia de expansión territorial dejó sin ingresos al tesoro público.',
      'La convivencia pacífica entre patricios y plebeyos eliminó la tensión política.',
      'El Senado había concentrado todo el mando militar, sin dejar tropas a los generales.',
    ],
    layer1: 'Las reformas militares de Mario profesionalizaron el ejército y ligaron la lealtad del soldado a su general (que le prometía tierra y botín), no al Estado; de ahí las guerras civiles entre Mario y Sila, César y Pompeyo, y finalmente Octavio y Marco Antonio.',
    layer2: 'Augusto puso fin a ese ciclo en el 27 a.C. concentrando el poder político y militar en su persona, conservando de manera formal las instituciones republicanas.',
    layer3: 'La expansión territorial romana no se detuvo, fue la base de su riqueza; la relación patricio-plebeyo siguió siendo tensa (recuérdense los Gracos); y el problema fue justo lo opuesto: los generales sí controlaban ejércitos propios.',
  },
  {
    topic: 1, difficulty: 'ADVANCED',
    stem: '¿Por qué la historiografía actual describe la caída del Imperio Romano de Occidente, fechada de forma convencional en 476 d.C., como un proceso y no como un hecho aislado?',
    correct: 'Combinó crisis económica, migraciones y pérdida gradual de control administrativo.',
    distractors: [
      'Roma nunca perdió el control efectivo de sus provincias occidentales.',
      'El cristianismo fue la única causa documentada, sin factores económicos.',
      'La fecha de 476 se propuso apenas en el siglo XX, sin ninguna base en fuentes antiguas.',
    ],
    layer1: 'La deposición de Rómulo Augústulo por Odoacro en 476 es un marcador simbólico dentro de un proceso mucho más largo: la crisis del siglo III, la división administrativa Oriente-Occidente de 395, el deterioro fiscal y militar, y los asentamientos de pueblos migrantes durante generaciones.',
    layer2: 'La historiografía, desde Gibbon hasta los estudios contemporáneos, revisa constantemente el peso relativo de cada factor, pero coincide en tratarlo como un declive acumulativo, no un colapso súbito.',
    layer3: 'Es falso que Roma conservara el control efectivo de Occidente hasta el final; el cristianismo es un factor debatido (tesis de Gibbon) pero no el único documentado; y la fecha de 476 se usó ya en fuentes medievales y modernas, no fue "inventada" en el siglo XX.',
  },
  // ── 2. Edad Media ──
  {
    topic: 2, difficulty: 'BASIC',
    stem: '¿Qué relación definía el vínculo feudal entre un señor y su vasallo en la Europa medieval?',
    correct: 'El señor daba tierra y protección a cambio de fidelidad y servicio militar.',
    distractors: [
      'El vasallo era propietario legal pleno y pagaba un impuesto fijo en moneda.',
      'El señor y el vasallo tenían obligaciones idénticas e intercambiables.',
      'El vínculo era solo un contrato comercial, sin ningún componente militar.',
    ],
    layer1: 'Mediante el homenaje y el juramento de fidelidad, el señor entregaba un feudo (tierra con siervos) a cambio del servicio militar y el consejo del vasallo — el núcleo del sistema tras la fragmentación carolingia de los siglos IX-X.',
    layer2: 'Este vínculo personal y jerárquico organizó la política local en ausencia de una autoridad central fuerte.',
    layer3: 'El vasallo no era propietario pleno, sino tenedor del feudo bajo el señor; los roles no eran intercambiables, la jerarquía era fija; y el componente militar, no el comercial, era el eje del vínculo.',
  },
  {
    topic: 2, difficulty: 'BASIC',
    stem: '¿Qué papel desempeñó la Iglesia católica como institución en la Europa feudal, políticamente fragmentada?',
    correct: 'Conservó el conocimiento, impartió educación y legitimó a los monarcas.',
    distractors: [
      'Se mantuvo al margen de la política y la educación durante toda la época.',
      'Perdió toda influencia justo después de la caída de Roma de Occidente.',
      'Compitió como un reino territorial más, sin función religiosa o cultural.',
    ],
    layer1: 'Los monasterios copiaron y conservaron manuscritos, el derecho canónico operó por encima de las fronteras de los reinos, y ceremonias como la coronación de Carlomagno (800) legitimaron el poder político con autoridad religiosa.',
    layer2: 'Fue la única institución que atravesó de forma coherente la fragmentación política feudal.',
    layer3: 'La Iglesia estuvo lejos de ser apolítica (piénsese en las luchas de investiduras); su influencia creció, no desapareció, tras la caída de Roma; y su función religiosa y cultural la distinguía de un simple reino territorial.',
  },
  {
    topic: 2, difficulty: 'INTERMEDIATE',
    stem: '¿Cuál fue una consecuencia comercial y cultural importante de las Cruzadas (siglos XI-XIII) para Europa occidental?',
    correct: 'Fortaleció las rutas comerciales italianas y trajo productos y saberes orientales.',
    distractors: [
      'Cerró de forma definitiva todo contacto comercial con el mundo islámico.',
      'Hizo desaparecer por completo el comercio mediterráneo durante los dos siglos siguientes.',
      'Impuso el feudalismo europeo como sistema político en Oriente Próximo.',
    ],
    layer1: 'Repúblicas marítimas como Venecia, Génova y Pisa ampliaron sus rutas comerciales con Oriente durante y después de las Cruzadas, y con ellas circularon productos, técnicas y textos orientales hacia Europa.',
    layer2: 'Este efecto comercial y cultural perduró incluso después de que los estados cruzados en Tierra Santa desaparecieran.',
    layer3: 'El contacto comercial no se cerró, se intensificó; el comercio mediterráneo no desapareció, creció; y los reinos cruzados en Oriente fueron limitados y temporales, no una imposición duradera del feudalismo europeo en la región.',
  },
  {
    topic: 2, difficulty: 'INTERMEDIATE',
    stem: '¿Por qué el resurgimiento de las ciudades a partir del siglo XI favoreció el fortalecimiento del poder real frente a la nobleza feudal?',
    correct: 'La burguesía buscó protección y privilegios del rey a cambio de apoyo.',
    distractors: [
      'Las ciudades se aliaron con la nobleza feudal para debilitar a la monarquía.',
      'Los reyes prohibieron por completo el comercio dentro de las ciudades.',
      'La nobleza feudal financió la construcción de las nuevas ciudades comerciales.',
    ],
    layer1: 'Los mercaderes urbanos obtenían cartas forales que les daban autonomía frente a los señores locales, a menudo otorgadas directamente por el rey a cambio de impuestos y respaldo político — un intercambio que fortalecía a la corona frente a la nobleza feudal.',
    layer2: 'Este proceso es un antecedente del camino hacia monarquías más centralizadas en los siglos siguientes.',
    layer3: 'Las ciudades no se aliaron con la nobleza contra el rey, sino con el rey contra el poder señorial local; los reyes no prohibieron el comercio urbano, lo fomentaron; y la nobleza feudal no financió estas ciudades, más bien las veía como un contrapeso a su propio poder.',
  },
  {
    topic: 2, difficulty: 'INTERMEDIATE',
    stem: '¿Qué papel cumplió la Escuela de Traductores de Toledo en la Europa medieval?',
    correct: 'Tradujo al latín obras griegas y árabes de filosofía, matemáticas y medicina.',
    distractors: [
      'Prohibió la circulación de cualquier texto no escrito originalmente en latín.',
      'Se dedicó solo a copiar textos religiosos cristianos, sin contenido científico.',
      'Funcionó como un tribunal eclesiástico para juzgar herejías filosóficas.',
    ],
    layer1: 'Tras la reconquista cristiana de Toledo, eruditos tradujeron al latín textos árabes que incluían tanto obras griegas clásicas (Aristóteles, Ptolomeo) conservadas y comentadas en el mundo islámico como aportaciones originales (Avicena, Al-Juarismi).',
    layer2: 'Junto con Sicilia, fue uno de los canales principales por los que el pensamiento clásico y la ciencia islámica regresaron a la Europa latina, alimentando después la escolástica.',
    layer3: 'No prohibió textos no latinos, precisamente tradujo DESDE el árabe; su contenido no era solo religioso, sino sobre todo científico y filosófico; y no era un tribunal de herejías, sino un centro de traducción académica.',
  },
  // ── 3. Renacimiento ──
  {
    topic: 3, difficulty: 'BASIC',
    stem: '¿Qué idea central distinguió al humanismo renacentista de la mentalidad teocéntrica medieval predominante?',
    correct: 'Puso al ser humano y su razón en el centro, sin abandonar necesariamente la fe.',
    distractors: [
      'Rechazó por completo cualquier forma de religiosidad cristiana entre los intelectuales.',
      'Sostuvo que el destino humano dependía solo de la voluntad divina, sin agencia propia.',
      'Se limitó a copiar sin comentario alguno los textos religiosos medievales.',
    ],
    layer1: 'El humanismo revivió el estudio de textos clásicos griegos y romanos y puso el acento en la razón y el potencial humano ("studia humanitatis"), un giro antropocéntrico frente al teocentrismo medieval.',
    layer2: 'La mayoría de los humanistas, como Erasmo, siguieron siendo profundamente religiosos: el giro fue de énfasis, no de rechazo total de la fe.',
    layer3: 'No hubo un rechazo generalizado del cristianismo; la idea central era la agencia humana, opuesta al determinismo divino absoluto; y los humanistas comentaron y editaron los textos de forma crítica, no se limitaron a copiarlos.',
  },
  {
    topic: 3, difficulty: 'BASIC',
    stem: '¿Cuál fue el efecto más significativo de la imprenta de tipos móviles, desarrollada por Gutenberg hacia 1450, en la difusión de ideas?',
    correct: 'Redujo de forma drástica el costo y el tiempo de reproducir textos escritos.',
    distractors: [
      'Mantuvo el costo de los libros igual al de los manuscritos copiados a mano.',
      'Restringió la producción de textos de forma exclusiva a las órdenes monásticas.',
      'Sirvió solo para imprimir documentos oficiales de las cortes reales.',
    ],
    layer1: 'La reproducción mecánica abarató y aceleró enormemente la producción de textos frente al copiado manual, permitiendo difundir obras clásicas, humanistas y, más tarde, panfletos de la Reforma y biblias en lenguas vernáculas.',
    layer2: 'Fue un habilitador clave tanto de la circulación del humanismo renacentista como de la rapidez con la que se propagó la Reforma protestante décadas después.',
    layer3: 'El costo no se mantuvo igual, cayó de forma drástica; la producción no quedó restringida a monasterios, se descentralizó y comercializó; y no se limitó a documentos oficiales, abarcó una enorme variedad de textos.',
  },
  {
    topic: 3, difficulty: 'INTERMEDIATE',
    stem: '¿Qué factor institucional contribuyó a desencadenar la Reforma protestante iniciada por Martín Lutero en 1517?',
    correct: 'La venta de indulgencias para financiar San Pedro alimentó la crítica a la corrupción.',
    distractors: [
      'La Iglesia había eliminado por completo el cobro de cualquier tributo a los fieles.',
      'El papado había renunciado antes de 1517 a toda su autoridad doctrinal.',
      'No existía ninguna crítica previa a la Iglesia antes de las 95 tesis.',
    ],
    layer1: 'La venta de indulgencias, en parte para financiar la basílica de San Pedro, impulsó las 95 tesis de Lutero (1517) contra esa práctica y la corrupción que denunciaba.',
    layer2: 'Hubo también factores políticos previos (intereses de los príncipes alemanes frente a la autoridad papal e imperial) y críticas anteriores a la Iglesia, como las de Wycliffe y Hus, que prepararon el terreno.',
    layer3: 'La Iglesia no eliminó los tributos, la venta de indulgencias era justamente uno de ellos; el papado no había renunciado a su autoridad, esa autoridad era precisamente lo cuestionado; y sí existían críticas previas a la Iglesia antes de 1517.',
  },
  {
    topic: 3, difficulty: 'INTERMEDIATE',
    stem: '¿Qué combinación de factores impulsó la expansión marítima ibérica hacia nuevas rutas oceánicas a finales del siglo XV?',
    correct: 'La búsqueda de rutas a las especias, el bloqueo otomano y avances náuticos.',
    distractors: [
      'El desinterés total de Portugal y Castilla por el comercio con Asia.',
      'La ausencia de cualquier avance en la navegación europea del siglo XV.',
      'Un acuerdo previo con los otomanos para compartir las rutas terrestres.',
    ],
    layer1: 'La caída de Constantinopla (1453) y el control otomano sobre las rutas terrestres a Asia encarecieron el comercio de especias; a la vez, avances como la carabela y el astrolabio hicieron viables las travesías oceánicas.',
    layer2: 'La corona portuguesa y los Reyes Católicos financiaron estas expediciones buscando precisamente evitar ese control terrestre otomano-veneciano del comercio asiático.',
    layer3: 'No hubo desinterés, el motivo económico fue central; los avances náuticos fueron justo el factor habilitador, no su ausencia; y la relación con los otomanos era de bloqueo y rivalidad, no de un acuerdo de reparto.',
  },
  // ── 4. Ilustración y Liberalismo ──
  {
    topic: 4, difficulty: 'BASIC',
    stem: '¿Cuál era la idea central que compartían los pensadores de la Ilustración en el siglo XVIII?',
    correct: 'La razón humana, y no la tradición o la autoridad, debía guiar la sociedad.',
    distractors: [
      'El origen divino del poder de los monarcas debía fortalecerse frente a la crítica.',
      'Las decisiones de gobierno debían basarse solo en la costumbre heredada.',
      'La fe religiosa debía sustituir por completo a la razón en los asuntos de Estado.',
    ],
    layer1: 'Pensadores como Locke, Voltaire, Montesquieu y Rousseau situaron a la razón y la observación empírica como criterio para juzgar instituciones, leyes y creencias, cuestionando la autoridad basada solo en la tradición o el derecho divino.',
    layer2: 'Esta primacía de la razón alimentó después demandas concretas de reforma política: constituciones escritas, división de poderes, límites al poder absoluto.',
    layer3: 'No buscaban fortalecer el derecho divino de los reyes, lo cuestionaban; no defendían la costumbre como única guía, la sometían a crítica racional; y no proponían sustituir la razón por la fe, sino lo contrario.',
  },
  {
    topic: 4, difficulty: 'INTERMEDIATE',
    stem: '¿Qué aportó la independencia de Estados Unidos (1776) al pensamiento político liberal de la época?',
    correct: 'Demostró que era posible fundar una república sin monarca, con constitución escrita.',
    distractors: [
      'Confirmó que solo una monarquía absoluta podía dar orden a un territorio extenso.',
      'Fue el primer país en abolir toda forma de esclavitud al independizarse.',
      'Mantuvo sin cambios el mismo sistema político colonial que tenía con Gran Bretaña.',
    ],
    layer1: 'La Constitución de 1787 estableció una república federal con división de poderes, sin monarca, aplicando en la práctica ideas que hasta entonces eran sobre todo teóricas en Europa.',
    layer2: 'Esta experiencia influyó de forma directa en el ciclo de revoluciones atlánticas que siguió, incluida la francesa.',
    layer3: 'No confirmó la necesidad de una monarquía absoluta, sino lo contrario; la esclavitud persistió en Estados Unidos hasta 1865, no se abolió con la independencia; y el sistema político cambió radicalmente, de colonia a república constitucional.',
  },
  {
    topic: 4, difficulty: 'INTERMEDIATE',
    stem: '¿Qué combinación de causas explica el estallido de la Revolución francesa en 1789?',
    correct: 'Una crisis fiscal, la desigualdad estamental y una crisis de subsistencias.',
    distractors: [
      'Una prosperidad económica sostenida que generó demandas de participación.',
      'La convocatoria de los Estados Generales por Luis XVI para ceder el trono.',
      'El hecho de que la nobleza y el clero pagaban la mayor parte de los impuestos.',
    ],
    layer1: 'Una deuda estatal agravada por guerras (incluido el apoyo a la independencia estadounidense), un sistema fiscal que eximía en gran medida a la nobleza y el clero, y malas cosechas que encarecieron el pan en 1788-1789 confluyeron en el estallido revolucionario.',
    layer2: 'La convocatoria de los Estados Generales en 1789 buscaba resolver la crisis fiscal, no ceder el trono; el proceso escaló hacia la Revolución a partir de ese punto.',
    layer3: 'No hubo prosperidad sostenida, sino crisis; Luis XVI no convocó los Estados Generales para abdicar, sino para atender las finanzas del reino; y la nobleza y el clero pagaban proporcionalmente menos impuestos, no más, lo cual era parte central de la desigualdad.',
  },
  {
    topic: 4, difficulty: 'ADVANCED',
    stem: '¿Qué elemento distinguió a las revoluciones de 1848 en Europa de los movimientos liberales anteriores?',
    correct: 'La aparición de la \'cuestión social\': demandas obreras además de las políticas.',
    distractors: [
      'Fueron movimientos organizados solo por la aristocracia para restaurar el absolutismo.',
      'Se limitaron a reclamos religiosos, sin demanda política o económica alguna.',
      'Lograron de inmediato y de forma duradera todas sus demandas en cada país.',
    ],
    layer1: 'A las demandas liberales tradicionales (constituciones, sufragio) se sumó, por primera vez con fuerza, la exigencia de mejores condiciones económicas de los trabajadores urbanos surgidos de la industrialización temprana.',
    layer2: 'Pese a su extensión (Francia, los estados alemanes, el Imperio austriaco, los estados italianos), la mayoría de estos levantamientos fueron sofocados en uno o dos años y el orden de la Restauración se reimpuso en el corto plazo.',
    layer3: 'No fueron movimientos aristocráticos a favor del absolutismo, sino en su contra; las demandas eran centralmente políticas y económicas, no religiosas; y no triunfaron de forma inmediata y duradera, la mayoría fue derrotada en el corto plazo.',
  },
  {
    topic: 4, difficulty: 'INTERMEDIATE',
    stem: '¿Qué tuvieron en común los procesos de unificación de Italia y Alemania en el siglo XIX?',
    correct: 'Ambos fueron liderados desde arriba por un Estado dominante, no por una revuelta popular.',
    distractors: [
      'Ambos se lograron solo mediante plebiscitos pacíficos, sin ningún conflicto armado.',
      'Ambos fueron impulsados por el Imperio austriaco como potencia unificadora.',
      'Ambos culminaron antes de las revoluciones liberales de 1848.',
    ],
    layer1: 'Piamonte-Cerdeña (con Cavour, apoyado por las expediciones de Garibaldi) condujo la unificación italiana (1859-1870) y Prusia (con Bismarck) la alemana mediante una serie de guerras que culminaron en 1871 — ambas conducidas por un Estado dominante, no por una revuelta popular generalizada.',
    layer2: 'Contrastan con los fallidos levantamientos nacionalistas de 1848, que fueron populares pero no lograron la unificación.',
    layer3: 'Ambos procesos incluyeron guerras significativas, no fueron solo plebiscitos pacíficos; Austria fue justamente la potencia rival, derrotada y excluida en ambos procesos, no su impulsora; y ambos culminaron décadas después de 1848 (1861 y 1871), no antes.',
  },
  {
    topic: 4, difficulty: 'INTERMEDIATE',
    stem: '¿Qué papel jugó la invasión napoleónica a España en 1808 en el proceso de independencia de las colonias hispanoamericanas?',
    correct: 'Provocó una crisis de legitimidad que las colonias usaron para formar juntas propias.',
    distractors: [
      'Fortaleció de inmediato la autoridad del rey español sobre sus colonias.',
      'Fue un hecho aislado, sin relación alguna con el independentismo americano.',
      'Unificó a España y sus colonias bajo un solo gobierno republicano permanente.',
    ],
    layer1: 'Al forzar la abdicación de Fernando VII e imponer a José Bonaparte, Napoleón dejó sin un rey legítimo reconocido al imperio español; ciudades americanas formaron juntas que decían gobernar en su nombre, un proceso que en la década siguiente derivó en movimientos de independencia plena (San Martín, Bolívar, entre otros).',
    layer2: 'Este episodio se inscribe en el ciclo más amplio de las revoluciones atlánticas que conecta procesos europeos y americanos de la época.',
    layer3: 'No fortaleció la autoridad real, la debilitó gravemente; no fue un hecho aislado, fue el detonante directo de las juntas americanas; y España y sus colonias no se unificaron bajo una república, las colonias terminaron separándose como repúblicas independientes.',
  },
  // ── 5. Industrialización ──
  {
    topic: 5, difficulty: 'INTERMEDIATE',
    stem: '¿Por qué la Revolución Industrial se originó primero en Gran Bretaña hacia finales del siglo XVIII?',
    correct: 'La confluencia de capital, yacimientos de carbón e hierro, y mano de obra libre.',
    distractors: [
      'El gobierno británico prohibió cualquier comercio exterior para proteger la industria.',
      'Gran Bretaña carecía por completo de recursos minerales y dependía de importarlos.',
      'Fue el único país europeo que mantenía vigente la servidumbre feudal.',
    ],
    layer1: 'Capital acumulado del comercio, yacimientos propios de carbón e hierro, una agricultura ya transformada que liberó mano de obra, y mercados coloniales existentes se combinaron con innovaciones técnicas como la máquina de vapor.',
    layer2: 'Ningún otro país europeo reunía en ese momento esa combinación completa de factores.',
    layer3: 'Gran Bretaña era un país comercialmente muy abierto, no cerrado al exterior; poseía yacimientos minerales propios, no dependía de importarlos; y había dejado atrás la servidumbre feudal antes que buena parte de Europa continental, lo que facilitó una mano de obra más móvil.',
  },
  {
    topic: 5, difficulty: 'BASIC',
    stem: '¿Qué cambio social produjo la industrialización en la estructura de la sociedad europea del siglo XIX?',
    correct: 'El paso de estamentos jurídicos a clases sociales según la relación con la propiedad.',
    distractors: [
      'La desaparición completa de cualquier desigualdad económica entre los grupos.',
      'El regreso a una sociedad organizada solo por linajes nobiliarios hereditarios.',
      'La eliminación total del trabajo asalariado en las nuevas fábricas urbanas.',
    ],
    layer1: 'De una sociedad de estamentos (nobleza, clero, común) definidos por ley, se pasó a una sociedad de clases (burguesía industrial, proletariado) definidas por su relación con la propiedad de los medios de producción.',
    layer2: 'Esta nueva estructura de clases es la base de los conflictos y movimientos sociales que documentaron observadores contemporáneos de la época.',
    layer3: 'No desapareció la desigualdad, cambió de forma; no hubo un regreso a la nobleza hereditaria, el movimiento fue en sentido contrario; y el trabajo asalariado en fábrica es justamente el rasgo definitorio de la nueva clase obrera, no algo que desapareciera.',
  },
  {
    topic: 5, difficulty: 'INTERMEDIATE',
    stem: '¿Qué motivación económica impulsó el imperialismo europeo de finales del siglo XIX?',
    correct: 'Materias primas baratas, nuevos mercados e inversión de capitales excedentes.',
    distractors: [
      'El deseo de las potencias europeas de reducir por completo su producción industrial.',
      'La necesidad de importar mano de obra calificada desde las colonias a Europa.',
      'El interés exclusivo en territorios sin ningún valor económico real.',
    ],
    layer1: 'Las economías industriales necesitaban materias primas (caucho, algodón, minerales), mercados donde colocar sus manufacturas y destinos para capitales acumulados — motivaciones económicas que se sumaron a las de prestigio nacional y estrategia militar.',
    layer2: 'Esta lógica económica explica en buena medida la intensidad y el momento del llamado "nuevo imperialismo" (1870-1914).',
    layer3: 'El imperialismo buscaba sostener y expandir la producción industrial, no reducirla; la mano de obra colonial se explotaba sobre todo en el lugar, no se importaba como fuerza calificada a Europa; y los territorios se buscaban precisamente por su valor económico.',
  },
  {
    topic: 5, difficulty: 'BASIC',
    stem: '¿Qué acordaron las potencias europeas en la Conferencia de Berlín (1884-1885)?',
    correct: 'Las reglas para repartirse África entre ellas, sin consultar a sus pueblos.',
    distractors: [
      'La independencia inmediata de todos los territorios coloniales en África.',
      'Una alianza militar africana para resistir juntos la colonización europea.',
      'La prohibición total de cualquier nueva ocupación colonial en el continente.',
    ],
    layer1: 'La conferencia estableció principios como el de "ocupación efectiva" para que las potencias europeas se repartieran África, trazando fronteras sin ninguna representación de los pueblos africanos.',
    layer2: 'En las dos décadas siguientes, casi todo el continente quedó bajo control colonial europeo, con fronteras que a menudo ignoraban las divisiones étnicas y políticas existentes.',
    layer3: 'No se acordó ninguna independencia, sino lo contrario; no fue una alianza africana, sino una reunión exclusiva de potencias europeas; y no se prohibió la ocupación, se establecieron precisamente las reglas para acelerarla.',
  },
  {
    topic: 5, difficulty: 'INTERMEDIATE',
    stem: '¿Qué función cumplió la idea de la "misión civilizadora" en el discurso imperialista europeo?',
    correct: 'Justificó la dominación colonial presentándola como progreso y tutela.',
    distractors: [
      'Reconoció la igualdad jurídica plena entre europeos y pueblos colonizados.',
      'Sirvió para que las potencias europeas renunciaran voluntariamente a sus colonias.',
      'Fue una crítica interna europea que rechazaba por completo la expansión colonial.',
    ],
    layer1: 'La "mission civilisatrice" presentaba la dominación colonial como una tutela benevolente hacia pueblos considerados inferiores, apoyada en jerarquías raciales de la época, y servía para legitimar la explotación económica y política real.',
    layer2: 'Este discurso se usó de forma sistemática para justificar el imperialismo ante la opinión pública europea, dentro del aparato ideológico del "nuevo imperialismo".',
    layer3: 'No planteaba igualdad jurídica, se basaba en una jerarquía asumida; no llevó a renunciar a las colonias, sirvió para justificar conservarlas y ampliarlas; y no era una crítica anticolonial, era propaganda a favor del colonialismo.',
  },
  {
    topic: 5, difficulty: 'INTERMEDIATE',
    stem: '¿Qué respuesta organizada surgió entre los trabajadores urbanos frente a las condiciones de las fábricas durante la industrialización del siglo XIX?',
    correct: 'La formación de sindicatos y partidos obreros que exigieron mejoras laborales.',
    distractors: [
      'El regreso masivo y voluntario de los obreros urbanos al trabajo agrícola.',
      'La abolición inmediata del trabajo asalariado por decisión de los empresarios.',
      'La desaparición total de cualquier protesta obrera durante todo el siglo XIX.',
    ],
    layer1: 'Ante jornadas extenuantes, salarios bajos y condiciones inseguras, los trabajadores se organizaron en sindicatos y movimientos políticos (como el cartismo británico y después partidos socialistas) que exigieron reformas laborales concretas.',
    layer2: 'Estas organizaciones lograron, de manera gradual, límites legales a la jornada, regulaciones de seguridad y la extensión del sufragio a lo largo de las décadas siguientes.',
    layer3: 'No hubo un regreso masivo al campo, la población obrera urbana creció; los empresarios no abolieron el trabajo asalariado, era la base de su beneficio; y la protesta obrera no desapareció, creció de forma organizada durante todo el siglo.',
  },
  // ── 6. Guerras Mundiales ──
  {
    topic: 6, difficulty: 'INTERMEDIATE',
    stem: '¿Por qué el asesinato del archiduque Francisco Fernando en Sarajevo (junio de 1914) desencadenó una guerra continental y no solo un conflicto entre Austria-Hungría y Serbia?',
    correct: 'El sistema de alianzas y la rivalidad imperialista arrastraron a las demás potencias.',
    distractors: [
      'Un tratado obligaba a todas las potencias a intervenir solo en asesinatos de la realeza.',
      'El archiduque era el heredero designado de todas las coronas de Europa.',
      'No existía ninguna tensión previa entre las potencias antes de 1914.',
    ],
    layer1: 'El asesinato fue el detonante, no la causa profunda: el sistema de alianzas (Triple Alianza y Triple Entente), la carrera armamentista y las rivalidades coloniales e imperialistas acumuladas hicieron que la movilización de un país arrastrara, por obligación de alianza, a los demás.',
    layer2: 'Los historiadores distinguen justamente entre esta "causa inmediata" (el detonante) y las "causas estructurales" de fondo (alianzas, imperialismo, militarismo, nacionalismo).',
    layer3: 'No existía un tratado limitado a asesinatos de la realeza, las alianzas eran pactos generales de defensa mutua; el archiduque era heredero solo de Austria-Hungría, no de otras coronas; y las tensiones previas (guerras balcánicas, rivalidad colonial) llevaban décadas acumulándose.',
  },
  {
    topic: 6, difficulty: 'INTERMEDIATE',
    stem: '¿Qué condición creada por la Primera Guerra Mundial aprovecharon los bolcheviques para tomar el poder en Rusia en octubre de 1917?',
    correct: 'El agotamiento militar, el hambre y el descrédito del gobierno provisional.',
    distractors: [
      'La victoria militar rusa sobre Alemania, que fortaleció al gobierno provisional.',
      'La prosperidad económica generada por el esfuerzo bélico ruso durante la guerra.',
      'El apoyo unánime del ejército y el campesinado al zar hasta 1917.',
    ],
    layer1: 'Las bajas masivas, la escasez de alimentos y el fracaso del gobierno provisional en salir de la guerra tras la caída del zar (febrero de 1917) generaron un descontento que los bolcheviques capitalizaron con la consigna de "paz, tierra y pan".',
    layer2: 'La crisis provocada por la guerra, más que solo la organización bolchevique, es la condición estructural que explica la toma del poder de octubre de 1917.',
    layer3: 'Rusia no obtuvo una victoria militar, sufrió derrotas y bajas severas; no hubo prosperidad económica, la crisis era profunda; y para 1917 el zar ya había perdido el apoyo suficiente como para ser depuesto en febrero de ese mismo año.',
  },
  {
    topic: 6, difficulty: 'ADVANCED',
    stem: '¿De qué manera las condiciones impuestas a Alemania por el Tratado de Versalles (1919) contribuyeron, años después, al ascenso del nazismo?',
    correct: 'Las reparaciones y la pérdida territorial alimentaron un resentimiento nacionalista.',
    distractors: [
      'El tratado eximió a Alemania de cualquier pago o responsabilidad por la guerra.',
      'El tratado devolvió a Alemania todas las colonias que tenía antes de 1914.',
      'El ascenso del nazismo no tuvo relación alguna con las condiciones del tratado.',
    ],
    layer1: 'Las reparaciones económicas, la pérdida de territorios y colonias, y la cláusula de "culpa de guerra" (artículo 231) alimentaron un resentimiento nacionalista que la propaganda nazi explotó, junto con la crisis económica de 1929 y la debilidad institucional de la República de Weimar.',
    layer2: 'Los historiadores tratan Versalles como un factor contribuyente entre varios, no como la causa única del nazismo, para no simplificar en exceso un fenómeno con múltiples raíces.',
    layer3: 'El tratado no eximió a Alemania, le impuso reparaciones cuantiosas; no le devolvió sus colonias, las perdió bajo mandatos de las potencias aliadas; y la relación entre Versalles y el ascenso nazi está ampliamente documentada, aunque no sea la única causa.',
  },
  {
    topic: 6, difficulty: 'INTERMEDIATE',
    stem: '¿Qué papel jugó la política de apaciguamiento de Francia y Gran Bretaña en la escalada hacia la Segunda Guerra Mundial?',
    correct: 'Al ceder ante las anexiones alemanas sin resistencia, envalentonó su expansión.',
    distractors: [
      'Detuvo por completo cualquier intento posterior de expansión territorial alemana.',
      'Consistió en una declaración de guerra inmediata contra Alemania desde 1935.',
      'Fue una política diseñada por Alemania para frenar a Francia y Gran Bretaña.',
    ],
    layer1: 'El Acuerdo de Múnich (1938), que cedió los Sudetes a Alemania para evitar la guerra, no satisfizo las ambiciones de Hitler: siguió la ocupación del resto de Checoslovaquia y, en septiembre de 1939, la invasión de Polonia que dio inicio formal a la guerra.',
    layer2: 'Es un caso ampliamente estudiado de cómo una política de concesiones diseñada para evitar el conflicto terminó facilitando su escalada.',
    layer3: 'No detuvo la expansión alemana, la escalada continuó tras cada concesión; no hubo declaración de guerra inmediata en 1935, el apaciguamiento consistió precisamente en evitar la confrontación durante años; y fue una política francobritánica, no alemana.',
  },
  {
    topic: 6, difficulty: 'ADVANCED',
    stem: '¿Qué distingue al Holocausto de otros episodios de violencia antisemita anteriores en la historia europea?',
    correct: 'Fue un exterminio sistemático, organizado por el Estado con maquinaria industrial.',
    distractors: [
      'Se trató de actos aislados y espontáneos, sin planeación del gobierno alemán.',
      'Fue una política aplicada solo fuera del territorio controlado por Alemania.',
      'No involucró ninguna estructura estatal ni institucional del régimen nazi.',
    ],
    layer1: 'A diferencia de pogromos anteriores, el Holocausto implicó una planeación estatal coordinada (como la conferencia de Wannsee, 1942) con ministerios, ferrocarriles y campos diseñados específicamente para el exterminio masivo.',
    layer2: 'Ese carácter sistemático e industrializado, junto con la escala (cerca de seis millones de víctimas judías, además de otros grupos perseguidos), es lo que los historiadores destacan como distintivo del fenómeno.',
    layer3: 'No fueron actos espontáneos, hubo una planeación estatal explícita; ocurrió ampliamente dentro del territorio controlado por Alemania, incluidos los campos en la Polonia ocupada; y estuvo profundamente integrado en el aparato del Estado nazi.',
  },
  {
    topic: 6, difficulty: 'BASIC',
    stem: '¿Qué llevó a la rendición de Japón en agosto de 1945, poniendo fin a la Segunda Guerra Mundial?',
    correct: 'Los bombardeos atómicos y la declaración de guerra soviética contra Japón.',
    distractors: [
      'Una invasión terrestre aliada exitosa del territorio japonés antes de agosto.',
      'Un tratado de paz firmado de forma voluntaria antes de cualquier ataque aliado.',
      'La retirada unilateral de todas las tropas japonesas sin condición alguna.',
    ],
    layer1: 'Los bombardeos atómicos de Hiroshima (6 de agosto) y Nagasaki (9 de agosto de 1945), junto con la entrada soviética en la guerra contra Japón esos mismos días, llevaron al anuncio de rendición japonesa el 15 de agosto.',
    layer2: 'La rendición se firmó de forma definitiva el 2 de septiembre de 1945, sin que llegara a producirse la invasión terrestre que los Aliados tenían planeada (Operación Downfall).',
    layer3: 'No hubo una invasión terrestre exitosa previa, nunca llegó a ejecutarse; Japón no firmó un tratado voluntario antes de los ataques, la rendición vino después de ellos; y no fue una retirada unilateral sin condiciones, sino una rendición formal tras esos hechos.',
  },
  {
    topic: 6, difficulty: 'INTERMEDIATE',
    stem: '¿Qué transformación geopolítica global se derivó del fin de la Segunda Guerra Mundial en 1945?',
    correct: 'Un orden bipolar entre Estados Unidos y la URSS, y el inicio de la descolonización.',
    distractors: [
      'El regreso de Europa occidental a su posición de potencia dominante única.',
      'La disolución inmediata de todos los imperios coloniales europeos en 1945.',
      'El fortalecimiento de Alemania y Japón como las principales potencias militares.',
    ],
    layer1: 'La guerra dejó a Europa devastada y debilitada, mientras Estados Unidos y la URSS emergieron como las dos superpotencias dominantes; al mismo tiempo, el debilitamiento de las potencias coloniales europeas aceleró los movimientos de independencia en Asia y África en las décadas siguientes.',
    layer2: 'Este doble proceso —bipolaridad y descolonización— es la transformación geopolítica más citada del periodo de posguerra inmediato.',
    layer3: 'Europa occidental no recuperó una posición de potencia dominante única, su peso relativo disminuyó; la descolonización fue un proceso gradual de décadas, no una disolución inmediata en 1945; y Alemania y Japón salieron derrotados y ocupados, no fortalecidos.',
  },
  {
    topic: 6, difficulty: 'INTERMEDIATE',
    stem: '¿Qué marcó el anuncio de la Doctrina Truman en 1947 dentro de la política exterior estadounidense de posguerra?',
    correct: 'El compromiso de contener al comunismo mediante ayuda económica y militar.',
    distractors: [
      'La decisión de Estados Unidos de retirarse por completo de Europa.',
      'Una alianza militar formal entre Estados Unidos y la URSS para gobernar Europa.',
      'El reconocimiento estadounidense de la URSS como aliado permanente de posguerra.',
    ],
    layer1: 'En marzo de 1947, Truman prometió apoyo económico y militar (inicialmente a Grecia y Turquía) para contener la expansión comunista, formalizando la política de "contención" que definiría buena parte de la Guerra Fría.',
    layer2: 'El inicio exacto de la Guerra Fría se sitúa de forma distinta según el historiador (las tensiones de 1945, el discurso de Churchill de 1946, o esta doctrina de 1947); por eso este reactivo se ancla en un hito documentado y no disputado —la Doctrina Truman— en vez de pedir un único "año de inicio".',
    layer3: 'No hubo retiro de los asuntos europeos, la doctrina implicó justamente mayor involucramiento; no fue una alianza con la URSS, sino una política explícitamente dirigida a contenerla; y Estados Unidos trató a la URSS como rival a contener, no como aliado permanente.',
  },
  // ── 7. Siglo XXI ──
  {
    topic: 7, difficulty: 'BASIC',
    stem: '¿Qué diferencia hay entre la caída del Muro de Berlín (1989) y la disolución de la URSS (1991)?',
    correct: 'La caída del Muro cerró la división europea; la URSS se disolvió dos años después.',
    distractors: [
      'Son el mismo acontecimiento, ocurrido de forma simultánea en 1989.',
      'La disolución de la URSS ocurrió antes que la caída del Muro de Berlín.',
      'Ambos hechos se refieren solo a la reunificación de Alemania.',
    ],
    layer1: 'La caída del Muro (noviembre de 1989) marcó el fin simbólico de la división de Alemania y de Europa; la disolución formal de la URSS (diciembre de 1991), con la renuncia de Gorbachov, puso fin al propio Estado soviético dos años después, un hito distinto y posterior.',
    layer2: 'Ambos son frecuentemente confundidos como un solo evento, cuando en realidad marcan etapas separadas del fin de la bipolaridad de la Guerra Fría.',
    layer3: 'No son el mismo evento, ocurrieron con dos años de diferencia; la caída del Muro ocurrió primero, no la disolución soviética; y la disolución de la URSS concierne a todo el bloque soviético, no solo a la reunificación alemana.',
  },
  {
    topic: 7, difficulty: 'BASIC',
    stem: '¿Qué caracteriza a la globalización económica como proceso del mundo contemporáneo?',
    correct: 'La interconexión creciente de mercados, capitales, producción y comunicaciones.',
    distractors: [
      'El cierre progresivo de fronteras comerciales entre los países del mundo.',
      'La desaparición completa del comercio internacional entre regiones.',
      'La producción de bienes limitada solo al mercado interno de cada país.',
    ],
    layer1: 'La globalización se acelera tras el fin de la Guerra Fría y con la revolución digital, integrando cadenas de producción, mercados financieros y comunicaciones a nivel mundial.',
    layer2: 'Es un fenómeno con efectos debatidos (crecimiento económico frente a desigualdad y homogeneización cultural), pero su rasgo definitorio es la interconexión, no el aislamiento.',
    layer3: 'No se trata de cerrar fronteras, sino de abrirlas e interconectarlas; el comercio internacional no desapareció, se expandió de forma notable; y las cadenas de producción globales, no la producción puramente doméstica, son su rasgo característico.',
  },
  {
    topic: 7, difficulty: 'INTERMEDIATE',
    stem: '¿Qué distingue a la Unión Europea de una alianza tradicional entre Estados soberanos?',
    correct: 'Sus miembros ceden parte de su soberanía a instituciones supranacionales comunes.',
    distractors: [
      'Sus miembros mantienen intacta, sin ninguna cesión, toda su soberanía nacional.',
      'Se trata de un tratado militar de carácter exclusivamente defensivo.',
      'Solo coordina políticas culturales, sin institución política o económica común.',
    ],
    layer1: 'Con el Tratado de Maastricht (1993) y sus desarrollos posteriores, la UE creó instituciones con autoridad real sobre sus miembros (mercado común, moneda única para la eurozona, Parlamento, Tribunal de Justicia), a diferencia de una simple alianza intergubernamental.',
    layer2: 'Esta cesión parcial de soberanía es el ejemplo más citado de "integración supranacional" en el mundo contemporáneo.',
    layer3: 'No hay soberanía intacta, la cesión parcial es su rasgo definitorio; no es un tratado militar defensivo (ese es el papel de la OTAN, una organización distinta); y va mucho más allá de la coordinación cultural, con instituciones económicas y políticas propias.',
  },
  {
    topic: 7, difficulty: 'BASIC',
    stem: '¿Por qué se dice que desafíos como el cambio climático son "transnacionales" en el mundo contemporáneo?',
    correct: 'Sus causas y efectos cruzan las fronteras y exigen cooperación entre países.',
    distractors: [
      'Afectan de forma exclusiva a un solo país, sin consecuencia externa alguna.',
      'Pueden resolverse por completo con la acción de un único gobierno nacional.',
      'Solo los países más pobres del mundo contribuyen a generarlos.',
    ],
    layer1: 'Las emisiones y sus efectos no respetan fronteras, por lo que su atención requiere marcos multilaterales como el Acuerdo de París, y no solo decisiones aisladas de un país.',
    layer2: 'Este rasgo transnacional distingue a los desafíos contemporáneos (cambio climático, pandemias, ciberseguridad) de problemas que sí pueden resolverse dentro de las fronteras de un solo Estado.',
    layer3: 'No son problemas exclusivos de un país, por definición cruzan fronteras; no pueden resolverse con la acción de un solo gobierno, requieren cooperación; y las naciones industrializadas, no las más pobres, han contribuido históricamente de forma desproporcionada a las emisiones.',
  },
  {
    topic: 7, difficulty: 'INTERMEDIATE',
    stem: '¿Qué tendencia geopolítica ejemplifica el ascenso económico de China desde finales del siglo XX?',
    correct: 'El desplazamiento gradual hacia un orden más multipolar, fuera de Europa y EE. UU.',
    distractors: [
      'El regreso a un mundo bipolar idéntico a la Guerra Fría, ahora como aliados militares.',
      'La consolidación de un solo poder económico mundial, sin competidor relevante.',
      'El aislamiento comercial total de China respecto del resto del mundo.',
    ],
    layer1: 'Las reformas económicas iniciadas hacia finales de la década de 1970 y la integración de China al comercio mundial la convirtieron, junto con otras economías emergentes, en un polo de peso económico creciente fuera del eje tradicional Europa-Estados Unidos.',
    layer2: 'Esta tendencia hacia la multipolaridad contrasta tanto con la bipolaridad de la Guerra Fría como con la idea de un mundo unipolar dominado por una sola potencia tras 1991.',
    layer3: 'China y Estados Unidos no son aliados militares, la relación es de competencia, no una bipolaridad tipo Guerra Fría; no hay un solo poder económico sin competidores, justo lo contrario; y el ascenso de China se dio a través de una integración profunda al comercio mundial, no del aislamiento.',
  },
  {
    topic: 7, difficulty: 'BASIC',
    stem: '¿Qué impacto tuvo la expansión de internet y las tecnologías digitales a partir de la década de 1990 en la sociedad contemporánea?',
    correct: 'Aceleró el acceso a la información y transformó la economía, la política y lo social.',
    distractors: [
      'Redujo de forma drástica la velocidad de comunicación entre regiones del mundo.',
      'Se mantuvo limitada al ámbito académico, sin aplicación comercial alguna.',
      'Provocó el aislamiento total de las economías nacionales del comercio mundial.',
    ],
    layer1: 'Desde la difusión de la World Wide Web y, después, la banda ancha y las redes sociales, internet transformó la velocidad y el alcance de la comunicación, habilitó nuevos modelos económicos (comercio electrónico, servicios digitales) y modificó las formas de participación política y social.',
    layer2: 'Es un componente tecnológico central de la globalización contemporánea, junto con la interconexión de mercados descrita en el tema.',
    layer3: 'No redujo la velocidad de comunicación, la aumentó de forma drástica; no se mantuvo limitada al ámbito académico, se comercializó y masificó con rapidez; y no aisló a las economías, profundizó su integración global.',
  },
];
