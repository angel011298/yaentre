import { describe, expect, it } from 'vitest';
import { isNotificationEnabled, isOptInType } from '@/lib/notifications/preferences';

describe('isOptInType', () => {
  it('PARENT_WEEKLY y STREAK_RISK son opt-in', () => {
    expect(isOptInType('PARENT_WEEKLY')).toBe(true);
    expect(isOptInType('STREAK_RISK')).toBe(true);
  });

  it('EXAM_COUNTDOWN y MARKETING no son opt-in (prendidos por defecto)', () => {
    expect(isOptInType('EXAM_COUNTDOWN')).toBe(false);
    expect(isOptInType('MARKETING')).toBe(false);
  });
});

describe('isNotificationEnabled', () => {
  it('sin fila: los tipos opt-in están apagados por defecto', () => {
    expect(isNotificationEnabled(null, 'PARENT_WEEKLY')).toBe(false);
    expect(isNotificationEnabled(null, 'STREAK_RISK')).toBe(false);
  });

  it('sin fila: los tipos NO opt-in están prendidos por defecto', () => {
    expect(isNotificationEnabled(null, 'EXAM_COUNTDOWN')).toBe(true);
  });

  it('con fila: siempre respeta el valor explícito, sin importar el tipo', () => {
    expect(isNotificationEnabled({ enabled: true }, 'PARENT_WEEKLY')).toBe(true);
    expect(isNotificationEnabled({ enabled: false }, 'EXAM_COUNTDOWN')).toBe(false);
  });
});
