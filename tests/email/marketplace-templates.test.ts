import { describe, expect, it } from 'vitest';
import {
  classBookedTeacherEmail,
  classCancelledEmail,
  classLinkEmail,
  classUnconfirmedStudentEmail,
  confirmClassRequestEmail,
  escapeHtml,
  parentWeeklySummaryEmail,
  teacherApprovedEmail,
  teacherClabeChangedEmail,
  tutorConsentEmail,
  type EmailContent,
} from '@/lib/email/templates';

const EVIL = '<img src=x onerror=alert(1)><a href="https://evil.test">click</a>';

describe('escapeHtml', () => {
  it('escapa los cinco caracteres peligrosos', () => {
    expect(escapeHtml(`<a href="x">Tom & 'Jerry'</a>`)).toBe(
      '&lt;a href=&quot;x&quot;&gt;Tom &amp; &#39;Jerry&#39;&lt;/a&gt;'
    );
  });
  it('escapa & primero: no doble-escapa las entidades que él mismo produce', () => {
    expect(escapeHtml('<')).toBe('&lt;');
    expect(escapeHtml('&lt;')).toBe('&amp;lt;');
  });
});

describe('ningún dato de una persona se inyecta como HTML', () => {
  const cases: Array<[string, EmailContent]> = [
    ['tutorConsentEmail', tutorConsentEmail({ studentName: EVIL, confirmUrl: 'https://yaentre.com/confirmar-tutor?token=a"b' })],
    ['parentWeeklySummaryEmail', parentWeeklySummaryEmail({ studentName: EVIL, currentStreak: 1, predictedScore: null, weekDelta: null, recentSimulations: [], unsubscribeUrl: 'https://x.test' })],
    ['teacherApprovedEmail', teacherApprovedEmail({ publicName: EVIL, dashboardUrl: 'https://yaentre.com/profesor' })],
    ['teacherClabeChangedEmail', teacherClabeChangedEmail({ bankName: EVIL, clabeMasked: EVIL })],
    ['classBookedTeacherEmail', classBookedTeacherEmail({ studentLabel: EVIL, subjectLabel: EVIL, whenLabel: EVIL, durationMinutes: 50, dashboardUrl: 'https://yaentre.com/profesor' })],
    ['confirmClassRequestEmail', confirmClassRequestEmail({ studentLabel: EVIL, subjectLabel: EVIL, whenLabel: EVIL, dashboardUrl: 'https://yaentre.com/profesor' })],
    ['classUnconfirmedStudentEmail', classUnconfirmedStudentEmail({ teacherName: EVIL, subjectLabel: EVIL, whenLabel: EVIL })],
    ['classCancelledEmail', classCancelledEmail({ audience: 'student', subjectLabel: EVIL, whenLabel: EVIL, by: 'TEACHER', refundCents: 10000 })],
    ['classLinkEmail', classLinkEmail({ audience: 'student', counterpartName: EVIL, subjectLabel: EVIL, whenLabel: EVIL, meetingUrl: 'https://meet.google.com/a"><script>', recordingNotice: EVIL })],
  ];

  it.each(cases)('%s escapa el contenido hostil', (_name, email) => {
    // Ninguna etiqueta REAL de la carga hostil llega al HTML del correo…
    expect(email.html).not.toContain('<img');
    expect(email.html).not.toContain('<script');
    expect(email.html).not.toContain('href="https://evil.test"');
    // …pero la carga SÍ está, convertida en texto inofensivo: el correo no se
    // «limpió» borrando el dato, se escapó (y esto demuestra que el caso hostil
    // de verdad llegó a la plantilla, así que el verde de arriba comprueba algo).
    expect(email.html).toContain('&lt;img');
  });
});

