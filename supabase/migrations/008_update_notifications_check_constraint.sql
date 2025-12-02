-- Update notifications table check constraint to include group_invite type
ALTER TABLE notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check,
  ADD CONSTRAINT notifications_type_check CHECK (type IN ('friend_request', 'friend_accepted', 'friend_rejected', 'group_invite'));
