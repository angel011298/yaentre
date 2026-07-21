import { LatexText } from './LatexText';

interface Props {
  id: string;
  text: string;
  imageUrl?: string | null;
  isCorrect?: boolean;
}

/**
 * Opción de reactivo con soporte de imagen (F2b: formato IMAGE_OPTIONS y
 * series espaciales). `imageUrl` viene de dominios arbitrarios (generados
 * por el pipeline o ingeridos de guías), por eso `<img>` plano en vez de
 * `next/image` (que exigiría allowlist de dominios para uso interno admin).
 */
export function OptionCard({ id, text, imageUrl, isCorrect }: Props) {
  return (
    <div
      className={`space-y-2 rounded-md border p-3 text-sm ${
        isCorrect
          ? 'border-success bg-success/10 text-text-primary'
          : 'border-border-subtle text-text-secondary'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-semibold">
          {id}.{' '}
          <span className="font-normal">
            <LatexText text={text} />
          </span>
        </span>
        {isCorrect && <span className="shrink-0 text-success">✓ correcta</span>}
      </div>
      {imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt={`Opción ${id}`}
          className="max-h-48 w-auto rounded-md border border-border-subtle"
        />
      )}
    </div>
  );
}
