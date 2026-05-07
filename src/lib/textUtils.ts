/**
 * Strip markdown syntax from plain text fields (excerpts, titles).
 * Handles bold (**), italic (*), inline code (`), and heading prefixes (##).
 */
export const stripMarkdown = (text: string): string =>
  text
    .replace(/\*\*\*(.+?)\*\*\*/g, '$1')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/^#+\s*/gm, '')
    .trim();

/**
 * Convert markdown bold/italic to HTML equivalents.
 * Used before DOMPurify sanitization for AI-generated HTML content.
 */
export const markdownToHtml = (html: string): string =>
  html
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');