describe('guardrails de lenguaje (contexto maestro §8, spec §13)', () => {
  const all: EmailContent[] = [
    teacherApprovedEmail({ publicName: 'Juan P.', dashboardUrl: 'https://yaentre.com/profesor' }),
    teacherClabeChangedEmail({ bankName: 'BBVA', clabeMasked: '****7771' }),
    classBookedTeacherEmail({ studentLabel: 'Ana', subjectLabel: 'Matemáticas', whenLabel: 'lunes 5 de octubre, 17:00', durationMinutes: 50, dashboardUrl: 'https://yaentre.com/profesor' }),
    confirmClassRequestEmail({ studentLabel: 'Ana', subjectLabel: 'Matemáticas', whenLabel: 'lunes 5 de octubre, 17:00', dashboardUrl: 'https://yaentre.com/profesor' }),
    classUnconfirmedStudentEmail({ teacherName: 'Juan P.', subjectLabel: 'Matemáticas', whenLabel: 'lunes 5 de octubre, 17:00' }),
    classCancelledEmail({ audience: 'student', subjectLabel: 'Matemáticas', whenLabel: 'lunes 5 de octubre, 17:00', by: 'SYSTEM', refundCents: 30000 }),
    classCancelledEmail({ audience: 'teacher', subjectLabel: 'Matemáticas', whenLabel: 'lunes 5 de octubre, 17:00', by: 'STUDENT', refundCents: 0 }),
    classLinkEmail({ audience: 'teacher', counterpartName: 'Ana', subjectLabel: 'Matemáticas', whenLabel: 'lunes 5 de octubre, 17:00', meetingUrl: 'https://meet.google.com/abc-defg-hij', recordingNotice: null }),
  ];

  it('nunca dice «garantía», «nuestros profesores», «equipo docente», «próximamente» ni habla de sueldo o nómina', () => {
    for (const email of all) {
      const text = `${email.subject} ${email.html}`;
      expect(text).not.toMatch(/garant[ií]a/i);
      expect(text).not.toMatch(/nuestros profesores|equipo docente/i);
      expect(text).not.toMatch(/próximamente/i);
      expect(text).not.toMatch(/\b(sueldo|salario|n[oó]mina|honorarios)\b/i);
    }
  });

  it('el pago al profesor se llama «liquidación de comisión mercantil»', () => {
    expect(teacherClabeChangedEmail({ bankName: 'BBVA', clabeMasked: '****7771' }).html).toContain('liquidaciones de comisión mercantil');
  });

  it('la bienvenida usa el lenguaje obligatorio', () => {
    expect(teacherApprovedEmail({ publicName: 'Juan P.', dashboardUrl: 'https://yaentre.com/profesor' }).html).toContain(
      'profesor independiente verificado en YaEntre'
    );
  });
});

describe('contenido', () => {
  it('la cancelación por el profesor informa el reembolso al alumno con el monto', () => {
    const html = classCancelledEmail({ audience: 'student', subjectLabel: 'Física', whenLabel: 'x', by: 'TEACHER', refundCents: 45000 }).html;
    expect(html).toContain('$450 MXN');
  });

  it('una cancelación sin reembolso lo dice, y al profesor no se le habla de reembolsos', () => {
    expect(classCancelledEmail({ audience: 'student', subjectLabel: 'Física', whenLabel: 'x', by: 'STUDENT', refundCents: 0 }).html).toContain('no genera reembolso');
    expect(classCancelledEmail({ audience: 'teacher', subjectLabel: 'Física', whenLabel: 'x', by: 'STUDENT', refundCents: 15000 }).html).not.toContain('reembols');
  });

  it('el correo del enlace incluye el aviso de grabación solo cuando aplica', () => {
    const base = { audience: 'student' as const, counterpartName: 'Juan', subjectLabel: 'Física', whenLabel: 'x', meetingUrl: 'https://meet.google.com/a' };
    expect(classLinkEmail({ ...base, recordingNotice: 'Esta clase se grabará.' }).html).toContain('Esta clase se grabará.');
    expect(classLinkEmail({ ...base, recordingNotice: null }).html).not.toContain('grabará');
  });
});
