import { useState, useRef, useCallback } from "react";
import html2canvas from "html2canvas";
import { Download, Car, Fuel, Shield, Percent, ArrowRight, Sparkles, Zap, TrendingUp } from "lucide-react";
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
  const [activeSection, setActiveSection] = useState<number>(0);
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
    setActiveSection(0);
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString("ko-KR");
  };

  const sections = [
    { icon: Car, title: "차량 정보", color: "from-blue-500 to-cyan-500" },
    { icon: Percent, title: "할부 조건", color: "from-violet-500 to-purple-500" },
    { icon: Fuel, title: "연비 정보", color: "from-amber-500 to-orange-500" },
    { icon: Shield, title: "보험 정보", color: "from-emerald-500 to-teal-500" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-violet-50/20">
      <Header />
      
      <main className="py-8 px-4">
        <div className="max-w-lg mx-auto">
          {step === "input" && (
            <div className="space-y-8">
              {/* Hero Section */}
              <div className="text-center relative">
                {/* Floating Elements */}
                <div className="absolute -top-4 left-1/4 w-16 h-16 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full blur-xl animate-pulse" />
                <div className="absolute top-8 right-1/4 w-12 h-12 bg-gradient-to-br from-violet-500/20 to-violet-500/5 rounded-full blur-xl animate-pulse" style={{ animationDelay: "1s" }} />
                
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary/10 to-violet-500/10 rounded-full text-sm font-medium text-primary mb-4 animate-fade-in">
                  <Sparkles className="w-4 h-4" />
                  스마트 계산기
                </div>
                
                <h1 className="text-3xl font-bold text-foreground mb-3 animate-fade-in" style={{ animationDelay: "0.1s" }}>
                  자동차 유지비
                  <span className="block bg-gradient-to-r from-primary via-violet-500 to-primary bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
                    계산기
                  </span>
                </h1>
                <p className="text-muted-foreground animate-fade-in" style={{ animationDelay: "0.2s" }}>
                  내 차의 실제 월 유지비를 정확하게 분석해드려요
                </p>
              </div>

              {/* Progress Indicator */}
              <div className="flex items-center justify-center gap-2 px-4">
                {sections.map((section, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveSection(index)}
                    className={`group flex items-center gap-2 px-3 py-2 rounded-full transition-all duration-300 ${
                      activeSection === index 
                        ? "bg-gradient-to-r " + section.color + " text-white shadow-lg scale-105" 
                        : "bg-white/60 text-muted-foreground hover:bg-white hover:shadow-md"
                    }`}
                  >
                    <section.icon className="w-4 h-4" />
                    <span className={`text-xs font-medium hidden sm:inline transition-all ${activeSection === index ? "max-w-20" : "max-w-0 overflow-hidden sm:max-w-20"}`}>
                      {section.title}
                    </span>
                  </button>
                ))}
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* 차량 정보 */}
                <div 
                  className={`transform transition-all duration-500 ${activeSection === 0 ? "scale-100 opacity-100" : "scale-95 opacity-50 pointer-events-none h-0 overflow-hidden"}`}
                >
                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/50 shadow-xl shadow-blue-500/5 space-y-5 hover:shadow-2xl hover:shadow-blue-500/10 transition-shadow duration-500">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg">
                        <Car className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">차량 정보</h3>
                        <p className="text-xs text-muted-foreground">구매 예정 차량의 가격을 입력하세요</p>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="group">
                        <Label htmlFor="carPrice" className="text-sm font-medium">차량 가격</Label>
                        <div className="relative mt-1.5">
                          <Input
                            id="carPrice"
                            type="number"
                            value={formData.carPrice}
                            onChange={(e) => handleInputChange("carPrice", e.target.value)}
                            className="h-12 pr-10 text-lg font-medium border-2 border-transparent focus:border-blue-500/50 transition-colors bg-slate-50/50"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">원</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1.5">{formatNumber(formData.carPrice)}원</p>
                      </div>
                      
                      <div className="group">
                        <Label htmlFor="downPayment" className="text-sm font-medium">선수금 (계약금)</Label>
                        <div className="relative mt-1.5">
                          <Input
                            id="downPayment"
                            type="number"
                            value={formData.downPayment}
                            onChange={(e) => handleInputChange("downPayment", e.target.value)}
                            className="h-12 pr-10 text-lg font-medium border-2 border-transparent focus:border-blue-500/50 transition-colors bg-slate-50/50"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">원</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1.5">{formatNumber(formData.downPayment)}원</p>
                      </div>
                    </div>
                    
                    <Button 
                      type="button" 
                      onClick={() => setActiveSection(1)}
                      className="w-full h-11 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 shadow-lg shadow-blue-500/25"
                    >
                      다음 단계
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>

                {/* 할부 정보 */}
                <div 
                  className={`transform transition-all duration-500 ${activeSection === 1 ? "scale-100 opacity-100" : "scale-95 opacity-50 pointer-events-none h-0 overflow-hidden"}`}
                >
                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/50 shadow-xl shadow-violet-500/5 space-y-5 hover:shadow-2xl hover:shadow-violet-500/10 transition-shadow duration-500">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center shadow-lg">
                        <Percent className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">할부 조건</h3>
                        <p className="text-xs text-muted-foreground">할부 기간과 금리를 설정하세요</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="loanTerm" className="text-sm font-medium">할부 기간</Label>
                        <div className="relative mt-1.5">
                          <Input
                            id="loanTerm"
                            type="number"
                            value={formData.loanTerm}
                            onChange={(e) => handleInputChange("loanTerm", e.target.value)}
                            className="h-12 pr-12 text-lg font-medium border-2 border-transparent focus:border-violet-500/50 transition-colors bg-slate-50/50"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">개월</span>
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="interestRate" className="text-sm font-medium">할부 금리</Label>
                        <div className="relative mt-1.5">
                          <Input
                            id="interestRate"
                            type="number"
                            step="0.1"
                            value={formData.interestRate}
                            onChange={(e) => handleInputChange("interestRate", e.target.value)}
                            className="h-12 pr-8 text-lg font-medium border-2 border-transparent focus:border-violet-500/50 transition-colors bg-slate-50/50"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={() => setActiveSection(0)}
                        className="flex-1 h-11"
                      >
                        이전
                      </Button>
                      <Button 
                        type="button" 
                        onClick={() => setActiveSection(2)}
                        className="flex-1 h-11 bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 shadow-lg shadow-violet-500/25"
                      >
                        다음 단계
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* 연비 정보 */}
                <div 
                  className={`transform transition-all duration-500 ${activeSection === 2 ? "scale-100 opacity-100" : "scale-95 opacity-50 pointer-events-none h-0 overflow-hidden"}`}
                >
                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/50 shadow-xl shadow-amber-500/5 space-y-5 hover:shadow-2xl hover:shadow-amber-500/10 transition-shadow duration-500">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg">
                        <Fuel className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">연비 정보</h3>
                        <p className="text-xs text-muted-foreground">연비와 주행 정보를 입력하세요</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="fuelEfficiency" className="text-sm font-medium">연비</Label>
                        <div className="relative mt-1.5">
                          <Input
                            id="fuelEfficiency"
                            type="number"
                            step="0.1"
                            value={formData.fuelEfficiency}
                            onChange={(e) => handleInputChange("fuelEfficiency", e.target.value)}
                            className="h-12 pr-14 text-lg font-medium border-2 border-transparent focus:border-amber-500/50 transition-colors bg-slate-50/50"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">km/L</span>
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="fuelPrice" className="text-sm font-medium">유가</Label>
                        <div className="relative mt-1.5">
                          <Input
                            id="fuelPrice"
                            type="number"
                            value={formData.fuelPrice}
                            onChange={(e) => handleInputChange("fuelPrice", e.target.value)}
                            className="h-12 pr-12 text-lg font-medium border-2 border-transparent focus:border-amber-500/50 transition-colors bg-slate-50/50"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">원/L</span>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="monthlyMileage" className="text-sm font-medium">월 주행거리</Label>
                      <div className="relative mt-1.5">
                        <Input
                          id="monthlyMileage"
                          type="number"
                          value={formData.monthlyMileage}
                          onChange={(e) => handleInputChange("monthlyMileage", e.target.value)}
                          className="h-12 pr-10 text-lg font-medium border-2 border-transparent focus:border-amber-500/50 transition-colors bg-slate-50/50"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">km</span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={() => setActiveSection(1)}
                        className="flex-1 h-11"
                      >
                        이전
                      </Button>
                      <Button 
                        type="button" 
                        onClick={() => setActiveSection(3)}
                        className="flex-1 h-11 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-lg shadow-amber-500/25"
                      >
                        다음 단계
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* 보험 정보 */}
                <div 
                  className={`transform transition-all duration-500 ${activeSection === 3 ? "scale-100 opacity-100" : "scale-95 opacity-50 pointer-events-none h-0 overflow-hidden"}`}
                >
                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/50 shadow-xl shadow-emerald-500/5 space-y-5 hover:shadow-2xl hover:shadow-emerald-500/10 transition-shadow duration-500">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg">
                        <Shield className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">보험 정보</h3>
                        <p className="text-xs text-muted-foreground">월 보험료를 입력하세요</p>
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="insuranceMonthly" className="text-sm font-medium">월 보험료</Label>
                      <div className="relative mt-1.5">
                        <Input
                          id="insuranceMonthly"
                          type="number"
                          value={formData.insuranceMonthly}
                          onChange={(e) => handleInputChange("insuranceMonthly", e.target.value)}
                          className="h-12 pr-10 text-lg font-medium border-2 border-transparent focus:border-emerald-500/50 transition-colors bg-slate-50/50"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">원</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1.5">{formatNumber(formData.insuranceMonthly)}원/월</p>
                    </div>

                    {/* Summary Card */}
                    <div className="p-4 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200/50">
                      <div className="flex items-center gap-2 mb-3">
                        <Zap className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium">입력 요약</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">차량가격</span>
                          <span className="font-medium">{formatNumber(formData.carPrice)}원</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">할부원금</span>
                          <span className="font-medium">{formatNumber(formData.carPrice - formData.downPayment)}원</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">할부기간</span>
                          <span className="font-medium">{formData.loanTerm}개월</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">연비</span>
                          <span className="font-medium">{formData.fuelEfficiency}km/L</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={() => setActiveSection(2)}
                        className="flex-1 h-11"
                      >
                        이전
                      </Button>
                      <Button 
                        type="submit" 
                        className="flex-1 h-12 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-lg shadow-emerald-500/25 text-base font-semibold"
                      >
                        <TrendingUp className="w-5 h-5 mr-2" />
                        계산하기
                      </Button>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          )}

          {step === "loading" && (
            <LoadingScreen onComplete={handleLoadingComplete} />
          )}

          {step === "result" && result && (
            <div className="space-y-6">
              {/* Result Hero */}
              <div className="text-center animate-fade-in">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-full text-sm font-medium text-emerald-600 mb-4">
                  <Sparkles className="w-4 h-4" />
                  분석 완료
                </div>
                <h2 className="text-2xl font-bold text-foreground">
                  월 유지비 분석 결과
                </h2>
              </div>

              {/* Receipt */}
              <div 
                ref={receiptRef} 
                className="receipt-container rounded-2xl p-6 pt-8 pb-8 shadow-2xl animate-fade-in"
                style={{ animationDelay: "0.2s" }}
              >
                <div className="text-center mb-6">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center">
                      <Car className="w-5 h-5 text-white" />
                    </div>
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
                <div className="font-mono text-sm space-y-3 my-4">
                  <p className="font-bold mb-3">[ 월 유지비 상세 ]</p>
                  
                  <div className="flex justify-between items-center group">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      <span>할부금</span>
                    </div>
                    <span className="font-medium">{formatNumber(result.monthlyPayment)}원</span>
                  </div>
                  <div className="flex justify-between items-center group">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      <span>유류비</span>
                    </div>
                    <span className="font-medium">{formatNumber(result.monthlyFuel)}원</span>
                  </div>
                  <div className="flex justify-between items-center group">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span>보험료</span>
                    </div>
                    <span className="font-medium">{formatNumber(result.monthlyInsurance)}원</span>
                  </div>
                  <div className="flex justify-between items-center group">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-violet-500" />
                      <span>자동차세</span>
                    </div>
                    <span className="font-medium">{formatNumber(result.monthlyTax)}원</span>
                  </div>
                </div>

                <hr className="receipt-double-divider" />

                {/* 합계 */}
                <div className="font-mono space-y-3 my-4">
                  <div className="flex justify-between text-xl font-bold">
                    <span>월 총 유지비</span>
                    <span className="bg-gradient-to-r from-primary to-violet-500 bg-clip-text text-transparent">{formatNumber(result.totalMonthly)}원</span>
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
              <div className="space-y-3 animate-fade-in" style={{ animationDelay: "0.4s" }}>
                <Button
                  onClick={handleSaveReceipt}
                  className="w-full h-12 bg-gradient-to-r from-primary to-violet-500 hover:from-primary/90 hover:to-violet-500/90 shadow-lg shadow-primary/25"
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
