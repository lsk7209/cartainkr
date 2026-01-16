-- Add DELETE policy for settings table (restricts deletion to admins only)
CREATE POLICY "Admins can delete settings"
ON public.settings
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));