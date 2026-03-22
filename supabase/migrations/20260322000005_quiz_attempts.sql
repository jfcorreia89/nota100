-- Quiz attempts: stores each completed quiz session per user per test
CREATE TABLE quiz_attempts (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  test_id           uuid NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  score             int NOT NULL DEFAULT 0,
  questions_correct int NOT NULL DEFAULT 0,
  questions_total   int NOT NULL DEFAULT 0,
  badges            text[] NOT NULL DEFAULT '{}',
  completed_at      timestamptz DEFAULT now()
);

ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;

-- Users can read/insert their own attempts
CREATE POLICY "quiz_attempts_own" ON quiz_attempts
  FOR ALL USING (user_id = auth.uid());

-- Class members can read all attempts for tests in their class (for context)
CREATE POLICY "quiz_attempts_class_read" ON quiz_attempts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tests t
      JOIN class_members cm ON cm.class_id = t.class_id
      WHERE t.id = test_id AND cm.user_id = auth.uid()
    )
  );

ALTER PUBLICATION supabase_realtime ADD TABLE quiz_attempts;
