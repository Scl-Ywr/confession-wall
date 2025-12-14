-- Fix the check_login_attempts function with correct PL/pgSQL syntax
CREATE OR REPLACE FUNCTION check_login_attempts(p_email VARCHAR, p_ip_address VARCHAR)
RETURNS TABLE (is_locked BOOLEAN, remaining_attempts INTEGER, lock_time_remaining INTERVAL)
LANGUAGE plpgsql
AS $$
DECLARE
    -- Define limits as variables since CONSTANT keyword is not supported in PL/pgSQL
    MAX_ATTEMPTS INTEGER := 5;
    LOCK_DURATION INTERVAL := '15 minutes';
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
        RETURN QUERY 
        SELECT 
            TRUE, 
            0, 
            (first_failed_attempt + LOCK_DURATION - CURRENT_TIMESTAMP)::INTERVAL;
        RETURN;
    END IF;
    
    -- Return remaining attempts
    RETURN QUERY 
    SELECT 
        FALSE, 
        MAX_ATTEMPTS - failed_attempts, 
        '0 minutes'::INTERVAL;
    RETURN;
END;
$$;