-- Create user_identity_mapping table to map Logto users to Supabase users
CREATE TABLE IF NOT EXISTS user_identity_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supabase_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  logto_user_id VARCHAR(255) NOT NULL,
  provider VARCHAR(50) NOT NULL, -- 'google', 'github', etc.
  provider_email VARCHAR(255),
  provider_avatar_url TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(logto_user_id, provider)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_identity_mapping_supabase_user_id 
  ON user_identity_mapping(supabase_user_id);
CREATE INDEX IF NOT EXISTS idx_user_identity_mapping_logto_user_id 
  ON user_identity_mapping(logto_user_id);
CREATE INDEX IF NOT EXISTS idx_user_identity_mapping_provider 
  ON user_identity_mapping(provider);
CREATE INDEX IF NOT EXISTS idx_user_identity_mapping_provider_email 
  ON user_identity_mapping(provider_email);

-- Enable Row Level Security
ALTER TABLE user_identity_mapping ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow service role to read all mappings" 
  ON user_identity_mapping FOR SELECT 
  USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role to insert mappings" 
  ON user_identity_mapping FOR INSERT 
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Allow service role to update mappings" 
  ON user_identity_mapping FOR UPDATE 
  USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role to delete mappings" 
  ON user_identity_mapping FOR DELETE 
  USING (auth.role() = 'service_role');

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_identity_mapping_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER user_identity_mapping_updated_at
  BEFORE UPDATE ON user_identity_mapping
  FOR EACH ROW
  EXECUTE FUNCTION update_user_identity_mapping_updated_at();

-- Function to find or create user identity mapping
CREATE OR REPLACE FUNCTION find_or_create_user_identity(
  p_logto_user_id VARCHAR(255),
  p_provider VARCHAR(50),
  p_email VARCHAR(255),
  p_display_name VARCHAR(255) DEFAULT NULL,
  p_avatar_url TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  supabase_user_id UUID,
  logto_user_id VARCHAR(255),
  provider VARCHAR(50),
  is_new_user BOOLEAN
) AS $$
DECLARE
  v_existing_mapping RECORD;
  v_existing_supabase_user RECORD;
  v_new_supabase_user_id UUID;
  v_username VARCHAR(255);
BEGIN
  -- Check if mapping already exists
  SELECT * INTO v_existing_mapping
  FROM user_identity_mapping
  WHERE logto_user_id = p_logto_user_id AND provider = p_provider
  LIMIT 1;

  IF v_existing_mapping IS NOT NULL THEN
    -- Mapping exists, return existing user
    RETURN QUERY
    SELECT 
      v_existing_mapping.supabase_user_id,
      v_existing_mapping.logto_user_id,
      v_existing_mapping.provider,
      FALSE::BOOLEAN AS is_new_user;
    RETURN;
  END IF;

  -- Check if there's already a Supabase user with the same email
  IF p_email IS NOT NULL THEN
    SELECT u.id INTO v_existing_supabase_user
    FROM auth.users u
    WHERE u.email = p_email
    LIMIT 1;

    IF v_existing_supabase_user IS NOT NULL THEN
      -- User exists, create mapping
      INSERT INTO user_identity_mapping (
        supabase_user_id,
        logto_user_id,
        provider,
        provider_email,
        provider_avatar_url,
        metadata
      ) VALUES (
        v_existing_supabase_user.id,
        p_logto_user_id,
        p_provider,
        p_email,
        p_avatar_url,
        p_metadata
      );

      RETURN QUERY
      SELECT 
        v_existing_supabase_user.id,
        p_logto_user_id,
        p_provider,
        FALSE::BOOLEAN AS is_new_user;
      RETURN;
    END IF;
  END IF;

  -- Create new Supabase user
  v_username := COALESCE(
    p_display_name,
    SPLIT_PART(p_email, '@', 1),
    'user_' || SUBSTRING(gen_random_uuid()::TEXT, 1, 8)
  );

  -- Generate a random password for the user (they won't use it)
  INSERT INTO auth.users (
    email,
    email_confirmed_at,
    raw_user_meta_data,
    created_at,
    updated_at
  ) VALUES (
    p_email,
    NOW(),
    jsonb_build_object(
      'username', v_username,
      'display_name', p_display_name,
      'avatar_url', p_avatar_url,
      'auth_provider', p_provider,
      'logto_user_id', p_logto_user_id
    ),
    NOW(),
    NOW()
  ) RETURNING id INTO v_new_supabase_user_id;

  -- Create profile for the new user
  INSERT INTO profiles (
    id,
    email,
    username,
    display_name,
    avatar_url,
    is_admin
  ) VALUES (
    v_new_supabase_user_id,
    p_email,
    v_username,
    p_display_name,
    p_avatar_url,
    FALSE
  );

  -- Assign default role
  INSERT INTO user_roles (user_id, role_id)
  VALUES (v_new_supabase_user_id, 'role_user')
  ON CONFLICT DO NOTHING;

  -- Create mapping
  INSERT INTO user_identity_mapping (
    supabase_user_id,
    logto_user_id,
    provider,
    provider_email,
    provider_avatar_url,
    metadata
  ) VALUES (
    v_new_supabase_user_id,
    p_logto_user_id,
    p_provider,
    p_email,
    p_avatar_url,
    p_metadata
  );

  RETURN QUERY
  SELECT 
    v_new_supabase_user_id,
    p_logto_user_id,
    p_provider,
    TRUE::BOOLEAN AS is_new_user;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION find_or_create_user_identity TO service_role;
