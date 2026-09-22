import * as Sentry from '@sentry/nextjs';

/**
 * G73b — REPORTE DE FALLOS QUE NO INTERRUMPEN.
 *
 * ── Por qué existe este módulo ──────────────────────────────────────────────
 *
 * G73 encontró que el limitador de tasa distribuido de G65 —la defensa contra
 * fuerza bruta en login, recuperación de contraseña y el canje del código de
 * vinculación de un MENOR— llevaba meses inerte en producción. La causa
 * inmediata fue un privilegio faltante (`42501`). La causa REAL de que
 * sobreviviera a las auditorías G65, G66, G67, G71 y G72 fue otra:
 *
 *   `consumeRateLimit` atrapaba el error, escribía `console.error` y devolvía
 *   `allowed: true`. Nadie lee los logs de una función de Vercel que responde
 *   HTTP 200. El control fallaba, el producto seguía funcionando, y el único
 *   testigo era una línea de log que nadie iba a mirar jamás.
 *
 * Fallar abierto suele ser la decisión CORRECTA (una base caída no debe
 * convertir un login legítimo en un 500). Fallar en SILENCIO nunca lo es.
 *
 * Este módulo es la diferencia entre las dos cosas: la operación continúa,
 * pero el fallo del control produce un evento visible en Sentry, con la
 * etiqueta y la huella necesarias para que aparezca como una alerta propia y
 * no se mezcle con el ruido de la aplicación.
 *
 * ── Contrato ────────────────────────────────────────────────────────────────
 *
 *  · Nunca lanza. Un fallo del reportador no puede tumbar lo que reporta.
 *  · Nunca cambia el flujo. Quien llama decide si sigue o se detiene.
 *  · Siempre escribe también en consola: si Sentry está caído o sin DSN, la
 *    evidencia local no se pierde.
 *  · No pone datos personales en el evento. Los `context` que se le pasan son
 *    identificadores internos (scope del límite, id de perfil, id de sesión),
 *    nunca correos, contraseñas ni contenido de reactivos.
 */

/**
 * Controles cuyo fallo tiene que ser visible. Enum cerrado a propósito: una
 * cadena libre se convierte en veinte variantes que ninguna alerta agrupa.
 */
export type ControlName =
  /** Límite de tasa distribuido (`app_security.rate_limit_hits`). El caso de G73. */
  | 'rate_limit'
  /** Barrido de ventanas vencidas del limitador. */
  | 'rate_limit_sweep'
  /** Resolución de la IP del cliente para atribuir el límite. */
  | 'client_ip'
  /** Validación de la sesión contra el proveedor de Auth. */
  | 'auth_session'
  /** Borrado de la identidad en Auth al eliminar la cuenta (LFPDPPP). */
  | 'account_deletion'
  /** Puntuación de una respuesta del simulador. */
  | 'simulator_scoring'
  /** Coherencia entre el cobro en Stripe y la Subscription local. */
  | 'payment_consistency'
  /** Firma HMAC del enlace de baja de correo cayendo a la clave de respaldo. */
  | 'unsubscribe_signature'
  /**
   * G98 — interruptor de ventas. Se dispara cuando `SALES_OPEN=true` en
   * PRODUCCIÓN con una llave de Stripe que NO es de modo real: alguien creyó
   * que abría la caja y el dinero no entraría a ninguna parte. La venta queda
   * cerrada (`fail-closed`), pero el silencio sería justo el defecto de G73.
   */
  | 'sales_gate'
  /**
   * G98 — un webhook de Stripe llegó con un `livemode` que NO corresponde al
   * modo de la llave con la que se verificó su firma. En producción no se
   * activa nada: o alguien apuntó un endpoint de prueba al webhook real, o
   * quedó un endpoint del modo anterior vivo tras el cambio de llaves.
   */
  | 'stripe_livemode'
  /**
   * G99 — compuerta de admin maestro. Se dispara cuando `MASTER_ADMIN_EMAILS`
   * está ausente o vacía: TODA acción destructiva del panel queda bloqueada
   * (`fail-closed`, que es lo correcto), pero desde la interfaz ese bloqueo es
   * indistinguible de "este admin no es maestro". Sin el evento, el dueño
   * puede pasar semanas creyendo que el panel está mal cuando lo que falta es
   * una variable de entorno.
   */
  | 'master_admin_gate'
  /**
   * G99 — bóveda de archivos del administrador: la subida, la lectura o el
   * borrado del objeto en Storage falló. Un archivo que la bitácora da por
   * subido y el bucket no tiene es una pérdida silenciosa de material que el
   * dueño cree guardado.
   */
  | 'admin_vault_storage'
  /** Persistencia de la preferencia de baja de correo. */
  | 'unsubscribe_write';

