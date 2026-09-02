import { describe, expect, it } from 'vitest';
import { resolveClientIp, UNKNOWN_IP } from '@/lib/rate-limit/client-ip';

/**
 * G65 — De esta función cuelga TODO el límite de tasa por IP. Si un atacante
 * puede elegir qué IP se le cuenta, cada intento cae en un cubo distinto y el
 * presupuesto por IP deja de existir.
 */
function headers(map: Record<string, string>) {
  return (name: string) => map[name] ?? null;
}

describe('resolveClientIp (G65)', () => {
  it('prefiere la cabecera de la plataforma sobre la que puede falsear el cliente', () => {
    const ip = resolveClientIp(
      headers({
        // Un atacante puede mandar `x-forwarded-for` a mano; Vercel la
        // reescribe, pero `x-vercel-forwarded-for` es la única que pone SIEMPRE
        // la plataforma. Ante discrepancia, gana la de la plataforma.
        'x-vercel-forwarded-for': '203.0.113.7',
        'x-forwarded-for': '10.0.0.1',
        'x-real-ip': '10.0.0.2',
      })
    );
    expect(ip).toBe('203.0.113.7');
  });

  it('toma el PRIMER salto de una cadena de proxies', () => {
    const ip = resolveClientIp(headers({ 'x-forwarded-for': '203.0.113.7, 70.41.3.18, 150.172.238.178' }));
    expect(ip).toBe('203.0.113.7');
  });

  it('cae a x-real-ip cuando no hay forwarded', () => {
    expect(resolveClientIp(headers({ 'x-real-ip': '198.51.100.4' }))).toBe('198.51.100.4');
  });

  it('sin ninguna cabecera devuelve el marcador desconocido (cubo único, más restrictivo)', () => {
    expect(resolveClientIp(headers({}))).toBe(UNKNOWN_IP);
  });

  it('ignora valores vacíos en vez de crear un cubo con cadena vacía', () => {
    expect(resolveClientIp(headers({ 'x-forwarded-for': '   ', 'x-real-ip': '198.51.100.4' }))).toBe(
      '198.51.100.4'
    );
    expect(resolveClientIp(headers({ 'x-forwarded-for': ',,' }))).toBe(UNKNOWN_IP);
  });

  it('acota la longitud: la cabecera es texto arbitrario del exterior y va a una llave indexada', () => {
    const largo = 'a'.repeat(500);
    expect(resolveClientIp(headers({ 'x-forwarded-for': largo }))).toHaveLength(45);
  });
});
