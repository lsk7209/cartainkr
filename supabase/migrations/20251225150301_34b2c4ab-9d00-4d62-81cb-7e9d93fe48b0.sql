-- Create exec_sql function to allow executing SQL from edge functions
CREATE OR REPLACE FUNCTION public.exec_sql(sql text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, cron, net
AS $$
BEGIN
  EXECUTE sql;
END;
$$;