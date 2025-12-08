-- Create function to toggle like status
CREATE OR REPLACE FUNCTION toggle_like(p_confession_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_liked BOOLEAN;
BEGIN
  -- Check if the user has already liked the confession
  IF EXISTS (SELECT 1 FROM likes WHERE confession_id = p_confession_id AND user_id = p_user_id) THEN
    -- User has already liked, so unlike
    DELETE FROM likes WHERE confession_id = p_confession_id AND user_id = p_user_id;
    v_liked := FALSE;
  ELSE
    -- User hasn't liked yet, so like
    INSERT INTO likes (confession_id, user_id) VALUES (p_confession_id, p_user_id);
    v_liked := TRUE;
  END IF;
  
  RETURN v_liked;
END;
$$ LANGUAGE plpgsql;