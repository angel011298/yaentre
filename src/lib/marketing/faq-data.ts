import type { FaqEntry } from '@/lib/seo/structured-data';

/**
 * Preguntas frecuentes de la landing. Viven aquí (no dentro del componente)
 * para tener UNA sola fuente: `Faq.tsx` las pinta y `app/(public)/page.tsx`
 * las emite como datos estructurados `FAQPage` (G68) — el texto visible y el
 * que lee Google nunca pueden divergir.
 */
export const FAQ_ITEMS: readonly FaqEntry[] = [
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
    // Bloque 1 (handoff §3.1/§3.2): el producto ya no ofrece garantía de
    // ingreso. Tu acceso se activa de inmediato al confirmarse el pago, así que
    // —por ley— no aplica el derecho de revocación del art. 56 LFPC.
    // ⚠️ Texto final de reembolsos lo produce la sesión CLO (Bloque 1 · item 6);
    // este es un resumen provisional alineado a la política.
    question: '¿Puedo pedir un reembolso?',
    answer:
      'Tu acceso a YaEntre se activa de inmediato al confirmarse el pago, así que no aplica el derecho de revocación del artículo 56 de la Ley Federal de Protección al Consumidor. Revisa nuestra Política de reembolsos para los casos en que sí evaluamos una devolución.',
  },
  {
    question: '¿Qué instituciones cubre?',
    answer:
      'Al lanzamiento: UNAM e IPN, nivel Superior. UAM, CENEVAL (EXANI II) y Media Superior se activan en las semanas siguientes al lanzamiento.',
  },
  {
    question: '¿Necesito tarjeta para probarlo?',
    answer:
      'No. El plan Free no pide tarjeta: puedes hacer tu diagnóstico, un medio simulacro (60 reactivos) y practicar todos los días sin pagar nada.',
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
