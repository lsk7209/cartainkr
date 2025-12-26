-- Add write protection for posts table (only service role and admins can write)
CREATE POLICY "Service role can manage posts"
ON public.posts
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Admins can manage posts"
ON public.posts
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));