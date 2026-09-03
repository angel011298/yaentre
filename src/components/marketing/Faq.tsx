import { FAQ_ITEMS } from '@/lib/marketing/faq-data';

/**
 * FAQ sin JavaScript (F10 Task 3, performance): `<details>/<summary>` nativo
 * en vez de un acordeón con estado de React — cero JS de cliente para esta
 * sección, funciona igual de bien en cualquier dispositivo.
 *
 * Las preguntas viven en `src/lib/marketing/faq-data.ts` — la misma fuente
 * que emite el JSON-LD `FAQPage` de la landing (G68).
 */
export function Faq() {
  return (
    <section className="py-16 sm:py-20" aria-labelledby="faq-heading">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <h2
          id="faq-heading"
          className="text-center font-display text-3xl font-bold text-text-primary"
        >
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
