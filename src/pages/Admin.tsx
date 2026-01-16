import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import { StatCard } from "@/components/StatCard";
import { PostListItem } from "@/components/PostListItem";
import { AdminChart } from "@/components/AdminChart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2, RefreshCw, Settings, Upload, List, Zap, BarChart3, FileText, TrendingUp, Calendar, FileCheck, Lock, Users, Eye, Clock, MousePointerClick, Globe, Monitor, Smartphone } from "lucide-react";
import { subDays, eachDayOfInterval, eachWeekOfInterval, subWeeks, endOfWeek, isWithinInterval } from "date-fns";
import { formatDate } from "@/lib/dateUtils";
import type { PostSummary } from "@/types/post";

interface PostQueue {
  id: string;
  title: string;
  target_keywords: string;
  category: string;
  status: string;
  created_at: string;
}

interface Stats {
  totalPosts: number;
  pendingQueue: number;
  completedQueue: number;
  thisWeekPosts: number;
}

interface DailyStats {
  date: string;
  count: number;
}

interface WeeklyStats {
  week: string;
  count: number;
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
    visitors: { date: string; value: number }[];
    pageviews: { date: string; value: number }[];
    bounceRate: { date: string; value: number }[];
    sessionDuration: { date: string; value: number }[];
  };
  topPages: { page: string; views: number }[];
  topSources: { source: string; visits: number }[];
  devices: { device: string; percentage: number }[];
  countries: { country: string; visits: number }[];
}

