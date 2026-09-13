// Datos crudos del lote G80 — IPN SOCADM, Geografía (40 reactivos).
// Cada item: { topic, difficulty, stem, correct, distractors:[3], layer1, layer2, layer3 }
// `topic` es el índice 1-5 sobre TOPIC_IDS (ver build.mjs).
//
// Las 4 opciones de cada reactivo se redactaron con longitud comparable a
// propósito (G77): la clave se acortó/alargó según hiciera falta para que
// ninguna de las 4 destacara por tamaño, y se verificó con `analyzeLot`
// (content:validate-batch) antes de insertar, no "a ojo".
//
// Sin SourceChunk disponible para esta materia (TEMARIO_ONLY) — los 5 temas
// sembrados (prisma/seed/ipn.ts::generateTopicsSocadm) tienen 0 fragmentos
// fuente. Los datos geográficos (relieve, hidrografía, cifras de población,
// producción minera, fronteras) se verificaron uno por uno contra fuentes
// consolidadas (INEGI, censo 2020, Servicio Geológico Mexicano) antes de
// redactar los reactivos.

export const TOPIC_IDS = [
  'cmrr1ptz400ez11qdq5i6xd6e', // 1. Geografía física
  'cmrr1pueg00f111qde5yui70o', // 2. Geografía humana
  'cmrr1putv00f311qdvdm1gamr', // 3. Geografía política
  'cmrr1pv9400f511qdv4jlnxjz', // 4. Geografía de México
  'cmrr1pvod00f711qdcg5129wz', // 5. Cartografía
];

