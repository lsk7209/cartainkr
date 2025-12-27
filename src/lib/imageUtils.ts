/**
 * Returns the original URL since Supabase image transformations require a paid plan.
 * The function is kept for future use when transformations are available.
 * @param url - Original Supabase storage URL
 * @param options - Transformation options (not used currently)
 * @returns Original URL
 */
export const getOptimizedImageUrl = (
  url: string | null,
  options: {
    width?: number;
    height?: number;
    quality?: number;
  } = {}
): string | null => {
  // Return original URL - Supabase image transformations require Pro plan
  return url;
};

/**
 * Generate srcSet for responsive images
 * Currently returns empty string since transformations are not available
 */
export const getResponsiveSrcSet = (
  url: string | null,
  widths: number[] = [320, 640, 960]
): string => {
  // Return empty string - transformations not available without Pro plan
  return '';
};
