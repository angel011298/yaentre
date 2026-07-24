/**
 * Barajado determinista y sembrado (F12). Módulo PURO: a diferencia del
 * shuffle impuro del diagnóstico (qué reactivo le toca a cada alumno no es una
 * regla de negocio), aquí el ORDEN DE OPCIONES sí debe ser reproducible — si el
 * alumno recarga o retoma la sesión, cada reactivo debe mostrar sus opciones en
 * el mismo orden. Por eso se siembra con `sessionId + questionId`: mismo par ⇒
 * mismo orden, siempre, sin guardar nada extra en la base.
 */

/** Hash estable de una cadena a un entero de 32 bits (algoritmo tipo xfnv1a). */
export function hashSeed(input: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** PRNG determinista mulberry32: dada una semilla, produce números en [0,1). */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Fisher-Yates determinista: la misma `seed` produce siempre la misma
 * permutación. No muta la entrada.
 */
export function seededShuffle<T>(items: readonly T[], seed: number): T[] {
  const result = [...items];
  const rand = mulberry32(seed);
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Orden final de las opciones de un reactivo para el cliente. Si el barajado
 * está desactivado (IPN), devuelve el orden original tal cual. Si está activo
 * (UNAM), lo baraja determinísticamente por `sessionId+questionId`. Nota clave
 * de seguridad: barajar SOLO cambia el orden visual; el `id` de cada opción
 * (con el que se responde) se conserva, así que el scoring server-side no se ve
 * afectado y la opción correcta nunca queda expuesta por su posición.
 */
export function orderQuestionOptions<T>(
  options: readonly T[],
  params: { enabled: boolean; sessionId: string; questionId: string }
): T[] {
  if (!params.enabled) return [...options];
  return seededShuffle(options, hashSeed(`${params.sessionId}:${params.questionId}`));
}
