'use client';

import { useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  addLessonAction,
  addModuleAction,
  deleteLessonAction,
  deleteModuleAction,
  moveLessonAction,
  moveModuleAction,
  updateLessonAction,
  updateModuleAction,
} from '@/app/actions/courses-teacher';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { MediaUploader } from './MediaUploader';
import { formatDuration } from './CourseCard';

interface EditorLesson {
  id: string;
  title: string;
  type: 'VIDEO' | 'TEXT' | 'QUIZ' | 'RESOURCE';
  hasVideo: boolean;
  hasResource: boolean;
  durationSeconds: number | null;
  content: string | null;
  isFreePreview: boolean;
}

interface EditorModule {
  id: string;
  title: string;
  description: string | null;
  lessons: EditorLesson[];
}

type Result = { ok: true } | { ok: false; message: string };

const TYPE_LABEL: Record<EditorLesson['type'], string> = { VIDEO: 'Video', TEXT: 'Texto', RESOURCE: 'Material (PDF)', QUIZ: 'Cuestionario' };

/**
 * G103 — módulos y lecciones (spec §2.6 pasos 2-3). Orden con botones
 * «Subir/Bajar» (accesibles con teclado y en celular) en lugar de arrastrar.
 * Cada cambio va al servidor, que vuelve a verificar dueño y estado.
 */
export function CourseContentEditor({
  courseId,
  modules,
  disabled,
  freePreviews,
}: {
  courseId: string;
  modules: EditorModule[];
  disabled: boolean;
  freePreviews: number;
}) {
  const router = useRouter();
  const [newModule, setNewModule] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(fn: () => Promise<Result | null>) {
    setBusy(true);
    setError(null);
    const r = await fn().catch(() => null);
    setBusy(false);
    if (r?.ok) router.refresh();
    else setError(r && !r.ok ? r.message : 'No pudimos guardar el cambio.');
    return Boolean(r?.ok);
  }

  return (
    <div className="space-y-4">
      {modules.length === 0 && <p className="text-sm text-text-muted">Todavía no hay módulos.</p>}
      {modules.map((m, mi) => (
        <ModuleBlock
          key={m.id}
          module={m}
          isFirst={mi === 0}
          isLast={mi === modules.length - 1}
          disabled={disabled || busy}
          courseId={courseId}
          canAddPreview={freePreviews < 3}
          run={run}
        />
      ))}
      {!disabled && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1">
            <TextField label="Nuevo módulo" name={`new-module-${courseId}`} value={newModule} maxLength={120} placeholder="Módulo 1: Introducción" onChange={(e) => setNewModule(e.target.value)} />
          </div>
          <Button
            type="button"
            variant="secondary"
            disabled={busy || newModule.trim().length < 2}
            onClick={async () => {
              if (await run(() => addModuleAction({ courseId, title: newModule, description: null }))) setNewModule('');
            }}
          >
            Agregar módulo
          </Button>
        </div>
      )}
      <div aria-live="assertive">
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

function ModuleBlock({
  module: m,
  isFirst,
  isLast,
  disabled,
  courseId,
  canAddPreview,
  run,
}: {
  module: EditorModule;
  isFirst: boolean;
  isLast: boolean;
  disabled: boolean;
  courseId: string;
  canAddPreview: boolean;
  run: (fn: () => Promise<Result | null>) => Promise<boolean>;
}) {
  const id = useId();
  const [title, setTitle] = useState(m.title);
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonType, setLessonType] = useState<'VIDEO' | 'TEXT' | 'RESOURCE'>('VIDEO');

  return (
    <section className="space-y-3 rounded-lg border border-border-subtle p-3" aria-label={`Módulo: ${m.title}`}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex-1">
          <TextField label="Título del módulo" name={`module-${m.id}`} value={title} maxLength={120} disabled={disabled} onChange={(e) => setTitle(e.target.value)} />
        </div>
        {!disabled && (
          <div className="flex flex-wrap gap-1">
            <Button type="button" variant="ghost" disabled={title === m.title} onClick={() => void run(() => updateModuleAction({ moduleId: m.id, title, description: m.description }))}>
              Guardar
            </Button>
            <Button type="button" variant="ghost" disabled={isFirst} aria-label={`Subir el módulo ${m.title}`} onClick={() => void run(() => moveModuleAction({ id: m.id, direction: 'up' }))}>
              Subir
            </Button>
            <Button type="button" variant="ghost" disabled={isLast} aria-label={`Bajar el módulo ${m.title}`} onClick={() => void run(() => moveModuleAction({ id: m.id, direction: 'down' }))}>
              Bajar
            </Button>
            <Button
              type="button"
              variant="ghost"
              aria-label={`Borrar el módulo ${m.title}`}
              onClick={() => {
                if (window.confirm('¿Borrar el módulo y todas sus lecciones?')) void run(() => deleteModuleAction({ id: m.id }));
              }}
            >
              Borrar
            </Button>
          </div>
        )}
      </div>

      <ol className="space-y-2">
        {m.lessons.map((l, li) => (
          <LessonRow
            key={l.id}
            lesson={l}
            courseId={courseId}
            isFirst={li === 0}
            isLast={li === m.lessons.length - 1}
            disabled={disabled}
            canAddPreview={canAddPreview}
            run={run}
          />
        ))}
      </ol>

      {!disabled && (
        <div className="flex flex-col gap-2 border-t border-border-subtle pt-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <TextField label="Nueva lección" name={`new-lesson-${m.id}`} value={lessonTitle} maxLength={120} placeholder="1.1 ¿Qué es una variable?" onChange={(e) => setLessonTitle(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor={`${id}-type`} className="text-sm font-medium text-text-secondary">Tipo</label>
            <select id={`${id}-type`} value={lessonType} onChange={(e) => setLessonType(e.target.value as typeof lessonType)} className="min-h-touch rounded-md border border-border-subtle bg-input px-3 text-text-primary">
              <option value="VIDEO">Video</option>
              <option value="TEXT">Texto</option>
              <option value="RESOURCE">Material (PDF)</option>
            </select>
          </div>
          <Button
            type="button"
            variant="secondary"
            disabled={lessonTitle.trim().length < 2}
            onClick={async () => {
              if (await run(() => addLessonAction({ moduleId: m.id, title: lessonTitle, type: lessonType, content: null, isFreePreview: false }))) setLessonTitle('');
            }}
          >
            Agregar lección
          </Button>
        </div>
      )}
    </section>
  );
}

