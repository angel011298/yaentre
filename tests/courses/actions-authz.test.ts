import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * G103 — acciones de cursos llamadas DIRECTO (como un `fetch` a la Server
 * Action). Se mide por EFECTO: ¿se llegó a crear un Checkout, a firmar una URL
 * o a registrar un archivo? Con controles positivos.
 */

const calls: string[] = [];
const state = {
  enrolled: false,
  lessonAccess: true,
  ownerProfileId: 'cku_teacher',
  existingEnrollment: null as null | { status: string },
  sniffBytes: new Uint8Array([0, 0, 0, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d]),
};

vi.mock('@/lib/auth/guards', async () => {
  const { AuthError } = await import('@/lib/auth/errors');
  return {
    requireVerifiedForPurchase: vi.fn(async () => ({ authUser: { email: 'a@acierta-test.mx' }, profile: { id: 'cku_student' } })),
    requireUser: vi.fn(async () => ({ authUser: {}, profile: { id: 'cku_student', role: 'STUDENT' } })),
    AuthError,
  };
});

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

vi.mock('@/lib/rate-limit/store', () => ({ consumeRateLimit: vi.fn(async () => ({ allowed: true, hits: 1, retryAfterSecs: 0 })) }));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    course: {
      findFirst: vi.fn(async () => {
        calls.push('db.course');
        return { id: 'ckcourse0000000000000000a', slug: 'algebra', title: 'Álgebra', priceCents: 49_900, isFree: false, totalLessons: 3, teacher: { userProfileId: state.ownerProfileId } };
      }),
    },
    teacher: { update: vi.fn() },
  },
}));

vi.mock('@/lib/db/access-extension', () => ({ findKnownStripeCustomerId: vi.fn(async () => 'cus_1') }));

vi.mock('@/lib/db/courses', async () => {
  const actual = await vi.importActual<typeof import('@/lib/db/courses')>('@/lib/db/courses');
  return {
    CourseError: actual.CourseError,
    getEnrollment: vi.fn(async () => state.existingEnrollment),
    enrollFree: vi.fn(async () => calls.push('db.enrollFree')),
    lessonMediaAccess: vi.fn(async () => {
      calls.push('db.lessonAccess');
      return state.lessonAccess ? { id: 'ckles', videoPath: 'courses/ckcourse0000000000000000a/lessons/x.mp4', resourcePath: null } : null;
    }),
    saveLessonProgress: vi.fn(),
    rateCourse: vi.fn(),
    getTeacherCourse: vi.fn(async (_t: string, id: string) => ({ id, status: 'DRAFT', modules: [] })),
    lessonOfTeacher: vi.fn(async () => ({ id: 'ckles', type: 'VIDEO', module: { courseId: 'ckcourse0000000000000000a' } })),
    courseBytesUsed: vi.fn(async () => 0),
    setLessonMedia: vi.fn(async () => {
      calls.push('db.setLessonMedia');
      return null;
    }),
    setCourseMediaPath: vi.fn(async () => {
      calls.push('db.setCourseMedia');
      return null;
    }),
  };
});

vi.mock('@/lib/courses/storage', () => ({
  signedReadUrl: vi.fn(async () => {
    calls.push('storage.sign');
    return 'https://storage.test/signed';
  }),
  createUploadUrl: vi.fn(async () => ({ signedUrl: 'https://storage.test/upload', token: 't' })),
  inspectObject: vi.fn(async () => {
    calls.push('storage.inspect');
    return { head: state.sniffBytes, sizeBytes: 1_000_000 };
  }),
  removeObjects: vi.fn(async (paths: string[]) => {
    calls.push(`storage.remove:${paths.length}`);
  }),
}));

vi.mock('@/lib/teachers/guard', () => ({
  requireTeacher: vi.fn(async () => ({ profile: { id: 'cku_teacher' }, teacher: { id: 'ckteacher0000000000000001', status: 'ACTIVE', courseTermsAcceptedAt: new Date() } })),
}));

let checkoutParams: Record<string, unknown> | null = null;
vi.mock('@/lib/stripe/client', () => ({
  getStripe: () => ({
    customers: { create: async () => ({ id: 'cus_new' }) },
    checkout: {
      sessions: {
        create: async (p: Record<string, unknown>) => {
          calls.push('stripe.checkout');
          checkoutParams = p;
          return { id: 'cs_test_1', url: 'https://checkout.stripe.test/1' };
        },
      },
    },
  }),
}));

const { startCoursePurchaseAction, getLessonMediaUrlAction } = await import('@/app/actions/courses-student');
const { confirmCourseUploadAction } = await import('@/app/actions/courses-teacher');

const ENV = { ...process.env };
beforeEach(() => {
  calls.length = 0;
  checkoutParams = null;
  state.enrolled = false;
  state.lessonAccess = true;
  state.ownerProfileId = 'cku_teacher';
  state.existingEnrollment = null;
  state.sniffBytes = new Uint8Array([0, 0, 0, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d]);
  process.env.SALES_OPEN = 'true';
  process.env.VERCEL_ENV = 'preview';
  process.env.STRIPE_SECRET_KEY = 'sk_test_x';
  process.env.FEATURE_COURSES = 'true';
});
afterEach(() => {
  process.env = { ...ENV };
});

