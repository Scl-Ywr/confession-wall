-- 添加缺失的数据库函数以支持数据显示
-- 创建日期: 2025-12-27

-- 获取用户的表白列表
CREATE OR REPLACE FUNCTION public.get_confessions_by_user(
  user_id_param uuid,
  limit_count integer DEFAULT 20,
  offset_count integer DEFAULT 0
)
RETURNS TABLE(
  id uuid,
  content text,
  is_anonymous boolean,
  user_id uuid,
  created_at timestamp with time zone,
  likes_count bigint,
  comments_count bigint,
  status character varying,
  category_id uuid
)
LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.content,
    c.is_anonymous,
    c.user_id,
    c.created_at,
    c.likes_count,
    c.comments_count,
    c.status,
    c.category_id
  FROM confessions c
  WHERE c.user_id = user_id_param
  ORDER BY c.created_at DESC
  LIMIT limit_count OFFSET offset_count;
END;
$function$;

-- 获取所有已审核的表白（带分页）
CREATE OR REPLACE FUNCTION public.get_approved_confessions(
  limit_count integer DEFAULT 20,
  offset_count integer DEFAULT 0
)
RETURNS TABLE(
  id uuid,
  content text,
  is_anonymous boolean,
  user_id uuid,
  created_at timestamp with time zone,
  likes_count bigint,
  comments_count bigint,
  category_id uuid
)
LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.content,
    c.is_anonymous,
    c.user_id,
    c.created_at,
    c.likes_count,
    c.comments_count,
    c.category_id
  FROM confessions c
  WHERE c.status = 'approved'
  ORDER BY c.created_at DESC
  LIMIT limit_count OFFSET offset_count;
END;
$function$;

-- 获取表白详情（包含图片、标签、分类等信息）
CREATE OR REPLACE FUNCTION public.get_confession_details(
  confession_id uuid
)
RETURNS TABLE(
  id uuid,
  content text,
  is_anonymous boolean,
  user_id uuid,
  created_at timestamp with time zone,
  likes_count bigint,
  comments_count bigint,
  status character varying,
  category_id uuid,
  category_name character varying,
  category_color character varying,
  images text[],
  hashtags text[]
)
LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.content,
    c.is_anonymous,
    c.user_id,
    c.created_at,
    c.likes_count,
    c.comments_count,
    c.status,
    c.category_id,
    cat.name as category_name,
    cat.color as category_color,
    ARRAY(
      SELECT ci.image_url 
      FROM confession_images ci 
      WHERE ci.confession_id = c.id 
      ORDER BY ci.created_at
    ) as images,
    ARRAY(
      SELECT h.tag 
      FROM confession_hashtags ch 
      JOIN hashtags h ON ch.hashtag_id = h.id 
      WHERE ch.confession_id = c.id
      ORDER BY h.tag
    ) as hashtags
  FROM confessions c
  LEFT JOIN confession_categories cat ON c.category_id = cat.id
  WHERE c.id = confession_id;
END;
$function$;

-- 获取表白评论（带用户信息）
CREATE OR REPLACE FUNCTION public.get_confession_comments(
  confession_id uuid,
  limit_count integer DEFAULT 20,
  offset_count integer DEFAULT 0
)
RETURNS TABLE(
  id uuid,
  content text,
  is_anonymous boolean,
  user_id uuid,
  created_at timestamp with time zone,
  status character varying,
  username character varying,
  display_name character varying,
  avatar_url text
)
LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.content,
    c.is_anonymous,
    c.user_id,
    c.created_at,
    c.status,
    p.username,
    p.display_name,
    p.avatar_url
  FROM comments c
  LEFT JOIN profiles p ON c.user_id = p.id
  WHERE c.confession_id = confession_id
    AND c.status = 'approved'
  ORDER BY c.created_at ASC
  LIMIT limit_count OFFSET offset_count;
END;
$function$;

-- 获取用户统计信息
CREATE OR REPLACE FUNCTION public.get_user_stats(
  user_id_param uuid
)
RETURNS TABLE(
  confession_count bigint,
  like_count bigint,
  comment_count bigint,
  friend_count bigint
)
LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM confessions WHERE user_id = user_id_param) as confession_count,
    (SELECT COUNT(*) FROM likes WHERE user_id = user_id_param) as like_count,
    (SELECT COUNT(*) FROM comments WHERE user_id = user_id_param) as comment_count,
    (SELECT COUNT(*) FROM friendships WHERE user_id = user_id_param OR friend_id = user_id_param) as friend_count;
