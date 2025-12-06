-- Create function to update likes_count
CREATE OR REPLACE FUNCTION update_likes_count()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Create triggers for likes table
CREATE TRIGGER update_likes_count_after_insert
AFTER INSERT ON likes
FOR EACH ROW
EXECUTE FUNCTION update_likes_count();

CREATE TRIGGER update_likes_count_after_delete
AFTER DELETE ON likes
FOR EACH ROW
EXECUTE FUNCTION update_likes_count();
