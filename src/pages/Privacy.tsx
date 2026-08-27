import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useSEO, generateBreadcrumbSchema, generateWebPageSchema } from "@/hooks/useSEO";
import JsonLd from "@/components/JsonLd";
import { BASE_URL } from "@/lib/constants";
import { storeMeasurementConsent } from "@/lib/analytics";

const Privacy = () => {
  const withdrawConsent = () => {
    storeMeasurementConsent(false);
    window.location.reload();
  };
  
  useSEO({
    title: '개인정보처리방침 - 개인정보 수집 및 이용 안내 | 카테인',
    description: '카테인 개인정보처리방침 안내. 서비스 이용 중 수집되는 개인정보 항목, 이용 목적, 보유 기간, 제3자 제공 여부 및 이용자 권리를 투명하게 공개합니다.',
    canonicalUrl: `${BASE_URL}/privacy`,
    ogType: 'website',
  });

  const structuredData = [
    generateWebPageSchema(
      '개인정보처리방침 | 카테인',
      '카테인 개인정보처리방침. 수집 항목, 이용 목적, 보유 기간, Google 및 쿠팡 파트너스 제3자 서비스 안내.',
      `${BASE_URL}/privacy`
    ),
    generateBreadcrumbSchema([
      { name: '홈', url: BASE_URL },
      { name: '개인정보처리방침', url: `${BASE_URL}/privacy` },
    ]),
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <JsonLd data={structuredData} />
      <Header />
      
      <main id="main-content" className="flex-1 py-12 px-4">
        <div className="container max-w-4xl mx-auto">
          <header className="mb-10">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              개인정보처리방침
            </h1>
            <p className="text-muted-foreground">
              시행일: 2025년 1월 1일 | 최종 수정일: 2026년 8월 28일
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
                  사이트는 회원가입이나 자체 문의 폼을 운영하지 않습니다. 다만 이용자가 분석·광고에 동의하면
                  제3자 서비스 이용 과정에서 다음 정보가 처리될 수 있습니다.
                </p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>동의 상태: 브라우저 로컬 저장소에 저장되는 동의·거부 선택</li>
                  <li>제3자 처리 가능 정보: 방문 페이지, 접속 시각, 브라우저·기기 정보, IP 주소와 광고·분석 식별자</li>
                  <li>이메일 문의 시: 이용자가 메일에 직접 기재한 이메일 주소와 문의 내용</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-foreground mb-4">
                제3조 (개인정보의 보유 및 이용 기간)
              </h2>
              <div className="bg-muted/30 rounded-lg p-6">
                <p className="text-muted-foreground leading-relaxed">
                  동의 선택은 이용자가 철회하거나 브라우저 저장 정보를 삭제할 때까지 해당 브라우저에 남습니다.
                  제3자 서비스에서 처리되는 정보는 각 사업자의 보유 정책을 따르며,
                  이메일 문의 내용은 답변과 분쟁 대응에 필요한 기간 또는 관련 법령이 요구하는 기간까지만 보관합니다.
                </p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground mt-4">
                  <li>브라우저 동의 선택: 철회 또는 브라우저 저장 정보 삭제 시까지</li>
                  <li>Google·제휴 배너 처리 정보: 각 서비스의 공개된 보유 정책에 따름</li>
                  <li>이메일 문의: 처리 목적 달성 후 지체 없이 삭제하되 법정 보존 의무가 있으면 해당 기간까지</li>
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
                  카테인은 첫 방문 시 동의 창을 제공하며, 이용자가 동의하기 전에는
                  Google Analytics, Google AdSense 및 쿠팡 파트너스 제휴 배너의 외부 이미지·측정 스크립트를 불러오지 않습니다.
                  거부하더라도 계산기와 매거진의 핵심 기능은 계속 이용할 수 있습니다.
                </p>
                <button
                  type="button"
                  onClick={withdrawConsent}
                  className="mt-4 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
                >
                  분석·광고 동의 철회
                </button>
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
                  <p>이메일: privacy@cartain.kr</p>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-foreground mb-4">
                제8조 (제3자 광고 서비스)
              </h2>
              <div className="bg-muted/30 rounded-lg p-6">
                <p className="text-muted-foreground leading-relaxed mb-4">
                  회사는 서비스 운영 및 콘텐츠 제공을 위해 다음과 같은 제3자 서비스를 이용합니다.
                </p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>
                    <strong className="text-foreground">Google AdSense</strong> — 광고 게재 서비스.
                    이용자가 동의한 경우 Google은 쿠키를 사용하여 광고를 제공할 수 있습니다.
                    이용자는 <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google 광고 설정</a>에서
                    개인 맞춤 광고를 비활성화할 수 있습니다.
                  </li>
                  <li>
                    <strong className="text-foreground">Google Analytics</strong> — 웹 분석 서비스.
                    이용자가 동의한 경우 방문 통계 분석을 위한 데이터를 처리합니다.
                    이용자는 <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google Analytics 차단 플러그인</a>을 통해
                    수집을 거부할 수 있습니다.
                  </li>
                  <li>
                    <strong className="text-foreground">쿠팡 파트너스 배너</strong> — 제휴 광고 표시와 클릭·노출 집계 서비스.
                    이용자가 동의한 경우에만 제휴 배너 이미지와 측정 스크립트를 불러오며,
                    이 과정에서 현재 페이지 주소와 브라우저·접속 정보가 제휴 배너 운영 서버로 전달될 수 있습니다.
                  </li>
                  <li>
                    <strong className="text-foreground">Supabase Storage·jsDelivr</strong> — 게시글 이미지와 웹 글꼴 제공에 사용하는 콘텐츠 전송 서비스.
                    핵심 화면 자료를 전송하는 과정에서 IP 주소, 요청 시각과 브라우저 정보가 처리될 수 있으며,
                    분석·맞춤 광고 동의와 관계없이 필요한 콘텐츠 제공 목적으로 요청될 수 있습니다.
                  </li>
                </ul>
                <p className="text-muted-foreground leading-relaxed mt-4">
                  이러한 제3자 서비스의 개인정보 처리 방침은 각 사업자의 정책을 따르며,
                  회사는 이에 대한 책임을 지지 않습니다.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold text-foreground mb-4">
                제9조 (개인정보처리방침 변경)
              </h2>
              <div className="bg-muted/30 rounded-lg p-6">
                <p className="text-muted-foreground leading-relaxed">
                  이 개인정보처리방침은 2025년 1월 1일부터 적용됩니다.
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