function LessonRow({
  lesson: l,
  courseId,
  isFirst,
  isLast,
  disabled,
  canAddPreview,
  run,
}: {
  lesson: EditorLesson;
  courseId: string;
  isFirst: boolean;
  isLast: boolean;
  disabled: boolean;
  canAddPreview: boolean;
  run: (fn: () => Promise<Result | null>) => Promise<boolean>;
}) {
  const id = useId();
  const [content, setContent] = useState(l.content ?? '');
  const [open, setOpen] = useState(false);

  return (
    <li className="rounded-md border border-border-subtle bg-surface p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="min-h-touch text-left text-sm">
          <span className="font-semibold text-text-primary">{l.title}</span>
          <span className="block text-xs text-text-muted">
            {TYPE_LABEL[l.type]}
            {l.type === 'VIDEO' ? (l.hasVideo ? ` · ${formatDuration(Math.max(1, Math.round((l.durationSeconds ?? 0) / 60)))}` : ' · sin video') : ''}
            {l.type === 'RESOURCE' ? (l.hasResource ? ' · archivo listo' : ' · sin archivo') : ''}
            {l.isFreePreview ? ' · muestra gratis' : ''}
          </span>
        </button>
        {!disabled && (
          <div className="flex flex-wrap gap-1">
            <Button type="button" variant="ghost" disabled={isFirst} aria-label={`Subir la lección ${l.title}`} onClick={() => void run(() => moveLessonAction({ id: l.id, direction: 'up' }))}>
              Subir
            </Button>
            <Button type="button" variant="ghost" disabled={isLast} aria-label={`Bajar la lección ${l.title}`} onClick={() => void run(() => moveLessonAction({ id: l.id, direction: 'down' }))}>
              Bajar
            </Button>
            <Button
              type="button"
              variant="ghost"
              aria-label={`Borrar la lección ${l.title}`}
              onClick={() => {
                if (window.confirm('¿Borrar esta lección?')) void run(() => deleteLessonAction({ id: l.id }));
              }}
            >
              Borrar
            </Button>
          </div>
        )}
      </div>
      {open && (
        <div className="mt-3 space-y-3 border-t border-border-subtle pt-3">
          {l.type === 'VIDEO' && <MediaUploader courseId={courseId} lessonId={l.id} kind="video" label="Video de la lección" hasFile={l.hasVideo} disabled={disabled} />}
          {l.type === 'RESOURCE' && <MediaUploader courseId={courseId} lessonId={l.id} kind="resource" label="Material descargable (PDF, máx. 50 MB)" hasFile={l.hasResource} disabled={disabled} />}
          {l.type === 'TEXT' && (
            <div className="space-y-1.5">
              <label htmlFor={`${id}-content`} className="text-sm font-medium text-text-secondary">Texto de la lección (se muestra tal cual)</label>
              <textarea id={`${id}-content`} rows={8} maxLength={20000} value={content} disabled={disabled} onChange={(e) => setContent(e.target.value)} className="w-full rounded-md border border-border-subtle bg-input p-3 text-sm text-text-primary" />
              {!disabled && (
                <Button type="button" variant="secondary" disabled={content === (l.content ?? '')} onClick={() => void run(() => updateLessonAction({ lessonId: l.id, content }))}>
                  Guardar texto
                </Button>
              )}
            </div>
          )}
          {!disabled && (
            <label className="flex min-h-touch items-center gap-3">
              <input
                type="checkbox"
                checked={l.isFreePreview}
                disabled={!l.isFreePreview && !canAddPreview}
                onChange={(e) => void run(() => updateLessonAction({ lessonId: l.id, isFreePreview: e.target.checked }))}
                className="h-5 w-5"
              />
              <span className="text-sm text-text-secondary">
                Muestra gratuita {!l.isFreePreview && !canAddPreview ? '(ya tienes 3)' : ''}
              </span>
            </label>
          )}
        </div>
      )}
    </li>
  );
}