const Admin = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  
  // Auth form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  
  const [bulkText, setBulkText] = useState("");
  const [queue, setQueue] = useState<PostQueue[]>([]);
  const [posts, setPosts] = useState<PostSummary[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalPosts: 0,
    pendingQueue: 0,
    completedQueue: 0,
    thisWeekPosts: 0,
  });
  const [postsPerDay, setPostsPerDay] = useState("2");
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Analytics state
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);
  const [analyticsDateRange, setAnalyticsDateRange] = useState<'7d' | '14d' | '30d'>('14d');

  // Check auth state on mount
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        // Check if user has admin role
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .eq("role", "admin")
          .maybeSingle();
        
        if (roleData) {
          setIsAuthenticated(true);
          setIsAdmin(true);
        }
      }
      setIsLoading(false);
    };
    
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        setIsAuthenticated(false);
        setIsAdmin(false);
        setIsLoading(false);
      } else if (session?.user) {
        // Defer Supabase calls with setTimeout to prevent deadlock
        setTimeout(async () => {
          const { data: roleData } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", session.user.id)
            .eq("role", "admin")
            .maybeSingle();
          
          if (roleData) {
            setIsAuthenticated(true);
            setIsAdmin(true);
          }
          setIsLoading(false);
        }, 0);
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (isAuthenticated && isAdmin) {
      fetchQueue();
      fetchSettings();
      fetchPosts();
      fetchStats();
      fetchAnalytics();
    }
  }, [isAuthenticated, isAdmin]);
  
  useEffect(() => {
    if (isAuthenticated && isAdmin) {
      fetchAnalytics();
    }
  }, [analyticsDateRange]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setIsLoading(true);
    
    try {
      if (isSignUp) {
        // Sign up flow
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/admin`,
          },
        });
        
        if (error) {
          setAuthError(error.message);
          setIsLoading(false);
          return;
        }
        
        if (data.user) {
          // Wait a moment for trigger to execute
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Check if user has admin role
          const { data: roleData } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", data.user.id)
            .eq("role", "admin")
            .maybeSingle();
          
          if (!roleData) {
            setAuthError("관리자 권한이 부여되지 않았습니다. 승인된 이메일로 가입해주세요.");
            await supabase.auth.signOut();
            setIsLoading(false);
            return;
          }
          
          setIsAuthenticated(true);
          setIsAdmin(true);
          toast.success("가입 및 로그인되었습니다.");
        }
      } else {
        // Sign in flow
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (error) {
          setAuthError(error.message);
          setIsLoading(false);
          return;
        }
        
        if (data.user) {
          // Check if user has admin role
          const { data: roleData } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", data.user.id)
            .eq("role", "admin")
            .maybeSingle();
          
          if (!roleData) {
            await supabase.auth.signOut();
            setAuthError("관리자 권한이 없습니다.");
            setIsLoading(false);
            return;
          }
          
          setIsAuthenticated(true);
          setIsAdmin(true);
          toast.success("로그인되었습니다.");
        }
      }
    } catch (error) {
      setAuthError("로그인 중 오류가 발생했습니다.");
    }
    setIsLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    setIsAdmin(false);
    setEmail("");
    setPassword("");
    toast.success("로그아웃되었습니다.");
  };

  const fetchQueue = async () => {
    const { data, error } = await supabase
      .from("post_queue")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("큐 목록을 불러오는데 실패했습니다.");
      return;
    }
    setQueue(data || []);
  };

  const fetchPosts = async () => {
    const { data, error } = await supabase
      .from("posts")
      .select("id, title, slug, excerpt, published_at, thumbnail_url")
      .order("published_at", { ascending: false });

    if (error) {
      if (import.meta.env.DEV) console.error("Posts fetch error:", error);
      return;
    }
    setPosts(data || []);
  };

  const fetchStats = async () => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const [postsResult, queueResult] = await Promise.all([
      supabase.from("posts").select("id, published_at"),
      supabase.from("post_queue").select("id, status"),
    ]);

    const allPosts = postsResult.data || [];
    const allQueue = queueResult.data || [];

    const thisWeekPosts = allPosts.filter(
      (p) => new Date(p.published_at) >= oneWeekAgo
    ).length;

    setStats({
      totalPosts: allPosts.length,
      pendingQueue: allQueue.filter((q) => q.status === "pending").length,
      completedQueue: allQueue.filter((q) => q.status === "completed").length,
      thisWeekPosts,
    });
  };

  // Fetch analytics data
  const fetchAnalytics = async () => {
    setIsLoadingAnalytics(true);
    try {
      const days = analyticsDateRange === '7d' ? 7 : analyticsDateRange === '14d' ? 14 : 30;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const response = await supabase.functions.invoke("get-analytics", {
        body: {
          startDate: startDate.toISOString().split('T')[0],
          endDate: new Date().toISOString().split('T')[0],
          granularity: "daily"
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.success && response.data?.data) {
        setAnalyticsData(response.data.data);
      }
    } catch (error) {
      if (import.meta.env.DEV) console.error("Analytics fetch error:", error);
    } finally {
      setIsLoadingAnalytics(false);
    }
  };

  const dailyStats = useMemo<DailyStats[]>(() => {
    const today = new Date();
    const days = eachDayOfInterval({
      start: subDays(today, 13),
      end: today,
    });

    return days.map((day) => {
      const dayStart = new Date(day);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(day);
      dayEnd.setHours(23, 59, 59, 999);

      const count = posts.filter((post) => {
        const publishedDate = new Date(post.published_at);
        return isWithinInterval(publishedDate, { start: dayStart, end: dayEnd });
      }).length;

      return {
        date: formatDate(day, "compact"),
        count,
      };
    });
  }, [posts]);

  // Calculate weekly stats for the last 8 weeks
  const weeklyStats = useMemo<WeeklyStats[]>(() => {
    const today = new Date();
    const weeks = eachWeekOfInterval(
      {
        start: subWeeks(today, 7),
        end: today,
      },
      { weekStartsOn: 1 }
    );

    return weeks.map((weekStart) => {
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });

      const count = posts.filter((post) => {
        const publishedDate = new Date(post.published_at);
        return isWithinInterval(publishedDate, { start: weekStart, end: weekEnd });
      }).length;

      return {
        week: formatDate(weekStart, "compact"),
        count,
      };
    });
  }, [posts]);

  const fetchSettings = async () => {
    const { data, error } = await supabase
      .from("settings")
      .select("*")
      .eq("key", "posts_per_day")
      .maybeSingle();

    if (error) {
      if (import.meta.env.DEV) console.error("Settings fetch error:", error);
      return;
    }
    if (data) {
      setPostsPerDay(data.value);
    }
  };

  const handleBulkIngest = async () => {
    if (!bulkText.trim()) {
      toast.error("입력 내용이 없습니다.");
      return;
    }

    setIsLoading(true);
    const lines = bulkText.trim().split("\n").filter(line => line.trim());
    const items: { title: string; target_keywords: string; category: string; status: string }[] = [];

    for (const line of lines) {
      const title = line.trim();
      if (title) {
        items.push({
          title,
          target_keywords: "자동 생성",
          category: "자동차",
          status: "pending",
        });
      }
    }

    if (items.length === 0) {
      toast.error("입력 내용이 없습니다.");
      setIsLoading(false);
      return;
    }

    const { error } = await supabase.from("post_queue").insert(items);

    if (error) {
      toast.error("등록에 실패했습니다: " + error.message);
    } else {
      toast.success(`${items.length}개 항목이 등록되었습니다.`);
      setBulkText("");
      fetchQueue();
      fetchStats();
    }
    setIsLoading(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("post_queue").delete().eq("id", id);

    if (error) {
      toast.error("삭제에 실패했습니다.");
    } else {
      toast.success("삭제되었습니다.");
      fetchQueue();
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    const { error } = await supabase
      .from("post_queue")
      .update({ status: newStatus })
      .eq("id", id);

    if (error) {
      toast.error("상태 변경에 실패했습니다.");
    } else {
      toast.success("상태가 변경되었습니다.");
      fetchQueue();
    }
  };

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    
    try {
      // Use the new safe RPC function
      const { data, error } = await supabase.rpc("update_blog_schedule", {
        posts_per_day: parseInt(postsPerDay)
      });

      if (error) {
        throw new Error(error.message);
      }

      const result = data as { success: boolean; message?: string; error?: string };
      
      if (result.success) {
        toast.success(result.message || "스케줄이 업데이트되었습니다.");
      } else {
        toast.error(result.error || "스케줄 업데이트에 실패했습니다.");
      }
    } catch (error) {
      if (import.meta.env.DEV) console.error("Settings error:", error);
      toast.error("설정 저장에 실패했습니다.");
    } finally {
      setIsSavingSettings(false);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "processing":
        return "bg-blue-100 text-blue-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "failed":
        return "bg-red-100 text-red-800";
      case "published":
        return "bg-green-100 text-green-800";
      case "draft":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-blue-100 text-blue-800";
    }
  };

  const [generatingCount, setGeneratingCount] = useState(0);
  const [totalToGenerate, setTotalToGenerate] = useState(0);

  const handleManualGenerate = async () => {
    setIsGenerating(true);
    toast.info("AI 글 생성을 시작합니다...");

    try {
      const response = await supabase.functions.invoke("generate-blog-post", {
        body: {},
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const data = response.data;
      
      if (data.success) {
        toast.success(data.message || "글이 성공적으로 생성되었습니다!");
        fetchQueue();
        fetchPosts();
        fetchStats();
      } else {
        toast.error(data.error || "글 생성에 실패했습니다.");
      }
    } catch (error) {
      if (import.meta.env.DEV) console.error("Generation error:", error);
      toast.error("글 생성 중 오류가 발생했습니다.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleBulkGenerate = async (count: number) => {
    setIsGenerating(true);
    setGeneratingCount(0);
    setTotalToGenerate(count);
    
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < count; i++) {
      setGeneratingCount(i + 1);
      toast.info(`글 생성 중... (${i + 1}/${count})`);

      try {
        const response = await supabase.functions.invoke("generate-blog-post", {
          body: {},
        });

        if (response.error) {
          failCount++;
          continue;
        }

        const data = response.data;
        
        if (data.success) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (error) {
        if (import.meta.env.DEV) console.error("Generation error:", error);
        failCount++;
      }

      // 다음 요청 전 잠시 대기 (API 부하 방지)
      if (i < count - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    toast.success(`생성 완료! 성공: ${successCount}개, 실패: ${failCount}개`);
    fetchQueue();
    fetchPosts();
    fetchStats();
    setIsGenerating(false);
    setGeneratingCount(0);
    setTotalToGenerate(0);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">로딩 중...</p>
        </div>
      </div>
    );
  }

  // Login Screen
  if (!isAuthenticated || !isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-full max-w-sm">
          <div className="bg-card rounded-lg border border-border p-8 shadow-lg">
            <div className="flex justify-center mb-6">
              <div className="p-3 bg-primary/10 rounded-full">
                <Lock className="w-8 h-8 text-primary" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-center mb-6 text-foreground">
              {isSignUp ? "관리자 가입" : "관리자 로그인"}
            </h1>
            <form onSubmit={handleAuth} className="space-y-4">
              <div>
                <Input
                  type="email"
                  placeholder="이메일"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full"
                  required
                />
              </div>
              <div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="password"
                    placeholder="비밀번호"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10"
                    required
                  />
                </div>
                {authError && (
                  <p className="text-destructive text-sm mt-2">{authError}</p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "처리 중..." : isSignUp ? "가입하기" : "로그인"}
              </Button>
            </form>
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setAuthError("");
                }}
                className="text-sm text-primary hover:underline"
              >
                {isSignUp ? "이미 계정이 있으신가요? 로그인" : "계정이 없으신가요? 가입하기"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">관리자 페이지</h1>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            로그아웃
          </Button>
        </div>

        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-6 mb-8">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="posts" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Posts
            </TabsTrigger>
            <TabsTrigger value="ingester" className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Ingester
            </TabsTrigger>
            <TabsTrigger value="queue" className="flex items-center gap-2">
              <List className="w-4 h-4" />
              Queue
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                icon={FileCheck}
                label="전체 발행"
                value={stats.totalPosts}
              />
              <StatCard
                icon={TrendingUp}
                label="이번 주"
                value={stats.thisWeekPosts}
                iconColor="text-green-500"
                iconBgColor="bg-green-500/10"
              />
              <StatCard
                icon={Calendar}
                label="대기 중"
                value={stats.pendingQueue}
                iconColor="text-yellow-500"
                iconBgColor="bg-yellow-500/10"
              />
              <StatCard
                icon={FileCheck}
                label="처리 완료"
                value={stats.completedQueue}
                iconColor="text-blue-500"
                iconBgColor="bg-blue-500/10"
              />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AdminChart
                title="일별 발행 추이 (14일)"
                data={dailyStats}
                dataKeyX="date"
                dataKeyY="count"
                type="bar"
              />
              <AdminChart
                title="주별 발행 추이 (8주)"
                data={weeklyStats}
                dataKeyX="week"
                dataKeyY="count"
                type="line"
              />
            </div>

            {/* Recent Posts */}
            <div className="bg-card rounded-lg border border-border p-6">
              <h2 className="text-lg font-semibold mb-4 text-card-foreground">최근 발행된 글</h2>
              <div className="space-y-3">
                {posts.slice(0, 5).map((post) => (
                  <PostListItem key={post.id} post={post} compact />
                ))}
                {posts.length === 0 && (
                  <p className="text-muted-foreground text-center py-4">발행된 글이 없습니다.</p>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            {/* Date Range Selector */}
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground">방문자 통계</h2>
              <div className="flex gap-2">
                <Button
                  variant={analyticsDateRange === '7d' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAnalyticsDateRange('7d')}
                >
                  7일
                </Button>
                <Button
                  variant={analyticsDateRange === '14d' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAnalyticsDateRange('14d')}
                >
                  14일
                </Button>
                <Button
                  variant={analyticsDateRange === '30d' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAnalyticsDateRange('30d')}
                >
                  30일
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchAnalytics}
                  disabled={isLoadingAnalytics}
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingAnalytics ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>

            {isLoadingAnalytics ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : analyticsData ? (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <StatCard
                    icon={Users}
                    label="방문자"
                    value={analyticsData.summary.totalVisitors}
                  />
                  <StatCard
                    icon={Eye}
                    label="페이지뷰"
                    value={analyticsData.summary.totalPageviews}
                    iconColor="text-blue-500"
                    iconBgColor="bg-blue-500/10"
                  />
                  <StatCard
                    icon={MousePointerClick}
                    label="페이지/방문"
                    value={analyticsData.summary.pageviewsPerVisit.toFixed(1)}
                    iconColor="text-green-500"
                    iconBgColor="bg-green-500/10"
                  />
                  <StatCard
                    icon={Clock}
                    label="평균 체류"
                    value={`${Math.round(analyticsData.summary.avgSessionDuration / 60)}분`}
                    iconColor="text-yellow-500"
                    iconBgColor="bg-yellow-500/10"
                  />
                  <StatCard
                    icon={TrendingUp}
                    label="이탈률"
                    value={`${analyticsData.summary.bounceRate}%`}
                    iconColor="text-red-500"
                    iconBgColor="bg-red-500/10"
                  />
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <AdminChart
                    title="일별 방문자"
                    data={analyticsData.timeSeries.visitors}
                    dataKeyX="date"
                    dataKeyY="value"
                    type="bar"
                    dataName="방문자"
                    xAxisFormatter={(value) => {
                      const date = new Date(value);
                      return `${date.getMonth() + 1}/${date.getDate()}`;
                    }}
                    tooltipLabelFormatter={(value) => {
                      const date = new Date(value);
                      return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
                    }}
                  />
                  <AdminChart
                    title="일별 페이지뷰"
                    data={analyticsData.timeSeries.pageviews}
                    dataKeyX="date"
                    dataKeyY="value"
                    type="line"
                    dataName="페이지뷰"
                    xAxisFormatter={(value) => {
                      const date = new Date(value);
                      return `${date.getMonth() + 1}/${date.getDate()}`;
                    }}
                    tooltipLabelFormatter={(value) => {
                      const date = new Date(value);
                      return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
                    }}
                  />
                </div>

                {/* Data Tables */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Top Pages */}
                  <div className="bg-card rounded-lg border border-border p-6">
                    <h3 className="text-lg font-semibold mb-4 text-card-foreground flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      인기 페이지
                    </h3>
                    <div className="space-y-3">
                      {analyticsData.topPages.map((page, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground truncate max-w-[120px]">{page.page}</span>
                          <span className="text-sm font-medium text-foreground">{page.views.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Top Sources */}
                  <div className="bg-card rounded-lg border border-border p-6">
                    <h3 className="text-lg font-semibold mb-4 text-card-foreground flex items-center gap-2">
                      <Globe className="w-5 h-5" />
                      유입 소스
                    </h3>
                    <div className="space-y-3">
                      {analyticsData.topSources.map((source, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">{source.source}</span>
                          <span className="text-sm font-medium text-foreground">{source.visits.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Devices */}
                  <div className="bg-card rounded-lg border border-border p-6">
                    <h3 className="text-lg font-semibold mb-4 text-card-foreground flex items-center gap-2">
                      <Monitor className="w-5 h-5" />
                      디바이스
                    </h3>
                    <div className="space-y-3">
                      {analyticsData.devices.map((device, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {device.device === 'Mobile' ? (
                              <Smartphone className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <Monitor className="w-4 h-4 text-muted-foreground" />
                            )}
                            <span className="text-sm text-muted-foreground">{device.device}</span>
                          </div>
                          <span className="text-sm font-medium text-foreground">{device.percentage}%</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Countries */}
                  <div className="bg-card rounded-lg border border-border p-6">
                    <h3 className="text-lg font-semibold mb-4 text-card-foreground flex items-center gap-2">
                      <Globe className="w-5 h-5" />
                      국가별
                    </h3>
                    <div className="space-y-3">
                      {analyticsData.countries.map((country, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">{country.country}</span>
                          <span className="text-sm font-medium text-foreground">{country.visits.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>통계 데이터를 불러오는 중...</p>
              </div>
            )}
          </TabsContent>

          {/* Posts Tab */}
          <TabsContent value="posts" className="space-y-6">
            <div className="bg-card rounded-lg border border-border">
              <div className="p-6 border-b border-border">
                <h2 className="text-lg font-semibold text-card-foreground">발행된 글 목록</h2>
                <p className="text-sm text-muted-foreground mt-1">총 {posts.length}개의 글</p>
              </div>
              <div className="divide-y divide-border">
                {posts.map((post) => (
                  <PostListItem
                    key={post.id}
                    post={post}
                    showThumbnail
                    showExcerpt
                  />
                ))}
                {posts.length === 0 && (
                  <p className="text-muted-foreground text-center py-8">발행된 글이 없습니다.</p>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Ingester Tab */}
          <TabsContent value="ingester" className="space-y-6">
            <div className="bg-card rounded-lg border border-border p-6">
              <h2 className="text-xl font-semibold mb-2 text-card-foreground">
                글감 대량 등록
              </h2>
              <p className="text-muted-foreground text-sm mb-4">
                한 줄에 제목 하나씩 입력하세요. 키워드와 카테고리는 자동으로 처리됩니다.
              </p>
              <Textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder={`2024년 인기 SUV 추천 TOP 10\n전기차 충전 비용 완벽 가이드\n자동차 보험료 절약하는 7가지 방법`}
                className="min-h-[200px] font-mono text-sm mb-4"
              />
              <Button
                onClick={handleBulkIngest}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Upload className="w-4 h-4 mr-2" />
                )}
                대량 등록
              </Button>
            </div>
          </TabsContent>

          {/* Queue Tab */}
          <TabsContent value="queue" className="space-y-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-foreground">글 생성 대기열</h2>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchQueue}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  새로고침
                </Button>
                <Button
                  size="sm"
                  onClick={handleManualGenerate}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Zap className="w-4 h-4 mr-2" />
                  )}
                  1개 생성
                </Button>
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => handleBulkGenerate(5)}
                  disabled={isGenerating || stats.pendingQueue < 1}
                >
                  {isGenerating && totalToGenerate > 0 ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                      {generatingCount}/{totalToGenerate}
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 mr-2" />
                      5개 일괄 생성
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="bg-card rounded-lg border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-4 font-medium text-muted-foreground">제목</th>
                      <th className="text-left p-4 font-medium text-muted-foreground">카테고리</th>
                      <th className="text-left p-4 font-medium text-muted-foreground">상태</th>
                      <th className="text-left p-4 font-medium text-muted-foreground">등록일</th>
                      <th className="text-right p-4 font-medium text-muted-foreground">작업</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {queue.map((item) => (
                      <tr key={item.id} className="hover:bg-muted/50 transition-colors">
                        <td className="p-4">
                          <div className="max-w-xs">
                            <p className="font-medium text-foreground truncate">{item.title}</p>
                            <p className="text-sm text-muted-foreground truncate">{item.target_keywords}</p>
                          </div>
                        </td>
                        <td className="p-4 text-muted-foreground">{item.category}</td>
                        <td className="p-4">
                          <select
                            value={item.status}
                            onChange={(e) => handleStatusChange(item.id, e.target.value)}
                            className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadgeClass(item.status)} border-0 cursor-pointer`}
                          >
                            <option value="pending">pending</option>
                            <option value="processing">processing</option>
                            <option value="completed">completed</option>
                            <option value="failed">failed</option>
                          </select>
                        </td>
                        <td className="p-4 text-muted-foreground text-sm">
                          {formatDate(item.created_at, "compact")}
                        </td>
                        <td className="p-4 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(item.id)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {queue.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-muted-foreground">
                          대기열이 비어있습니다.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <div className="bg-card rounded-lg border border-border p-6">
              <h2 className="text-xl font-semibold mb-4 text-card-foreground">자동 발행 설정</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    하루 발행 횟수
                  </label>
                  <select
                    value={postsPerDay}
                    onChange={(e) => setPostsPerDay(e.target.value)}
                    className="w-full p-2 rounded-md border border-border bg-background text-foreground"
                  >
                    <option value="1">1회 (오전 9시)</option>
                    <option value="2">2회 (12시간 간격)</option>
                    <option value="3">3회 (8시간 간격)</option>
                    <option value="4">4회 (6시간 간격)</option>
                  </select>
                </div>
                <Button
                  onClick={handleSaveSettings}
                  disabled={isSavingSettings}
                  className="w-full"
                >
                  {isSavingSettings ? (
                    <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Settings className="w-4 h-4 mr-2" />
                  )}
                  설정 저장
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;
