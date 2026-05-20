-- Performance optimization pass for CRUD speed:
-- 1) Add missing FK indexes reported by Supabase advisor
-- 2) Drop duplicate index on likes
-- 3) Reduce RLS per-row auth function re-evaluation on core hot tables

-- -----------------------------
-- 1) Missing foreign-key indexes
-- -----------------------------
CREATE INDEX IF NOT EXISTS idx_chat_background_history_user_id
  ON public.chat_background_history (user_id);

CREATE INDEX IF NOT EXISTS idx_comments_moderator_id
  ON public.comments (moderator_id);

CREATE INDEX IF NOT EXISTS idx_confessions_moderator_id
  ON public.confessions (moderator_id);

CREATE INDEX IF NOT EXISTS idx_group_announcements_created_by
  ON public.group_announcements (created_by);

CREATE INDEX IF NOT EXISTS idx_group_read_counters_last_read_message_id
  ON public.group_read_counters (last_read_message_id);

CREATE INDEX IF NOT EXISTS idx_role_inheritances_child_role_id
  ON public.role_inheritances (child_role_id);

CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id
  ON public.role_permissions (permission_id);

CREATE INDEX IF NOT EXISTS idx_system_notifications_created_by
  ON public.system_notifications (created_by);

CREATE INDEX IF NOT EXISTS idx_user_notifications_notification_id
  ON public.user_notifications (notification_id);

CREATE INDEX IF NOT EXISTS idx_user_roles_role_id
  ON public.user_roles (role_id);

-- -----------------------------
-- 2) Duplicate index cleanup
-- -----------------------------
DROP INDEX IF EXISTS public.idx_likes_user_confession;

-- -----------------------------
-- 3) RLS initplan optimization (hot-path policies only)
-- Keep same semantics, replace auth.* direct calls with (select auth.*()).
-- -----------------------------
DO $$
BEGIN
  -- confessions
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'confessions' AND policyname = 'Allow authenticated users to insert'
  ) THEN
    EXECUTE 'ALTER POLICY "Allow authenticated users to insert" ON public.confessions
      WITH CHECK ((select auth.role()) = ''authenticated'')';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'confessions' AND policyname = 'Allow owner to delete'
  ) THEN
    EXECUTE 'ALTER POLICY "Allow owner to delete" ON public.confessions
      USING ((select auth.uid()) = user_id)';
  END IF;

  -- likes
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'likes' AND policyname = 'Allow authenticated users to insert'
  ) THEN
    EXECUTE 'ALTER POLICY "Allow authenticated users to insert" ON public.likes
      WITH CHECK ((select auth.role()) = ''authenticated'')';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'likes' AND policyname = 'Allow owner to delete'
  ) THEN
    EXECUTE 'ALTER POLICY "Allow owner to delete" ON public.likes
      USING ((select auth.uid()) = user_id)';
  END IF;

  -- comments
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'comments' AND policyname = 'Allow owner to delete'
  ) THEN
    EXECUTE 'ALTER POLICY "Allow owner to delete" ON public.comments
      USING ((select auth.uid()) = user_id)';
  END IF;

  -- profiles
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Allow users to update their own profile'
  ) THEN
    EXECUTE 'ALTER POLICY "Allow users to update their own profile" ON public.profiles
      USING ((select auth.uid()) = id)
      WITH CHECK ((select auth.uid()) = id)';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Allow users to insert their own profile'
  ) THEN
    EXECUTE 'ALTER POLICY "Allow users to insert their own profile" ON public.profiles
      WITH CHECK ((select auth.uid()) = id)';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Allow users to delete their own profile'
  ) THEN
    EXECUTE 'ALTER POLICY "Allow users to delete their own profile" ON public.profiles
      USING ((select auth.uid()) = id)';
  END IF;

  -- friendships
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'friendships' AND policyname = 'Users can view their own friendships'
  ) THEN
    EXECUTE 'ALTER POLICY "Users can view their own friendships" ON public.friendships
      USING ((select auth.uid()) = user_id)';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'friendships' AND policyname = 'Users can delete their own friendships'
  ) THEN
    EXECUTE 'ALTER POLICY "Users can delete their own friendships" ON public.friendships
      USING ((select auth.uid()) = user_id)';
  END IF;
END
$$;
