import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ScheduleRequest {
  postsPerDay: number; // 1, 2, 3, or 4
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { postsPerDay } = (await req.json()) as ScheduleRequest;

    if (!postsPerDay || postsPerDay < 1 || postsPerDay > 4) {
      return new Response(
        JSON.stringify({ success: false, error: "postsPerDay must be between 1 and 4" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Define cron schedules for different posting frequencies
    const schedules: Record<number, { cron: string; description: string }> = {
      1: { cron: "0 9 * * *", description: "매일 1회 (오전 9시 UTC)" },
      2: { cron: "0 0,12 * * *", description: "매일 2회 (12시간 간격)" },
      3: { cron: "0 0,8,16 * * *", description: "매일 3회 (8시간 간격)" },
      4: { cron: "0 0,6,12,18 * * *", description: "매일 4회 (6시간 간격)" },
    };

    const schedule = schedules[postsPerDay];
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Try to unschedule existing job first (ignore errors if not found)
    try {
      const { error: unscheduleError } = await supabase.rpc("exec_sql", {
        sql: `SELECT cron.unschedule('generate-blog-post-job');`
      });
      if (unscheduleError) {
        console.log("No existing job to unschedule or error:", unscheduleError.message);
      }
    } catch (e) {
      console.log("Unschedule attempt completed");
    }

    // Schedule new cron job
    const { error: scheduleError } = await supabase.rpc("exec_sql", {
      sql: `
        SELECT cron.schedule(
          'generate-blog-post-job',
          '${schedule.cron}',
          $$
          SELECT net.http_post(
            url:='${supabaseUrl}/functions/v1/generate-blog-post',
            headers:='{"Content-Type": "application/json", "Authorization": "Bearer ${anonKey}"}'::jsonb,
            body:='{}'::jsonb
          ) as request_id;
          $$
        );
      `
    });

    if (scheduleError) {
      console.error("Schedule error:", scheduleError);
      return new Response(
        JSON.stringify({ success: false, error: scheduleError.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    // Save the setting to database
    await supabase
      .from("settings")
      .upsert({ key: "posts_per_day", value: postsPerDay.toString() });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `스케줄이 업데이트되었습니다: ${schedule.description}`,
        schedule: schedule.cron
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
