import { PrismaClient } from '@prisma/client';
import { seedCareerTargets, syncCatalogCareers, type CareerSeed } from './careers';

const prisma = new PrismaClient();

/**
 * Seed de IPN Superior 2027 (MVP): Institución → Nivel → Examen → 3 Ramas
 * → Materias con pesos reales → Temas del temario oficial → Carreras ancla.
 *
 * Estructura: idempotente vía upsert. Los pesos y aciertos están marcados
 * con TODO-VERIFICAR donde son estimaciones en base al examen 2025.
 */

export async function seedIpn() {
  console.log('🦅 Sembrando IPN Superior 2027...');

  // 1. Institution
  const ipn = await prisma.institution.upsert({
    where: { code: 'IPN' },
    create: {
      code: 'IPN',
      name: 'Instituto Politécnico Nacional',
      logoUrl: 'https://via.placeholder.com/150?text=IPN',
    },
    update: {},
  });
  console.log('  ✓ Institución IPN');

  // 2. Level
  const superior = await prisma.level.upsert({
    where: { institutionId_type: { institutionId: ipn.id, type: 'SUPERIOR' } },
    create: {
      institutionId: ipn.id,
      type: 'SUPERIOR',
      name: 'Licenciatura',
    },
    update: {},
  });
  console.log('  ✓ Nivel Superior');

  // 3. Exam: 140 reactivos, ~180 minutos
  // TODO-VERIFICAR: duración exacta del examen IPN 2027 (estimado 180 min, rango típico 170-180)
  const exam2027 = await prisma.exam.upsert({
    where: { levelId_year: { levelId: superior.id, year: 2027 } },
    create: {
      levelId: superior.id,
      year: 2027,
      name: 'Examen de Admisión IPN 2027',
      durationMins: 180,
      totalQuestions: 140,
      examDate: new Date('2027-06-10'),
      isActive: true,
    },
    update: { examDate: new Date('2027-06-10') },
  });
  console.log('  ✓ Examen 2027 (140 reactivos, 180 min)');

  // 4. 3 Ramas del conocimiento (colores coherentes al design system)
  const branches = await Promise.all([
    prisma.area.upsert({
      where: { examId_code: { examId: exam2027.id, code: 'IPN_FISMAT' } },
      create: {
        examId: exam2027.id,
        code: 'IPN_FISMAT',
        name: 'Ingeniería y Ciencias Físico-Matemáticas',
        colorHex: '#7C3AED', // Marca: violeta (misma que UNAM Área 1)
        iconEmoji: '🔬',
        position: 1,
      },
      update: {},
    }),
    prisma.area.upsert({
      where: { examId_code: { examId: exam2027.id, code: 'IPN_MEDBIO' } },
      create: {
        examId: exam2027.id,
        code: 'IPN_MEDBIO',
        name: 'Ciencias Médico-Biológicas',
        colorHex: '#22C55E', // Marca: verde (misma que UNAM Área 2)
        iconEmoji: '⚕️',
        position: 2,
      },
      update: {},
    }),
    prisma.area.upsert({
      where: { examId_code: { examId: exam2027.id, code: 'IPN_SOCADM' } },
      create: {
        examId: exam2027.id,
        code: 'IPN_SOCADM',
        name: 'Ciencias Sociales y Administrativas',
        colorHex: '#FBBF24', // Marca: ámbar (misma que UNAM Área 3)
        iconEmoji: '📊',
        position: 3,
      },
      update: {},
    }),
  ]);
  console.log('  ✓ 3 Ramas con colores de marca');

  const ramas = {
    fismat: branches[0],
    medbio: branches[1],
    socadm: branches[2],
  };

  // 5. Materias con pesos reales (estructura oficial IPN 2025-2027)
  // TODO-VERIFICAR: distribución de pesos según publicación oficial IPN 2027.

  // sharedContentKey (G26): el examen IPN tiene un bloque de "Conocimientos
  // generales" (Matemáticas + Comunicación) común a las 3 ramas, más Química e
  // Inglés con el mismo temario en las ramas que las evalúan. Su contenido
  // verificado se comparte entre ramas del mismo examen. Ver migración 0011 y
  // docs/ESTADO.md §G26.
  const MATEMATICAS = 'IPN:MATEMATICAS';
  const QUIMICA = 'IPN:QUIMICA';
  const ESPANOL = 'IPN:ESPANOL';
  const INGLES = 'IPN:INGLES';

  // Rama FISMAT: total ~60 reactivos (Matemáticas pesada, Física, Química)
  const subjectsFismat = [
    { name: 'Matemáticas', weight: 24, icon: '➗', sharedKey: MATEMATICAS }, // Pesada en FISMAT
    { name: 'Física', weight: 20, icon: '⚛️' },
    { name: 'Química', weight: 10, icon: '🧪', sharedKey: QUIMICA },
    { name: 'Español/Lectura', weight: 4, icon: '📖', sharedKey: ESPANOL },
    { name: 'Inglés', weight: 2, icon: '🗣️', sharedKey: INGLES }, // Inglés débil en FISMAT
  ];
  await seedSubjectsAndTopics(prisma, ramas.fismat.id, subjectsFismat, generateTopicsFismat);
  console.log('  ✓ Rama FISMAT: 5 materias con 40+ temas');

  // Rama MEDBIO: total ~55 reactivos (Biología, Química, algo de Matemáticas)
  const subjectsMedbio = [
    { name: 'Biología', weight: 22, icon: '🦠' },
    { name: 'Química', weight: 16, icon: '🧪', sharedKey: QUIMICA },
    { name: 'Matemáticas', weight: 8, icon: '➗', sharedKey: MATEMATICAS }, // Menos peso que en FISMAT; mismo pool
    { name: 'Español/Lectura', weight: 6, icon: '📖', sharedKey: ESPANOL },
    { name: 'Inglés', weight: 3, icon: '🗣️', sharedKey: INGLES },
  ];
  await seedSubjectsAndTopics(prisma, ramas.medbio.id, subjectsMedbio, generateTopicsMedbio);
  console.log('  ✓ Rama MEDBIO: 5 materias con 35+ temas');

  // Rama SOCADM: total ~25 reactivos (Historia, Geografía, Economía, Administración)
  // TODO-VERIFICAR: distribución exacta de Sociales/Administrativas en IPN 2027.
  const subjectsSocadm = [
    { name: 'Historia de México', weight: 6, icon: '🏛️' },
    { name: 'Historia Universal', weight: 4, icon: '🌍' },
    { name: 'Geografía', weight: 4, icon: '🗺️' },
    // "Matemáticas Aplicadas" (estadística/probabilidad/datos) NO comparte
    // pool con el bloque general de Matemáticas: temario y enfoque distintos.
    { name: 'Matemáticas Aplicadas', weight: 3, icon: '📊' },
    { name: 'Español/Lectura', weight: 3, icon: '📖', sharedKey: ESPANOL },
    { name: 'Inglés', weight: 2, icon: '🗣️', sharedKey: INGLES },
    { name: 'Civismo/Derecho', weight: 3, icon: '⚖️' },
  ];
  await seedSubjectsAndTopics(prisma, ramas.socadm.id, subjectsSocadm, generateTopicsSocadm);
  console.log('  ✓ Rama SOCADM: 7 materias con 30+ temas');

  // 6. Carreras ancla por rama con minAciertos históricos
  // TODO-VERIFICAR: minAciertos son estimaciones en base a históricos 2021-2025 del IPN.
  // G101: TODO el catálogo oficial del IPN (src/lib/content/career-catalog.ts)
  // + aciertos mínimos de las anclas, por nombre OFICIAL.
  const ramaPairs = [
    [ramas.fismat.id, 'IPN_FISMAT', generateCareersFismat()],
    [ramas.medbio.id, 'IPN_MEDBIO', generateCareersMedbio()],
    [ramas.socadm.id, 'IPN_SOCADM', generateCareersSocadm()],
  ] as const;
  for (const [areaId, code, anchors] of ramaPairs) {
    await syncCatalogCareers(prisma, areaId, code);
    await seedCareerTargets(prisma, areaId, code, anchors);
  }
  console.log('  ✓ 72 carreras del catálogo oficial, con aciertos mínimos en las anclas');

  console.log('✅ IPN Superior 2027 lista');
}

