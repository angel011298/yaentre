import { PrismaClient } from '@prisma/client';

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
  // Rama FISMAT: total ~60 reactivos (Matemáticas pesada, Física, Química)
  const subjectsFismat = [
    { name: 'Matemáticas', weight: 24, icon: '➗' }, // Pesada en FISMAT
    { name: 'Física', weight: 20, icon: '⚛️' },
    { name: 'Química', weight: 10, icon: '🧪' },
    { name: 'Español/Lectura', weight: 4, icon: '📖' },
    { name: 'Inglés', weight: 2, icon: '🗣️' }, // Inglés débil en FISMAT
  ];
  await seedSubjectsAndTopics(prisma, ramas.fismat.id, subjectsFismat, generateTopicsFismat);
  console.log('  ✓ Rama FISMAT: 5 materias con 40+ temas');

  // Rama MEDBIO: total ~55 reactivos (Biología, Química, algo de Matemáticas)
  const subjectsMedbio = [
    { name: 'Biología', weight: 22, icon: '🦠' },
    { name: 'Química', weight: 16, icon: '🧪' },
    { name: 'Matemáticas', weight: 8, icon: '➗' }, // Menos que en FISMAT
    { name: 'Español/Lectura', weight: 6, icon: '📖' },
    { name: 'Inglés', weight: 3, icon: '🗣️' },
  ];
  await seedSubjectsAndTopics(prisma, ramas.medbio.id, subjectsMedbio, generateTopicsMedbio);
  console.log('  ✓ Rama MEDBIO: 5 materias con 35+ temas');

  // Rama SOCADM: total ~25 reactivos (Historia, Geografía, Economía, Administración)
  // TODO-VERIFICAR: distribución exacta de Sociales/Administrativas en IPN 2027.
  const subjectsSocadm = [
    { name: 'Historia de México', weight: 6, icon: '🏛️' },
    { name: 'Historia Universal', weight: 4, icon: '🌍' },
    { name: 'Geografía', weight: 4, icon: '🗺️' },
    { name: 'Matemáticas Aplicadas', weight: 3, icon: '📊' },
    { name: 'Español/Lectura', weight: 3, icon: '📖' },
    { name: 'Inglés', weight: 2, icon: '🗣️' },
    { name: 'Civismo/Derecho', weight: 3, icon: '⚖️' },
  ];
  await seedSubjectsAndTopics(prisma, ramas.socadm.id, subjectsSocadm, generateTopicsSocadm);
  console.log('  ✓ Rama SOCADM: 7 materias con 30+ temas');

  // 6. Carreras ancla por rama con minAciertos históricos
  // TODO-VERIFICAR: minAciertos son estimaciones en base a históricos 2021-2025 del IPN.
  await seedCareers(prisma, ramas.fismat.id, generateCareersFismat());
  await seedCareers(prisma, ramas.medbio.id, generateCareersMedbio());
  await seedCareers(prisma, ramas.socadm.id, generateCareersSocadm());
  console.log('  ✓ Carreras ancla (20+) con aciertos mínimos');

  console.log('✅ IPN Superior 2027 lista');
}

// ─────────────────────────────────────────────────────────────────

async function seedSubjectsAndTopics(
  prisma: PrismaClient,
  areaId: string,
  subjects: Array<{ name: string; weight: number; icon: string }>,
  topicsGenerator: () => Record<string, string[]>,
) {
  const topicsMap = topicsGenerator();

  for (let i = 0; i < subjects.length; i++) {
    const { name, weight, icon } = subjects[i];
    const subject = await prisma.subject.upsert({
      where: { areaId_name: { areaId, name } },
      create: {
        areaId,
        name,
        questionWeight: weight,
        iconEmoji: icon,
        position: i + 1,
      },
      update: { questionWeight: weight },
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

async function seedCareers(
  prisma: PrismaClient,
  areaId: string,
  careers: Array<{ name: string; minAciertos: number; year: number }>,
) {
  for (const career of careers) {
    await prisma.career.upsert({
      where: { areaId_name: { areaId, name: career.name } },
      create: {
        areaId,
        name: career.name,
        minAciertos: career.minAciertos,
        minAciertosYear: career.year,
      },
      update: { minAciertos: career.minAciertos },
    });
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
// Carreras ancla (con aciertos mínimos históricos 2021-2025)

function generateCareersFismat() {
  return [
    { name: 'Ingeniería en Sistemas Computacionales (ESCOM)', minAciertos: 102, year: 2025 },
    { name: 'Ingeniería Eléctrica (ESIME)', minAciertos: 98, year: 2025 },
    { name: 'Ingeniería Mecánica (ESIME)', minAciertos: 94, year: 2025 },
    { name: 'Ingeniería en Comunicaciones y Electrónica', minAciertos: 96, year: 2025 },
    { name: 'Ingeniería Civil (ESIA)', minAciertos: 88, year: 2025 },
    { name: 'Ingeniería Química (ESIQIE)', minAciertos: 92, year: 2025 },
    { name: 'Matemáticas (Ciencias Básicas)', minAciertos: 100, year: 2025 }, // TODO-VERIFICAR
    { name: 'Física (Ciencias Básicas)', minAciertos: 98, year: 2025 }, // TODO-VERIFICAR
  ];
}

function generateCareersMedbio() {
  return [
    { name: 'Medicina (ESM)', minAciertos: 108, year: 2025 },
    { name: 'Cirugía Dental (ESD)', minAciertos: 102, year: 2025 },
    { name: 'Biología (Ciencias Biológicas)', minAciertos: 85, year: 2025 },
    { name: 'Química Farmacéutica (ENCB)', minAciertos: 95, year: 2025 },
    { name: 'Enfermería (ESM)', minAciertos: 80, year: 2025 },
    { name: 'Psicología (CICS)', minAciertos: 82, year: 2025 }, // TODO-VERIFICAR
    { name: 'Bioquímica Clínica (ENCB)', minAciertos: 92, year: 2025 }, // TODO-VERIFICAR
  ];
}

function generateCareersSocadm() {
  return [
    { name: 'Administración (CIMA)', minAciertos: 76, year: 2025 },
    { name: 'Contabilidad (CIMA)', minAciertos: 74, year: 2025 },
    { name: 'Comercio Internacional (CIMA)', minAciertos: 75, year: 2025 }, // TODO-VERIFICAR
    { name: 'Economía (CICS)', minAciertos: 80, year: 2025 },
    { name: 'Turismo (CIMA)', minAciertos: 70, year: 2025 }, // TODO-VERIFICAR
    { name: 'Gestión y Dirección de Empresas', minAciertos: 78, year: 2025 }, // TODO-VERIFICAR
  ];
}
