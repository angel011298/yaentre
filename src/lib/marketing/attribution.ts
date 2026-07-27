/**
 * Atribución de marketing (F24): captura de parámetros de campaña de la
 * PRIMERA visita de un usuario, para poder atribuir correctamente de dónde
 * vino cada compra futura — no solo el registro.
 *
 * Módulo PURO (sin `next/headers`, sin `document`): extrae los parámetros
 * relevantes de una URL y arma el objeto que se guarda en la cookie de
 * atribución (`proxy.ts`) y luego en `UserProfile.acquisitionSource`
 * (`app/actions/auth.ts`, solo al crear el perfil — nunca se sobreescribe).
 */

export const ATTRIBUTION_COOKIE_NAME = 'acierta_attribution';
export const ATTRIBUTION_COOKIE_MAX_AGE_SECS = 90 * 24 * 60 * 60; // 90 días

const UTM_PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const;
const CLICK_ID_PARAMS = ['fbclid', 'ttclid', 'gclid'] as const;

export interface AcquisitionSource {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  fbclid?: string;
  ttclid?: string;
  gclid?: string;
  landingPath: string;
  capturedAt: string;
}

/**
 * Extrae los parámetros de campaña de una URL de entrada. Devuelve `null` si
 * NINGÚN parámetro de campaña/click-id está presente (tráfico directo u
 * orgánico) — así `proxy.ts` sabe que no hay nada que capturar en esta visita.
 */
export function extractAcquisitionSource(url: URL, now: Date = new Date()): AcquisitionSource | null {
  const params: Record<string, string> = {};
  let hasAny = false;

  for (const key of [...UTM_PARAMS, ...CLICK_ID_PARAMS]) {
    const value = url.searchParams.get(key);
    if (value) {
      params[key] = value;
      hasAny = true;
    }
  }

  if (!hasAny) return null;

  return {
    ...params,
    landingPath: url.pathname,
    capturedAt: now.toISOString(),
  };
}

/** Parseo defensivo del valor de la cookie — nunca lanza ante JSON corrupto/manipulado. */
export function parseAttributionCookie(raw: string | undefined): AcquisitionSource | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null && typeof parsed.landingPath === 'string') {
      return parsed as AcquisitionSource;
    }
    return null;
  } catch {
    return null;
  }
}
