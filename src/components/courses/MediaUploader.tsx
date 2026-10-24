'use client';

import Image from 'next/image';
import { useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { uploadCourseFile, type UploadKind } from './upload';

const ACCEPT: Record<UploadKind, string> = {
  video: 'video/mp4,video/webm,video/quicktime',
  preview: 'video/mp4,video/webm,video/quicktime',
  thumbnail: 'image/jpeg,image/png,image/webp',
  resource: 'application/pdf',
};

/** G103 — selector + barra de avance para un archivo del curso (portada, preview, video o PDF). */
export function MediaUploader({
  courseId,
  lessonId = null,
  kind,
  label,
  currentUrl,
  hasFile,
  disabled,
}: {
  courseId: string;
  lessonId?: string | null;
  kind: UploadKind;
  label: string;
  currentUrl?: string | null;
  hasFile: boolean;
  disabled?: boolean;
}) {
  const id = useId();
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  async function upload() {
    const file = input.current?.files?.[0];
    if (!file) {
      setMessage({ tone: 'error', text: 'Elige un archivo.' });
      return;
    }
    setMessage(null);
    setProgress(0);
    const r = await uploadCourseFile({ courseId, lessonId, kind, file, onProgress: setProgress });
    setProgress(null);
    if (r.ok) {
      setMessage({ tone: 'ok', text: 'Archivo guardado.' });
      if (input.current) input.current.value = '';
      router.refresh();
    } else {
      setMessage({ tone: 'error', text: r.message });
    }
  }

  return (
    <div className="space-y-2">
      <label htmlFor={`${id}-file`} className="text-sm font-medium text-text-secondary">
        {label} {hasFile && <span className="text-success">· listo</span>}
      </label>
      {kind === 'thumbnail' && currentUrl && (
        <div className="relative aspect-video w-48 overflow-hidden rounded-md bg-elevated">
          <Image src={currentUrl} alt="Portada actual" fill unoptimized sizes="192px" className="object-cover" />
        </div>
      )}
      {!disabled && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            ref={input}
            id={`${id}-file`}
            type="file"
            accept={ACCEPT[kind]}
            className="block w-full text-sm text-text-secondary file:mr-3 file:min-h-touch file:rounded-md file:border-0 file:bg-elevated file:px-3 file:font-semibold"
          />
          <Button type="button" variant="secondary" disabled={progress !== null} onClick={() => void upload()}>
            {progress !== null ? `Subiendo ${progress} %` : hasFile ? 'Reemplazar' : 'Subir'}
          </Button>
        </div>
      )}
      {progress !== null && (
        <div className="h-2 w-full overflow-hidden rounded-full bg-meter-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} aria-label="Avance de la subida">
          <div className="h-full bg-meter-fill transition-[width]" style={{ width: `${progress}%` }} />
        </div>
      )}
      <div aria-live="polite">
        {message && (
          <p role={message.tone === 'error' ? 'alert' : 'status'} className={`text-sm ${message.tone === 'ok' ? 'text-success' : 'text-danger'}`}>
            {message.text}
          </p>
        )}
      </div>
    </div>
  );
}
