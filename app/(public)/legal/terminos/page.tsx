import type { Metadata } from 'next';
import { PublicPageShell } from '@/components/marketing/PublicPageShell';

export const metadata: Metadata = {
  title: 'Términos y condiciones — YaEntre',
  robots: { index: false, follow: true },
};

export default function TerminosPage() {
  return (
    <PublicPageShell>
      <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h1 className="font-display text-3xl font-bold text-text-primary">Términos y condiciones</h1>
        <p className="mt-4 text-sm text-text-secondary italic">
          Última actualización: 26 de julio de 2026
        </p>

        <div className="prose prose-sm max-w-none space-y-6 text-text-secondary [&_h2]:mt-8 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-text-primary [&_li]:ml-4 [&_ul]:list-disc">
          {/* Aceptación */}
          <section>
            <h2>1. Aceptación de estos términos</h2>
            <p>
              Al crear tu cuenta y usar YaEntre, aceptas estos términos y condiciones en su totalidad. Si no estás de acuerdo, no puedes usar la plataforma. Nos reservamos el derecho de cambiar estos términos en cualquier momento; los cambios entrarán en vigor cuando se publiquen aquí.
            </p>
          </section>

          {/* Descripción del servicio */}
          <section>
            <h2>2. Descripción del servicio</h2>
            <p>
              YaEntre es una plataforma web y PWA (aplicación web progresiva) diseñada para <strong>preparación autogestionable</strong> para exámenes de admisión en línea de la UNAM, IPN, UAM y CENEVAL (EXANI II).
            </p>
            <p>El servicio incluye:</p>
            <ul>
              <li>Diagnóstico inicial (30 reactivos)</li>
              <li>Motor adaptativo que personaliza tu ruta según tus fortalezas y debilidades</li>
              <li>Simulacros completos (120 o 140 reactivos según institución)</li>
              <li>Ejercicios de práctica diaria en temas específicos</li>
              <li>Entrómetro (predicción de aciertos en el examen real)</li>
              <li>Explicaciones de reactivos en hasta 4 capas de profundidad</li>
              <li>Panel parental (para tutores: ver progreso del alumno)</li>
            </ul>
            <p>
              <strong>Nota: YaEntre NO es un curso con profesor ni clases en vivo en esta versión.</strong> Es una herramienta de autoaprendizaje.
            </p>
          </section>

          {/* Planes y vigencia */}
          <section>
            <h2>3. Planes y vigencia</h2>
            <p>Ofrecemos los siguientes planes:</p>
            <ul>
              <li>
                <strong>Free (gratuito):</strong> 1 simulacro completo + 10 reactivos de práctica al día. Válido indefinidamente mientras uses la plataforma.
              </li>
              <li>
                <strong>Pase Estacional:</strong> acceso ilimitado hasta la fecha de tu examen objetivo. Vigencia: desde la compra hasta el día del examen (máximo 150 días si no especificas fecha).
              </li>
              <li>
                <strong>Mensual:</strong> suscripción recurrente que se renueva cada mes. Puedes cancelar en cualquier momento; tendrás acceso hasta fin del periodo pagado.
              </li>
              <li>
                <strong>Premium:</strong> acceso ilimitado + garantía (ver abajo). Vigencia: hasta tu fecha de examen objetivo.
              </li>
            </ul>
            <p>
              Los planes pagos desbloquean simulacros ilimitados, explicaciones completas (capas 2-4) y acceso al panel parental (si eres tutor).
            </p>
          </section>

          {/* Garantía Premium */}
          <section>
            <h2>4. Garantía Premium (aplica solo al plan Premium)</h2>
            <p>
              Si contratas el plan <strong>Premium</strong> y usas YaEntre consistentemente (al menos 15 sesiones en los 60 días previos al examen, mínimo 20 minutos cada sesión) pero <strong>no ingresas</strong> a la carrera de tu meta:
            </p>
            <ul>
              <li>Te devolveremos <strong>el 50% de lo pagado</strong> dentro de 30 días de que publiques tu resultado oficial.</li>
            </ul>
            <p>
              <strong>La garantía NO aplica si:</strong>
            </p>
            <ul>
              <li>No usaste la plataforma (menos de 15 sesiones o sesiones menores a 20 min)</li>
              <li>Tu carrera meta cambió después de tu compra</li>
              <li>Tu examen fue en línea pero con irregularidades reportadas por ti o la institución</li>
              <li>No alcanzaste el puntaje mínimo de tu carrera a nivel nacional (no es culpa de la plataforma si la competencia fue más fuerte ese año)</li>
            </ul>
            <p>
              Para reclamar: escribe a{' '}
              <a href="mailto:hola@yaentre.com" className="font-semibold text-brand hover:underline">
                hola@yaentre.com
              </a>{' '}
              con tu constancia de resultado oficial.
            </p>
          </section>

          {/* Propiedad intelectual */}
          <section>
            <h2>5. Propiedad intelectual</h2>
            <p>
              <strong>YaEntre te da el derecho de usar el contenido</strong> (reactivos, explicaciones, videos si los hay) únicamente dentro de la plataforma, para tu preparación personal. <strong>No puedes:</strong>
            </p>
            <ul>
              <li>Copiar, descargar ni distribuir los reactivos a terceros</li>
              <li>Usar YaEntre para crear o entrenar modelos de IA (incluye scraping de preguntas)</li>
              <li>Revender o comercializar el acceso a la plataforma</li>
              <li>Decodificar, hackear ni intentar acceder a datos de otros usuarios</li>
            </ul>
            <p>
              El contenido de YaEntre (diseño, reactivos, explicaciones) es propiedad intelectual de YaEntre y está protegido por ley. Las violaciones resultan en cancelación de cuenta y acciones legales si es necesario.
            </p>
          </section>

          {/* Uso aceptable */}
          <section>
            <h2>6. Uso aceptable</h2>
            <p>Aceptas que NO usarás YaEntre para:</p>
            <ul>
              <li>Acosar, intimidar ni hostigar a otros usuarios o personal de YaEntre</li>
              <li>Publicar contenido sexual, violento, ilegal o que incite al odio</li>
              <li>Intentar ganar dinero ofreciendo acceso ajeno a la plataforma</li>
              <li>Usar bots, scripts automatizados ni herramientas de scraping</li>
              <li>Hacer ataques de denegación de servicio (DDoS) ni intentos de hackeo</li>
            </ul>
            <p>
              Si violas esta sección, podemos suspender o eliminar tu cuenta sin aviso previo ni reembolso.
            </p>
          </section>

          {/* Rol del tutor */}
          <section>
            <h2>7. Rol del tutor (si tienes menor de edad vinculado)</h2>
            <p>
              Si eres tutor legal de un estudiante menor de edad, aceptas que:
            </p>
            <ul>
              <li>Tienes la <strong>responsabilidad legal</strong> de supervisar el uso que hace del estudiante de YaEntre</li>
              <li>Solo puedes acceder al <strong>progreso resumido</strong> (Entrómetro, temas débiles, racha) — NO a respuestas crudas de sesiones ni a datos de identificación de otros usuarios</li>
              <li>No puedes obligar al estudiante a usar YaEntre si se niega; el consentimiento es voluntario</li>
              <li>YaEntre <strong>NO proporciona consejería educativa ni asesoramiento profesional</strong> — solo datos de tu progreso académico</li>
            </ul>
          </section>

          {/* Limitación de responsabilidad */}
          <section>
            <h2>8. Limitación de responsabilidad</h2>
            <p>
              <strong>YaEntre se proporciona &quot;tal cual&quot;, sin garantías implícitas.</strong>
            </p>
            <p>
              YaEntre <strong>NO garantiza que ingresarás a tu carrera meta</strong> solo por usar la plataforma. El Entrómetro es una <strong>predicción estadística</strong> basada en tu desempeño histórico, no una garantía. <strong>La única garantía es la del plan Premium</strong> (sección 4 arriba), que opera bajo condiciones específicas.
            </p>
            <p>
              Otros factores que <strong>escapan a nuestro control</strong> incluyen:
            </p>
            <ul>
              <li>Tu desempeño real el día del examen (estrés, salud, circunstancias externas)</li>
              <li>Cambios en los criterios de admisión de las instituciones</li>
              <li>Caídas de infraestructura de Supabase, Vercel o internet en general</li>
              <li>Cambios en el formato o dificultad del examen oficial</li>
            </ul>
            <p>
              <strong>Responsabilidad máxima:</strong> en caso de fallo demostrable de la plataforma (pérdida de datos, simulacro corrompido), nuestra responsabilidad se limita al monto que pagaste por tu plan actual, nada más.
            </p>
          </section>

          {/* Suspensión */}
          <section>
            <h2>9. Suspensión o cancelación de cuenta</h2>
            <p>Podemos suspender o cancelar tu cuenta si:</p>
            <ul>
              <li>Violas estos términos o nuestro aviso de privacidad</li>
              <li>No pagas un plan recurrente (Mensual/Premium)</li>
              <li>Usas la plataforma de forma que daña a otros usuarios o a la infraestructura</li>
            </ul>
            <p>
              Si tu cuenta se cancela, perderás acceso al contenido y progreso guardado (excepto si aplica la garantía Premium, en cuyo caso se procesa el reembolso).
            </p>
          </section>

          {/* Pagos y reembolsos */}
          <section>
            <h2>10. Pagos y reembolsos</h2>
            <ul>
              <li>
                <strong>Pases Estacionales:</strong> no reembolsables después de 24 horas de la compra, excepto por garantía Premium.
              </li>
              <li>
                <strong>Mensual:</strong> puedes cancelar en cualquier momento; tendrás acceso hasta fin del {'"'}período pagado{'"'}. No hay reembolso prorrateado.
              </li>
              <li>
                <strong>Premium:</strong> no reembolsable excepto bajo la garantía de la sección 4.
              </li>
            </ul>
            <p>
              Los pagos se procesan mediante Stripe. Tus datos de tarjeta se protegen bajo los estándares de Stripe PCI-DSS.
            </p>
          </section>

          {/* Litigios */}
          <section>
            <h2>11. Resolución de disputas</h2>
            <p>
              Si tienes una disputa sobre tu account, pago o uso de YaEntre, escribe primero a{' '}
              <a href="mailto:hola@yaentre.com" className="font-semibold text-brand hover:underline">
                hola@yaentre.com
              </a>{' '}
              con una descripción clara del problema. Intentaremos resolverlo en 15 días.
            </p>
            <p>
              Si no se resuelve, cualquier litigio se regirá por las leyes de México y se resolverá en los tribunales competentes de la Ciudad de México.
            </p>
          </section>

          {/* Cambios */}
          <section>
            <h2>12. Cambios a estos términos</h2>
            <p>
              Podemos cambiar estos términos en cualquier momento. Si el cambio es significativo (por ejemplo, afecta derechos de reembolso), te notificaremos por correo al menos 30 días antes de que entre en vigor. Seguir usando YaEntre después del aviso equivale a aceptar los términos nuevos.
            </p>
          </section>

          {/* Contacto */}
          <section>
            <h2>13. Contacto</h2>
            <p>
              Si tienes preguntas sobre estos términos o necesitas reportar un problema:
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
