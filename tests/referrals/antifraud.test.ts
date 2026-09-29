import { describe, expect, it } from 'vitest';
import { normalizeEmailForAbuse } from '@/lib/referrals/email-normalization';
import {
  HARD_FLAGS,
  REVERSAL_PATTERN_THRESHOLD,
  VELOCITY_MAX_SALES,
  detectFraud,
  isHardFlag,
  parseFlags,
  sameMailbox,
  serializeFlags,
  type FraudInput,
} from '@/lib/referrals/antifraud';

/**
 * La función de la spec §3.4 —`e.split('+')[0].toLowerCase()`— NO detecta el
 * caso que existe para detectar. Estos casos lo demuestran y fijan la versión
 * corregida.
 */
const specNormalizeEmail = (e: string) => e.split('+')[0].toLowerCase();

describe('la normalización de la spec §3.4 está rota (por eso no se usa)', () => {
  it('NO reconoce un alias con + como el mismo buzón (pierde el dominio)', () => {
    expect(specNormalizeEmail('pedro+1@gmail.com')).toBe('pedro');
    expect(specNormalizeEmail('pedro@gmail.com')).toBe('pedro@gmail.com');
    expect(specNormalizeEmail('pedro+1@gmail.com') === specNormalizeEmail('pedro@gmail.com')).toBe(false);
  });

  it('marca como iguales a dos personas distintas de proveedores distintos', () => {
    expect(specNormalizeEmail('ana+a@gmail.com') === specNormalizeEmail('ana+b@yahoo.com')).toBe(true);
  });
});

describe('normalizeEmailForAbuse (corregida)', () => {
  it.each([
    ['pedro@gmail.com', 'pedro@gmail.com'],
    ['Pedro@Gmail.COM', 'pedro@gmail.com'],
    ['  pedro@gmail.com  ', 'pedro@gmail.com'],
    ['pedro+1@gmail.com', 'pedro@gmail.com'],
    ['pedro+a+b@gmail.com', 'pedro@gmail.com'],
    ['p.e.d.r.o@gmail.com', 'pedro@gmail.com'],
    ['p.e.d.r.o+x@gmail.com', 'pedro@gmail.com'],
    ['pedro@googlemail.com', 'pedro@gmail.com'],
    ['p.edro+x@googlemail.com', 'pedro@gmail.com'],
    // En otros proveedores los puntos SÍ cambian de buzón.
    ['ana.lopez@outlook.com', 'ana.lopez@outlook.com'],
    ['ana.lopez+x@outlook.com', 'ana.lopez@outlook.com'],
    ['ana.lopez@yahoo.com.mx', 'ana.lopez@yahoo.com.mx'],
  ])('%s → %s', (entrada, esperado) => {
    expect(normalizeEmailForAbuse(entrada)).toBe(esperado);
  });

  it.each(['', '   ', 'sinarroba', '@dominio.com', 'nombre@', '+solo@gmail.com', '...@gmail.com'])(
    'no es un correo legible: %j → null',
    (entrada) => {
      expect(normalizeEmailForAbuse(entrada)).toBeNull();
    }
  );
});

describe('sameMailbox', () => {
  it('detecta los alias que la spec no detecta', () => {
    expect(sameMailbox('pedro+1@gmail.com', 'pedro@gmail.com')).toBe(true);
    expect(sameMailbox('p.edro@gmail.com', 'pedro@googlemail.com')).toBe(true);
  });

  it('NO junta a dos personas distintas', () => {
    expect(sameMailbox('ana+a@gmail.com', 'ana+b@yahoo.com')).toBe(false);
    expect(sameMailbox('ana.lopez@outlook.com', 'analopez@outlook.com')).toBe(false);
    expect(sameMailbox('pedro@gmail.com', 'pedra@gmail.com')).toBe(false);
  });

  it('si algún correo falta o no se puede leer, NO afirma que sea el mismo', () => {
    expect(sameMailbox(null, 'pedro@gmail.com')).toBe(false);
    expect(sameMailbox('pedro@gmail.com', null)).toBe(false);
    expect(sameMailbox(null, null)).toBe(false);
    expect(sameMailbox('basura', 'basura')).toBe(false);
  });
});

