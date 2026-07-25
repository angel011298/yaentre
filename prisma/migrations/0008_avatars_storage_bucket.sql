-- F17: bucket de Storage para fotos de perfil, con RLS acotada a la carpeta
-- del propio usuario (convención estándar de Supabase: primer segmento de
-- la ruta = auth.uid()). Bucket público en LECTURA (las fotos de perfil no
-- son sensibles) — escritura/actualización/borrado solo del dueño.

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "avatar_public_read" on storage.objects
  for select using (bucket_id = 'avatars');

create policy "avatar_owner_insert" on storage.objects
  for insert with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatar_owner_update" on storage.objects
  for update using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatar_owner_delete" on storage.objects
  for delete using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
