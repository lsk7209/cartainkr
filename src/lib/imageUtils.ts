const SUPABASE_STORAGE = /supabase\.co\/storage\/v1\/object\/public\//;
const SUPABASE_CDN = /supabase\.co\/storage\/v1\/render\/image\/public\//;

/**
 * Return an optimized image URL via Supabase Storage image transformations.
 * Falls back to the original URL for non-Supabase images.
 */
export const getOptimizedImageUrl = (
  url: string | null,
  options: { width?: number; height?: number; quality?: number } = {}
): string | null => {
  if (!url) return null;

  // Already using render endpoint — just return as-is (caller shouldn't double-transform)
  if (SUPABASE_CDN.test(url)) return url;

  // Transform Supabase Storage public URLs to use the image render API
  if (SUPABASE_STORAGE.test(url)) {
    const renderUrl = url.replace(
      /supabase\.co\/storage\/v1\/object\/public\//,
      'supabase.co/storage/v1/render/image/public/'
    );
    const params = new URLSearchParams();
    if (options.width) params.set('width', String(options.width));
    if (options.height) params.set('height', String(options.height));
    params.set('quality', String(options.quality ?? 75));
    params.set('resize', 'cover');
    return `${renderUrl}?${params}`;
  }

  return url;
};

/**
 * Generate a srcSet string for responsive images via Supabase image transforms.
 */
export const getResponsiveSrcSet = (
  url: string | null,
  widths: number[] = [320, 640, 960]
): string => {
  if (!url || !SUPABASE_STORAGE.test(url)) return '';
  return widths
    .map((w) => `${getOptimizedImageUrl(url, { width: w })} ${w}w`)
    .join(', ');
};
