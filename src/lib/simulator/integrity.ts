/**
 * Integridad de la sesión del simulador (F12 tarea 5). Módulo PURO: define los
 * contadores de posible pérdida de integridad y cómo se fusionan entre sincs.
 * Registrar NUNCA bloquea la sesión — el simulacro es de práctica, no un examen
 * proctorizado; estos datos son señales, no sanciones.
 */

export interface IntegrityCounters {
  /** Veces que el usuario cambió de pestaña / minimizó (visibilitychange). */
  tabBlurCount: number;
  /** Intentos de menú contextual (clic derecho). */
  rightClickAttempts: number;
  /** Atajos de teclado interceptados (copiar/pegar/guardar/imprimir/devtools). */
  keyboardShortcutAttempts: number;
}

export const EMPTY_INTEGRITY: IntegrityCounters = {
  tabBlurCount: 0,
  rightClickAttempts: 0,
  keyboardShortcutAttempts: 0,
};

/**
 * Fusión monotónica de contadores: el cliente acumula totales y los reenvía en
 * cada sinc, así que el servidor toma el MÁXIMO por campo. Esto hace la
 * operación idempotente y a prueba de sincs fuera de orden (un beacon tardío
 * con un total menor nunca reduce el conteo ya guardado).
 */
export function mergeIntegrityCounters(
  a: IntegrityCounters,
  b: IntegrityCounters
): IntegrityCounters {
  return {
    tabBlurCount: Math.max(a.tabBlurCount, b.tabBlurCount),
    rightClickAttempts: Math.max(a.rightClickAttempts, b.rightClickAttempts),
    keyboardShortcutAttempts: Math.max(a.keyboardShortcutAttempts, b.keyboardShortcutAttempts),
  };
}

/** Forma mínima de un evento de teclado para decidir si es sospechoso (testeable sin DOM). */
export interface KeyEventLike {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
}

/**
 * ¿El atajo de teclado corresponde a copiar/pegar/cortar/guardar/imprimir, a
 * recargar, o a abrir herramientas de desarrollador? Se interceptan
 * (preventDefault en el cliente) y se cuentan. No se persigue bloquear al
 * usuario decidido — es una señal de comportamiento, no un candado.
 */
export function isSuspiciousKeyCombo(e: KeyEventLike): boolean {
  const key = e.key.toLowerCase();
  const mod = e.ctrlKey || e.metaKey;

  // Ctrl/Cmd + C/V/X/S/P/U/A: copiar, pegar, cortar, guardar, imprimir,
  // ver-fuente, seleccionar-todo.
  if (mod && ['c', 'v', 'x', 's', 'p', 'u', 'a'].includes(key)) return true;

  // Ctrl/Cmd + Shift + I/J/C: herramientas de desarrollador.
  if (mod && e.shiftKey && ['i', 'j', 'c'].includes(key)) return true;

  // Teclas sueltas: F12 (devtools), PrintScreen (captura).
  if (key === 'f12' || key === 'printscreen') return true;

  return false;
}

/** Evento de sospecha append-only (salidas de fullscreen, cámara, tiempo excedido). */
export interface SuspicionInfoEvent {
  type: string;
  at: string;
  [key: string]: unknown;
}

export interface IntegritySummaryItem {
  key: 'tabBlur' | 'fullscreenExit' | 'rightClick' | 'keyboard';
  label: string;
  count: number;
}

/**
 * Resumen de integridad para la pantalla de resultados (F13 tarea 7). PURO:
 * solo agrega y filtra, sin decidir tono — el componente decide la copy sobria
 * ("en el examen real esto puede anular tu evaluación"), nunca acusatoria.
 * Devuelve SOLO los tipos con conteo > 0 — un arreglo vacío significa "todo en
 * orden", que el componente muestra con un mensaje positivo en vez de una
 * lista de ceros sin sentido.
 */
export function summarizeIntegrityEvents(
  counters: IntegrityCounters,
  suspicionEvents: readonly SuspicionInfoEvent[]
): IntegritySummaryItem[] {
  const fullscreenExits = suspicionEvents.filter((e) => e.type === 'FULLSCREEN_EXIT').length;

  const items: IntegritySummaryItem[] = [
    { key: 'tabBlur', label: 'Cambios de pestaña', count: counters.tabBlurCount },
    { key: 'fullscreenExit', label: 'Salidas de pantalla completa', count: fullscreenExits },
    { key: 'rightClick', label: 'Intentos de clic derecho', count: counters.rightClickAttempts },
    {
      key: 'keyboard',
      label: 'Atajos de teclado interceptados',
      count: counters.keyboardShortcutAttempts,
    },
  ];

  return items.filter((i) => i.count > 0);
}
