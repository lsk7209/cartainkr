import { Car, Users, Target, Award, BookOpen, CheckCircle } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useSEO, generateBreadcrumbSchema, generateOrganizationSchema, generateWebPageSchema } from "@/hooks/useSEO";
import JsonLd from "@/components/JsonLd";
import { BASE_URL } from "@/lib/constants";

const About = () => {
  
  useSEO({
    title: '카테인 소개 | 자동차 구매·유지비 정보',
    description: '카테인은 자동차 구매와 유지비를 비교할 때 필요한 계산 기준, 주의사항과 공식 확인 경로를 정리하는 자동차 정보 플랫폼입니다.',
    canonicalUrl: `${BASE_URL}/about`,
    ogType: 'website',
    keywords: ['카테인', '자동차 정보', '자동차 플랫폼'],
  });

  const structuredData = [
    generateWebPageSchema(
      '카테인 소개 | 자동차 구매·유지비 정보',
      '카테인은 자동차 구매와 유지비를 비교할 때 필요한 계산 기준, 주의사항과 공식 확인 경로를 정리하는 자동차 정보 플랫폼입니다.',
      `${BASE_URL}/about`,
      'AboutPage'
    ),
    generateBreadcrumbSchema([
      { name: '홈', url: BASE_URL },
      { name: '소개', url: `${BASE_URL}/about` },
    ]),
    generateOrganizationSchema(),
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
              자동차 구매와 유지비를 비교하는 기준과 확인 경로를 정리합니다
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
                카테인은 자동차 구매를 앞둔 사람이 차량 가격만 보지 않고 할부, 보험, 세금,
                연료·충전비와 정비비까지 함께 비교하도록 돕습니다. 계산 결과의 가정과 한계를 밝히고,
                계약 전에 다시 확인해야 할 공식 경로를 함께 안내하는 것이 목표입니다.
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
                <h3 className="font-bold text-foreground mb-2">근거 구분</h3>
                <p className="text-sm text-muted-foreground">
                  변동 가능한 수치와 제도는 기준 시점과 확인 경로를 함께 안내합니다
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
                <h3 className="font-bold text-foreground mb-2">투명성</h3>
                <p className="text-sm text-muted-foreground">
                  계산의 가정, 정보의 한계와 제휴 광고 관계를 구분해 표시합니다
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
                    <strong className="text-foreground">자동차 매거진</strong>
                    <p className="text-muted-foreground text-sm mt-1">
                      자동차 구매, 세금, 보험과 정비 조건을 확인하는 실용 가이드
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
                    <strong className="text-foreground">변동 정보 확인 안내</strong>
                    <p className="text-muted-foreground text-sm mt-1">
                      세금, 보조금과 시장 조건이 달라질 때 확인할 공식 경로 안내
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
                    <p className="text-sm text-muted-foreground">수치와 제도를 인용할 때는 가능한 범위에서 기준 시점과 공식 확인 경로를 표시합니다.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">변경 가능성 표시</h3>
                    <p className="text-sm text-muted-foreground">법규·세율·보험료처럼 달라질 수 있는 정보는 계약 전 재확인을 안내합니다.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">광고 구분</h3>
                    <p className="text-sm text-muted-foreground">제휴 광고는 광고임을 표시하고 계산·편집 정보와 구분합니다.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <BookOpen className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">출처 명시</h3>
                    <p className="text-sm text-muted-foreground">통계·수치를 인용하는 경우 독자가 원문을 확인할 수 있는 링크를 우선 제공합니다.</p>
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
                <p>운영: 카테인</p>
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
