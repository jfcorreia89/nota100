-- Fix: used_by should reference profiles(id), not auth.users(id),
-- so PostgREST can join invite_codes → profiles for the admin UI.
-- DROP + recreate is safe here (early dev, no production data to preserve).

ALTER TABLE invite_codes DROP COLUMN IF EXISTS used_by;

ALTER TABLE invite_codes
  ADD COLUMN used_by uuid REFERENCES profiles(id) ON DELETE SET NULL;
