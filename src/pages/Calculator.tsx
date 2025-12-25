import { useState, useRef, useCallback } from "react";
import html2canvas from "html2canvas";
import { Download, Car, Fuel, Shield, Percent, Calendar, ArrowRight } from "lucide-react";
import Header from "@/components/Header";
import LoadingScreen from "@/components/LoadingScreen";
import ReceiptFooter from "@/components/ReceiptFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

type CalculatorStep = "input" | "loading" | "result";

interface FormData {
  carPrice: number;
  downPayment: number;
  loanTerm: number;
  interestRate: number;
  fuelEfficiency: number;
  monthlyMileage: number;
  fuelPrice: number;
  insuranceMonthly: number;
}

interface CalculationResult {
  monthlyPayment: number;
  totalInterest: number;
  monthlyFuel: number;
  monthlyInsurance: number;
  monthlyTax: number;
  totalMonthly: number;
  yearlyTotal: number;
}

const Calculator = () => {
  const [step, setStep] = useState<CalculatorStep>("input");
  const [formData, setFormData] = useState<FormData>({
    carPrice: 35000000,
    downPayment: 10000000,
    loanTerm: 48,
    interestRate: 5.5,
    fuelEfficiency: 12,
    monthlyMileage: 1500,
    fuelPrice: 1650,
    insuranceMonthly: 85000,
  });
  const [result, setResult] = useState<CalculationResult | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  const handleInputChange = (field: keyof FormData, value: string) => {
    const numValue = parseFloat(value) || 0;
    setFormData((prev) => ({ ...prev, [field]: numValue }));
  };

  const calculateResult = useCallback(() => {
    const loanAmount = formData.carPrice - formData.downPayment;
    const monthlyRate = formData.interestRate / 100 / 12;
    const numPayments = formData.loanTerm;

    // 월 할부금 계산 (원리금균등상환)
    const monthlyPayment =
      (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
      (Math.pow(1 + monthlyRate, numPayments) - 1);

    const totalInterest = monthlyPayment * numPayments - loanAmount;

    // 월 유류비
    const monthlyFuel = (formData.monthlyMileage / formData.fuelEfficiency) * formData.fuelPrice;

    // 월 자동차세 (2000cc 기준 약 52만원/년)
    const monthlyTax = 520000 / 12;

    const totalMonthly = monthlyPayment + monthlyFuel + formData.insuranceMonthly + monthlyTax;

    setResult({
      monthlyPayment: Math.round(monthlyPayment),
      totalInterest: Math.round(totalInterest),
      monthlyFuel: Math.round(monthlyFuel),
      monthlyInsurance: formData.insuranceMonthly,
      monthlyTax: Math.round(monthlyTax),
      totalMonthly: Math.round(totalMonthly),
      yearlyTotal: Math.round(totalMonthly * 12),
    });
  }, [formData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep("loading");
  };

  const handleLoadingComplete = useCallback(() => {
    calculateResult();
    setStep("result");
  }, [calculateResult]);

  const handleSaveReceipt = async () => {
    if (!receiptRef.current) return;

    try {
      const canvas = await html2canvas(receiptRef.current, {
        backgroundColor: "#faf8f5",
        scale: 2,
      });
      
      const link = document.createElement("a");
      link.download = `DriveFlow_유지비_계산결과_${new Date().toISOString().slice(0, 10)}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      
      toast({
        title: "저장 완료",
        description: "영수증 이미지가 저장되었습니다.",
      });
    } catch (error) {
      toast({
        title: "저장 실패",
        description: "이미지 저장 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const handleReset = () => {
    setStep("input");
    setResult(null);
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString("ko-KR");
  };

  return (
    <div className="min-h-screen bg-receipt-bg">
      <Header />
      
      <main className="py-8 px-4">
        <div className="max-w-lg mx-auto">
          {step === "input" && (
            <div className="animate-fade-in">
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-foreground mb-2">
                  자동차 유지비 계산기
                </h1>
                <p className="text-muted-foreground">
                  내 차의 실제 월 유지비를 계산해보세요
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* 차량 정보 */}
                <div className="bg-card rounded-xl p-6 border border-border space-y-4">
                  <div className="flex items-center gap-2 text-foreground font-semibold mb-2">
                    <Car className="w-5 h-5 text-primary" />
                    차량 정보
                  </div>
                  
                  <div>
                    <Label htmlFor="carPrice">차량 가격 (원)</Label>
                    <Input
                      id="carPrice"
                      type="number"
                      value={formData.carPrice}
                      onChange={(e) => handleInputChange("carPrice", e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="downPayment">선수금 (원)</Label>
                    <Input
                      id="downPayment"
                      type="number"
                      value={formData.downPayment}
                      onChange={(e) => handleInputChange("downPayment", e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>

                {/* 할부 정보 */}
                <div className="bg-card rounded-xl p-6 border border-border space-y-4">
                  <div className="flex items-center gap-2 text-foreground font-semibold mb-2">
                    <Percent className="w-5 h-5 text-primary" />
                    할부 조건
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="loanTerm">할부 기간 (개월)</Label>
                      <Input
                        id="loanTerm"
                        type="number"
                        value={formData.loanTerm}
                        onChange={(e) => handleInputChange("loanTerm", e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="interestRate">할부 금리 (%)</Label>
                      <Input
                        id="interestRate"
                        type="number"
                        step="0.1"
                        value={formData.interestRate}
                        onChange={(e) => handleInputChange("interestRate", e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>

                {/* 연비 정보 */}
                <div className="bg-card rounded-xl p-6 border border-border space-y-4">
                  <div className="flex items-center gap-2 text-foreground font-semibold mb-2">
                    <Fuel className="w-5 h-5 text-primary" />
                    연비 정보
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="fuelEfficiency">연비 (km/L)</Label>
                      <Input
                        id="fuelEfficiency"
                        type="number"
                        step="0.1"
                        value={formData.fuelEfficiency}
                        onChange={(e) => handleInputChange("fuelEfficiency", e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="fuelPrice">유가 (원/L)</Label>
                      <Input
                        id="fuelPrice"
                        type="number"
                        value={formData.fuelPrice}
                        onChange={(e) => handleInputChange("fuelPrice", e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="monthlyMileage">월 주행거리 (km)</Label>
                    <Input
                      id="monthlyMileage"
                      type="number"
                      value={formData.monthlyMileage}
                      onChange={(e) => handleInputChange("monthlyMileage", e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>

                {/* 보험 정보 */}
                <div className="bg-card rounded-xl p-6 border border-border space-y-4">
                  <div className="flex items-center gap-2 text-foreground font-semibold mb-2">
                    <Shield className="w-5 h-5 text-primary" />
                    보험 정보
                  </div>
                  
                  <div>
                    <Label htmlFor="insuranceMonthly">월 보험료 (원)</Label>
                    <Input
                      id="insuranceMonthly"
                      type="number"
                      value={formData.insuranceMonthly}
                      onChange={(e) => handleInputChange("insuranceMonthly", e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full h-12 text-base">
                  계산하기
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </form>
            </div>
          )}

          {step === "loading" && (
            <LoadingScreen onComplete={handleLoadingComplete} />
          )}

          {step === "result" && result && (
            <div className="animate-fade-in">
              {/* Receipt */}
              <div ref={receiptRef} className="receipt-container rounded-lg p-6 pt-8 pb-8">
                <div className="text-center mb-6">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Car className="w-6 h-6" />
                    <h2 className="font-mono text-lg font-bold">DriveFlow</h2>
                  </div>
                  <p className="font-mono text-xs text-receipt-muted">자동차 유지비 계산서</p>
                  <p className="font-mono text-xs text-receipt-muted mt-1">
                    {new Date().toLocaleDateString("ko-KR", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>

                <hr className="receipt-divider" />

                {/* 차량 정보 요약 */}
                <div className="font-mono text-sm space-y-1 mb-4">
                  <div className="flex justify-between">
                    <span className="text-receipt-muted">차량가격</span>
                    <span>{formatNumber(formData.carPrice)}원</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-receipt-muted">할부원금</span>
                    <span>{formatNumber(formData.carPrice - formData.downPayment)}원</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-receipt-muted">할부기간</span>
                    <span>{formData.loanTerm}개월</span>
                  </div>
                </div>

                <hr className="receipt-divider" />

                {/* 월별 비용 상세 */}
                <div className="font-mono text-sm space-y-2 my-4">
                  <p className="font-bold mb-3">[ 월 유지비 상세 ]</p>
                  
                  <div className="flex justify-between">
                    <span>할부금</span>
                    <span>{formatNumber(result.monthlyPayment)}원</span>
                  </div>
                  <div className="flex justify-between">
                    <span>유류비</span>
                    <span>{formatNumber(result.monthlyFuel)}원</span>
                  </div>
                  <div className="flex justify-between">
                    <span>보험료</span>
                    <span>{formatNumber(result.monthlyInsurance)}원</span>
                  </div>
                  <div className="flex justify-between">
                    <span>자동차세</span>
                    <span>{formatNumber(result.monthlyTax)}원</span>
                  </div>
                </div>

                <hr className="receipt-double-divider" />

                {/* 합계 */}
                <div className="font-mono space-y-2 my-4">
                  <div className="flex justify-between text-lg font-bold">
                    <span>월 총 유지비</span>
                    <span className="text-primary">{formatNumber(result.totalMonthly)}원</span>
                  </div>
                  <div className="flex justify-between text-sm text-receipt-muted">
                    <span>연간 유지비</span>
                    <span>{formatNumber(result.yearlyTotal)}원</span>
                  </div>
                </div>

                <hr className="receipt-divider" />

                {/* 추가 정보 */}
                <div className="font-mono text-xs text-receipt-muted space-y-1 mt-4">
                  <div className="flex justify-between">
                    <span>총 할부 이자</span>
                    <span>{formatNumber(result.totalInterest)}원</span>
                  </div>
                  <div className="flex justify-between">
                    <span>월 주행거리</span>
                    <span>{formatNumber(formData.monthlyMileage)}km</span>
                  </div>
                </div>

                {/* Watermark Footer */}
                <ReceiptFooter />
              </div>

              {/* Actions */}
              <div className="mt-6 space-y-3">
                <Button
                  onClick={handleSaveReceipt}
                  className="w-full h-12"
                  variant="default"
                >
                  <Download className="w-5 h-5 mr-2" />
                  영수증 이미지로 저장
                </Button>
                
                <Button
                  onClick={handleReset}
                  className="w-full h-12"
                  variant="outline"
                >
                  다시 계산하기
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Calculator;
