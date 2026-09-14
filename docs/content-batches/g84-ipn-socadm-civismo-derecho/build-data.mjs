// Datos crudos del lote G84 — IPN SOCADM, Civismo/Derecho (40 reactivos).
// Cada item: { topic, difficulty, stem, correct, distractors:[3], layer1, layer2, layer3 }
// `topic` es el índice 1-4 sobre TOPIC_IDS (ver build.mjs).
//
// Las 4 opciones de cada reactivo se redactaron con longitud comparable desde
// la primera versión (lección de G77/G78/G82): la clave se compuso a su
// núcleo factual, sin relleno artificial en los distractores.
//
// Vigencia legal (a diferencia de historia/geografía, el derecho cambia):
// solo se citan artículos y principios ESTABLES del texto constitucional
// (soberanía, forma de gobierno, división de poderes, estructura del
// Congreso, periodo presidencial y no reelección, municipio libre,
// supremacía constitucional, reforma constitucional, control constitucional,
// derechos humanos desde la reforma de 2011, debido proceso, educación,
// trabajo, CNDH, tratados internacionales) — ninguno de estos artículos fue
// tocado por las reformas más recientes (2024: Poder Judicial, organismos
// autónomos, Guardia Nacional). Deliberadamente NO se citan la composición
// exacta de la SCJN, el Consejo de la Judicatura, el INAI ni la Guardia
// Nacional: son objeto de reformas recientes cuya redacción vigente exacta
// no se puede verificar con certeza dentro de esta sesión, y CLAUDE.md pide
// priorizar principios y estructura general sobre el número/detalle exacto
// cuando hay duda genuina de vigencia.
//
// 3 de los 4 temas (Derecho constitucional, Derechos humanos, Ética
// ciudadana) no tienen SourceChunk → TEMARIO_ONLY. El tema "Sistemas
// políticos" SÍ tiene un SourceChunk real (guia_ECOEM.pdf, p. 20, el temario
// oficial IPN-UNAM) y sus 10 reactivos citan sourceChunks:[1] — build.mjs lo
// aplica automáticamente por topic===3.

export const TOPIC_IDS = [
  'cmrr1pzvo00fx11qdkm7m1bfv', // 1. Derecho constitucional (TEMARIO_ONLY)
  'cmrr1q0e000fz11qd7xkm5str', // 2. Derechos humanos (TEMARIO_ONLY)
  'cmrr1q0tg00g111qd0ggs8mka', // 3. Sistemas políticos (SOURCED — guia_ECOEM.pdf p.20)
  'cmrr1q18s00g311qdhn5mt4ul', // 4. Ética ciudadana (TEMARIO_ONLY)
];

