import type { VerifierVerdict } from './verifier';

/**
 * Resolución automática del pipeline adversarial (F2) — lógica PURA.
 *
 * Un reactivo se publica (isVerified=true) SOLO si las TRES condiciones se
 * cumplen simultáneamente:
 *   1. La opción del verificador coincide con la del generador.
 *   2. La confianza del verificador es alta (≥ MIN_CONFIDENCE).
 *   3. El verificador no detectó NINGÚN problema.
 * Cualquier falla → queda sin publicar, con el veredicto completo adjunto.
 * Las discrepancias sin resolver simplemente no se publican. No hay revisión
 * humana en el camino.
 */

export const MIN_CONFIDENCE = 0.85;

/** Tasa del muestreo de control (tercera pasada con un modelo distinto). */
export const AUDIT_RATE = 0.05;

export type Decision = 'AUTO_APPROVED' | 'UNPUBLISHED';

export interface ResolutionResult {
  decision: Decision;
  reasons: string[];
}

export interface ResolutionInput {
  /** Opción marcada como correcta por el GENERADOR. */
  generatorOption: 'A' | 'B' | 'C' | 'D';
  verdict: Pick<VerifierVerdict, 'chosenOption' | 'confidence' | 'problems'>;
  minConfidence?: number;
}

export function resolveVerdict({
  generatorOption,
  verdict,
  minConfidence = MIN_CONFIDENCE,
}: ResolutionInput): ResolutionResult {
  const reasons: string[] = [];

  if (verdict.chosenOption !== generatorOption) {
    reasons.push(
      `DISCREPANCIA: el verificador eligió ${verdict.chosenOption}, el generador marcó ${generatorOption}`,
    );
  }
  if (verdict.confidence < minConfidence) {
    reasons.push(
      `CONFIANZA BAJA: ${verdict.confidence.toFixed(2)} < ${minConfidence}`,
    );
  }
  if (verdict.problems.length > 0) {
    reasons.push(
      `PROBLEMAS DETECTADOS: ${verdict.problems.map((p) => p.type).join(', ')}`,
    );
  }

  return reasons.length === 0
    ? { decision: 'AUTO_APPROVED', reasons: [] }
    : { decision: 'UNPUBLISHED', reasons };
}

/**
 * Muestreo de control: selecciona ceil(n × rate) elementos al azar de los
 * auto-aprobados para una TERCERA verificación con un modelo distinto.
 * `rng` inyectable para determinismo en tests (default Math.random).
 */
export function sampleForAudit<T>(
  items: readonly T[],
  rate: number = AUDIT_RATE,
  rng: () => number = Math.random,
): T[] {
  if (items.length === 0 || rate <= 0) return [];
  const count = Math.min(items.length, Math.ceil(items.length * rate));
  // Fisher-Yates parcial sobre una copia
  const pool = [...items];
  for (let i = 0; i < count; i++) {
    const j = i + Math.floor(rng() * (pool.length - i));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

/**
 * Registro de verificación que se persiste en Question.verification (JSONB).
 * Contiene TODO lo necesario para el panel de discrepancias (F3) y para
 * auditoría: nunca se publica un reactivo sin este registro.
 */
export interface VerificationRecord {
  pipeline: 'adversarial-v1';
  generatorModel: string;
  generatorOption: string;
  verdict: VerifierVerdict;
  decision: Decision;
  reasons: string[];
  audit?: {
    verdict: VerifierVerdict;
    decision: Decision;
    reasons: string[];
    degraded: boolean;
  } | null;
}
