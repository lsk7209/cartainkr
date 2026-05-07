import { Car, Users, Target, Award, BookOpen, CheckCircle } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useSEO, generateBreadcrumbSchema, generateOrganizationSchema, generateWebPageSchema, generateAuthorSchema } from "@/hooks/useSEO";
import JsonLd from "@/components/JsonLd";
import { BASE_URL } from "@/lib/constants";

const About = () => {
  
  useSEO({
    title: '자동차 정보 전문 플랫폼 소개 | 카테인',
    description: '카테인은 자동차 구매, 유지비, 보험, 세금 정보를 쉽고 정확하게 제공하는 자동차 정보 전문 플랫폼입니다. 전문 에디터가 작성한 신뢰할 수 있는 자동차 콘텐츠를 무료로 확인하세요.',
    canonicalUrl: `${BASE_URL}/about`,
    ogType: 'website',
    keywords: ['카테인', '자동차 정보', '자동차 플랫폼'],
  });

  const structuredData = [
    generateWebPageSchema(
      '자동차 정보 전문 플랫폼 소개 | 카테인',
      '카테인은 자동차 구매, 유지비, 보험, 세금 정보를 쉽고 정확하게 제공하는 자동차 정보 전문 플랫폼입니다.',
      `${BASE_URL}/about`,
      'AboutPage'
    ),
    generateBreadcrumbSchema([
      { name: '홈', url: BASE_URL },
      { name: '소개', url: `${BASE_URL}/about` },
    ]),
    generateOrganizationSchema(),
    generateAuthorSchema(),
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <JsonLd data={structuredData} />
      <Header />
      
      <main id="main-content" className="flex-1 py-12 px-4">
        <div className="container max-w-4xl mx-auto">
          <header className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              카테인 소개
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              자동차 구매와 유지비에 관한 신뢰할 수 있는 정보를 제공하는 전문 플랫폼입니다
            </p>
          </header>

          {/* Mission Section */}
          <section className="mb-12">
            <div className="bg-card rounded-xl border border-border p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Target className="w-6 h-6 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">우리의 미션</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                카테인은 자동차 구매를 계획하는 모든 분들이 올바른 결정을 내릴 수 있도록 
                정확하고 투명한 정보를 제공합니다. 복잡한 세금, 보험, 유지비 정보를 
                쉽고 명확하게 전달하여 소비자의 현명한 선택을 돕는 것이 우리의 목표입니다.
              </p>
            </div>
          </section>

          {/* Values Section */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-foreground mb-6 text-center">
              핵심 가치
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-card rounded-xl border border-border p-6 text-center">
                <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Award className="w-6 h-6 text-accent-foreground" />
                </div>
                <h3 className="font-bold text-foreground mb-2">신뢰성</h3>
                <p className="text-sm text-muted-foreground">
                  전문가가 검증한 정확한 정보만을 제공합니다
                </p>
              </div>
              <div className="bg-card rounded-xl border border-border p-6 text-center">
                <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Users className="w-6 h-6 text-accent-foreground" />
                </div>
                <h3 className="font-bold text-foreground mb-2">사용자 중심</h3>
                <p className="text-sm text-muted-foreground">
                  독자의 입장에서 필요한 정보를 쉽게 전달합니다
                </p>
              </div>
              <div className="bg-card rounded-xl border border-border p-6 text-center">
                <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Car className="w-6 h-6 text-accent-foreground" />
                </div>
                <h3 className="font-bold text-foreground mb-2">전문성</h3>
                <p className="text-sm text-muted-foreground">
                  자동차 분야의 깊은 지식과 경험을 바탕으로 합니다
                </p>
              </div>
            </div>
          </section>

          {/* Services Section */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-foreground mb-6 text-center">
              제공 서비스
            </h2>
            <div className="bg-muted/30 rounded-xl p-8">
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></span>
                  <div>
                    <strong className="text-foreground">전문 매거진 콘텐츠</strong>
                    <p className="text-muted-foreground text-sm mt-1">
                      자동차 구매 가이드, 세금 정보, 보험 팁 등 전문가가 작성한 깊이 있는 콘텐츠
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></span>
                  <div>
                    <strong className="text-foreground">유지비 계산기</strong>
                    <p className="text-muted-foreground text-sm mt-1">
                      할부, 보험, 유류비까지 한 번에 계산할 수 있는 실용적인 도구
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></span>
                  <div>
                    <strong className="text-foreground">최신 시장 정보</strong>
                    <p className="text-muted-foreground text-sm mt-1">
                      자동차 시장 동향, 신차 출시 소식, 정책 변화 등 최신 정보 제공
                    </p>
                  </div>
                </li>
              </ul>
            </div>
          </section>

          {/* Editorial Process - EEAT signal */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-foreground mb-6 text-center">
              편집 원칙
            </h2>
            <div className="bg-card rounded-xl border border-border p-8">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">정확성 우선</h3>
                    <p className="text-sm text-muted-foreground">모든 수치와 제도 정보는 발행 시점의 공식 자료를 기준으로 작성합니다.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">정기 업데이트</h3>
                    <p className="text-sm text-muted-foreground">법규·세율·보험료 변경 시 해당 콘텐츠를 즉시 수정합니다.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">광고 독립성</h3>
                    <p className="text-sm text-muted-foreground">광고 파트너의 영향 없이 독립적인 시각으로 정보를 제공합니다.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <BookOpen className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">출처 명시</h3>
                    <p className="text-sm text-muted-foreground">통계·수치 인용 시 국토교통부, 보험개발원 등 공신력 있는 출처를 기재합니다.</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Company Info */}
          <section>
            <div className="bg-card rounded-xl border border-border p-8 text-center">
              <h2 className="text-xl font-bold text-foreground mb-4">카테인</h2>
              <p className="text-muted-foreground mb-4">
                자동차 정보의 새로운 기준
              </p>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>사업자: 카테인</p>
                <p>이메일: <a href="mailto:contact@cartain.kr" className="text-primary hover:underline">contact@cartain.kr</a></p>
                <p>© {new Date().getFullYear()} 카테인. All rights reserved.</p>
              </div>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default About;
