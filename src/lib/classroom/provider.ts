/**
 * PROVEEDOR DEL AULA — Bloque 2 (spec §6.5: «Generar enlace Google Meet»).
 *
 * Una interfaz mínima detrás de la cual vive Google Meet, para que:
 *   · el resto del código (job del ciclo de vida, correos) no dependa de Google;
 *   · se pueda probar sin red, con un proveedor de mentira;
 *   · cambiar de proveedor no toque el flujo de las clases.
 *
 * ── Lo que este proveedor NO hace, y por qué ────────────────────────────────
 *
 * 1. NO inicia ni detiene grabaciones. Google Meet no expone un endpoint para
 *    «empezar a grabar»: la grabación la inicia quien conduce la reunión, o el
 *    ajuste de la organización, y exige una edición de Google Workspace que la
 *    incluya (de pago — decisión de costo del dueño, ver RETORNO_BLOQUE2.md).
 *    Lo que SÍ garantiza este código es la parte que depende de nosotros: que
 *    NO se grabe sin consentimiento (`recordingConsentGranted`) y que se sepa
 *    cuánto se conserva (`recordingExpiry`).
 * 2. NO se verificó contra Google real: el sandbox de desarrollo no tiene salida
 *    a las APIs de Google. Las pruebas usan un `fetch` simulado. Antes de abrir
 *    el marketplace hay que hacer una clase de PRUEBA REAL de punta a punta.
 */

export interface ClassroomMeeting {
  /** Enlace que se manda a alumno y profesor. */
  meetingUrl: string;
  /** Identificador del evento en el proveedor, para poder borrarlo si la clase se cancela. */
  eventId: string;
}

export interface CreateMeetingInput {
  /** Identificador de la clase: hace la creación IDEMPOTENTE (mismo id ⇒ mismo evento). */
  classId: string;
  startsAt: Date;
  endsAt: Date;
}

export interface ClassroomProvider {
  createMeeting(input: CreateMeetingInput): Promise<ClassroomMeeting>;
  deleteMeeting(eventId: string): Promise<void>;
}

/** El proveedor falló o no está configurado. La clase sigue en pie: se reintenta. */
export class ClassroomUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ClassroomUnavailableError';
  }
}
