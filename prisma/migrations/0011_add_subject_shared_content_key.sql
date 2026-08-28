-- Migración: Reutilización de contenido entre áreas (G26)
--
-- Varias áreas de un MISMO examen evalúan la misma materia con el mismo
-- temario oficial — solo cambia cuántos reactivos de esa materia trae el
-- examen (subjects."questionWeight"), no QUÉ se evalúa:
--   · UNAM: Español (Áreas 1-4), Inglés (1-3), Química (1-2)
--   · IPN : Español/Lectura (3 ramas), Inglés (3), Química (2), Matemáticas (2)
-- El seed las modela como filas subjects distintas (una por área). Esta clave
-- las declara equivalentes: filas subjects con la misma "sharedContentKey"
-- (no nula) del MISMO examen comparten su pool de reactivos verificados y
-- servibles. NUNCA agrupa entre instituciones (guías/profundidad distintas).

ALTER TABLE "subjects" ADD COLUMN "sharedContentKey" TEXT;

CREATE INDEX "subjects_sharedContentKey_idx" ON "subjects" ("sharedContentKey");

-- Grupos de equivalencia (idempotente: reasigna el mismo valor si se re-corre).
-- La clave incluye el código de institución para que nunca colisione entre
-- exámenes; el filtro por institución además lo garantiza a nivel de fila.

UPDATE "subjects" s SET "sharedContentKey" = 'UNAM:ESPANOL'
  FROM "areas" a, "exams" e, "levels" l, "institutions" i
  WHERE s."areaId" = a.id AND a."examId" = e.id AND e."levelId" = l.id
    AND l."institutionId" = i.id AND i.code = 'UNAM' AND s.name = 'Español';

UPDATE "subjects" s SET "sharedContentKey" = 'UNAM:INGLES'
  FROM "areas" a, "exams" e, "levels" l, "institutions" i
  WHERE s."areaId" = a.id AND a."examId" = e.id AND e."levelId" = l.id
    AND l."institutionId" = i.id AND i.code = 'UNAM' AND s.name = 'Inglés';

UPDATE "subjects" s SET "sharedContentKey" = 'UNAM:QUIMICA'
  FROM "areas" a, "exams" e, "levels" l, "institutions" i
  WHERE s."areaId" = a.id AND a."examId" = e.id AND e."levelId" = l.id
    AND l."institutionId" = i.id AND i.code = 'UNAM' AND s.name = 'Química';

UPDATE "subjects" s SET "sharedContentKey" = 'IPN:ESPANOL'
  FROM "areas" a, "exams" e, "levels" l, "institutions" i
  WHERE s."areaId" = a.id AND a."examId" = e.id AND e."levelId" = l.id
    AND l."institutionId" = i.id AND i.code = 'IPN' AND s.name = 'Español/Lectura';

UPDATE "subjects" s SET "sharedContentKey" = 'IPN:INGLES'
  FROM "areas" a, "exams" e, "levels" l, "institutions" i
  WHERE s."areaId" = a.id AND a."examId" = e.id AND e."levelId" = l.id
    AND l."institutionId" = i.id AND i.code = 'IPN' AND s.name = 'Inglés';

UPDATE "subjects" s SET "sharedContentKey" = 'IPN:QUIMICA'
  FROM "areas" a, "exams" e, "levels" l, "institutions" i
  WHERE s."areaId" = a.id AND a."examId" = e.id AND e."levelId" = l.id
    AND l."institutionId" = i.id AND i.code = 'IPN' AND s.name = 'Química';

-- IPN Matemáticas: el examen IPN tiene un bloque de "Conocimientos generales"
-- de matemáticas común a TODAS las ramas (álgebra → cálculo). FISMAT lo
-- pondera más (weight 24) que MEDBIO (8); el pool es el mismo. El temario de
-- MEDBIO en el seed quedó corto (6 temas básicos, sin cálculo) — es una
-- imprecisión del seed, no de la equivalencia: un aspirante MEDBIO SÍ enfrenta
-- ese bloque en el examen real.
UPDATE "subjects" s SET "sharedContentKey" = 'IPN:MATEMATICAS'
  FROM "areas" a, "exams" e, "levels" l, "institutions" i
  WHERE s."areaId" = a.id AND a."examId" = e.id AND e."levelId" = l.id
    AND l."institutionId" = i.id AND i.code = 'IPN' AND s.name = 'Matemáticas';
