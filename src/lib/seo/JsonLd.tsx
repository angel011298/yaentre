/**
 * Renderiza uno o varios bloques de datos estructurados (JSON-LD) como
 * `<script type="application/ld+json">` (G68). Google, Bing y las vistas
 * previas de redes lo leen para entender qué es cada página.
 *
 * El `type="application/ld+json"` NO es JavaScript ejecutable — el navegador
 * lo trata como datos — así que la CSP (`script-src`) no lo bloquea. Aun así
 * se escapa `<` para que ningún valor de datos pueda cerrar el `<script>`
 * antes de tiempo.
 */
export function JsonLd({ data }: { data: object | object[] }) {
  const blocks = Array.isArray(data) ? data : [data];
  return (
    <>
      {blocks.map((block, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(block).replace(/</g, '\\u003c'),
          }}
        />
      ))}
    </>
  );
}
