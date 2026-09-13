import { describe, expect, it } from 'vitest';
import {
  evaluateAreaCoverage,
  isAreaSelectable,
  MIN_COVERED_WEIGHT_RATIO,
  resolveEffectiveServable,
  type SubjectCoverageInput,
} from '@/lib/content/coverage';

/**
 * G74 — guarda de cobertura de contenido.
 *
 * Los escenarios NO son inventados: son los pesos reales del seed y los
 * conteos reales del banco el día de esta fase, medidos con
 * `pnpm content:guard`. Así, si el umbral o la aritmética se mueven, la prueba
 * falla nombrando un área que existe de verdad y no un caso de laboratorio.
 *
 * ── Sobre el rojo alcanzable (lección de G73b) ──────────────────────────────
 * Cada `it` afirma un valor CONCRETO (un estado, un peso, una lista de
 * materias por su nombre), nunca «no lanzó» ni un booleano derivado de sí
 * mismo. Comprobado bajando `MIN_COVERED_WEIGHT_RATIO` a 0.3: los dos tests de
 * IPN SOCADM fallan; subiéndolo a 0.95: fallan los de UNAM Área 1, 2 y 4.
 * Y no hay ningún `await import()` dentro de un `it`: los imports son de
 * ámbito de módulo, así que el presupuesto de tiempo mide aserciones.
 */

/** UNAM Área 1 — 4 materias pobladas, Inglés en cero (peso 6 de 70). */
const UNAM_AREA_1: SubjectCoverageInput[] = [
  { subjectId: 'mat_a1', subjectName: 'Matemáticas', weight: 26, servable: 114 },
  { subjectId: 'fis_a1', subjectName: 'Física', weight: 16, servable: 107 },
  { subjectId: 'qui_a1', subjectName: 'Química', weight: 12, servable: 157 },
  { subjectId: 'esp_a1', subjectName: 'Español', weight: 10, servable: 35 },
  { subjectId: 'ing_a1', subjectName: 'Inglés', weight: 6, servable: 0 },
];

/** IPN SOCADM — el caso del veredicto: 4 de 7 materias en cero. */
const IPN_SOCADM: SubjectCoverageInput[] = [
  { subjectId: 'hmx', subjectName: 'Historia de México', weight: 6, servable: 0 },
  { subjectId: 'huniv', subjectName: 'Historia Universal', weight: 4, servable: 0 },
  { subjectId: 'geo', subjectName: 'Geografía', weight: 4, servable: 0 },
  { subjectId: 'mata', subjectName: 'Matemáticas Aplicadas', weight: 3, servable: 35 },
  { subjectId: 'esp', subjectName: 'Español/Lectura', weight: 3, servable: 70 },
  { subjectId: 'ing', subjectName: 'Inglés', weight: 2, servable: 35 },
  { subjectId: 'civ', subjectName: 'Civismo/Derecho', weight: 3, servable: 0 },
];

/** IPN FISMAT — todas las materias con contenido de sobra. */
const IPN_FISMAT: SubjectCoverageInput[] = [
  { subjectId: 'mat', subjectName: 'Matemáticas', weight: 24, servable: 105 },
  { subjectId: 'fis', subjectName: 'Física', weight: 20, servable: 70 },
  { subjectId: 'qui', subjectName: 'Química', weight: 10, servable: 70 },
  { subjectId: 'esp', subjectName: 'Español/Lectura', weight: 4, servable: 70 },
  { subjectId: 'ing', subjectName: 'Inglés', weight: 2, servable: 35 },
];

