import type { Metadata } from 'next';
import { PublicPageShell } from '@/components/marketing/PublicPageShell';
import { LinkButton } from '@/components/ui/LinkButton';
import { openGraphFor } from '@/lib/seo/metadata';

export const metadata: Metadata = {
  title: 'Da clases en YaEntre',
  description:
    'Sé profesor independiente verificado en YaEntre: fija tu horario, da clases en línea a aspirantes de la UNAM y el IPN y recibe tu liquidación semanal.',
  alternates: { canonical: '/profesores' },
  openGraph: openGraphFor({
    url: '/profesores',
    title: 'Da clases en YaEntre',
    description: 'Profesores independientes verificados, con tu propio horario y liquidación semanal.',
  }),
};

/**
 * Landing PÚBLICA para profesores. Marketing sin datos personales (puede
 * cachearse; por eso `/profesores` no está en la lista privada del service
 * worker). Redacción deliberada:
 *  · «profesores independientes verificados en YaEntre»: quien presta el
 *    servicio es el profesor, no YaEntre (no se habla de una plantilla propia
 *    de docentes);
 *  · no promete una cantidad de ingresos ni fija un precio: el precio de cada
 *    clase lo calcula la plataforma y el profesor ve lo que le corresponde;
 *  · no promete fechas de apertura.
 */
export default function TeachersLandingPage() {
  return (
    <PublicPageShell>
      <section className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="font-display text-4xl font-bold">Da clases en YaEntre</h1>
        <p className="mt-4 text-lg text-text-secondary">
          Únete como profesor independiente verificado. Tú decides cuándo das clases; nosotros ponemos a los alumnos,
          el aula en línea y el cobro.
        </p>

        <ul className="mt-8 space-y-4 text-text-secondary">
          <li>
            <strong className="text-text-primary">Tu horario.</strong> Marcas tu disponibilidad semanal y los alumnos
            reservan dentro de ella.
          </li>
          <li>
            <strong className="text-text-primary">Todo dentro de la plataforma.</strong> Agenda, cobro y aula en
            línea. Las clases no se agendan ni se cobran por fuera.
          </li>
          <li>
            <strong className="text-text-primary">Liquidación semanal.</strong> Recibes tu parte de cada clase
            impartida por transferencia, con el detalle de cada una.
          </li>
          <li>
            <strong className="text-text-primary">Un nivel que se gana.</strong> Subes de nivel por mérito —clases
            impartidas, calificaciones y cumplimiento—, nunca por elección propia.
          </li>
        </ul>

        <h2 className="mt-12 font-display text-2xl font-semibold">Cómo funciona</h2>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-text-secondary">
          <li>Envías tu solicitud con tus materias, tu horario y tus datos de pago.</li>
          <li>Verificamos tu identidad y aprobamos tu perfil.</li>
          <li>Apareces en el directorio para los alumnos con acceso Premium y recibes reservas.</li>
        </ol>

        <p className="mt-8 text-sm text-text-muted">
          Para dar clases necesitas ser mayor de edad y tener una CURP y una cuenta bancaria a tu nombre. Actúas como
          profesor independiente: YaEntre es comisionista de tus clases.
        </p>

        <LinkButton href="/profesor/solicitud" className="mt-8">
          Enviar mi solicitud
        </LinkButton>
      </section>
    </PublicPageShell>
  );
}
