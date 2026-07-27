import katex from 'katex';
import 'katex/dist/katex.min.css';
import { splitLatexSegments } from '@/lib/admin/latex-segments';

/**
 * Renderiza texto con fórmulas LaTeX inline (`$...$`). Es un Server Component
 * puro (sin 'use client'): `katex.renderToString` corre en Node sin DOM, así
 * que el HTML de las fórmulas se genera en el servidor y no cuesta JS en el
 * cliente. Solo el HTML que produce KaTeX se inyecta con
 * `dangerouslySetInnerHTML`; el texto libre (generado por IA o editado por un
 * admin) se renderiza como texto normal de React, nunca como HTML.
 */
export function LatexText({ text }: { text: string }) {
  const segments = splitLatexSegments(text);

  return (
    <>
      {segments.map((seg, i) => {
        if (seg.type === 'text') {
          return <span key={i}>{seg.value}</span>;
        }
        return <InlineMath key={i} latex={seg.value} />;
      })}
    </>
  );
}

/** Bloque LaTeX en modo display, para `ExplanationLayer.latexContent`. */
export function LatexBlock({ latex }: { latex: string }) {
  const html = renderSafe(latex, true);
  return (
    <div
      className="katex-block overflow-x-auto py-1"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function InlineMath({ latex }: { latex: string }) {
  const html = renderSafe(latex, false);
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

/**
 * `throwOnError: false` a propósito aquí (a diferencia de la validación de
 * Etapa 2 en scripts/lib/question-draft-schema.ts, que sí exige throw): en la
 * vista de administración preferimos degradar a un mensaje de error visible
 * en vez de tumbar la página completa por una fórmula mal guardada.
 */
function renderSafe(latex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(latex, {
      throwOnError: false,
      strict: false,
      displayMode,
    });
  } catch {
    return `<span class="text-danger">[LaTeX inválido: ${escapeHtml(latex)}]</span>`;
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
