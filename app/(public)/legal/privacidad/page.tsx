import type { Metadata } from 'next';
import { PublicPageShell } from '@/components/marketing/PublicPageShell';

export const metadata: Metadata = {
  title: 'Aviso de privacidad — YaEntre',
  robots: { index: false, follow: true },
};

export default function PrivacidadPage() {
  return (
    <PublicPageShell>
      <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h1 className="font-display text-3xl font-bold text-text-primary">Aviso de privacidad</h1>
        <p className="mt-4 text-sm text-text-secondary italic">
          Última actualización: 26 de julio de 2026
        </p>

        <div className="prose prose-sm max-w-none space-y-6 text-text-secondary [&_h2]:mt-8 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-text-primary [&_li]:ml-4 [&_ul]:list-disc">
          {/* Responsable de datos */}
          <section>
            <h2>1. Responsable de tus datos</h2>
            <p>
              <strong className="text-text-primary">EDITAR ANTES DE PUBLICAR:</strong> Razón social exacta de la empresa, domicilio legal, correo y teléfono.
              {' '}
              <span className="inline-block bg-yellow-100 px-2 py-1 text-xs">
                PLACEHOLDER: YaEntre SAS de CV, Av. Ejemplo 123, México, CDMX | contacto@yaentre.com | +52 55 1234 5678
              </span>
            </p>
            <p>
              Nosotros somos el responsable del manejo de tus datos personales conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP).
            </p>
          </section>

          {/* Datos que recopilamos */}
          <section>
            <h2>2. Datos personales que recabamos</h2>
            <p>Recabamos y procesamos los siguientes datos:</p>
            <ul>
              <li>
                <strong>Datos de cuenta:</strong> correo electrónico, nombre y foto de perfil (opcional)
              </li>
              <li>
                <strong>Datos académicos:</strong> examen seleccionado (UNAM, IPN, UAM, CENEVAL), área de estudio, carrera meta, resultados de diagnóstico, progreso de sesiones de práctica y simulacros (respuestas, tiempo, aciertos/errores)
              </li>
              <li>
                <strong>Datos de pagos:</strong> plan contratado (Free, Pase Estacional, Mensual, Premium), estado de la suscripción y fechas de vigencia — <strong>NUNCA guardamos números de tarjeta, CVV ni contraseñas de Stripe;</strong> esos datos son procesados directamente por Stripe y no llegan a nuestros servidores
              </li>
              <li>
                <strong>Datos de menores de edad (si aplica):</strong> si eres menor de edad y un tutor se vincula a tu cuenta, el tutor podrá ver tu progreso académico (pero NO tus respuestas exactas ni tus datos de sesión crudos)
              </li>
              <li>
                <strong>Datos técnicos:</strong> dirección IP, tipo de navegador, idioma, zona horaria (para cálculos de racha en hora de México)
              </li>
              <li>
                <strong>Datos de cookies y analítica:</strong> si aceptas el consentimiento de cookies, recopilamos datos anónimos de comportamiento en PostHog (páginas vistas, eventos de registro, inicio de examen, completitud de sesiones)
              </li>
            </ul>
          </section>

          {/* Finalidades */}
          <section>
            <h2>3. Para qué usamos tus datos</h2>
            <ul>
              <li>Permitirte crear cuenta, acceder a la plataforma y usar el servicio</li>
              <li>Personalizar tu ruta de estudio (motor adaptativo: tema débiles, recomendaciones)</li>
              <li>Calcular tu Entrómetro (predicción de aciertos en el examen real)</li>
              <li>Procesar tus pagos y mantener tu suscripción activa (solo mediante Stripe)</li>
              <li>Verificar tu correo y garantizar la seguridad de tu cuenta</li>
              <li>Permitir que un tutor vea tu progreso (si has compartido tu código de vinculación)</li>
              <li>Enviarte correos transaccionales (confirmación de pago, resumen semanal, recordatorios) si lo permites</li>
              <li>Mejorar la plataforma: análisis de uso, detección de bugs, optimización de rendimiento (Sentry, PostHog)</li>
            </ul>
          </section>

          {/* Terceros */}
          <section>
            <h2>4. Terceros que reciben tus datos</h2>
            <p>Los siguientes proveedores externo procesan tus datos para que el servicio funcione:</p>
            <ul>
              <li>
                <strong>Supabase (PostgreSQL + Auth + Storage):</strong> aloja tu base de datos, gestiona tu autenticación y almacena tus fotos de perfil
              </li>
              <li>
                <strong>Stripe:</strong> procesa pagos con tarjeta, OXXO y SPEI — NO verá tu contraseña ni acceso de Supabase
              </li>
              <li>
                <strong>Vercel:</strong> hospeda la plataforma web
              </li>
              <li>
                <strong>Resend:</strong> envía correos electrónicos transaccionales (confirmación, resumen parental, avisos)
              </li>
              <li>
                <strong>PostHog:</strong> analítica de comportamiento (páginas vistas, eventos de usuario) — anónima, sin PII, contratada bajo DPA si la versión self-hosted es requerida
              </li>
              <li>
                <strong>Sentry:</strong> monitoreo de errores — contrato de confidencialidad en lugar
              </li>
            </ul>
            <p>
              <strong>Ninguno de estos proveedores venderá tus datos.</strong> Operamos bajo contratos de procesamiento de datos (DPA) con cada uno.
            </p>
          </section>

          {/* Derechos ARCO */}
          <section>
            <h2>5. Tus derechos (ARCO)</h2>
            <p>Conforme a la LFPDPPP, tienes derecho a:</p>
            <ul>
              <li>
                <strong>Acceso (A):</strong> descargar una copia de tus datos en formato JSON desde tu perfil ({`/app/perfil → "Exportar mis datos"`})
              </li>
              <li>
                <strong>Rectificación (R):</strong> corregir tu nombre, foto o email desde tu perfil ({`/app/perfil → "Editar perfil"`})
              </li>
              <li>
                <strong>Cancelación (C):</strong> eliminar tu cuenta (anonimiza tu perfil y borra todas tus sesiones y progreso) desde {`/app/perfil → "Eliminar mi cuenta"`}. <strong>Esto NO borra historial de pagos</strong> (por ley fiscal)
              </li>
              <li>
                <strong>Oposición (O):</strong> rechazar análisis de comportamiento desactivando PostHog en el aviso de cookies; rechazar correos de notificación desde {`/app/perfil → "Preferencias de notificación"`}
              </li>
            </ul>
            <p>
              Si no encuentras la opción que buscas, escríbenos a{' '}
              <a href="mailto:hola@yaentre.com" className="font-semibold text-brand hover:underline">
                hola@yaentre.com
              </a>{' '}
              con tu solicitud.
            </p>
          </section>

          {/* Cookies */}
          <section>
            <h2>6. Cookies y tecnologías similares</h2>
            <p>
              Usamos cookies <strong>técnicas</strong> (gestión de sesión en Supabase Auth) que son obligatorias para la plataforma funcione. Sin ellas, no podrías mantener tu sesión iniciada.
            </p>
            <p>
              Usamos cookies <strong>analíticas</strong> (PostHog) solo si aceptas el consentimiento en el banner que verás al entrar. Puedes cambiar tu elección en cualquier momento desde este aviso.
            </p>
          </section>

          {/* Menores de edad */}
          <section>
            <h2>7. Si eres menor de edad</h2>
            <p>
              Si tienes menos de 18 años, necesitamos el consentimiento de un tutor legal para procesar tus datos. Si eres mayor de 18, puedes crear tu cuenta directamente.
            </p>
            <p>
              Si un tutor te ha vinculado mediante código de vinculación, podrá ver tu progreso académico (aciertos, temas débiles, racha) pero <strong>NO</strong> tus respuestas exactas ni tu actividad crudas de sesión.
            </p>
          </section>

          {/* Retención */}
          <section>
            <h2>8. Tiempo que guardamos tus datos</h2>
            <ul>
              <li>Mientras tu cuenta esté activa: todos tus datos se guardan indefinidamente (tu historial es importante para el Entrómetro)</li>
              <li>Después de eliminar tu cuenta: se borran en 30 días, excepto historial de pagos (retención legal de 7 años)</li>
              <li>Si tu tutor se desvincula: sus permisos se revocan inmediatamente, pero sus registros de acceso quedan 90 días para auditoría</li>
            </ul>
          </section>

          {/* Cambios */}
          <section>
            <h2>9. Cambios a este aviso</h2>
            <p>
              Podemos actualizar este aviso en cualquier momento. Te notificaremos por correo si hay cambios significativos en cómo procesamos tus datos. Seguir usando YaEntre después del cambio significa que aceptas la versión nueva.
            </p>
          </section>

          {/* Contacto */}
          <section>
            <h2>10. Contacto</h2>
            <p>
              Si tienes preguntas sobre tus datos o deseas ejercer cualquiera de tus derechos ARCO:
            </p>
            <ul>
              <li>
                Correo:{' '}
                <a href="mailto:hola@yaentre.com" className="font-semibold text-brand hover:underline">
                  hola@yaentre.com
                </a>
              </li>
              <li>
                Dirección:{' '}
                <span className="inline-block bg-yellow-100 px-2 py-1 text-xs">
                  PLACEHOLDER: Av. Ejemplo 123, México, CDMX
                </span>
              </li>
            </ul>
          </section>
        </div>
      </article>
    </PublicPageShell>
  );
}
