-- This RPC changes the live publishing schedule and must never be callable by
-- anonymous or ordinary authenticated clients. The admin edge function invokes
-- it with the service-role client after verifying the requesting administrator.
REVOKE ALL ON FUNCTION public.update_blog_schedule(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_blog_schedule(integer) FROM anon;
REVOKE ALL ON FUNCTION public.update_blog_schedule(integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.update_blog_schedule(integer) TO service_role;
