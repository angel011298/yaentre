'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getLessonMediaUrlAction, rateCourseAction, saveLessonProgressAction } from '@/app/actions/courses-student';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';

interface Lesson {
  id: string;
  title: string;
  type: 'VIDEO' | 'TEXT' | 'QUIZ' | 'RESOURCE';
  durationSeconds: number | null;
  hasMedia: boolean;
  content: string | null;
}

type Progress = Record<string, { completed: boolean; seconds: number }>;

const SAVE_EVERY_MS = 15_000;

/**
 * G103 — reproductor de un curso (spec §2.7). Reglas de la experiencia:
 *  - reanuda donde se quedó (posición guardada por lección);
 *  - nunca reproduce solo (sin autoplay con sonido);
 *  - estados explícitos: cargando, almacenando en búfer, error con reintento;
 *  - la URL firmada dura 1 h: si caduca a media clase, se pide otra y se
 *    retoma en el mismo segundo;
 *  - el avance se guarda cada ~15 s, al pausar y al terminar; la lección se da
 *    por vista al 90 %;
 *  - texto de lecciones y reseñas como TEXTO (nunca HTML);
 *  - el profesor o un admin pueden abrirlo en vista previa: no se guarda nada.
 */
export function CoursePlayer({
  courseId,
  title,
  teacherName,
  modules,
  initialLessonId,
  initialProgress,
  enrolled,
  initialRating,
  initialReview,
  progressPercent,
}: {
  courseId: string;
  slug: string;
  title: string;
  teacherName: string;
  modules: Array<{ id: string; title: string; lessons: Lesson[] }>;
  initialLessonId: string | null;
  initialProgress: Progress;
  enrolled: boolean;
  initialRating: number | null;
  initialReview: string;
  progressPercent: number;
}) {
  const lessons = modules.flatMap((m) => m.lessons);
  const [currentId, setCurrentId] = useState(initialLessonId);
  const [progress, setProgress] = useState<Progress>(initialProgress);
  const [overall, setOverall] = useState(progressPercent);
  const [media, setMedia] = useState<{ lessonId: string; url: string } | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [buffering, setBuffering] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastSave = useRef(0);
  const resumeAt = useRef<number | null>(null);
  const retried = useRef(false);

  const current = lessons.find((l) => l.id === currentId) ?? null;
  const index = current ? lessons.indexOf(current) : -1;

  const loadMedia = useCallback(
    async (lesson: Lesson, kind: 'video' | 'resource') => {
      const r = await getLessonMediaUrlAction({ lessonId: lesson.id, kind }).catch(() => null);
      if (r?.ok) return r.data.url;
      throw new Error(r?.message ?? 'No pudimos abrir esta lección.');
    },
    []
  );

  useEffect(() => {
    if (!current || current.type !== 'VIDEO' || !current.hasMedia) return;
    let alive = true;
    retried.current = false;
    resumeAt.current = progress[current.id]?.seconds ?? 0;
    loadMedia(current, 'video')
      .then((url) => {
        if (alive) {
          setMediaError(null);
          setMedia({ lessonId: current.id, url });
        }
      })
      .catch((err: unknown) => {
        if (alive) setMediaError(err instanceof Error ? err.message : 'No pudimos abrir esta lección.');
      });
    return () => {
      alive = false;
    };
    // `progress` solo se lee al cambiar de lección (para reanudar).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id, loadMedia]);

  // Sin `useCallback`: el React Compiler ya la memoiza (G103: la memoización a
  // mano chocaba con los setters que el compilador infiere).
  async function save(lessonId: string, positionSeconds: number, markCompleted: boolean) {
    if (!enrolled) return;
    lastSave.current = Date.now();
    const r = await saveLessonProgressAction({ lessonId, positionSeconds, markCompleted }).catch(() => null);
    if (r?.ok) {
      setOverall(r.data.progressPercent);
      setProgress((p) => ({
        ...p,
        [lessonId]: { completed: r.data.completed || Boolean(p[lessonId]?.completed), seconds: positionSeconds },
      }));
    }
  }

  const go = (delta: number) => {
    const next = lessons[index + delta];
    if (!next) return;
    if (videoRef.current && current?.type === 'VIDEO') void save(current.id, videoRef.current.currentTime, false);
    setMedia(null);
    setMediaError(null);
    setCurrentId(next.id);
    const url = new URL(window.location.href);
    url.searchParams.set('leccion', next.id);
    window.history.replaceState(null, '', url.toString());
  };

  async function onVideoError() {
    const v = videoRef.current;
    if (!current || retried.current) {
      setMediaError('No pudimos reproducir el video. Revisa tu conexión e intenta de nuevo.');
      return;
    }
    // La URL firmada pudo haber caducado: se pide otra y se retoma ahí.
    retried.current = true;
    resumeAt.current = v?.currentTime ?? resumeAt.current;
    try {
      const url = await loadMedia(current, 'video');
      setMedia({ lessonId: current.id, url });
    } catch (err) {
      setMediaError(err instanceof Error ? err.message : 'No pudimos reproducir el video.');
    }
  }

  async function openResource() {
    if (!current) return;
    try {
      const url = await loadMedia(current, 'resource');
      window.open(url, '_blank', 'noopener,noreferrer');
      void save(current.id, 0, true);
    } catch (err) {
      setMediaError(err instanceof Error ? err.message : 'No pudimos abrir el material.');
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0 space-y-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-text-primary">{title}</h1>
          <p className="text-sm text-text-secondary">
            {teacherName}
            {enrolled ? ` · ${Math.round(overall)} % completado` : ' · Vista previa (no se guarda avance)'}
          </p>
        </div>

        {!current ? (
          <p className="rounded-lg border border-border-subtle bg-surface p-4 text-sm text-text-secondary">Este curso todavía no tiene lecciones.</p>
        ) : (
          <section aria-labelledby="leccion-actual" className="space-y-3">
            <h2 id="leccion-actual" className="font-display text-lg font-bold text-text-primary">
              {current.title}
            </h2>

            {current.type === 'VIDEO' && (
              <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
                {media?.lessonId === current.id ? (
                  <video
                    key={media.url}
                    ref={videoRef}
                    src={media.url}
                    controls
                    playsInline
                    preload="metadata"
                    className="h-full w-full"
                    onLoadedMetadata={(e) => {
                      const v = e.currentTarget;
                      if (resumeAt.current && resumeAt.current < (v.duration || Infinity) - 5) v.currentTime = resumeAt.current;
                    }}
                    onWaiting={() => setBuffering(true)}
                    onPlaying={() => setBuffering(false)}
                    onTimeUpdate={(e) => {
                      if (Date.now() - lastSave.current > SAVE_EVERY_MS) void save(current.id, e.currentTarget.currentTime, false);
                    }}
                    onPause={(e) => void save(current.id, e.currentTarget.currentTime, false)}
                    onEnded={(e) => void save(current.id, e.currentTarget.duration || e.currentTarget.currentTime, true)}
                    onError={() => void onVideoError()}
                  >
                    Tu navegador no puede reproducir este video.
                  </video>
                ) : !mediaError ? (
                  <div className="flex h-full items-center justify-center text-sm text-white/80" role="status">
                    Cargando video…
                  </div>
                ) : null}
                {buffering && (
                  <div className="pointer-events-none absolute inset-x-0 top-2 text-center text-xs text-white/80" role="status">
                    Cargando…
                  </div>
                )}
                {mediaError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 p-4 text-center text-sm text-white" role="alert">
                    <p>{mediaError}</p>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        retried.current = false;
                        setMediaError(null);
                        void loadMedia(current, 'video').then((url) => setMedia({ lessonId: current.id, url })).catch((err: unknown) => setMediaError(err instanceof Error ? err.message : 'No pudimos abrir esta lección.'));
                      }}
                    >
                      Reintentar
                    </Button>
                  </div>
                )}
              </div>
            )}

            {current.type === 'VIDEO' && !current.hasMedia && (
              <p className="text-sm text-text-muted">Esta lección todavía no tiene video.</p>
            )}

            {current.type === 'TEXT' && (
              <div className="rounded-lg border border-border-subtle bg-surface p-4">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-text-primary">{current.content}</p>
              </div>
            )}

            {current.type === 'RESOURCE' && (
              <div className="rounded-lg border border-border-subtle bg-surface p-4">
                <Button type="button" variant="primary" onClick={() => void openResource()} disabled={!current.hasMedia}>
                  Descargar material (PDF)
                </Button>
                {mediaError && <p role="alert" className="mt-2 text-sm text-danger">{mediaError}</p>}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2">
              <Button type="button" variant="ghost" disabled={index <= 0} onClick={() => go(-1)}>
                Lección anterior
              </Button>
              {enrolled && current.type !== 'VIDEO' && !progress[current.id]?.completed && (
                <Button type="button" variant="secondary" onClick={() => void save(current.id, 0, true)}>
                  Marcar como completada
                </Button>
              )}
              <Button type="button" variant="primary" disabled={index >= lessons.length - 1} onClick={() => go(1)}>
                Siguiente lección
              </Button>
            </div>
          </section>
        )}

        {enrolled && <RateCourse courseId={courseId} initialRating={initialRating} initialReview={initialReview} />}
      </div>

      <nav aria-label="Lecciones" className="space-y-3 lg:sticky lg:top-6 lg:self-start">
        {modules.map((m) => (
          <div key={m.id} className="rounded-lg border border-border-subtle bg-surface">
            <p className="border-b border-border-subtle px-3 py-2 text-sm font-semibold text-text-primary">{m.title}</p>
            <ul>
              {m.lessons.map((l) => {
                const done = progress[l.id]?.completed;
                const active = l.id === currentId;
                return (
                  <li key={l.id}>
                    <button
                      type="button"
                      onClick={() => {
                        if (l.id === currentId) return;
                        const delta = lessons.findIndex((x) => x.id === l.id) - index;
                        go(delta);
                      }}
                      aria-current={active ? 'true' : undefined}
                      className={`flex min-h-touch w-full items-center gap-2 px-3 py-2 text-left text-sm ${active ? 'bg-brand-tint font-semibold text-brand-fg' : 'text-text-secondary hover:bg-elevated'}`}
                    >
                      <Icon name={done ? 'checkCircle' : l.type === 'VIDEO' ? 'play' : 'file'} className={`h-4 w-4 shrink-0 ${done ? 'text-success' : ''}`} />
                      <span className="min-w-0 flex-1">{l.title}</span>
                      {done && <span className="sr-only">(completada)</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </div>
  );
}

function RateCourse({ courseId, initialRating, initialReview }: { courseId: string; initialRating: number | null; initialReview: string }) {
  const [rating, setRating] = useState<number | null>(initialRating);
  const [review, setReview] = useState(initialReview);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  async function submit() {
    if (!rating) {
      setMessage({ tone: 'error', text: 'Elige de 1 a 5 estrellas.' });
      return;
    }
    setPending(true);
    const r = await rateCourseAction({ courseId, rating, review: review.trim() || null }).catch(() => null);
    setPending(false);
    setMessage(r?.ok ? { tone: 'ok', text: 'Gracias por tu opinión.' } : { tone: 'error', text: r?.message ?? 'No pudimos guardar tu opinión.' });
  }

  return (
    <section className="space-y-3 rounded-lg border border-border-subtle bg-surface p-4" aria-labelledby="calificar-curso">
      <h2 id="calificar-curso" className="font-display text-lg font-bold text-text-primary">
        Califica este curso
      </h2>
      <fieldset>
        <legend className="sr-only">Calificación de 1 a 5</legend>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="cursor-pointer">
              <input type="radio" name="course-rating" value={n} checked={rating === n} onChange={() => setRating(n)} className="sr-only" />
              <span className={`flex min-h-touch min-w-touch items-center justify-center rounded-md ${rating !== null && n <= rating ? 'text-accent-fg' : 'text-text-muted'}`}>
                {/* Rellena además de colorear: el color nunca es el único canal (WCAG). */}
                <Icon name="star" className={`h-6 w-6 ${rating !== null && n <= rating ? 'fill-current' : ''}`} label={`${n} de 5`} />
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <label htmlFor="course-review" className="sr-only">
        Tu opinión (opcional)
      </label>
      <textarea
        id="course-review"
        rows={3}
        maxLength={1000}
        value={review}
        onChange={(e) => setReview(e.target.value)}
        placeholder="¿Qué te pareció? (opcional)"
        className="w-full rounded-md border border-border-subtle bg-input p-3 text-sm text-text-primary placeholder:text-text-muted"
      />
      <Button type="button" variant="secondary" disabled={pending} onClick={() => void submit()}>
        {pending ? 'Guardando…' : 'Enviar calificación'}
      </Button>
      {message && (
        <p role={message.tone === 'error' ? 'alert' : 'status'} className={`text-sm ${message.tone === 'ok' ? 'text-success' : 'text-danger'}`}>
          {message.text}
        </p>
      )}
    </section>
  );
}
