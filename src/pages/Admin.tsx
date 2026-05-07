import { useState, useEffect, useMemo, useLayoutEffect } from "react";
import { api } from "@/lib/api";
import Header from "@/components/Header";
import { StatCard } from "@/components/StatCard";
import { PostListItem } from "@/components/PostListItem";
import { AdminChart } from "@/components/AdminChart";
import DataTable from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Trash2, RefreshCw, Upload, List, BarChart3,
  FileText, TrendingUp, Calendar, FileCheck, Lock, Eye,
} from "lucide-react";
import { subDays, eachDayOfInterval, eachWeekOfInterval, subWeeks, endOfWeek, isWithinInterval } from "date-fns";
import { formatDate } from "@/lib/dateUtils";
import type { PostSummary } from "@/types/post";

const STORAGE_KEY = "cartainkr_admin_key";

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

const Admin = () => {
  useLayoutEffect(() => {
    const prev = document.title;
    document.title = "관리자 | 카테인";
    let meta = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "robots");
      document.head.appendChild(meta);
    }
    const prevRobots = meta.content;
    meta.content = "noindex, nofollow";
    return () => {
      document.title = prev;
      if (meta) meta.content = prevRobots;
    };
  }, []);

  const [apiKey, setApiKey] = useState(() => localStorage.getItem(STORAGE_KEY) ?? "");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [authError, setAuthError] = useState("");

  const [bulkText, setBulkText] = useState("");
  const [queue, setQueue] = useState<PostQueue[]>([]);
  const [posts, setPosts] = useState<PostSummary[]>([]);
  const [stats, setStats] = useState<Stats>({ totalPosts: 0, pendingQueue: 0, completedQueue: 0, thisWeekPosts: 0 });

  // Auto-verify stored key on mount
  useEffect(() => {
    if (apiKey) verifyKey(apiKey);
  }, []);

  const verifyKey = async (key: string) => {
    setIsLoading(true);
    try {
      await api.admin.stats(key);
      localStorage.setItem(STORAGE_KEY, key);
      setApiKey(key);
      setIsAuthenticated(true);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      setApiKey("");
      setIsAuthenticated(false);
      setAuthError("API 키가 올바르지 않습니다.");
    }
    setIsLoading(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    await verifyKey(keyInput.trim());
  };

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setApiKey("");
    setIsAuthenticated(false);
    setKeyInput("");
    toast.success("로그아웃되었습니다.");
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchAll();
    }
  }, [isAuthenticated]);

  const fetchAll = () => {
    fetchQueue();
    fetchPosts();
    fetchStatsData();
  };

  const fetchQueue = async () => {
    try {
      const data = await api.admin.queue.list(apiKey);
      setQueue(data);
    } catch {
      toast.error("큐 목록을 불러오는데 실패했습니다.");
    }
  };

  const fetchPosts = async () => {
    try {
      const data = await api.admin.posts(apiKey);
      setPosts(data);
    } catch {
      if (import.meta.env.DEV) console.error("Posts fetch error");
    }
  };

  const fetchStatsData = async () => {
    try {
      const data = await api.admin.stats(apiKey);
      setStats(data);
    } catch {
      if (import.meta.env.DEV) console.error("Stats fetch error");
    }
  };

  const dailyStats = useMemo(() => {
    const today = new Date();
    return eachDayOfInterval({ start: subDays(today, 13), end: today }).map((day) => {
      const s = new Date(day); s.setHours(0, 0, 0, 0);
      const e = new Date(day); e.setHours(23, 59, 59, 999);
      return {
        date: formatDate(day, "compact"),
        count: posts.filter((p) => isWithinInterval(new Date(p.published_at), { start: s, end: e })).length,
      };
    });
  }, [posts]);

  const weeklyStats = useMemo(() => {
    const today = new Date();
    return eachWeekOfInterval({ start: subWeeks(today, 7), end: today }, { weekStartsOn: 1 }).map((ws) => {
      const we = endOfWeek(ws, { weekStartsOn: 1 });
      return {
        week: formatDate(ws, "compact"),
        count: posts.filter((p) => isWithinInterval(new Date(p.published_at), { start: ws, end: we })).length,
      };
    });
  }, [posts]);

  const handleBulkIngest = async () => {
    if (!bulkText.trim()) { toast.error("입력 내용이 없습니다."); return; }
    setIsLoading(true);
    const items = bulkText.trim().split("\n").filter((l) => l.trim()).map((l) => ({ title: l.trim() }));
    if (!items.length) { toast.error("입력 내용이 없습니다."); setIsLoading(false); return; }
    try {
      const res = await api.admin.queue.add(apiKey, items);
      toast.success(`${res.count}개 항목이 등록되었습니다.`);
      setBulkText("");
      fetchQueue();
      fetchStatsData();
    } catch {
      toast.error("등록에 실패했습니다.");
    }
    setIsLoading(false);
  };

  const handleDelete = async (id: string) => {
    try {
      await api.admin.queue.delete(apiKey, id);
      toast.success("삭제되었습니다.");
      fetchQueue();
    } catch {
      toast.error("삭제에 실패했습니다.");
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await api.admin.queue.updateStatus(apiKey, id, status);
      toast.success("상태가 변경되었습니다.");
      fetchQueue();
    } catch {
      toast.error("상태 변경에 실패했습니다.");
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "processing": return "bg-blue-100 text-blue-800";
      case "completed": case "published": return "bg-green-100 text-green-800";
      case "failed": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  if (isLoading && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-full max-w-sm">
          <div className="bg-card rounded-lg border border-border p-8 shadow-lg">
            <div className="flex justify-center mb-6">
              <div className="p-3 bg-primary/10 rounded-full">
                <Lock className="w-8 h-8 text-primary" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-center mb-6 text-foreground">관리자 로그인</h1>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="API 키 입력"
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
              {authError && <p className="text-destructive text-sm">{authError}</p>}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "확인 중..." : "로그인"}
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
          <h1 className="text-3xl font-bold text-foreground">관리자 페이지</h1>
          <Button variant="outline" size="sm" onClick={handleLogout}>로그아웃</Button>
        </div>

        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="dashboard"><BarChart3 className="w-4 h-4 mr-1" />Dashboard</TabsTrigger>
            <TabsTrigger value="posts"><FileText className="w-4 h-4 mr-1" />Posts</TabsTrigger>
            <TabsTrigger value="ingester"><Upload className="w-4 h-4 mr-1" />Ingester</TabsTrigger>
            <TabsTrigger value="queue"><List className="w-4 h-4 mr-1" />Queue</TabsTrigger>
          </TabsList>

          {/* Dashboard */}
          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard icon={FileCheck} label="전체 발행" value={stats.totalPosts} />
              <StatCard icon={TrendingUp} label="이번 주" value={stats.thisWeekPosts} iconColor="text-green-500" iconBgColor="bg-green-500/10" />
              <StatCard icon={Calendar} label="대기 중" value={stats.pendingQueue} iconColor="text-yellow-500" iconBgColor="bg-yellow-500/10" />
              <StatCard icon={FileCheck} label="처리 완료" value={stats.completedQueue} iconColor="text-blue-500" iconBgColor="bg-blue-500/10" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AdminChart title="일별 발행 추이 (14일)" data={dailyStats} dataKeyX="date" dataKeyY="count" type="bar" />
              <AdminChart title="주별 발행 추이 (8주)" data={weeklyStats} dataKeyX="week" dataKeyY="count" type="line" />
            </div>

            <div className="bg-card rounded-lg border border-border p-6">
              <h2 className="text-lg font-semibold mb-4 text-card-foreground">최근 발행된 글</h2>
              <div className="space-y-3">
                {posts.slice(0, 5).map((post) => <PostListItem key={post.id} post={post} compact />)}
                {!posts.length && <p className="text-muted-foreground text-center py-4">발행된 글이 없습니다.</p>}
              </div>
            </div>
          </TabsContent>

          {/* Posts */}
          <TabsContent value="posts">
            <DataTable
              title="발행된 글 목록"
              icon={FileText}
              data={posts}
              variant="table"
              emptyMessage="발행된 글이 없습니다."
              columns={[
                {
                  key: "thumbnail",
                  header: "썸네일",
                  headerClassName: "w-20",
                  render: (post) =>
                    post.thumbnail_url ? (
                      <img src={post.thumbnail_url} alt={post.title} className="w-16 h-10 object-cover rounded" />
                    ) : (
                      <div className="w-16 h-10 bg-muted rounded flex items-center justify-center">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                      </div>
                    ),
                },
                {
                  key: "title",
                  header: "제목",
                  render: (post) => (
                    <div className="max-w-md">
                      <a href={`/magazine/${post.slug}`} target="_blank" rel="noopener noreferrer" className="text-foreground hover:text-primary transition-colors font-medium line-clamp-1">{post.title}</a>
                      {post.excerpt && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{post.excerpt}</p>}
                    </div>
                  ),
                },
                {
                  key: "published_at",
                  header: "발행일",
                  headerClassName: "w-32",
                  render: (post) => <span className="text-sm text-muted-foreground">{formatDate(post.published_at)}</span>,
                },
                {
                  key: "actions",
                  header: "",
                  headerClassName: "w-10",
                  render: (post) => (
                    <a href={`/magazine/${post.slug}`} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                      <Eye className="w-4 h-4" />
                    </a>
                  ),
                },
              ]}
            />
          </TabsContent>

          {/* Ingester */}
          <TabsContent value="ingester">
            <div className="bg-card rounded-lg border border-border p-6">
              <h2 className="text-xl font-semibold mb-2 text-card-foreground">글감 대량 등록</h2>
              <p className="text-muted-foreground text-sm mb-4">한 줄에 제목 하나씩 입력하세요.</p>
              <Textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder={`2024년 인기 SUV 추천 TOP 10\n전기차 충전 비용 완벽 가이드\n자동차 보험료 절약하는 7가지 방법`}
                className="min-h-[200px] font-mono text-sm mb-4"
              />
              <Button onClick={handleBulkIngest} disabled={isLoading} className="w-full">
                {isLoading ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                대량 등록
              </Button>
            </div>
          </TabsContent>

          {/* Queue */}
          <TabsContent value="queue" className="space-y-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-foreground">글 생성 대기열</h2>
              <Button variant="outline" size="sm" onClick={fetchQueue}>
                <RefreshCw className="w-4 h-4 mr-2" />새로고침
              </Button>
            </div>

            <DataTable
              data={queue}
              variant="table"
              emptyMessage="대기열이 비어있습니다."
              columns={[
                {
                  key: "title",
                  header: "제목",
                  render: (item) => (
                    <div className="max-w-xs">
                      <p className="font-medium text-foreground truncate">{item.title}</p>
                      <p className="text-sm text-muted-foreground truncate">{item.target_keywords}</p>
                    </div>
                  ),
                },
                { key: "category", header: "카테고리", render: (item) => <span className="text-muted-foreground">{item.category}</span> },
                {
                  key: "status",
                  header: "상태",
                  render: (item) => (
                    <select
                      value={item.status}
                      onChange={(e) => handleStatusChange(item.id, e.target.value)}
                      className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadgeClass(item.status)} border-0 cursor-pointer`}
                    >
                      {["pending", "processing", "completed", "failed"].map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  ),
                },
                { key: "created_at", header: "등록일", render: (item) => <span className="text-muted-foreground text-sm">{formatDate(item.created_at, "compact")}</span> },
                {
                  key: "actions",
                  header: "작업",
                  headerClassName: "text-right",
                  className: "text-right",
                  render: (item) => (
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  ),
                },
              ]}
            />
          </TabsContent>

        </Tabs>
      </main>
    </div>
  );
};

export default Admin;
