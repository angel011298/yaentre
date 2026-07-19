import Anthropic from '@anthropic-ai/sdk';

/**
 * GUARDRAIL (CLAUDE.md): la API de Anthropic SOLO se llama desde /scripts,
 * NUNCA desde el runtime de la app. Este módulo vive bajo scripts/ y no debe
 * importarse desde src/ ni app/.
 *
 * Modelo de generación fijado por el PRD §8 / TRD.
 */
export const GENERATION_MODEL = 'claude-sonnet-4-6';

export interface GenerateArgs {
  apiKey: string;
  system: string;
  user: string;
  maxTokens?: number;
}

export interface GenerationResult {
  text: string;
  usage: { inputTokens: number; outputTokens: number };
}

/** Llama al modelo generador y devuelve texto + usage (para costo, F2). */
export async function callAnthropicMeta({
  apiKey,
  system,
  user,
  maxTokens = 8000,
}: GenerateArgs): Promise<GenerationResult> {
  const client = new Anthropic({ apiKey });

  const message = await client.messages.create({
    model: GENERATION_MODEL,
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: user }],
  });

  const textBlock = message.content.find(
    (block): block is Anthropic.TextBlock => block.type === 'text',
  );

  if (!textBlock) {
    throw new Error('La respuesta del modelo no contiene texto');
  }
  return {
    text: textBlock.text,
    usage: {
      inputTokens: message.usage.input_tokens,
      outputTokens: message.usage.output_tokens,
    },
  };
}

/** Llama al modelo y devuelve el texto crudo del primer bloque de texto. */
export async function callAnthropic(args: GenerateArgs): Promise<string> {
  return (await callAnthropicMeta(args)).text;
}
