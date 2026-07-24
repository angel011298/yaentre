import { describe, expect, it } from 'vitest';
import { modeForScopeKind } from '@/lib/drill/scope';

describe('modeForScopeKind', () => {
  it('tema específico ⇒ TOPIC_DRILL', () => {
    expect(modeForScopeKind('topic')).toBe('TOPIC_DRILL');
  });

  it('materia ⇒ AREA_PRACTICE (el schema no distingue una materia de toda el área)', () => {
    expect(modeForScopeKind('subject')).toBe('AREA_PRACTICE');
  });

  it('reforzar débiles (área completa) ⇒ AREA_PRACTICE', () => {
    expect(modeForScopeKind('area')).toBe('AREA_PRACTICE');
  });
});
