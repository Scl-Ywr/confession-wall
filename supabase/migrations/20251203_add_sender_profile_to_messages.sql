-- Add sender_profile column to chat_messages table
ALTER TABLE chat_messages ADD COLUMN sender_profile JSONB;

-- Create function to update sender_profile when a message is inserted
CREATE OR REPLACE FUNCTION update_sender_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- Get the sender's profile
  SELECT row_to_json(profiles.*) INTO NEW.sender_profile
  FROM profiles
  WHERE profiles.id = NEW.sender_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for inserting messages
CREATE TRIGGER update_sender_profile_after_insert
BEFORE INSERT ON chat_messages
FOR EACH ROW
EXECUTE FUNCTION update_sender_profile();

-- Update existing messages with sender_profile
UPDATE chat_messages
SET sender_profile = (SELECT row_to_json(profiles.*) FROM profiles WHERE profiles.id = chat_messages.sender_id)
WHERE sender_profile IS NULL;