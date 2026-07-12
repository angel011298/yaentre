import type { ReactNode } from 'react';
import type { DifficultyLevel } from '@prisma/client';
import { Button } from '@/components/ui/Button';
import type { FilterTaxonomyArea } from '@/lib/db/admin-questions';

const DIFFICULTY_LABELS: Record<DifficultyLevel, string> = {
  BEGINNER: 'Principiante',
  BASIC: 'Básico',
  INTERMEDIATE: 'Intermedio',
  ADVANCED: 'Avanzado',
  EXPERT: 'Experto',
};

interface Props {
  taxonomy: FilterTaxonomyArea[];
  current: {
    areaId?: string;
    subjectId?: string;
    topicId?: string;
    difficulty?: string;
  };
  action: string;
}

/**
 * Formulario GET simple (sin JS) que filtra la cola. Cambiar de página vía
 * navegación real: Next.js re-renderiza el Server Component con los nuevos
 * searchParams. No necesita 'use client' ni cascada dinámica de selects.
 */
export function QueueFilterBar({ taxonomy, current, action }: Props) {
  const hasFilters = Boolean(
    current.areaId || current.subjectId || current.topicId || current.difficulty,
  );

  return (
    <form
      action={action}
      method="GET"
      className="flex flex-wrap items-end gap-3 rounded-lg border border-border-subtle bg-surface p-4"
    >
      <FilterSelect name="areaId" label="Área" value={current.areaId}>
        {taxonomy.map((area) => (
          <option key={area.id} value={area.id}>
            {area.name}
          </option>
        ))}
      </FilterSelect>

      <FilterSelect name="subjectId" label="Materia" value={current.subjectId}>
        {taxonomy.flatMap((area) =>
          area.subjects.map((subject) => (
            <option key={subject.id} value={subject.id}>
              {area.name} · {subject.name}
            </option>
          )),
        )}
      </FilterSelect>

      <FilterSelect name="topicId" label="Tema" value={current.topicId}>
        {taxonomy.flatMap((area) =>
          area.subjects.flatMap((subject) =>
            subject.topics.map((topic) => (
              <option key={topic.id} value={topic.id}>
                {subject.name} · {topic.name}
              </option>
            )),
          ),
        )}
      </FilterSelect>

      <FilterSelect name="difficulty" label="Dificultad" value={current.difficulty}>
        {Object.entries(DIFFICULTY_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </FilterSelect>

      <Button type="submit" variant="secondary">
        Filtrar
      </Button>
      {hasFilters && (
        <a href={action} className="text-sm text-text-secondary hover:underline">
          Limpiar filtros
        </a>
      )}
    </form>
  );
}

function FilterSelect({
  name,
  label,
  value,
  children,
}: {
  name: string;
  label: string;
  value?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-text-secondary">{label}</span>
      <select
        name={name}
        defaultValue={value ?? ''}
        className="min-h-touch rounded-md border border-border-subtle bg-input px-3 text-text-primary"
      >
        <option value="">Todas</option>
        {children}
      </select>
    </label>
  );
}