// ─────────────────────────────────────────────────────────────────

async function seedSubjectsAndTopics(
  prisma: PrismaClient,
  areaId: string,
  subjects: Array<{ name: string; weight: number; icon: string; sharedKey?: string }>,
  topicsGenerator: () => Record<string, string[]>,
) {
  const topicsMap = topicsGenerator();

  for (let i = 0; i < subjects.length; i++) {
    const { name, weight, icon, sharedKey } = subjects[i];
    const subject = await prisma.subject.upsert({
      where: { areaId_name: { areaId, name } },
      create: {
        areaId,
        name,
        questionWeight: weight,
        iconEmoji: icon,
        position: i + 1,
        sharedContentKey: sharedKey ?? null,
      },
      // sharedContentKey (G26): reutilización de contenido entre ramas — ver
      // migración 0011 y docs/ESTADO.md §G26. Se reafirma en cada corrida.
      update: { questionWeight: weight, sharedContentKey: sharedKey ?? null },
    });

    // Temas del temario oficial
    const topics = topicsMap[name] || [];
    for (let j = 0; j < topics.length; j++) {
      await prisma.topic.upsert({
        where: { subjectId_name: { subjectId: subject.id, name: topics[j] } },
        create: {
          subjectId: subject.id,
          name: topics[j],
          position: j + 1,
        },
        update: {},
      });
    }
  }
}