END;
$function$;

-- 获取热门标签
CREATE OR REPLACE FUNCTION public.get_popular_hashtags(
  limit_count integer DEFAULT 10
)
RETURNS TABLE(
  tag text,
  count bigint
)
LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    h.tag,
    COUNT(ch.confession_id) as count
  FROM hashtags h
  JOIN confession_hashtags ch ON h.id = ch.hashtag_id
  GROUP BY h.tag
  ORDER BY count DESC
  LIMIT limit_count;
END;
$function$;

-- 获取热门分类
CREATE OR REPLACE FUNCTION public.get_popular_categories(
  limit_count integer DEFAULT 10
)
RETURNS TABLE(
  id uuid,
  name character varying,
  color character varying,
  count bigint
)
LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    cat.id,
    cat.name,
    cat.color,
    COUNT(c.id) as count
  FROM confession_categories cat
  LEFT JOIN confessions c ON cat.id = c.category_id
    AND c.status = 'approved'
  GROUP BY cat.id, cat.name, cat.color
  ORDER BY count DESC
  LIMIT limit_count;
END;
$function$;

-- 搜索表白（按内容）
CREATE OR REPLACE FUNCTION public.search_confessions(
  search_text text,
  limit_count integer DEFAULT 20,
  offset_count integer DEFAULT 0
)
RETURNS TABLE(
  id uuid,
  content text,
  is_anonymous boolean,
  user_id uuid,
  created_at timestamp with time zone,
  likes_count bigint,
  comments_count bigint,
  category_id uuid
)
LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.content,
    c.is_anonymous,
    c.user_id,
    c.created_at,
    c.likes_count,
    c.comments_count,
    c.category_id
  FROM confessions c
  WHERE c.status = 'approved'
    AND (
      c.content ILIKE '%' || search_text || '%'
    )
  ORDER BY c.created_at DESC
  LIMIT limit_count OFFSET offset_count;
END;
$function$;

-- 获取用户的好友列表（带在线状态）
CREATE OR REPLACE FUNCTION public.get_user_friends(
  user_id_param uuid
)
RETURNS TABLE(
  friend_id uuid,
  username character varying,
  display_name character varying,
  avatar_url text,
  online_status character varying,
  last_seen timestamp with time zone,
  friendship_created_at timestamp with time zone
)
LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    CASE 
      WHEN f.user_id = user_id_param THEN f.friend_id
      ELSE f.user_id
    END as friend_id,
    p.username,
    p.display_name,
    p.avatar_url,
    p.online_status,
    p.last_seen,
    f.created_at as friendship_created_at
  FROM friendships f
  JOIN profiles p ON (
    CASE 
      WHEN f.user_id = user_id_param THEN f.friend_id
      ELSE f.user_id
    END = p.id
  )
  WHERE f.user_id = user_id_param OR f.friend_id = user_id_param
  ORDER BY p.last_seen DESC;
END;
$function$;

-- 获取用户的群组列表
CREATE OR REPLACE FUNCTION public.get_user_groups(
  user_id_param uuid
)
RETURNS TABLE(
  group_id uuid,
  group_name character varying,
  group_description text,
  group_avatar_url text,
  member_count integer,
  unread_count bigint,
  role character varying,
  joined_at timestamp with time zone
)
LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    g.id as group_id,
    g.name as group_name,
    g.description as group_description,
    g.avatar_url as group_avatar_url,
    g.member_count,
    COALESCE(
      (
        SELECT COUNT(*)
        FROM chat_messages cm
        JOIN group_message_read_status gmrs ON cm.id = gmrs.message_id
        WHERE cm.group_id = g.id
          AND gmrs.user_id = user_id_param
          AND gmrs.is_read = false
      ),
      0
    ) as unread_count,
    gm.role,
    gm.joined_at
  FROM groups g
  JOIN group_members gm ON g.id = gm.group_id
  WHERE gm.user_id = user_id_param
  ORDER BY gm.joined_at DESC;
END;
$function$;