/**
 * Áreas cuya degradación silenciosa devuelve un éxito aparente. No son
 * controles de seguridad, pero comparten la firma que hizo indetectable el
 * defecto de G73: el llamador no puede distinguir "no había nada que hacer"
 * de "reventó".
 */
export type DegradationArea =
  /** `sendEmail` degradando a log — el caso nombrado en el encargo. */
  | 'email'
  /** Resolución de destinatarios de los correos programados. */
  | 'email_recipients'
  /** Selección adaptativa cayendo al respaldo aleatorio. */
  | 'adaptive_selection'
  /** Recálculo del perfil de aprendizaje / rachas / temas débiles. */
  | 'adaptive_recompute'
  /** Resolución de la temporada de precios (afecta cuánto se cobra). */
  | 'pricing_season'
  /** Cupo de licencias Early Bird. */
  | 'pricing_early_bird'
  /** Lectura del estado de la suscripción en Stripe. */
  | 'billing_status'
  /** Comprobante de pago (OXXO/SPEI). */
  | 'billing_voucher'
  /** Celebraciones de gamificación. */
  | 'gamification'
  /** Envío de eventos de producto a PostHog. */
  | 'analytics'
  /** Un job del cron diario que terminó rechazado. */
  | 'scheduled_job'
  /**
   * G99 — la escritura en `admin_audit_log` falló. La acción de
   * administración ya se aplicó y no se revierte por esto, pero significa que
   * hay operaciones sobre cuentas de menores ocurriendo SIN rastro: justo el
   * agujero que la tabla vino a tapar.
   */
  | 'admin_audit';

type Context = Record<string, unknown>;

function toError(err: unknown, fallbackMessage: string): Error {
  if (err instanceof Error) return err;
  const e = new Error(`${fallbackMessage}: ${String(err)}`);
  e.name = 'NonError';
  return e;
}

function emit(
  kind: 'control_failure' | 'silent_degradation',
  name: string,
  level: 'error' | 'warning',
  err: unknown,
  context: Context
): void {
  // La consola primero y siempre: es la única evidencia que sobrevive a que
  // Sentry no esté configurado (o esté caído justo cuando hace falta).
  const line = `[${kind}] ${name}`;
  if (level === 'error') console.error(line, { ...context, err });
  else console.warn(line, { ...context, err });

  try {
    Sentry.withScope((scope) => {
      scope.setLevel(level);
      scope.setTag(kind, name);
      // Una huella explícita: todos los fallos del MISMO control se agrupan en
      // un solo issue, en vez de dispersarse por el mensaje del driver de
      // Postgres (que cambia con el sujeto, el bucket y la conexión).
      scope.setFingerprint([kind, name]);
      scope.setContext(kind, { name, ...context });
      Sentry.captureException(toError(err, line));
    });
  } catch {
    // Un fallo del reportador no puede propagarse a lo que estaba reportando.
  }
}

/**
 * Un CONTROL DE SEGURIDAD falló y la aplicación no se detuvo por ello.
 *
 * `outcome` documenta qué se decidió, y es obligatorio: obliga a quien escribe
 * el `catch` a nombrar en voz alta si el control quedó abierto o cerrado.
 *   · `'fail-open'`  — la operación continuó SIN la protección.
 *   · `'fail-closed'` — la operación se denegó por seguridad.
 *   · `'degraded'`   — la protección siguió, pero con menos precisión.
 */
export function reportControlFailure(
  control: ControlName,
  outcome: 'fail-open' | 'fail-closed' | 'degraded',
  err: unknown,
  context: Context = {}
): void {
  emit('control_failure', control, 'error', err, { outcome, ...context });
}

/**
 * Una función degradó a un camino de respaldo y devolvió éxito aparente.
 * Nivel `warning`: no es una brecha, pero es exactamente el modo de fallo que
 * mantuvo rotos los 3 correos programados desde G59 hasta G73 sin que ninguna
 * señal lo delatara.
 */
export function reportSilentDegradation(
  area: DegradationArea,
  err: unknown,
  context: Context = {}
): void {
  emit('silent_degradation', area, 'warning', err, context);
}