// ─────────────────────────────────────────────────────────────────
// Generadores de temas (temario oficial IPN)

function generateTopicsFismat(): Record<string, string[]> {
  return {
    Matemáticas: [
      'Números y operaciones',
      'Álgebra elemental',
      'Ecuaciones lineales y cuadráticas',
      'Funciones y gráficas',
      'Trigonometría',
      'Geometría analítica',
      'Cálculo diferencial',
      'Cálculo integral',
      'Matrices y sistemas',
      'Combinatoria y probabilidad',
      'Sucesiones y series',
      'Números complejos',
    ],
    Física: [
      'Cinemática',
      'Dinámica',
      'Trabajo y energía',
      'Momentum e impulso',
      'Gravitación',
      'Fluidos',
      'Termodinámica',
      'Ondas y sonido',
      'Óptica',
      'Electrostática',
      'Corriente eléctrica',
      'Magnetismo',
      'Inducción electromagnética',
      'Física moderna',
    ],
    Química: [
      'Estructura atómica',
      'Tabla periódica',
      'Enlace químico',
      'Reacciones químicas',
      'Estequiometría',
      'Equilibrio químico',
      'Ácidos y bases',
      'Electroquímica',
      'Química orgánica básica',
    ],
    'Español/Lectura': [
      'Ortografía',
      'Gramática',
      'Comprensión lectora',
      'Análisis de textos',
    ],
    Inglés: [
      'Presente simple y continuo',
      'Pasado simple y continuo',
      'Vocabulario técnico',
    ],
  };
}

