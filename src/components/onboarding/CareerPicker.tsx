'use client';

import { useId, useMemo, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { filterCareers, type CareerPickerItem } from '@/lib/content/career-picker';

/**
 * G101 — selector de carrera con búsqueda.
 *
 * Con el catálogo oficial completo un área tiene hasta 46 carreras; la lista
 * de botones de antes obligaba a recorrerla entera. Aquí se busca por nombre o
 * por plantel, sin acentos, y cada opción dice dónde se imparte y si hay una
 * meta de aciertos documentada.
 *
 * Dos modos:
 *  · `submit` (onboarding): cada carrera es un `<form>` nativo con su Server
 *    Action. Funciona ANTES de hidratar — sin JS se ve la lista completa y el
 *    clic envía igual; la búsqueda es una mejora encima, no un requisito.
 *  · `select` (perfil): marca una opción y quien lo usa decide cuándo guardar.
 */
export function CareerPicker(
  props: {
    items: readonly CareerPickerItem[];
    /** Fondo de la barra de búsqueda fija: el de la superficie donde vive. */
    surface?: 'base' | 'surface';
  } & (
    | { mode: 'submit'; action: (formData: FormData) => void | Promise<void> }
    | { mode: 'select'; selectedId: string | null; onSelect: (id: string) => void }
  )
) {
  const { items, surface = 'base' } = props;
  const inputId = useId();
  const [query, setQuery] = useState('');
  const visible = useMemo(() => filterCareers(items, query), [items, query]);

  return (
    <div className="space-y-3">
      <div
        className={`sticky top-0 z-10 -mx-1 px-1 pb-2 pt-1 ${surface === 'base' ? 'bg-base' : 'bg-surface'}`}
      >
        <label htmlFor={inputId} className="sr-only">
          Buscar carrera o plantel
        </label>
        <div className="relative">
          <Icon
            name="search"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
          />
          <input
            id={inputId}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Busca tu carrera o plantel"
            autoComplete="off"
            className="min-h-touch w-full rounded-lg border border-border-subtle bg-input py-2 pl-10 pr-3 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-transparent focus:ring-2 focus:ring-brand"
          />
        </div>
        <p aria-live="polite" className="mt-1.5 text-xs text-text-muted">
          {query.trim()
            ? `${visible.length} de ${items.length} carreras`
            : `${items.length} carreras`}
        </p>
      </div>

      {visible.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border-subtle p-4 text-sm text-text-secondary">
          No encontramos «{query.trim()}». Prueba con otra palabra o con el nombre del plantel.
        </p>
      ) : (
        <ul className="space-y-2">
          {visible.map((item) => (
            <li key={item.id}>
              {props.mode === 'submit' ? (
                <form action={props.action}>
                  <input type="hidden" name="careerId" value={item.id} />
                  <button type="submit" className={rowClass(false)}>
                    <CareerRowBody item={item} />
                    <Icon name="chevronRight" className="h-5 w-5 text-text-muted" />
                  </button>
                </form>
              ) : (
                <button
                  type="button"
                  aria-pressed={props.selectedId === item.id}
                  onClick={() => props.onSelect(item.id)}
                  className={rowClass(props.selectedId === item.id)}
                >
                  <CareerRowBody item={item} />
                  {props.selectedId === item.id ? (
                    <Icon name="checkCircle" className="h-5 w-5 text-brand-soft" />
                  ) : (
                    <span aria-hidden className="h-5 w-5 rounded-full border-2 border-border-subtle" />
                  )}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function rowClass(selected: boolean): string {
  return `flex min-h-touch w-full items-center gap-3 rounded-lg border p-3.5 text-left transition-colors ${
    selected
      ? 'border-brand bg-brand/10'
      : 'border-border-subtle bg-surface hover:border-brand-soft hover:bg-elevated'
  }`;
}

function CareerRowBody({ item }: { item: CareerPickerItem }) {
  return (
    <span className="min-w-0 flex-1">
      <span className="block font-display text-sm font-semibold text-text-primary sm:text-[1rem]">
        {item.name}
      </span>
      {item.campuses.length > 0 && (
        <span className="mt-0.5 block text-xs text-text-muted line-clamp-2">
          {item.campuses.join(' · ')}
        </span>
      )}
      <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
        {item.target ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-brand-soft/15 px-2 py-0.5 text-xs font-semibold text-brand-soft">
            <Icon name="target" className="h-3 w-3" />
            {item.target.label}
            <span className="font-normal text-text-muted">· {item.target.qualifier.toLowerCase()}</span>
          </span>
        ) : (
          <span className="text-xs text-text-muted">Sin meta de aciertos todavía</span>
        )}
        {item.extraModalities.length > 0 && (
          <span className="rounded-md bg-elevated px-2 py-0.5 text-xs text-text-secondary">
            También {item.extraModalities.map((m) => m.toLowerCase()).join(' y ')}
          </span>
        )}
      </span>
    </span>
  );
}
