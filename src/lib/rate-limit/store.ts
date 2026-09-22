import 'server-only';
import { prisma } from '@/lib/db/prisma';
import { reportControlFailure } from '@/lib/observability/report';

/**
 * Límite de tasa DISTRIBUIDO (G65). Sustituye —para los puntos sensibles— al
 * contador en memoria de `src/lib/rate-limit/limiter.ts`, que sigue vivo en
 * `proxy.ts` como primera línea barata pero NO acumula entre instancias.
 *
 * La evidencia que obligó a esto: en producción, 70 peticiones seguidas a
 * `/api/adaptive/predict` no recibieron un solo 429 con el límite nominal en
 * 60/min. Cada petición aterriza en una instancia Edge distinta y cada una
 * empieza a contar desde cero. Un límite que no cuenta no es un límite.
 *
 * El almacén es Postgres (`app_security.rate_limit_hits`, migración 0013) —
 * la única infraestructura compartida que el proyecto ya paga. Se accede por
 * `$queryRaw` porque la tabla vive FUERA de `prisma/schema.prisma` a propósito
 * (guardrail de CLAUDE.md; ver la nota de la migración).
 *
 * Coste: UNA operación de Prisma por intento, y solo en las acciones
 * sensibles (autenticación, canje del código parental, reporte de reactivo).
 * Ninguna de ellas está en un camino caliente.
 */

export interface RateLimitVerdict {
  allowed: boolean;
  /** Intentos consumidos dentro de la ventana actual. */
  hits: number;
  /** Segundos que faltan para que la ventana expire (0 si `allowed`). */
  retryAfterSecs: number;
}

