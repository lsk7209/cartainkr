-- Fix 1: Restrict post_queue SELECT to admins only
DROP POLICY IF EXISTS "Post queue is publicly readable" ON public.post_queue;

CREATE POLICY "Admins can view post_queue"
ON public.post_queue
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Fix 2: Harden the update_blog_schedule SECURITY DEFINER function
CREATE OR REPLACE FUNCTION public.update_blog_schedule(posts_per_day integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, cron, net
AS $$
DECLARE
  job_name TEXT := 'generate-blog-post-cron';
  cron_expression TEXT;
  func_url TEXT;
  anon_key TEXT;
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
  SELECT value INTO anon_key FROM public.settings WHERE key = 'anon_key';

  -- Validate func_url is set and has valid format
  IF func_url IS NULL OR func_url = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Function URL not configured in settings');
  END IF;

  -- Validate URL format (must be Supabase or Lovable functions URL)
  IF func_url !~ '^https://[a-z0-9-]+\.(supabase\.co|lovableproject\.com)/functions/v1/[a-z0-9-]+$' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid function URL format');
  END IF;

  -- Validate anon_key is set
  IF anon_key IS NULL OR anon_key = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Anon key not configured in settings');
  END IF;

  -- Remove existing job if exists
  PERFORM cron.unschedule(job_name);

  -- Schedule new job
  PERFORM cron.schedule(
    job_name,
    cron_expression,
    format(
      'SELECT net.http_post(url:=%L, headers:=%L::jsonb, body:=''{}''::jsonb)',
      func_url,
      format('{"Content-Type": "application/json", "Authorization": "Bearer %s"}', anon_key)
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
$$;