import { Link } from "react-router-dom";
import {
  BookOpen, Calculator, ArrowRight, Car, TrendingUp, Shield,
  Calendar, ChevronDown, Fuel, Wrench, CreditCard, FileText,
} from "lucide-react";
import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import JsonLd from "@/components/JsonLd";
import { Skeleton } from "@/components/ui/skeleton";
import { useSEO, generateWebSiteSchema, generateOrganizationSchema, generateFAQSchema } from "@/hooks/useSEO";
import { getPostThumbnailUrl, getResponsiveSrcSet } from "@/lib/imageUtils";
import { useLatestPosts, usePostsCount } from "@/hooks/usePosts";
import { formatDate } from "@/lib/dateUtils";
import { stripMarkdown } from "@/lib/textUtils";
import { BASE_URL, CURRENT_YEAR } from "@/lib/constants";

const HOME_FAQS = [
  {
    question: "자동차 유지비는 보통 얼마나 드나요?",
    answer:
      "국내 승용차 기준으로 월 평균 유지비는 40~80만 원 수준입니다. 중형 세단(약 3,000만 원)의 경우 할부금 약 30만 원, 보험료 약 10만 원, 유류비 약 15만 원, 자동차세(월 환산) 약 2~3만 원으로 월 60만 원 내외입니다. 카테인 계산기에서 내 차 조건으로 정확하게 계산할 수 있습니다.",
  },
  {
    question: "자동차 할부금 계산은 어떻게 하나요?",
    answer:
      "자동차 할부금은 원리금균등상환 방식으로 계산합니다. 예를 들어 2,000만 원을 연 5% 금리로 60개월 할부하면 월 납입금은 약 37만 7천 원입니다. 카테인 유지비 계산기에서 차량 가격과 할부 조건만 입력하면 자동으로 계산해드립니다.",
  },
  {
    question: "신차와 중고차 중 어떤 것이 경제적으로 유리한가요?",
    answer:
      "재정적으로는 일반적으로 중고차가 유리합니다. 신차는 출고 직후 10~15%의 가치가 하락하며 첫 3년간 감가상각이 가장 큽니다. 반면 3~5년 된 중고차는 같은 예산으로 더 높은 사양의 차량을 구매할 수 있습니다. 다만 신차는 보증 기간과 최신 안전사양이 장점입니다.",
  },
  {
    question: "자동차 보험료를 절약하는 방법이 있나요?",
    answer:
      "① 마일리지 특약 가입(연 1만 km 이하 시 최대 40% 할인) ② 블랙박스·사고예방장치 할인 ③ 온라인 다이렉트 보험 가입 ④ 무사고 할인 등급 유지 ⑤ 보험사 비교견적으로 최저가 선택. 자동차 보험료는 보험사마다 최대 30% 이상 차이가 날 수 있어 비교 가입이 필수입니다.",
  },
  {
    question: "전기차 유지비는 내연기관차보다 얼마나 저렴한가요?",
    answer:
      "전기차는 연료비가 내연기관차 대비 약 60~70% 저렴합니다. 월 1,500km 주행 기준 내연기관차 연료비는 약 21만 원, 전기차 충전비는 약 4~5만 원입니다. 단, 초기 차량 구매가가 높고 배터리 교체 비용이 발생할 수 있어 총 소유 비용 비교가 필요합니다.",
  },
  {
    question: "자동차세는 어떻게 계산되나요?",
    answer:
      "자동차세는 배기량(cc)×세율로 계산됩니다. 비영업용 승용차 기준: 1,000cc 이하는 cc당 80원, 1,600cc 이하는 140원, 2,000cc 이하는 200원, 2,500cc 이하는 220원, 2,500cc 초과는 220원이 적용됩니다. 연납(1월 선납) 시 10% 할인을 받을 수 있습니다.",
  },
];

const CATEGORIES = [
  { icon: CreditCard, label: "구매 가이드", slug: "구매", color: "bg-blue-50 text-blue-700 border-blue-100" },
  { icon: TrendingUp, label: "유지비·비용", slug: "유지비", color: "bg-green-50 text-green-700 border-green-100" },
  { icon: Shield, label: "보험 정보", slug: "보험", color: "bg-purple-50 text-purple-700 border-purple-100" },
  { icon: Fuel, label: "연비·전기차", slug: "전기차", color: "bg-orange-50 text-orange-700 border-orange-100" },
  { icon: FileText, label: "세금·법규", slug: "세금", color: "bg-red-50 text-red-700 border-red-100" },
  { icon: Wrench, label: "정비·관리", slug: "수리", color: "bg-gray-50 text-gray-700 border-gray-100" },
];