describe('evaluateAreaCoverage — el caso que G74 vino a cerrar', () => {
  it('IPN Sociales y Administrativas NO se ofrece: 8 de 25 de peso (32%)', () => {
    const result = evaluateAreaCoverage(IPN_SOCADM);

    expect(result.status).toBe('COMING_SOON');
    expect(result.coveredWeight).toBe(8);
    expect(result.totalWeight).toBe(25);
    expect(Math.round(result.coveredRatio * 100)).toBe(32);
    expect(isAreaSelectable(result.status)).toBe(false);
  });

  it('nombra las 4 materias que faltan, de mayor a menor peso', () => {
    const result = evaluateAreaCoverage(IPN_SOCADM);

    expect(result.pendingSubjectNames).toEqual([
      'Historia de México',
      'Geografía',
      'Historia Universal',
      'Civismo/Derecho',
    ]);
  });

  it('IPN FISMAT está lista y no tiene nada pendiente que anunciar', () => {
    const result = evaluateAreaCoverage(IPN_FISMAT);

    expect(result.status).toBe('READY');
    expect(result.coveredWeight).toBe(result.totalWeight);
    expect(result.pendingSubjectNames).toEqual([]);
    expect(isAreaSelectable(result.status)).toBe(true);
  });

  it('UNAM Área 1 SÍ se ofrece pese a Inglés en cero: 64 de 70 de peso (91%)', () => {
    const result = evaluateAreaCoverage(UNAM_AREA_1);

    expect(result.status).toBe('PARTIAL');
    expect(result.coveredWeight).toBe(64);
    expect(result.pendingSubjectNames).toEqual(['Inglés']);
    expect(isAreaSelectable(result.status)).toBe(true);
  });
});

describe('evaluateAreaCoverage — el área se habilita sola cuando llega el contenido', () => {
  /**
   * El requisito central de la fase: la guarda es DINÁMICA. Nadie edita una
   * lista; el mismo dato que el pipeline escribe en la base cambia el estado.
   * Aquí se simula exactamente eso — el lote que llena las 4 materias vacías de
   * IPN SOCADM — sobre la misma función, sin tocar un solo parámetro.
   */
  const lotePorMateria = (servable: number): SubjectCoverageInput[] =>
    IPN_SOCADM.map((s) => (s.servable === 0 ? { ...s, servable } : s));

  it('un lote de 35 reactivos en las 4 materias vacías la pone en READY', () => {
    const antes = evaluateAreaCoverage(IPN_SOCADM);
    const despues = evaluateAreaCoverage(lotePorMateria(35));

    // Las dos mitades se afirman por separado a propósito: un `antes && despues`
    // sería verde aunque una de las dos estuviera mal (defecto D6 de G71).
    expect(antes.status).toBe('COMING_SOON');
    expect(despues.status).toBe('READY');
    expect(despues.coveredWeight).toBe(25);
    expect(despues.pendingSubjectNames).toEqual([]);
  });

  it('un lote a medias (solo Historia de México) ya la saca de «Próximamente»', () => {
    // 8 + 6 = 14 de 25 = 56%. Sigue por debajo del 70%.
    const soloHistoria = IPN_SOCADM.map((s) =>
      s.subjectId === 'hmx' ? { ...s, servable: 35 } : s
    );
    const conGeografia = soloHistoria.map((s) =>
      s.subjectId === 'geo' ? { ...s, servable: 35 } : s
    );

    expect(evaluateAreaCoverage(soloHistoria).status).toBe('COMING_SOON');
    expect(evaluateAreaCoverage(soloHistoria).coveredWeight).toBe(14);

    // 14 + 4 = 18 de 25 = 72% → cruza el umbral y se ofrece con aviso.
    expect(evaluateAreaCoverage(conGeografia).status).toBe('PARTIAL');
    expect(evaluateAreaCoverage(conGeografia).coveredWeight).toBe(18);
    expect(evaluateAreaCoverage(conGeografia).pendingSubjectNames).toEqual([
      'Historia Universal',
      'Civismo/Derecho',
    ]);
  });

  it('quitar contenido vuelve a cerrar el área — la guarda no es de un solo sentido', () => {
    const vaciada = IPN_FISMAT.map((s) =>
      s.subjectId === 'mat' || s.subjectId === 'fis' ? { ...s, servable: 0 } : s
    );

    expect(evaluateAreaCoverage(IPN_FISMAT).status).toBe('READY');
    expect(evaluateAreaCoverage(vaciada).status).toBe('COMING_SOON');
    expect(evaluateAreaCoverage(vaciada).coveredWeight).toBe(16);
  });
});

