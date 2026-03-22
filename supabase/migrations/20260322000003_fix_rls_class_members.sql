-- Fix infinite recursion in class_members_read policy.
-- The original policy queried class_members inside a policy on class_members.
-- Fix: a user can read only their own membership rows (sufficient for all app checks).
-- Policies on other tables that query class_members with cm.user_id = auth.uid()
-- are unaffected — they satisfy this policy naturally.
DROP POLICY IF EXISTS "class_members_read" ON class_members;
CREATE POLICY "class_members_read" ON class_members
  FOR SELECT USING (user_id = auth.uid());
