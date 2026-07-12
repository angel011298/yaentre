/**
 * Divide un texto en segmentos de texto plano y fórmulas LaTeX inline
 * (delimitadas por `$...$`), para que cada segmento se renderice por separado:
 * el texto como React normal (auto-escapado) y el LaTeX vía KaTeX.
 *
 * Separar así (en vez de volcar todo el texto a `dangerouslySetInnerHTML`)
 * limita el HTML inyectado únicamente al output de KaTeX sobre la fórmula,
 * nunca al texto libre generado por IA o editado por un admin.
 */

export type LatexSegment =
  | { type: 'text'; value: string }
  | { type: 'math'; value: string };

export function splitLatexSegments(text: string): LatexSegment[] {
  const segments: LatexSegment[] = [];
  const regex = /(?<!\\)\$([^$]+?)(?<!\\)\$/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    }
    segments.push({ type: 'math', value: match[1] });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ type: 'text', value: text.slice(lastIndex) });
  }

  return segments;
}