function generateTopicsMedbio(): Record<string, string[]> {
  return {
    Biología: [
      'Célula y organelos',
      'Mitosis y meiosis',
      'Genética básica',
      'Evolución y especiación',
      'Ecología y ecosistemas',
      'Sistemas del cuerpo humano',
      'Nutrición y metabolismo',
      'Homeostasis',
      'Sistema nervioso',
      'Sistema endocrino',
      'Inmunología',
      'Reproducción',
    ],
    Química: [
      'Estructura atómica',
      'Tabla periódica',
      'Enlace químico',
      'Reacciones químicas',
      'Estequiometría',
      'Equilibrio químico',
      'Ácidos y bases',
      'Química orgánica',
      'Bioquímica básica',
    ],
    Matemáticas: [
      'Álgebra',
      'Funciones',
      'Trigonometría básica',
      'Geometría',
      'Estadística descriptiva',
      'Probabilidad',
    ],
    'Español/Lectura': [
      'Ortografía',
      'Comprensión lectora',
      'Análisis de textos',
    ],
    Inglés: [
      'Presente simple',
      'Pasado simple',
      'Vocabulario médico-científico',
    ],
  };
}

function generateTopicsSocadm(): Record<string, string[]> {
  return {
    'Historia de México': [
      'Época prehispánica',
      'Conquista y Colonia',
      'Independencia',
      'Reforma y Guerra de Intervención',
      'Revolución Mexicana',
      'México Moderno (siglo XX-XXI)',
    ],
    'Historia Universal': [
      'Antigüedad clásica',
      'Edad Media',
      'Renacimiento',
      'Ilustración y Liberalismo',
      'Industrialización',
      'Guerras Mundiales',
      'Siglo XXI',
    ],
    Geografía: [
      'Geografía física',
      'Geografía humana',
      'Geografía política',
      'Geografía de México',
      'Cartografía',
    ],
    'Matemáticas Aplicadas': [
      'Estadística descriptiva',
      'Probabilidad',
      'Análisis de datos',
    ],
    'Español/Lectura': [
      'Comprensión lectora',
      'Análisis de textos',
      'Redacción',
    ],
    Inglés: [
      'Lectura de textos',
      'Vocabulario de negocios',
    ],
    'Civismo/Derecho': [
      'Derecho constitucional',
      'Derechos humanos',
      'Sistemas políticos',
      'Ética ciudadana',
    ],
  };
}

// ─────────────────────────────────────────────────────────────────
// Carreras ancla — minAciertos por triangulación multi-fuente (CC-13)
//
// A diferencia de UNAM, el IPN NO tiene un portal público de resultados por
// carrera (admision.ipn.mx/nse/sitio/ exige cuenta de aspirante). Sin fuente
// oficial primaria verificable, el techo de confianza aquí es MED (2 fuentes
// coinciden) o más frecuentemente LOW (divergen). Las dos compilaciones
// usadas citan ciclos/rondas distintos (regular 2024 vs "segunda vuelta"
// enero-agosto 2026), lo que explica gran parte de la divergencia — no es
// necesariamente un error de ninguna fuente, pero tampoco permite promediar.
// Regla aplicada: cuando divergen, se usa el valor MÁS ALTO (más
// conservador — asumir que se necesita más, no menos). Ver
// docs/ACIERTOS_MINIMOS.md para el detalle completo, fuente por fuente.
//
// Nombres corregidos a los reales de scripts/extraction/ipn.taxonomy.json
// (CC-09b, verificado contra la oferta educativa oficial del IPN) donde CC-08
// había usado un nombre aproximado.

const UNIBETAS_2024 = 'unibetas.com — compilación de datos IPN, ciclo 2024';
const FABRICA_2026 = 'fabricadeperiodismo.com — dato vía Plataforma Nacional de Transparencia (PNT), segunda vuelta ene-ago 2026';
const WEB_CROSSCHECK = 'Corroboración cruzada por búsqueda web (coincide con unibetas.com)';

