/**
 * Transforms Supabase storage URL to use image transformation with WebP format
 * @param url - Original Supabase storage URL
 * @param options - Transformation options
 * @returns Transformed URL with WebP format
 */
export const getOptimizedImageUrl = (
  url: string | null,
  options: {
    width?: number;
    height?: number;
    quality?: number;
  } = {}
): string | null => {
  if (!url) return null;

  // Check if it's a Supabase storage URL
  if (!url.includes('supabase.co/storage/v1/object/public/')) {
    return url;
  }

  // Convert object URL to render URL for transformations
  const renderUrl = url.replace(
    '/storage/v1/object/public/',
    '/storage/v1/render/image/public/'
  );

  // Build query params
  const params = new URLSearchParams();
  params.set('format', 'webp');
  
  if (options.width) params.set('width', options.width.toString());
  if (options.height) params.set('height', options.height.toString());
  params.set('quality', (options.quality || 75).toString());

  return `${renderUrl}?${params.toString()}`;
};

/**
 * Generate srcSet for responsive images
 */
export const getResponsiveSrcSet = (
  url: string | null,
  widths: number[] = [320, 640, 960]
): string => {
  if (!url) return '';

  return widths
    .map(w => {
      const optimizedUrl = getOptimizedImageUrl(url, { width: w });
      return `${optimizedUrl} ${w}w`;
    })
    .join(', ');
};
