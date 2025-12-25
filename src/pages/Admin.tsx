import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2, RefreshCw, Settings, Upload, List, Zap, BarChart3, FileText, ExternalLink, TrendingUp, Calendar, FileCheck } from "lucide-react";
import { format, subDays, startOfWeek, endOfWeek, eachDayOfInterval, eachWeekOfInterval, subWeeks, isWithinInterval } from "date-fns";
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
  const [bulkText, setBulkText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
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

  useEffect(() => {
    fetchQueue();
    fetchSettings();
    fetchPosts();
    fetchStats();
  }, []);

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
      console.error("Posts fetch error:", error);
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
      console.error("Settings fetch error:", error);
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
    const lines = bulkText.trim().split("\n");
    const items: { title: string; target_keywords: string; category: string; status: string }[] = [];

    for (const line of lines) {
      const parts = line.split("|").map((p) => p.trim());
      if (parts.length >= 3) {
        items.push({
          title: parts[0],
          target_keywords: parts[1],
          category: parts[2],
          status: "pending",
        });
      }
    }

    if (items.length === 0) {
      toast.error("유효한 형식의 데이터가 없습니다. (제목 | 키워드 | 카테고리)");
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
      const response = await supabase.functions.invoke("update-cron-schedule", {
        body: { postsPerDay: parseInt(postsPerDay) },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data.success) {
        toast.success(response.data.message);
      } else {
        toast.error(response.data.error || "스케줄 업데이트에 실패했습니다.");
      }
    } catch (error) {
      console.error("Settings error:", error);
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
      } else {
        toast.error(data.error || "글 생성에 실패했습니다.");
      }
    } catch (error) {
      console.error("Generation error:", error);
      toast.error("글 생성 중 오류가 발생했습니다.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <h1 className="text-3xl font-bold mb-8 text-foreground">관리자 페이지</h1>

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
                          borderRadius: '8px',
                          color: 'hsl(var(--foreground))'
                        }}
                        labelFormatter={(label) => `날짜: ${label}`}
                        formatter={(value) => [`${value}건`, '발행']}
                      />
                      <Bar 
                        dataKey="count" 
                        fill="hsl(var(--primary))" 
                        radius={[4, 4, 0, 0]}
                      />
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
                          borderRadius: '8px',
                          color: 'hsl(var(--foreground))'
                        }}
                        labelFormatter={(label) => `주간 시작: ${label}`}
                        formatter={(value) => [`${value}건`, '발행']}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="count" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2}
                        dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-lg border border-border p-6">
              <h2 className="text-xl font-semibold mb-4 text-card-foreground">최근 발행 글</h2>
              {posts.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">발행된 글이 없습니다.</p>
              ) : (
                <div className="space-y-3">
                  {posts.slice(0, 5).map((post) => (
                    <div
                      key={post.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-foreground truncate">{post.title}</h3>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(post.published_at), "yyyy.MM.dd HH:mm", { locale: ko })}
                        </p>
                      </div>
                      <a
                        href={`/magazine/${post.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-2 p-2 hover:bg-muted rounded-lg transition-colors"
                      >
                        <ExternalLink className="w-4 h-4 text-muted-foreground" />
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Posts Tab */}
          <TabsContent value="posts" className="space-y-6">
            <div className="bg-card rounded-lg border border-border p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-card-foreground">발행된 글 목록</h2>
                <Button variant="outline" size="sm" onClick={fetchPosts}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  새로고침
                </Button>
              </div>

              {posts.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">발행된 글이 없습니다.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-2 font-semibold text-foreground">제목</th>
                        <th className="text-left py-3 px-2 font-semibold text-foreground">발행일</th>
                        <th className="text-left py-3 px-2 font-semibold text-foreground">링크</th>
                      </tr>
                    </thead>
                    <tbody>
                      {posts.map((post) => (
                        <tr key={post.id} className="border-b border-border/50 hover:bg-muted/50">
                          <td className="py-3 px-2">
                            <div className="flex items-center gap-3">
                              {post.thumbnail_url && (
                                <img
                                  src={post.thumbnail_url}
                                  alt=""
                                  className="w-12 h-12 object-cover rounded"
                                />
                              )}
                              <div className="min-w-0">
                                <p className="font-medium text-foreground truncate max-w-[300px]">
                                  {post.title}
                                </p>
                                {post.excerpt && (
                                  <p className="text-xs text-muted-foreground truncate max-w-[300px]">
                                    {post.excerpt}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-2 text-muted-foreground whitespace-nowrap">
                            {format(new Date(post.published_at), "yyyy.MM.dd HH:mm", { locale: ko })}
                          </td>
                          <td className="py-3 px-2">
                            <a
                              href={`/magazine/${post.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-primary hover:underline"
                            >
                              <ExternalLink className="w-4 h-4" />
                              보기
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="ingester" className="space-y-6">
            <div className="bg-card rounded-lg border border-border p-6">
              <h2 className="text-xl font-semibold mb-4 text-card-foreground">
                글감 대량 등록
              </h2>
              <p className="text-muted-foreground text-sm mb-4">
                형식: <code className="bg-muted px-2 py-1 rounded">제목 | 타겟키워드 | 카테고리</code>
                <br />
                한 줄에 하나씩 입력하세요.
              </p>
              <Textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder={`2024년 인기 SUV 추천 TOP 10 | SUV 추천, 가성비 SUV | 자동차 리뷰\n전기차 충전 비용 완벽 가이드 | 전기차 충전, 전기차 비용 | 전기차\n자동차 보험료 절약하는 7가지 방법 | 자동차 보험, 보험료 절약 | 보험`}
                className="min-h-[200px] font-mono text-sm mb-4"
              />
              <Button
                onClick={handleBulkIngest}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    등록 중...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    대량 등록
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="queue" className="space-y-6">
            <div className="bg-card rounded-lg border border-border p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-card-foreground">
                  대기 중인 글 목록
                </h2>
                <div className="flex gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleManualGenerate}
                    disabled={isGenerating || queue.filter(q => q.status === "pending").length === 0}
                  >
                    {isGenerating ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        생성 중...
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 mr-2" />
                        수동 생성
                      </>
                    )}
                  </Button>
                  <Button variant="outline" size="sm" onClick={fetchQueue}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    새로고침
                  </Button>
                </div>
              </div>

              {queue.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  등록된 글감이 없습니다.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-2 font-semibold text-foreground">
                          제목
                        </th>
                        <th className="text-left py-3 px-2 font-semibold text-foreground">
                          키워드
                        </th>
                        <th className="text-left py-3 px-2 font-semibold text-foreground">
                          카테고리
                        </th>
                        <th className="text-left py-3 px-2 font-semibold text-foreground">
                          상태
                        </th>
                        <th className="text-left py-3 px-2 font-semibold text-foreground">
                          작업
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {queue.map((item) => (
                        <tr
                          key={item.id}
                          className="border-b border-border/50 hover:bg-muted/50"
                        >
                          <td className="py-3 px-2 text-foreground">
                            {item.title}
                          </td>
                          <td className="py-3 px-2 text-muted-foreground text-xs">
                            {item.target_keywords}
                          </td>
                          <td className="py-3 px-2 text-muted-foreground">
                            {item.category}
                          </td>
                          <td className="py-3 px-2">
                            <select
                              value={item.status}
                              onChange={(e) =>
                                handleStatusChange(item.id, e.target.value)
                              }
                              className={`text-xs px-2 py-1 rounded border-none cursor-pointer ${getStatusBadgeClass(
                                item.status
                              )}`}
                            >
                              <option value="pending">대기중</option>
                              <option value="processing">처리중</option>
                              <option value="completed">완료됨</option>
                              <option value="failed">실패</option>
                              <option value="draft">초안</option>
                            </select>
                          </td>
                          <td className="py-3 px-2">
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
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <div className="bg-card rounded-lg border border-border p-6">
              <h2 className="text-xl font-semibold mb-4 text-card-foreground">
                자동 발행 스케줄
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-3">
                    일일 포스팅 횟수
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { value: "1", label: "1회/일", desc: "24시간 간격" },
                      { value: "2", label: "2회/일", desc: "12시간 간격" },
                      { value: "3", label: "3회/일", desc: "8시간 간격" },
                      { value: "4", label: "4회/일", desc: "6시간 간격" },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setPostsPerDay(option.value)}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          postsPerDay === option.value
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <div className="font-semibold text-lg">{option.label}</div>
                        <div className="text-xs text-muted-foreground mt-1">{option.desc}</div>
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-4">
                    선택한 빈도에 따라 자동으로 블로그 글이 발행됩니다. 발행 시간은 UTC 기준입니다.
                  </p>
                </div>
                <Button
                  onClick={handleSaveSettings}
                  disabled={isSavingSettings}
                  className="w-full md:w-auto"
                >
                  {isSavingSettings ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      스케줄 업데이트 중...
                    </>
                  ) : (
                    "스케줄 저장"
                  )}
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
