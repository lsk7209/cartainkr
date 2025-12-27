import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

// Production log filtering - only log essential operational info in production
const IS_PRODUCTION = Deno.env.get("ENVIRONMENT") !== "development";

function debugLog(...args: unknown[]): void {
  if (!IS_PRODUCTION) {
    console.log(...args);
  }
}

function operationalLog(message: string): void {
  // Operational logs that are safe and useful in production (no sensitive data)
  console.log(message);
}

// Retry logic helper
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      debugLog(`Attempt ${i + 1} failed:`, error);
      
      if (i < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, i);
        debugLog(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

// Simple HTML sanitizer for Deno environment
function sanitizeHtml(html: string): string {
  // Remove dangerous tags
  const forbiddenTags = ['script', 'iframe', 'object', 'embed', 'form', 'input', 'style', 'link', 'meta'];
  let sanitized = html;
  
  for (const tag of forbiddenTags) {
    // Remove opening and closing tags and their content for script/style
    if (tag === 'script' || tag === 'style') {
      sanitized = sanitized.replace(new RegExp(`<${tag}[^>]*>.*?</${tag}>`, 'gis'), '');
    }
    // Remove self-closing and opening tags for others
    sanitized = sanitized.replace(new RegExp(`<${tag}[^>]*>`, 'gi'), '');
    sanitized = sanitized.replace(new RegExp(`</${tag}>`, 'gi'), '');
  }
  
  // Remove dangerous attributes (event handlers)
  const dangerousAttrs = ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur', 'onsubmit', 'onchange'];
  for (const attr of dangerousAttrs) {
    sanitized = sanitized.replace(new RegExp(`${attr}\\s*=\\s*["'][^"']*["']`, 'gi'), '');
    sanitized = sanitized.replace(new RegExp(`${attr}\\s*=\\s*[^\\s>]+`, 'gi'), '');
  }
  
  // Remove javascript: URLs
  sanitized = sanitized.replace(/href\s*=\s*["']javascript:[^"']*["']/gi, 'href="#"');
  
  return sanitized;
}

// Generate slug from title with unique timestamp
function generateSlug(title: string): string {
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 6);
  
  // Simple transliteration for common Korean characters
  const baseSlug = title
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  
  // Always append timestamp and random string to ensure uniqueness
  return baseSlug ? `${baseSlug}-${timestamp}-${randomStr}` : `post-${timestamp}-${randomStr}`;
}

