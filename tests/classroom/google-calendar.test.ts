import { describe, expect, it } from 'vitest';
import {
  createGoogleCalendarProvider,
  getClassroomProvider,
  readGoogleClassroomConfig,
  type GoogleClassroomConfig,
} from '@/lib/classroom/google-calendar';
import { ClassroomUnavailableError } from '@/lib/classroom/provider';

const CONFIG: GoogleClassroomConfig = {
  clientId: 'cid',
  clientSecret: 'csecret',
  refreshToken: 'rtoken',
  calendarId: 'primary',
};

interface Call {
  url: string;
  init: RequestInit | undefined;
}

/** `fetch` simulado que registra cada llamada y responde según una función. */
function fakeFetch(handler: (url: string, init?: RequestInit) => { status: number; body?: unknown }) {
  const calls: Call[] = [];
  const impl = async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    const { status, body } = handler(url, init);
    return new Response(body === undefined ? null : JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  };
  return { impl, calls };
}

const okHandler = (url: string) => {
  if (url.includes('oauth2.googleapis.com')) return { status: 200, body: { access_token: 'AT' } };
  return {
    status: 200,
    body: { id: 'evt123', hangoutLink: 'https://meet.google.com/abc-defg-hij' },
  };
};

const INPUT = {
  classId: 'ckclass000000000000000001',
  startsAt: new Date('2026-11-10T23:00:00Z'),
  endsAt: new Date('2026-11-10T23:50:00Z'),
};

describe('configuración', () => {
  it('lee las cuatro variables y usa `primary` por omisión', () => {
    expect(
      readGoogleClassroomConfig({
        GOOGLE_CLASSROOM_CLIENT_ID: 'a',
        GOOGLE_CLASSROOM_CLIENT_SECRET: 'b',
        GOOGLE_CLASSROOM_REFRESH_TOKEN: 'c',
      })
    ).toEqual({ clientId: 'a', clientSecret: 'b', refreshToken: 'c', calendarId: 'primary' });
  });

  it.each(['GOOGLE_CLASSROOM_CLIENT_ID', 'GOOGLE_CLASSROOM_CLIENT_SECRET', 'GOOGLE_CLASSROOM_REFRESH_TOKEN'])(
    'falta %s ⇒ sin configuración (null), no un proveedor a medias',
    (missing) => {
      const env = {
        GOOGLE_CLASSROOM_CLIENT_ID: 'a',
        GOOGLE_CLASSROOM_CLIENT_SECRET: 'b',
        GOOGLE_CLASSROOM_REFRESH_TOKEN: 'c',
      } as Record<string, string>;
      delete env[missing];
      expect(readGoogleClassroomConfig(env)).toBeNull();
      expect(getClassroomProvider(env)).toBeNull();
    }
  );

  it('ninguna credencial usa el prefijo NEXT_PUBLIC_ (no debe llegar al navegador)', () => {
    // El módulo solo lee variables GOOGLE_CLASSROOM_*; nada público.
    expect(readGoogleClassroomConfig({ NEXT_PUBLIC_GOOGLE_CLASSROOM_CLIENT_ID: 'x' })).toBeNull();
  });
});

