import { describe, expect, it } from 'vitest';
import { signUnsubscribeToken, verifyUnsubscribeToken } from '@/lib/email/unsubscribe-token';

const SECRET = 'test-secret-do-not-use-in-prod';

describe('signUnsubscribeToken / verifyUnsubscribeToken', () => {
  it('un token recién firmado verifica correctamente', () => {
    const token = signUnsubscribeToken('profile_1', 'PARENT_WEEKLY', SECRET);
    expect(verifyUnsubscribeToken('profile_1', 'PARENT_WEEKLY', token, SECRET)).toBe(true);
  });

  it('es determinista: mismos inputs producen la misma firma', () => {
    const a = signUnsubscribeToken('profile_1', 'STREAK_RISK', SECRET);
    const b = signUnsubscribeToken('profile_1', 'STREAK_RISK', SECRET);
    expect(a).toBe(b);
  });

  it('rechaza un token válido para OTRO userProfileId (anti-IDOR)', () => {
    const token = signUnsubscribeToken('profile_1', 'PARENT_WEEKLY', SECRET);
    expect(verifyUnsubscribeToken('profile_2', 'PARENT_WEEKLY', token, SECRET)).toBe(false);
  });

  it('rechaza un token válido para OTRO tipo de notificación', () => {
    const token = signUnsubscribeToken('profile_1', 'PARENT_WEEKLY', SECRET);
    expect(verifyUnsubscribeToken('profile_1', 'STREAK_RISK', token, SECRET)).toBe(false);
  });

  it('rechaza con un secreto distinto', () => {
    const token = signUnsubscribeToken('profile_1', 'PARENT_WEEKLY', SECRET);
    expect(verifyUnsubscribeToken('profile_1', 'PARENT_WEEKLY', token, 'otro-secreto')).toBe(false);
  });

  it('rechaza basura inventada', () => {
    expect(verifyUnsubscribeToken('profile_1', 'PARENT_WEEKLY', 'not-a-real-token', SECRET)).toBe(
      false
    );
  });
});