describe('evaluateAreaCoverage — el umbral por materia es la cuota del diagnóstico', () => {
  /**
   * «≥1 reactivo» no basta: una materia con 2 reactivos no puede llenar su
   * parte del diagnóstico de 30, así que el alumno no queda medido en ella y
   * entra al predictor con el default pesimista.
   */
  it('una materia con menos reactivos que su cuota NO cuenta como cubierta', () => {
    const casiVacia = UNAM_AREA_1.map((s) =>
      s.subjectId === 'ing_a1' ? { ...s, servable: 2 } : s
    );
    const result = evaluateAreaCoverage(casiVacia);
    const ingles = result.subjects.find((s) => s.subjectId === 'ing_a1');

    expect(ingles?.required).toBe(3);
    expect(ingles?.covered).toBe(false);
    expect(result.pendingSubjectNames).toEqual(['Inglés']);
  });

  it('con exactamente su cuota, la materia sí cuenta y el área queda READY', () => {
    const justa = UNAM_AREA_1.map((s) => (s.subjectId === 'ing_a1' ? { ...s, servable: 3 } : s));
    const result = evaluateAreaCoverage(justa);

    expect(result.subjects.find((s) => s.subjectId === 'ing_a1')?.covered).toBe(true);
    expect(result.status).toBe('READY');
    expect(result.coveredWeight).toBe(70);
  });

  it('el umbral se mueve solo si cambia el tamaño del diagnóstico', () => {
    // Con un diagnóstico de 60 reactivos, Inglés (peso 6/70) necesita más.
    const con30 = evaluateAreaCoverage(UNAM_AREA_1, 30);
    const con60 = evaluateAreaCoverage(UNAM_AREA_1, 60);

    expect(con30.subjects.find((s) => s.subjectId === 'ing_a1')?.required).toBe(3);
    expect(con60.subjects.find((s) => s.subjectId === 'ing_a1')?.required).toBe(6);
  });

  it('el reparto usa TODAS las materias, no solo las pobladas', () => {
    // Si el umbral se calculara solo sobre las materias con contenido, una
    // materia sola en su área se declararía cubierta con 30 reactivos y el
    // área entera pasaría por READY.
    const unaSola: SubjectCoverageInput[] = [
      { subjectId: 'a', subjectName: 'Matemáticas', weight: 20, servable: 30 },
      { subjectId: 'b', subjectName: 'Física', weight: 20, servable: 0 },
      { subjectId: 'c', subjectName: 'Química', weight: 20, servable: 0 },
    ];
    const result = evaluateAreaCoverage(unaSola);

    expect(result.status).toBe('COMING_SOON');
    expect(result.coveredWeight).toBe(20);
    expect(result.subjects.find((s) => s.subjectId === 'a')?.required).toBe(10);
  });
});

