import { Mail, MessageSquare, Clock, MapPin } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const Contact = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 py-12 px-4">
        <div className="container max-w-4xl mx-auto">
          <header className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              문의하기
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              DriveFlow에 대한 문의사항이 있으시면 아래 연락처로 문의해 주세요
            </p>
          </header>

          {/* Contact Cards */}
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            <div className="bg-card rounded-xl border border-border p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Mail className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground">이메일 문의</h3>
                  <p className="text-sm text-muted-foreground">일반 문의</p>
                </div>
              </div>
              <a 
                href="mailto:contact@driveflow.kr" 
                className="text-primary hover:underline font-medium"
              >
                contact@driveflow.kr
              </a>
            </div>

            <div className="bg-card rounded-xl border border-border p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground">광고 및 제휴</h3>
                  <p className="text-sm text-muted-foreground">비즈니스 문의</p>
                </div>
              </div>
              <a 
                href="mailto:ads@driveflow.kr" 
                className="text-primary hover:underline font-medium"
              >
                ads@driveflow.kr
              </a>
            </div>
          </div>

          {/* Additional Info */}
          <div className="bg-muted/30 rounded-xl p-8 mb-12">
            <h2 className="text-xl font-bold text-foreground mb-6 text-center">
              문의 안내
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-card rounded-lg flex items-center justify-center flex-shrink-0">
                  <Clock className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">응답 시간</h3>
                  <p className="text-sm text-muted-foreground">
                    영업일 기준 1-2일 이내에 답변드립니다.<br />
                    (주말 및 공휴일 제외)
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-card rounded-lg flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">운영 시간</h3>
                  <p className="text-sm text-muted-foreground">
                    평일 09:00 - 18:00<br />
                    (점심시간 12:00 - 13:00)
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* FAQ Section */}
          <section>
            <h2 className="text-2xl font-bold text-foreground mb-6 text-center">
              자주 묻는 질문
            </h2>
            <div className="space-y-4">
              <div className="bg-card rounded-xl border border-border p-6">
                <h3 className="font-bold text-foreground mb-2">
                  Q. 계산기 결과가 실제와 다를 수 있나요?
                </h3>
                <p className="text-muted-foreground text-sm">
                  A. 네, 계산기는 참고용으로 제공됩니다. 실제 금액은 차량 조건, 보험사, 
                  지역 등에 따라 달라질 수 있으므로 정확한 견적은 전문가 상담을 권장합니다.
                </p>
              </div>
              <div className="bg-card rounded-xl border border-border p-6">
                <h3 className="font-bold text-foreground mb-2">
                  Q. 콘텐츠를 다른 곳에 사용해도 되나요?
                </h3>
                <p className="text-muted-foreground text-sm">
                  A. DriveFlow의 콘텐츠는 저작권법에 의해 보호됩니다. 
                  개인적인 참고 목적 외의 무단 복제, 배포, 상업적 이용은 금지되어 있습니다. 
                  콘텐츠 활용을 원하시면 사전에 문의해 주세요.
                </p>
              </div>
              <div className="bg-card rounded-xl border border-border p-6">
                <h3 className="font-bold text-foreground mb-2">
                  Q. 광고 게재는 어떻게 신청하나요?
                </h3>
                <p className="text-muted-foreground text-sm">
                  A. 광고 및 제휴 문의는 ads@driveflow.kr로 연락해 주시면 
                  담당자가 상세 안내를 드립니다.
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Contact;