describe('detectFraud', () => {
  const limpio: FraudInput = {
    referrerProfileId: 'ref1',
    buyerProfileId: 'buy1',
    referrerEmail: 'ana@gmail.com',
    buyerEmail: 'luis@hotmail.com',
    salesInLast24h: 0,
    reversalsInLast90d: 0,
  };

  it('una venta normal no lleva ninguna marca', () => {
    expect(detectFraud(limpio)).toEqual({ blocked: false, flags: [] });
  });

  it('AUTOCOMPRA: la misma cuenta → dura', () => {
    expect(detectFraud({ ...limpio, buyerProfileId: 'ref1' })).toEqual({ blocked: true, flags: ['self_purchase'] });
  });

  it('MISMO CORREO con alias → dura', () => {
    expect(detectFraud({ ...limpio, buyerEmail: 'a.na+promo@gmail.com' })).toEqual({
      blocked: true,
      flags: ['same_email'],
    });
  });

  it('cuenta distinta pero MISMO buzón: ambas marcas duras', () => {
    const v = detectFraud({ ...limpio, buyerProfileId: 'ref1', buyerEmail: 'ana@gmail.com' });
    expect(v.blocked).toBe(true);
    expect(v.flags).toEqual(['self_purchase', 'same_email']);
  });

  it('VELOCIDAD: la sexta venta en 24 h se marca (blanda); la quinta no', () => {
    expect(detectFraud({ ...limpio, salesInLast24h: VELOCITY_MAX_SALES - 1 })).toEqual({ blocked: false, flags: [] });
    expect(detectFraud({ ...limpio, salesInLast24h: VELOCITY_MAX_SALES })).toEqual({ blocked: false, flags: ['velocity'] });
    expect(detectFraud({ ...limpio, salesInLast24h: 40 })).toEqual({ blocked: false, flags: ['velocity'] });
  });

  it('PATRÓN DE REVERSIONES: a partir de 2 en 90 días (blanda)', () => {
    expect(detectFraud({ ...limpio, reversalsInLast90d: REVERSAL_PATTERN_THRESHOLD - 1 })).toEqual({
      blocked: false,
      flags: [],
    });
    expect(detectFraud({ ...limpio, reversalsInLast90d: REVERSAL_PATTERN_THRESHOLD })).toEqual({
      blocked: false,
      flags: ['reversal_pattern'],
    });
  });

  it('el umbral de reversiones es exactamente 2 (literal, no la constante)', () => {
    expect(detectFraud({ ...limpio, reversalsInLast90d: 1 }).flags).toEqual([]);
    expect(detectFraud({ ...limpio, reversalsInLast90d: 2 }).flags).toEqual(['reversal_pattern']);
    expect(REVERSAL_PATTERN_THRESHOLD).toBe(2);
    expect(VELOCITY_MAX_SALES).toBe(5);
  });

  it('marcas blandas combinadas se acumulan, y no bloquean', () => {
    expect(detectFraud({ ...limpio, salesInLast24h: 9, reversalsInLast90d: 5 })).toEqual({
      blocked: false,
      flags: ['velocity', 'reversal_pattern'],
    });
  });

  it('una marca dura con blandas: bloquea y conserva TODAS las marcas para el admin', () => {
    const v = detectFraud({ ...limpio, buyerProfileId: 'ref1', salesInLast24h: 9 });
    expect(v.blocked).toBe(true);
    expect(v.flags).toEqual(['self_purchase', 'velocity']);
  });

  it('cuáles son duras: SOLO autocompra y mismo correo', () => {
    expect([...HARD_FLAGS]).toEqual(['self_purchase', 'same_email']);
    expect(isHardFlag('self_purchase')).toBe(true);
    expect(isHardFlag('same_email')).toBe(true);
    expect(isHardFlag('velocity')).toBe(false);
    expect(isHardFlag('reversal_pattern')).toBe(false);
    expect(isHardFlag('inventada')).toBe(false);
  });
});

describe('marcas como texto', () => {
  it('ida y vuelta', () => {
    expect(serializeFlags([])).toBeNull();
    expect(serializeFlags(['velocity'])).toBe('velocity');
    expect(serializeFlags(['self_purchase', 'velocity'])).toBe('self_purchase,velocity');
    expect(parseFlags('self_purchase,velocity')).toEqual(['self_purchase', 'velocity']);
    expect(parseFlags(null)).toEqual([]);
    expect(parseFlags('')).toEqual([]);
  });

  it('ignora lo que no conoce (un valor manipulado en la base no rompe el panel)', () => {
    expect(parseFlags('velocity,<script>,otra')).toEqual(['velocity']);
  });
});
