-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user roles table
CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (prevents recursive RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policy for user_roles - admins can view all, users can view own
CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR user_id = auth.uid());

-- Only admins can manage roles
CREATE POLICY "Admins can manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Drop public write policies on post_queue (keep read for edge function)
DROP POLICY IF EXISTS "Post queue allows public delete" ON public.post_queue;
DROP POLICY IF EXISTS "Post queue allows public insert" ON public.post_queue;
DROP POLICY IF EXISTS "Post queue allows public update" ON public.post_queue;

-- Admin-only policies for post_queue
CREATE POLICY "Admins can insert to post_queue"
ON public.post_queue
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update post_queue"
ON public.post_queue
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete from post_queue"
ON public.post_queue
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow service role (edge functions) full access
CREATE POLICY "Service role full access to post_queue"
ON public.post_queue
FOR ALL
USING (auth.role() = 'service_role');

-- Drop public write policies on settings
DROP POLICY IF EXISTS "Settings allows public insert" ON public.settings;
DROP POLICY IF EXISTS "Settings allows public update" ON public.settings;

-- Admin-only policies for settings
CREATE POLICY "Admins can insert settings"
ON public.settings
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update settings"
ON public.settings
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Service role for settings
CREATE POLICY "Service role full access to settings"
ON public.settings
FOR ALL
USING (auth.role() = 'service_role');

-- Create safe function to update blog schedule (replaces exec_sql usage)
CREATE OR REPLACE FUNCTION public.update_blog_schedule(posts_per_day integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, cron, net
AS $$
DECLARE
  cron_expr TEXT;
  schedule_desc TEXT;
  func_url TEXT;
  anon_key TEXT;
BEGIN
  -- Validate input
  IF posts_per_day < 1 OR posts_per_day > 4 THEN
    RETURN jsonb_build_object('success', false, 'error', 'posts_per_day must be between 1 and 4');
  END IF;
  
  -- Build cron expression safely
  CASE posts_per_day
    WHEN 1 THEN 
      cron_expr := '0 9 * * *';
      schedule_desc := '매일 1회 (오전 9시 UTC)';
    WHEN 2 THEN 
      cron_expr := '0 0,12 * * *';
      schedule_desc := '매일 2회 (12시간 간격)';
    WHEN 3 THEN 
      cron_expr := '0 0,8,16 * * *';
      schedule_desc := '매일 3회 (8시간 간격)';
    WHEN 4 THEN 
      cron_expr := '0 0,6,12,18 * * *';
      schedule_desc := '매일 4회 (6시간 간격)';
  END CASE;
  
  -- Get URL and key from current_setting or env
  func_url := current_setting('app.supabase_url', true);
  anon_key := current_setting('app.supabase_anon_key', true);
  
  -- Fallback to hardcoded project URL if settings not available
  IF func_url IS NULL OR func_url = '' THEN
    func_url := 'https://tczuttsjfttqvcmdawbo.supabase.co';
  END IF;
  
  -- Try to unschedule existing job
  BEGIN
    PERFORM cron.unschedule('generate-blog-post-job');
  EXCEPTION WHEN OTHERS THEN
    -- Ignore if job doesn't exist
    NULL;
  END;
  
  -- Schedule new job
  PERFORM cron.schedule(
    'generate-blog-post-job',
    cron_expr,
    format(
      'SELECT net.http_post(url:=%L, headers:=%L::jsonb, body:=%L::jsonb) as request_id;',
      func_url || '/functions/v1/generate-blog-post',
      jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || COALESCE(anon_key, '')),
      '{}'::jsonb
    )
  );
  
  -- Update settings table
  INSERT INTO public.settings (key, value)
  VALUES ('posts_per_day', posts_per_day::text)
  ON CONFLICT (key) DO UPDATE SET value = posts_per_day::text;
  
  RETURN jsonb_build_object(
    'success', true, 
    'message', format('스케줄이 업데이트되었습니다: %s', schedule_desc),
    'schedule', cron_expr
  );
END;
$$;

-- Drop the dangerous exec_sql function
DROP FUNCTION IF EXISTS public.exec_sql(text);

-- Remove public write policies from storage
DROP POLICY IF EXISTS "Anyone can upload blog images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update blog images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete blog images" ON storage.objects;

-- Set bucket limits for security
UPDATE storage.buckets 
SET file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
WHERE id = 'blog-images';