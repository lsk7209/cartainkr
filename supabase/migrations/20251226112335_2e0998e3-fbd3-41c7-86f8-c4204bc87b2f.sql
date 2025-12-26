-- Drop the overly permissive service role policy
DROP POLICY IF EXISTS "Service role full access to settings" ON public.settings;

-- Create a proper service role policy with explicit role check
CREATE POLICY "Service role full access to settings" 
ON public.settings 
FOR ALL 
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');