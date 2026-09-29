import {
  ClassroomUnavailableError,
  type ClassroomMeeting,
  type ClassroomProvider,
  type CreateMeetingInput,
} from './provider';

/**
 * Proveedor de Google Meet por la API de Google Calendar — Bloque 2.
 *
 * Crea un EVENTO de calendario con una sala de Meet asociada
 * (`conferenceData.createRequest`) y devuelve su enlace. Es la vía documentada y
 * estable de obtener un enlace de Meet; la API específica de Meet no se usa
 * porque no fue posible verificar sus campos desde el entorno de desarrollo.
 *
 * ⚠️ NO VERIFICADO CONTRA GOOGLE REAL (ver `provider.ts`). Las pruebas
 * comprueban la forma de las peticiones con un `fetch` simulado, no el
 * comportamiento del servicio.
 *
 * ── Privacidad ──────────────────────────────────────────────────────────────
 *
 * El evento NO lleva invitados ni datos del alumno o del profesor: el título es
 * genérico. Así Google no recibe nombres ni correos (menos datos personales de
 * menores en un tercero, contexto maestro §4.5) y no manda invitaciones por su
 * cuenta — el enlace lo enviamos nosotros, 15 minutos antes.
 *
 * ── Riesgo operativo conocido ───────────────────────────────────────────────
 *
 * Una sala de Meet creada por una cuenta de YaEntre pide que alguien de esa
 * organización ADMITA a los participantes externos. Si nadie de YaEntre está en
 * la llamada, alumno y profesor pueden quedarse en la sala de espera. Se
 * resuelve con la configuración de acceso de Meet en la organización o con un
 * coanfitrión; requiere una prueba real antes de abrir el marketplace.
 *
 * ── Credenciales ────────────────────────────────────────────────────────────
 *
 * OAuth con REFRESH TOKEN de la cuenta de YaEntre, solo servidor:
 *   GOOGLE_CLASSROOM_CLIENT_ID, GOOGLE_CLASSROOM_CLIENT_SECRET,
 *   GOOGLE_CLASSROOM_REFRESH_TOKEN, y opcional GOOGLE_CLASSROOM_CALENDAR_ID
 *   (por omisión `primary`). Ninguna lleva `NEXT_PUBLIC_`.
 */

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const CALENDAR_BASE = 'https://www.googleapis.com/calendar/v3/calendars';

export interface GoogleClassroomConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  calendarId: string;
}

/** Lee la configuración del entorno; `null` si falta cualquier credencial. */
export function readGoogleClassroomConfig(env: Record<string, string | undefined> = process.env): GoogleClassroomConfig | null {
  const clientId = env.GOOGLE_CLASSROOM_CLIENT_ID;
  const clientSecret = env.GOOGLE_CLASSROOM_CLIENT_SECRET;
  const refreshToken = env.GOOGLE_CLASSROOM_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) return null;
  return { clientId, clientSecret, refreshToken, calendarId: env.GOOGLE_CLASSROOM_CALENDAR_ID || 'primary' };
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export function createGoogleCalendarProvider(
  config: GoogleClassroomConfig,
  fetchImpl: FetchLike = (input, init) => fetch(input, init)
): ClassroomProvider {
  async function accessToken(): Promise<string> {
    const res = await fetchImpl(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        refresh_token: config.refreshToken,
        grant_type: 'refresh_token',
      }).toString(),
    });
    if (!res.ok) throw new ClassroomUnavailableError(`Google rechazó el refresh token (HTTP ${res.status}).`);
    const body = (await res.json()) as { access_token?: string };
    if (!body.access_token) throw new ClassroomUnavailableError('Google no devolvió un access token.');
    return body.access_token;
  }

  const eventsUrl = `${CALENDAR_BASE}/${encodeURIComponent(config.calendarId)}/events`;

  return {
    async createMeeting(input: CreateMeetingInput): Promise<ClassroomMeeting> {
      const token = await accessToken();
      const res = await fetchImpl(`${eventsUrl}?conferenceDataVersion=1`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary: 'Clase YaEntre',
          start: { dateTime: input.startsAt.toISOString(), timeZone: 'America/Mexico_City' },
          end: { dateTime: input.endsAt.toISOString(), timeZone: 'America/Mexico_City' },
          // `requestId` = id de la clase: reintentar la creación no crea dos salas.
          conferenceData: {
            createRequest: {
              requestId: `yaentre-class-${input.classId}`,
              conferenceSolutionKey: { type: 'hangoutsMeet' },
            },
          },
        }),
      });
      if (!res.ok) throw new ClassroomUnavailableError(`Google Calendar no creó el evento (HTTP ${res.status}).`);

      const event = (await res.json()) as {
        id?: string;
        hangoutLink?: string;
        conferenceData?: { entryPoints?: Array<{ entryPointType?: string; uri?: string }> };
      };
      const video = event.conferenceData?.entryPoints?.find((e) => e.entryPointType === 'video')?.uri;
      const meetingUrl = event.hangoutLink ?? video;
      if (!event.id || !meetingUrl) {
        // Google puede devolver el evento con la sala aún «pendiente»: no hay
        // enlace que mandar todavía, y mandar uno inventado sería peor.
        throw new ClassroomUnavailableError('Google creó el evento pero aún no devuelve el enlace de Meet.');
      }
      return { meetingUrl, eventId: event.id };
    },

    async deleteMeeting(eventId: string): Promise<void> {
      const token = await accessToken();
      const res = await fetchImpl(`${eventsUrl}/${encodeURIComponent(eventId)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      // 404/410: el evento ya no existe — el resultado que se quería.
      if (!res.ok && res.status !== 404 && res.status !== 410) {
        throw new ClassroomUnavailableError(`Google Calendar no borró el evento (HTTP ${res.status}).`);
      }
    },
  };
}

/**
 * Proveedor configurado desde el entorno, o `null` si faltan credenciales. El
 * llamador decide qué hacer con `null` (el job lo reporta y reintenta): nunca se
 * inventa un enlace.
 */
export function getClassroomProvider(env: Record<string, string | undefined> = process.env): ClassroomProvider | null {
  const config = readGoogleClassroomConfig(env);
  return config ? createGoogleCalendarProvider(config) : null;
}
