interface FaqItem {
  question: string;
  answer: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    question: '¿Cómo funciona YaEntre?',
    answer:
      'Empiezas con un diagnóstico de 30 preguntas. Con eso, nuestro motor calcula tu Entrómetro y arma tu ruta de estudio priorizando los temas donde más te conviene practicar. A partir de ahí practicas por tema, haces simulacros completos y tu predicción se actualiza sola.',
  },
  {
    question: '¿En qué dispositivos funciona?',
    answer:
      'En cualquier celular, tablet o computadora con navegador — no necesitas instalar nada. También puedes agregarla a tu pantalla de inicio como app (PWA) para acceso rápido.',
  },
  {
    question: '¿Puedo pagar en OXXO?',
    answer:
      'Sí. Aceptamos tarjeta de crédito/débito, OXXO y transferencia SPEI. El pago en OXXO se confirma en menos de 3 horas y tu acceso se activa automáticamente en cuanto se confirma — no necesitas hacer nada más.',
  },
  {
    question: '¿Cómo funciona la garantía del plan Premium?',
    answer:
      'Si tomas el plan Premium Garantía y no ingresas a tu institución, te reembolsamos o repites el siguiente ciclo con nosotros sin costo. Esta garantía aplica únicamente al plan Premium.',
  },
  {
    question: '¿Qué instituciones cubre?',
    answer:
      'Al lanzamiento: UNAM e IPN, nivel Superior. UAM, CENEVAL (EXANI II) y Media Superior se activan en las semanas siguientes al lanzamiento.',
  },
  {
    question: '¿Necesito tarjeta para probarlo?',
    answer:
      'No. El plan Free no pide tarjeta: puedes hacer tu diagnóstico, tu primer simulacro completo y practicar todos los días sin pagar nada.',
  },
  {
    question: '¿Puedo cancelar el plan Mensual cuando quiera?',
    answer:
      'Sí, puedes cancelar o cambiar de plan desde tu perfil en cualquier momento, sin tener que contactar soporte.',
  },
  {
    question: '¿Cuánto tiempo debo estudiar al día?',
    answer:
      'No hay un mínimo fijo — el motor se adapta a tu ritmo. La mayoría de los alumnos ven resultados practicando entre 20 y 40 minutos al día, priorizando los temas que YaEntre marca como débiles.',
  },
];

/**
 * FAQ sin JavaScript (F10 Task 3, performance): `<details>/<summary>` nativo
 * en vez de un acordeón con estado de React — cero JS de cliente para esta
 * sección, funciona igual de bien en cualquier dispositivo.
 */
export function Faq() {
  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <h2 className="text-center font-display text-3xl font-bold text-text-primary">
          Preguntas frecuentes
        </h2>

        <div className="mt-8 divide-y divide-border-subtle rounded-lg border border-border-subtle bg-surface">
          {FAQ_ITEMS.map((item) => (
            <details key={item.question} className="group p-5 open:pb-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-text-primary">
                {item.question}
                <span className="shrink-0 text-brand transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-text-secondary">{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
