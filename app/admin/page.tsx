import { redirect } from 'next/navigation';

export const metadata = { title: 'Panel de contenido' };

export default function AdminIndexPage() {
  redirect('/admin/questions/queue');
}
