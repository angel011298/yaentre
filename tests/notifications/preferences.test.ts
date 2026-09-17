import { describe, expect, it } from 'vitest';
import { isNotificationEnabled, isOptInType } from '@/lib/notifications/preferences';

describe('isOptInType', () => {
  it('PARENT_WEEKLY, STREAK_RISK y MARKETING son opt-in', () => {
    expect(isOptInType('PARENT_WEEKLY')).toBe(true);
    expect(isOptInType('STREAK_RISK')).toBe(true);
    // G98: MARKETING se movió a opt-in. Hasta G97 esta prueba afirmaba lo
    // contrario, y afirmaba bien lo que el código hacía: todo registrado
    // quedaba suscrito a publicidad sin haberla pedido.
    expect(isOptInType('MARKETING')).toBe(true);
  });

  it('EXAM_COUNTDOWN no es opt-in (recordatorio del propio producto)', () => {
    expect(isOptInType('EXAM_COUNTDOWN')).toBe(false);
  });
});

describe('isNotificationEnabled', () => {
  it('sin fila: los tipos opt-in están apagados por defecto', () => {
    expect(isNotificationEnabled(null, 'PARENT_WEEKLY')).toBe(false);
    expect(isNotificationEnabled(null, 'STREAK_RISK')).toBe(false);
  });

  // G98 — el defecto concreto que la fase cierra: un usuario sin ninguna fila
  // de preferencia (es decir, TODOS los registrados hoy) contaba como
  // destinatario válido de publicidad.
  it('sin fila: MARKETING queda APAGADO — publicidad exige consentimiento', () => {
    expect(isNotificationEnabled(null, 'MARKETING')).toBe(false);
  });

  it('el consentimiento explícito de «Avísame cuando abra» lo enciende', () => {
    expect(isNotificationEnabled({ enabled: true }, 'MARKETING')).toBe(true);
  });

  it('y la baja lo vuelve a apagar, aunque haya sido aceptado antes', () => {
    expect(isNotificationEnabled({ enabled: false }, 'MARKETING')).toBe(false);
  });

  it('sin fila: los tipos NO opt-in están prendidos por defecto', () => {
    expect(isNotificationEnabled(null, 'EXAM_COUNTDOWN')).toBe(true);
  });

  it('con fila: siempre respeta el valor explícito, sin importar el tipo', () => {
    expect(isNotificationEnabled({ enabled: true }, 'PARENT_WEEKLY')).toBe(true);
    expect(isNotificationEnabled({ enabled: false }, 'EXAM_COUNTDOWN')).toBe(false);
  });
});
