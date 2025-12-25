-- Create post_queue table for storing post ideas
CREATE TABLE public.post_queue (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    target_keywords TEXT NOT NULL,
    category TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create posts table for published posts
CREATE TABLE public.posts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    content_html TEXT NOT NULL,
    excerpt TEXT,
    thumbnail_url TEXT,
    published_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create settings table for configuration
CREATE TABLE public.settings (
    key TEXT NOT NULL PRIMARY KEY,
    value TEXT NOT NULL
);

-- Insert default setting for interval_hours
INSERT INTO public.settings (key, value) VALUES ('interval_hours', '13');

-- Enable RLS on all tables
ALTER TABLE public.post_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Create public read policies for posts (blog content is public)
CREATE POLICY "Posts are publicly readable" 
ON public.posts 
FOR SELECT 
USING (true);

-- Create public read policies for post_queue (admin will manage via service role or authenticated)
CREATE POLICY "Post queue is publicly readable" 
ON public.post_queue 
FOR SELECT 
USING (true);

CREATE POLICY "Post queue allows public insert" 
ON public.post_queue 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Post queue allows public update" 
ON public.post_queue 
FOR UPDATE 
USING (true);

CREATE POLICY "Post queue allows public delete" 
ON public.post_queue 
FOR DELETE 
USING (true);

-- Create public policies for settings
CREATE POLICY "Settings are publicly readable" 
ON public.settings 
FOR SELECT 
USING (true);

CREATE POLICY "Settings allows public update" 
ON public.settings 
FOR UPDATE 
USING (true);

CREATE POLICY "Settings allows public insert" 
ON public.settings 
FOR INSERT 
WITH CHECK (true);

-- Create blog-images storage bucket (public)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('blog-images', 'blog-images', true);

-- Create storage policies for blog-images bucket
CREATE POLICY "Blog images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'blog-images');

CREATE POLICY "Anyone can upload blog images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'blog-images');

CREATE POLICY "Anyone can update blog images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'blog-images');

CREATE POLICY "Anyone can delete blog images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'blog-images');