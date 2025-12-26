-- Fix 1: Restrict settings table to admins only (no public read)
DROP POLICY IF EXISTS "Settings are publicly readable" ON public.settings;

CREATE POLICY "Admins can view settings"
ON public.settings
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Add service role SELECT access (for edge functions using service role)
DROP POLICY IF EXISTS "Service role full access to settings" ON public.settings;
CREATE POLICY "Service role full access to settings"
ON public.settings
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Fix 2: Update the update_blog_schedule function to use CRON_SECRET from env
-- Instead of storing in settings table (which requires service role to read),
-- the cron secret is now passed via Deno.env.get("CRON_SECRET") in the edge function
-- The cron job will use the same secret stored in Supabase secrets

CREATE OR REPLACE FUNCTION public.update_blog_schedule(posts_per_day integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'cron', 'net'
AS $function$
DECLARE
  job_name TEXT := 'generate-blog-post-cron';
  cron_expression TEXT;
  func_url TEXT;
  cron_secret TEXT;
  result jsonb;
BEGIN
  -- Validate input
  IF posts_per_day IS NULL OR posts_per_day < 1 OR posts_per_day > 4 THEN
    RETURN jsonb_build_object('success', false, 'error', 'posts_per_day must be between 1 and 4');
  END IF;

  -- Map posts_per_day to cron expression
  CASE posts_per_day
    WHEN 1 THEN cron_expression := '0 9 * * *';
    WHEN 2 THEN cron_expression := '0 9,21 * * *';
    WHEN 3 THEN cron_expression := '0 7,14,21 * * *';
    WHEN 4 THEN cron_expression := '0 6,12,18,23 * * *';
    ELSE
      RETURN jsonb_build_object('success', false, 'error', 'Invalid posts_per_day value');
  END CASE;

  -- Get configuration from settings
  SELECT value INTO func_url FROM public.settings WHERE key = 'func_url';
  SELECT value INTO cron_secret FROM public.settings WHERE key = 'cron_secret';

  -- Validate func_url is set and has valid format
  IF func_url IS NULL OR func_url = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Function URL not configured in settings');
  END IF;

  -- Validate URL format (must be Supabase or Lovable functions URL)
  IF func_url !~ '^https://[a-z0-9-]+\.(supabase\.co|lovableproject\.com)/functions/v1/[a-z0-9-]+$' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid function URL format');
  END IF;

  -- Validate cron_secret is set
  IF cron_secret IS NULL OR cron_secret = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cron secret not configured in settings');
  END IF;

  -- Remove existing job if exists
  PERFORM cron.unschedule(job_name);

  -- Schedule new job using dedicated cron secret (not anon key)
  PERFORM cron.schedule(
    job_name,
    cron_expression,
    format(
      'SELECT net.http_post(url:=%L, headers:=%L::jsonb, body:=''{}''::jsonb)',
      func_url,
      format('{"Content-Type": "application/json", "Authorization": "Bearer %s"}', cron_secret)
    )
  );

  -- Log the schedule update
  RAISE NOTICE 'Schedule updated: % posts/day with cron expression: %', posts_per_day, cron_expression;

  result := jsonb_build_object(
    'success', true,
    'postsPerDay', posts_per_day,
    'cronExpression', cron_expression
  );

  RETURN result;
END;
$function$;