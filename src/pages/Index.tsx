import { Link } from "react-router-dom";
import { BookOpen, Calculator, ArrowRight, Car, TrendingUp, Shield } from "lucide-react";
import Header from "@/components/Header";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main>
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
              <span className="text-primary">DriveFlow</span>와 함께
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

        {/* CTA */}
        <section className="py-20 px-4">
          <div className="container max-w-3xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
              지금 바로 시작하세요
            </h2>
            <p className="text-muted-foreground mb-8">
              복잡한 자동차 정보, DriveFlow가 쉽게 정리해 드립니다
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

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border">
        <div className="container max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Car className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-bold text-foreground">DriveFlow Ads</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 DriveFlow Ads. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
