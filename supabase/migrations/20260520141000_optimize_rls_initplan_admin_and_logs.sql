-- Optimize remaining auth_rls_initplan warnings on admin/log/auth-related tables.

DO $$
BEGIN
  -- chat_background_settings
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='chat_background_settings' AND policyname='Users can delete their own background settings') THEN
    EXECUTE 'ALTER POLICY "Users can delete their own background settings" ON public.chat_background_settings
      USING ((select auth.uid()) = user_id)';
  END IF;

  -- confession_hashtags
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='confession_hashtags' AND policyname='Allow authenticated users to create confession_hashtags') THEN
    EXECUTE 'ALTER POLICY "Allow authenticated users to create confession_hashtags" ON public.confession_hashtags
      WITH CHECK ((select auth.role()) = ''authenticated'')';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='confession_hashtags' AND policyname='Allow confession creators to delete confession_hashtags') THEN
    EXECUTE 'ALTER POLICY "Allow confession creators to delete confession_hashtags" ON public.confession_hashtags
      USING (EXISTS (
        SELECT 1
        FROM confessions
        WHERE confessions.id = confession_hashtags.confession_id
          AND confessions.user_id = (select auth.uid())
      ))';
  END IF;

  -- hashtags
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='hashtags' AND policyname='Allow authenticated users to create hashtags') THEN
    EXECUTE 'ALTER POLICY "Allow authenticated users to create hashtags" ON public.hashtags
      WITH CHECK ((select auth.role()) = ''authenticated'')';
  END IF;

  -- login_logs
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='login_logs' AND policyname='Allow users to insert their own login logs') THEN
    EXECUTE 'ALTER POLICY "Allow users to insert their own login logs" ON public.login_logs
      WITH CHECK ((select auth.uid()) = user_id)';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='login_logs' AND policyname='Allow users to view their own login logs') THEN
    EXECUTE 'ALTER POLICY "Allow users to view their own login logs" ON public.login_logs
      USING ((select auth.uid()) = user_id)';
  END IF;

  -- online_sessions
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='online_sessions' AND policyname='Allow users to insert their own online sessions') THEN
    EXECUTE 'ALTER POLICY "Allow users to insert their own online sessions" ON public.online_sessions
      WITH CHECK ((select auth.uid()) = user_id)';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='online_sessions' AND policyname='Allow users to update their own online sessions') THEN
    EXECUTE 'ALTER POLICY "Allow users to update their own online sessions" ON public.online_sessions
      USING ((select auth.uid()) = user_id)';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='online_sessions' AND policyname='Allow users to view their own online sessions') THEN
    EXECUTE 'ALTER POLICY "Allow users to view their own online sessions" ON public.online_sessions
      USING ((select auth.uid()) = user_id)';
  END IF;

  -- admin-managed tables
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='system_settings' AND policyname='Allow admins to read system settings') THEN
    EXECUTE 'ALTER POLICY "Allow admins to read system settings" ON public.system_settings
      USING (EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = (select auth.uid())
          AND profiles.is_admin = true
      ))';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='system_settings' AND policyname='Allow admins to update system settings') THEN
    EXECUTE 'ALTER POLICY "Allow admins to update system settings" ON public.system_settings
      USING (EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = (select auth.uid())
          AND profiles.is_admin = true
      ))';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='roles' AND policyname='Allow admins to manage roles') THEN
    EXECUTE 'ALTER POLICY "Allow admins to manage roles" ON public.roles
      USING (EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = (select auth.uid())
          AND profiles.is_admin = true
      ))';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='permissions' AND policyname='Allow admins to manage permissions') THEN
    EXECUTE 'ALTER POLICY "Allow admins to manage permissions" ON public.permissions
      USING (EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = (select auth.uid())
          AND profiles.is_admin = true
      ))';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='role_permissions' AND policyname='Allow admins to manage role permissions') THEN
    EXECUTE 'ALTER POLICY "Allow admins to manage role permissions" ON public.role_permissions
      USING (EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = (select auth.uid())
          AND profiles.is_admin = true
      ))';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='role_inheritances' AND policyname='Allow admins to manage role inheritances') THEN
    EXECUTE 'ALTER POLICY "Allow admins to manage role inheritances" ON public.role_inheritances
      USING (EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = (select auth.uid())
          AND profiles.is_admin = true
      ))';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_roles' AND policyname='Allow admins to manage user roles') THEN
    EXECUTE 'ALTER POLICY "Allow admins to manage user roles" ON public.user_roles
      USING (EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = (select auth.uid())
          AND profiles.is_admin = true
      ))';
  END IF;

  -- service-role scoped table
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_identity_mapping' AND policyname='Allow service role to read all mappings') THEN
    EXECUTE 'ALTER POLICY "Allow service role to read all mappings" ON public.user_identity_mapping
      USING ((select auth.role()) = ''service_role'')';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_identity_mapping' AND policyname='Allow service role to insert mappings') THEN
    EXECUTE 'ALTER POLICY "Allow service role to insert mappings" ON public.user_identity_mapping
      WITH CHECK ((select auth.role()) = ''service_role'')';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_identity_mapping' AND policyname='Allow service role to update mappings') THEN
    EXECUTE 'ALTER POLICY "Allow service role to update mappings" ON public.user_identity_mapping
      USING ((select auth.role()) = ''service_role'')';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_identity_mapping' AND policyname='Allow service role to delete mappings') THEN
    EXECUTE 'ALTER POLICY "Allow service role to delete mappings" ON public.user_identity_mapping
      USING ((select auth.role()) = ''service_role'')';
  END IF;

  -- user_points
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_points' AND policyname='Allow users to view their own points') THEN
    EXECUTE 'ALTER POLICY "Allow users to view their own points" ON public.user_points
      USING ((select auth.uid()) = user_id)';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_points' AND policyname='Allow users to update their own points') THEN
    EXECUTE 'ALTER POLICY "Allow users to update their own points" ON public.user_points
      USING ((select auth.uid()) = user_id)';
  END IF;
END
$$;