export const ITEMS = [
  // ══════════════════════ 1. Derecho constitucional ══════════════════════
  {
    topic: 1, difficulty: 'BASIC',
    stem: '¿Qué principio establece que la Constitución es la norma jurídica de mayor jerarquía en México, y las leyes que la contradigan carecen de validez?',
    correct: 'Supremacía constitucional: ninguna ley puede contradecir lo dispuesto en la Constitución.',
    distractors: [
      'Legalidad estricta: solo el Poder Judicial puede crear normas jurídicas válidas en todo el país.',
      'Reserva de ley: cada materia jurídica requiere una ley exclusiva, sin ninguna excepción posible.',
      'Jerarquía municipal: los reglamentos locales prevalecen siempre sobre las leyes federales.',
    ],
    layer1: 'El artículo 133 constitucional establece que la Constitución, las leyes que de ella emanen y los tratados internacionales que estén de acuerdo con ella son la Ley Suprema de toda la Unión.',
    layer2: 'Este principio permite el control constitucional: jueces y tribunales pueden inaplicar o declarar inválida una norma que contradiga la Constitución.',
    layer3: 'La legalidad estricta describe solo la actuación de las autoridades, no la jerarquía normativa; la reserva de ley es una técnica legislativa distinta; y los reglamentos municipales están subordinados, no por encima, de las leyes federales.',
  },
  {
    topic: 1, difficulty: 'BASIC',
    stem: 'Según el artículo 39 constitucional, ¿en quién reside originariamente la soberanía nacional?',
    correct: 'En el pueblo, quien tiene en todo tiempo el derecho de alterar su forma de gobierno.',
    distractors: [
      'En el Congreso de la Unión, como representante permanente y exclusivo de la voluntad popular.',
      'En el presidente de la República, como jefe de Estado y de gobierno de la nación.',
      'En la Suprema Corte, como intérprete final y definitivo de la Constitución.',
    ],
    layer1: 'El artículo 39 dice textualmente que la soberanía nacional reside esencial y originariamente en el pueblo, y que todo poder público dimana de él y se instituye para su beneficio.',
    layer2: 'De este principio se desprende que los poderes públicos son solo depositarios temporales de una soberanía que nunca dejan de deber al pueblo que los instituyó.',
    layer3: 'El Congreso, el presidente y la Corte son órganos que ejercen poder derivado de esa soberanía, no su titular original.',
  },
  {
    topic: 1, difficulty: 'INTERMEDIATE',
    stem: '¿Qué forma de gobierno adopta México según el artículo 40 constitucional?',
    correct: 'República representativa, democrática, laica y federal, compuesta por estados libres y soberanos.',
    distractors: [
      'Monarquía constitucional con un jefe de Estado vitalicio y un parlamento meramente consultivo y simbólico.',
      'Confederación de estados plenamente independientes, unidos solamente por un tratado.',
      'Estado unitario centralizado, sin ningún reparto territorial de competencias internas.',
    ],
    layer1: 'El artículo 40 define a México como una república representativa, democrática, laica, federal, compuesta por Estados libres y soberanos en todo lo concerniente a su régimen interior.',
    layer2: 'El carácter federal implica un reparto constitucional de competencias entre la Federación, las entidades federativas y los municipios (artículo 124 y concordantes).',
    layer3: 'México no es monarquía ni confederación (los estados no son independientes entre sí, están unidos en una federación); tampoco es unitario, pues conserva ámbitos de competencia estatal y municipal propios.',
  },
  {
    topic: 1, difficulty: 'INTERMEDIATE',
    stem: '¿Qué establece el principio de división de poderes consagrado en el artículo 49 constitucional?',
    correct: 'El Supremo Poder de la Federación se divide, para su ejercicio, en Legislativo, Ejecutivo y Judicial.',
    distractors: [
      'El poder se concentra por completo en el Ejecutivo federal, que delega funciones a los otros dos poderes.',
      'Cada estado de la federación ejerce de forma aislada los tres poderes, sin relación con la Federación.',
      'El Poder Judicial supervisa y puede revocar libremente las decisiones de los otros dos poderes.',
    ],
    layer1: 'El artículo 49 dispone que el Supremo Poder de la Federación se divide, para su ejercicio, en Legislativo, Ejecutivo y Judicial, prohibiendo que se reúnan dos o más en una persona o corporación, salvo las excepciones expresas que la propia Constitución señala.',
    layer2: 'Este reparto busca un sistema de pesos y contrapesos: cada poder controla y limita a los otros, evitando la concentración del poder público en un solo órgano.',
    layer3: 'El poder no se concentra en el Ejecutivo; los estados replican la división de poderes pero dentro del pacto federal, no de forma aislada; y el Judicial no "revoca libremente" a los otros poderes, ejerce control constitucional dentro de procesos jurídicos específicos.',
  },
  {
    topic: 1, difficulty: 'BASIC',
    stem: '¿Cómo está integrado el Congreso de la Unión, el Poder Legislativo federal mexicano?',
    correct: 'De forma bicameral: una Cámara de Diputados y una Cámara de Senadores.',
    distractors: [
      'De forma unicameral: solo una Cámara de Diputados, electa por representación proporcional.',
      'De tres cámaras: Diputados, Senadores y una Cámara adicional de Gobernadores estatales.',
      'De forma bicameral, pero con ambas cámaras integradas exclusivamente por representantes de los estados.',
    ],
    layer1: 'El artículo 50 constitucional establece que el poder legislativo de los Estados Unidos Mexicanos se deposita en un Congreso General, dividido en dos cámaras: una de diputados y otra de senadores.',
    layer2: 'La Cámara de Diputados representa a la población por distrito, mientras el Senado representa de forma más igualitaria a las entidades federativas.',
    layer3: 'El Congreso mexicano no es unicameral; no existe una "Cámara de Gobernadores"; y la Cámara de Diputados no se integra exclusivamente por representación proporcional, combina mayoría relativa y representación proporcional.',
  },
  {
    topic: 1, difficulty: 'INTERMEDIATE',
    stem: '¿Cuál es la duración del cargo del presidente de la República y su régimen de reelección, conforme a la Constitución?',
    correct: 'Seis años, sin posibilidad de reelección bajo ninguna circunstancia.',
    distractors: [
      'Cuatro años, con posibilidad de una reelección inmediata por un periodo adicional.',
      'Seis años, con posibilidad de reelección tras dejar pasar un periodo intermedio completo.',
      'Ocho años, renovable de forma indefinida mediante una consulta popular específica.',
    ],
    layer1: 'El artículo 83 constitucional fija el periodo presidencial en seis años y prohíbe de manera absoluta la reelección, incluso para quien lo desempeñe con carácter interino, provisional o sustituto.',
    layer2: 'La no reelección presidencial es uno de los principios históricos más arraigados del constitucionalismo mexicano posrevolucionario, ligado al lema "Sufragio Efectivo, No Reelección".',
    layer3: 'No son cuatro ni ocho años; y la prohibición de reelección es absoluta, no admite excepción por periodo intermedio ni por consulta popular alguna.',
  },
  {
    topic: 1, difficulty: 'ADVANCED',
    stem: '¿Qué procedimiento exige la Constitución para ser reformada o adicionada, según el artículo 135?',
    correct: 'Aprobación de dos terceras partes del Congreso y de la mayoría de las legislaturas estatales.',
    distractors: [
      'Aprobación directa mediante un referéndum nacional obligatorio, sin intervención del Congreso.',
      'Mayoría simple de una sola cámara del Congreso, sin ninguna participación de los estados.',
      'Decreto del Ejecutivo federal, ratificado únicamente por la Suprema Corte de Justicia.',
    ],
    layer1: 'El artículo 135 exige que las reformas constitucionales sean aprobadas por el voto de las dos terceras partes de los individuos presentes del Congreso, y por la mayoría de las legislaturas de los estados y de la Ciudad de México.',
    layer2: 'Este procedimiento agravado, más exigente que el de una ley ordinaria, es lo que distingue a una Constitución "rígida" de una "flexible", y busca dar estabilidad al pacto fundamental.',
    layer3: 'No hay referéndum nacional obligatorio para reformar la Constitución por esta vía; no basta la mayoría simple de una cámara; y la Suprema Corte no interviene en la ratificación de reformas, esa es una facultad de las legislaturas locales.',
  },
  {
    topic: 1, difficulty: 'BASIC',
    stem: 'En la estructura constitucional mexicana, ¿qué distingue a la llamada "parte dogmática" de la "parte orgánica" de la Constitución?',
    correct: 'La parte dogmática regula los derechos humanos; la orgánica distribuye las competencias de los poderes públicos.',
    distractors: [
      'La parte dogmática regula solo la religión oficial del Estado; la orgánica regula únicamente la economía nacional.',
      'La parte dogmática es de aplicación optativa; solo la orgánica tiene fuerza jurídica obligatoria.',
      'La parte dogmática se refiere a tratados internacionales; la orgánica, exclusivamente a leyes locales.',
    ],
    layer1: 'La doctrina constitucional distingue una parte dogmática (derechos humanos, sus garantías y principios rectores) de una parte orgánica (organización, integración y facultades de los poderes de la Unión, así como de estados y municipios).',
    layer2: 'Esta distinción, aunque no aparece con ese nombre en el texto constitucional, ayuda a entender por qué el artículo 1 (derechos humanos) y el artículo 49 (división de poderes) cumplen funciones distintas dentro del mismo documento.',
    layer3: 'México no tiene religión oficial, es un Estado laico (artículo 40); ambas partes son igualmente obligatorias; y ninguna de las dos se limita a tratados o a leyes locales de forma exclusiva.',
  },
  {
    topic: 1, difficulty: 'INTERMEDIATE',
    stem: '¿Qué es el "municipio libre" como base de la división territorial y de la organización política de los estados, conforme al artículo 115?',
    correct: 'La célula básica de gobierno local, administrada por un ayuntamiento de elección popular directa.',
    distractors: [
      'Una dependencia administrativa nombrada de forma directa por el gobernador del estado.',
      'Una figura exclusiva de las zonas rurales, inexistente por completo dentro de las capitales estatales.',
      'Un órgano meramente consultivo, sin facultades reales de gobierno ni presupuesto propio.',
    ],
    layer1: 'El artículo 115 establece que los estados adoptarán, para su régimen interior, la forma de gobierno republicano, representativo y popular, teniendo como base de su división territorial y de su organización política y administrativa el municipio libre, gobernado por un ayuntamiento de elección popular directa.',
    layer2: 'El municipio tiene personalidad jurídica propia y maneja su patrimonio, y no existe autoridad intermedia entre él y el gobierno del estado al que pertenece.',
    layer3: 'El ayuntamiento no lo designa el gobernador, se elige popularmente; el municipio existe también en zonas urbanas, incluidas las capitales; y sí tiene facultades de gobierno y hacienda propia, como recaudar el predial.',
  },
  {
    topic: 1, difficulty: 'ADVANCED',
    stem: '¿Qué diferencia principal existe entre una "controversia constitucional" y una "acción de inconstitucionalidad", medios de control previstos en el artículo 105?',
    correct: 'La controversia resuelve conflictos de competencia entre órganos; la acción revisa si una norma contradice la Constitución.',
    distractors: [
      'Ambas son exactamente el mismo procedimiento, y solo cambia el nombre según quién lo promueva.',
      'La controversia solo puede promoverla un particular; la acción de inconstitucionalidad, únicamente el presidente.',
      'La controversia revisa leyes; la acción de inconstitucionalidad siempre resuelve conflictos entre los poderes públicos federales.',
    ],
    layer1: 'La controversia constitucional (fracción I del artículo 105) dirime conflictos entre la Federación, los estados, los municipios u otros órganos de gobierno sobre el ejercicio de sus competencias; la acción de inconstitucionalidad (fracción II) permite impugnar de manera abstracta que una norma general contradice la Constitución.',
    layer2: 'Ambas las resuelve la Suprema Corte de Justicia, pero responden a lógicas distintas: una protege el reparto de competencias, la otra la supremacía constitucional frente a cualquier norma.',
    layer3: 'No son el mismo procedimiento; los particulares no promueven controversias constitucionales, están reservadas a órganos de gobierno, ni la acción de inconstitucionalidad es exclusiva del presidente, también la promueven minorías legislativas y la CNDH; y la distinción "leyes vs. poderes" está invertida respecto a la real.',
  },

  // ═══════════════════════════ 2. Derechos humanos ═══════════════════════════
  {
    topic: 2, difficulty: 'BASIC',
    stem: '¿Qué cambio central introdujo la reforma constitucional de 2011 en materia de derechos humanos al artículo 1?',
    correct: 'Reconoció que todas las personas gozan de los derechos humanos de la Constitución y los tratados internacionales.',
    distractors: [
      'Eliminó la posibilidad de que los tratados internacionales tuvieran algún efecto jurídico dentro del territorio mexicano.',
      'Restringió los derechos humanos de forma exclusiva a los ciudadanos mexicanos por nacimiento.',
      'Trasladó la protección de los derechos humanos únicamente al ámbito de las leyes locales.',
    ],
    layer1: 'La reforma de junio de 2011 modificó el artículo 1 para reconocer expresamente que todas las personas gozan de los derechos humanos reconocidos en la Constitución y en los tratados internacionales, ampliando el catálogo más allá de las "garantías individuales" tradicionales.',
    layer2: 'Este cambio de paradigma sitúa a México dentro de lo que la doctrina llama "bloque de constitucionalidad": normas internas e internacionales que juntas definen el estándar de protección.',
    layer3: 'Los tratados sí producen efectos jurídicos internos tras la reforma; los derechos se reconocen a "toda persona", no solo a ciudadanos mexicanos; y la protección no se limitó a leyes locales, se elevó a rango constitucional y convencional.',
  },
  {
    topic: 2, difficulty: 'INTERMEDIATE',
    stem: '¿Qué exige el "principio pro persona", incorporado al artículo 1 constitucional?',
    correct: 'Que, ante varias interpretaciones posibles de una norma, se elija la que ofrezca mayor protección a la persona.',
    distractors: [
      'Que las autoridades apliquen siempre la norma jurídica más reciente, sin importar el nivel de protección que ofrezca.',
      'Que los tratados internacionales se apliquen solo si el Congreso los aprueba de forma expresa caso por caso.',
      'Que cada juez decida con total libertad qué derechos reconoce, sin sujetarse a ninguna norma.',
    ],
    layer1: 'El principio pro persona (o pro homine) obliga a interpretar las normas de derechos humanos favoreciendo en todo tiempo la protección más amplia a las personas, provenga esa protección de la Constitución o de un tratado.',
    layer2: 'Se combina con la "interpretación conforme": las normas relativas a derechos humanos se interpretan de conformidad con la Constitución y los tratados, no de forma aislada.',
    layer3: 'No se trata de aplicar la norma más reciente sin más, podría ofrecer menos protección; los tratados de derechos humanos ratificados obligan sin necesidad de aprobación caso por caso; y los jueces están sujetos a este principio, no deciden con total libertad.',
  },
  {
    topic: 2, difficulty: 'BASIC',
    stem: '¿Qué característica de los derechos humanos establece que su nivel de protección debe ampliarse con el tiempo, y nunca reducirse, según el artículo 1?',
    correct: 'La progresividad: junto con universalidad, interdependencia e indivisibilidad, rige la actuación de las autoridades.',
    distractors: [
      'La territorialidad, que limita los derechos humanos a un grupo social determinado por cada gobierno.',
      'La discrecionalidad, que permite a la autoridad suspender un derecho libremente cuando convenga a una política pública.',
      'La jerarquía interna, que hace valer más los derechos civiles que los económicos, sociales y culturales.',
    ],
    layer1: 'El párrafo tercero del artículo 1 obliga a todas las autoridades a promover, respetar, proteger y garantizar los derechos humanos de conformidad con los principios de universalidad, interdependencia, indivisibilidad y progresividad.',
    layer2: 'La progresividad implica que el Estado no puede retroceder en el nivel de protección alcanzado —el llamado principio de no regresividad—, salvo justificación excepcional y estrictamente motivada.',
    layer3: 'Los derechos humanos no son exclusivos de un grupo social; no pueden suspenderse a discreción de una política pública, salvo los casos excepcionales que la propia Constitución regula; y no existe jerarquía entre derechos civiles y económicos-sociales-culturales, son indivisibles.',
  },
  {
    topic: 2, difficulty: 'INTERMEDIATE',
    stem: '¿Qué garantiza el artículo 1 constitucional en su párrafo relativo a la no discriminación?',
    correct: 'Que queda prohibida la discriminación por origen étnico, género, condición social o religión que atente contra la dignidad.',
    distractors: [
      'Que la discriminación solo está prohibida entre particulares, nunca cuando la practica una autoridad.',
      'Que las empresas privadas pueden establecer de forma libre cualquier criterio de exclusión, sin ninguna consecuencia legal.',
      'Que la igualdad solo aplica a las relaciones laborales, sin extenderse a otros ámbitos de la vida social.',
    ],
    layer1: 'El último párrafo del artículo 1 prohíbe toda discriminación que atente contra la dignidad humana y tenga por objeto anular o menoscabar los derechos y libertades de las personas.',
    layer2: 'Esta prohibición vincula tanto a las autoridades como, en principio, a los particulares en sus relaciones, y se complementa con leyes secundarias como la Ley Federal para Prevenir y Eliminar la Discriminación.',
    layer3: 'La prohibición no se limita a las autoridades, también alcanza relaciones entre particulares; las empresas no están exentas de ella; y el principio de igualdad no se agota en lo laboral, cubre toda la vida social.',
  },
  {
    topic: 2, difficulty: 'BASIC',
    stem: '¿Qué establece el artículo 3 constitucional respecto al derecho a la educación en México?',
    correct: 'Que toda persona tiene derecho a la educación, y el Estado debe impartirla de manera gratuita, laica y democrática.',
    distractors: [
      'Que la educación pública es opcional y depende de forma exclusiva de la disponibilidad presupuestal de cada ejercicio fiscal.',
      'Que solo el nivel universitario queda garantizado como derecho a cargo del Estado mexicano.',
      'Que la educación en México debe impartirse con la orientación religiosa que decida cada entidad.',
    ],
    layer1: 'El artículo 3 reconoce el derecho de toda persona a la educación, obliga al Estado a impartir e incrementar la educación en todos sus tipos y modalidades, y establece que será laica, gratuita y con criterio democrático.',
    layer2: 'El carácter laico significa que la educación pública se mantiene ajena a cualquier doctrina religiosa, en congruencia con el artículo 40, que define a México como república laica.',
    layer3: 'El derecho a la educación no es discrecional del presupuesto; se extiende más allá del nivel universitario; y no puede tener orientación religiosa alguna, precisamente por el carácter laico del Estado.',
  },
  {
    topic: 2, difficulty: 'INTERMEDIATE',
    stem: '¿Qué protege el derecho al debido proceso, reconocido de forma conjunta en los artículos 14, 16 y 20 constitucionales?',
    correct: 'Que nadie puede ser privado de la libertad o de sus derechos sin un juicio ante autoridad competente.',
    distractors: [
      'Que toda persona detenida puede exigir su liberación inmediata, sin necesidad de ningún proceso judicial.',
      'Que solo los delitos graves requieren de un juicio; los demás se resuelven por decisión administrativa.',
      'Que las autoridades pueden actuar sin orden judicial siempre que invoquen razones de seguridad pública.',
    ],
    layer1: 'El artículo 14 exige juicio previo ante autoridad competente y formalidades esenciales del procedimiento para privar a alguien de la libertad, propiedades, posesiones o derechos; el 16 exige mandamiento escrito de autoridad competente que funde y motive la causa legal del procedimiento; el 20 detalla las garantías del proceso penal.',
    layer2: 'Estas disposiciones conforman lo que la doctrina llama debido proceso legal, un conjunto de garantías mínimas frente al poder del Estado, aplicable tanto en materia penal como civil, administrativa y laboral.',
    layer3: 'El debido proceso no permite una liberación automática sin proceso; aplica a todo tipo de asuntos, no solo a delitos graves; y las autoridades sí requieren, salvo excepciones expresas y limitadas, orden judicial para actuar.',
  },
  {
    topic: 2, difficulty: 'ADVANCED',
    stem: '¿Cuál es la función principal de la Comisión Nacional de los Derechos Humanos dentro del sistema de protección no jurisdiccional previsto en el artículo 102, apartado B?',
    correct: 'Recibir quejas, investigar violaciones a derechos humanos cometidas por autoridades y emitir recomendaciones públicas.',
    distractors: [
      'Dictar sentencias con efectos obligatorios que anulan de forma directa los actos de cualquier autoridad.',
      'Sustituir por completo al Poder Judicial en todos los juicios relacionados con violaciones a los derechos humanos fundamentales.',
      'Legislar de forma autónoma sobre los derechos humanos reconocidos en los tratados internacionales.',
    ],
    layer1: 'El artículo 102, apartado B, crea organismos de protección de los derechos humanos (la CNDH a nivel federal y comisiones estatales) que conocen de quejas contra actos u omisiones de naturaleza administrativa de cualquier autoridad, y emiten recomendaciones públicas no vinculantes.',
    layer2: 'Al no tener carácter jurisdiccional, la CNDH no sustituye a los tribunales; su fuerza es principalmente de exhibición pública y presión política e institucional sobre la autoridad señalada.',
    layer3: 'La CNDH no dicta sentencias obligatorias ni anula actos de autoridad de forma directa; no reemplaza al Poder Judicial; y no legisla, solo puede promover acciones de inconstitucionalidad en su ámbito de competencia.',
  },
  {
    topic: 2, difficulty: 'BASIC',
    stem: '¿A qué instrumento internacional se le conoce comúnmente como "Pacto de San José" y qué relación tiene con el sistema mexicano de derechos humanos?',
    correct: 'A la Convención Americana sobre Derechos Humanos, tratado internacional ratificado por México.',
    distractors: [
      'A un tratado exclusivamente comercial entre México y Costa Rica, sin relación con derechos humanos.',
      'A una ley federal mexicana aprobada por el Congreso, sin vínculo con ningún organismo internacional.',
      'A un acuerdo bilateral entre México y Estados Unidos en materia de migración.',
    ],
    layer1: 'El Pacto de San José (Convención Americana sobre Derechos Humanos, de 1969) es un tratado del sistema interamericano, ratificado por México, que reconoce derechos civiles y políticos y da origen a la Comisión y a la Corte Interamericanas de Derechos Humanos.',
    layer2: 'Tras la reforma de 2011, tratados como este se interpretan junto con la Constitución para definir el estándar de protección más amplio disponible, conforme al principio pro persona.',
    layer3: 'No es un tratado comercial, ni una ley federal doméstica, ni un acuerdo bilateral migratorio con Estados Unidos; es un tratado multilateral del sistema interamericano de derechos humanos.',
  },
  {
    topic: 2, difficulty: 'INTERMEDIATE',
    stem: '¿Qué principio rige la actuación del Estado mexicano respecto a niñas, niños y adolescentes, según el artículo 4 constitucional?',
    correct: 'El interés superior de la niñez, que obliga a garantizar sus derechos y a priorizar su bienestar en toda decisión.',
    distractors: [
      'La patria potestad absoluta de los padres, sin ninguna posibilidad de intervención del Estado.',
      'La igualdad estricta con las personas adultas en todos los procedimientos legales, sin consideración especial alguna.',
      'La subordinación de sus derechos al interés económico de la familia o del propio Estado.',
    ],
    layer1: 'El artículo 4 establece que en todas las decisiones y actuaciones del Estado se velará y cumplirá con el principio del interés superior de la niñez, garantizando de manera plena sus derechos.',
    layer2: 'Este principio orienta políticas públicas de educación, salud y protección, y exige que niñas, niños y adolescentes participen y sean escuchados en los asuntos que les afectan, según su edad y madurez.',
    layer3: 'El interés superior de la niñez no anula la intervención del Estado en casos de riesgo, aun ante la patria potestad; reconoce condiciones especiales de protección, no una igualdad estricta sin matices; y no subordina sus derechos a fines económicos.',
  },
  {
    topic: 2, difficulty: 'BASIC',
    stem: '¿Qué garantiza el artículo 123 constitucional en materia de derechos laborales?',
    correct: 'El derecho al trabajo digno, con condiciones mínimas como jornada máxima, salario remunerador y seguridad social.',
    distractors: [
      'Que el salario mínimo puede fijarse de forma completamente libre por cada empleador, sin ningún límite legal establecido.',
      'Que las jornadas de trabajo no tienen ningún límite establecido a nivel constitucional.',
      'Que la seguridad social es un beneficio opcional que cada empresa decide otorgar o no.',
    ],
    layer1: 'El artículo 123 reconoce el derecho al trabajo digno y socialmente útil y establece un catálogo de derechos mínimos —jornada máxima, descansos, salario remunerador, seguridad social, entre otros— aplicables tanto al apartado A (trabajadores en general) como al B (trabajadores al servicio del Estado).',
    layer2: 'Este artículo es uno de los pilares del constitucionalismo social mexicano de 1917, pionero a nivel mundial en elevar los derechos laborales a rango constitucional.',
    layer3: 'El salario mínimo no se fija libremente por cada empleador, existen mecanismos institucionales para determinarlo; la jornada laboral sí tiene límites constitucionales; y la seguridad social es un derecho, no una prestación opcional.',
  },

  // ═══════════════════════════ 3. Sistemas políticos (SOURCED) ═══════════════════════════
  {
    topic: 3, difficulty: 'BASIC',
    stem: 'Según el temario cívico, ¿qué relación guardan los derechos fundamentales de los ciudadanos reconocidos en la Constitución con los derechos humanos?',
    correct: 'Los derechos fundamentales constitucionales y los derechos humanos internacionales se complementan para proteger a la persona.',
    distractors: [
      'Los derechos fundamentales constitucionales anulan cualquier derecho humano reconocido en un tratado internacional.',
      'Solo los derechos humanos de fuente internacional tienen validez; los derechos constitucionales quedaron derogados.',
      'Son conceptos sin ninguna relación entre sí, regulados por sistemas jurídicos completamente independientes y sin ningún vínculo.',
    ],
    layer1: 'El temario de Civismo y Derecho vincula explícitamente los "derechos fundamentales de los ciudadanos en la Constitución" con "su relación con los Derechos Humanos": ambos conjuntos de normas se interpretan de forma armónica para dar la protección más amplia a la persona.',
    layer2: 'Esta complementariedad es coherente con el principio pro persona: ante varias fuentes de derechos disponibles, se aplica la que más proteja al individuo, no la que las anule entre sí.',
    layer3: 'Ninguno de los dos sistemas anula ni deroga al otro; y no son independientes entre sí, se articulan como un mismo estándar de protección de la persona.',
  },
  {
    topic: 3, difficulty: 'BASIC',
    stem: '¿Qué papel cumplen los partidos políticos como mecanismo de representación ciudadana en un gobierno democrático?',
    correct: 'Agrupan a ciudadanos con ideas afines para postular candidatos y canalizar la participación política.',
    distractors: [
      'Son órganos de gobierno con facultades para emitir leyes de forma directa, sin pasar por el Congreso.',
      'Son asociaciones exclusivamente empresariales, sin ninguna función de carácter electoral.',
      'Son dependencias del gobierno federal encargadas de administrar la seguridad pública nacional.',
    ],
    layer1: 'El temario identifica a los partidos políticos como parte de los "mecanismos de representación de los ciudadanos en el gobierno democrático": son intermediarios entre la ciudadanía y el poder público que compiten por cargos de elección popular.',
    layer2: 'A través de plataformas y candidaturas, los partidos organizan la pluralidad de ideas presentes en la sociedad para que puedan expresarse dentro del sistema representativo.',
    layer3: 'Los partidos no emiten leyes de forma directa, eso corresponde al Congreso, donde sí participan sus legisladores; no son asociaciones empresariales; ni dependencias de seguridad pública.',
  },
  {
    topic: 3, difficulty: 'INTERMEDIATE',
    stem: 'Dentro de los mecanismos de representación ciudadana, ¿qué distingue a la democracia representativa de la democracia directa?',
    correct: 'En la representativa, los ciudadanos eligen representantes que deciden en su nombre; en la directa, deciden ellos mismos.',
    distractors: [
      'No existe ninguna diferencia real entre ambos modelos, son sinónimos en la práctica política.',
      'En la representativa, decide un solo gobernante vitalicio y sin límite de tiempo, sin ningún proceso electoral de por medio.',
      'En la directa, decide de forma exclusiva el Poder Judicial en representación del pueblo entero.',
    ],
    layer1: 'La democracia representativa —el modelo predominante en México, vía elección de diputados, senadores, gobernadores y presidente— delega la toma de decisiones en representantes electos; la democracia directa (referéndum, consulta popular, plebiscito) somete la decisión directamente a la ciudadanía.',
    layer2: 'Ambos mecanismos pueden coexistir: un sistema mayoritariamente representativo puede incorporar herramientas de participación directa, como la consulta popular reconocida en el artículo 35 constitucional.',
    layer3: 'Sí hay una diferencia real entre ambos modelos; la democracia representativa no significa un gobernante vitalicio sin elecciones; y la democracia directa no la ejerce el Poder Judicial, la ejerce directamente la ciudadanía.',
  },
  {
    topic: 3, difficulty: 'INTERMEDIATE',
    stem: '¿Qué tipo de obligaciones tiene el gobierno con los ciudadanos en los niveles federal, estatal y municipal, conforme al temario cívico?',
    correct: 'Proveer servicios públicos, garantizar derechos y rendir cuentas, cada nivel dentro de sus competencias.',
    distractors: [
      'Solo el gobierno federal tiene obligaciones con los ciudadanos; los estados y municipios están exentos.',
      'Las obligaciones gubernamentales son opcionales y dependen de la voluntad de cada funcionario en turno.',
      'Únicamente el nivel municipal está obligado a rendir cuentas ante la ciudadanía; los otros dos niveles no lo están.',
    ],
    layer1: 'El temario agrupa "las obligaciones gubernamentales con los ciudadanos en los niveles federal, estatal y municipal": cada orden de gobierno, dentro de su competencia, debe proveer servicios como educación, salud, seguridad e infraestructura, y responder ante la ciudadanía.',
    layer2: 'Este reparto de obligaciones por nivel de gobierno refleja la estructura federal de México, donde ni la Federación concentra todas las funciones, ni los estados o municipios quedan sin responsabilidades propias.',
    layer3: 'Estados y municipios sí tienen obligaciones propias con la ciudadanía; las obligaciones no son opcionales, están fijadas por ley; y la rendición de cuentas no es exclusiva del municipio, aplica a los tres niveles.',
  },
  {
    topic: 3, difficulty: 'ADVANCED',
    stem: 'Entre los retos de la democracia en las sociedades contemporáneas que identifica el temario, ¿cuál describe mejor un problema para la participación ciudadana informada?',
    correct: 'La desinformación y la polarización, que dificultan que la ciudadanía delibere con datos confiables.',
    distractors: [
      'El exceso de transparencia gubernamental, que "confunde" a la ciudadanía con demasiada información verificada.',
      'La existencia de más de un partido político compitiendo de forma simultánea en las elecciones.',
      'La celebración periódica de elecciones libres, que "debilita" la estabilidad de las instituciones públicas.',
    ],
    layer1: 'El temario incluye los "retos de la democracia en las sociedades contemporáneas": la desinformación, incluida la que circula en redes sociales, y la polarización social dificultan el debate público informado, uno de los pilares de una ciudadanía participativa.',
    layer2: 'Enfrentar este reto requiere, entre otras cosas, medios de comunicación responsables y una ciudadanía con pensamiento crítico capaz de contrastar fuentes, en vínculo directo con la "función social de los medios de comunicación" del mismo temario.',
    layer3: 'La transparencia gubernamental no es un problema, es una herramienta de rendición de cuentas; el pluripartidismo es una característica sana de la democracia, no un reto negativo; y las elecciones periódicas fortalecen, no debilitan, la estabilidad democrática.',
  },
  {
    topic: 3, difficulty: 'BASIC',
    stem: '¿Qué se entiende por "participación ciudadana" dentro del funcionamiento de un sistema democrático?',
    correct: 'El conjunto de acciones mediante las cuales las personas influyen en las decisiones públicas, más allá de votar.',
    distractors: [
      'La obligación exclusiva de votar en las elecciones formales, sin ninguna otra forma posible de intervención ciudadana.',
      'Una actividad reservada únicamente a quienes ocupan un cargo público de elección popular.',
      'Una práctica que queda prohibida fuera de los periodos electorales formales establecidos.',
    ],
    layer1: 'El temario dedica un punto específico a la "participación ciudadana": comprende votar, pero también organizarse, proponer, vigilar la actuación del gobierno, participar en consultas y ejercer el derecho de petición, entre otras formas.',
    layer2: 'Una ciudadanía participativa fortalece la legitimidad democrática porque las decisiones públicas responden mejor a las necesidades reales de la población, no solo a la voluntad de quienes gobiernan.',
    layer3: 'La participación ciudadana no se agota en el voto; no está reservada a los funcionarios electos, es un derecho de toda persona; y no está prohibida fuera de los procesos electorales, puede ejercerse en todo momento.',
  },
  {
    topic: 3, difficulty: 'INTERMEDIATE',
    stem: '¿Qué caracteriza a una "ciudadanía informada, comprometida y participativa", según lo plantea el temario?',
    correct: 'Personas que se informan de los asuntos públicos, asumen responsabilidades cívicas y se involucran en su comunidad.',
    distractors: [
      'Personas que dependen por completo de que el gobierno les indique qué pensar sobre cada tema.',
      'Personas que evitan cualquier tipo de involucramiento en los asuntos públicos que no las afecten de forma inmediata.',
      'Personas cuya única responsabilidad cívica es pagar impuestos, sin ningún otro compromiso adicional.',
    ],
    layer1: 'El temario dedica un apartado a impulsar "una ciudadanía informada, comprometida y participativa": el conocimiento de los asuntos públicos, el sentido de responsabilidad y la disposición a involucrarse activamente van de la mano.',
    layer2: 'Esta ciudadanía activa se conecta con el papel de los medios de comunicación, como fuente de información, y con la participación ciudadana, como canal de involucramiento, ambos temas contiguos en el mismo programa.',
    layer3: 'Una ciudadanía informada no depende de que el gobierno le indique qué pensar, precisamente busca criterio propio; el desinterés por lo que no afecta de forma inmediata es lo opuesto al compromiso cívico; y las responsabilidades cívicas van más allá de pagar impuestos.',
  },
  {
    topic: 3, difficulty: 'INTERMEDIATE',
    stem: '¿Cuál es la función social de los medios de comunicación que destaca el temario cívico?',
    correct: 'Informar a la ciudadanía de manera veraz sobre los asuntos públicos, para que forme su propio criterio y participe.',
    distractors: [
      'Sustituir a las autoridades electas en la toma de las decisiones propias del gobierno.',
      'Garantizar que toda la población termine pensando exactamente lo mismo sobre cada tema de interés público nacional.',
      'Limitarse por completo al entretenimiento, sin ninguna relación con la vida cívica o política.',
    ],
    layer1: 'El temario ubica "la función social de los medios de comunicación" justo después del tema de la ciudadanía informada: los medios son una de las principales fuentes por las que la población conoce los asuntos públicos y forma su opinión.',
    layer2: 'Esta función social convive con la responsabilidad de verificar la información, frente al reto de la desinformación, y con el derecho a la libertad de expresión e información reconocido constitucionalmente.',
    layer3: 'Los medios no sustituyen a las autoridades electas; su función no es homogeneizar el pensamiento de la población, sino informar para que cada quien forme su propio criterio; y su papel cívico va más allá del entretenimiento.',
  },
  {
    topic: 3, difficulty: 'BASIC',
    stem: '¿Por qué el temario cívico incluye el "compromiso con el entorno natural y social" como parte de la formación ciudadana?',
    correct: 'Porque la relación responsable con el entorno natural y social es también una forma de ejercicio ciudadano.',
    distractors: [
      'Porque es un tema exclusivamente técnico, ajeno por completo a cualquier responsabilidad ciudadana.',
      'Porque solo compete a las autoridades ambientales del país, sin ninguna participación posible de la ciudadanía.',
      'Porque reemplaza por completo a los temas de participación política dentro de la formación cívica.',
    ],
    layer1: 'El temario dedica un apartado a "la importancia de la relación del ser humano con su entorno natural y social": el cuidado del entorno y la convivencia social se entienden como parte de una ciudadanía responsable, no como un asunto aislado de lo cívico.',
    layer2: 'Este enfoque conecta lo ambiental con lo social: el bienestar colectivo depende tanto de las relaciones entre personas como del entorno natural que comparten.',
    layer3: 'No es un tema exclusivamente técnico ni ajeno a la ciudadanía; no compete solo a las autoridades ambientales, involucra a toda la sociedad; y no sustituye a la participación política, la complementa.',
  },
  {
    topic: 3, difficulty: 'INTERMEDIATE',
    stem: 'Según el temario, ¿qué papel juega la negociación entre los recursos disponibles para la solución de conflictos sin violencia?',
    correct: 'Es un mecanismo mediante el cual las partes en conflicto dialogan y buscan acuerdos mutuamente aceptables.',
    distractors: [
      'Es un procedimiento que solo pueden usar las autoridades judiciales, nunca las personas ciudadanas comunes.',
      'Es una técnica que impone la voluntad de una sola de las partes sobre la otra, sin ningún diálogo previo.',
      'Es un recurso exclusivo para conflictos internacionales entre gobiernos, sin aplicación en la vida cotidiana.',
    ],
    layer1: 'El temario sitúa "la negociación" dentro del apartado de "recursos y condiciones para la solución de conflictos sin violencia": negociar implica que las partes dialoguen y construyan acuerdos, en lugar de recurrir a la fuerza.',
    layer2: 'Este contenido conecta con la formación de una cultura de paz y con habilidades cívicas prácticas —escuchar, argumentar, ceder— aplicables tanto en la vida escolar y familiar como en la comunitaria.',
    layer3: 'La negociación no está reservada a autoridades judiciales, cualquier persona puede emplearla; no consiste en imponer la voluntad de una parte sin diálogo, eso sería lo opuesto a negociar; y no se limita a conflictos internacionales, aplica también a la vida cotidiana.',
  },

  // ═══════════════════════════ 4. Ética ciudadana ═══════════════════════════
  {
    topic: 4, difficulty: 'BASIC',
    stem: '¿Qué distingue a la ética de la moral, aunque ambos conceptos suelen usarse de forma cercana en la formación cívica?',
    correct: 'La ética reflexiona sobre lo bueno y lo correcto; la moral son las normas de conducta que una sociedad practica.',
    distractors: [
      'Son exactamente lo mismo, sin ninguna diferencia conceptual real entre ambos términos.',
      'La ética regula solamente el comportamiento religioso; la moral regula exclusivamente el comportamiento legal vigente.',
      'La moral es universal y fija; la ética cambia de un país a otro sin ningún principio en común.',
    ],
    layer1: 'La ética es la disciplina que reflexiona críticamente sobre los principios y valores que orientan la conducta humana; la moral se refiere al conjunto de normas y costumbres concretas que efectivamente rigen la conducta de una persona o comunidad.',
    layer2: 'Esta distinción permite evaluar si una norma moral vigente, por ejemplo una costumbre social, es o no éticamente justificable, es decir, si realmente promueve el bien y la dignidad de las personas.',
    layer3: 'No son idénticas; ninguna de las dos se limita a lo religioso o a lo legal de forma exclusiva; y es más bien la moral la que varía entre sociedades, mientras la reflexión ética busca principios que puedan justificarse más allá de una costumbre particular.',
  },
  {
    topic: 4, difficulty: 'BASIC',
    stem: '¿Qué implica la responsabilidad ciudadana frente a las leyes y las instituciones de un Estado de derecho?',
    correct: 'Conocer y cumplir las normas vigentes, y exigir su cumplimiento también a las autoridades.',
    distractors: [
      'Obedecer cualquier orden de una autoridad, sin ninguna posibilidad de cuestionarla por vía legal.',
      'Ignorar las leyes que resulten inconvenientes para los intereses personales de cada quien.',
      'Delegar por completo en el gobierno cualquier responsabilidad sobre el cumplimiento de las normas.',
    ],
    layer1: 'La responsabilidad ciudadana en un Estado de derecho supone conocer las normas, cumplirlas, y también usar los mecanismos legales disponibles —quejas, amparos, denuncias— para exigir que las autoridades actúen conforme a la ley.',
    layer2: 'Esta responsabilidad es recíproca: no solo el ciudadano debe cumplir la ley, también tiene el derecho, y en cierto sentido el deber cívico, de vigilar que la autoridad la cumpla.',
    layer3: 'Un Estado de derecho no exige obediencia ciega a cualquier orden, las órdenes ilegales pueden impugnarse; las leyes no pueden ignorarse por conveniencia personal; y la responsabilidad de cumplir las normas no se delega enteramente en el gobierno.',
  },
  {
    topic: 4, difficulty: 'INTERMEDIATE',
    stem: '¿Qué caracteriza a la "cultura de la legalidad" como valor cívico?',
    correct: 'La convicción de que las normas deben respetarse por ser base de la convivencia justa, no por temor a una sanción.',
    distractors: [
      'La creencia de que las leyes solo deben respetarse cuando existe una vigilancia policial visible de por medio.',
      'La idea de que cumplir la ley es opcional, si la persona considera que una norma es injusta.',
      'La suposición de que la legalidad solo aplica a las personas con menos recursos económicos.',
    ],
    layer1: 'La cultura de la legalidad implica que las normas se cumplen porque se reconoce su valor para la convivencia social, no únicamente por miedo al castigo, y que existen cauces legítimos —no el incumplimiento unilateral— para cambiar una norma considerada injusta.',
    layer2: 'Esta cultura se contrapone a prácticas como la corrupción o la "letra muerta" de la ley, donde las normas existen formalmente pero no se aplican ni se respetan en la práctica.',
    layer3: 'Cumplir la ley no debe depender de la vigilancia presente; considerar injusta una norma no autoriza a incumplirla unilateralmente, existen vías legales para cambiarla; y la legalidad, como principio, aplica a todas las personas por igual, sin importar su condición económica.',
  },
  {
    topic: 4, difficulty: 'BASIC',
    stem: '¿Qué se entiende por ética en el servicio público o ética pública?',
    correct: 'El conjunto de principios que orientan a quienes ejercen un cargo público a actuar con honestidad e imparcialidad.',
    distractors: [
      'Las reglas de etiqueta y protocolo que todo funcionario debe seguir en los eventos y actos oficiales de gobierno.',
      'Un código opcional que cada funcionario puede decidir seguir o ignorar de forma libre.',
      'Un conjunto de privilegios exclusivos que corresponden a quienes ocupan un cargo público.',
    ],
    layer1: 'La ética pública orienta la actuación de servidoras y servidores públicos hacia el interés general, con principios como honestidad, imparcialidad, transparencia y rendición de cuentas, por encima de intereses particulares.',
    layer2: 'Este principio es la base de figuras como el servicio profesional de carrera y los sistemas de responsabilidades administrativas, que buscan que el ejercicio del poder público no se use en beneficio propio.',
    layer3: 'No se trata solo de protocolo o etiqueta; no es un código opcional, su incumplimiento puede tener consecuencias legales; y no es un conjunto de privilegios, es precisamente una limitación al ejercicio discrecional del poder.',
  },
  {
    topic: 4, difficulty: 'INTERMEDIATE',
    stem: '¿Por qué la corrupción se considera un problema ético y cívico, más allá de ser un delito?',
    correct: 'Porque rompe la confianza en las instituciones y distribuye de forma injusta los recursos comunes.',
    distractors: [
      'Porque afecta exclusivamente a quien paga o recibe el soborno, sin efecto alguno en el resto de la sociedad.',
      'Porque es un fenómeno exclusivo del sector privado, ajeno por completo al ámbito gubernamental.',
      'Porque representa solamente una pérdida económica, sin ninguna dimensión ética involucrada.',
    ],
    layer1: 'La corrupción no solo viola normas legales; erosiona la confianza social en las instituciones y desvía recursos públicos que deberían destinarse al bien común, afectando de forma desproporcionada a quienes menos tienen.',
    layer2: 'Por eso la formación cívica la aborda como un problema ético, de valores compartidos, y no únicamente como un problema jurídico o administrativo.',
    layer3: 'La corrupción tiene efectos que van más allá de quienes participan directamente en el acto; ocurre tanto en el sector público como en el privado; y su impacto no es solo económico, también daña la confianza y la cohesión social.',
  },
  {
    topic: 4, difficulty: 'BASIC',
    stem: '¿Qué implica el valor cívico de la tolerancia en una sociedad plural?',
    correct: 'Respetar las creencias y formas de vida distintas a las propias, sin renunciar a los propios principios.',
    distractors: [
      'Aceptar sin ninguna crítica cualquier conducta, incluidas las que vulneran los derechos de otras personas.',
      'Evitar por completo cualquier tipo de debate o desacuerdo público sobre temas sociales.',
      'Adoptar como propias las creencias de la mayoría, dejando de lado las convicciones personales.',
    ],
    layer1: 'La tolerancia cívica es el respeto activo a la diversidad de creencias, opiniones y formas de vida, como condición para la convivencia en una sociedad plural, sin que ese respeto implique aceptar cualquier conducta sin límite.',
    layer2: 'La tolerancia tiene un límite claro: no exige aceptar conductas que vulneren la dignidad o los derechos de otras personas, distinción central en la formación de una ciudadanía ética.',
    layer3: 'Tolerar no equivale a aceptar sin crítica cualquier conducta dañina; tampoco implica evitar el debate público, el desacuerdo respetuoso es parte de la convivencia democrática; y no exige abandonar las convicciones propias para adoptar las de la mayoría.',
  },
  {
    topic: 4, difficulty: 'INTERMEDIATE',
    stem: '¿Qué relación existe entre los derechos y las obligaciones de las personas dentro de la ética ciudadana, de acuerdo con el artículo 31 constitucional?',
    correct: 'Las personas tienen también obligaciones, como contribuir al gasto público y respetar las instituciones.',
    distractors: [
      'Los derechos y las obligaciones son conceptos completamente independientes, sin ninguna relación entre sí.',
      'Solo el gobierno tiene obligaciones; las personas únicamente tienen derechos, sin ningún deber correlativo.',
      'Las obligaciones ciudadanas se limitan de forma exclusiva a votar en las elecciones correspondientes.',
    ],
    layer1: 'El artículo 31 constitucional establece obligaciones de las y los mexicanos, como contribuir a los gastos públicos de manera proporcional y equitativa; junto con los derechos reconocidos en el resto de la Constitución, conforman una relación de reciprocidad entre las personas y el Estado.',
    layer2: 'La ética ciudadana subraya esta reciprocidad: ejercer derechos plenamente también implica asumir responsabilidades hacia la comunidad, no una relación unilateral en un solo sentido.',
    layer3: 'Derechos y obligaciones no son independientes entre sí; no son solo el gobierno quien tiene deberes, también las personas los tienen; y las obligaciones ciudadanas van más allá de votar, incluyen, por ejemplo, contribuir al gasto público y cumplir la ley.',
  },
  {
    topic: 4, difficulty: 'BASIC',
    stem: '¿Qué se entiende por "resolución pacífica de conflictos" como valor de la ética ciudadana?',
    correct: 'Buscar acuerdos mediante el diálogo o la mediación, en lugar de recurrir a la violencia o la imposición.',
    distractors: [
      'Evitar cualquier conflicto sin jamás expresar un desacuerdo, aunque exista una injusticia de por medio.',
      'Dejar que la parte con más poder decida siempre el resultado del conflicto, sin ninguna negociación previa.',
      'Delegar toda solución de conflictos de forma exclusiva en tribunales, sin ninguna vía informal posible.',
    ],
    layer1: 'La resolución pacífica de conflictos privilegia mecanismos como el diálogo, la negociación y la mediación para llegar a acuerdos aceptables para las partes, en contraste con la violencia o la imposición unilateral.',
    layer2: 'Este valor se practica en distintos ámbitos —familiar, escolar, comunitario— y es la base de una cultura de paz, que la ética ciudadana busca fomentar desde etapas tempranas.',
    layer3: 'Buscar la paz no significa callar ante una injusticia; no consiste en dejar que decida quien tiene más poder; y no excluye vías informales de solución, el diálogo y la mediación son precisamente alternativas a acudir siempre a un tribunal.',
  },
  {
    topic: 4, difficulty: 'INTERMEDIATE',
    stem: '¿Por qué la transparencia y la rendición de cuentas se consideran valores cívicos fundamentales en la relación entre gobierno y ciudadanía?',
    correct: 'Porque permiten a la ciudadanía conocer cómo se ejerce el poder público y exigir responsabilidad cuando corresponde.',
    distractors: [
      'Porque garantizan que ningún acto del gobierno pueda ser cuestionado ni revisado jamás por la ciudadanía en general.',
      'Porque son valores exclusivos del sector privado, sin ninguna aplicación posible al gobierno.',
      'Porque sustituyen por completo la necesidad de leyes y de instituciones de control ciudadano.',
    ],
    layer1: 'La transparencia —acceso a la información sobre la actuación gubernamental— y la rendición de cuentas —la obligación de las autoridades de explicar y justificar sus decisiones— permiten a la ciudadanía vigilar el ejercicio del poder público y de los recursos comunes.',
    layer2: 'Estos valores fortalecen la confianza social en las instituciones y son condición para que la participación ciudadana informada, otro valor cívico central, tenga sentido práctico.',
    layer3: 'Lejos de blindar los actos de gobierno, la transparencia y la rendición de cuentas los abren al escrutinio ciudadano; no son valores exclusivos del sector privado; y no sustituyen a las leyes ni a las instituciones de control, las complementan.',
  },
  {
    topic: 4, difficulty: 'ADVANCED',
    stem: 'Desde la ética ciudadana, ¿qué papel juega la diversidad y el pluralismo en la construcción de una sociedad democrática?',
    correct: 'Reconocer que la sociedad reúne identidades e intereses distintos, y que la democracia debe incluir esa diversidad.',
    distractors: [
      'Buscar que, con el tiempo, todas las personas terminen pensando y viviendo exactamente igual.',
      'Considerar que solo las opiniones de la mayoría numérica merecen tomarse en cuenta de verdad.',
      'Tratar la diversidad como un obstáculo que debe minimizarse para lograr una mayor estabilidad social y política.',
    ],
    layer1: 'El pluralismo reconoce que una sociedad democrática está formada por personas y grupos con identidades, creencias e intereses distintos, y que las instituciones deben dar cabida a esa diversidad, no buscar eliminarla ni homogeneizarla.',
    layer2: 'Este reconocimiento sustenta, por ejemplo, la protección de derechos de minorías y la existencia de mecanismos, como el sistema de partidos o medios de comunicación plurales, que permiten que distintas voces se expresen dentro del sistema político.',
    layer3: 'La meta no es la uniformidad de pensamiento; una democracia no se reduce a la voluntad de la mayoría numérica sin más, también protege a las minorías; y la diversidad no es un obstáculo a minimizar, es una condición de la convivencia democrática.',
  },
];