const Index = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const { data: latestPosts, isLoading: postsLoading } = useLatestPosts(6);
  const { data: postsCount } = usePostsCount();

  useSEO({
    title: `자동차 유지비 계산기 & 구매 가이드 | 카테인`,
    description: `자동차 할부금·보험료·유류비를 무료로 계산하고, ${CURRENT_YEAR}년 최신 자동차 구매 가이드와 유지비 절약 팁을 확인하세요. 경차·중형차·SUV·전기차 비용 비교까지 카테인에서 한 번에.`,
    canonicalUrl: BASE_URL,
    ogType: "website",
    keywords: ["자동차 유지비", "자동차 계산기", "자동차 구매 가이드", "자동차 보험", "자동차 할부"],
  });

  const structuredData = [
    generateWebSiteSchema(),
    generateOrganizationSchema(),
    generateFAQSchema(HOME_FAQS),
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <JsonLd data={structuredData} />
      <Header />

      <main id="main-content" className="flex-1">
        {/* ── Hero ─────────────────────────────────────────── */}
        <section className="relative py-16 md:py-24 px-4 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/10 pointer-events-none" />
          <div className="relative container max-w-5xl mx-auto">
            <div className="grid md:grid-cols-2 gap-10 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full text-primary text-xs font-semibold mb-5 tracking-wide uppercase">
                  <Car className="w-3.5 h-3.5" />
                  자동차 정보 플랫폼
                </div>
                <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-5 leading-tight">
                  스마트한 자동차
                  <br />
                  <span className="text-primary">구매·관리의 시작</span>
                </h1>
                <p className="speakable text-base md:text-lg text-muted-foreground mb-8 leading-relaxed">
                  자동차 할부금부터 유지비·보험·세금까지 한 번에 계산하고,
                  전문가가 검증한 최신 구매 가이드로 현명한 선택을 하세요.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link
                    to="/calculator"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors shadow-sm"
                  >
                    <Calculator className="w-5 h-5" />
                    유지비 무료 계산
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    to="/magazine"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-secondary text-secondary-foreground rounded-lg font-semibold hover:bg-secondary/80 transition-colors"
                  >
                    <BookOpen className="w-5 h-5" />
                    매거진 보기
                  </Link>
                </div>
              </div>

              {/* Trust stats */}
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "전문 자동차 글", value: postsCount ? `${postsCount}+` : "115+", icon: FileText },
                  { label: "무료 서비스", value: "100%", icon: Shield },
                  { label: "매주 업데이트", value: "신규 발행", icon: Calendar },
                  { label: "실시간 계산기", value: "24/7", icon: Calculator },
                ].map((stat) => (
                  <div key={stat.label} className="bg-card border border-border rounded-xl p-5 text-center">
                    <stat.icon className="w-7 h-7 text-primary mx-auto mb-2 opacity-80" />
                    <div className="text-xl font-bold text-foreground">{stat.value}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Category Bar ─────────────────────────────────── */}
        <section className="py-8 px-4 border-y border-border bg-muted/30">
          <div className="container max-w-5xl mx-auto">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">주제별 탐색</h2>
            </div>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              {CATEGORIES.map((cat) => (
                <Link
                  key={cat.slug}
                  to={`/magazine?q=${cat.slug}`}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center hover:shadow-sm transition-shadow ${cat.color}`}
                >
                  <cat.icon className="w-5 h-5" />
                  <span className="text-xs font-medium leading-tight">{cat.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="py-14 px-4">
          <div className="container max-w-5xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
              자동차 비용을 볼 때 함께 확인할 자료
            </h2>
            <p className="max-w-3xl text-sm leading-7 text-muted-foreground mb-6">
              카테인은 차량 구매와 유지비를 빠르게 계산하도록 돕지만, 세금·보험·등록·중고차 이력은 시점과 차량 조건에
              따라 달라집니다. 계산 결과를 그대로 확정 비용으로 보지 말고, 공식 조회 서비스와 실제 견적을 함께 확인하세요.
            </p>
            <div className="grid gap-4 md:grid-cols-3">
              <a href="https://www.car365.go.kr" target="_blank" rel="noopener noreferrer" className="rounded-xl border border-border bg-card p-5 text-sm leading-6 hover:border-primary">
                <strong className="block text-foreground">자동차365</strong>
                차량 등록, 정비, 중고차 이력과 관련한 공공 정보를 확인합니다.
              </a>
              <a href="https://www.molit.go.kr" target="_blank" rel="noopener noreferrer" className="rounded-xl border border-border bg-card p-5 text-sm leading-6 hover:border-primary">
                <strong className="block text-foreground">국토교통부</strong>
                자동차 제도와 안전 관련 공식 안내를 확인합니다.
              </a>
              <a href="https://www.fss.or.kr" target="_blank" rel="noopener noreferrer" className="rounded-xl border border-border bg-card p-5 text-sm leading-6 hover:border-primary">
                <strong className="block text-foreground">금융감독원</strong>
                자동차 보험과 금융 상품 안내를 비교 전 확인합니다.
              </a>
            </div>
            <div className="mt-8 grid gap-4 text-sm leading-7 text-muted-foreground md:grid-cols-2">
              <p>
                카테인은 자동차를 처음 사는 사람과 유지비를 다시 계산해야 하는 운전자를 위한 출발점입니다.
                차량 가격만 비교하면 실제 부담을 놓치기 쉽기 때문에 취득세, 자동차세, 보험료, 유류비,
                정비 주기, 중고차 감가를 함께 확인하는 순서로 콘텐츠를 구성합니다.
              </p>
              <p>
                홈에서 제공하는 계산과 안내는 견적을 확정하는 기능이 아니라 확인해야 할 항목을 정리하는
                참고 자료입니다. 실제 구매 전에는 자동차365의 이력 정보, 제조사 보증 조건, 보험사 약관,
                금융 상품 설명서와 판매 현장의 계약서를 다시 확인해야 합니다.
              </p>
              <p>
                전기차나 하이브리드 차량은 충전 환경, 보조금, 배터리 보증, 겨울철 효율처럼 일반 내연기관차와
                다른 변수가 있습니다. 같은 월 납입금이라도 주행 거리와 충전 가능 장소에 따라 총비용이 달라질
                수 있으므로 단일 추천보다 조건별 비교가 필요합니다.
              </p>
              <p>
                카테인의 편집 기준은 과장된 구매 유도보다 검증 가능한 정보입니다. 새 글을 추가할 때는
                독자가 어떤 비용을 놓치기 쉬운지, 어떤 공식 자료를 확인해야 하는지, 계산 결과를 어떤 한계와
                함께 읽어야 하는지를 먼저 설명합니다.
              </p>
            </div>
          </div>
        </section>

        {/* ── Latest Posts (6개) ───────────────────────────── */}
        <section className="py-16 px-4">
          <div className="container max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-1">최신 자동차 정보</h2>
                <p className="text-sm text-muted-foreground">전문 에디터가 검증한 최신 콘텐츠</p>
              </div>
              <Link to="/magazine" className="hidden sm:inline-flex items-center gap-1 text-sm text-primary hover:underline font-medium">
                전체보기 <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {postsLoading ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-card rounded-xl border border-border overflow-hidden">
                    <Skeleton className="aspect-video w-full" />
                    <div className="p-4">
                      <Skeleton className="h-5 w-3/4 mb-2" />
                      <Skeleton className="h-4 w-full mb-1" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : latestPosts && latestPosts.length > 0 ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {latestPosts.map((post, idx) => (
                  <Link
                    key={post.id}
                    to={`/magazine/${post.slug}`}
                    className="group bg-card rounded-xl border border-border overflow-hidden hover:shadow-md transition-shadow duration-200"
                  >
                    <div className="aspect-video bg-muted overflow-hidden">
                      <img
                        src={getPostThumbnailUrl(post.thumbnail_url, { width: 400 })}
                        srcSet={getResponsiveSrcSet(post.thumbnail_url, [320, 480, 640]) || undefined}
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading={idx === 0 ? "eager" : "lazy"}
                        decoding="async"
                      />
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors text-sm leading-snug">
                        {post.title}
                      </h3>
                      {post.excerpt && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                          {stripMarkdown(post.excerpt)}
                        </p>
                      )}
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        <time dateTime={post.published_at}>{formatDate(post.published_at, "monthDay")}</time>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-card rounded-xl border border-border">
                <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">곧 새로운 콘텐츠가 업로드됩니다</p>
              </div>
            )}

            <div className="text-center mt-6 sm:hidden">
              <Link to="/magazine" className="inline-flex items-center gap-1 text-primary hover:underline text-sm font-medium">
                전체 매거진 보기 <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </section>

        {/* ── Calculator CTA ───────────────────────────────── */}
        <section className="py-14 px-4 bg-gradient-to-r from-primary/8 to-accent/8 border-y border-border">
          <div className="container max-w-4xl mx-auto">
            <div className="bg-card rounded-2xl border border-border p-8 md:p-10 flex flex-col md:flex-row items-center gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Calculator className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-xs font-semibold text-primary uppercase tracking-wide">무료 계산기</span>
                </div>
                <h2 className="text-xl md:text-2xl font-bold text-foreground mb-2">
                  내 차 유지비, 정확히 얼마일까?
                </h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  할부금·보험료·유류비·자동차세까지 한 번에 계산하세요.
                  경차부터 수입차·전기차까지 모든 차종 지원.
                </p>
              </div>
              <Link
                to="/calculator"
                className="flex-shrink-0 inline-flex items-center gap-2 px-7 py-3.5 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors shadow-sm"
              >
                지금 계산하기
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* ── Features ─────────────────────────────────────── */}
        <section className="py-16 px-4">
          <div className="container max-w-5xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">카테인이 제공하는 서비스</h2>
              <p className="text-muted-foreground text-sm">자동차 구매부터 유지까지 필요한 모든 정보</p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  icon: BookOpen,
                  title: "전문가 매거진",
                  desc: "자동차 구매 가이드, 세금 정보, 보험 팁까지 전문가가 검증한 깊이 있는 콘텐츠를 무료로 제공합니다.",
                  link: "/magazine",
                  linkText: "매거진 보기",
                },
                {
                  icon: Calculator,
                  title: "유지비 계산기",
                  desc: "할부, 보험, 유류비, 자동차세를 한 번에. 내 차의 월 유지비를 정확하게 계산해보세요.",
                  link: "/calculator",
                  linkText: "계산하기",
                },
                {
                  icon: Shield,
                  title: "신뢰할 수 있는 정보",
                  desc: "국토교통부·보험개발원 공식 자료를 기반으로 최신 법규와 시장 동향을 반영한 정보를 제공합니다.",
                  link: "/about",
                  linkText: "소개 보기",
                },
              ].map((item) => (
                <div key={item.title} className="bg-card p-6 rounded-xl border border-border flex flex-col">
                  <div className="w-11 h-11 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <item.icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-bold text-base text-foreground mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground flex-1 leading-relaxed">{item.desc}</p>
                  <Link to={item.link} className="inline-flex items-center gap-1 text-primary text-sm font-medium mt-4 hover:underline">
                    {item.linkText} <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQ ──────────────────────────────────────────── */}
        <section className="py-16 px-4 bg-muted/30 border-y border-border">
          <div className="container max-w-3xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">자주 묻는 질문</h2>
              <p className="text-sm text-muted-foreground">자동차 구매·유지에 관한 핵심 질문에 전문가가 답합니다</p>
            </div>
            <dl className="space-y-2">
              {HOME_FAQS.map((faq, i) => (
                <div key={i} className="border border-border rounded-xl overflow-hidden bg-card">
                  <dt>
                    <button
                      onClick={() => setOpenFaq(openFaq === i ? null : i)}
                      aria-expanded={openFaq === i}
                      aria-controls={`faq-answer-${i}`}
                      id={`faq-question-${i}`}
                      className="w-full flex items-center justify-between px-5 py-4 text-left font-medium text-foreground hover:bg-muted/50 transition-colors gap-3 text-sm"
                    >
                      <span>{faq.question}</span>
                      <ChevronDown
                        className={`w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform duration-200 ${openFaq === i ? "rotate-180" : ""}`}
                      />
                    </button>
                  </dt>
                  {openFaq === i && (
                    <dd
                      id={`faq-answer-${i}`}
                      role="region"
                      aria-labelledby={`faq-question-${i}`}
                      className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed border-t border-border pt-4"
                    >
                      {faq.answer}
                    </dd>
                  )}
                </div>
              ))}
            </dl>
            <p className="text-center mt-8 text-sm text-muted-foreground">
              더 궁금한 점이 있으신가요?{" "}
              <Link to="/contact" className="text-primary underline underline-offset-2">
                문의하기
              </Link>
            </p>
          </div>
        </section>

        {/* ── About / Trust ────────────────────────────────── */}
        <section className="py-16 px-4">
          <div className="container max-w-4xl mx-auto">
            <div className="bg-gradient-to-r from-primary/5 to-accent/10 rounded-2xl border border-border p-8 md:p-10">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div>
                  <h2 className="text-xl md:text-2xl font-bold text-foreground mb-3">카테인에 대해</h2>
                  <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                    카테인은 자동차 구매를 계획하는 모든 분들이 올바른 결정을 내릴 수 있도록
                    정확하고 투명한 정보를 제공하는 자동차 정보 전문 플랫폼입니다.
                    복잡한 세금·보험·유지비 정보를 쉽고 명확하게 전달합니다.
                  </p>
                  <Link to="/about" className="inline-flex items-center gap-1 text-primary text-sm font-medium hover:underline">
                    더 알아보기 <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="bg-card rounded-xl border border-border p-4">
                    <div className="text-2xl font-bold text-primary mb-0.5">
                      {postsCount ? `${postsCount}+` : "115+"}
                    </div>
                    <div className="text-xs text-muted-foreground">전문 자동차 글</div>
                  </div>
                  <div className="bg-card rounded-xl border border-border p-4">
                    <div className="text-2xl font-bold text-primary mb-0.5">무료</div>
                    <div className="text-xs text-muted-foreground">모든 서비스</div>
                  </div>
                  <div className="bg-card rounded-xl border border-border p-4">
                    <div className="text-2xl font-bold text-primary mb-0.5">매주</div>
                    <div className="text-xs text-muted-foreground">새 콘텐츠</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Index;