/** Presupuestos por punto sensible. Nombres explícitos > números sueltos. */
export const RATE_LIMITS = {
  /** Login: 8 intentos por ventana de 10 min. Un humano que olvidó su
   *  contraseña no llega a 8; un script de fuerza bruta muere en el 9º. */
  SIGN_IN: { limit: 8, windowSecs: 600 },
  /** Registro: 5 cuentas por IP y hora — frena el registro masivo sin
   *  estorbar a una familia o un cibercafé escolar compartiendo salida. */
  SIGN_UP: { limit: 5, windowSecs: 3600 },
  /** Recuperación de contraseña: 4 correos por hora (por IP y por cuenta).
   *  Sin esto, el enlace de recuperación es un cañón de correo hacia la
   *  bandeja de cualquier usuario cuyo correo se conozca. */
  PASSWORD_RESET: { limit: 4, windowSecs: 3600 },
  /** Cambio de contraseña con sesión abierta. */
  PASSWORD_CHANGE: { limit: 6, windowSecs: 3600 },
  /** Reenvío del correo de verificación. */
  RESEND_VERIFICATION: { limit: 4, windowSecs: 3600 },
  /**
   * Canje del código de vinculación parental. EL MÁS IMPORTANTE: el código es
   * de 6 dígitos y vive 10 minutos, así que sin límite un script puede barrer
   * una fracción enorme del millón de combinaciones dentro de la vigencia y
   * quedarse con el tablero de un MENOR. Con 6 intentos por 10 min y por
   * tutor, y 20 por IP, la probabilidad por ventana cae a lo despreciable.
   */
  PARENT_LINK_REDEEM: { limit: 6, windowSecs: 600 },
  PARENT_LINK_REDEEM_IP: { limit: 20, windowSecs: 600 },
  /** Generación del código por parte del alumno (evita rotarlo sin fin). */
  PARENT_LINK_GENERATE: { limit: 10, windowSecs: 600 },
  /** Reporte de reactivos: 20 por hora y alumno. */
  QUESTION_REPORT: { limit: 20, windowSecs: 3600 },
  /** Exportación de datos personales: consulta cara, 5 por hora. */
  ACCOUNT_EXPORT: { limit: 5, windowSecs: 3600 },
  /** Baja de correo (ruta pública, firmada): 30 por hora e IP. */
  UNSUBSCRIBE: { limit: 30, windowSecs: 3600 },
  /** Endpoints del motor adaptativo: 60 por minuto y alumno. */
  ADAPTIVE: { limit: 60, windowSecs: 60 },
  /**
   * G67 — reactivos devueltos por `/api/adaptive/next-questions` en 24h, por
   * alumno. Ese endpoint no crea sesión ni persiste nada (no es el camino que
   * usa la UI real, F14 sigue pasando por `startDrillSession`), así que el
   * candado de "10 reactivos diarios" del muro suave —basado en filas de
   * `SessionAnswer`— no ve nada que contar aquí: se puede llamar sin límite y
   * cada vez trae ids frescos del pool, sin tocar nunca el conteo de la capa
   * DB. Se consume con PESO = cantidad de ids devueltos (`consumeRateLimit`
   * con `weight`), para que el total del día cuadre con el mismo presupuesto
   * de 10 que ve el resto del muro suave, aunque la cuenta viva aparte.
   */
  ADAPTIVE_CONTENT_DAILY: { limit: 10, windowSecs: 86_400 },
  /**
   * G67 — arranque de un simulacro completo: la exposición de contenido más
   * grande de la app en una sola llamada (~120-140 reactivos con enunciado y
   * opciones completos, de una vez). Por CUENTA: generoso (nadie legítimo
   * arranca+abandona+reintenta un simulacro completo 20 veces en una hora).
   * Por IP: el candado real contra una granja de cuentas gratuitas desde la
   * misma salida — un laboratorio de cómputo o una familia compartiendo wifi
   * cabe holgado en 8/día; un script creando cuentas desechables para cosechar
   * el banco, no. Ver docs/AUDITORIA_SEGURIDAD.md §17.4 (riesgo residual: no
   * cubre un atacante con muchas IPs distintas).
   */
  SIMULATION_START: { limit: 20, windowSecs: 3600 },
  SIMULATION_START_IP: { limit: 8, windowSecs: 86_400 },
  /** Arranque de práctica libre: defensa en profundidad — el candado real es
   *  el conteo de reactivos SERVIDOS hoy (`countDrillQuestionsServedToday`),
   *  esto solo evita machacar el endpoint con reintentos vacíos. */
  DRILL_START: { limit: 20, windowSecs: 3600 },
  /** Arranque del diagnóstico inicial: en el flujo normal corre UNA vez
   *  (`profile.diagnosticDone` lo bloquea para siempre tras terminarlo); esto
   *  acota el ciclo abandonar-y-esperar-24h a unos pocos intentos por día en
   *  vez de dejarlo indefinido. */
  DIAGNOSTIC_START: { limit: 5, windowSecs: 86_400 },
  /** G74 — «avísame cuando abra esta área»: un puñado por hora y alumno basta
   *  para un onboarding real; evita que un clic repetido infle la lista. */
  AREA_WAITLIST: { limit: 10, windowSecs: 3600 },
  /**
   * G98 — «avísame cuando abra la preventa» (/paywall). Escribe una fila de
   * consentimiento de MARKETING, así que es una escritura por clic: 10 por
   * hora y alumno cubre de sobra a quien duda y vuelve, y corta el machaque.
   * Va contra el contador COMPARTIDO de Postgres, no contra el de memoria: el
   * de memoria no cuenta entre instancias de Vercel (G65 §5).
   */
  SALES_WAITLIST: { limit: 10, windowSecs: 3600 },
  /**
   * G99 — acciones de administración sobre una CUENTA (cortesía, baja de
   * plan, forzar restablecimiento, cerrar sesiones, cambiar rol), por admin.
   * 60 por hora es holgadísimo para trabajo manual real —nadie administra 60
   * cuentas a mano en una hora— y acota el daño si la sesión de un admin se
   * ve comprometida: no convierte el panel en una herramienta de cambio
   * masivo de roles o de emisión masiva de correos de recuperación.
   */
  ADMIN_USER_ACTION: { limit: 60, windowSecs: 3600 },
  /**
   * G99 — forzar el correo de recuperación, POR CUENTA OBJETIVO. Presupuesto
   * aparte y mucho más estrecho que el del admin: el correo llega a la bandeja
   * de OTRA persona, así que el límite tiene que colgar de quien lo recibe, no
   * de quien lo dispara. Mismo criterio que `PASSWORD_RESET`.
   */
  ADMIN_PASSWORD_RESET_TARGET: { limit: 4, windowSecs: 3600 },
  /**
   * G99 — subida de archivos a la bóveda. El tope real es el tamaño (40 MB
   * por archivo) y el 1 GB del plan gratuito de Supabase; esto solo evita
   * que un bucle accidental agote la cuota de almacenamiento de golpe.
   */
  ADMIN_VAULT_UPLOAD: { limit: 40, windowSecs: 3600 },
  /**
   * G99 — lectura/descarga de un archivo de la bóveda. Generoso (ver un PDF
   * de varias páginas puede disparar varias peticiones de rango), pero acota
   * la exfiltración masiva si una sesión de admin se ve comprometida.
   */
  ADMIN_VAULT_READ: { limit: 300, windowSecs: 3600 },
} as const;

export type RateLimitName = keyof typeof RATE_LIMITS;

interface HitRow {
  hits: number;
  expires_at: Date;
}

/** 1 de cada N llamadas barre las ventanas ya vencidas. */
const CLEANUP_SAMPLE = 50;

