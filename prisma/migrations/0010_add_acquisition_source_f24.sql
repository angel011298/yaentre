-- F24: atribución de marketing — parámetros de campaña de la primera visita,
-- persistidos al crear el perfil para atribuir compras futuras al canal de
-- origen. Nullable, nunca se sobreescribe tras la creación.
ALTER TABLE user_profiles ADD COLUMN "acquisitionSource" JSONB;
