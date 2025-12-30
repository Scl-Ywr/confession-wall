-- ================================================================
-- Redis 缓存优化配套数据库索引优化脚本
-- ================================================================
-- 说明：配合 Redis 缓存系统优化，创建数据库索引提升查询性能
-- 执行环境：Supabase SQL Editor
-- 创建时间：2025-12-30
-- ================================================================

-- 1. 评论查询优化索引
-- ================================================================

-- 评论列表查询索引（优化 confession_id 查询并支持按创建时间排序）
CREATE INDEX IF NOT EXISTS idx_comments_confession_id_created_at
ON comments(confession_id, created_at DESC);

COMMENT ON INDEX idx_comments_confession_id_created_at IS
'评论列表查询索引：优化按告白ID获取评论并按时间排序的查询';

-- 用户评论历史索引
CREATE INDEX IF NOT EXISTS idx_comments_user_id_created_at
ON comments(user_id, created_at DESC);

COMMENT ON INDEX idx_comments_user_id_created_at IS
'用户评论历史索引：优化查询用户的所有评论';

-- ================================================================
-- 2. 搜索优化索引
-- ================================================================

-- 全文搜索索引（内容搜索）
CREATE INDEX IF NOT EXISTS idx_confessions_content_gin
ON confessions USING gin(to_tsvector('simple', content));

COMMENT ON INDEX idx_confessions_content_gin IS
'全文搜索索引：使用 GIN 索引优化内容模糊搜索性能';

-- 用户名搜索索引（不区分大小写）
CREATE INDEX IF NOT EXISTS idx_profiles_username_lower
ON profiles(LOWER(username));

COMMENT ON INDEX idx_profiles_username_lower IS
'用户名搜索索引：优化用户名模糊搜索（不区分大小写）';

-- ================================================================
-- 3. 标签和分类查询优化
-- ================================================================

-- 标签关联索引
CREATE INDEX IF NOT EXISTS idx_confession_hashtags_hashtag_id
ON confession_hashtags(hashtag_id);

COMMENT ON INDEX idx_confession_hashtags_hashtag_id IS
'标签关联索引：优化按标签ID查询告白';

-- 标签使用量索引（热门标签）
CREATE INDEX IF NOT EXISTS idx_hashtags_usage_count
ON hashtags(usage_count DESC);

COMMENT ON INDEX idx_hashtags_usage_count IS
'标签使用量索引：优化热门标签查询';

-- 分类查询索引
CREATE INDEX IF NOT EXISTS idx_confessions_category_id_created_at
ON confessions(category_id, created_at DESC);

COMMENT ON INDEX idx_confessions_category_id_created_at IS
'分类查询索引：优化按分类ID获取告白并按时间排序';

-- ================================================================
-- 4. 点赞查询优化
-- ================================================================

-- 点赞状态查询索引（复合索引）
CREATE INDEX IF NOT EXISTS idx_likes_user_id_confession_id
ON likes(user_id, confession_id);

COMMENT ON INDEX idx_likes_user_id_confession_id IS
'点赞状态索引：优化查询用户对特定告白的点赞状态';

-- 告白点赞数统计索引
CREATE INDEX IF NOT EXISTS idx_likes_confession_id
ON likes(confession_id);

COMMENT ON INDEX idx_likes_confession_id IS
'告白点赞数索引：优化统计告白的点赞数量';

-- ================================================================
-- 5. 其他常用查询优化
-- ================================================================

-- 用户告白列表索引
CREATE INDEX IF NOT EXISTS idx_confessions_user_id_created_at
ON confessions(user_id, created_at DESC);

COMMENT ON INDEX idx_confessions_user_id_created_at IS
'用户告白列表索引：优化查询用户的所有告白';

-- 通知查询索引
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_created
ON notifications(recipient_id, created_at DESC);

COMMENT ON INDEX idx_notifications_recipient_created IS
'通知列表索引：优化查询用户的通知列表';

-- 未读通知索引（部分索引，仅索引未读通知）
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread
ON notifications(recipient_id, read_status)
WHERE read_status = false;

COMMENT ON INDEX idx_notifications_recipient_unread IS
'未读通知索引：优化查询用户的未读通知数量（部分索引）';

-- ================================================================
-- 6. 索引性能监控查询
-- ================================================================

-- 查看所有索引使用情况
-- 执行此查询可监控索引效率
/*
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
*/

-- 查看表和索引大小
-- 执行此查询可监控存储空间使用
/*
SELECT
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS indexes_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
*/

-- 查看缺失的索引建议（需要 pg_stat_statements 扩展）
-- 执行此查询可发现可能需要的新索引
/*
SELECT
  schemaname,
  tablename,
  attname,
  n_distinct,
  correlation
FROM pg_stats
WHERE schemaname = 'public'
  AND n_distinct > 100
  AND correlation < 0.1
ORDER BY n_distinct DESC;
*/

-- ================================================================
-- 7. 索引维护建议
-- ================================================================

/*
定期维护任务：

1. 重建索引（避免索引膨胀）：
   REINDEX INDEX CONCURRENTLY idx_comments_confession_id_created_at;

2. 分析表（更新统计信息）：
   ANALYZE comments;
   ANALYZE confessions;
   ANALYZE profiles;

3. 清理死元组（可选）：
   VACUUM ANALYZE comments;

建议频率：
- 生产环境：每周执行一次
- 高负载环境：每天执行一次
*/

-- ================================================================
-- 执行说明
-- ================================================================

/*
1. 在 Supabase SQL Editor 中执行此脚本
2. 执行完成后，运行 ANALYZE 命令更新统计信息：
   ANALYZE comments;
   ANALYZE confessions;
   ANALYZE profiles;
   ANALYZE likes;
   ANALYZE hashtags;
   ANALYZE confession_hashtags;
   ANALYZE notifications;

3. 使用 EXPLAIN ANALYZE 验证查询计划：
   EXPLAIN ANALYZE
   SELECT * FROM comments
   WHERE confession_id = 'xxx'
   ORDER BY created_at DESC
   LIMIT 20;

4. 预期效果：
   - 评论查询：Seq Scan -> Index Scan (成本降低 80%+)
   - 搜索查询：Seq Scan -> Bitmap Index Scan (成本降低 70%+)
   - 点赞查询：Seq Scan -> Index Only Scan (成本降低 90%+)
*/
