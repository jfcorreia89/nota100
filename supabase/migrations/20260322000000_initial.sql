-- ─────────────────────────────────────────────
-- NOTA100 — Initial Schema
-- ─────────────────────────────────────────────

-- Profiles (extends auth.users)
CREATE TABLE profiles (
  id           uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name         text NOT NULL DEFAULT '',
  avatar_url   text,
  role         text NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin')),
  streak_count int  NOT NULL DEFAULT 0,
  last_active  timestamptz DEFAULT now(),
  created_at   timestamptz DEFAULT now()
);

-- Classes
CREATE TABLE classes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  subject     text NOT NULL DEFAULT '',
  created_by  uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  timestamptz DEFAULT now()
);

-- Invite codes (admin-generated, linked to a class)
CREATE TABLE invite_codes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id    uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  code        char(6) NOT NULL UNIQUE,
  created_by  uuid REFERENCES profiles(id) ON DELETE SET NULL,
  is_active   boolean NOT NULL DEFAULT true,
  uses_count  int NOT NULL DEFAULT 0,
  created_at  timestamptz DEFAULT now()
);

-- Class members
CREATE TABLE class_members (
  class_id    uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at   timestamptz DEFAULT now(),
  PRIMARY KEY (class_id, user_id)
);

-- Tests (created by students within a class)
CREATE TABLE tests (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id    uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  subject     text NOT NULL,
  topic       text NOT NULL DEFAULT '',
  test_date   date NOT NULL,
  created_by  uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  timestamptz DEFAULT now()
);

-- Topic predictions (crowdsourced per test)
CREATE TABLE topic_predictions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id     uuid NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  topic_name  text NOT NULL,
  created_by  uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  timestamptz DEFAULT now()
);

-- Votes on topic predictions
CREATE TABLE topic_votes (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prediction_id  uuid NOT NULL REFERENCES topic_predictions(id) ON DELETE CASCADE,
  user_id        uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at     timestamptz DEFAULT now(),
  UNIQUE (prediction_id, user_id)
);

-- AI-analysed uploads (PDF or image)
CREATE TABLE uploads (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id       uuid NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  file_url      text NOT NULL,
  file_type     text NOT NULL DEFAULT 'image' CHECK (file_type IN ('pdf', 'image')),
  ai_summary    text,
  ai_questions  jsonb,   -- [{question, options[4], answer}]
  created_at    timestamptz DEFAULT now()
);

-- ─────────────────────────────────────────────
-- FUNCTIONS & TRIGGERS
-- ─────────────────────────────────────────────

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', ''));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Generate a random 6-char uppercase invite code
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS char(6) LANGUAGE plpgsql AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code  char(6) := '';
  i     int;
BEGIN
  FOR i IN 1..6 LOOP
    code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN code;
END;
$$;

-- ─────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────

ALTER TABLE profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE invite_codes     ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_members    ENABLE ROW LEVEL SECURITY;
ALTER TABLE tests            ENABLE ROW LEVEL SECURITY;
ALTER TABLE topic_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE topic_votes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploads          ENABLE ROW LEVEL SECURITY;

-- Profiles: users read/update their own; admins read all
CREATE POLICY "profiles_own" ON profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "profiles_admin_read" ON profiles FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- Classes: members can read; admins can do everything
CREATE POLICY "classes_member_read" ON classes FOR SELECT
  USING (EXISTS (SELECT 1 FROM class_members cm WHERE cm.class_id = id AND cm.user_id = auth.uid()));
CREATE POLICY "classes_admin_all" ON classes FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- Invite codes: anyone can read active codes (needed for registration lookup)
CREATE POLICY "invite_codes_read" ON invite_codes FOR SELECT USING (is_active = true);
CREATE POLICY "invite_codes_admin_all" ON invite_codes FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- Class members: members of same class can read; own row insert/delete
CREATE POLICY "class_members_read" ON class_members FOR SELECT
  USING (EXISTS (SELECT 1 FROM class_members cm WHERE cm.class_id = class_id AND cm.user_id = auth.uid()));
CREATE POLICY "class_members_insert_own" ON class_members FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "class_members_admin_all" ON class_members FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- Tests: class members can read/insert
CREATE POLICY "tests_class_member" ON tests FOR SELECT
  USING (EXISTS (SELECT 1 FROM class_members cm WHERE cm.class_id = class_id AND cm.user_id = auth.uid()));
CREATE POLICY "tests_insert" ON tests FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM class_members cm WHERE cm.class_id = class_id AND cm.user_id = auth.uid())
);
CREATE POLICY "tests_admin_all" ON tests FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- Topic predictions: class members can read/insert
CREATE POLICY "topic_predictions_class_member" ON topic_predictions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM tests t JOIN class_members cm ON cm.class_id = t.class_id
    WHERE t.id = test_id AND cm.user_id = auth.uid()
  ));
CREATE POLICY "topic_predictions_insert" ON topic_predictions FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM tests t JOIN class_members cm ON cm.class_id = t.class_id
    WHERE t.id = test_id AND cm.user_id = auth.uid()
  )
);

-- Topic votes: class members can read/insert; users delete own
CREATE POLICY "topic_votes_class_member" ON topic_votes FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM topic_predictions tp
    JOIN tests t ON t.id = tp.test_id
    JOIN class_members cm ON cm.class_id = t.class_id
    WHERE tp.id = prediction_id AND cm.user_id = auth.uid()
  ));
CREATE POLICY "topic_votes_insert" ON topic_votes FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "topic_votes_delete_own" ON topic_votes FOR DELETE USING (user_id = auth.uid());

-- Uploads: class members can read; own user can insert
CREATE POLICY "uploads_class_member" ON uploads FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM tests t JOIN class_members cm ON cm.class_id = t.class_id
    WHERE t.id = test_id AND cm.user_id = auth.uid()
  ));
CREATE POLICY "uploads_insert_own" ON uploads FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "uploads_admin_all" ON uploads FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- ─────────────────────────────────────────────
-- STORAGE BUCKET
-- ─────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public) VALUES ('uploads', 'uploads', false);

CREATE POLICY "uploads_bucket_insert" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'uploads' AND auth.uid() IS NOT NULL);
CREATE POLICY "uploads_bucket_select" ON storage.objects FOR SELECT
  USING (bucket_id = 'uploads' AND auth.uid() IS NOT NULL);

-- ─────────────────────────────────────────────
-- REALTIME
-- ─────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE topic_votes;
ALTER PUBLICATION supabase_realtime ADD TABLE topic_predictions;
ALTER PUBLICATION supabase_realtime ADD TABLE uploads;
ALTER PUBLICATION supabase_realtime ADD TABLE class_members;
