-- Reduce per-row auth function re-evaluation in remaining RLS policies.
-- No authorization semantics are changed; only auth function invocation form.

DO $$
BEGIN
  -- confession_images
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='confession_images' AND policyname='Allow authenticated users to insert') THEN
    EXECUTE 'ALTER POLICY "Allow authenticated users to insert" ON public.confession_images
      WITH CHECK ((select auth.role()) = ''authenticated'')';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='confession_images' AND policyname='Allow owner to delete') THEN
    EXECUTE 'ALTER POLICY "Allow owner to delete" ON public.confession_images
      USING (EXISTS (
        SELECT 1 FROM confessions
        WHERE confessions.id = confession_images.confession_id
          AND confessions.user_id = (select auth.uid())
      ))';
  END IF;

  -- groups
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='groups' AND policyname='Users can create groups') THEN
    EXECUTE 'ALTER POLICY "Users can create groups" ON public.groups
      WITH CHECK ((select auth.uid()) = creator_id)';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='groups' AND policyname='Group owners can update groups') THEN
    EXECUTE 'ALTER POLICY "Group owners can update groups" ON public.groups
      USING ((select auth.uid()) = creator_id)';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='groups' AND policyname='Group owners can delete groups') THEN
    EXECUTE 'ALTER POLICY "Group owners can delete groups" ON public.groups
      USING ((select auth.uid()) = creator_id)';
  END IF;

  -- group_announcements
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='group_announcements' AND policyname='Users can view group announcements') THEN
    EXECUTE 'ALTER POLICY "Users can view group announcements" ON public.group_announcements
      USING ((select auth.uid()) IN (
        SELECT group_members.user_id
        FROM group_members
        WHERE group_members.group_id = group_announcements.group_id
      ))';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='group_announcements' AND policyname='Group owners can create announcements') THEN
    EXECUTE 'ALTER POLICY "Group owners can create announcements" ON public.group_announcements
      WITH CHECK ((select auth.uid()) IN (
        SELECT group_members.user_id
        FROM group_members
        WHERE group_members.group_id = group_announcements.group_id
          AND group_members.role = ANY (ARRAY[''owner''::text, ''admin''::text])
      ))';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='group_announcements' AND policyname='Group owners can update announcements') THEN
    EXECUTE 'ALTER POLICY "Group owners can update announcements" ON public.group_announcements
      USING ((select auth.uid()) IN (
        SELECT group_members.user_id
        FROM group_members
        WHERE group_members.group_id = group_announcements.group_id
          AND group_members.role = ANY (ARRAY[''owner''::text, ''admin''::text])
      ))';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='group_announcements' AND policyname='Group owners can delete announcements') THEN
    EXECUTE 'ALTER POLICY "Group owners can delete announcements" ON public.group_announcements
      USING ((select auth.uid()) IN (
        SELECT group_members.user_id
        FROM group_members
        WHERE group_members.group_id = group_announcements.group_id
          AND group_members.role = ANY (ARRAY[''owner''::text, ''admin''::text])
      ))';
  END IF;

  -- group_message_read_status
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='group_message_read_status' AND policyname='Users can delete their own group message read status') THEN
    EXECUTE 'ALTER POLICY "Users can delete their own group message read status" ON public.group_message_read_status
      USING ((select auth.uid()) = user_id)';
  END IF;

  -- chat_background_history
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='chat_background_history' AND policyname='Users can read their own background history') THEN
    EXECUTE 'ALTER POLICY "Users can read their own background history" ON public.chat_background_history
      USING ((select auth.uid()) = user_id)';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='chat_background_history' AND policyname='Users can create their own background history') THEN
    EXECUTE 'ALTER POLICY "Users can create their own background history" ON public.chat_background_history
      WITH CHECK ((select auth.uid()) = user_id)';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='chat_background_history' AND policyname='Users can update their own background history') THEN
    EXECUTE 'ALTER POLICY "Users can update their own background history" ON public.chat_background_history
      USING ((select auth.uid()) = user_id)';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='chat_background_history' AND policyname='Users can delete their own background history') THEN
    EXECUTE 'ALTER POLICY "Users can delete their own background history" ON public.chat_background_history
      USING ((select auth.uid()) = user_id)';
  END IF;

  -- notifications
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='notifications' AND policyname='Users can view their own notifications') THEN
    EXECUTE 'ALTER POLICY "Users can view their own notifications" ON public.notifications
      USING ((select auth.uid()) = recipient_id)';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='notifications' AND policyname='Users can update their own notifications') THEN
    EXECUTE 'ALTER POLICY "Users can update their own notifications" ON public.notifications
      USING ((select auth.uid()) = recipient_id)';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='notifications' AND policyname='Users can delete their own notifications') THEN
    EXECUTE 'ALTER POLICY "Users can delete their own notifications" ON public.notifications
      USING ((select auth.uid()) = recipient_id)';
  END IF;

  -- group_members
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='group_members' AND policyname='Group owners can remove members') THEN
    EXECUTE 'ALTER POLICY "Group owners can remove members" ON public.group_members
      USING (
        ((select auth.uid()) IN (
          SELECT gm.user_id
          FROM group_members gm
          WHERE gm.group_id = group_members.group_id
            AND gm.role = ANY (ARRAY[''owner''::text, ''admin''::text])
        ))
        OR ((select auth.uid()) = user_id)
      )';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='group_members' AND policyname='Group owners can update member roles') THEN
    EXECUTE 'ALTER POLICY "Group owners can update member roles" ON public.group_members
      USING ((select auth.uid()) IN (
        SELECT gm.user_id
        FROM group_members gm
        WHERE gm.group_id = group_members.group_id
          AND gm.role = ANY (ARRAY[''owner''::text, ''admin''::text])
      ))';
  END IF;

  -- group_read_counters
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='group_read_counters' AND policyname='Enable access for individual users') THEN
    EXECUTE 'ALTER POLICY "Enable access for individual users" ON public.group_read_counters
      USING (user_id = (select auth.uid()))
      WITH CHECK (user_id = (select auth.uid()))';
  END IF;

  -- chat_messages
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='chat_messages' AND policyname='Users can delete their own chat messages') THEN
    EXECUTE 'ALTER POLICY "Users can delete their own chat messages" ON public.chat_messages
      USING (
        ((select auth.uid()) = sender_id)
        OR (
          group_id IS NOT NULL
          AND EXISTS (
            SELECT 1
            FROM group_members
            WHERE group_members.group_id = chat_messages.group_id
              AND group_members.user_id = (select auth.uid())
              AND (group_members.role = ''owner''::text OR group_members.role = ''admin''::text)
          )
        )
      )';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='chat_messages' AND policyname='Users can update their own chat messages') THEN
    EXECUTE 'ALTER POLICY "Users can update their own chat messages" ON public.chat_messages
      USING (
        ((select auth.uid()) = sender_id)
        OR (((select auth.uid()) = receiver_id) AND (is_read IS NOT NULL))
        OR (
          group_id IS NOT NULL
          AND EXISTS (
            SELECT 1
            FROM group_members
            WHERE group_members.group_id = chat_messages.group_id
              AND group_members.user_id = (select auth.uid())
              AND (group_members.role = ''owner''::text OR group_members.role = ''admin''::text)
          )
        )
      )
      WITH CHECK (
        ((select auth.uid()) = sender_id)
        OR (((select auth.uid()) = receiver_id) AND (is_read IS NOT NULL))
        OR (
          group_id IS NOT NULL
          AND EXISTS (
            SELECT 1
            FROM group_members
            WHERE group_members.group_id = chat_messages.group_id
              AND group_members.user_id = (select auth.uid())
              AND (group_members.role = ''owner''::text OR group_members.role = ''admin''::text)
          )
        )
      )';
  END IF;
END
$$;
