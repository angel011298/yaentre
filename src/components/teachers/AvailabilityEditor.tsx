'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { Button } from '@/components/ui/Button';
import {
  blocksToCells,
  cellsToBlocks,
  cellStartMinutes,
  DAY_NAMES,
  formatHHmm,
  GRID_SLOTS_PER_DAY,
  validateWeeklyAvailability,
  type AvailabilityBlock,
  type CellSelection,
} from '@/lib/teachers/availability';

/**
 * G103 — editor de disponibilidad semanal (spec §1.5). Sin librerías: CSS Grid
 * + eventos de puntero.
 *
 *  - Ratón: arrastrar marca (o desmarca, si empezó sobre una celda marcada) un
 *    rectángulo de días × horas.
 *  - Dedo: tocar alterna UNA celda; mantener presionado ~½ s fija el inicio de
 *    un rango y el siguiente toque lo cierra. Así el desplazamiento vertical
 *    de la página sigue funcionando (`touch-action: pan-y`): arrastrar con el
 *    dedo para seleccionar pelearía con el scroll en una cuadrícula de 1 300 px.
 *  - Teclado: flechas para moverse (cuadrícula con tabindex itinerante),
 *    Espacio/Enter alterna, Mayús+flecha extiende marcando.
 *  - Celular: un día a la vez (pestañas) con celdas de ancho completo y 44 px
 *    de alto; en escritorio, la semana entera.
 *
 * Guardar reemplaza la semana COMPLETA en el servidor, en una transacción.
 */

/** Lunes primero, como en la spec. */
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const LONG_PRESS_MS = 450;

type Cell = { day: number; cell: number };

function cloneSel(sel: CellSelection): CellSelection {
  return sel.map((s) => new Set(s));
}

function rectCells(a: Cell, b: Cell): Cell[] {
  const ai = DAY_ORDER.indexOf(a.day);
  const bi = DAY_ORDER.indexOf(b.day);
  const out: Cell[] = [];
  for (let i = Math.min(ai, bi); i <= Math.max(ai, bi); i++) {
    for (let c = Math.min(a.cell, b.cell); c <= Math.max(a.cell, b.cell); c++) out.push({ day: DAY_ORDER[i], cell: c });
  }
  return out;
}

function serialize(sel: CellSelection): string {
  return JSON.stringify(cellsToBlocks(sel));
}

