export interface TocItem {
  id: string;
  text: string;
  level: 2 | 3;
}

/**
 * Parse headings from HTML and inject unique id attributes.
 * Returns the modified HTML string and the extracted TOC items.
 */
export function buildToc(html: string): { html: string; toc: TocItem[] } {
  const toc: TocItem[] = [];
  const idCount: Record<string, number> = {};

  const processedHtml = html.replace(/<(h[23])([^>]*)>([\s\S]*?)<\/h[23]>/gi, (_, tag, attrs, inner) => {
    const text = inner.replace(/<[^>]*>/g, "").trim();
    const level = parseInt(tag.charAt(1)) as 2 | 3;

    // Build id from Korean + ASCII text
    let id = text
      .replace(/\s+/g, "-")
      .replace(/[^\w가-힣-]/g, "")
      .substring(0, 50)
      .replace(/^-|-$/g, "") || `heading-${toc.length + 1}`;

    if (idCount[id] !== undefined) {
      idCount[id]++;
      id = `${id}-${idCount[id]}`;
    } else {
      idCount[id] = 0;
    }

    toc.push({ id, text, level });
    return `<${tag}${attrs} id="${id}">${inner}</${tag}>`;
  });

  return { html: processedHtml, toc };
}
