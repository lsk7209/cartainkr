import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useSEO, generateBreadcrumbSchema } from "@/hooks/useSEO";
import JsonLd from "@/components/JsonLd";

const Privacy = () => {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://catein.kr';
  
  useSEO({
    title: '개인정보처리방침 | 카테인',
    description: '카테인의 개인정보처리방침입니다. 이용자의 개인정보 수집, 이용, 보유 기간 등에 대해 안내합니다.',
    canonicalUrl: `${baseUrl}/privacy`,
    ogType: 'website',
  });

  const structuredData = generateBreadcrumbSchema([
    { name: '홈', url: baseUrl },
    { name: '개인정보처리방침', url: `${baseUrl}/privacy` },
  ]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <JsonLd data={structuredData} />
      <Header />
      
      <main className="flex-1 py-12 px-4">
        <div className="container max-w-4xl mx-auto">
          <header className="mb-10">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              개인정보처리방침
            </h1>
            <p className="text-muted-foreground">
              시행일: 2024년 1월 1일 | 최종 수정일: 2024년 12월 24일
            </p>
          </header>

          <div className="prose prose-neutral max-w-none">
            <div className="bg-card rounded-xl border border-border p-6 mb-8">
              <p className="text-muted-foreground leading-relaxed">
                카테인(이하 '회사')는 이용자의 개인정보를 중요시하며, 
                「개인정보 보호법」을 준수하고 있습니다. 
                회사는 개인정보처리방침을 통하여 이용자가 제공하는 개인정보가 
                어떠한 용도와 방식으로 이용되고 있으며, 
                개인정보보호를 위해 어떠한 조치가 취해지고 있는지 알려드립니다.
              </p>
            </div>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-foreground mb-4">
                제1조 (개인정보의 수집 및 이용 목적)
              </h2>
              <div className="bg-muted/30 rounded-lg p-6">
                <p className="text-foreground mb-4">
                  회사는 다음의 목적을 위하여 개인정보를 처리합니다. 
                  처리하고 있는 개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며, 
                  이용 목적이 변경되는 경우에는 별도의 동의를 받는 등 필요한 조치를 이행할 예정입니다.
                </p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>서비스 제공 및 운영</li>
                  <li>서비스 개선 및 신규 서비스 개발</li>
                  <li>이용자 문의 응대 및 고객 지원</li>
                  <li>마케팅 및 광고에의 활용 (선택 동의 시)</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-foreground mb-4">
                제2조 (수집하는 개인정보의 항목)
              </h2>
              <div className="bg-muted/30 rounded-lg p-6">
                <p className="text-foreground mb-4">
                  회사는 서비스 제공을 위해 다음과 같은 개인정보를 수집할 수 있습니다.
                </p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>필수항목: 서비스 이용 기록, 접속 로그, 쿠키, 접속 IP 정보</li>
                  <li>선택항목: 이메일 주소 (뉴스레터 구독 시)</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-foreground mb-4">
                제3조 (개인정보의 보유 및 이용 기간)
              </h2>
              <div className="bg-muted/30 rounded-lg p-6">
                <p className="text-muted-foreground leading-relaxed">
                  회사는 법령에 따른 개인정보 보유·이용 기간 또는 정보주체로부터 
                  개인정보를 수집 시에 동의받은 개인정보 보유·이용 기간 내에서 개인정보를 처리·보유합니다.
                  각각의 개인정보 처리 및 보유 기간은 다음과 같습니다.
                </p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground mt-4">
                  <li>서비스 이용 기록: 3년</li>
                  <li>접속 로그: 3개월</li>
                  <li>뉴스레터 구독 정보: 구독 해지 시까지</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-foreground mb-4">
                제4조 (개인정보의 제3자 제공)
              </h2>
              <div className="bg-muted/30 rounded-lg p-6">
                <p className="text-muted-foreground leading-relaxed">
                  회사는 원칙적으로 이용자의 개인정보를 외부에 제공하지 않습니다. 
                  다만, 아래의 경우에는 예외로 합니다.
                </p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground mt-4">
                  <li>이용자가 사전에 동의한 경우</li>
                  <li>법령의 규정에 의거하거나, 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-foreground mb-4">
                제5조 (쿠키의 사용)
              </h2>
              <div className="bg-muted/30 rounded-lg p-6">
                <p className="text-muted-foreground leading-relaxed">
                  회사는 이용자에게 개별적인 맞춤 서비스를 제공하기 위해 쿠키(cookie)를 사용합니다.
                  쿠키는 웹사이트를 운영하는데 이용되는 서버가 이용자의 브라우저에게 보내는 
                  아주 작은 텍스트 파일로 이용자의 컴퓨터 하드디스크에 저장됩니다.
                </p>
                <p className="text-muted-foreground leading-relaxed mt-4">
                  이용자는 쿠키 설치에 대한 선택권을 가지고 있습니다. 
                  따라서, 이용자는 웹브라우저에서 옵션을 설정함으로써 
                  모든 쿠키를 허용하거나, 쿠키가 저장될 때마다 확인을 거치거나, 
                  아니면 모든 쿠키의 저장을 거부할 수도 있습니다.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-foreground mb-4">
                제6조 (개인정보의 안전성 확보 조치)
              </h2>
              <div className="bg-muted/30 rounded-lg p-6">
                <p className="text-foreground mb-4">
                  회사는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고 있습니다.
                </p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>개인정보 취급 직원의 최소화 및 교육</li>
                  <li>해킹 등에 대비한 기술적 대책</li>
                  <li>개인정보에 대한 접근 제한</li>
                  <li>개인정보의 암호화</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-foreground mb-4">
                제7조 (개인정보 보호책임자)
              </h2>
              <div className="bg-muted/30 rounded-lg p-6">
                <p className="text-muted-foreground leading-relaxed mb-4">
                  회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 
                  개인정보 처리와 관련한 정보주체의 불만처리 및 피해구제 등을 위하여 
                  아래와 같이 개인정보 보호책임자를 지정하고 있습니다.
                </p>
                <div className="text-muted-foreground">
                  <p><strong className="text-foreground">개인정보 보호책임자</strong></p>
                  <p>이메일: privacy@catein.kr</p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold text-foreground mb-4">
                제8조 (개인정보처리방침 변경)
              </h2>
              <div className="bg-muted/30 rounded-lg p-6">
                <p className="text-muted-foreground leading-relaxed">
                  이 개인정보처리방침은 2024년 1월 1일부터 적용됩니다. 
                  법령 및 방침에 따른 변경내용의 추가, 삭제 및 정정이 있는 경우에는 
                  변경사항의 시행 7일 전부터 공지사항을 통하여 고지할 것입니다.
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

export default Privacy;