describe('compra de un curso', () => {
  it('venta cerrada → nada (ni base ni Stripe)', async () => {
    delete process.env.SALES_OPEN;
    expect(await startCoursePurchaseAction({ slug: 'algebra', acceptImmediateAccess: true })).toMatchObject({ code: 'SALES_CLOSED' });
    expect(calls).toEqual([]);
  });

  it('bandera apagada → NOT_FOUND', async () => {
    delete process.env.FEATURE_COURSES;
    expect(await startCoursePurchaseAction({ slug: 'algebra', acceptImmediateAccess: true })).toMatchObject({ code: 'NOT_FOUND' });
    expect(calls).toEqual([]);
  });

  it('sin la casilla del art. 56, o con campos de más (precio, referido) → rechazo sin Stripe', async () => {
    for (const raw of [
      { slug: 'algebra', acceptImmediateAccess: false },
      { slug: 'algebra', acceptImmediateAccess: true, priceCents: 1 },
      { slug: 'algebra', acceptImmediateAccess: true, referralCode: 'X' },
      { slug: 'algebra', acceptImmediateAccess: true, discountCode: 'EMB100' },
    ]) {
      calls.length = 0;
      expect((await startCoursePurchaseAction(raw)).ok, JSON.stringify(raw)).toBe(false);
      expect(calls).not.toContain('stripe.checkout');
    }
  });

  it('en producción, con el texto legal TODO-CLO, no se vende', async () => {
    process.env.VERCEL_ENV = 'production';
    process.env.STRIPE_SECRET_KEY = 'sk_live_x';
    expect(await startCoursePurchaseAction({ slug: 'algebra', acceptImmediateAccess: true })).toMatchObject({ code: 'LEGAL_PENDING' });
    expect(calls).not.toContain('stripe.checkout');
  });

  it('ya inscrito o curso propio → no se cobra otra vez', async () => {
    state.existingEnrollment = { status: 'ACTIVE' };
    expect(await startCoursePurchaseAction({ slug: 'algebra', acceptImmediateAccess: true })).toMatchObject({ code: 'ALREADY_ENROLLED' });
    state.existingEnrollment = null;
    state.ownerProfileId = 'cku_student';
    expect(await startCoursePurchaseAction({ slug: 'algebra', acceptImmediateAccess: true })).toMatchObject({ code: 'OWN_COURSE' });
    expect(calls).not.toContain('stripe.checkout');
  });

  it('control positivo: precio DE LA BASE, sin promociones, marca course_purchase', async () => {
    const r = await startCoursePurchaseAction({ slug: 'algebra', acceptImmediateAccess: true });
    expect(r.ok).toBe(true);
    const p = checkoutParams as { allow_promotion_codes: boolean; metadata: Record<string, string>; line_items: Array<{ price_data: { unit_amount: number } }> };
    expect(p.line_items[0].price_data.unit_amount).toBe(49_900);
    expect(p.allow_promotion_codes).toBe(false);
    expect(p.metadata).toMatchObject({ kind: 'course_purchase', courseId: 'ckcourse0000000000000000a', userProfileId: 'cku_student', expectedAmountCents: '49900' });
  });
});

describe('reproducción: la URL firmada SOLO tras verificar acceso', () => {
  it('sin inscripción → FORBIDDEN y nunca se firma nada', async () => {
    state.lessonAccess = false;
    const r = await getLessonMediaUrlAction({ lessonId: 'ckles00000000000000000001', kind: 'video' });
    expect(r).toMatchObject({ ok: false, code: 'FORBIDDEN' });
    expect(calls).not.toContain('storage.sign');
  });

  it('control positivo: con acceso se firma una URL de vida corta', async () => {
    const r = await getLessonMediaUrlAction({ lessonId: 'ckles00000000000000000001', kind: 'video' });
    expect(r).toMatchObject({ ok: true, data: { url: 'https://storage.test/signed', expiresInSecs: 3600 } });
  });
});

describe('confirmación de subida: ruta propia, firma real', () => {
  const base = { courseId: 'ckcourse0000000000000000a', lessonId: 'ckles00000000000000000001', kind: 'video' as const, durationSeconds: 600 };

  it('una ruta de OTRO curso se rechaza sin siquiera inspeccionarla', async () => {
    const r = await confirmCourseUploadAction({ ...base, path: 'courses/ckcourse0000000000000000b/lessons/0b6f1c2e-3d4a-4b5c-8d9e-0f1a2b3c4d5e.mp4' });
    expect(r.ok).toBe(false);
    expect(calls).not.toContain('storage.inspect');
  });

  it('un archivo cuyo contenido real no es video se BORRA y no se registra', async () => {
    state.sniffBytes = new TextEncoder().encode('<!doctype html><script>alert(1)</script>');
    const r = await confirmCourseUploadAction({ ...base, path: 'courses/ckcourse0000000000000000a/lessons/0b6f1c2e-3d4a-4b5c-8d9e-0f1a2b3c4d5e.mp4' });
    expect(r.ok).toBe(false);
    expect(calls).toContain('storage.remove:1');
    expect(calls).not.toContain('db.setLessonMedia');
  });

  it('control positivo: un MP4 real se registra', async () => {
    const r = await confirmCourseUploadAction({ ...base, path: 'courses/ckcourse0000000000000000a/lessons/0b6f1c2e-3d4a-4b5c-8d9e-0f1a2b3c4d5e.mp4' });
    expect(r.ok).toBe(true);
    expect(calls).toContain('db.setLessonMedia');
  });
});
