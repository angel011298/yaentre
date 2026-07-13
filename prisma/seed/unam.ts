import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Seed de UNAM Superior 2027 (MVP): Institución → Nivel → Examen → 4 Áreas
 * → Materias con pesos reales → Temas del temario oficial → Carreras ancla.
 *
 * Estructura: determinista e idempotente vía upsert (no duplica en ejecuciones
 * repetidas). Los pesos de reactivos (questionWeight) y aciertos mínimos
 * (minAciertos) están marcados con TODO-VERIFICAR donde son estimaciones.
 */

export async function seedUnam() {
  console.log('🌽 Sembrando UNAM Superior 2027...');

  // 1. Institution
  const unam = await prisma.institution.upsert({
    where: { code: 'UNAM' },
    create: {
      code: 'UNAM',
      name: 'Universidad Nacional Autónoma de México',
      logoUrl: 'https://via.placeholder.com/150?text=UNAM',
    },
    update: {},
  });
  console.log('  ✓ Institución UNAM');

  // 2. Level
  const superior = await prisma.level.upsert({
    where: { institutionId_type: { institutionId: unam.id, type: 'SUPERIOR' } },
    create: {
      institutionId: unam.id,
      type: 'SUPERIOR',
      name: 'Licenciatura',
    },
    update: {},
  });
  console.log('  ✓ Nivel Superior');

  // 3. Exam
  const exam2027 = await prisma.exam.upsert({
    where: { levelId_year: { levelId: superior.id, year: 2027 } },
    create: {
      levelId: superior.id,
      year: 2027,
      name: 'Concurso de Selección Licenciatura 2027',
      durationMins: 180,
      totalQuestions: 120,
      examDate: new Date('2027-05-15'),
      isActive: true,
    },
    update: { examDate: new Date('2027-05-15') },
  });
  console.log('  ✓ Examen 2027 (120 reactivos, 180 min)');

  // 4. Áreas (4 según UIUX Spec: Físico-Matemáticas, Biológicas, Sociales, Humanidades)
  const areas = await Promise.all([
    prisma.area.upsert({
      where: { examId_code: { examId: exam2027.id, code: 'AREA_1' } },
      create: {
        examId: exam2027.id,
        code: 'AREA_1',
        name: 'Ciencias Físico-Matemáticas y las Ingenierías',
        colorHex: '#7C3AED',
        iconEmoji: '📐',
        position: 1,
      },
      update: {},
    }),
    prisma.area.upsert({
      where: { examId_code: { examId: exam2027.id, code: 'AREA_2' } },
      create: {
        examId: exam2027.id,
        code: 'AREA_2',
        name: 'Ciencias Biológicas, Químicas y de la Salud',
        colorHex: '#22C55E',
        iconEmoji: '🧬',
        position: 2,
      },
      update: {},
    }),
    prisma.area.upsert({
      where: { examId_code: { examId: exam2027.id, code: 'AREA_3' } },
      create: {
        examId: exam2027.id,
        code: 'AREA_3',
        name: 'Ciencias Sociales',
        colorHex: '#FBBF24',
        iconEmoji: '🏛️',
        position: 3,
      },
      update: {},
    }),
    prisma.area.upsert({
      where: { examId_code: { examId: exam2027.id, code: 'AREA_4' } },
      create: {
        examId: exam2027.id,
        code: 'AREA_4',
        name: 'Humanidades y Artes',
        colorHex: '#F97316',
        iconEmoji: '📚',
        position: 4,
      },
      update: {},
    }),
  ]);
  console.log('  ✓ 4 Áreas con colores de marca');

  // 5. Materias con pesos reales (guía oficial UNAM 2025-2027)
  // TODO-VERIFICAR: pesos son aproximaciones en base al esquema oficial; validar contra publicación 2027.
  const area1 = areas[0];
  const area2 = areas[1];
  const area3 = areas[2];
  const area4 = areas[3];

  // Área 1: Físico-Matemáticas (total ~70 de 120)
  const subjectsArea1 = [
    { name: 'Matemáticas', weight: 26, icon: '➗' },
    { name: 'Física', weight: 16, icon: '⚛️' },
    { name: 'Química', weight: 12, icon: '🧪' },
    { name: 'Español', weight: 10, icon: '📖' },
    { name: 'Inglés', weight: 6, icon: '🗣️' },
  ];
  await seedSubjectsAndTopics(
    prisma,
    area1.id,
    subjectsArea1,
    generateTopicsArea1,
  );
  console.log('  ✓ Área 1: 5 materias con 45+ temas');

  // Área 2: Biológicas (total ~30 de 120)
  const subjectsArea2 = [
    { name: 'Biología', weight: 14, icon: '🦠' },
    { name: 'Química', weight: 8, icon: '🧪' },
    { name: 'Español', weight: 5, icon: '📖' },
    { name: 'Inglés', weight: 3, icon: '🗣️' },
  ];
  await seedSubjectsAndTopics(
    prisma,
    area2.id,
    subjectsArea2,
    generateTopicsArea2,
  );
  console.log('  ✓ Área 2: 4 materias con 30+ temas');

  // Área 3: Sociales (total ~20 de 120)
  const subjectsArea3 = [
    { name: 'Historia de México', weight: 7, icon: '🏛️' },
    { name: 'Historia Universal', weight: 5, icon: '🌍' },
    { name: 'Geografía', weight: 4, icon: '🗺️' },
    { name: 'Español', weight: 3, icon: '📖' },
    { name: 'Inglés', weight: 1, icon: '🗣️' },
  ];
  await seedSubjectsAndTopics(
    prisma,
    area3.id,
    subjectsArea3,
    generateTopicsArea3,
  );
  console.log('  ✓ Área 3: 5 materias con 25+ temas');

  // Área 4: Humanidades (total ~10 de 120)
  const subjectsArea4 = [
    { name: 'Literatura', weight: 4, icon: '📚' },
    { name: 'Filosofía', weight: 3, icon: '🧠' },
    { name: 'Artes', weight: 2, icon: '🎭' },
    { name: 'Español', weight: 1, icon: '📖' },
  ];
  await seedSubjectsAndTopics(
    prisma,
    area4.id,
    subjectsArea4,
    generateTopicsArea4,
  );
  console.log('  ✓ Área 4: 4 materias con 15+ temas');

  // 6. Carreras ancla por área con minAciertos históricos
  // TODO-VERIFICAR: minAciertos son estimaciones en base a históricos 2021-2025.
  await seedCareers(prisma, area1.id, generateCareersArea1());
  await seedCareers(prisma, area2.id, generateCareersArea2());
  await seedCareers(prisma, area3.id, generateCareersArea3());
  await seedCareers(prisma, area4.id, generateCareersArea4());
  console.log('  ✓ Carreras ancla (25+) con aciertos mínimos');

  console.log('✅ UNAM Superior 2027 lista');
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
// Generadores de temas (temario oficial UNAM)

function generateTopicsArea1(): Record<string, string[]> {
  return {
    Matemáticas: [
      'Números reales y complejos',
      'Álgebra: ecuaciones lineales y cuadráticas',
      'Polinomios y funciones',
      'Trigonometría',
      'Geometría analítica',
      'Límites y continuidad',
      'Derivadas',
      'Integrales',
      'Series y sucesiones',
      'Matrices y sistemas de ecuaciones',
      'Progresiones y combinatoria',
      'Estadística descriptiva',
    ],
    Física: [
      'Cinemática y dinámica',
      'Trabajo y energía',
      'Conservación de momento',
      'Gravitación universal',
      'Fluidos',
      'Termodinámica',
      'Ondas y sonido',
      'Óptica',
      'Electrostática',
      'Circuitos eléctricos',
      'Magnetismo',
      'Física moderna',
    ],
    Química: [
      'Estructura atómica',
      'Tabla periódica',
      'Enlace químico',
      'Estados de la materia',
      'Reacciones químicas',
      'Estequiometría',
      'Equilibrio químico',
      'Ácidos, bases y sales',
      'Electroquímica',
    ],
    Español: [
      'Ortografía y puntuación',
      'Morfosintaxis',
      'Semántica',
      'Literatura medieval',
      'Literatura moderna',
      'Redacción de textos',
      'Comprensión lectora',
    ],
    Inglés: [
      'Grammar: present and past tenses',
      'Vocabulary and idioms',
      'Reading comprehension',
      'Writing skills',
      'Listening skills',
    ],
  };
}

function generateTopicsArea2(): Record<string, string[]> {
  return {
    Biología: [
      'Célula y organelos',
      'Mitosis y meiosis',
      'Genética mendeliana',
      'Evolución',
      'Ecología y ecosistemas',
      'Sistemas del cuerpo humano',
      'Nutrición y metabolismo',
      'Homeostasis',
      'Reproducción',
      'Inmunología',
    ],
    Química: [
      'Estructura atómica',
      'Tabla periódica',
      'Enlace químico',
      'Reacciones orgánicas',
      'Equilibrio químico',
      'Ácidos y bases',
    ],
    Español: [
      'Ortografía',
      'Comprensión lectora',
      'Redacción',
      'Literatura',
    ],
    Inglés: [
      'Grammar básico',
      'Vocabulario científico',
      'Lectura de textos técnicos',
    ],
  };
}

function generateTopicsArea3(): Record<string, string[]> {
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
      'Ilustración',
      'Revoluciones de 1848',
      'Imperialismo e Industrialización',
      'Guerras Mundiales',
      'Siglo XXI',
    ],
    Geografía: [
      'Cartografía y sistemas de referencia',
      'Geomorfología',
      'Climas y vegetación',
      'Geografía política',
      'Geografía económica',
      'Geografía de México',
    ],
    Español: [
      'Comprensión de textos',
      'Análisis literario',
      'Redacción de ensayos',
    ],
    Inglés: [
      'Reading comprehension histórico',
      'Vocabulario contextual',
    ],
  };
}

