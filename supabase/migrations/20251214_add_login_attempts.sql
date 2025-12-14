-- Create table to track login attempts
CREATE TABLE IF NOT EXISTS login_attempts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    attempt_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    successful BOOLEAN NOT NULL,
    failure_reason TEXT
);

-- Create index on email and attempt_time for efficient querying
CREATE INDEX idx_login_attempts_email_time ON login_attempts(email, attempt_time DESC);

-- Create index on ip_address and attempt_time for efficient querying
CREATE INDEX idx_login_attempts_ip_time ON login_attempts(ip_address, attempt_time DESC);

-- Create function to check login attempt limits
CREATE OR REPLACE FUNCTION check_login_attempts(p_email VARCHAR, p_ip_address VARCHAR)
RETURNS TABLE (is_locked BOOLEAN, remaining_attempts INTEGER, lock_time_remaining INTERVAL)
LANGUAGE plpgsql
AS $$
BEGIN
    -- Define limits
    CONSTANT MAX_ATTEMPTS INTEGER := 5;
    CONSTANT LOCK_DURATION INTERVAL := '15 minutes';
    
    -- Calculate failed attempts within the lock duration
    DECLARE
        failed_attempts INTEGER;
        first_failed_attempt TIMESTAMP WITH TIME ZONE;
    BEGIN
        SELECT COUNT(*), MIN(attempt_time)
        INTO failed_attempts, first_failed_attempt
        FROM login_attempts
        WHERE email = p_email
          AND attempt_time > CURRENT_TIMESTAMP - LOCK_DURATION
          AND successful = FALSE;
        
        -- Check if user is locked
        IF failed_attempts >= MAX_ATTEMPTS THEN
            -- Calculate remaining lock time
            DECLARE
                lock_time_remaining INTERVAL := first_failed_attempt + LOCK_DURATION - CURRENT_TIMESTAMP;
            BEGIN
                RETURN QUERY SELECT TRUE, 0, lock_time_remaining;
                RETURN;
            END;
        END IF;
        
        -- Return remaining attempts
        RETURN QUERY SELECT FALSE, MAX_ATTEMPTS - failed_attempts, '0 minutes'::INTERVAL;
    END;
END;
$$;
