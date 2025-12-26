-- 优化查询性能的数据库索引
-- 创建时间: 2025-12-27

-- 1. notifications表索引 - 优化通知列表查询
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_created 
ON notifications(recipient_id, created_at DESC);

-- 2. comments表索引 - 优化评论列表查询
CREATE INDEX IF NOT EXISTS idx_comments_confession_created 
ON comments(confession_id, created_at ASC);

-- 3. friendships表索引 - 优化好友列表查询
CREATE INDEX IF NOT EXISTS idx_friendships_user_updated 
ON friendships(user_id, updated_at DESC);

-- 4. group_members表索引 - 优化群成员列表查询
CREATE INDEX IF NOT EXISTS idx_group_members_group_joined 
ON group_members(group_id, joined_at ASC);

-- 5. group_message_read_status表索引 - 优化群聊未读消息查询
CREATE INDEX IF NOT EXISTS idx_group_message_read_status_user_group 
ON group_message_read_status(user_id, group_id, is_read);

-- 6. chat_messages表索引 - 优化聊天消息查询
CREATE INDEX IF NOT EXISTS idx_chat_messages_receiver_created 
ON chat_messages(receiver_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_messages_group_created 
ON chat_messages(group_id, created_at DESC);

-- 7. confession_images表索引 - 优化表白图片查询
CREATE INDEX IF NOT EXISTS idx_confession_images_confession 
ON confession_images(confession_id);

-- 8. confession_hashtags表索引 - 优化话题标签查询
CREATE INDEX IF NOT EXISTS idx_confession_hashtags_hashtag 
ON confession_hashtags(hashtag_id);

-- 9. group_members表索引 - 优化群成员查询
CREATE INDEX IF NOT EXISTS idx_group_members_user_joined 
ON group_members(user_id, joined_at DESC);

-- 10. likes表索引 - 优化点赞查询
CREATE INDEX IF NOT EXISTS idx_likes_user_confession 
ON likes(user_id, confession_id);

-- 11. confessions表索引 - 优化表白列表查询
CREATE INDEX IF NOT EXISTS idx_confessions_user_created 
ON confessions(user_id, created_at DESC);

-- 12. user_roles表索引 - 优化用户角色查询
CREATE INDEX IF NOT EXISTS idx_user_roles_user 
ON user_roles(user_id);

-- 13. role_permissions表索引 - 优化角色权限查询
CREATE INDEX IF NOT EXISTS idx_role_permissions_role 
ON role_permissions(role_id);

-- 14. login_attempts表索引 - 优化登录尝试查询
CREATE INDEX IF NOT EXISTS idx_login_attempts_email_created 
ON login_attempts(email, created_at DESC);

-- 15. profiles表索引 - 优化用户资料查询
CREATE INDEX IF NOT EXISTS idx_profiles_username 
ON profiles(username);

CREATE INDEX IF NOT EXISTS idx_profiles_display_name 
ON profiles(display_name);

-- 添加索引使用说明
COMMENT ON INDEX idx_notifications_recipient_created IS '优化通知列表查询 - 按接收者和创建时间排序';
COMMENT ON INDEX idx_comments_confession_created IS '优化评论列表查询 - 按表白ID和创建时间排序';
COMMENT ON INDEX idx_friendships_user_updated IS '优化好友列表查询 - 按用户ID和更新时间排序';
COMMENT ON INDEX idx_group_members_group_joined IS '优化群成员列表查询 - 按群ID和加入时间排序';
COMMENT ON INDEX idx_group_message_read_status_user_group IS '优化群聊未读消息查询 - 按用户ID、群ID和已读状态筛选';
COMMENT ON INDEX idx_chat_messages_receiver_created IS '优化私聊消息查询 - 按接收者和创建时间排序';
COMMENT ON INDEX idx_chat_messages_group_created IS '优化群聊消息查询 - 按群ID和创建时间排序';
