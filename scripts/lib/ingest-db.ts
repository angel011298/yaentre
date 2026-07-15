import type { Prisma } from '@prisma/client';
import { getPrisma } from './content-db';
import type {
  TaxonomyArtifact,
  QuestionsArtifact,
  QuestionSpec,
  PassageSpec,
} from './ingest-artifact';

/**
 * Capa DB de la ingesta de guías oficiales (CC-09). Todo es idempotente por
 * clave estable (externalRef en ContentSource/Question, claves únicas
 * compuestas en la taxonomía), de modo que re-ejecutar la ingesta de una guía
 * NO duplica ni pisa datos ajenos.
 *
 * Los reactivos oficiales entran SIEMPRE con source=OFFICIAL_SAMPLE y
 * usage=CALIBRATION_ONLY: son insumo de calibración/few-shot, jamás servibles
 * a usuarios (ver src/lib/db/question-read.ts).
 */

export interface IngestResult {
  contentSourceId: string;
  areasUpserted: number;
  subjectsUpserted: number;
  topicsUpserted: number;
  careersUpserted: number;
  passagesUpserted: number;
  questionsUpserted: number;
  weightsCorrected: { subject: string; from: number | null; to: number }[];
}

export async function upsertContentSource(art: TaxonomyArtifact): Promise<string> {
  const prisma = getPrisma();
  const s = art.source;
  const row = await prisma.contentSource.upsert({
    where: { externalRef: s.externalRef },
    create: {
      externalRef: s.externalRef,
      name: s.name,
      institution: s.institution,
      type: s.type,
      year: s.year,
      fileRef: s.fileRef ?? null,
      license: s.license,
    },
    update: { name: s.name, license: s.license, fileRef: s.fileRef ?? null },
  });
  return row.id;
}

/**
 * Siembra examen + taxonomía desde el artefacto y CORRIGE questionWeight con
 * los pesos oficiales derivados del conteo real. Devuelve las correcciones de
 * peso para el log (peso previo → peso oficial).
 */
export async function seedTaxonomy(
  art: TaxonomyArtifact,
): Promise<Omit<IngestResult, 'contentSourceId' | 'passagesUpserted' | 'questionsUpserted'>> {
  const prisma = getPrisma();
  const exam = art.exam;

  const institution = await prisma.institution.upsert({
    where: { code: exam.institutionCode as 'UNAM' | 'IPN' | 'UAM' | 'CENEVAL' | 'CNBV' },
    create: { code: exam.institutionCode as 'UNAM', name: art.source.name },
    update: {},
  });

  const level = await prisma.level.upsert({
    where: {
      institutionId_type: {
        institutionId: institution.id,
        type: exam.level,
      },
    },
    create: { institutionId: institution.id, type: exam.level, name: exam.levelName },
    update: {},
  });

  const examRow = await prisma.exam.upsert({
    where: { levelId_year: { levelId: level.id, year: exam.year } },
    create: {
      levelId: level.id,
      year: exam.year,
      name: exam.name,
      durationMins: exam.durationMins,
      totalQuestions: exam.totalQuestions,
      examDate: exam.examDate ? new Date(exam.examDate) : null,
    },
    update: {
      name: exam.name,
      durationMins: exam.durationMins,
      totalQuestions: exam.totalQuestions,
    },
  });

  let areasUpserted = 0;
  let subjectsUpserted = 0;
  let topicsUpserted = 0;
  let careersUpserted = 0;
  const weightsCorrected: { subject: string; from: number | null; to: number }[] = [];

  for (const area of art.areas) {
    const areaRow = await prisma.area.upsert({
      where: { examId_code: { examId: examRow.id, code: area.code } },
      create: {
        examId: examRow.id,
        code: area.code,
        name: area.name,
        colorHex: area.colorHex,
        iconEmoji: area.iconEmoji ?? null,
        position: area.position,
      },
      update: { name: area.name, colorHex: area.colorHex },
    });
    areasUpserted++;

    // Carreras (solo nombre; minAciertos no se inventa si la guía no lo publica)
    for (const careerName of area.careers ?? []) {
      await prisma.career.upsert({
        where: { areaId_name: { areaId: areaRow.id, name: careerName } },
        create: { areaId: areaRow.id, name: careerName },
        update: {},
      });
      careersUpserted++;
    }

    for (const subj of area.subjects ?? []) {
      // Detecta corrección de peso: si ya existía con otro questionWeight.
      const existing = await prisma.subject.findUnique({
        where: { areaId_name: { areaId: areaRow.id, name: subj.name } },
        select: { questionWeight: true },
      });
      if (!existing || existing.questionWeight !== subj.questionWeight) {
        weightsCorrected.push({
          subject: subj.name,
          from: existing?.questionWeight ?? null,
          to: subj.questionWeight,
        });
      }

      const subjectRow = await prisma.subject.upsert({
        where: { areaId_name: { areaId: areaRow.id, name: subj.name } },
        create: {
          areaId: areaRow.id,
          name: subj.name,
          questionWeight: subj.questionWeight,
          iconEmoji: subj.iconEmoji ?? null,
          position: subj.position,
        },
        update: { questionWeight: subj.questionWeight, position: subj.position },
      });
      subjectsUpserted++;

      const topicNames = art.topics?.[subj.name] ?? [];
      for (let i = 0; i < topicNames.length; i++) {
        await prisma.topic.upsert({
          where: { subjectId_name: { subjectId: subjectRow.id, name: topicNames[i] } },
          create: { subjectId: subjectRow.id, name: topicNames[i], position: i + 1 },
          update: {},
        });
        topicsUpserted++;
      }
    }
  }

  return { areasUpserted, subjectsUpserted, topicsUpserted, careersUpserted, weightsCorrected };
}

