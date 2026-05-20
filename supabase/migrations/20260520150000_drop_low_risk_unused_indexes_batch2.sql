-- Batch 2: drop low-risk unused indexes on logs/notifications side tables.

DROP INDEX IF EXISTS public.idx_logs_user_id;
DROP INDEX IF EXISTS public.idx_logs_action;
DROP INDEX IF EXISTS public.idx_logs_resource_type;

DROP INDEX IF EXISTS public.idx_system_notifications_created_by;
DROP INDEX IF EXISTS public.idx_system_notifications_status;
DROP INDEX IF EXISTS public.idx_system_notifications_created_at;

DROP INDEX IF EXISTS public.idx_user_notifications_notification_id;
DROP INDEX IF EXISTS public.idx_user_notifications_user_id;
DROP INDEX IF EXISTS public.idx_user_notifications_read;
DROP INDEX IF EXISTS public.idx_user_notifications_created_at;