// Step 1: Generate blog content using Gemini 2.5 Flash
async function generateBlogContent(title: string, keywords: string, category: string): Promise<{ html: string; imagePrompt: string; excerpt: string }> {
  debugLog("Generating blog content for:", title);
  
  const systemPrompt = `당신은 SEO 전문 자동차 에디터입니다. 한국어로 블로그 글을 작성합니다.`;
  
  const userPrompt = `다음 주제에 대해 매우 상세하고 전문적인 블로그 글을 작성해주세요. 가독성과 시각적 매력을 최우선으로 고려하세요.

제목: ${title}
키워드: ${keywords}
카테고리: ${category}

=== 필수 HTML 구조 ===
<article>
  <header>
    <h1>제목</h1>
    <p>부제목/요약</p>
  </header>
  
  <section class="introduction">
    <p>도입부 (첫 글자가 크게 표시됨)</p>
  </section>
  
  <section class="specs">
    <h2>📊 핵심 정보</h2>
    <table class="styled-table">...</table>
  </section>
  
  <section class="pros-cons">
    <h2>💡 장단점/팁</h2>
    <div class="info-box">
      <h3>💡 핵심 포인트</h3>
      <ul><li>항목들...</li></ul>
    </div>
    <blockquote class="blockquote-style">인용구...</blockquote>
  </section>
  
  <section class="cost">
    <h2>💰 비용 정보</h2>
    <table class="styled-table">...</table>
  </section>
  
  <section class="details">
    <h2>📝 상세 설명</h2>
    <h3>소제목들...</h3>
    <p>본문...</p>
    <ol><li>순서 있는 목록...</li></ol>
  </section>
  
  <section class="conclusion">
    <h2>✅ 결론</h2>
    <div class="success-box"><h3>✅ 핵심 요약</h3><p>...</p></div>
  </section>
  
  <section class="faq">
    <h2>❓ 자주 묻는 질문 (FAQ)</h2>
    <details><summary>질문?</summary><div>답변...</div></details>
  </section>
</article>

=== 필수 CSS 클래스 (반드시 사용) ===
- styled-table: 모든 표에 적용 (그라디언트 헤더, 호버 효과)
- info-box: 팁/정보 박스 (아이콘, 체크리스트 스타일)
- success-box: 성공/결론 박스 (초록색 테마)
- warning-box: 주의사항 박스 (빨간색 테마)
- blockquote-style: 인용구 (큰따옴표 장식)
- highlight: 강조 텍스트 (<span class="highlight">중요</span>)

=== 스타일 가이드 ===
1. 총 3,000자 이상의 풍부한 콘텐츠 작성
2. h2에는 이모지 사용 (예: "📊 비용 분석", "✅ 결론")
3. info-box의 h3에 이모지 필수 (💡, 📌, ⚡, 🔑 등)
4. 순서가 있는 내용은 <ol> 사용 (번호 배지 자동 적용)
5. 중요한 단어는 <strong> 또는 <span class="highlight"> 사용
6. FAQ는 최소 5개 이상의 질문 포함
7. 표는 최소 5행 이상으로 충분한 정보 제공
8. 각 섹션 사이 충분한 간격 (section 태그로 구분)

=== 금지사항 ===
- 광고 배너 영역 절대 포함 금지
- 외부 링크 금지
- 이미지 태그 금지 (썸네일은 별도 생성)

응답은 반드시 아래 JSON 형식으로만 반환해주세요:
{
  "html": "<article>...(전체 HTML 본문)...</article>",
  "image_prompt": "A high-quality 16:9 automotive photography of...(영어 이미지 생성 프롬프트)",
  "excerpt": "이 글의 요약 (100자 이내)"
}`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    debugLog("Text generation error:", response.status, errorText);
    throw new Error(`Text generation failed: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  
  if (!content) {
    throw new Error("No content generated");
  }

  debugLog("Raw AI response:", content.substring(0, 500));
  
  // Parse JSON from the response
  let parsed;
  try {
    // Try to extract JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error("No JSON found in response");
    }
  } catch (e) {
    debugLog("JSON parsing error:", e);
    // Fallback: use the content as HTML directly
    parsed = {
      html: `<article><section><h2>${title}</h2>${content}</section></article>`,
      image_prompt: `A professional 16:9 automotive photograph related to ${title}, modern car, high quality, studio lighting`,
      excerpt: title,
    };
  }

  // Clean up the HTML - replace literal \n with actual line breaks and clean up artifacts
  let cleanHtml = (parsed.html || parsed.HTML || "")
    .replace(/\\n/g, "\n")
    .replace(/\\"/g, '"')
    .replace(/```json\s*\{?\s*"html"\s*:\s*"/g, "")
    .replace(/"\s*\}?\s*```/g, "")
    .trim();

  // Ensure proper HTML structure
  if (!cleanHtml.startsWith("<article") && !cleanHtml.startsWith("<div")) {
    cleanHtml = `<article>${cleanHtml}</article>`;
  }

  // Sanitize HTML by removing dangerous tags and attributes
  const sanitizedHtml = sanitizeHtml(cleanHtml);

  debugLog("HTML sanitized successfully");

  return {
    html: sanitizedHtml,
    imagePrompt: parsed.image_prompt || parsed.imagePrompt || "",
    excerpt: (parsed.excerpt || "").replace(/\\n/g, " ").trim(),
  };
}

// Step 2: Generate image using Gemini Image model
async function generateImage(imagePrompt: string): Promise<string> {
  debugLog("Generating image with prompt:", imagePrompt.substring(0, 100));
  
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-image-preview",
      messages: [
        {
          role: "user",
          content: `Generate a high-quality 16:9 aspect ratio image: ${imagePrompt}. Ultra high resolution, professional automotive photography style.`,
        },
      ],
      modalities: ["image", "text"],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    debugLog("Image generation error:", response.status, errorText);
    throw new Error(`Image generation failed: ${response.status}`);
  }

  const data = await response.json();
  debugLog("Image generation response keys:", Object.keys(data));
  
  // Extract base64 image from response
  const images = data.choices?.[0]?.message?.images;
  if (!images || images.length === 0) {
    debugLog("No images in response:", JSON.stringify(data).substring(0, 500));
    throw new Error("No image generated");
  }

  const imageUrl = images[0]?.image_url?.url;
  if (!imageUrl) {
    throw new Error("Invalid image URL format");
  }

  return imageUrl;
}

// Step 3: Upload image to Supabase Storage
async function uploadImageToStorage(
  supabase: any,
  base64DataUrl: string,
  filename: string
): Promise<string> {
  debugLog("Uploading image to storage:", filename);
  
  // Extract base64 data from data URL
  const base64Match = base64DataUrl.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!base64Match) {
    throw new Error("Invalid base64 data URL format");
  }

  const imageType = base64Match[1];
  const base64Data = base64Match[2];
  
  // Validate image type
  const allowedTypes = ['jpeg', 'jpg', 'png', 'webp', 'gif'];
  if (!allowedTypes.includes(imageType.toLowerCase())) {
    throw new Error(`Invalid image type: ${imageType}`);
  }
  
  // Convert base64 to Uint8Array
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // Validate file size (max 5MB)
  if (bytes.length > 5 * 1024 * 1024) {
    throw new Error("Image too large (max 5MB)");
  }

  const filePath = `${filename}.${imageType}`;
  
  const { data, error } = await supabase.storage
    .from("blog-images")
    .upload(filePath, bytes, {
      contentType: `image/${imageType}`,
      upsert: true,
    });

  if (error) {
    debugLog("Storage upload error:", error);
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from("blog-images")
    .getPublicUrl(filePath);

  debugLog("Image uploaded successfully:", urlData.publicUrl);
  return urlData.publicUrl;
}

// Dedicated cron secret for secure cron job authentication
const CRON_SECRET = Deno.env.get("CRON_SECRET");

// Check if request is from cron job (uses dedicated cron secret)
function isCronRequest(authHeader: string | null): boolean {
  if (!authHeader || !CRON_SECRET) return false;
  // Exact match required - no partial matching allowed
  return authHeader === `Bearer ${CRON_SECRET}`;
}

// Verify user authentication and admin role
async function verifyAdminAccess(req: Request): Promise<{ authorized: boolean; error?: string }> {
  const authHeader = req.headers.get("Authorization");
  
  // Allow cron job requests (they use anon key)
  if (isCronRequest(authHeader)) {
    operationalLog("Cron job request - authorized");
    return { authorized: true };
  }
  
  // For user requests, verify authentication and admin role
  if (!authHeader) {
    return { authorized: false, error: "No authorization header" };
  }

  try {
    const userClient = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return { authorized: false, error: "Invalid authentication" };
    }

    // Check admin role using service role client
    const serviceClient = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const { data: roleData, error: roleError } = await serviceClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError || !roleData) {
      debugLog("User authorization failed");
      return { authorized: false, error: "Admin access required" };
    }

    debugLog("Admin user verified");
    return { authorized: true };
  } catch (e) {
    debugLog("Auth verification error:", e);
    return { authorized: false, error: "Authentication verification failed" };
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  operationalLog("=== Generate Blog Post Function Started ===");

  try {
    // Validate environment variables
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase configuration missing");
    }

    // Verify authorization
    const authResult = await verifyAdminAccess(req);
    if (!authResult.authorized) {
      debugLog("Unauthorized request");
      return new Response(
        JSON.stringify({ success: false, error: authResult.error || "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client with service role
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get next pending post from queue
    const { data: queueItem, error: queueError } = await supabase
      .from("post_queue")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (queueError) {
      debugLog("Queue fetch error:", queueError);
      throw new Error(`Queue fetch failed: ${queueError.message}`);
    }

    if (!queueItem) {
      operationalLog("No pending posts in queue");
      return new Response(
        JSON.stringify({ success: true, message: "No pending posts in queue" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    debugLog("Processing queue item:", queueItem.id);

    // Update status to processing
    await supabase
      .from("post_queue")
      .update({ status: "processing" })
      .eq("id", queueItem.id);

    // Step 1: Generate blog content with retry
    const { html, imagePrompt, excerpt } = await retryWithBackoff(
      () => generateBlogContent(queueItem.title, queueItem.target_keywords, queueItem.category),
      3,
      2000
    );

    debugLog("Content generated, excerpt length:", excerpt.length);
    debugLog("Image prompt length:", imagePrompt.length);

    // Step 2: Generate image with retry
    let thumbnailUrl = "";
    try {
      const base64Image = await retryWithBackoff(
        () => generateImage(imagePrompt),
        3,
        3000
      );

      // Step 3: Upload to storage
      const filename = `thumbnail-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      thumbnailUrl = await uploadImageToStorage(supabase, base64Image, filename);
    } catch (imageError) {
      debugLog("Image generation/upload failed, continuing without thumbnail");
      // Continue without thumbnail
    }

    // Step 4: Create post entry with randomized publish date
    const slug = generateSlug(queueItem.title) || `post-${Date.now()}`;
    
    // Add random offset: 1-7 days ago, with random hours/minutes
    const randomDaysAgo = Math.floor(Math.random() * 7) + 1; // 1-7 days
    const randomHours = Math.floor(Math.random() * 12); // 0-11 hours
    const randomMinutes = Math.floor(Math.random() * 60); // 0-59 minutes
    
    const publishDate = new Date();
    publishDate.setDate(publishDate.getDate() - randomDaysAgo);
    publishDate.setHours(9 + randomHours, randomMinutes, 0, 0); // Between 9:00-20:59
    
    debugLog(`Publishing with date offset: ${randomDaysAgo} days ago at ${publishDate.toISOString()}`);
    
    const { data: post, error: postError } = await supabase
      .from("posts")
      .insert({
        slug,
        title: queueItem.title,
        content_html: html,
        excerpt,
        thumbnail_url: thumbnailUrl || null,
        published_at: publishDate.toISOString(),
      })
      .select()
      .single();

    if (postError) {
      debugLog("Post creation error:", postError);
      throw new Error(`Post creation failed: ${postError.message}`);
    }

    operationalLog("Post created successfully");

    // Update queue item status to completed
    await supabase
      .from("post_queue")
      .update({ status: "completed" })
      .eq("id", queueItem.id);

    operationalLog("=== Generate Blog Post Function Completed ===");

    return new Response(
      JSON.stringify({
        success: true,
        message: "Blog post generated and published successfully",
        post: {
          id: post.id,
          slug: post.slug,
          title: post.title,
          thumbnailUrl: thumbnailUrl,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    debugLog("Function error:", error);
    
    // Try to reset status if we have the queue item
    try {
      const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
      await supabase
        .from("post_queue")
        .update({ status: "failed" })
        .eq("status", "processing");
    } catch (resetError) {
      debugLog("Failed to reset status:", resetError);
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});