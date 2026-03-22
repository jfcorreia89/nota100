-- Each invite code is single-use: track who consumed it
ALTER TABLE invite_codes
  ADD COLUMN used_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
