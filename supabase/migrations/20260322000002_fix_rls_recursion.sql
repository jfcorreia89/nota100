-- Drop the recursive profiles_admin_read policy that causes infinite recursion.
-- profiles_own (auth.uid() = id) already covers self-reads.
-- Admin pages use service-role key (createAdminClient) which bypasses RLS.
DROP POLICY IF EXISTS "profiles_admin_read" ON profiles;
