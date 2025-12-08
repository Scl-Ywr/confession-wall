# 表白墙应用 Likes Count 一致性修复文档

## 1. 问题概述

表白墙应用中，confessions表的likes_count字段与likes表的实际点赞数量出现不一致的情况。虽然已配置触发器和关联函数用于自动更新，但由于历史数据（触发器创建前的操作）或其他异常情况，导致部分表白记录的likes_count字段值与实际点赞数量不一致。

## 2. 解决方案

### 2.1 设计思路

1. **验证查询机制**：设计并实现定期执行的验证查询，比对likes_count字段与实际点赞数量，识别所有不一致的数据记录。
2. **触发器增强**：增强触发器机制，确保likes表的所有操作（插入、更新、删除）都能触发update_likes_count函数，同步更新对应表白记录的likes_count字段。
3. **定期同步任务**：开发并部署定期执行的同步任务，自动将likes_count字段值与实际点赞数量进行同步，确保数据一致性。

### 2.2 实现方案

#### 2.2.1 验证查询机制

设计了一个SQL查询，用于比对likes_count字段与实际点赞数量，识别不一致的记录：

```sql
SELECT 
  c.id, 
  c.content, 
  c.likes_count as current_likes_count, 
  COUNT(l.id) as actual_likes_count,
  (c.likes_count - COUNT(l.id)) as difference
FROM 
  confessions c
LEFT JOIN 
  likes l ON c.id = l.confession_id
GROUP BY 
  c.id, c.content, c.likes_count
HAVING 
  c.likes_count != COUNT(l.id)
ORDER BY 
  difference DESC;
```

#### 2.2.2 触发器增强

1. **修改update_likes_count函数**：添加对UPDATE操作的支持，确保当likes表的confession_id发生变化时，能够自动调整两个表白的likes_count字段。

```sql
CREATE OR REPLACE FUNCTION public.update_likes_count()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE confessions
    SET likes_count = COALESCE(likes_count, 0) + 1
    WHERE id = NEW.confession_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE confessions
    SET likes_count = GREATEST(COALESCE(likes_count, 0) - 1, 0)
    WHERE id = OLD.confession_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.confession_id != NEW.confession_id THEN
      UPDATE confessions
      SET likes_count = GREATEST(COALESCE(likes_count, 0) - 1, 0)
      WHERE id = OLD.confession_id;
      
      UPDATE confessions
      SET likes_count = COALESCE(likes_count, 0) + 1
      WHERE id = NEW.confession_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$function$;
```

2. **创建新的触发器**：在likes表上创建update_likes_count_after_update触发器，确保更新操作也能触发update_likes_count函数。

```sql
CREATE TRIGGER update_likes_count_after_update
AFTER UPDATE ON public.likes
FOR EACH ROW
EXECUTE FUNCTION update_likes_count();
```

#### 2.2.3 定期同步任务

使用pg_cron扩展创建定期执行的同步任务：

1. **安装pg_cron扩展**：

```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
```

2. **创建同步函数**：

```sql
CREATE OR REPLACE FUNCTION sync_likes_count()
RETURNS void
LANGUAGE plpgsql
AS $function$
BEGIN
  UPDATE confessions c
  SET likes_count = (
    SELECT COUNT(*) 
    FROM likes l 
    WHERE l.confession_id = c.id
  );
END;
$function$;
```

3. **创建定期任务**：

```sql
-- 每分钟执行一次同步
SELECT cron.schedule(
  'sync-likes-count-every-minute',
  '* * * * *',
  'SELECT sync_likes_count();'
);

-- 每天凌晨2点执行一次完整同步（作为备份）
SELECT cron.schedule(
  'sync-likes-count-daily',
  '0 2 * * *',
  'SELECT sync_likes_count();'
);
```

## 3. 执行步骤

### 3.1 环境准备

1. 确保Supabase项目处于活跃状态
2. 确保Supabase数据库中已存在confessions表和likes表
3. 确保Supabase数据库中已存在update_likes_count函数和相关触发器

### 3.2 执行顺序

1. **执行验证查询**：首先执行验证查询，识别当前不一致的记录
2. **增强触发器机制**：修改update_likes_count函数，添加对UPDATE操作的支持，并创建新的触发器
3. **安装pg_cron扩展**：安装pg_cron扩展，用于创建定期任务
4. **创建同步函数和任务**：创建sync_likes_count函数，并设置定期执行的同步任务

## 4. 验证方法

### 4.1 修复前验证

执行验证查询，检查修复前的数据一致性情况：

```sql
SELECT c.id, c.content, c.likes_count, COUNT(l.id) as actual_likes_count
FROM confessions c
LEFT JOIN likes l ON c.id = l.confession_id
GROUP BY c.id, c.content, c.likes_count
ORDER BY c.created_at DESC;
```

### 4.2 修复后验证

1. **立即验证**：执行验证查询，检查修复后的数据一致性情况
2. **定期验证**：等待一段时间后，再次执行验证查询，检查定期同步任务是否正常工作
3. **触发器验证**：执行以下操作，验证触发器是否正常工作：
   - 插入一条点赞记录
   - 更新一条点赞记录的confession_id
   - 删除一条点赞记录
   - 检查对应表白记录的likes_count字段是否正确更新

## 5. 回滚策略

### 5.1 触发器回滚

如果增强触发器后出现问题，可以执行以下操作回滚：

```sql
-- 删除新创建的触发器
DROP TRIGGER IF EXISTS update_likes_count_after_update ON public.likes;

-- 恢复原有的update_likes_count函数
CREATE OR REPLACE FUNCTION public.update_likes_count()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE confessions
    SET likes_count = COALESCE(likes_count, 0) + 1
    WHERE id = NEW.confession_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE confessions
    SET likes_count = GREATEST(COALESCE(likes_count, 0) - 1, 0)
    WHERE id = OLD.confession_id;
  END IF;
  RETURN NULL;
END;
$function$;
```

### 5.2 定期任务回滚

如果定期同步任务出现问题，可以执行以下操作回滚：

```sql
-- 删除定期任务
SELECT cron.unschedule('sync-likes-count-every-minute');
SELECT cron.unschedule('sync-likes-count-daily');

-- 删除同步函数
DROP FUNCTION IF EXISTS sync_likes_count();

-- 卸载pg_cron扩展
DROP EXTENSION IF EXISTS pg_cron;
```

## 6. 维护建议

1. **定期检查**：定期执行验证查询，检查数据一致性情况
2. **日志检查**：定期检查数据库日志，分析触发器执行情况
3. **性能优化**：根据实际情况，调整定期同步任务的执行频率，避免影响系统性能
4. **备份数据**：定期备份数据库，以便在出现问题时能够快速恢复

## 7. 总结

通过以上修复方案，成功解决了表白墙应用中likes_count字段与实际点赞数量不一致的问题。修复后，所有表白记录的likes_count字段值与实际点赞数量一致，并且通过增强触发器机制和定期同步任务，确保了数据的长期一致性。

该方案具有以下优点：

1. **全面性**：覆盖了验证、修复和预防等各个方面
2. **可靠性**：采用了多种机制确保数据一致性，包括触发器和定期同步任务
3. **可维护性**：代码结构清晰，易于维护和扩展
4. **可回滚性**：提供了详细的回滚策略，确保在出现问题时能够快速恢复

该方案不仅解决了当前的数据一致性问题，还预防了未来可能出现的类似问题，确保了表白墙应用的长期稳定运行。