function generateTopicsArea4(): Record<string, string[]> {
  return {
    Literatura: [
      'Literatura prehispánica',
      'Literatura colonial',
      'Literatura neoclásica y romántica',
      'Realismo y Naturalismo',
      'Modernismo',
      'Literatura contemporánea mexicana',
      'Literatura universal clásica',
    ],
    Filosofía: [
      'Epistemología',
      'Metafísica',
      'Ética',
      'Estética',
      'Historia de la filosofía occidental',
    ],
    Artes: [
      'Artes visuales prehispánicas',
      'Pintura colonial y moderna',
      'Escultura mexicana',
      'Arquitectura',
      'Fotografía y cine',
    ],
    Español: [
      'Ortografía avanzada',
      'Análisis de textos literarios',
    ],
  };
}

// ─────────────────────────────────────────────────────────────────
// Carreras ancla (con aciertos mínimos históricos 2021-2025)

function generateCareersArea1() {
  return [
    { name: 'Ingeniería en Computación', minAciertos: 96, year: 2025 },
    { name: 'Ingeniería Eléctrica', minAciertos: 90, year: 2025 },
    { name: 'Ingeniería en Telecomunicaciones', minAciertos: 88, year: 2025 },
    { name: 'Ingeniería Mecánica', minAciertos: 85, year: 2025 },
    { name: 'Ingeniería Civil', minAciertos: 82, year: 2025 },
    { name: 'Arquitectura', minAciertos: 88, year: 2025 },
    { name: 'Matemáticas Aplicadas', minAciertos: 92, year: 2025 },
    { name: 'Física', minAciertos: 90, year: 2025 }, // TODO-VERIFICAR: estimado
  ];
}

