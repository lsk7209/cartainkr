import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useSEO, generateBreadcrumbSchema } from "@/hooks/useSEO";
import JsonLd from "@/components/JsonLd";

const Terms = () => {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://cartain.kr';
  
  useSEO({
    title: '서비스 이용약관 - 이용조건 및 정책 안내 | 카테인',
    description: '카테인 서비스 이용약관입니다. 서비스 이용조건, 이용자의 권리와 의무, 면책조항 등을 상세히 안내합니다.',
    canonicalUrl: `${baseUrl}/terms`,
    ogType: 'website',
  });

  const structuredData = generateBreadcrumbSchema([
    { name: '홈', url: baseUrl },
    { name: '이용약관', url: `${baseUrl}/terms` },
  ]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <JsonLd data={structuredData} />
      <Header />
      
      <main className="flex-1 py-12 px-4">
        <div className="container max-w-4xl mx-auto">
          <header className="mb-10">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              이용약관
            </h1>
            <p className="text-muted-foreground">
              시행일: 2024년 1월 1일 | 최종 수정일: 2024년 12월 24일
            </p>
          </header>

          <div className="prose prose-neutral max-w-none">
            <section className="mb-8">
              <h2 className="text-xl font-bold text-foreground mb-4">
                제1조 (목적)
              </h2>
              <div className="bg-muted/30 rounded-lg p-6">
                <p className="text-muted-foreground leading-relaxed">
                  이 약관은 카테인(이하 '회사')가 제공하는 서비스의 이용조건 및 절차, 
                  회사와 이용자의 권리, 의무 및 책임사항과 기타 필요한 사항을 규정함을 목적으로 합니다.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-foreground mb-4">
                제2조 (정의)
              </h2>
              <div className="bg-muted/30 rounded-lg p-6">
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li><strong className="text-foreground">"서비스"</strong>란 회사가 제공하는 모든 서비스를 의미합니다.</li>
                  <li><strong className="text-foreground">"이용자"</strong>란 이 약관에 동의하고 회사가 제공하는 서비스를 이용하는 자를 말합니다.</li>
                  <li><strong className="text-foreground">"콘텐츠"</strong>란 회사가 서비스를 통해 제공하는 모든 정보, 텍스트, 이미지, 영상 등을 의미합니다.</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-foreground mb-4">
                제3조 (약관의 효력 및 변경)
              </h2>
              <div className="bg-muted/30 rounded-lg p-6">
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>이 약관은 서비스를 이용하고자 하는 모든 이용자에게 적용됩니다.</li>
                  <li>회사는 합리적인 사유가 발생할 경우 약관을 변경할 수 있으며, 
                      변경된 약관은 웹사이트에 공지함으로써 효력이 발생합니다.</li>
                  <li>이용자는 변경된 약관에 동의하지 않을 경우 서비스 이용을 중단할 수 있습니다.</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-foreground mb-4">
                제4조 (서비스의 제공)
              </h2>
              <div className="bg-muted/30 rounded-lg p-6">
                <p className="text-foreground mb-4">
                  회사는 다음과 같은 서비스를 제공합니다.
                </p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>자동차 관련 정보 콘텐츠 제공</li>
                  <li>자동차 유지비 계산기 서비스</li>
                  <li>자동차 구매 가이드 및 매거진</li>
                  <li>기타 회사가 정하는 서비스</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-foreground mb-4">
                제5조 (서비스의 중단)
              </h2>
              <div className="bg-muted/30 rounded-lg p-6">
                <p className="text-muted-foreground leading-relaxed">
                  회사는 컴퓨터 등 정보통신설비의 보수점검, 교체 및 고장, 통신두절 또는 
                  운영상 상당한 이유가 있는 경우 서비스의 제공을 일시적으로 중단할 수 있습니다. 
                  이 경우 회사는 사전에 공지하며, 사전 공지가 불가능한 경우 사후에 공지합니다.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-foreground mb-4">
                제6조 (이용자의 의무)
              </h2>
              <div className="bg-muted/30 rounded-lg p-6">
                <p className="text-foreground mb-4">
                  이용자는 다음 행위를 하여서는 안 됩니다.
                </p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>서비스 이용 시 타인의 권리를 침해하는 행위</li>
                  <li>회사의 서비스 운영을 방해하는 행위</li>
                  <li>관련 법령에 위배되는 행위</li>
                  <li>회사의 콘텐츠를 무단으로 복제, 배포하는 행위</li>
                  <li>기타 공공질서 및 미풍양속에 반하는 행위</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-foreground mb-4">
                제7조 (저작권의 귀속)
              </h2>
              <div className="bg-muted/30 rounded-lg p-6">
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>서비스 내 회사가 작성한 저작물에 대한 저작권은 회사에 귀속됩니다.</li>
                  <li>이용자는 서비스를 이용하여 얻은 정보를 회사의 사전 승낙 없이 
                      복제, 송신, 출판, 배포, 방송 등의 방법으로 이용하거나 
                      제3자에게 이용하게 하여서는 안 됩니다.</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-foreground mb-4">
                제8조 (면책조항)
              </h2>
              <div className="bg-muted/30 rounded-lg p-6">
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>회사는 천재지변 또는 이에 준하는 불가항력으로 인하여 
                      서비스를 제공할 수 없는 경우에는 서비스 제공에 관한 책임이 면제됩니다.</li>
                  <li>회사는 이용자의 귀책사유로 인한 서비스 이용의 장애에 대하여 책임을 지지 않습니다.</li>
                  <li>서비스에서 제공하는 정보는 참고용이며, 법적 효력을 갖지 않습니다. 
                      실제 결정에는 전문가 상담을 권장합니다.</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-foreground mb-4">
                제9조 (분쟁의 해결)
              </h2>
              <div className="bg-muted/30 rounded-lg p-6">
                <p className="text-muted-foreground leading-relaxed">
                  이 약관과 관련하여 분쟁이 발생한 경우, 회사와 이용자는 분쟁의 해결을 위해 
                  성실히 협의합니다. 협의가 되지 않을 경우, 관할 법원은 회사의 소재지를 
                  관할하는 법원으로 합니다.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold text-foreground mb-4">
                부칙
              </h2>
              <div className="bg-muted/30 rounded-lg p-6">
                <p className="text-muted-foreground leading-relaxed">
                  이 약관은 2024년 1월 1일부터 시행됩니다.
                </p>
              </div>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Terms;