async function upsertPassage(
  passage: PassageSpec,
  contentSourceId: string,
): Promise<string> {
  const prisma = getPrisma();
  // Idempotencia por sourceRef + título dentro de la fuente; si no, crea.
  const existing = await prisma.passage.findFirst({
    where: { contentSourceId, title: passage.title ?? undefined, content: passage.content },
    select: { id: true },
  });
  if (existing) return existing.id;
  const row = await prisma.passage.create({
    data: {
      title: passage.title ?? null,
      content: passage.content,
      sourceRef: passage.sourceRef ?? null,
      contentSourceId,
    },
  });
  return row.id;
}

/**
 * Inserta reactivos oficiales del examen muestra como OFFICIAL_SAMPLE +
 * CALIBRATION_ONLY. Idempotente por Question.externalRef. Resuelve el Topic por
 * (subject, topicName); si no encuentra el Topic, omite y reporta (nunca crea
 * un reactivo colgando de un tema inexistente).
 */
export async function ingestSampleQuestions(
  art: QuestionsArtifact,
  contentSourceId: string,
  examYear: number,
): Promise<{ upserted: number; passages: number; omitted: { ref: string; reason: string }[] }> {
  const prisma = getPrisma();
  const omitted: { ref: string; reason: string }[] = [];

  // Passages primero (para poder enlazar)
  const passageIdByRef = new Map<string, string>();
  for (const p of art.passages ?? []) {
    passageIdByRef.set(p.ref, await upsertPassage(p, contentSourceId));
  }

  let upserted = 0;
  for (const q of art.questions) {
    const topic = await resolveTopic(q, examYear);
    if (!topic) {
      omitted.push({ ref: q.ref, reason: `Topic no resuelto (subject="${q.subject}", topic="${q.topicName ?? '-'}")` });
      continue;
    }

    const passageId = q.passageRef ? passageIdByRef.get(q.passageRef) ?? null : null;
    const options = q.options as unknown as Prisma.InputJsonValue;

    await prisma.question.upsert({
      where: { externalRef: q.ref },
      create: {
        topicId: topic.id,
        stem: q.stem,
        options,
        difficulty: 'INTERMEDIATE',
        isVerified: false,
        source: 'OFFICIAL_SAMPLE',
        usage: 'CALIBRATION_ONLY', // ← nunca servible a usuarios
        sourceRef: q.ref,
        contentSourceId,
        format: q.format as 'MULTIPLE_CHOICE',
        passageId,
        externalRef: q.ref,
      },
      update: {
        stem: q.stem,
        options,
        format: q.format as 'MULTIPLE_CHOICE',
        passageId,
      },
    });
    upserted++;
  }

  return { upserted, passages: passageIdByRef.size, omitted };
}

async function resolveTopic(q: QuestionSpec, examYear: number) {
  const prisma = getPrisma();
  return prisma.topic.findFirst({
    where: {
      name: q.topicName,
      subject: {
        name: q.subject,
        area: { exam: { year: examYear } },
      },
    },
    select: { id: true },
  });
}