export const ITEMS = [
  // ── 1. Geografía física (9) ──
  {
    topic: 1, difficulty: 'BASIC',
    stem: '¿Cuál es la capa más externa y delgada de la estructura interna de la Tierra?',
    correct: 'La corteza, la capa sólida más delgada sobre la que se asientan continentes y océanos.',
    distractors: [
      'El manto superior, la capa más gruesa y de mayor volumen de todo el planeta.',
      'El núcleo externo, la capa líquida rica en hierro y níquel fundidos.',
      'El núcleo interno, la esfera sólida más caliente en el centro del planeta.',
    ],
    layer1: 'La corteza es la capa sólida y más delgada de las cuatro capas terrestres, y sobre ella se asientan los continentes (corteza continental, más gruesa) y el fondo oceánico (corteza oceánica, más delgada).',
    layer2: 'Debajo de la corteza está el manto, la capa de mayor volumen del planeta; más al centro, el núcleo externo líquido genera el campo magnético terrestre, y en el centro mismo está el núcleo interno sólido pese a sus altísimas temperaturas, por la enorme presión que soporta.',
    layer3: 'El manto es mucho más grueso que la corteza, no más delgado; el núcleo externo es líquido, no sólido; y el núcleo interno está en el centro del planeta, no en la superficie — ninguna de las tres es la capa MÁS EXTERNA.',
  },
  {
    topic: 1, difficulty: 'INTERMEDIATE',
    stem: '¿Qué tipo de límite de placas tectónicas se produce cuando dos placas se deslizan lateralmente una respecto a la otra, sin crear ni destruir corteza?',
    correct: 'Un límite transformante, como el que sigue la falla de San Andrés en California.',
    distractors: [
      'Un límite convergente, donde una placa se hunde bajo la otra en subducción.',
      'Un límite divergente, donde el magma asciende y forma nueva corteza oceánica.',
      'Un límite de colisión continental, donde ambas placas se pliegan y elevan cordilleras.',
    ],
    layer1: 'En un límite transformante las placas se rozan lateralmente en direcciones opuestas o a distinta velocidad, sin que se genere corteza nueva (como en un límite divergente) ni se destruya corteza vieja (como en uno convergente) — la falla de San Andrés es el ejemplo más citado.',
    layer2: 'Este roce lateral acumula tensión que se libera de forma súbita en sismos, por eso las zonas de falla transformante son sísmicamente muy activas aunque no tengan volcanes asociados, a diferencia de las zonas de subducción.',
    layer3: 'El convergente sí involucra hundimiento de una placa (subducción) y suele producir volcanes; el divergente crea corteza nueva en dorsales oceánicas; y la colisión continental pliega y eleva montañas — ninguno de los tres describe un simple deslizamiento lateral.',
  },
  {
    topic: 1, difficulty: 'BASIC',
    stem: '¿Cómo se forman las montañas de plegamiento como los Andes o el Himalaya?',
    correct: 'Por la compresión de capas rocosas entre dos placas que convergen y las pliegan.',
    distractors: [
      'Por la acumulación de lava y ceniza expulsadas repetidamente por un mismo volcán.',
      'Por el levantamiento de bloques de corteza entre fallas paralelas verticales.',
      'Por la erosión selectiva del viento sobre rocas de distinta dureza durante milenios.',
    ],
    layer1: 'Cuando dos placas convergen, las capas de roca sedimentaria entre ellas se comprimen y se pliegan hacia arriba en lugar de fracturarse, formando cadenas montañosas alargadas como el Himalaya (India-Asia) o los Andes (Nazca-Sudamericana).',
    layer2: 'El proceso es lento (millones de años) y sigue activo hoy: el Himalaya crece unos milímetros al año porque la placa india continúa empujando contra la euroasiática.',
    layer3: 'La acumulación de lava describe un volcán, no una cordillera plegada; el levantamiento entre fallas describe montañas de bloque (horst); y la erosión selectiva esculpe el relieve existente, pero no lo origina.',
  },
  {
    topic: 1, difficulty: 'INTERMEDIATE',
    stem: 'Además de la latitud, ¿qué otro factor explica que una ciudad situada en la montaña tenga temperaturas más bajas que una ciudad costera a la misma latitud?',
    correct: 'La altitud, porque la temperatura del aire desciende conforme aumenta la altura.',
    distractors: [
      'La longitud, porque determina cuántas horas de luz solar recibe cada punto del planeta.',
      'La cercanía a una falla geológica activa, que libera calor adicional del subsuelo.',
      'La dirección de los vientos dominantes, que enfría siempre las zonas de montaña.',
    ],
    layer1: 'A mayor altitud, la atmósfera es menos densa y retiene menos calor, por lo que la temperatura desciende de forma bastante constante conforme se sube (gradiente térmico vertical), independientemente de la latitud.',
    layer2: 'Por eso puede haber nieve permanente en montañas cercanas al ecuador (como en los Andes o el Kilimanjaro) mientras la costa, a la misma latitud pero a nivel del mar, tiene clima cálido.',
    layer3: 'La longitud no influye en la temperatura, solo en la hora local; una falla activa no calienta el clima de una región entera; y el viento puede enfriar o calentar según de dónde venga, no "siempre" hacia el frío.',
  },
  {
    topic: 1, difficulty: 'BASIC',
    stem: '¿Qué es una cuenca hidrográfica?',
    correct: 'El territorio cuyas aguas de lluvia y deshielo drenan hacia un mismo río o lago.',
    distractors: [
      'El conjunto de presas construidas a lo largo del curso de un río navegable.',
      'La zona costera donde un río se une al mar y forma un delta o un estuario.',
      'El acuífero subterráneo que alimenta los manantiales de una región montañosa.',
    ],
    layer1: 'Una cuenca hidrográfica es el área delimitada por la línea divisoria de aguas (parteaguas) dentro de la cual toda el agua superficial converge hacia un mismo cauce principal, río o lago.',
    layer2: 'El concepto es clave para la gestión del agua: lo que ocurre en cualquier punto de una cuenca (deforestación, contaminación) afecta al río que la drena, aunque ese punto esté lejos del cauce principal.',
    layer3: 'Las presas son obras de infraestructura dentro de una cuenca, no la cuenca misma; el delta o estuario es solo la desembocadura; y el acuífero es agua subterránea, distinta del drenaje superficial que define a la cuenca.',
  },
  {
    topic: 1, difficulty: 'INTERMEDIATE',
    stem: '¿Qué caracteriza principalmente a un bioma de selva tropical frente a uno de desierto?',
    correct: 'Una combinación de altas temperaturas y lluvias abundantes durante todo el año.',
    distractors: [
      'Una vegetación escasa adaptada a suelos volcánicos ricos en minerales.',
      'Una alternancia marcada entre estaciones muy frías y veranos muy secos.',
      'Una altitud elevada que reduce la presión atmosférica y la humedad ambiental.',
    ],
    layer1: 'La selva tropical se define por temperaturas altas y estables todo el año junto con precipitaciones abundantes y constantes, condición que sostiene su enorme biodiversidad vegetal y animal.',
    layer2: 'El desierto, en cambio, se define por la escasez de lluvia (menos de 250 mm anuales en la mayoría de las clasificaciones), sin importar si es cálido como el Sahara o frío como el desierto de Atacama en altura.',
    layer3: 'La vegetación escasa sobre suelo volcánico no es un rasgo distintivo de la selva; la alternancia fría-seca describe más bien un clima de estepa o mediterráneo; y la altitud elevada no es propia de la selva, que suele estar a baja altitud.',
  },
  {
    topic: 1, difficulty: 'INTERMEDIATE',
    stem: '¿Por qué la corriente fría de Humboldt influye en el clima árido de la costa del Perú y el norte de Chile?',
    correct: 'Porque enfría el aire costero y dificulta la formación de lluvias sobre esa franja.',
    distractors: [
      'Porque desvía hacia el océano abierto toda la humedad que viene desde la cordillera.',
      'Porque calienta la superficie del mar y provoca evaporación excesiva hacia el interior.',
      'Porque bloquea el paso de los vientos alisios que normalmente traen lluvia del Atlántico.',
    ],
    layer1: 'La corriente de Humboldt trae agua fría desde el sur, lo que enfría el aire sobre esa franja costera; el aire frío se satura menos de humedad y forma nubes bajas (neblina) en vez de lluvia, dejando la costa muy seca pese a estar junto al mar.',
    layer2: 'Este efecto, sumado a la sombra orográfica de los Andes, explica que el desierto de Atacama, junto a la costa, sea uno de los lugares más secos del planeta.',
    layer3: 'Una corriente fría no desvía la humedad de la cordillera ni bloquea vientos del Atlántico (esa costa mira al Pacífico); y por definición una corriente FRÍA no calienta el mar ni aumenta la evaporación — es justo el efecto contrario.',
  },
  {
    topic: 1, difficulty: 'BASIC',
    stem: '¿Qué condición es indispensable para que se forme un huracán sobre el océano?',
    correct: 'Una superficie oceánica cálida, por encima de los 26 grados centígrados aproximadamente.',
    distractors: [
      'Una corriente marina fría que enfríe rápidamente el aire cercano a la superficie.',
      'Una zona de alta presión atmosférica estable que impida el ascenso del aire húmedo.',
      'Una plataforma continental poco profunda cercana a la costa donde se forma la tormenta.',
    ],
    layer1: 'Un huracán necesita agua oceánica cálida (por lo general arriba de 26°C) que evapore grandes cantidades de humedad; ese aire cálido y húmedo asciende, libera calor al condensarse y alimenta el sistema de baja presión que gira por efecto de la rotación terrestre.',
    layer2: 'Por eso los huracanes se debilitan rápidamente al tocar tierra o al pasar sobre aguas frías: pierden la fuente de calor y humedad que los mantiene activos.',
    layer3: 'Una corriente fría o una zona de alta presión estable inhiben, no favorecen, la formación de un huracán; y la profundidad de la plataforma continental no es la condición determinante, que depende de la temperatura superficial del mar.',
  },
  {
    topic: 1, difficulty: 'ADVANCED',
    stem: 'Según los factores clásicos de formación del suelo, ¿qué papel cumple el clima en ese proceso?',
    correct: 'Controla la velocidad de meteorización de la roca madre mediante temperatura y humedad.',
    distractors: [
      'Determina de forma exclusiva el color final del suelo, sin influir en su composición.',
      'Define únicamente qué cultivos pueden sembrarse, sin intervenir en la formación del suelo.',
      'Sustituye a la roca madre como el material a partir del cual se forma todo el suelo.',
    ],
    layer1: 'El clima (temperatura y precipitación) regula la velocidad con la que la roca madre se rompe física y químicamente en partículas más finas, junto con otros factores como el relieve, los organismos vivos y el tiempo transcurrido.',
    layer2: 'Un clima cálido y húmedo acelera la meteorización química y la actividad biológica, formando suelos más profundos en menos tiempo que un clima frío y seco, donde ese mismo proceso es mucho más lento.',
    layer3: 'El clima influye en el color y la composición del suelo, pero no los determina "de forma exclusiva"; su efecto en qué se puede sembrar es una consecuencia posterior, no su función en la formación del suelo; y la roca madre sigue siendo el material base, el clima solo acelera o frena su transformación.',
  },

  // ── 2. Geografía humana (9) ──
  {
    topic: 2, difficulty: 'BASIC',
    stem: '¿Qué caracteriza a la primera etapa del modelo de transición demográfica?',
    correct: 'Tasas de natalidad y mortalidad altas, con un crecimiento poblacional lento.',
    distractors: [
      'Tasas de natalidad baja y mortalidad alta, con la población en descenso constante.',
      'Tasas de natalidad y mortalidad bajas, con una población estable y envejecida.',
      'Tasas de mortalidad baja y natalidad muy alta, con el mayor crecimiento del modelo.',
    ],
    layer1: 'En la primera etapa, tanto la natalidad como la mortalidad son altas (por enfermedades, hambrunas, falta de medicina) y se compensan casi entre sí, dejando un crecimiento poblacional lento pese a que nacen muchos niños.',
    layer2: 'Este patrón describió a la mayoría de las sociedades preindustriales; el modelo pasa después a una segunda etapa donde la mortalidad cae por mejoras en salud pero la natalidad sigue alta, produciendo el mayor crecimiento poblacional del ciclo completo.',
    layer3: 'Natalidad baja con mortalidad alta describiría una población en franco declive, no la etapa inicial; natalidad y mortalidad bajas describen la última etapa, la más envejecida; y mortalidad baja con natalidad muy alta corresponde a la segunda etapa, no a la primera.',
  },
  {
    topic: 2, difficulty: 'INTERMEDIATE',
    stem: '¿Qué indica una pirámide de población con base ancha y cúspide angosta?',
    correct: 'Una población joven con natalidad alta y expectativa de crecimiento futuro.',
    distractors: [
      'Una población envejecida donde predominan los adultos mayores sobre los jóvenes.',
      'Una población estable donde cada grupo de edad tiene un tamaño casi idéntico.',
      'Una población en declive por una migración masiva de personas en edad fértil.',
    ],
    layer1: 'La base de la pirámide representa a los grupos de menor edad; si es ancha, significa que nacen muchos niños cada año, mientras la cúspide angosta indica pocos adultos mayores — el perfil típico de un país con crecimiento demográfico expansivo.',
    layer2: 'Este tipo de pirámide es común en países en vías de desarrollo con alta fecundidad; a medida que un país envejece, la pirámide tiende a volverse más rectangular o incluso invertida (base angosta, cúspide ancha).',
    layer3: 'Una población envejecida produciría el patrón contrario (base angosta); una pirámide de forma rectangular es la que tiene grupos de tamaño similar; y la emigración masiva de jóvenes adelgazaría la base y los tramos intermedios, no los ensancharía.',
  },
  {
    topic: 2, difficulty: 'BASIC',
    stem: "En el estudio de la migración, ¿qué son los llamados factores de 'expulsión'?",
    correct: 'Las condiciones del lugar de origen que empujan a alguien a abandonarlo, como el desempleo.',
    distractors: [
      'Las condiciones del lugar de destino que atraen a un migrante, como mejores salarios.',
      'Las políticas migratorias que un gobierno aplica para frenar la entrada de personas.',
      'Los lazos familiares que motivan a alguien a reunirse con parientes en otro país.',
    ],
    layer1: 'Los factores de expulsión (push) son las condiciones negativas del lugar de origen —desempleo, violencia, desastres, falta de servicios— que impulsan a una persona a emigrar de ahí.',
    layer2: 'Se contrastan con los factores de atracción (pull) del lugar de destino, como mejores salarios, seguridad o educación; casi toda decisión migratoria combina ambos tipos de factores, no solo uno.',
    layer3: 'Las condiciones del destino describen factores de atracción, no de expulsión; las políticas migratorias de un gobierno receptor son una barrera externa, no un factor de expulsión del origen; y los lazos familiares en el destino son también un factor de atracción.',
  },
  {
    topic: 2, difficulty: 'INTERMEDIATE',
    stem: '¿Qué proceso describe mejor el crecimiento acelerado de las ciudades en países en desarrollo durante el siglo XX?',
    correct: 'Una migración masiva del campo a la ciudad en busca de empleo e infraestructura.',
    distractors: [
      'Una redistribución planificada de la población desde las ciudades hacia el campo.',
      'Un crecimiento natural exclusivamente por el aumento de nacimientos urbanos.',
      'Una política de descentralización que trasladó industrias fuera de las capitales.',
    ],
    layer1: 'La urbanización acelerada del siglo XX en países en desarrollo se explica sobre todo por la migración rural-urbana: la mecanización del campo redujo la necesidad de mano de obra agrícola mientras las ciudades ofrecían empleo industrial y servicios.',
    layer2: 'Esta migración, sumada al crecimiento natural de la propia población urbana, produjo ciudades que crecieron mucho más rápido que su capacidad de infraestructura, generando asentamientos irregulares en muchas metrópolis.',
    layer3: 'El proceso real fue del campo HACIA la ciudad, no al revés; el crecimiento natural urbano existió pero no explica por sí solo el ritmo del proceso; y la descentralización industrial fue una política posterior y parcial, no la causa del crecimiento urbano inicial.',
  },
  {
    topic: 2, difficulty: 'BASIC',
    stem: '¿A qué sector económico pertenece la actividad de transformar madera en muebles dentro de una fábrica?',
    correct: 'Al sector secundario, porque transforma una materia prima en un producto elaborado.',
    distractors: [
      'Al sector primario, porque parte de un recurso natural extraído directamente del bosque.',
      'Al sector terciario, porque el mueble terminado se vende después en una tienda.',
      'Al sector cuaternario, porque requiere diseño especializado y conocimiento técnico.',
    ],
    layer1: 'El sector secundario agrupa las actividades de transformación industrial de materias primas en productos terminados; fabricar muebles a partir de madera es un ejemplo clásico de manufactura.',
    layer2: 'La cadena completa suele cruzar varios sectores: la tala del árbol pertenece al sector primario (extracción), la fabricación del mueble al secundario, y su venta final al terciario — cada eslabón se clasifica por lo que hace, no por el producto final.',
    layer3: 'Extraer la madera del bosque sí sería primario, pero transformarla en mueble ya no lo es; vender el mueble en tienda es una actividad terciaria distinta a fabricarlo; y el diseño especializado no convierte por sí solo una manufactura en actividad cuaternaria.',
  },
  {
    topic: 2, difficulty: 'INTERMEDIATE',
    stem: '¿Cuál es un efecto característico de la globalización económica sobre la producción de bienes?',
    correct: 'La fragmentación de la producción en distintos países según ventajas de costo.',
    distractors: [
      'La concentración total de la manufactura mundial en un único país productor.',
      'La eliminación completa del comercio entre países con distinto nivel de desarrollo.',
      'El regreso generalizado a economías cerradas que no dependen de insumos externos.',
    ],
    layer1: 'La globalización permitió fragmentar la producción en "cadenas globales de valor": un mismo producto puede diseñarse en un país, fabricar sus componentes en varios más y ensamblarse en otro distinto, según dónde resulte más barato cada paso.',
    layer2: 'Esto explica por qué un mismo artículo electrónico o automóvil suele llevar la leyenda de estar "ensamblado" en un país con partes de otros varios, un patrón prácticamente inexistente antes de la globalización económica.',
    layer3: 'La globalización no concentra la manufactura en un solo país, sino que la dispersa; tampoco elimina el comercio entre países desiguales, lo intensifica; y aleja a las economías de un modelo cerrado, no las acerca a él.',
  },
  {
    topic: 2, difficulty: 'INTERMEDIATE',
    stem: '¿Cuál es el propósito principal de un tratado de libre comercio entre varios países?',
    correct: 'Reducir aranceles y otras barreras para facilitar el intercambio de bienes entre ellos.',
    distractors: [
      'Unificar la moneda oficial que circula en cada uno de los países participantes.',
      'Fusionar los gobiernos de los países firmantes en una sola autoridad central.',
      'Prohibir la inversión extranjera dentro del territorio de los países miembros.',
    ],
    layer1: 'Un tratado de libre comercio busca eliminar o reducir aranceles, cuotas y otras barreras para que los bienes y servicios circulen con más facilidad entre los países firmantes, aumentando el comercio entre ellos.',
    layer2: 'Es un acuerdo de tipo comercial, no político: los países conservan su propia moneda, su propio gobierno y sus propias leyes; solo acuerdan reglas específicas para el intercambio económico entre ellos.',
    layer3: 'Unificar la moneda corresponde a una unión monetaria, un acuerdo distinto y mucho más profundo; fusionar gobiernos no ocurre en un tratado comercial; y estos tratados suelen fomentar la inversión extranjera entre los firmantes, no prohibirla.',
  },
  {
    topic: 2, difficulty: 'ADVANCED',
    stem: '¿Qué dimensiones combina el Índice de Desarrollo Humano (IDH) de la ONU para medir el bienestar de un país?',
    correct: 'Ingreso per cápita, esperanza de vida al nacer y nivel educativo de la población.',
    distractors: [
      'Producto interno bruto total, superficie territorial y tamaño de las fuerzas armadas.',
      'Tasa de inflación anual, deuda pública total y volumen de exportaciones petroleras.',
      'Número de ciudades grandes, densidad poblacional y extensión de la red carretera.',
    ],
    layer1: 'El IDH combina tres dimensiones del desarrollo humano: una vida larga y saludable (esperanza de vida), acceso a educación (años de escolaridad) y un nivel de vida digno (ingreso per cápita ajustado).',
    layer2: 'Se diseñó justamente para ir más allá de medir solo la riqueza total de un país (como el PIB), reconociendo que dos países con ingresos similares pueden tener niveles de bienestar muy distintos según su salud y educación.',
    layer3: 'El PIB total, la superficie territorial y el tamaño militar no forman parte del IDH; tampoco la inflación, la deuda pública o las exportaciones petroleras; ni el número de ciudades, la densidad o la red carretera — ninguno de esos indicadores mide bienestar humano directamente.',
  },
  {
    topic: 2, difficulty: 'BASIC',
    stem: '¿Qué distingue a la agricultura de subsistencia de la agricultura comercial?',
    correct: 'La de subsistencia produce sobre todo para alimentar a la propia familia campesina.',
    distractors: [
      'La de subsistencia utiliza exclusivamente maquinaria pesada y semillas modificadas.',
      'La de subsistencia se practica solo en grandes extensiones de monocultivo de exportación.',
      'La de subsistencia depende por completo de sistemas de riego artificial a gran escala.',
    ],
    layer1: 'La agricultura de subsistencia tiene como fin principal alimentar a quienes la trabajan y a sus familias, con poco o ningún excedente destinado a la venta; la agricultura comercial, en cambio, se orienta a producir para el mercado.',
    layer2: 'Por eso la de subsistencia suele practicarse en parcelas pequeñas con técnicas tradicionales, mientras la comercial tiende a usar mayor extensión, tecnología e insumos para maximizar el rendimiento vendible.',
    layer3: 'La maquinaria pesada y las semillas modificadas son más propias de la agricultura comercial tecnificada; el monocultivo de exportación en grandes extensiones también describe a la comercial; y el riego artificial a gran escala es una inversión típica de sistemas comerciales, no de subsistencia.',
  },

  // ── 3. Geografía política (7) ──
  {
    topic: 3, difficulty: 'BASIC',
    stem: '¿Cuáles son los cuatro elementos que la geografía política reconoce como constitutivos de un Estado?',
    correct: 'Territorio definido, población permanente, gobierno organizado y soberanía reconocida.',
    distractors: [
      'Territorio extenso, ejército numeroso, moneda propia y una sola lengua oficial.',
      'Población numerosa, recursos naturales abundantes, capital histórica y bandera nacional.',
      'Frontera natural, religión oficial, sistema educativo único y una sola etnia dominante.',
    ],
    layer1: 'Un Estado, en el sentido político-jurídico, requiere cuatro elementos: un territorio con límites definidos, una población que habite en él de forma permanente, un gobierno que lo organice y soberanía, es decir, capacidad de autogobernarse sin depender de otro Estado.',
    layer2: 'Ninguno de esos cuatro elementos exige un tamaño mínimo de territorio o población, ni una sola lengua, religión o etnia: existen Estados pequeños, multilingües y multiétnicos que cumplen igualmente con las cuatro condiciones.',
    layer3: 'Un ejército, una moneda o una lengua única no son condición para ser Estado, solo atributos comunes; una capital histórica o una bandera son símbolos, no elementos constitutivos; y una frontera natural, una religión oficial o una etnia dominante tampoco son requisitos jurídicos del Estado.',
  },
  {
    topic: 3, difficulty: 'BASIC',
    stem: '¿Con qué propósito principal se organiza un país en entidades político-administrativas como estados o provincias?',
    correct: 'Para distribuir el gobierno y la administración pública en niveles más manejables.',
    distractors: [
      'Para separar a la población según su origen étnico dentro del mismo territorio.',
      'Para fijar de forma permanente los límites naturales entre distintos climas del país.',
      'Para asignar un idioma exclusivo y distinto a cada una de esas divisiones internas.',
    ],
    layer1: 'La división en estados, provincias o municipios permite descentralizar funciones de gobierno (educación, seguridad, servicios públicos) que serían muy difíciles de administrar de forma centralizada en países extensos o muy poblados.',
    layer2: 'Estas divisiones suelen combinar criterios históricos, geográficos y de gobernabilidad, no un solo factor; su límite no necesariamente coincide con accidentes geográficos ni con fronteras climáticas.',
    layer3: 'Separar a la población por etnia no es el propósito de esta división administrativa; los límites entre climas son un fenómeno físico, no una decisión político-administrativa; y ninguna división interna moderna asigna un idioma exclusivo distinto por región como criterio de organización.',
  },
  {
    topic: 3, difficulty: 'INTERMEDIATE',
    stem: '¿Qué diferencia a una frontera natural de una frontera artificial entre dos países?',
    correct: 'La natural sigue un accidente geográfico, como un río o una cordillera, y la artificial no.',
    distractors: [
      'La natural siempre coincide con un límite histórico colonial, y la artificial nunca.',
      'La natural la establece un tratado internacional, y la artificial la fija un solo país.',
      'La natural es más antigua que la artificial en absolutamente todos los casos conocidos.',
    ],
    layer1: 'Una frontera natural aprovecha un elemento del relieve o la hidrografía (un río, una cadena montañosa) como límite entre países, mientras una frontera artificial se traza sin seguir un accidente geográfico, muchas veces como una línea recta sobre un paralelo o meridiano.',
    layer2: 'Ambos tipos de frontera pueden establecerse por tratado internacional y pueden tener origen colonial o no: lo que distingue a una de otra es únicamente si sigue o no un accidente geográfico visible.',
    layer3: 'El origen colonial puede darse en fronteras naturales y en artificiales por igual; ambas requieren normalmente un tratado o acuerdo entre los países, y ninguna se fija unilateralmente por un solo país; y la antigüedad no es lo que las distingue, sino su trazo respecto al relieve.',
  },
  {
    topic: 3, difficulty: 'ADVANCED',
    stem: '¿Qué derechos otorga a un país la Zona Económica Exclusiva (ZEE) sobre el mar adyacente a su costa?',
    correct: 'El aprovechamiento preferente de los recursos pesqueros y minerales hasta 200 millas náuticas.',
    distractors: [
      'La soberanía plena e ilimitada sobre esas aguas, igual que sobre su territorio terrestre.',
      'El derecho exclusivo a que ningún otro barco navegue jamás por esa franja de océano.',
      'La propiedad automática de cualquier isla que se descubra dentro de esa misma franja.',
    ],
    layer1: 'La Convención de las Naciones Unidas sobre el Derecho del Mar reconoce a cada país costero una Zona Económica Exclusiva de hasta 200 millas náuticas desde su costa, dentro de la cual tiene derechos preferentes para explotar recursos pesqueros, petroleros y minerales.',
    layer2: 'Este derecho es económico, no de soberanía plena: otros países conservan libertad de navegación y de sobrevuelo dentro de esa misma franja, a diferencia de lo que ocurre en el mar territorial (las primeras 12 millas náuticas), donde sí hay soberanía casi total.',
    layer3: 'La ZEE no da soberanía ilimitada como en tierra firme, ni impide la navegación de otros países; y no otorga automáticamente la propiedad de cualquier isla dentro de la franja, cuya soberanía se determina por reglas propias del derecho internacional.',
  },
  {
    topic: 3, difficulty: 'INTERMEDIATE',
    stem: '¿Por qué un estrecho como el de Ormuz o el de Malaca tiene tanta importancia geopolítica?',
    correct: 'Porque concentra una parte enorme del tránsito marítimo mundial de mercancías o petróleo.',
    distractors: [
      'Porque en sus orillas se ubican las capitales políticas de las principales potencias.',
      'Porque ahí se concentra la mayor reserva mundial de agua dulce apta para consumo.',
      'Porque ningún país costero ha logrado nunca ejercer soberanía sobre esas aguas.',
    ],
    layer1: 'Estos estrechos son pasos marítimos angostos por los que debe transitar obligatoriamente una parte muy grande del comercio mundial (petróleo en el caso de Ormuz, mercancías de Asia en el caso de Malaca), lo que los vuelve puntos estratégicos de control económico y militar.',
    layer2: 'Cualquier interrupción o conflicto en uno de estos pasos afecta de inmediato el precio y la disponibilidad de bienes a escala global, por eso las potencias vigilan tan de cerca su seguridad y libre tránsito.',
    layer3: 'Ninguno de esos estrechos concentra capitales políticas ni reservas de agua dulce; y los países costeros sí ejercen soberanía sobre parte de esas aguas conforme al derecho marítimo internacional, aunque garanticen el paso inocente de otros barcos.',
  },
  {
    topic: 3, difficulty: 'BASIC',
    stem: '¿Cuál es una de las funciones principales de la Organización de las Naciones Unidas?',
    correct: 'Mediar en conflictos internacionales y promover la cooperación entre los países miembros.',
    distractors: [
      'Fijar de manera obligatoria las fronteras territoriales de todos sus países miembros.',
      'Administrar directamente la economía interna de los países que solicitan su ayuda.',
      'Sustituir a los gobiernos nacionales en la toma de decisiones internas de cada país.',
    ],
    layer1: 'La ONU se creó para mantener la paz y la seguridad internacionales, mediar en conflictos entre Estados y fomentar la cooperación en temas económicos, sociales y humanitarios entre sus países miembros.',
    layer2: 'Sus resoluciones y mediaciones dependen en gran medida de la voluntad de cooperación de los países involucrados, ya que la organización no tiene un gobierno mundial ni fuerza propia para imponer decisiones sobre Estados soberanos.',
    layer3: 'La ONU no fija por sí sola las fronteras de sus países miembros, eso corresponde a acuerdos entre los Estados involucrados; tampoco administra la economía interna de ningún país, ni sustituye a sus gobiernos nacionales en decisiones internas.',
  },
  {
    topic: 3, difficulty: 'INTERMEDIATE',
    stem: '¿Cuál es una causa frecuente de disputas territoriales entre países vecinos?',
    correct: 'El control sobre recursos naturales o rutas estratégicas ubicadas en la zona en conflicto.',
    distractors: [
      'La existencia de un mismo huso horario compartido entre los países involucrados.',
      'La coincidencia en el nombre oficial que ambos países dieron a su moneda nacional.',
      'El uso de un alfabeto distinto para escribir la lengua oficial de cada país vecino.',
    ],
    layer1: 'Muchas disputas territoriales se originan por el interés en controlar recursos naturales valiosos (agua, minerales, petróleo) o rutas de paso estratégicas (pasos de montaña, salidas al mar) ubicadas en la zona disputada.',
    layer2: 'A estas causas económicas suelen sumarse reclamos históricos, culturales o étnicos sobre el mismo territorio, lo que hace que estos conflictos sean frecuentemente difíciles de resolver solo con criterios geográficos.',
    layer3: 'Compartir huso horario, tener nombres de moneda parecidos o usar alfabetos distintos no generan por sí mismos disputas territoriales — ninguno de esos factores tiene relación directa con el control de un territorio.',
  },

  // ── 4. Geografía de México (10) ──
  {
    topic: 4, difficulty: 'BASIC',
    stem: '¿Qué dos grandes sistemas montañosos recorren México de norte a sur, uno cerca del Pacífico y otro cerca del Golfo?',
    correct: 'La Sierra Madre Occidental y la Sierra Madre Oriental.',
    distractors: [
      'La Sierra Madre del Sur y la Sierra de Chiapas, paralelas entre el Pacífico y Guatemala.',
      'La Sierra Tarahumara y la Sierra de Oaxaca, unidas por el Eje Volcánico Transversal.',
      'La Sierra de San Pedro Mártir y la Sierra de la Laguna, ambas dentro de Baja California.',
    ],
    layer1: 'La Sierra Madre Occidental corre paralela a la costa del Pacífico y la Sierra Madre Oriental paralela al Golfo de México; ambas nacen cerca de la frontera norte y convergen hacia el centro del país con el Eje Volcánico Transversal.',
    layer2: 'Estas dos sierras determinan buena parte del clima y del relieve del centro-norte de México: entre ambas se extiende la Altiplanicie Mexicana, una región elevada y en su mayoría árida o semiárida.',
    layer3: 'La Sierra Madre del Sur y la de Chiapas están en el sur del país, no recorren todo México de norte a sur; la Sierra Tarahumara es parte de la Occidental, no un sistema aparte; y las sierras de Baja California son locales de esa península, no las dos grandes cadenas nacionales.',
  },
  {
    topic: 4, difficulty: 'INTERMEDIATE',
    stem: '¿Cuál es el volcán más alto de México, con una altitud superior a los 5,600 metros?',
    correct: 'El Pico de Orizaba o Citlaltépetl, en el límite entre Veracruz y Puebla.',
    distractors: [
      'El Popocatépetl, en el límite entre el Estado de México, Puebla y Morelos.',
      'El Nevado de Toluca, en el centro del Estado de México.',
      'El volcán de Colima, uno de los más activos de todo el país.',
    ],
    layer1: 'El Pico de Orizaba (Citlaltépetl) es la montaña más alta de México y el tercer pico más alto de Norteamérica, con una altitud que supera los 5,600 metros sobre el nivel del mar.',
    layer2: 'A diferencia del Popocatépetl o el volcán de Colima, el Citlaltépetl es un volcán inactivo desde hace siglos, por lo que su relevancia geográfica actual es sobre todo su altura, no su actividad eruptiva.',
    layer3: 'El Popocatépetl es más bajo (poco más de 5,400 metros) y es uno de los volcanes activos más vigilados del país; el Nevado de Toluca y el volcán de Colima tienen altitudes bastante menores a la del Pico de Orizaba.',
  },
  {
    topic: 4, difficulty: 'INTERMEDIATE',
    stem: '¿Qué tipo de clima predomina en la mayor parte del territorio del norte y centro-norte de México?',
    correct: 'Climas secos y semisecos, propios de zonas áridas y semiáridas.',
    distractors: [
      'Climas cálido-húmedos, con lluvias abundantes durante todo el año.',
      'Climas fríos de alta montaña, con nieve permanente en la mayoría de sus sierras.',
      'Climas templados subhúmedos, similares en todo el territorio nacional.',
    ],
    layer1: 'Cerca de la mitad del territorio mexicano, concentrado sobre todo en el norte y el centro-norte, tiene clima seco o semiseco, resultado de su posición entre dos sierras que bloquean la humedad del mar y de su latitud subtropical.',
    layer2: 'Esto contrasta con el sur y las costas del país, donde predominan climas cálido-húmedos y tropicales gracias a la mayor cercanía al ecuador y a la exposición directa a masas de aire húmedo.',
    layer3: 'El clima cálido-húmedo con lluvia todo el año es más propio del sureste, no del norte árido; la nieve permanente solo se da en las cumbres más altas, no en la mayoría de las sierras; y el territorio nacional no tiene un clima "similar" en todas sus regiones.',
  },
  {
    topic: 4, difficulty: 'ADVANCED',
    stem: '¿Qué característica distingue al río Usumacinta dentro de la hidrografía mexicana?',
    correct: 'Es el río de mayor caudal del país, aunque no el más largo.',
    distractors: [
      'Es el único río de México que nace y desemboca por completo fuera del territorio nacional.',
      'Es el río más largo del país, al recorrer casi toda la frontera con Estados Unidos.',
      'Es el único río mexicano que no forma parte de ninguna cuenca hidrográfica reconocida.',
    ],
    layer1: 'El Usumacinta, que nace en Guatemala y recorre el sureste mexicano hasta el Golfo de México, transporta el mayor volumen de agua de cualquier río del país, gracias a las abundantes lluvias de la región donde se ubica.',
    layer2: 'El río más largo de México es en realidad el Bravo, que recorre buena parte de la frontera con Estados Unidos; longitud y caudal son dos medidas distintas, y en México no coinciden en el mismo río.',
    layer3: 'El Usumacinta sí desemboca en México, no fuera de su territorio; no es el más largo, ese lugar corresponde al Bravo; y como cualquier río, forma parte de una cuenca hidrográfica reconocida, la del Usumacinta-Grijalva.',
  },
  {
    topic: 4, difficulty: 'BASIC',
    stem: '¿En cuántas entidades federativas está dividido el territorio de México en la actualidad?',
    correct: '32 entidades federativas, incluida la Ciudad de México.',
    distractors: [
      'En 31 estados y un Distrito Federal con un estatus jurídico distinto al de los estados.',
      'En 24 entidades federativas, agrupadas en ocho grandes regiones económicas.',
      'En 36 entidades federativas, tras la más reciente reforma constitucional del país.',
    ],
    layer1: 'México está dividido en 32 entidades federativas: 31 estados más la Ciudad de México, que desde la reforma constitucional de 2016 tiene el mismo estatus de entidad federativa que los demás estados.',
    layer2: 'Antes de esa reforma, la capital del país era el Distrito Federal, con un régimen jurídico distinto (dependiente directamente de los poderes federales); ese esquema ya no está vigente.',
    layer3: 'El esquema de "31 estados y un Distrito Federal" describe la situación anterior a 2016, ya no la actual; 24 entidades no corresponde a ninguna división vigente del país; y no ha habido una reforma reciente que eleve el número a 36.',
  },
  {
    topic: 4, difficulty: 'INTERMEDIATE',
    stem: 'De acuerdo con el censo de población de 2020, ¿aproximadamente cuántos habitantes tiene México?',
    correct: 'Poco más de 126 millones de habitantes.',
    distractors: [
      'Poco más de 90 millones de habitantes.',
      'Alrededor de 150 millones de habitantes.',
      'Cerca de 200 millones de habitantes.',
    ],
    layer1: 'El Censo de Población y Vivienda 2020 del INEGI registró poco más de 126 millones de personas viviendo en México, cifra que lo ubica entre los diez países más poblados del mundo.',
    layer2: 'La población mexicana ha crecido de forma sostenida durante décadas, aunque a un ritmo cada vez más lento por la caída de la tasa de natalidad respecto a la de mediados del siglo XX.',
    layer3: 'Noventa millones fue aproximadamente la población de México varias décadas atrás, no en 2020; y tanto 150 como 200 millones sobreestiman considerablemente la cifra real registrada por el censo más reciente.',
  },
  {
    topic: 4, difficulty: 'INTERMEDIATE',
    stem: '¿En qué lugar se ubica México dentro de la producción mundial de plata?',
    correct: 'Es el primer productor mundial de plata desde hace varios años consecutivos.',
    distractors: [
      'Ocupa un lugar secundario, muy por detrás de los principales productores mundiales.',
      'Es el segundo productor mundial, detrás de un país sudamericano vecino.',
      'No figura entre los diez principales productores mundiales de ese metal.',
    ],
    layer1: 'México ha sido, de forma consistente en los últimos años, el mayor productor mundial de plata, gracias a yacimientos importantes en estados como Zacatecas, Chihuahua y Durango.',
    layer2: 'La minería de plata es una actividad económica histórica del país, que se remonta a la época colonial, y sigue siendo hoy un componente relevante de las exportaciones mineras mexicanas.',
    layer3: 'México no ocupa un lugar secundario ni queda fuera del top mundial en este metal; y tampoco es el segundo lugar, un puesto que suelen ocupar otros países, mientras México se mantiene consistentemente en el primer sitio.',
  },
  {
    topic: 4, difficulty: 'BASIC',
    stem: '¿En qué región se concentra la mayor parte de la extracción petrolera de México?',
    correct: 'En la Sonda de Campeche y otras plataformas marinas del Golfo de México.',
    distractors: [
      'En los yacimientos terrestres de la península de Baja California.',
      'En las cuencas sedimentarias de la Sierra Madre Occidental.',
      'En los campos petroleros ubicados dentro de la meseta central del país.',
    ],
    layer1: 'La mayor parte del petróleo mexicano se extrae de yacimientos marinos en el Golfo de México, particularmente en la Sonda de Campeche, la región petrolera más productiva del país desde hace décadas.',
    layer2: 'Esto ha hecho que buena parte de la infraestructura petrolera nacional (plataformas, terminales de exportación, refinerías costeras) se concentre en los estados del Golfo, como Campeche, Tabasco y Veracruz.',
    layer3: 'Baja California no concentra la producción petrolera nacional; la Sierra Madre Occidental es una zona montañosa sin explotación petrolera relevante; y la meseta central del país tampoco es una región petrolera significativa.',
  },
  {
    topic: 4, difficulty: 'INTERMEDIATE',
    stem: "¿Por qué se clasifica a México entre los llamados países 'megadiversos' del mundo?",
    correct: 'Porque concentra un porcentaje muy alto de las especies conocidas del planeta.',
    distractors: [
      'Porque tiene la mayor superficie de selva tropical continua de todo el continente.',
      'Porque su territorio abarca una mayor extensión que la de cualquier otro país megadiverso.',
      'Porque es el único país megadiverso ubicado por completo en el hemisferio norte.',
    ],
    layer1: 'México se ubica entre los países con mayor riqueza biológica del planeta porque, pese a no ser de los más extensos, alberga un porcentaje muy alto de las especies conocidas de plantas y animales, incluidas muchas endémicas.',
    layer2: 'Esta diversidad se explica por su compleja variedad de climas y relieves —desde desiertos hasta selvas tropicales— que crean muchos ambientes distintos en un mismo territorio.',
    layer3: 'La mayor selva continua de América es la amazónica, no la mexicana; la extensión territorial de México es menor a la de otros países megadiversos como Brasil; y no todo su territorio está en el hemisferio norte de forma exclusiva respecto a otros países megadiversos, además de que ese no es el criterio que define la categoría.',
  },
  {
    topic: 4, difficulty: 'BASIC',
    stem: '¿Con qué países comparte México sus fronteras terrestres?',
    correct: 'Con Estados Unidos al norte, y con Guatemala y Belice al sureste.',
    distractors: [
      'Con Estados Unidos al norte, y con Honduras y El Salvador al sureste.',
      'Únicamente con Estados Unidos, ya que el resto de sus límites son costas.',
      'Con Estados Unidos, Guatemala, Belice y Cuba, esta última por su cercanía marítima.',
    ],
    layer1: 'México limita al norte con Estados Unidos y al sureste con Guatemala y Belice; el resto de su perímetro está bordeado por el Golfo de México, el mar Caribe y el océano Pacífico.',
    layer2: 'La frontera con Estados Unidos es la más extensa y la más transitada del país, mientras que las fronteras sur son más cortas pero igualmente relevantes para el comercio y la migración regional.',
    layer3: 'Honduras y El Salvador no comparten frontera terrestre con México; el país sí tiene otras fronteras terrestres además de la estadounidense; y Cuba, al ser una isla, no comparte frontera terrestre con ningún país, incluido México.',
  },

  // ── 5. Cartografía (5) ──
  {
    topic: 5, difficulty: 'BASIC',
    stem: '¿Qué indica la escala de un mapa, expresada por ejemplo como 1:50,000?',
    correct: 'Que una unidad de medida en el mapa equivale a 50,000 de esas unidades en la realidad.',
    distractors: [
      'Que el mapa representa exactamente 50,000 kilómetros cuadrados de superficie total.',
      'Que el mapa fue elaborado utilizando 50,000 puntos de referencia satelital distintos.',
      'Que el mapa tiene una antigüedad de 50,000 días desde su fecha de elaboración.',
    ],
    layer1: 'La escala numérica de un mapa es una razón: 1:50,000 significa que 1 centímetro (o cualquier unidad) medido en el mapa corresponde a 50,000 de esas mismas unidades en el terreno real.',
    layer2: 'Entre más pequeño el segundo número de esa razón, mayor es el nivel de detalle del mapa pero menor la superficie que puede representar en una misma hoja; por eso un mapa de una ciudad usa una escala mucho más "grande" que un mapa de un país entero.',
    layer3: 'La escala no fija la superficie total representada en kilómetros cuadrados, ni depende del número de puntos de referencia satelital usados, ni tiene relación con la antigüedad del mapa — es una relación de proporción entre distancias.',
  },
  {
    topic: 5, difficulty: 'INTERMEDIATE',
    stem: '¿Qué distorsión característica presenta la proyección de Mercator en las zonas cercanas a los polos?',
    correct: 'Exagera el tamaño real de las superficies alejadas del ecuador, como Groenlandia.',
    distractors: [
      'Reduce el tamaño real de las superficies alejadas del ecuador respecto al resto del mapa.',
      'Elimina por completo la posibilidad de trazar rutas de navegación en línea recta.',
      'Distorsiona únicamente los colores del mapa, sin alterar el tamaño de los territorios.',
    ],
    layer1: 'La proyección de Mercator conserva los ángulos (por eso fue tan útil para la navegación), pero a cambio agranda mucho el área de los territorios alejados del ecuador; Groenlandia se ve casi tan grande como África, cuando en realidad es catorce veces más pequeña.',
    layer2: 'Este efecto ocurre porque las líneas de longitud, que en la realidad convergen en los polos, se dibujan paralelas entre sí en esta proyección, estirando artificialmente el territorio conforme se acerca a las latitudes altas.',
    layer3: 'El efecto real es que AGRANDA, no reduce, esas superficies; la proyección precisamente permitió trazar rutas de navegación en línea recta con ángulo constante, no las eliminó; y la distorsión afecta el tamaño de los territorios, no solo los colores del mapa.',
  },
  {
    topic: 5, difficulty: 'BASIC',
    stem: '¿Qué mide la longitud geográfica de un punto sobre la superficie terrestre?',
    correct: 'Su distancia angular al meridiano de Greenwich, medida al este o al oeste.',
    distractors: [
      'Su distancia angular al ecuador, medida hacia el norte o hacia el sur del planeta.',
      'Su altura sobre el nivel del mar, medida en metros desde la costa más cercana.',
      'Su distancia en kilómetros hasta el polo norte geográfico más próximo.',
    ],
    layer1: 'La longitud geográfica se mide en grados hacia el este o hacia el oeste tomando como referencia el meridiano de Greenwich (0°), y llega hasta 180° en cada dirección.',
    layer2: 'Junto con la latitud, que mide la distancia angular al ecuador hacia el norte o el sur, la longitud permite ubicar cualquier punto de la Tierra con un par de coordenadas únicas.',
    layer3: 'La distancia angular al ecuador describe la latitud, no la longitud; la altura sobre el nivel del mar es la altitud, un dato distinto a la ubicación horizontal; y la distancia en kilómetros al polo no es cómo se define ninguna de las dos coordenadas geográficas.',
  },
  {
    topic: 5, difficulty: 'INTERMEDIATE',
    stem: 'En un mapa topográfico, ¿qué indica que las curvas de nivel aparezcan muy juntas entre sí?',
    correct: 'Que el terreno tiene una pendiente pronunciada en esa zona del mapa.',
    distractors: [
      'Que el terreno es completamente plano en toda esa zona representada.',
      'Que esa zona del mapa corresponde a un cuerpo de agua permanente.',
      'Que el mapa fue elaborado con una escala demasiado pequeña para ese terreno.',
    ],
    layer1: 'Cada curva de nivel une puntos de igual altitud; cuando varias curvas aparecen muy próximas entre sí, significa que la altura cambia mucho en poca distancia horizontal, es decir, que la pendiente del terreno es pronunciada.',
    layer2: 'Por el contrario, curvas de nivel muy separadas indican un terreno de pendiente suave o casi plano; leer ese espaciamiento es la forma principal de "ver" el relieve en un mapa topográfico sin necesidad de una imagen en tres dimensiones.',
    layer3: 'Un terreno plano se representa con curvas muy separadas, justo lo contrario de lo descrito; un cuerpo de agua no se identifica por el espaciamiento de curvas de nivel sino por un símbolo propio; y ese espaciamiento depende del relieve real, no de si la escala elegida es pequeña o grande.',
  },
  {
    topic: 5, difficulty: 'ADVANCED',
    stem: '¿En qué principio se basa un receptor GPS para calcular su ubicación exacta en la superficie terrestre?',
    correct: 'En triangular su posición a partir de señales de varios satélites simultáneamente.',
    distractors: [
      'En comparar la temperatura ambiente local con una base de datos climática global.',
      'En medir la intensidad del campo magnético terrestre en el punto donde se ubica.',
      'En recibir una sola señal satelital que ya contiene la ubicación exacta calculada.',
    ],
    layer1: 'Un receptor GPS calcula su posición midiendo el tiempo que tarda en llegarle la señal de varios satélites (al menos cuatro) y, a partir de esas distancias, triangula el punto exacto donde se encuentra.',
    layer2: 'Cuantos más satélites capte el receptor con buena señal, más precisa resulta la ubicación calculada; por eso el GPS funciona peor dentro de edificios o cañones profundos, donde varias señales quedan bloqueadas.',
    layer3: 'El GPS no usa temperatura ambiente ni campo magnético para ubicarse, esos son principios de otros instrumentos (termómetro, brújula); y necesita señales de VARIOS satélites para triangular, no basta con recibir una sola señal.',
  },
];
