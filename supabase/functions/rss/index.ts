import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: posts, error } = await supabase
      .from("posts")
      .select("title, slug, excerpt, published_at, updated_at, thumbnail_url")
      .order("published_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Error fetching posts:", error);
      throw error;
    }

    const baseUrl = "https://cartain.kr";
    const now = new Date().toUTCString();

    const escapeXml = (str: string | null): string => {
      if (!str) return "";
      return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
    };

    let rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>카테인 - 자동차 정보 매거진</title>
    <link>${baseUrl}</link>
    <description>자동차 유지비 계산, 차량 관리 팁, 최신 자동차 뉴스를 제공하는 카테인 매거진</description>
    <language>ko</language>
    <lastBuildDate>${now}</lastBuildDate>
    <atom:link href="${baseUrl}/rss.xml" rel="self" type="application/rss+xml"/>
    <managingEditor>contact@cartain.kr (카테인 에디터)</managingEditor>
    <webMaster>contact@cartain.kr (카테인)</webMaster>
    <category>Automotive</category>
    <ttl>60</ttl>
    <image>
      <url>${baseUrl}/og-image.png</url>
      <title>카테인</title>
      <link>${baseUrl}</link>
      <width>1200</width>
      <height>630</height>
    </image>
`;

    if (posts && posts.length > 0) {
      for (const post of posts) {
        const pubDate = new Date(post.published_at).toUTCString();
        const postUrl = `${baseUrl}/magazine/${post.slug}`;
        rss += `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${postUrl}</link>
      <guid isPermaLink="true">${postUrl}</guid>
      <description>${escapeXml(post.excerpt)}</description>
      <pubDate>${pubDate}</pubDate>
      <author>contact@cartain.kr (카테인 에디터)</author>
      <category>자동차</category>
`;
        if (post.thumbnail_url) {
          rss += `      <media:content url="${escapeXml(post.thumbnail_url)}" medium="image"/>
`;
        }
        rss += `    </item>
`;
      }
    }

    rss += `  </channel>
</rss>`;

    console.log(`RSS feed generated with ${posts?.length || 0} items`);

    return new Response(rss, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/rss+xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("RSS generation error:", error);
    return new Response(`<?xml version="1.0" encoding="UTF-8"?><error>Failed to generate RSS</error>`, {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/xml",
      },
    });
  }
});
