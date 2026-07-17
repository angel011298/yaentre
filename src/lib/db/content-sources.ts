import { prisma } from './prisma';

/**
 * Capa de lectura de fuentes oficiales (ContentSource) para el modo "Examen
 * muestra oficial" (CC-25). Solo lectura, cero mutación.
 *
 * GUARDRAIL: solo se listan fuentes con `fileRef` apuntando a una URL
 * pública (https://...) — nunca un path local (docs/guias/..., no servible
 * desde la app en producción, ver ContentSource.fileRef en el schema). Esto
 * garantiza que todo lo que aparece en esta sección realmente abre un PDF,
 * nunca un enlace roto.
 */

export interface OfficialSampleSource {
  externalRef: string;
  name: string;
  institution: string;
  type: string | null;
  year: number | null;
  fileUrl: string;
  license: string | null;
}

function isPublicUrl(fileRef: string | null): fileRef is string {
  return typeof fileRef === 'string' && fileRef.startsWith('http');
}

export async function listOfficialSampleSources(): Promise<OfficialSampleSource[]> {
  const rows = await prisma.contentSource.findMany({
    orderBy: [{ institution: 'asc' }, { year: 'desc' }],
  });

  return rows
    .filter((row) => isPublicUrl(row.fileRef))
    .map((row) => ({
      externalRef: row.externalRef ?? row.id,
      name: row.name,
      institution: row.institution ?? 'Institución',
      type: row.type,
      year: row.year,
      fileUrl: row.fileRef as string,
      license: row.license,
    }));
}

export async function getOfficialSampleSource(
  externalRef: string,
): Promise<OfficialSampleSource | null> {
  const row = await prisma.contentSource.findUnique({ where: { externalRef } });
  if (!row || !isPublicUrl(row.fileRef)) return null;

  return {
    externalRef: row.externalRef ?? row.id,
    name: row.name,
    institution: row.institution ?? 'Institución',
    type: row.type,
    year: row.year,
    fileUrl: row.fileRef,
    license: row.license,
  };
}
