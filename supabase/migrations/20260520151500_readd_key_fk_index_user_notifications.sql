-- Re-add a high-value FK index for join efficiency with moderate write overhead.

CREATE INDEX IF NOT EXISTS idx_user_notifications_notification_id
  ON public.user_notifications (notification_id);
