import { describe, expect, it } from 'vitest';
import {
  extractAcquisitionSource,
  parseAttributionCookie,
} from '@/lib/marketing/attribution';

describe('extractAcquisitionSource', () => {
  const now = new Date('2026-08-01T12:00:00Z');

  it('extrae los parámetros UTM y el landingPath/capturedAt', () => {
    const url = new URL(
      'https://acierta.mx/precios?utm_source=meta&utm_medium=cpc&utm_campaign=early_bird'
    );
    const result = extractAcquisitionSource(url, now);
    expect(result).toEqual({
      utm_source: 'meta',
      utm_medium: 'cpc',
      utm_campaign: 'early_bird',
      landingPath: '/precios',
      capturedAt: '2026-08-01T12:00:00.000Z',
    });
  });

  it('extrae click IDs (fbclid/ttclid/gclid) junto con UTMs', () => {
    const url = new URL('https://acierta.mx/?fbclid=abc123&utm_source=facebook');
    const result = extractAcquisitionSource(url, now);
    expect(result?.fbclid).toBe('abc123');
    expect(result?.utm_source).toBe('facebook');
  });

  it('devuelve null si no hay ningún parámetro de campaña (tráfico directo/orgánico)', () => {
    const url = new URL('https://acierta.mx/precios?ref=friend');
    expect(extractAcquisitionSource(url, now)).toBeNull();
  });

  it('devuelve null en la landing sin ningún query param', () => {
    const url = new URL('https://acierta.mx/');
    expect(extractAcquisitionSource(url, now)).toBeNull();
  });

  it('captura solo click-id sin ningún utm_* (anuncio sin UTMs configurados)', () => {
    const url = new URL('https://acierta.mx/?ttclid=xyz789');
    const result = extractAcquisitionSource(url, now);
    expect(result).toEqual({
      ttclid: 'xyz789',
      landingPath: '/',
      capturedAt: '2026-08-01T12:00:00.000Z',
    });
  });
});

describe('parseAttributionCookie', () => {
  it('parsea un valor JSON válido', () => {
    const raw = JSON.stringify({ utm_source: 'tiktok', landingPath: '/', capturedAt: 'x' });
    expect(parseAttributionCookie(raw)).toEqual({
      utm_source: 'tiktok',
      landingPath: '/',
      capturedAt: 'x',
    });
  });

  it('devuelve null ante undefined', () => {
    expect(parseAttributionCookie(undefined)).toBeNull();
  });

  it('devuelve null ante JSON corrupto/manipulado — nunca lanza', () => {
    expect(parseAttributionCookie('{not valid json')).toBeNull();
  });

  it('devuelve null si el objeto no tiene la forma esperada (sin landingPath)', () => {
    expect(parseAttributionCookie(JSON.stringify({ foo: 'bar' }))).toBeNull();
  });

  it('devuelve null ante un array o un primitivo disfrazado de JSON', () => {
    expect(parseAttributionCookie(JSON.stringify(['a', 'b']))).toBeNull();
    expect(parseAttributionCookie('"just a string"')).toBeNull();
  });
});