function generateCareersFismat(): CareerSeed[] {
  return [
    {
      name: 'Ingeniería en Sistemas Computacionales',
      minAciertos: 97,
      year: 2026,
      confidence: 'LOW',
      sources: [
        { url: 'https://unibetas.com/aciertos-carreras-ipn/', label: `${UNIBETAS_2024}: 67` },
        { url: 'https://fabricadeperiodismo.com/noticias/cuantos-aciertos-pide-el-ipn-puntajes-minimos-por-licenciatura-e-ingenierias/', label: `${FABRICA_2026}: 97 (usado, más conservador)` },
      ],
    },
    {
      name: 'Ingeniería Eléctrica',
      minAciertos: 99,
      year: 2024,
      confidence: 'LOW',
      sources: [
        { url: 'https://unibetas.com/aciertos-carreras-ipn/', label: `${UNIBETAS_2024}: 99 (usado, más conservador)` },
        { url: 'https://fabricadeperiodismo.com/noticias/cuantos-aciertos-pide-el-ipn-puntajes-minimos-por-licenciatura-e-ingenierias/', label: `${FABRICA_2026}: 75` },
      ],
    },
    {
      name: 'Ingeniería Mecánica',
      minAciertos: 94,
      year: 2024,
      confidence: 'LOW',
      sources: [
        { url: 'https://unibetas.com/aciertos-carreras-ipn/', label: `${UNIBETAS_2024}: 94 (usado, más conservador)` },
        { url: 'https://fabricadeperiodismo.com/noticias/cuantos-aciertos-pide-el-ipn-puntajes-minimos-por-licenciatura-e-ingenierias/', label: `${FABRICA_2026}: 65` },
      ],
    },
    {
      name: 'Ingeniería en Comunicaciones y Electrónica',
      minAciertos: 93,
      year: 2024,
      confidence: 'LOW',
      sources: [
        { url: 'https://unibetas.com/aciertos-carreras-ipn/', label: `${UNIBETAS_2024}: 93 (usado, más conservador)` },
        { url: 'https://fabricadeperiodismo.com/noticias/cuantos-aciertos-pide-el-ipn-puntajes-minimos-por-licenciatura-e-ingenierias/', label: `${FABRICA_2026}: 43` },
      ],
    },
    {
      name: 'Ingeniería Civil',
      minAciertos: 70,
      year: 2024,
      confidence: 'LOW',
      sources: [
        { url: 'https://unibetas.com/aciertos-carreras-ipn/', label: `${UNIBETAS_2024}: 70 (usado, más conservador)` },
        { url: 'https://fabricadeperiodismo.com/noticias/cuantos-aciertos-pide-el-ipn-puntajes-minimos-por-licenciatura-e-ingenierias/', label: `${FABRICA_2026}: 59` },
      ],
    },
    {
      name: 'Ingeniería Química Industrial',
      minAciertos: 94,
      year: 2024,
      confidence: 'LOW',
      sources: [
        { url: 'https://unibetas.com/aciertos-carreras-ipn/', label: `${UNIBETAS_2024}: 94, "Industrial Chemical Engineering" (usado, más conservador)` },
        { url: 'https://fabricadeperiodismo.com/noticias/cuantos-aciertos-pide-el-ipn-puntajes-minimos-por-licenciatura-e-ingenierias/', label: `${FABRICA_2026}: 41-66 según variante de ingeniería química; mapeo con la fuente ambiguo` },
      ],
    },
    {
      // CC-08: "Matemáticas (Ciencias Básicas)" — nombre corregido al real
      // (ESFM), ver scripts/extraction/ipn.taxonomy.json (CC-09b).
      name: 'Ingeniería Matemática',
      minAciertos: 95,
      year: 2024,
      confidence: 'LOW',
      sources: [
        { url: 'https://unibetas.com/aciertos-carreras-ipn/', label: `${UNIBETAS_2024}: 95 (usado, más conservador)` },
        { url: 'https://fabricadeperiodismo.com/noticias/cuantos-aciertos-pide-el-ipn-puntajes-minimos-por-licenciatura-e-ingenierias/', label: `${FABRICA_2026}: 91` },
      ],
    },
    {
      // CC-08: "Física (Ciencias Básicas)" — nombre corregido al real (ESFM).
      name: 'Licenciatura en Física y Matemáticas',
      minAciertos: 104,
      year: 2026,
      confidence: 'LOW',
      sources: [
        { url: 'https://unibetas.com/aciertos-carreras-ipn/', label: `${UNIBETAS_2024}: 91` },
        { url: 'https://fabricadeperiodismo.com/noticias/cuantos-aciertos-pide-el-ipn-puntajes-minimos-por-licenciatura-e-ingenierias/', label: `${FABRICA_2026}: 104 (usado, más conservador)` },
      ],
    },
  ];
}