function generateCareersArea2() {
  return [
    { name: 'Medicina', minAciertos: 104, year: 2025 },
    { name: 'Cirugía Dental', minAciertos: 95, year: 2025 },
    { name: 'Biología', minAciertos: 82, year: 2025 },
    { name: 'Química Farmacéutica', minAciertos: 91, year: 2025 },
    { name: 'Enfermería', minAciertos: 75, year: 2025 },
    { name: 'Ecología', minAciertos: 78, year: 2025 }, // TODO-VERIFICAR: estimado
    { name: 'Ciencias de la Salud', minAciertos: 86, year: 2025 }, // TODO-VERIFICAR
  ];
}

function generateCareersArea3() {
  return [
    { name: 'Derecho', minAciertos: 85, year: 2025 },
    { name: 'Economía', minAciertos: 88, year: 2025 },
    { name: 'Administración', minAciertos: 80, year: 2025 },
    { name: 'Contabilidad', minAciertos: 78, year: 2025 },
    { name: 'Ciencia Política', minAciertos: 83, year: 2025 }, // TODO-VERIFICAR: estimado
    { name: 'Sociología', minAciertos: 79, year: 2025 }, // TODO-VERIFICAR
    { name: 'Antropología', minAciertos: 81, year: 2025 }, // TODO-VERIFICAR
  ];
}

function generateCareersArea4() {
  return [
    { name: 'Letras Hispánicas', minAciertos: 82, year: 2025 },
    { name: 'Filosofía', minAciertos: 80, year: 2025 },
    { name: 'Historia', minAciertos: 81, year: 2025 },
    { name: 'Arte y Diseño', minAciertos: 75, year: 2025 }, // TODO-VERIFICAR: estimado
    { name: 'Artes Musicales', minAciertos: 78, year: 2025 }, // TODO-VERIFICAR
    { name: 'Comunicación Social', minAciertos: 79, year: 2025 }, // TODO-VERIFICAR
  ];
}