describe('createMeeting', () => {
  it('pide un access token con el refresh token y luego crea el evento con conferenceData', async () => {
    const { impl, calls } = fakeFetch(okHandler);
    const meeting = await createGoogleCalendarProvider(CONFIG, impl).createMeeting(INPUT);

    expect(meeting).toEqual({ meetingUrl: 'https://meet.google.com/abc-defg-hij', eventId: 'evt123' });
    expect(calls).toHaveLength(2);

    // 1) token
    expect(calls[0]!.url).toBe('https://oauth2.googleapis.com/token');
    const tokenBody = new URLSearchParams(String(calls[0]!.init?.body));
    expect(tokenBody.get('grant_type')).toBe('refresh_token');
    expect(tokenBody.get('refresh_token')).toBe('rtoken');
    expect(tokenBody.get('client_id')).toBe('cid');

    // 2) evento
    expect(calls[1]!.url).toBe(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1'
    );
    expect((calls[1]!.init?.headers as Record<string, string>).Authorization).toBe('Bearer AT');
    const event = JSON.parse(String(calls[1]!.init?.body));
    expect(event.conferenceData.createRequest.conferenceSolutionKey).toEqual({ type: 'hangoutsMeet' });
    expect(event.start).toEqual({ dateTime: '2026-11-10T23:00:00.000Z', timeZone: 'America/Mexico_City' });
    expect(event.end.dateTime).toBe('2026-11-10T23:50:00.000Z');
  });

  it('es idempotente: el requestId sale del id de la clase, así que reintentar no crea otra sala', async () => {
    const { impl, calls } = fakeFetch(okHandler);
    const provider = createGoogleCalendarProvider(CONFIG, impl);
    await provider.createMeeting(INPUT);
    await provider.createMeeting(INPUT);
    const ids = calls
      .filter((c) => c.url.includes('/events'))
      .map((c) => JSON.parse(String(c.init?.body)).conferenceData.createRequest.requestId);
    expect(ids).toEqual(['yaentre-class-ckclass000000000000000001', 'yaentre-class-ckclass000000000000000001']);
  });

  it('el evento NO lleva invitados ni datos de personas (privacidad de menores)', async () => {
    const { impl, calls } = fakeFetch(okHandler);
    await createGoogleCalendarProvider(CONFIG, impl).createMeeting(INPUT);
    const event = JSON.parse(String(calls[1]!.init?.body));
    expect(event.attendees).toBeUndefined();
    expect(event.summary).toBe('Clase YaEntre');
    expect(event.description).toBeUndefined();
    expect(JSON.stringify(event)).not.toMatch(/@|nombre|alumno|profesor/i);
  });

  it('cae al enlace de conferenceData.entryPoints cuando no hay hangoutLink', async () => {
    const { impl } = fakeFetch((url) =>
      url.includes('oauth2')
        ? { status: 200, body: { access_token: 'AT' } }
        : {
            status: 200,
            body: {
              id: 'evt9',
              conferenceData: {
                entryPoints: [
                  { entryPointType: 'phone', uri: 'tel:+1' },
                  { entryPointType: 'video', uri: 'https://meet.google.com/xyz-abcd-efg' },
                ],
              },
            },
          }
    );
    const m = await createGoogleCalendarProvider(CONFIG, impl).createMeeting(INPUT);
    expect(m.meetingUrl).toBe('https://meet.google.com/xyz-abcd-efg');
  });

  it('NUNCA inventa un enlace: un evento sin sala lista lanza en vez de devolver algo', async () => {
    const { impl } = fakeFetch((url) =>
      url.includes('oauth2') ? { status: 200, body: { access_token: 'AT' } } : { status: 200, body: { id: 'evt1' } }
    );
    await expect(createGoogleCalendarProvider(CONFIG, impl).createMeeting(INPUT)).rejects.toBeInstanceOf(
      ClassroomUnavailableError
    );
  });

  it('un refresh token rechazado, o un fallo de Calendar, lanzan ClassroomUnavailableError', async () => {
    const badToken = fakeFetch(() => ({ status: 400, body: { error: 'invalid_grant' } }));
    await expect(createGoogleCalendarProvider(CONFIG, badToken.impl).createMeeting(INPUT)).rejects.toBeInstanceOf(
      ClassroomUnavailableError
    );

    const calendarDown = fakeFetch((url) =>
      url.includes('oauth2') ? { status: 200, body: { access_token: 'AT' } } : { status: 503 }
    );
    await expect(createGoogleCalendarProvider(CONFIG, calendarDown.impl).createMeeting(INPUT)).rejects.toBeInstanceOf(
      ClassroomUnavailableError
    );
  });

  it('respuesta de token sin access_token también falla en vez de mandar «Bearer undefined»', async () => {
    const { impl, calls } = fakeFetch(() => ({ status: 200, body: {} }));
    await expect(createGoogleCalendarProvider(CONFIG, impl).createMeeting(INPUT)).rejects.toBeInstanceOf(
      ClassroomUnavailableError
    );
    expect(calls).toHaveLength(1); // ni siquiera intentó crear el evento
  });
});

describe('deleteMeeting', () => {
  it('borra el evento por su id, con el id codificado en la URL', async () => {
    const { impl, calls } = fakeFetch((url) =>
      url.includes('oauth2') ? { status: 200, body: { access_token: 'AT' } } : { status: 204 }
    );
    await createGoogleCalendarProvider(CONFIG, impl).deleteMeeting('a/b');
    expect(calls[1]!.url).toBe('https://www.googleapis.com/calendar/v3/calendars/primary/events/a%2Fb');
    expect(calls[1]!.init?.method).toBe('DELETE');
  });

  it('un evento que ya no existe (404/410) se considera borrado', async () => {
    for (const status of [404, 410]) {
      const { impl } = fakeFetch((url) => (url.includes('oauth2') ? { status: 200, body: { access_token: 'AT' } } : { status }));
      await expect(createGoogleCalendarProvider(CONFIG, impl).deleteMeeting('e')).resolves.toBeUndefined();
    }
  });

  it('cualquier otro error sí lanza', async () => {
    const { impl } = fakeFetch((url) => (url.includes('oauth2') ? { status: 200, body: { access_token: 'AT' } } : { status: 500 }));
    await expect(createGoogleCalendarProvider(CONFIG, impl).deleteMeeting('e')).rejects.toBeInstanceOf(
      ClassroomUnavailableError
    );
  });
});
