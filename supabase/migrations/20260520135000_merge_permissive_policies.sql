-- Merge overlapping permissive policies to reduce per-query policy evaluation cost.

DO $$
BEGIN
  -- comments: merge UPDATE policies (owner + admin)
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='comments' AND policyname='Allow admins to moderate')
     AND EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='comments' AND policyname='Allow owner to update') THEN
    EXECUTE 'DROP POLICY "Allow admins to moderate" ON public.comments';
    EXECUTE 'DROP POLICY "Allow owner to update" ON public.comments';
    EXECUTE 'CREATE POLICY "Allow owner_or_admin to update"
      ON public.comments
      FOR UPDATE
      TO public
      USING (
        ((select auth.uid()) = user_id)
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = (select auth.uid())
            AND profiles.is_admin = true
        )
      )
      WITH CHECK (
        ((select auth.uid()) = user_id)
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = (select auth.uid())
            AND profiles.is_admin = true
        )
      )';
  END IF;

  -- confessions: merge UPDATE policies (owner + admin)
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='confessions' AND policyname='Allow admins to moderate')
     AND EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='confessions' AND policyname='Allow owner to update') THEN
    EXECUTE 'DROP POLICY "Allow admins to moderate" ON public.confessions';
    EXECUTE 'DROP POLICY "Allow owner to update" ON public.confessions';
    EXECUTE 'CREATE POLICY "Allow owner_or_admin to update"
      ON public.confessions
      FOR UPDATE
      TO public
      USING (
        ((select auth.uid()) = user_id)
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = (select auth.uid())
            AND profiles.is_admin = true
        )
      )
      WITH CHECK (
        ((select auth.uid()) = user_id)
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = (select auth.uid())
            AND profiles.is_admin = true
        )
      )';
  END IF;

  -- logs: merge SELECT policies (admin + own)
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='logs' AND policyname='Allow admins to view logs')
     AND EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='logs' AND policyname='Allow users to view their own logs') THEN
    EXECUTE 'DROP POLICY "Allow admins to view logs" ON public.logs';
    EXECUTE 'DROP POLICY "Allow users to view their own logs" ON public.logs';
    EXECUTE 'CREATE POLICY "Allow owner_or_admin to view logs"
      ON public.logs
      FOR SELECT
      TO public
      USING (
        ((select auth.uid()) = user_id)
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = (select auth.uid())
            AND profiles.is_admin = true
        )
      )';
  END IF;

  -- blog_posts: merge authenticated SELECT policies to one
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='blog_posts' AND policyname='Anyone can read published blog posts')
     AND EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='blog_posts' AND policyname='Blog author can read all own posts') THEN
    EXECUTE 'DROP POLICY "Blog author can read all own posts" ON public.blog_posts';
    EXECUTE 'DROP POLICY "Anyone can read published blog posts" ON public.blog_posts';
    EXECUTE 'CREATE POLICY "Read published_or_own_blog_posts"
      ON public.blog_posts
      FOR SELECT
      TO anon, authenticated
      USING (
        (status = ''published''::text)
        OR (
          (author_id = (select auth.uid()))
          AND (((select auth.jwt()) ->> ''email'') = ''3131618671@qq.com'')
        )
      )';
  END IF;

  -- group_message_read_status: replace overlapping policies with merged per-command policies
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='group_message_read_status' AND policyname='Admins can manage group message read status') THEN
    EXECUTE 'DROP POLICY "Admins can manage group message read status" ON public.group_message_read_status';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='group_message_read_status' AND policyname='Users can view their own group message read status') THEN
    EXECUTE 'DROP POLICY "Users can view their own group message read status" ON public.group_message_read_status';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='group_message_read_status' AND policyname='Users can insert group message read status') THEN
    EXECUTE 'DROP POLICY "Users can insert group message read status" ON public.group_message_read_status';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='group_message_read_status' AND policyname='Users can update their own group message read status') THEN
    EXECUTE 'DROP POLICY "Users can update their own group message read status" ON public.group_message_read_status';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='group_message_read_status' AND policyname='Users can delete their own group message read status') THEN
    EXECUTE 'DROP POLICY "Users can delete their own group message read status" ON public.group_message_read_status';
  END IF;

  EXECUTE 'CREATE POLICY "Read group message read status"
    ON public.group_message_read_status
    FOR SELECT
    TO authenticated
    USING (
      ((select auth.uid()) = user_id)
      OR ((select auth.uid()) IN (
        SELECT group_members.user_id
        FROM group_members
        WHERE group_members.group_id = group_message_read_status.group_id
          AND group_members.role = ANY (ARRAY[''owner''::text, ''admin''::text])
      ))
    )';

  EXECUTE 'CREATE POLICY "Insert group message read status"
    ON public.group_message_read_status
    FOR INSERT
    TO authenticated
    WITH CHECK (
      ((select auth.uid()) IN (
        SELECT group_members.user_id
        FROM group_members
        WHERE group_members.group_id = group_message_read_status.group_id
      ))
      OR ((select auth.uid()) IN (
        SELECT group_members.user_id
        FROM group_members
        WHERE group_members.group_id = group_message_read_status.group_id
          AND group_members.role = ANY (ARRAY[''owner''::text, ''admin''::text])
      ))
    )';

  EXECUTE 'CREATE POLICY "Update group message read status"
    ON public.group_message_read_status
    FOR UPDATE
    TO authenticated
    USING (
      ((select auth.uid()) = user_id)
      OR ((select auth.uid()) IN (
        SELECT group_members.user_id
        FROM group_members
        WHERE group_members.group_id = group_message_read_status.group_id
          AND group_members.role = ANY (ARRAY[''owner''::text, ''admin''::text])
      ))
    )
    WITH CHECK (
      ((select auth.uid()) = user_id)
      OR ((select auth.uid()) IN (
        SELECT group_members.user_id
        FROM group_members
        WHERE group_members.group_id = group_message_read_status.group_id
          AND group_members.role = ANY (ARRAY[''owner''::text, ''admin''::text])
      ))
    )';

  EXECUTE 'CREATE POLICY "Delete group message read status"
    ON public.group_message_read_status
    FOR DELETE
    TO authenticated
    USING (
      ((select auth.uid()) = user_id)
      OR ((select auth.uid()) IN (
        SELECT group_members.user_id
        FROM group_members
        WHERE group_members.group_id = group_message_read_status.group_id
          AND group_members.role = ANY (ARRAY[''owner''::text, ''admin''::text])
      ))
    )';
END
$$;
