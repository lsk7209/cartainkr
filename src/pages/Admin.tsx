import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2, RefreshCw, Settings, Upload, List, Zap, BarChart3, FileText, ExternalLink, TrendingUp, Calendar, FileCheck, Lock } from "lucide-react";
import { format, subDays, eachDayOfInterval, eachWeekOfInterval, subWeeks, endOfWeek, isWithinInterval } from "date-fns";
import { ko } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

interface PostQueue {
  id: string;
  title: string;
  target_keywords: string;
  category: string;
  status: string;
  created_at: string;
}

interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  published_at: string;
  thumbnail_url: string | null;
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

const Admin = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Auth form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  
  const [bulkText, setBulkText] = useState("");
  const [queue, setQueue] = useState<PostQueue[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalPosts: 0,
    pendingQueue: 0,
    completedQueue: 0,
    thisWeekPosts: 0,
  });
  const [postsPerDay, setPostsPerDay] = useState("2");
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

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

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT") {
        setIsAuthenticated(false);
        setIsAdmin(false);
      } else if (session?.user) {
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
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (isAuthenticated && isAdmin) {
      fetchQueue();
      fetchSettings();
      fetchPosts();
      fetchStats();
    }
  }, [isAuthenticated, isAdmin]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setIsLoading(true);
    
    try {
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

  // Calculate daily stats for the last 14 days
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
        date: format(day, "MM/dd", { locale: ko }),
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
        week: format(weekStart, "MM/dd", { locale: ko }),
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
              관리자 로그인
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
                {isLoading ? "로그인 중..." : "로그인"}
              </Button>
            </form>
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
          <TabsList className="grid w-full grid-cols-5 mb-8">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Dashboard
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
              <div className="bg-card rounded-lg border border-border p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <FileCheck className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-muted-foreground text-sm">전체 발행</span>
                </div>
                <p className="text-3xl font-bold text-foreground">{stats.totalPosts}</p>
              </div>
              <div className="bg-card rounded-lg border border-border p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-green-500" />
                  </div>
                  <span className="text-muted-foreground text-sm">이번 주</span>
                </div>
                <p className="text-3xl font-bold text-foreground">{stats.thisWeekPosts}</p>
              </div>
              <div className="bg-card rounded-lg border border-border p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-yellow-500/10 rounded-lg">
                    <Calendar className="w-5 h-5 text-yellow-500" />
                  </div>
                  <span className="text-muted-foreground text-sm">대기 중</span>
                </div>
                <p className="text-3xl font-bold text-foreground">{stats.pendingQueue}</p>
              </div>
              <div className="bg-card rounded-lg border border-border p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <FileCheck className="w-5 h-5 text-blue-500" />
                  </div>
                  <span className="text-muted-foreground text-sm">처리 완료</span>
                </div>
                <p className="text-3xl font-bold text-foreground">{stats.completedQueue}</p>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Daily Chart */}
              <div className="bg-card rounded-lg border border-border p-6">
                <h2 className="text-lg font-semibold mb-4 text-card-foreground">일별 발행 추이 (14일)</h2>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailyStats}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 11 }} 
                        className="text-muted-foreground"
                        tickLine={false}
                      />
                      <YAxis 
                        allowDecimals={false}
                        tick={{ fontSize: 11 }}
                        className="text-muted-foreground"
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                        labelStyle={{ color: 'hsl(var(--foreground))' }}
                      />
                      <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Weekly Chart */}
              <div className="bg-card rounded-lg border border-border p-6">
                <h2 className="text-lg font-semibold mb-4 text-card-foreground">주별 발행 추이 (8주)</h2>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={weeklyStats}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis 
                        dataKey="week" 
                        tick={{ fontSize: 11 }} 
                        className="text-muted-foreground"
                        tickLine={false}
                      />
                      <YAxis 
                        allowDecimals={false}
                        tick={{ fontSize: 11 }}
                        className="text-muted-foreground"
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                        labelStyle={{ color: 'hsl(var(--foreground))' }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="count" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2}
                        dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Recent Posts */}
            <div className="bg-card rounded-lg border border-border p-6">
              <h2 className="text-lg font-semibold mb-4 text-card-foreground">최근 발행된 글</h2>
              <div className="space-y-3">
                {posts.slice(0, 5).map((post) => (
                  <div key={post.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-foreground truncate">{post.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(post.published_at), "yyyy년 MM월 dd일 HH:mm", { locale: ko })}
                      </p>
                    </div>
                    <a
                      href={`/magazine/${post.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-4 p-2 hover:bg-muted rounded-lg transition-colors"
                    >
                      <ExternalLink className="w-4 h-4 text-muted-foreground" />
                    </a>
                  </div>
                ))}
                {posts.length === 0 && (
                  <p className="text-muted-foreground text-center py-4">발행된 글이 없습니다.</p>
                )}
              </div>
            </div>
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
                  <div key={post.id} className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      {post.thumbnail_url && (
                        <img
                          src={post.thumbnail_url}
                          alt={post.title}
                          className="w-16 h-12 object-cover rounded"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-foreground truncate">{post.title}</h3>
                        <p className="text-sm text-muted-foreground truncate">{post.excerpt}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(post.published_at), "yyyy년 MM월 dd일 HH:mm", { locale: ko })}
                        </p>
                      </div>
                    </div>
                    <a
                      href={`/magazine/${post.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-4 p-2 hover:bg-muted rounded-lg transition-colors"
                    >
                      <ExternalLink className="w-4 h-4 text-muted-foreground" />
                    </a>
                  </div>
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
                  수동 생성
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
                          {format(new Date(item.created_at), "MM/dd HH:mm")}
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
