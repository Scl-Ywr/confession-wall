-- Re-add FK index for logs.user_id to balance join/query performance.

CREATE INDEX IF NOT EXISTS idx_logs_user_id
  ON public.logs (user_id);
