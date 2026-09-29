/**
 * Traductores de `FormData` a los objetos crudos que validan los esquemas del
 * profesor — Bloque 2. Módulo PURO: solo lee campos, no valida nada (eso lo
 * hace Zod en `onboarding.ts`), así que un valor raro llega al esquema tal cual
 * y ahí se rechaza con su mensaje.
 *
 * Ninguno lee ni devuelve un identificador de persona: el dueño de la solicitud
 * sale del guard de la acción.
 */

function text(form: FormData, key: string): string | undefined {
  const v = form.get(key);
  return typeof v === 'string' ? v : undefined;
}

/** Parsea el JSON de un campo oculto; lo malformado se devuelve como `undefined` (el esquema lo rechaza). */
export function jsonField(form: FormData, key: string): unknown {
  const raw = text(form, key);
  if (raw === undefined || raw === '') return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

/** Solicitud de onboarding completa. */
export function applicationFromFormData(form: FormData): Record<string, unknown> {
  return {
    fullName: text(form, 'fullName') ?? '',
    publicName: text(form, 'publicName') ?? '',
    bio: text(form, 'bio'),
    phone: text(form, 'phone') ?? '',
    curp: text(form, 'curp') ?? '',
    clabe: text(form, 'clabe') ?? '',
    bankName: text(form, 'bankName') ?? '',
    // Contestar «Sí» es la ÚNICA forma de pedir el Carril A. Ausente o cualquier
    // otro valor ⇒ «No por el momento» ⇒ Carril B (spec §3.2).
    canInvoice: text(form, 'canInvoice') === 'yes',
    rfc: text(form, 'rfc') || undefined,
    csfDocumentPath: text(form, 'csfDocumentPath') || undefined,
    subjects: form.getAll('subjects').filter((v): v is string => typeof v === 'string'),
    availability: jsonField(form, 'availability') ?? [],
    acceptContract: text(form, 'acceptContract') === 'on',
    acceptNda: text(form, 'acceptNda') === 'on',
    acceptRecordingPolicy: text(form, 'acceptRecordingPolicy') === 'on',
  };
}

/**
 * Actualización de datos propios: SOLO los campos que el formulario mandó. Cada
 * sección de la pantalla (pago, contacto, materias, disponibilidad) es su propio
 * formulario y manda su propio subconjunto — un campo ausente NO se interpreta
 * como «bórralo».
 */
export function updateFromFormData(form: FormData): Record<string, unknown> {
  const raw: Record<string, unknown> = {};
  for (const key of ['clabe', 'bankName', 'phone', 'publicName', 'bio'] as const) {
    if (form.has(key)) raw[key] = text(form, key) ?? '';
  }
  if (form.has('subjects')) {
    raw.subjects = form.getAll('subjects').filter((v): v is string => typeof v === 'string');
  }
  if (form.has('availability')) raw.availability = jsonField(form, 'availability') ?? [];
  return raw;
}
