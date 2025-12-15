-- Create logs table for system activity tracking
CREATE TABLE IF NOT EXISTS logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id UUID,
  details JSONB DEFAULT '{}'::JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for logs
-- Allow admins to view all logs
CREATE POLICY "Allow admins to view logs" ON logs
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  ));

-- Allow authenticated users to view their own logs
CREATE POLICY "Allow users to view their own logs" ON logs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_logs_user_id ON logs(user_id);
CREATE INDEX IF NOT EXISTS idx_logs_action ON logs(action);
CREATE INDEX IF NOT EXISTS idx_logs_resource_type ON logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_logs_created_at ON logs(created_at DESC);
