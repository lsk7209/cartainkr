import { Link } from "react-router-dom";
import { BookOpen, Calculator, ArrowRight, Car, TrendingUp, Shield } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import JsonLd from "@/components/JsonLd";
import { useSEO, generateWebSiteSchema, generateOrganizationSchema } from "@/hooks/useSEO";

const Index = () => {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://cartain.kr';
  const currentYear = new Date().getFullYear();
  
  // Apply SEO meta tags
  useSEO({
    title: '자동차 유지비 계산기 & 구매 가이드 | 카테인',
    description: `자동차 할부금, 보험료, 유류비 계산부터 구매 가이드까지. ${currentYear}년 최신 자동차 정보와 전문가 칼럼을 무료로 제공합니다.`,
    canonicalUrl: baseUrl,
    ogType: 'website',
    keywords: ['자동차 유지비', '자동차 계산기', '자동차 구매 가이드', '자동차 보험', '자동차 할부'],
  });

  // Generate structured data
  const structuredData = [
    generateWebSiteSchema(),
    generateOrganizationSchema(),
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Structured Data for SEO */}
      <JsonLd data={structuredData} />
      
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-20 px-4">
          <div className="container max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent rounded-full text-accent-foreground text-sm font-medium mb-6 animate-fade-in">
              <Car className="w-4 h-4" />
              스마트한 자동차 정보 플랫폼
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6 animate-slide-up">
              자동차 구매부터 유지비까지,
              <br />
              <span className="text-primary">카테인</span>과 함께
            </h1>
            
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10 animate-slide-up" style={{ animationDelay: "0.1s" }}>
              복잡한 자동차 정보를 쉽고 명확하게.
              전문가 칼럼과 실용적인 계산기로 현명한 선택을 도와드립니다.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up" style={{ animationDelay: "0.2s" }}>
              <Link
                to="/magazine"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
              >
                <BookOpen className="w-5 h-5" />
                매거진 읽기
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/calculator"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/80 transition-colors"
              >
                <Calculator className="w-5 h-5" />
                유지비 계산하기
              </Link>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-16 px-4 bg-muted/30">
          <div className="container max-w-5xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-10">
              카테인이 제공하는 서비스
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-card p-6 rounded-xl border border-border">
                <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center mb-4">
                  <BookOpen className="w-6 h-6 text-accent-foreground" />
                </div>
                <h3 className="font-bold text-lg text-foreground mb-2">전문가 매거진</h3>
                <p className="text-muted-foreground text-sm">
                  자동차 구매 가이드, 세금 정보, 보험 팁까지 전문가가 직접 작성한 깊이 있는 콘텐츠
                </p>
              </div>

              <div className="bg-card p-6 rounded-xl border border-border">
                <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center mb-4">
                  <TrendingUp className="w-6 h-6 text-accent-foreground" />
                </div>
                <h3 className="font-bold text-lg text-foreground mb-2">유지비 계산기</h3>
                <p className="text-muted-foreground text-sm">
                  할부, 보험, 유류비까지 한 번에. 내 차의 실제 유지비를 정확하게 계산해보세요
                </p>
              </div>

              <div className="bg-card p-6 rounded-xl border border-border">
                <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6 text-accent-foreground" />
                </div>
                <h3 className="font-bold text-lg text-foreground mb-2">신뢰할 수 있는 정보</h3>
                <p className="text-muted-foreground text-sm">
                  최신 자동차 시장 동향과 법규를 반영한 정확하고 신뢰할 수 있는 정보를 제공합니다
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* About Section */}
        <section className="py-16 px-4">
          <div className="container max-w-4xl mx-auto">
            <div className="bg-card rounded-2xl border border-border p-8 md:p-12">
              <div className="text-center mb-8">
                <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
                  카테인 소개
                </h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  카테인은 자동차 구매를 계획하는 모든 분들이 올바른 결정을 내릴 수 있도록 
                  정확하고 투명한 정보를 제공하는 자동차 정보 전문 플랫폼입니다.
                </p>
              </div>
              <div className="grid md:grid-cols-3 gap-6 text-center">
                <div>
                  <div className="text-3xl font-bold text-primary mb-2">100+</div>
                  <div className="text-sm text-muted-foreground">전문 콘텐츠</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-primary mb-2">50,000+</div>
                  <div className="text-sm text-muted-foreground">월간 방문자</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-primary mb-2">98%</div>
                  <div className="text-sm text-muted-foreground">사용자 만족도</div>
                </div>
              </div>
              <div className="text-center mt-8">
                <Link
                  to="/about"
                  className="inline-flex items-center gap-2 text-primary hover:underline font-medium"
                >
                  더 알아보기 <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 px-4 bg-muted/30">
          <div className="container max-w-3xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
              지금 바로 시작하세요
            </h2>
            <p className="text-muted-foreground mb-8">
              복잡한 자동차 정보, 카테인이 쉽게 정리해 드립니다
            </p>
            <Link
              to="/calculator"
              className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              내 차 유지비 계산하기
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Index;
