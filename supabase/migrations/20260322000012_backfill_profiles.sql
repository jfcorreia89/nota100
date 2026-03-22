-- Backfill profiles for users who signed up before the trigger was in place.
-- Safe to run multiple times (ON CONFLICT DO NOTHING).
INSERT INTO profiles (id, name, role)
SELECT
  id,
  COALESCE(raw_user_meta_data->>'name', split_part(email, '@', 1), ''),
  'student'
FROM auth.users
WHERE id NOT IN (SELECT id FROM profiles)
ON CONFLICT (id) DO NOTHING;
