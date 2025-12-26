-- Drop and recreate the update_blog_schedule function with hardened security
DROP FUNCTION IF EXISTS public.update_blog_schedule(integer);

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
  -- Exact allowed URL (hardcoded for security)
  ALLOWED_FUNC_URL CONSTANT TEXT := 'https://tczuttsjfttqvcmdawbo.supabase.co/functions/v1/generate-blog-post';
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

  -- SECURITY: Exact URL validation (no regex - exact match only)
  IF func_url IS NULL OR func_url != ALLOWED_FUNC_URL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid function URL - must match configured endpoint');
  END IF;

  -- SECURITY: Validate cron_secret is a valid UUID format
  IF cron_secret IS NULL OR cron_secret = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cron secret not configured in settings');
  END IF;
  
  -- UUID format validation (8-4-4-4-12 hexadecimal)
  IF cron_secret !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid cron secret format');
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

  -- Log the schedule update (no sensitive data)
  RAISE NOTICE 'Schedule updated: % posts/day', posts_per_day;

  result := jsonb_build_object(
    'success', true,
    'postsPerDay', posts_per_day,
    'cronExpression', cron_expression
  );

  RETURN result;
END;
$function$;