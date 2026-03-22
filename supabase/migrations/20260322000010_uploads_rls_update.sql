-- Allow users to update their own uploads (required for shareUpload to set is_public = true)
CREATE POLICY "uploads_update_own" ON uploads FOR UPDATE USING (user_id = auth.uid());
