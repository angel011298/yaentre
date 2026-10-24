import { describe, expect, it } from 'vitest';
import { canBookTrack, canSeeTrack, REGULARIZACION_REQUIRES_PREMIUM } from '@/lib/teachers/track-access';
import { readMarketplaceFlags } from '@/lib/marketplace/flags';
import { evaluateLegalGate, isPendingLegalVersion } from '@/lib/marketplace/legal-gate';
import { determinePaymentRail, isValidClabe, isValidCurp, isValidRfcPersonaFisica } from '@/lib/teachers/onboarding';
import { evaluateTeacherLevel } from '@/lib/teachers/level-engine';
import { isPdf } from '@/lib/teachers/documents';

const ON = { liveClasses: true, regularizacion: true, courses: true };

describe('banderas: apagado por defecto', () => {
  it('ausentes o con cualquier valor distinto de "true" → apagadas', () => {
    expect(readMarketplaceFlags({})).toEqual({ liveClasses: false, regularizacion: false, courses: false });
    expect(readMarketplaceFlags({ FEATURE_COURSES: '1', FEATURE_REGULARIZACION: 'TRUE', FEATURE_TEACHER_AVAILABILITY: 'yes' })).toEqual({
      liveClasses: false,
      regularizacion: false,
      courses: false,
    });
    expect(readMarketplaceFlags({ FEATURE_COURSES: 'true', FEATURE_REGULARIZACION: 'true', FEATURE_TEACHER_AVAILABILITY: 'true' })).toEqual(ON);
  });
});

describe('acceso por pista (spec §2.10, §7.1b) — matriz', () => {
  it('ADMISION exige Premium vigente', () => {
    expect(canBookTrack({ track: 'ADMISION', flags: ON, hasPremiumAccess: false, adultDeclared: true })).toEqual({
      allowed: false,
      reason: 'PREMIUM_REQUIRED',
    });
    expect(canBookTrack({ track: 'ADMISION', flags: ON, hasPremiumAccess: true, adultDeclared: true })).toEqual({ allowed: true });
  });

  it('REGULARIZACION está abierta sin Premium (decisión abierta parametrizada)', () => {
    expect(REGULARIZACION_REQUIRES_PREMIUM).toBe(false);
    expect(canBookTrack({ track: 'REGULARIZACION', flags: ON, hasPremiumAccess: false, adultDeclared: true })).toEqual({ allowed: true });
  });

  it('las dos pistas exigen la declaración de mayoría de edad', () => {
    for (const track of ['ADMISION', 'REGULARIZACION'] as const) {
      expect(canBookTrack({ track, flags: ON, hasPremiumAccess: true, adultDeclared: false })).toEqual({
        allowed: false,
        reason: 'ADULT_DECLARATION_REQUIRED',
      });
    }
  });

  it('con la bandera de clases apagada, nada se reserva ni se ve', () => {
    const off = { ...ON, liveClasses: false };
    expect(canBookTrack({ track: 'ADMISION', flags: off, hasPremiumAccess: true, adultDeclared: true }).allowed).toBe(false);
    expect(canSeeTrack('ADMISION', off)).toBe(false);
  });

  it('REGULARIZACION necesita también su bandera', () => {
    const noReg = { ...ON, regularizacion: false };
    expect(canBookTrack({ track: 'REGULARIZACION', flags: noReg, hasPremiumAccess: true, adultDeclared: true })).toEqual({
      allowed: false,
      reason: 'TRACK_DISABLED',
    });
    expect(canSeeTrack('REGULARIZACION', noReg)).toBe(false);
    expect(canSeeTrack('ADMISION', noReg)).toBe(true);
  });
});

describe('candado de textos legales TODO-CLO', () => {
  it('en producción, una versión pendiente cierra la acción', () => {
    expect(isPendingLegalVersion('TODO-CLO-contrato')).toBe(true);
    expect(evaluateLegalGate(['TODO-CLO-x', 'v1'], 'production')).toEqual({ ok: false, pending: ['TODO-CLO-x'] });
    expect(evaluateLegalGate(['v1', 'v2'], 'production')).toEqual({ ok: true });
  });
  it('fuera de producción se permite (para construir y probar el flujo)', () => {
    expect(evaluateLegalGate(['TODO-CLO-x'], 'preview')).toEqual({ ok: true });
    expect(evaluateLegalGate(['TODO-CLO-x'], undefined)).toEqual({ ok: true });
  });
});

describe('alta de profesor: formas de CURP, CLABE y RFC', () => {
  it('CURP', () => {
    expect(isValidCurp('GODE561231HDFRRN09')).toBe(true);
    expect(isValidCurp('gode561231hdfrrn09')).toBe(true);
    expect(isValidCurp('GODE561331HDFRRN09')).toBe(false); // mes 13
    expect(isValidCurp('GODE561231HDFRRN0')).toBe(false);
  });

  it('CLABE con dígito verificador (Banxico)', () => {
    expect(isValidClabe('002010077777777771')).toBe(true);
    expect(isValidClabe('002010077777777772')).toBe(false);
    expect(isValidClabe('00201007777777777')).toBe(false);
    expect(isValidClabe('0020100777777777a1')).toBe(false);
  });

  it('RFC de persona física', () => {
    expect(isValidRfcPersonaFisica('GODE561231GR8')).toBe(true);
    expect(isValidRfcPersonaFisica('GOD561231GR8')).toBe(false);
  });

  it('carril A solo con facturación + RFC + constancia; si no, asimilados', () => {
    expect(determinePaymentRail(true, 'GODE561231GR8', 'teachers/x/csf.pdf')).toBe('COMISION_MERCANTIL');
    expect(determinePaymentRail(true, 'GODE561231GR8', null)).toBe('ASIMILADOS');
    expect(determinePaymentRail(false, 'GODE561231GR8', 'x')).toBe('ASIMILADOS');
  });

  it('la constancia se valida por su firma de PDF, no por la extensión', () => {
    expect(isPdf(new TextEncoder().encode('%PDF-1.7\n...'))).toBe(true);
    expect(isPdf(new TextEncoder().encode('<html>%PDF-'))).toBe(false);
    expect(isPdf(new Uint8Array([0x25, 0x50]))).toBe(false);
  });
});

describe('niveles por mérito: solo suben', () => {
  it('Inicial → Verificado con 15 clases, 4.2 y ≤ 10 % de cancelaciones', () => {
    expect(evaluateTeacherLevel({ totalClassesGiven: 15, averageRating: 4.2, cancellationRate: 10, monthsActive: 0, level: 'INICIAL' })).toBe('VERIFICADO');
    expect(evaluateTeacherLevel({ totalClassesGiven: 14, averageRating: 5, cancellationRate: 0, monthsActive: 9, level: 'INICIAL' })).toBeNull();
  });
  it('Destacado exige además 3 meses', () => {
    expect(evaluateTeacherLevel({ totalClassesGiven: 60, averageRating: 4.8, cancellationRate: 2, monthsActive: 2, level: 'INICIAL' })).toBe('VERIFICADO');
    expect(evaluateTeacherLevel({ totalClassesGiven: 60, averageRating: 4.8, cancellationRate: 2, monthsActive: 3, level: 'VERIFICADO' })).toBe('DESTACADO');
  });
  it('un Destacado con malas métricas no baja', () => {
    expect(evaluateTeacherLevel({ totalClassesGiven: 0, averageRating: 1, cancellationRate: 90, monthsActive: 0, level: 'DESTACADO' })).toBeNull();
  });
});
