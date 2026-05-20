-- Re-add FK index for system_notifications.created_by to clear remaining FK lint.

CREATE INDEX IF NOT EXISTS idx_system_notifications_created_by
  ON public.system_notifications (created_by);
