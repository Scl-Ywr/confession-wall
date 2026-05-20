-- Harden login_attempts access to satisfy Security Advisor checks.
-- Keep client-side login throttling working via RPC while preventing direct reads.

ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- Remove broad table privileges from API roles.
REVOKE ALL ON TABLE public.login_attempts FROM anon;
REVOKE ALL ON TABLE public.login_attempts FROM authenticated;

-- Allow API roles to write login attempt events only.
GRANT INSERT ON TABLE public.login_attempts TO anon;
GRANT INSERT ON TABLE public.login_attempts TO authenticated;

-- Keep policies idempotent.
DROP POLICY IF EXISTS "Allow login attempt inserts" ON public.login_attempts;

CREATE POLICY "Allow login attempt inserts"
ON public.login_attempts
FOR INSERT
TO anon, authenticated
WITH CHECK (
  email IS NOT NULL
  AND ip_address IS NOT NULL
  AND length(trim(email)) > 0
  AND length(trim(ip_address)) > 0
);

-- Keep the existing RPC callable from client while avoiding direct SELECT access.
ALTER FUNCTION public.check_login_attempts(VARCHAR, VARCHAR)
  SECURITY DEFINER
  SET search_path = public, pg_temp;

GRANT EXECUTE ON FUNCTION public.check_login_attempts(VARCHAR, VARCHAR) TO anon;
GRANT EXECUTE ON FUNCTION public.check_login_attempts(VARCHAR, VARCHAR) TO authenticated;
