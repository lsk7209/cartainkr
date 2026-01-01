import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

// Verify user authentication and admin role
async function verifyAdminAccess(req: Request): Promise<{ authorized: boolean; error?: string }> {
  const authHeader = req.headers.get("Authorization");
  
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
      return { authorized: false, error: "Admin access required" };
    }

    return { authorized: true };
  } catch (e) {
    console.error("Auth verification error:", e);
    return { authorized: false, error: "Authentication verification failed" };
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("=== Get Analytics Function Started ===");

  try {
    // Verify authorization
    const authResult = await verifyAdminAccess(req);
    if (!authResult.authorized) {
      return new Response(
        JSON.stringify({ success: false, error: authResult.error || "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body for date range
    let startDate: string;
    let endDate: string;
    let granularity = "daily";

    try {
      const body = await req.json();
      startDate = body.startDate || getDefaultStartDate();
      endDate = body.endDate || getDefaultEndDate();
      granularity = body.granularity || "daily";
    } catch {
      startDate = getDefaultStartDate();
      endDate = getDefaultEndDate();
    }

    // Generate mock analytics data based on realistic patterns
    // In production, this would fetch from actual analytics service
    const analyticsData = generateAnalyticsData(startDate, endDate, granularity);

    console.log("Analytics data generated successfully");

    return new Response(
      JSON.stringify({
        success: true,
        data: analyticsData,
        dateRange: { startDate, endDate },
        granularity,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Function error:", error);
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

function getDefaultStartDate(): string {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  return date.toISOString().split('T')[0];
}

function getDefaultEndDate(): string {
  return new Date().toISOString().split('T')[0];
}

interface DailyMetric {
  date: string;
  value: number;
}

interface AnalyticsData {
  summary: {
    totalVisitors: number;
    totalPageviews: number;
    avgSessionDuration: number;
    bounceRate: number;
    pageviewsPerVisit: number;
  };
  timeSeries: {
    visitors: DailyMetric[];
    pageviews: DailyMetric[];
    bounceRate: DailyMetric[];
    sessionDuration: DailyMetric[];
  };
  topPages: { page: string; views: number }[];
  topSources: { source: string; visits: number }[];
  devices: { device: string; percentage: number }[];
  countries: { country: string; visits: number }[];
}

function generateAnalyticsData(startDate: string, endDate: string, granularity: string): AnalyticsData {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days: string[] = [];
  
  const current = new Date(start);
  while (current <= end) {
    days.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }

  // Generate realistic daily metrics with some variance
  const baseVisitors = 15;
  const visitors: DailyMetric[] = days.map((date, index) => {
    // Add weekly pattern (more traffic on weekdays)
    const dayOfWeek = new Date(date).getDay();
    const weekdayBonus = dayOfWeek >= 1 && dayOfWeek <= 5 ? 1.3 : 0.7;
    // Add growth trend
    const growthFactor = 1 + (index * 0.02);
    // Add randomness
    const randomFactor = 0.5 + Math.random();
    
    const value = Math.round(baseVisitors * weekdayBonus * growthFactor * randomFactor);
    return { date, value: Math.max(1, value) };
  });

  const pageviews: DailyMetric[] = visitors.map(v => ({
    date: v.date,
    value: Math.round(v.value * (1.5 + Math.random() * 1.5))
  }));

  const bounceRate: DailyMetric[] = visitors.map(v => ({
    date: v.date,
    value: Math.round(60 + Math.random() * 30)
  }));

  const sessionDuration: DailyMetric[] = visitors.map(v => ({
    date: v.date,
    value: Math.round(60 + Math.random() * 300)
  }));

  const totalVisitors = visitors.reduce((sum, v) => sum + v.value, 0);
  const totalPageviews = pageviews.reduce((sum, v) => sum + v.value, 0);

  return {
    summary: {
      totalVisitors,
      totalPageviews,
      avgSessionDuration: Math.round(sessionDuration.reduce((sum, v) => sum + v.value, 0) / sessionDuration.length),
      bounceRate: Math.round(bounceRate.reduce((sum, v) => sum + v.value, 0) / bounceRate.length),
      pageviewsPerVisit: Math.round((totalPageviews / totalVisitors) * 100) / 100,
    },
    timeSeries: {
      visitors,
      pageviews,
      bounceRate,
      sessionDuration,
    },
    topPages: [
      { page: "/", views: Math.round(totalPageviews * 0.35) },
      { page: "/magazine", views: Math.round(totalPageviews * 0.25) },
      { page: "/calculator", views: Math.round(totalPageviews * 0.15) },
      { page: "/about", views: Math.round(totalPageviews * 0.08) },
      { page: "/contact", views: Math.round(totalPageviews * 0.05) },
    ],
    topSources: [
      { source: "Direct", visits: Math.round(totalVisitors * 0.45) },
      { source: "Google", visits: Math.round(totalVisitors * 0.35) },
      { source: "Naver", visits: Math.round(totalVisitors * 0.12) },
      { source: "Social", visits: Math.round(totalVisitors * 0.08) },
    ],
    devices: [
      { device: "Desktop", percentage: 65 },
      { device: "Mobile", percentage: 32 },
      { device: "Tablet", percentage: 3 },
    ],
    countries: [
      { country: "한국", visits: Math.round(totalVisitors * 0.75) },
      { country: "미국", visits: Math.round(totalVisitors * 0.15) },
      { country: "일본", visits: Math.round(totalVisitors * 0.05) },
      { country: "기타", visits: Math.round(totalVisitors * 0.05) },
    ],
  };
}
