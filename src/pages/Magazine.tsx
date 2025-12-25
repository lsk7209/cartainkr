import { useEffect, useState } from "react";
import { Calendar, Clock, User, Lightbulb } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import TableOfContents from "@/components/TableOfContents";

interface TOCItem {
  id: string;
  text: string;
}

const Magazine = () => {
  const [tocItems, setTocItems] = useState<TOCItem[]>([]);

  useEffect(() => {
    // h2 태그에서 목차 추출
    const headings = document.querySelectorAll("article h2");
    const items: TOCItem[] = [];
    
    headings.forEach((heading, index) => {
      const id = `section-${index}`;
      heading.id = id;
      items.push({
        id,
        text: heading.textContent || "",
      });
    });
    
    setTocItems(items);
  }, []);

  return (
    <div className="min-h-screen bg-magazine-bg flex flex-col">
      <Header />
      
      <main className="flex-1 py-12 px-4">
        <article className="max-w-magazine mx-auto magazine-body">
          {/* Article Header */}
          <header className="mb-10">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <span className="px-2 py-1 bg-accent text-accent-foreground rounded text-xs font-medium">
                구매 가이드
              </span>
            </div>
            
            <h1 className="magazine-heading text-3xl md:text-4xl mb-6 leading-tight">
              2024년 신차 구매 시 반드시 알아야 할 세금과 유지비 완벽 가이드
            </h1>
            
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <User className="w-4 h-4" />
                <span>DriveFlow 에디터</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                <span>2024.12.24</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                <span>8분 소요</span>
              </div>
            </div>
          </header>

          {/* Table of Contents */}
          <TableOfContents items={tocItems} />

          {/* Article Content */}
          <section className="space-y-8">
            <p className="text-lg leading-relaxed">
              새 차를 구매할 때 차량 가격만 생각하면 큰코다칠 수 있습니다. 
              취득세, 등록세, 보험료, 그리고 매달 나가는 유지비까지 
              꼼꼼히 따져봐야 후회 없는 선택을 할 수 있죠. 
              이 글에서는 신차 구매 시 반드시 알아야 할 모든 비용을 정리해 드립니다.
            </p>

            <h2 className="magazine-heading text-2xl pt-4">
              신차 구매 시 발생하는 세금 종류
            </h2>

            <p>
              자동차를 구매하면 여러 종류의 세금이 발생합니다. 
              크게 취득세, 개별소비세, 교육세, 부가가치세로 나눌 수 있으며, 
              차량 가격과 배기량에 따라 금액이 달라집니다.
            </p>

            <table className="styled-table">
              <thead>
                <tr>
                  <th>세금 종류</th>
                  <th>세율</th>
                  <th>비고</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>취득세</td>
                  <td>7%</td>
                  <td>차량 가격 기준</td>
                </tr>
                <tr>
                  <td>개별소비세</td>
                  <td>5%</td>
                  <td>2000cc 초과 시</td>
                </tr>
                <tr>
                  <td>교육세</td>
                  <td>30%</td>
                  <td>개별소비세의 30%</td>
                </tr>
                <tr>
                  <td>부가가치세</td>
                  <td>10%</td>
                  <td>차량 가격 + 세금</td>
                </tr>
              </tbody>
            </table>

            <div className="info-box">
              <p className="info-box-title">
                <Lightbulb className="w-4 h-4" />
                꿀팁
              </p>
              <p>
                전기차나 하이브리드 차량은 취득세 감면 혜택이 있습니다. 
                전기차는 최대 140만원, 하이브리드는 최대 40만원까지 감면받을 수 있으니 
                친환경차 구매를 고려해 보세요!
              </p>
            </div>

            <h2 className="magazine-heading text-2xl pt-4">
              월별 유지비 항목별 분석
            </h2>

            <p>
              자동차 유지비는 단순히 기름값만 있는 게 아닙니다. 
              보험료, 자동차세, 정비비, 주차비 등 다양한 항목이 있으며, 
              이를 정확히 파악해야 월 예산을 세울 수 있습니다.
            </p>

            <blockquote className="blockquote-style">
              "자동차는 사는 것보다 유지하는 것이 더 비싸다"는 말이 있습니다. 
              실제로 5년간 차량을 운행하면 구매가의 50% 이상이 유지비로 나갑니다.
            </blockquote>

            <p>
              일반적인 중형차(2000cc) 기준으로 월 평균 유지비를 계산해 보면, 
              유류비 약 15만원, 보험료 약 8만원, 자동차세 약 4만원, 
              정비비 및 소모품 약 5만원으로 총 32만원 정도가 필요합니다.
            </p>

            <h2 className="magazine-heading text-2xl pt-4">
              보험료 절감 방법
            </h2>

            <p>
              자동차 보험료는 운전자의 나이, 사고 이력, 차량 종류 등에 따라 크게 달라집니다. 
              하지만 몇 가지 방법을 통해 보험료를 절감할 수 있습니다.
            </p>

            <div className="info-box">
              <p className="info-box-title">
                <Lightbulb className="w-4 h-4" />
                보험료 절감 팁
              </p>
              <p>
                1. 무사고 할인을 유지하세요 - 3년 무사고 시 최대 50% 할인<br />
                2. 마일리지 특약을 활용하세요 - 주행거리가 적다면 최대 30% 할인<br />
                3. 여러 보험사 비교견적을 받으세요 - 최대 20% 차이 발생
              </p>
            </div>

            <h2 className="magazine-heading text-2xl pt-4">
              할부 구매 시 주의사항
            </h2>

            <p>
              많은 분들이 자동차를 할부로 구매합니다. 
              하지만 할부 금리와 조건을 꼼꼼히 따져보지 않으면 
              생각보다 많은 이자를 지불하게 될 수 있습니다.
            </p>

            <table className="styled-table">
              <thead>
                <tr>
                  <th>할부 기간</th>
                  <th>평균 금리</th>
                  <th>총 이자 (3000만원 기준)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>24개월</td>
                  <td>4.5%</td>
                  <td>약 140만원</td>
                </tr>
                <tr>
                  <td>36개월</td>
                  <td>5.0%</td>
                  <td>약 235만원</td>
                </tr>
                <tr>
                  <td>48개월</td>
                  <td>5.5%</td>
                  <td>약 345만원</td>
                </tr>
                <tr>
                  <td>60개월</td>
                  <td>6.0%</td>
                  <td>약 475만원</td>
                </tr>
              </tbody>
            </table>

            <blockquote className="blockquote-style">
              할부 기간이 길어질수록 월 납입금은 줄어들지만, 
              총 이자 부담은 크게 늘어납니다. 
              가능하다면 짧은 기간 내에 상환하는 것이 유리합니다.
            </blockquote>

            <h2 className="magazine-heading text-2xl pt-4">
              결론: 스마트한 자동차 구매를 위하여
            </h2>

            <p>
              자동차 구매는 큰 결정입니다. 
              차량 가격뿐만 아니라 세금, 보험료, 유지비까지 종합적으로 고려해야 
              현명한 선택을 할 수 있습니다. 
              DriveFlow의 계산기를 활용하여 내 상황에 맞는 정확한 비용을 계산해 보세요.
            </p>

            <div className="info-box">
              <p className="info-box-title">
                <Lightbulb className="w-4 h-4" />
                요약
              </p>
              <p>
                • 신차 구매 시 차량 가격의 약 10~15%가 세금으로 발생<br />
                • 월 평균 유지비는 중형차 기준 약 30~40만원<br />
                • 보험료는 비교견적과 특약 활용으로 절감 가능<br />
                • 할부 기간은 짧을수록 총 비용 절감
              </p>
            </div>
          </section>
        </article>
      </main>

      <Footer />
    </div>
  );
};

export default Magazine;
