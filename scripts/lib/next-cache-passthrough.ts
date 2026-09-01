/**
 * Stub de `next/cache` para el script de medición (G59).
 *
 * `unstable_cache` necesita el almacén incremental del servidor de Next, que
 * no existe al correr un script con tsx. Aquí se sustituye por un
 * pass-through: la función envuelta se ejecuta siempre, sin caché.
 *
 * Es lo que queremos medir. El objetivo del script es contar las consultas del
 * camino FRÍO (primer render de una instancia, o cuando la ventana de 300 s ya
 * expiró); con el caché caliente esos números solo bajan. Medir con caché daría
 * cifras bonitas que no representan el peor caso real.
 *
 * Solo lo usa `scripts/tsconfig.perf.json`. El build de Next usa el módulo real.
 */
export function unstable_cache<T extends (...args: never[]) => Promise<unknown>>(fn: T): T {
  return fn;
}

export function revalidatePath(): void {}
export function revalidateTag(): void {}
