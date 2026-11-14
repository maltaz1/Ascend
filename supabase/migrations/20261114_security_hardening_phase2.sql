-- ============================================================
-- Segurança — Fase 2 (auditoria de 14/11/2026)
--
-- 1. Bucket Avatars: até 2 MB, só JPEG/PNG/WebP, e cada usuário só
--    grava/troca/apaga dentro da própria pasta "<user_id>/...".
--    Antes qualquer usuário logado gravava qualquer arquivo em
--    qualquer caminho. O bucket continua público para leitura
--    (as fotos de perfil são exibidas por URL pública), mas listar
--    os arquivos pela API passa a mostrar só os da própria pasta.
-- 2. Remove políticas RLS duplicadas (mesma regra criada 2 vezes).
-- ============================================================

-- 1. Avatars --------------------------------------------------
UPDATE storage.buckets
   SET file_size_limit = 2097152,               -- 2 MB
       allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']
 WHERE id = 'Avatars';

DROP POLICY IF EXISTS "Allow authenticated uploads h0za56_0" ON storage.objects;
DROP POLICY IF EXISTS "Public read access h0za56_0" ON storage.objects;

DROP POLICY IF EXISTS "Avatars: ver a propria pasta" ON storage.objects;
CREATE POLICY "Avatars: ver a propria pasta" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'Avatars' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);

DROP POLICY IF EXISTS "Avatars: enviar na propria pasta" ON storage.objects;
CREATE POLICY "Avatars: enviar na propria pasta" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'Avatars' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);

DROP POLICY IF EXISTS "Avatars: trocar na propria pasta" ON storage.objects;
CREATE POLICY "Avatars: trocar na propria pasta" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'Avatars' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text)
  WITH CHECK (bucket_id = 'Avatars' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);

DROP POLICY IF EXISTS "Avatars: apagar na propria pasta" ON storage.objects;
CREATE POLICY "Avatars: apagar na propria pasta" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'Avatars' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);

-- 2. Políticas duplicadas ------------------------------------
DROP POLICY IF EXISTS "Users can delete their own notes." ON public.notes;
DROP POLICY IF EXISTS "Users can insert their own notes." ON public.notes;
DROP POLICY IF EXISTS "Users can update their own notes." ON public.notes;
DROP POLICY IF EXISTS "Users can view their own notes." ON public.notes;

DROP POLICY IF EXISTS "Users can delete their own note folders." ON public.note_folders;
DROP POLICY IF EXISTS "Users can insert their own note folders." ON public.note_folders;
DROP POLICY IF EXISTS "Users can update their own note folders." ON public.note_folders;
DROP POLICY IF EXISTS "Users can view their own note folders." ON public.note_folders;

-- "Users can manage own hydration" (ALL) já cobre leitura e inserção.
DROP POLICY IF EXISTS "Users can insert own hydration logs" ON public.hydration_logs;
DROP POLICY IF EXISTS "Users can view own hydration logs" ON public.hydration_logs;