function generateCareersMedbio(): CareerSeed[] {
  return [
    {
      // CC-08: "Medicina (ESM)" — nombre corregido al real (CC-09b).
      name: 'Médico Cirujano Partero',
      minAciertos: 109,
      year: 2024,
      confidence: 'MED',
      sources: [
        { url: 'https://unibetas.com/aciertos-carreras-ipn/', label: `${UNIBETAS_2024}: 109` },
        { url: '', label: `${WEB_CROSSCHECK}: al menos 2 artículos adicionales citan 109 para el ciclo 2024-2025 (agregado de motor de búsqueda, sin una única URL trazable — no se afirma más certeza de la que esto sostiene)` },
      ],
    },
    {
      // CC-08: "Cirugía Dental (ESD)" no existe; el IPN ofrece Odontología
      // en CICS (CC-09b).
      name: 'Licenciatura en Odontología',
      minAciertos: 115,
      year: 2026,
      confidence: 'LOW',
      sources: [
        { url: 'https://unibetas.com/aciertos-carreras-ipn/', label: `${UNIBETAS_2024}: "Dentistry" 102` },
        { url: 'https://fabricadeperiodismo.com/noticias/cuantos-aciertos-pide-el-ipn-puntajes-minimos-por-licenciatura-e-ingenierias/', label: `${FABRICA_2026}: "Dental Medicine" 115 (usado, más conservador)` },
      ],
    },
    {
      name: 'Licenciatura en Biología',
      minAciertos: 110,
      year: 2026,
      confidence: 'LOW',
      sources: [
        { url: 'https://unibetas.com/aciertos-carreras-ipn/', label: `${UNIBETAS_2024}: 98` },
        { url: 'https://fabricadeperiodismo.com/noticias/cuantos-aciertos-pide-el-ipn-puntajes-minimos-por-licenciatura-e-ingenierias/', label: `${FABRICA_2026}: 110 (usado, más conservador)` },
      ],
    },
    {
      // CC-08: "Química Farmacéutica (ENCB)" — nombre corregido al real.
      name: 'Químico Farmacéutico Industrial',
      minAciertos: 110,
      year: 2026,
      confidence: 'LOW',
      sources: [
        { url: 'https://unibetas.com/aciertos-carreras-ipn/', label: `${UNIBETAS_2024}: 100` },
        { url: 'https://fabricadeperiodismo.com/noticias/cuantos-aciertos-pide-el-ipn-puntajes-minimos-por-licenciatura-e-ingenierias/', label: `${FABRICA_2026}: "Pharmaceutical Chemistry" 110 (usado, más conservador; mapeo QFB/QFI ambiguo)` },
      ],
    },
    {
      // CC-08: "Enfermería (ESM)" — el IPN la ofrece como Enfermería y
      // Obstetricia en ESEO (CC-09b).
      name: 'Licenciatura en Enfermería y Obstetricia',
      minAciertos: 111,
      year: 2026,
      confidence: 'LOW',
      sources: [
        { url: 'https://unibetas.com/aciertos-carreras-ipn/', label: `${UNIBETAS_2024}: "Nursing and Obstetrics" 94` },
        { url: 'https://fabricadeperiodismo.com/noticias/cuantos-aciertos-pide-el-ipn-puntajes-minimos-por-licenciatura-e-ingenierias/', label: `${FABRICA_2026}: "Nursing" 111 (usado, más conservador; nombre no calza exacto)` },
      ],
    },
    {
      name: 'Licenciatura en Psicología',
      minAciertos: 93,
      year: 2024,
      confidence: 'LOW',
      sources: [{ url: 'https://unibetas.com/aciertos-carreras-ipn/', label: `${UNIBETAS_2024}: 93 (única fuente encontrada, sin corroborar)` }],
    },
    // G101: «Bioquímica Clínica (ENCB)» se retiró — no existe en la oferta
    // oficial del IPN y sus aciertos mínimos eran una estimación sin fuente.
  ];
}

