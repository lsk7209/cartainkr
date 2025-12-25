import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

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
      console.error(`Attempt ${i + 1} failed:`, error);
      
      if (i < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, i);
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

// Generate slug from title
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[가-힣]+/g, (match) => {
      // Simple Korean to romanization approximation
      return match.split('').map(() => '').join('');
    })
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || `post-${Date.now()}`;
}

// Step 1: Generate blog content using Gemini 2.5 Flash
async function generateBlogContent(title: string, keywords: string, category: string): Promise<{ html: string; imagePrompt: string; excerpt: string }> {
  console.log("Generating blog content for:", title);
  
  const systemPrompt = `당신은 SEO 전문 자동차 에디터입니다. 한국어로 블로그 글을 작성합니다.`;
  
  const userPrompt = `다음 주제에 대해 SEO 최적화된 블로그 글을 작성해주세요.

제목: ${title}
타겟 키워드: ${keywords}
카테고리: ${category}

요구사항:
1. 총 2,500자 이상의 HTML 포맷 블로그 글 작성 (충분히 길고 상세하게)
2. 구조: [서론 - 핵심정보표(Table) - 상세설명 - 장단점/팁(Info-box) - 비용표(Table) - 결론 - FAQ(Details)]
3. HTML 태그 사용: article, section, h2, h3, p, table, ul, li, details, summary, blockquote 등 시맨틱 태그
4. CSS 클래스 반드시 적용:
   - 표에는 class="styled-table" 사용
   - 팁/정보 박스에는 class="info-box" 사용 (내부에 h3, ul, li 사용)
   - 인용구에는 class="blockquote-style" 사용
5. 가독성을 위해 충분한 단락 구분과 소제목(h2, h3) 활용
6. 광고 배너 영역은 절대 포함하지 마세요

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
    console.error("Text generation error:", response.status, errorText);
    throw new Error(`Text generation failed: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  
  if (!content) {
    throw new Error("No content generated");
  }

  console.log("Raw AI response:", content.substring(0, 500));
  
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
    console.error("JSON parsing error:", e);
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

  return {
    html: cleanHtml,
    imagePrompt: parsed.image_prompt || parsed.imagePrompt || "",
    excerpt: (parsed.excerpt || "").replace(/\\n/g, " ").trim(),
  };
}

// Step 2: Generate image using Gemini Image model
async function generateImage(imagePrompt: string): Promise<string> {
  console.log("Generating image with prompt:", imagePrompt.substring(0, 100));
  
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
    console.error("Image generation error:", response.status, errorText);
    throw new Error(`Image generation failed: ${response.status}`);
  }

  const data = await response.json();
  console.log("Image generation response keys:", Object.keys(data));
  
  // Extract base64 image from response
  const images = data.choices?.[0]?.message?.images;
  if (!images || images.length === 0) {
    console.error("No images in response:", JSON.stringify(data).substring(0, 500));
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
  console.log("Uploading image to storage:", filename);
  
  // Extract base64 data from data URL
  const base64Match = base64DataUrl.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!base64Match) {
    throw new Error("Invalid base64 data URL format");
  }

  const imageType = base64Match[1];
  const base64Data = base64Match[2];
  
  // Convert base64 to Uint8Array
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const filePath = `${filename}.${imageType}`;
  
  const { data, error } = await supabase.storage
    .from("blog-images")
    .upload(filePath, bytes, {
      contentType: `image/${imageType}`,
      upsert: true,
    });

  if (error) {
    console.error("Storage upload error:", error);
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from("blog-images")
    .getPublicUrl(filePath);

  console.log("Image uploaded successfully:", urlData.publicUrl);
  return urlData.publicUrl;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("=== Generate Blog Post Function Started ===");

  try {
    // Validate environment variables
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase configuration missing");
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
      console.error("Queue fetch error:", queueError);
      throw new Error(`Queue fetch failed: ${queueError.message}`);
    }

    if (!queueItem) {
      console.log("No pending posts in queue");
      return new Response(
        JSON.stringify({ success: true, message: "No pending posts in queue" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Processing queue item:", queueItem.id, queueItem.title);

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

    console.log("Content generated, excerpt:", excerpt.substring(0, 50));
    console.log("Image prompt:", imagePrompt.substring(0, 100));

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
      console.error("Image generation/upload failed, continuing without thumbnail:", imageError);
      // Continue without thumbnail
    }

    // Step 4: Create post entry
    const slug = generateSlug(queueItem.title) || `post-${Date.now()}`;
    
    const { data: post, error: postError } = await supabase
      .from("posts")
      .insert({
        slug,
        title: queueItem.title,
        content_html: html,
        excerpt,
        thumbnail_url: thumbnailUrl || null,
        published_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (postError) {
      console.error("Post creation error:", postError);
      throw new Error(`Post creation failed: ${postError.message}`);
    }

    console.log("Post created:", post.id);

    // Update queue item status to completed
    await supabase
      .from("post_queue")
      .update({ status: "completed" })
      .eq("id", queueItem.id);

    console.log("=== Generate Blog Post Function Completed ===");

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
    console.error("Function error:", error);
    
    // Try to reset status if we have the queue item
    try {
      const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
      await supabase
        .from("post_queue")
        .update({ status: "failed" })
        .eq("status", "processing");
    } catch (resetError) {
      console.error("Failed to reset status:", resetError);
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
