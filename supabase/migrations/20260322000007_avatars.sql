-- ─────────────────────────────────────────────
-- Avatars: public storage bucket for profile photos
-- ─────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

-- Anyone can read avatars (public bucket)
CREATE POLICY "avatars_public_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- Authenticated users can upload to their own folder
CREATE POLICY "avatars_own_upload" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Authenticated users can update (overwrite) their own avatar
CREATE POLICY "avatars_own_update" ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
