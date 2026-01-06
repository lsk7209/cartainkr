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
  
  // Generate unique seed for content variation
  const uniqueSeed = Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  
  const systemPrompt = `당신은 SEO/GEO/AEO 전문 자동차 에디터입니다. 한국어로 100% 독창적인 블로그 글을 작성합니다.

=== 핵심 원칙 ===
1. **독창성**: 매번 완전히 새로운 관점, 구조, 표현으로 작성
2. **SEO 최적화**: 키워드 자연스럽게 분산 (밀도 1-2%), 시맨틱 HTML 구조
3. **GEO 최적화**: AI 검색엔진이 이해하기 쉬운 명확한 정보 구조
4. **AEO 최적화**: 질문-답변 형식으로 Featured Snippet 노출 최적화`;
  
  const userPrompt = `[고유 시드: ${uniqueSeed}] - 이 시드를 기반으로 완전히 독창적인 콘텐츠를 생성하세요.

주제: ${title}
키워드: ${keywords}
카테고리: ${category}
작성 시점: ${currentYear}년 ${currentMonth}월 최신 정보 기준

=== 중복 콘텐츠 방지 (필수) ===
1. 도입부: 매번 다른 시작 방식 선택
   - 질문으로 시작 / 통계로 시작 / 상황 묘사 / 독자 공감 / 최신 트렌드 언급
2. 구조: 섹션 순서와 개수를 유동적으로 조정
3. 표현: 동일한 정보도 매번 다른 문장 구조와 어휘 사용
4. 예시: 구체적인 수치, 시나리오, 사례를 매번 새롭게 생성
5. 관점: 초보자/전문가/비용절약/성능중시 등 다양한 관점 중 하나 선택

=== SEO 최적화 (필수) ===
1. 메인 키워드: 제목(H1), 첫 단락, H2 1-2개, 결론에 자연스럽게 포함
2. LSI 키워드: 관련 용어들을 본문 전체에 분산 배치
3. 시맨틱 HTML: article, section, header 태그로 논리적 구조화
4. 내부 연결성: 주제 간 자연스러운 흐름과 연결

=== GEO 최적화 (AI 검색엔진용) ===
1. 명확한 정의: 핵심 개념을 첫 문장에서 간결하게 정의
2. 구조화된 데이터: 표, 목록, 단계별 설명 적극 활용
3. 수치 정보: 구체적인 숫자, 범위, 비율 제공
4. 비교 분석: 대안들과의 명확한 비교 정보 포함

=== AEO 최적화 (Featured Snippet용) ===
1. FAQ: 실제 사용자가 검색할 질문 7개 이상 포함
2. How-to: 단계별 가이드 형식 (1단계, 2단계...) 포함
3. 정의형 답변: "~란?" 질문에 40-60자로 답변하는 구조
4. 목록형 답변: "~방법", "~종류" 질문에 번호 목록으로 답변

=== HTML 구조 (유동적으로 조합) ===
<article>
  <header>
    <h1>SEO 최적화된 제목 (메인 키워드 포함)</h1>
    <p class="lead">핵심 가치를 담은 부제목 (50-70자)</p>
  </header>
  
  <section class="introduction">
    <p>독자의 관심을 끄는 도입부 (질문/통계/상황 중 택1)</p>
    <p>이 글에서 다룰 내용 요약 (GEO용 명확한 개요)</p>
  </section>
  
  <!-- 아래 섹션들을 주제에 맞게 선택적으로 조합 -->
  
  <section class="definition">
    <h2>🔍 [주제]란? (정의)</h2>
    <p><strong>[키워드]</strong>란 [40-60자 명확한 정의]입니다.</p>
    <div class="info-box"><h3>💡 핵심 개념</h3><ul>...</ul></div>
  </section>
  
  <section class="comparison">
    <h2>📊 비교 분석</h2>
    <table class="styled-table">...</table>
    <p>비교 분석 요약...</p>
  </section>
  
  <section class="how-to">
    <h2>📝 [주제] 방법 (단계별 가이드)</h2>
    <ol>
      <li><strong>1단계:</strong> 설명...</li>
      <li><strong>2단계:</strong> 설명...</li>
    </ol>
  </section>
  
  <section class="tips">
    <h2>💡 전문가 팁</h2>
    <div class="info-box"><h3>⚡ 실전 노하우</h3><ul>...</ul></div>
    <div class="warning-box"><h3>⚠️ 주의사항</h3><ul>...</ul></div>
  </section>
  
  <section class="cost-analysis">
    <h2>💰 비용 분석</h2>
    <table class="styled-table">...</table>
    <blockquote class="blockquote-style">비용 관련 인사이트...</blockquote>
  </section>
  
  <section class="conclusion">
    <h2>✅ 결론</h2>
    <div class="success-box">
      <h3>✅ 핵심 요약</h3>
      <p>3-4문장으로 핵심 정리 (Featured Snippet 최적화)</p>
    </div>
  </section>
  
  <section class="faq">
    <h2>❓ 자주 묻는 질문 (FAQ)</h2>
    <details><summary>[실제 검색 질문 형태]?</summary><div>[40-100자 명확한 답변]</div></details>
    <!-- 최소 7개 이상, 다양한 질문 유형 포함 -->
  </section>
</article>

=== CSS 클래스 ===
- styled-table, info-box, success-box, warning-box, blockquote-style, highlight, lead

=== 가독성 최적화 (필수) ===
1. **문단 분리**: 2-3문장마다 반드시 새 <p> 태그로 분리
2. **긴 문단 금지**: 한 <p> 태그 안에 4문장 이상 연속 금지
3. **문맥별 분리**: 다른 주제/관점으로 넘어갈 때 반드시 새 문단
4. **리드 문장**: 각 문단의 첫 문장이 핵심 내용을 담도록 구성
5. **예시**:
   - ❌ 잘못된 예: <p>첫문장. 두번째. 세번째. 네번째. 다섯번째.</p>
   - ✅ 올바른 예: <p>첫문장. 두번째.</p><p>세번째. 네번째.</p>

=== 콘텐츠 품질 ===
1. 총 3,500자 이상 작성
2. 표는 5행 이상, FAQ는 7개 이상
3. 구체적인 수치와 예시 필수
4. ${currentYear}년 최신 정보 반영
5. 문단당 2-3문장 유지로 가독성 확보

=== 금지사항 ===
- 광고/외부링크/이미지태그 금지
- 뻔한 표현, 상투적 문구 사용 금지
- 다른 글과 유사한 구조/표현 금지

JSON 형식으로 반환:
{
  "html": "<article>...</article>",
  "image_prompt": "A unique, high-quality 16:9 automotive photography of [구체적 장면 묘사], ${currentYear} style, professional lighting, cinematic composition",
  "excerpt": "[100자 이내 SEO 최적화 요약, 메인 키워드 포함]"
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

    // Auto-recover stuck processing items (older than 30 minutes)
    // This prevents items from being permanently stuck if the function crashes
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const { data: stuckItems, error: stuckError } = await supabase
      .from("post_queue")
      .update({ status: "pending" })
      .eq("status", "processing")
      .lt("created_at", thirtyMinutesAgo)
      .select("id");
    
    if (stuckError) {
      operationalLog(`Warning: Failed to recover stuck items: ${stuckError.message}`);
    } else if (stuckItems && stuckItems.length > 0) {
      operationalLog(`Recovered ${stuckItems.length} stuck processing items to pending`);
    }

    // Get next pending post from queue
    const { data: queueItem, error: queueError } = await supabase
      .from("post_queue")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (queueError) {
      operationalLog(`Queue fetch error: ${queueError.message}`);
      throw new Error(`Queue fetch failed: ${queueError.message}`);
    }

    if (!queueItem) {
      operationalLog("No pending posts in queue");
      return new Response(
        JSON.stringify({ success: true, message: "No pending posts in queue" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    operationalLog(`Processing queue item: ${queueItem.id} - "${queueItem.title}"`);

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
      operationalLog("Image generated and uploaded successfully");
    } catch (imageError) {
      operationalLog(`Image generation/upload failed: ${imageError instanceof Error ? imageError.message : "Unknown error"}, continuing without thumbnail`);
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
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    operationalLog(`Function error: ${errorMessage}`);
    
    // Try to reset status if we have the queue item
    try {
      const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
      const { data: failedItems } = await supabase
        .from("post_queue")
        .update({ status: "failed" })
        .eq("status", "processing")
        .select("id");
      
      if (failedItems && failedItems.length > 0) {
        operationalLog(`Marked ${failedItems.length} items as failed`);
      }
    } catch (resetError) {
      operationalLog(`Failed to reset status: ${resetError instanceof Error ? resetError.message : "Unknown"}`);
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