/**
 * Reclama un intento de forma ATÓMICA. Un solo statement: sin leer-luego-
 * escribir, así que dos lambdas concurrentes no pueden ver ambas "0 usos".
 *
 * `scope` identifica el punto sensible; `subject` a quién se le cuenta (una
 * IP, un correo normalizado, un `userProfileId`). Nunca se guarda el valor
 * crudo del sujeto sin más contexto que la propia llave.
 *
 * `weight` (G67, default 1): cuántas unidades consume ESTA llamada. Sirve
 * para presupuestos que no son "una llamada = un uso" — `/api/adaptive/
 * next-questions` puede devolver hasta 10 reactivos en una sola respuesta, así
 * que consume `weight = cantidad devuelta` contra `ADAPTIVE_CONTENT_DAILY`
 * en vez de contar la llamada como una unidad sin importar cuánto contenido
 * trajo.
 */
export async function consumeRateLimit(
  scope: RateLimitName,
  subject: string,
  weight = 1
): Promise<RateLimitVerdict> {
  const { limit, windowSecs } = RATE_LIMITS[scope];
  const key = `${scope}:${subject}`;

  let row: HitRow | undefined;
  try {
    const rows = await prisma.$queryRaw<HitRow[]>`
      INSERT INTO app_security.rate_limit_hits AS r
        (bucket_key, hits, window_started_at, expires_at)
      VALUES (${key}, ${weight}, now(), now() + make_interval(secs => ${windowSecs}::double precision))
      ON CONFLICT (bucket_key) DO UPDATE SET
        hits = CASE WHEN r.expires_at <= now() THEN ${weight} ELSE r.hits + ${weight} END,
        window_started_at = CASE WHEN r.expires_at <= now() THEN now() ELSE r.window_started_at END,
        expires_at = CASE
          WHEN r.expires_at <= now()
            THEN now() + make_interval(secs => ${windowSecs}::double precision)
          ELSE r.expires_at
        END
      RETURNING r.hits, r.expires_at
    `;
    row = rows[0];
  } catch (err) {
    // ── G73b: SIGUE FALLANDO ABIERTO, PERO YA NO EN SILENCIO ────────────────
    //
    // La decisión de fallar abierto se conserva a propósito: una base caída no
    // debe convertir el login de un alumno legítimo en un 500 la víspera de su
    // examen. El límite es una capa de defensa, no el guard de autenticación.
    //
    // Lo que cambia es que ahora el fallo GRITA. Durante meses este mismo
    // `catch` se tragó un `42501 permission denied` en CADA intento de login,
    // recuperación y canje de código parental en producción —el rol real es
    // `acierta_prod` y la migración 0013 solo concedió a `acierta_ci`— y el
    // único testigo era un `console.error` en una función que respondía 200.
    // Un solo evento en Sentry lo habría delatado el primer día.
    reportControlFailure('rate_limit', 'fail-open', err, { scope, limit, weight });
    return { allowed: true, hits: 0, retryAfterSecs: 0 };
  }

  if (!row) {
    // `RETURNING` sin filas sobre un `INSERT … ON CONFLICT DO UPDATE` no puede
    // pasar: si pasa, el contador no contó y el intento quedó sin cobrar.
    reportControlFailure('rate_limit', 'fail-open', new Error('RETURNING sin filas'), {
      scope,
      limit,
    });
    return { allowed: true, hits: 0, retryAfterSecs: 0 };
  }

  if (Math.floor(Math.random() * CLEANUP_SAMPLE) === 0) {
    void sweepExpired();
  }

  const allowed = row.hits <= limit;
  const retryAfterSecs = allowed
    ? 0
    : Math.max(1, Math.ceil((row.expires_at.getTime() - Date.now()) / 1000));

  return { allowed, hits: row.hits, retryAfterSecs };
}

/**
 * Aplica varios presupuestos a la vez (p. ej. por cuenta Y por IP) y devuelve
 * el primero que bloquee. Todos se consumen: un atacante no puede agotar el
 * cupo de IP sin que también cuente contra la cuenta que ataca.
 */
export async function consumeAll(
  entries: Array<[RateLimitName, string]>
): Promise<RateLimitVerdict> {
  const verdicts = await Promise.all(entries.map(([scope, subject]) => consumeRateLimit(scope, subject)));
  const blocked = verdicts.find((v) => !v.allowed);
  return blocked ?? { allowed: true, hits: 0, retryAfterSecs: 0 };
}

async function sweepExpired(): Promise<void> {
  try {
    await prisma.$executeRaw`
      DELETE FROM app_security.rate_limit_hits
       WHERE expires_at < now() - interval '1 hour'
    `;
  } catch (err) {
    // Barrido oportunista: si falla, la siguiente llamada lo reintenta — pero
    // un fallo PERSISTENTE aquí significa que la tabla del limitador crece sin
    // límite, así que tampoco se calla (G73b).
    reportControlFailure('rate_limit_sweep', 'degraded', err);
  }
}

/** Solo para pruebas / operación: borra el contador de un sujeto. */
export async function resetRateLimit(scope: RateLimitName, subject: string): Promise<void> {
  await prisma.$executeRaw`
    DELETE FROM app_security.rate_limit_hits WHERE bucket_key = ${`${scope}:${subject}`}
  `;
}