export function AvailabilityEditor({ initialBlocks, disabled }: { initialBlocks: AvailabilityBlock[]; disabled?: boolean }) {
  const [selection, setSelection] = useState<CellSelection>(() => blocksToCells(initialBlocks));
  const [saved, setSaved] = useState(() => serialize(blocksToCells(initialBlocks)));
  const [drag, setDrag] = useState<{ anchor: Cell; end: Cell; add: boolean } | null>(null);
  const [touchAnchor, setTouchAnchor] = useState<Cell | null>(null);
  const [focus, setFocus] = useState<Cell>({ day: 1, cell: 4 });
  const [mobileDay, setMobileDay] = useState(1);
  const [status, setStatus] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [pending, setPending] = useState(false);
  const longPress = useRef<{ timer: ReturnType<typeof setTimeout> | null; fired: boolean; x: number; y: number } | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const dirty = serialize(selection) !== saved;
  const isOn = useCallback((c: Cell) => selection[c.day].has(c.cell), [selection]);

  const apply = useCallback((cells: Cell[], add: boolean) => {
    setSelection((prev) => {
      const next = cloneSel(prev);
      for (const c of cells) {
        if (add) next[c.day].add(c.cell);
        else next[c.day].delete(c.cell);
      }
      return next;
    });
    setStatus(null);
  }, []);

  const preview = useMemo(() => {
    if (!drag) return null;
    return new Set(rectCells(drag.anchor, drag.end).map((c) => `${c.day}:${c.cell}`));
  }, [drag]);

  // Fin del arrastre con ratón aunque el puntero se suelte fuera de la cuadrícula.
  useEffect(() => {
    if (!drag) return;
    const up = () => {
      apply(rectCells(drag.anchor, drag.end), drag.add);
      setDrag(null);
    };
    window.addEventListener('pointerup', up);
    return () => window.removeEventListener('pointerup', up);
  }, [drag, apply]);

  function onPointerDown(e: PointerEvent<HTMLButtonElement>, c: Cell) {
    if (disabled) return;
    setFocus(c);
    if (e.pointerType === 'touch') {
      longPress.current = {
        fired: false,
        x: e.clientX,
        y: e.clientY,
        timer: setTimeout(() => {
          if (!longPress.current) return;
          longPress.current.fired = true;
          setTouchAnchor(c);
          if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate?.(15);
        }, LONG_PRESS_MS),
      };
      return;
    }
    e.preventDefault();
    setDrag({ anchor: c, end: c, add: !isOn(c) });
  }

  function onPointerMove(e: PointerEvent<HTMLButtonElement>) {
    const lp = longPress.current;
    if (lp && !lp.fired && (Math.abs(e.clientX - lp.x) > 10 || Math.abs(e.clientY - lp.y) > 10)) {
      if (lp.timer) clearTimeout(lp.timer);
      longPress.current = null;
    }
  }

  function onPointerUp(e: PointerEvent<HTMLButtonElement>, c: Cell) {
    if (disabled || e.pointerType !== 'touch') return;
    const lp = longPress.current;
    longPress.current = null;
    if (!lp) return;
    if (lp.timer) clearTimeout(lp.timer);
    if (lp.fired) return; // el toque largo solo fija el inicio del rango
    if (touchAnchor) {
      apply(rectCells(touchAnchor, c), !isOn(touchAnchor));
      setTouchAnchor(null);
    } else {
      apply([c], !isOn(c));
    }
  }

  function onPointerCancel() {
    if (longPress.current?.timer) clearTimeout(longPress.current.timer);
    longPress.current = null;
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (disabled) return;
    const idx = DAY_ORDER.indexOf(focus.day);
    let next: Cell | null = null;
    if (e.key === 'ArrowDown') next = { day: focus.day, cell: Math.min(GRID_SLOTS_PER_DAY - 1, focus.cell + 1) };
    if (e.key === 'ArrowUp') next = { day: focus.day, cell: Math.max(0, focus.cell - 1) };
    if (e.key === 'ArrowRight') next = { day: DAY_ORDER[Math.min(6, idx + 1)], cell: focus.cell };
    if (e.key === 'ArrowLeft') next = { day: DAY_ORDER[Math.max(0, idx - 1)], cell: focus.cell };
    if (e.key === 'Home') next = { day: focus.day, cell: 0 };
    if (e.key === 'End') next = { day: focus.day, cell: GRID_SLOTS_PER_DAY - 1 };
    if (next) {
      e.preventDefault();
      if (e.shiftKey) apply([next], true);
      setFocus(next);
      setMobileDay(next.day);
      // Hay dos vistas (semana y día); se enfoca la celda de la que está visible.
      requestAnimationFrame(() => {
        const matches = gridRef.current?.querySelectorAll<HTMLElement>(`[data-cell="${next!.day}:${next!.cell}"]`) ?? [];
        [...matches].find((el) => el.offsetParent !== null)?.focus();
      });
      return;
    }
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      apply([focus], !isOn(focus));
    }
  }

  async function save() {
    const blocks = cellsToBlocks(selection);
    const check = validateWeeklyAvailability(blocks);
    if (!check.ok) {
      setStatus({ tone: 'error', text: check.error });
      return;
    }
    setPending(true);
    try {
      const res = await fetch('/api/teachers/me/availability', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocks }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? 'No pudimos guardar tu disponibilidad.');
      setSaved(serialize(selection));
      setStatus({ tone: 'ok', text: `Disponibilidad guardada: ${blocks.length} ${blocks.length === 1 ? 'bloque' : 'bloques'}.` });
    } catch (err) {
      setStatus({ tone: 'error', text: err instanceof Error ? err.message : 'No pudimos guardar tu disponibilidad.' });
    }
    setPending(false);
  }

  const cellClass = (c: Cell) => {
    const key = `${c.day}:${c.cell}`;
    const on = isOn(c);
    const inPreview = preview?.has(key);
    const anchor = touchAnchor && touchAnchor.day === c.day && touchAnchor.cell === c.cell;
    if (anchor) return 'bg-accent text-on-accent';
    if (inPreview) return drag?.add ? 'bg-brand-tint text-brand-fg' : 'bg-elevated text-text-muted';
    return on ? 'bg-brand text-on-brand' : 'bg-surface text-text-muted hover:bg-elevated';
  };

  const renderCell = (c: Cell, opts: { mobile: boolean }) => {
    const start = formatHHmm(cellStartMinutes(c.cell));
    const end = formatHHmm(cellStartMinutes(c.cell + 1));
    const on = isOn(c);
    const focused = focus.day === c.day && focus.cell === c.cell;
    return (
      <button
        key={`${opts.mobile ? 'm' : 'd'}-${c.day}-${c.cell}`}
        type="button"
        role="gridcell"
        aria-selected={on}
        aria-label={`${DAY_NAMES[c.day]} ${start} a ${end}: ${on ? 'disponible' : 'no disponible'}`}
        tabIndex={focused ? 0 : -1}
        data-cell={`${c.day}:${c.cell}`}
        data-testid={`${opts.mobile ? 'm' : 'd'}-cell-${c.day}-${c.cell}`}
        disabled={disabled}
        onPointerDown={(e) => onPointerDown(e, c)}
        onPointerEnter={() => drag && setDrag((d) => (d ? { ...d, end: c } : d))}
        onPointerMove={onPointerMove}
        onPointerUp={(e) => onPointerUp(e, c)}
        onPointerCancel={onPointerCancel}
        onFocus={() => setFocus(c)}
        className={`flex min-h-touch items-center justify-center border-b border-r border-border-subtle text-xs transition-colors select-none ${cellClass(c)} ${opts.mobile ? 'w-full justify-start px-3' : ''}`}
      >
        {opts.mobile ? (
          <span>
            {start}–{end} · {on ? 'Disponible' : 'Libre'}
          </span>
        ) : (
          <span className="sr-only">{on ? 'Disponible' : ''}</span>
        )}
      </button>
    );
  };

  return (
    <section className="space-y-3" aria-labelledby="availability-title">
      <h2 id="availability-title" className="font-display text-lg font-bold text-text-primary">
        Bloques de la semana
      </h2>
      <p className="text-sm text-text-secondary">
        Arrastra para marcar varias celdas. En el celular toca una celda para marcarla; mantén presionada una
        celda y toca otra para marcar el rango completo.
      </p>
      {touchAnchor && (
        <p role="status" aria-live="polite" className="rounded-md bg-accent-subtle p-2 text-sm text-text-primary">
          Rango iniciado en {DAY_NAMES[touchAnchor.day]} {formatHHmm(cellStartMinutes(touchAnchor.cell))}. Toca la
          celda final.{' '}
          <button type="button" className="font-semibold underline" onClick={() => setTouchAnchor(null)}>
            Cancelar
          </button>
        </p>
      )}

      <div ref={gridRef} onKeyDown={onKeyDown}>
        {/* Escritorio: la semana entera */}
        <div
          role="grid"
          aria-label="Disponibilidad semanal"
          aria-readonly={disabled || undefined}
          className="hidden overflow-hidden rounded-lg border-l border-t border-border-subtle md:grid"
          style={{ gridTemplateColumns: '64px repeat(7, minmax(0, 1fr))', touchAction: 'pan-y' }}
        >
          <div role="row" className="contents">
            <div role="columnheader" className="border-b border-r border-border-subtle bg-elevated p-2 text-xs text-text-muted">
              Hora
            </div>
            {DAY_ORDER.map((d) => (
              <div key={d} role="columnheader" className="border-b border-r border-border-subtle bg-elevated p-2 text-center text-xs font-semibold text-text-primary">
                {SHORT[d]}
              </div>
            ))}
          </div>
          {Array.from({ length: GRID_SLOTS_PER_DAY }, (_, cell) => (
            <div key={cell} role="row" className="contents">
              <div role="rowheader" className="flex items-center border-b border-r border-border-subtle bg-elevated px-2 text-xs tabular-nums text-text-muted">
                {formatHHmm(cellStartMinutes(cell))}
              </div>
              {DAY_ORDER.map((day) => renderCell({ day, cell }, { mobile: false }))}
            </div>
          ))}
        </div>

        {/* Celular: un día a la vez */}
        <div className="space-y-2 md:hidden">
          <div role="tablist" aria-label="Día" className="grid grid-cols-7 gap-1">
            {DAY_ORDER.map((d) => {
              const count = selection[d].size;
              return (
                <button
                  key={d}
                  type="button"
                  role="tab"
                  aria-selected={mobileDay === d}
                  onClick={() => setMobileDay(d)}
                  className={`min-h-touch rounded-md text-xs font-semibold ${mobileDay === d ? 'bg-brand text-on-brand' : 'bg-surface text-text-secondary'}`}
                >
                  {SHORT[d]}
                  {count > 0 && <span className="block text-[10px] font-normal">{(count / 2).toString()} h</span>}
                </button>
              );
            })}
          </div>
          <div role="grid" aria-label={`Disponibilidad del ${DAY_NAMES[mobileDay].toLowerCase()}`} className="overflow-hidden rounded-lg border-l border-t border-border-subtle" style={{ touchAction: 'pan-y' }}>
            {Array.from({ length: GRID_SLOTS_PER_DAY }, (_, cell) => (
              <div key={cell} role="row" className="flex">
                {renderCell({ day: mobileDay, cell }, { mobile: true })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="primary" disabled={disabled || pending || !dirty} onClick={save}>
          {pending ? 'Guardando…' : 'Guardar cambios'}
        </Button>
        {dirty && !pending && <span className="text-sm text-text-muted">Tienes cambios sin guardar.</span>}
      </div>
      <div aria-live="polite">
        {status && (
          <p role={status.tone === 'error' ? 'alert' : 'status'} className={`text-sm ${status.tone === 'ok' ? 'text-success' : 'text-danger'}`}>
            {status.text}
          </p>
        )}
      </div>
    </section>
  );
}
