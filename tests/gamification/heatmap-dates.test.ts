import { describe, expect, it } from 'vitest';
import { localDateFromKey } from '@/lib/paywall/mexico-time';

/**
 * G100 — el día de una clave `YYYY-MM-DD` es el MISMO día en cualquier zona.
 *
 * `react-calendar-heatmap` trabaja con la fecha local. Con `new Date(clave)`
 * (medianoche UTC) el calendario se recorría un día en México y el servidor
 * (UTC) y el navegador (UTC−6) dibujaban cosas distintas: error #418 en el
 * tablero de producción. Estas pruebas se corren con `TZ=UTC` y con
 * `TZ=America/Mexico_City` (ver ESTADO §G100): la propiedad tiene que valer
 * en las dos.
 */
describe('localDateFromKey', () => {
  it.each(['2026-10-15', '2026-01-01', '2026-12-31', '2027-02-28'])(
    '%s conserva año, mes y día en la zona local',
    (key) => {
      const [y, m, d] = key.split('-').map(Number);
      const date = localDateFromKey(key);
      expect([date.getFullYear(), date.getMonth() + 1, date.getDate()]).toEqual([y, m, d]);
      expect(date.getHours()).toBe(0);
    }
  );

  it('la hora pedida se respeta (mediodía para los valores del calendario)', () => {
    const noon = localDateFromKey('2026-10-15', 12);
    expect(noon.getDate()).toBe(15);
    expect(noon.getHours()).toBe(12);
  });

  it('el día de la semana es el del calendario, no el de UTC recorrido', () => {
    // 15-oct-2026 es jueves (4) en cualquier zona.
    expect(localDateFromKey('2026-10-15').getDay()).toBe(4);
  });

  it.each(['', '2026-10', '15/10/2026', '2026-10-15T00:00:00Z', 'abc'])(
    'clave mal formada %j ⇒ Invalid Date, no un día equivocado',
    (key) => {
      expect(Number.isNaN(localDateFromKey(key).getTime())).toBe(true);
    }
  );
});
