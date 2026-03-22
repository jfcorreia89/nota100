-- ─────────────────────────────────────────────
-- Feed: privacy model + reactions
-- ─────────────────────────────────────────────

-- 1. Add is_public to uploads (default private)
ALTER TABLE uploads ADD COLUMN is_public boolean NOT NULL DEFAULT false;

-- 2. Update uploads RLS: own uploads always visible; public uploads visible to class
DROP POLICY "uploads_class_member" ON uploads;
CREATE POLICY "uploads_own_or_public" ON uploads FOR SELECT
  USING (
    user_id = auth.uid()
    OR (
      is_public = true
      AND EXISTS (
        SELECT 1 FROM tests t
        JOIN class_members cm ON cm.class_id = t.class_id
        WHERE t.id = test_id AND cm.user_id = auth.uid()
      )
    )
  );

-- 3. upload_reactions table
CREATE TABLE upload_reactions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id  uuid NOT NULL REFERENCES uploads(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  emoji      text NOT NULL CHECK (emoji IN ('💡', '🔥', '🙏')),
  created_at timestamptz DEFAULT now(),
  UNIQUE (upload_id, user_id, emoji)
);

ALTER TABLE upload_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reactions_class_read" ON upload_reactions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM uploads u
    JOIN tests t ON t.id = u.test_id
    JOIN class_members cm ON cm.class_id = t.class_id
    WHERE u.id = upload_id AND cm.user_id = auth.uid()
  ));

CREATE POLICY "reactions_own" ON upload_reactions FOR ALL
  USING (user_id = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE upload_reactions;