describe('evaluateAreaCoverage — bordes', () => {
  it('un área sin materias sembradas es COMING_SOON, nunca READY por vacío', () => {
    const result = evaluateAreaCoverage([]);

    expect(result.status).toBe('COMING_SOON');
    expect(result.coveredRatio).toBe(0);
    expect(result.pendingSubjectNames).toEqual([]);
  });

  it('un área con materias de peso 0 no se declara lista por división cero', () => {
    const result = evaluateAreaCoverage([
      { subjectId: 'x', subjectName: 'Taller', weight: 0, servable: 0 },
    ]);

    expect(result.status).toBe('COMING_SOON');
    expect(Number.isFinite(result.coveredRatio)).toBe(true);
    expect(result.coveredRatio).toBe(0);
  });

  it('justo en el umbral (70%) el área SÍ se ofrece', () => {
    const enElLimite: SubjectCoverageInput[] = [
      { subjectId: 'a', subjectName: 'A', weight: 7, servable: 100 },
      { subjectId: 'b', subjectName: 'B', weight: 3, servable: 0 },
    ];
    const result = evaluateAreaCoverage(enElLimite);

    expect(result.coveredRatio).toBe(MIN_COVERED_WEIGHT_RATIO);
    expect(result.status).toBe('PARTIAL');
    expect(isAreaSelectable(result.status)).toBe(true);
  });

  it('un punto por debajo del umbral, no se ofrece', () => {
    const justoDebajo: SubjectCoverageInput[] = [
      { subjectId: 'a', subjectName: 'A', weight: 69, servable: 100 },
      { subjectId: 'b', subjectName: 'B', weight: 31, servable: 0 },
    ];
    const result = evaluateAreaCoverage(justoDebajo);

    expect(result.coveredRatio).toBeLessThan(MIN_COVERED_WEIGHT_RATIO);
    expect(result.status).toBe('COMING_SOON');
  });
});

describe('resolveEffectiveServable — el pool compartido de G26 cuenta', () => {
  /**
   * Sin esto, tres áreas de la UNAM que funcionan perfectamente se marcarían
   * como rotas: su fila `Subject` de Español tiene 0 reactivos propios y todo
   * su contenido vive en la fila del Área 1.
   */
  const censo = [
    { subjectId: 'esp_a1', subjectName: 'Español', areaId: 'a1', weight: 10, sharedContentKey: 'UNAM:ESPANOL', ownServable: 35 },
    { subjectId: 'esp_a3', subjectName: 'Español', areaId: 'a3', weight: 3, sharedContentKey: 'UNAM:ESPANOL', ownServable: 0 },
    { subjectId: 'ing_a1', subjectName: 'Inglés', areaId: 'a1', weight: 6, sharedContentKey: 'UNAM:INGLES', ownServable: 0 },
    { subjectId: 'ing_a3', subjectName: 'Inglés', areaId: 'a3', weight: 1, sharedContentKey: 'UNAM:INGLES', ownServable: 0 },
    { subjectId: 'mat_a1', subjectName: 'Matemáticas', areaId: 'a1', weight: 26, sharedContentKey: null, ownServable: 114 },
  ];

  it('una materia con 0 propios hereda el pool completo de su grupo', () => {
    const effective = resolveEffectiveServable(censo);

    expect(effective.get('esp_a3')).toBe(35);
    expect(effective.get('esp_a1')).toBe(35);
  });

  it('un grupo entero vacío sigue en cero — no se inventa contenido', () => {
    const effective = resolveEffectiveServable(censo);

    expect(effective.get('ing_a1')).toBe(0);
    expect(effective.get('ing_a3')).toBe(0);
  });

  it('una materia sin clave compartida cuenta solo lo suyo', () => {
    const effective = resolveEffectiveServable(censo);

    expect(effective.get('mat_a1')).toBe(114);
  });

  it('el área que hereda Español queda por encima del umbral gracias al pool', () => {
    const effective = resolveEffectiveServable(censo);
    const area3: SubjectCoverageInput[] = [
      { subjectId: 'esp_a3', subjectName: 'Español', weight: 3, servable: effective.get('esp_a3') ?? 0 },
      { subjectId: 'hmx_a3', subjectName: 'Historia de México', weight: 7, servable: 35 },
      { subjectId: 'ing_a3', subjectName: 'Inglés', weight: 1, servable: effective.get('ing_a3') ?? 0 },
    ];
    const result = evaluateAreaCoverage(area3);

    expect(result.coveredWeight).toBe(10);
    expect(result.status).toBe('PARTIAL');
    expect(result.pendingSubjectNames).toEqual(['Inglés']);
  });
});
