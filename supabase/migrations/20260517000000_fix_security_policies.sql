-- Tighten policies that were previously open to every authenticated user.
-- Guard each table change so this migration can run safely across environments.

DO $$
BEGIN
  IF to_regclass('public.achievements') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Allow authenticated users to create achievements" ON achievements';
    EXECUTE 'DROP POLICY IF EXISTS "Allow authenticated users to update achievements" ON achievements';
    EXECUTE 'DROP POLICY IF EXISTS "Allow authenticated users to delete achievements" ON achievements';

    EXECUTE 'CREATE POLICY "Allow admins to create achievements" ON achievements FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true))';
    EXECUTE 'CREATE POLICY "Allow admins to update achievements" ON achievements FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)) WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true))';
    EXECUTE 'CREATE POLICY "Allow admins to delete achievements" ON achievements FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true))';
  END IF;

  IF to_regclass('public.user_interest_groups') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Allow authenticated users to manage group membership" ON user_interest_groups';
    EXECUTE 'DROP POLICY IF EXISTS "Allow users to read own interest group memberships" ON user_interest_groups';
    EXECUTE 'DROP POLICY IF EXISTS "Allow users to join interest groups as themselves" ON user_interest_groups';
    EXECUTE 'DROP POLICY IF EXISTS "Allow users to leave own interest groups" ON user_interest_groups';
    EXECUTE 'DROP POLICY IF EXISTS "Allow users to update own interest memberships" ON user_interest_groups';

    EXECUTE 'CREATE POLICY "Allow users to read own interest group memberships" ON user_interest_groups FOR SELECT TO authenticated USING (user_id = auth.uid())';
    EXECUTE 'CREATE POLICY "Allow users to join interest groups as themselves" ON user_interest_groups FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND role = ''member'')';
    EXECUTE 'CREATE POLICY "Allow users to leave own interest groups" ON user_interest_groups FOR DELETE TO authenticated USING (user_id = auth.uid())';
    EXECUTE 'CREATE POLICY "Allow users to update own interest memberships" ON user_interest_groups FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid() AND role = ''member'')';
  END IF;
END
$$;
