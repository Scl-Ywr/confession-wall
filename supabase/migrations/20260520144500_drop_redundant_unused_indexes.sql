-- Drop provably redundant indexes that are fully covered by unique/constraint indexes
-- or by a left-prefix composite index.

DROP INDEX IF EXISTS public.idx_hashtags_tag;
DROP INDEX IF EXISTS public.idx_likes_confession_user;
DROP INDEX IF EXISTS public.idx_profiles_username;

-- Covered by idx_confessions_category_id_created_at (left-prefix on category_id)
DROP INDEX IF EXISTS public.idx_confessions_category_id;
