-- Follow-up pass for remaining auth_rls_initplan warnings on active tables.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='group_members' AND policyname='Group owners can add members') THEN
    EXECUTE 'ALTER POLICY "Group owners can add members" ON public.group_members
      WITH CHECK (
        ((select auth.uid()) IN (
          SELECT gm.user_id
          FROM group_members gm
          WHERE gm.group_id = group_members.group_id
            AND gm.role = ANY (ARRAY[''owner''::text, ''admin''::text])
        ))
        OR ((select auth.uid()) IN (
          SELECT groups.creator_id
          FROM groups
          WHERE groups.id = group_members.group_id
        ))
      )';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='groups' AND policyname='Users can view groups they are members of or created') THEN
    EXECUTE 'ALTER POLICY "Users can view groups they are members of or created" ON public.groups
      USING (
        ((select auth.uid()) IN (
          SELECT group_members.user_id
          FROM group_members
          WHERE group_members.group_id = groups.id
        ))
        OR ((select auth.uid()) = creator_id)
      )';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='group_message_read_status' AND policyname='Users can view their own group message read status') THEN
    EXECUTE 'ALTER POLICY "Users can view their own group message read status" ON public.group_message_read_status
      USING ((select auth.uid()) = user_id)';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='group_message_read_status' AND policyname='Users can update their own group message read status') THEN
    EXECUTE 'ALTER POLICY "Users can update their own group message read status" ON public.group_message_read_status
      USING ((select auth.uid()) = user_id)';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='group_message_read_status' AND policyname='Users can insert group message read status') THEN
    EXECUTE 'ALTER POLICY "Users can insert group message read status" ON public.group_message_read_status
      WITH CHECK ((select auth.uid()) IN (
        SELECT group_members.user_id
        FROM group_members
        WHERE group_members.group_id = group_message_read_status.group_id
      ))';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='group_message_read_status' AND policyname='Admins can manage group message read status') THEN
    EXECUTE 'ALTER POLICY "Admins can manage group message read status" ON public.group_message_read_status
      USING ((select auth.uid()) IN (
        SELECT group_members.user_id
        FROM group_members
        WHERE group_members.group_id = group_message_read_status.group_id
          AND group_members.role = ANY (ARRAY[''owner''::text, ''admin''::text])
      ))';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='confession_images' AND policyname='Allow owner to update lock status') THEN
    EXECUTE 'ALTER POLICY "Allow owner to update lock status" ON public.confession_images
      USING (EXISTS (
        SELECT 1 FROM confessions
        WHERE confessions.id = confession_images.confession_id
          AND confessions.user_id = (select auth.uid())
      ))
      WITH CHECK (EXISTS (
        SELECT 1 FROM confessions
        WHERE confessions.id = confession_images.confession_id
          AND confessions.user_id = (select auth.uid())
      ))';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='chat_background_settings' AND policyname='Users can read their own background settings') THEN
    EXECUTE 'ALTER POLICY "Users can read their own background settings" ON public.chat_background_settings
      USING ((select auth.uid()) = user_id)';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='chat_background_settings' AND policyname='Users can create their own background settings') THEN
    EXECUTE 'ALTER POLICY "Users can create their own background settings" ON public.chat_background_settings
      WITH CHECK ((select auth.uid()) = user_id)';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='chat_background_settings' AND policyname='Users can update their own background settings') THEN
    EXECUTE 'ALTER POLICY "Users can update their own background settings" ON public.chat_background_settings
      USING ((select auth.uid()) = user_id)';
  END IF;
END
$$;
