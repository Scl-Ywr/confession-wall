-- Final tail pass for remaining auth_rls_initplan warnings.

DO $$
BEGIN
  -- user_backgrounds
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_backgrounds' AND policyname='Users can only access their own background settings') THEN
    EXECUTE 'ALTER POLICY "Users can only access their own background settings" ON public.user_backgrounds
      USING ((select auth.uid()) = user_id)
      WITH CHECK ((select auth.uid()) = user_id)';
  END IF;

  -- system_notifications
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='system_notifications' AND policyname='Admins can manage system notifications') THEN
    EXECUTE 'ALTER POLICY "Admins can manage system notifications" ON public.system_notifications
      USING (EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = (select auth.uid())
          AND profiles.is_admin = true
      ))';
  END IF;

  -- user_notifications
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_notifications' AND policyname='Users can view their notifications') THEN
    EXECUTE 'ALTER POLICY "Users can view their notifications" ON public.user_notifications
      USING (user_id = (select auth.uid()))';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_notifications' AND policyname='Users can update their notifications') THEN
    EXECUTE 'ALTER POLICY "Users can update their notifications" ON public.user_notifications
      USING (user_id = (select auth.uid()))
      WITH CHECK (user_id = (select auth.uid()))';
  END IF;

  -- blog_posts
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='blog_posts' AND policyname='Only blog owner can create posts') THEN
    EXECUTE 'ALTER POLICY "Only blog owner can create posts" ON public.blog_posts
      WITH CHECK (
        (author_id = (select auth.uid()))
        AND (((select auth.jwt()) ->> ''email'') = ''3131618671@qq.com'')
      )';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='blog_posts' AND policyname='Only blog owner can update posts') THEN
    EXECUTE 'ALTER POLICY "Only blog owner can update posts" ON public.blog_posts
      USING (
        (author_id = (select auth.uid()))
        AND (((select auth.jwt()) ->> ''email'') = ''3131618671@qq.com'')
      )
      WITH CHECK (
        (author_id = (select auth.uid()))
        AND (((select auth.jwt()) ->> ''email'') = ''3131618671@qq.com'')
      )';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='blog_posts' AND policyname='Only blog owner can delete posts') THEN
    EXECUTE 'ALTER POLICY "Only blog owner can delete posts" ON public.blog_posts
      USING (
        (author_id = (select auth.uid()))
        AND (((select auth.jwt()) ->> ''email'') = ''3131618671@qq.com'')
      )';
  END IF;

  -- friendships
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='friendships' AND policyname='Authenticated users can create friendships') THEN
    EXECUTE 'ALTER POLICY "Authenticated users can create friendships" ON public.friendships
      WITH CHECK (
        ((select auth.uid()) IS NOT NULL)
        AND (((select auth.uid()) = user_id) OR ((select auth.uid()) = friend_id))
        AND (user_id IS NOT NULL)
        AND (friend_id IS NOT NULL)
        AND (user_id <> friend_id)
      )';
  END IF;

  -- notifications
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='notifications' AND policyname='Authenticated users can create notifications') THEN
    EXECUTE 'ALTER POLICY "Authenticated users can create notifications" ON public.notifications
      WITH CHECK (
        ((select auth.uid()) IS NOT NULL)
        AND (sender_id = (select auth.uid()))
        AND (recipient_id IS NOT NULL)
      )';
  END IF;
END
$$;