function generateCareersSocadm(): CareerSeed[] {
  return [
    {
      // G101: «Administración (CIMA)» — el IPN no tiene plantel CIMA; la fuente
      // citada es «Industrial Administration» (UPIICSA).
      name: 'Licenciatura en Administración Industrial',
      minAciertos: 99,
      year: 2024,
      confidence: 'LOW',
      sources: [
        { url: 'https://unibetas.com/aciertos-carreras-ipn/', label: `${UNIBETAS_2024}: "Industrial Administration" 99 (usado, más conservador)` },
        { url: 'https://fabricadeperiodismo.com/noticias/cuantos-aciertos-pide-el-ipn-puntajes-minimos-por-licenciatura-e-ingenierias/', label: `${FABRICA_2026}: "Industrial Administration" 87` },
      ],
    },
    {
      // G101: «Contabilidad (CIMA)» — la fuente es «Public Accounting» (ESCA).
      name: 'Contador Público',
      minAciertos: 97,
      year: 2026,
      confidence: 'LOW',
      sources: [
        { url: 'https://unibetas.com/aciertos-carreras-ipn/', label: `${UNIBETAS_2024}: "Public Accounting" 83` },
        { url: 'https://fabricadeperiodismo.com/noticias/cuantos-aciertos-pide-el-ipn-puntajes-minimos-por-licenciatura-e-ingenierias/', label: `${FABRICA_2026}: "Public Accounting" 97 (usado, más conservador)` },
      ],
    },
    {
      // G101: «Comercio Internacional (CIMA)» — la fuente es «International
      // Business», que en la oferta oficial es Negocios Internacionales (ESCA).
      name: 'Licenciatura en Negocios Internacionales',
      minAciertos: 107,
      year: 2026,
      confidence: 'LOW',
      sources: [
        { url: 'https://unibetas.com/aciertos-carreras-ipn/', label: `${UNIBETAS_2024}: "International Business" 93` },
        { url: 'https://fabricadeperiodismo.com/noticias/cuantos-aciertos-pide-el-ipn-puntajes-minimos-por-licenciatura-e-ingenierias/', label: `${FABRICA_2026}: "International Business" 107 (usado, más conservador)` },
      ],
    },
    {
      // G101: «Economía (CICS)» — Economía se imparte en la ESE, no en CICS.
      name: 'Licenciatura en Economía',
      minAciertos: 94,
      year: 2024,
      confidence: 'LOW',
      sources: [
        { url: 'https://unibetas.com/aciertos-carreras-ipn/', label: `${UNIBETAS_2024}: 94 (usado, más conservador)` },
        { url: 'https://fabricadeperiodismo.com/noticias/cuantos-aciertos-pide-el-ipn-puntajes-minimos-por-licenciatura-e-ingenierias/', label: `${FABRICA_2026}: 73 (listado como programa de licenciatura, no ingeniería; mapeo incierto)` },
      ],
    },
    {
      name: 'Licenciatura en Turismo',
      minAciertos: 100,
      year: 2026,
      confidence: 'LOW',
      sources: [
        { url: 'https://unibetas.com/aciertos-carreras-ipn/', label: `${UNIBETAS_2024}: 76` },
        { url: 'https://fabricadeperiodismo.com/noticias/cuantos-aciertos-pide-el-ipn-puntajes-minimos-por-licenciatura-e-ingenierias/', label: `${FABRICA_2026}: 100 (usado, más conservador)` },
      ],
    },
    // G101: «Gestión y Dirección de Empresas» se retiró — no existe en la
    // oferta oficial del IPN y sus aciertos mínimos eran una estimación sin fuente.
  ];
}
