import { describe, expect, it } from 'vitest';
import { isAuthorizedCronRequest } from '@/lib/cron/auth';

describe('isAuthorizedCronRequest', () => {
  it('autoriza con el header Bearer exacto', () => {
    expect(isAuthorizedCronRequest('Bearer s3cr3t', 's3cr3t')).toBe(true);
  });

  it('rechaza sin header', () => {
    expect(isAuthorizedCronRequest(null, 's3cr3t')).toBe(false);
  });

  it('rechaza sin secreto configurado, aunque el header "coincida" con undefined', () => {
    expect(isAuthorizedCronRequest('Bearer undefined', undefined)).toBe(false);
  });

  it('rechaza un secreto incorrecto', () => {
    expect(isAuthorizedCronRequest('Bearer wrong', 's3cr3t')).toBe(false);
  });

  it('rechaza sin el prefijo "Bearer "', () => {
    expect(isAuthorizedCronRequest('s3cr3t', 's3cr3t')).toBe(false);
  });
});
