import { useState, useRef, useCallback, useMemo } from "react";
import html2canvas from "html2canvas";
import { Download, Car, Fuel, Shield, Percent, ArrowRight, Sparkles, Zap, TrendingUp, ChevronDown, BarChart3, X, Plus, Check } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import Header from "@/components/Header";
import LoadingScreen from "@/components/LoadingScreen";
import ReceiptFooter from "@/components/ReceiptFooter";
import JsonLd from "@/components/JsonLd";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { useSEO, generateSoftwareApplicationSchema, generateBreadcrumbSchema } from "@/hooks/useSEO";

type CalculatorStep = "input" | "loading" | "result";
type CalculatorMode = "single" | "compare";

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

interface CarPreset {
  name: string;
  emoji: string;
  description: string;
  carPrice: number;
  fuelEfficiency: number;
  insuranceMonthly: number;
  monthlyTax: number;
}

interface CompareResult {
  preset: CarPreset;
  result: CalculationResult;
}

const carPresets: CarPreset[] = [
  {
    name: "경차",
    emoji: "🚗",
    description: "모닝, 스파크 등",
    carPrice: 15000000,
    fuelEfficiency: 15,
    insuranceMonthly: 45000,
    monthlyTax: 7500,
  },
  {
    name: "소형차",
    emoji: "🚙",
    description: "아반떼, K3 등",
    carPrice: 25000000,
    fuelEfficiency: 13,
    insuranceMonthly: 65000,
    monthlyTax: 25000,
  },
  {
    name: "중형차",
    emoji: "🚘",
    description: "소나타, K5 등",
    carPrice: 35000000,
    fuelEfficiency: 11,
    insuranceMonthly: 85000,
    monthlyTax: 43000,
  },
  {
    name: "대형차",
    emoji: "🏎️",
    description: "그랜저, K8 등",
    carPrice: 50000000,
    fuelEfficiency: 9,
    insuranceMonthly: 110000,
    monthlyTax: 65000,
  },
  {
    name: "SUV",
    emoji: "🚐",
    description: "투싼, 스포티지 등",
    carPrice: 40000000,
    fuelEfficiency: 10,
    insuranceMonthly: 95000,
    monthlyTax: 52000,
  },
  {
    name: "전기차",
    emoji: "⚡",
    description: "아이오닉, EV6 등",
    carPrice: 55000000,
    fuelEfficiency: 6,
    insuranceMonthly: 75000,
    monthlyTax: 13000,
  },
];

const CHART_COLORS = ["#3B82F6", "#F59E0B", "#10B981", "#8B5CF6", "#EC4899", "#06B6D4"];
const COMPARE_COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#8B5CF6"];

const Calculator = () => {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://catein.kr';
  
  // Apply SEO meta tags
  useSEO({
    title: '자동차 유지비 계산기 - 할부금, 보험료, 유류비 계산 | 카테인',
    description: '자동차 할부금, 유류비, 보험료, 자동차세를 한 번에 계산하세요. 차종별 비교 분석으로 현명한 구매 결정을 도와드립니다.',
    canonicalUrl: `${baseUrl}/calculator`,
    ogType: 'website',
  });

  // Generate structured data
  const structuredData = useMemo(() => [
    generateSoftwareApplicationSchema(
      '자동차 유지비 계산기',
      '자동차 할부금, 유류비, 보험료, 자동차세를 계산하고 차종별 비용을 비교 분석하는 무료 온라인 도구입니다.',
      `${baseUrl}/calculator`
    ),
    generateBreadcrumbSchema([
      { name: '홈', url: baseUrl },
      { name: '유지비 계산기', url: `${baseUrl}/calculator` },
    ]),
  ], [baseUrl]);

  const [step, setStep] = useState<CalculatorStep>("input");
  const [mode, setMode] = useState<CalculatorMode>("single");
  const [activeSection, setActiveSection] = useState<number>(0);
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  const [comparePresets, setComparePresets] = useState<number[]>([]);
  const [showPresets, setShowPresets] = useState(true);
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
  const [compareResults, setCompareResults] = useState<CompareResult[]>([]);
  const receiptRef = useRef<HTMLDivElement>(null);

  const handlePresetSelect = (index: number) => {
    if (mode === "compare") {
      if (comparePresets.includes(index)) {
        setComparePresets(comparePresets.filter(i => i !== index));
      } else if (comparePresets.length < 4) {
        setComparePresets([...comparePresets, index]);
      }
    } else {
      const preset = carPresets[index];
      setSelectedPreset(index);
      setFormData((prev) => ({
        ...prev,
        carPrice: preset.carPrice,
        downPayment: Math.round(preset.carPrice * 0.3),
        fuelEfficiency: preset.fuelEfficiency,
        insuranceMonthly: preset.insuranceMonthly,
      }));
      setShowPresets(false);
      setActiveSection(0);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    const numValue = parseFloat(value) || 0;
    setFormData((prev) => ({ ...prev, [field]: numValue }));
  };

  const calculateForPreset = useCallback((preset: CarPreset): CalculationResult => {
    const carPrice = preset.carPrice;
    const downPayment = Math.round(carPrice * 0.3);
    const loanAmount = carPrice - downPayment;
    const monthlyRate = formData.interestRate / 100 / 12;
    const numPayments = formData.loanTerm;

    const monthlyPayment =
      (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
      (Math.pow(1 + monthlyRate, numPayments) - 1);

    const totalInterest = monthlyPayment * numPayments - loanAmount;
    const monthlyFuel = (formData.monthlyMileage / preset.fuelEfficiency) * formData.fuelPrice;
    const monthlyTax = preset.monthlyTax;
    const totalMonthly = monthlyPayment + monthlyFuel + preset.insuranceMonthly + monthlyTax;

    return {
      monthlyPayment: Math.round(monthlyPayment),
      totalInterest: Math.round(totalInterest),
      monthlyFuel: Math.round(monthlyFuel),
      monthlyInsurance: preset.insuranceMonthly,
      monthlyTax: Math.round(monthlyTax),
      totalMonthly: Math.round(totalMonthly),
      yearlyTotal: Math.round(totalMonthly * 12),
    };
  }, [formData]);

  const calculateResult = useCallback(() => {
    if (mode === "compare") {
      const results = comparePresets.map(index => ({
        preset: carPresets[index],
        result: calculateForPreset(carPresets[index]),
      }));
      setCompareResults(results);
    } else {
      const loanAmount = formData.carPrice - formData.downPayment;
      const monthlyRate = formData.interestRate / 100 / 12;
      const numPayments = formData.loanTerm;

      const monthlyPayment =
        (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
        (Math.pow(1 + monthlyRate, numPayments) - 1);

      const totalInterest = monthlyPayment * numPayments - loanAmount;
      const monthlyFuel = (formData.monthlyMileage / formData.fuelEfficiency) * formData.fuelPrice;
      const monthlyTax = selectedPreset !== null ? carPresets[selectedPreset].monthlyTax : 520000 / 12;
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
    }
  }, [formData, selectedPreset, mode, comparePresets, calculateForPreset]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep("loading");
  };

  const handleCompareSubmit = () => {
    if (comparePresets.length < 2) {
      toast({
        title: "차종을 선택해주세요",
        description: "비교하려면 최소 2개 이상의 차종을 선택해야 합니다.",
        variant: "destructive",
      });
      return;
    }
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
      link.download = `DriveFlow_유지비_${mode === "compare" ? "비교" : "계산"}결과_${new Date().toISOString().slice(0, 10)}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      
      toast({
        title: "저장 완료",
        description: "이미지가 저장되었습니다.",
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
    setCompareResults([]);
    setActiveSection(0);
    setShowPresets(true);
    setSelectedPreset(null);
    setComparePresets([]);
  };

  const handleModeChange = (newMode: CalculatorMode) => {
    setMode(newMode);
    setSelectedPreset(null);
    setComparePresets([]);
    setShowPresets(true);
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

  const chartData = result ? [
    { name: "할부금", value: result.monthlyPayment, color: CHART_COLORS[0] },
    { name: "유류비", value: result.monthlyFuel, color: CHART_COLORS[1] },
    { name: "보험료", value: result.monthlyInsurance, color: CHART_COLORS[2] },
    { name: "자동차세", value: result.monthlyTax, color: CHART_COLORS[3] },
  ] : [];

  const compareChartData = compareResults.map((item, index) => ({
    name: item.preset.name,
    emoji: item.preset.emoji,
    할부금: item.result.monthlyPayment,
    유류비: item.result.monthlyFuel,
    보험료: item.result.monthlyInsurance,
    자동차세: item.result.monthlyTax,
    총비용: item.result.totalMonthly,
    color: COMPARE_COLORS[index],
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-violet-50/20">
      {/* Structured Data for SEO */}
      <JsonLd data={structuredData} />
      
      <Header />
      
      <main className="py-8 px-4">
        <div className="max-w-2xl mx-auto">
          {step === "input" && (
            <div className="space-y-8">
              {/* Hero Section */}
              <div className="text-center relative">
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

              {/* Mode Selector */}
              <div className="flex justify-center gap-2 animate-fade-in" style={{ animationDelay: "0.3s" }}>
                <button
                  onClick={() => handleModeChange("single")}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-medium transition-all duration-300 ${
                    mode === "single"
                      ? "bg-gradient-to-r from-primary to-violet-500 text-white shadow-lg shadow-primary/25"
                      : "bg-white/80 text-muted-foreground hover:bg-white hover:shadow-md"
                  }`}
                >
                  <Car className="w-4 h-4" />
                  단일 계산
                </button>
                <button
                  onClick={() => handleModeChange("compare")}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-medium transition-all duration-300 ${
                    mode === "compare"
                      ? "bg-gradient-to-r from-primary to-violet-500 text-white shadow-lg shadow-primary/25"
                      : "bg-white/80 text-muted-foreground hover:bg-white hover:shadow-md"
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                  차종 비교
                </button>
              </div>

              {/* Compare Mode */}
              {mode === "compare" && (
                <div className="space-y-6 animate-fade-in">
                  <div className="text-center">
                    <h2 className="text-lg font-semibold text-foreground mb-1">비교할 차종을 선택하세요</h2>
                    <p className="text-sm text-muted-foreground">최대 4개까지 선택 가능합니다 ({comparePresets.length}/4)</p>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {carPresets.map((preset, index) => {
                      const isSelected = comparePresets.includes(index);
                      const isDisabled = !isSelected && comparePresets.length >= 4;
                      return (
                        <button
                          key={index}
                          onClick={() => !isDisabled && handlePresetSelect(index)}
                          disabled={isDisabled}
                          className={`group relative p-4 rounded-2xl border-2 transition-all duration-300 text-left overflow-hidden ${
                            isSelected
                              ? "bg-gradient-to-br from-primary/10 to-violet-500/10 border-primary shadow-lg scale-105"
                              : isDisabled
                              ? "bg-slate-50 border-slate-200 opacity-50 cursor-not-allowed"
                              : "bg-white/80 backdrop-blur-sm border-white/50 shadow-lg hover:shadow-xl hover:scale-105"
                          }`}
                        >
                          {isSelected && (
                            <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                              <Check className="w-4 h-4 text-white" />
                            </div>
                          )}
                          <div className="relative">
                            <span className="text-3xl mb-2 block">{preset.emoji}</span>
                            <h3 className="font-semibold text-foreground">{preset.name}</h3>
                            <p className="text-xs text-muted-foreground">{preset.description}</p>
                            <p className="text-xs font-medium text-primary mt-1">
                              ~{formatNumber(preset.carPrice / 10000)}만원
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Selected Presets */}
                  {comparePresets.length > 0 && (
                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-white/50 shadow-lg">
                      <div className="flex items-center gap-2 mb-3">
                        <BarChart3 className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium">선택된 차종</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {comparePresets.map((index) => (
                          <div
                            key={index}
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-primary/10 to-violet-500/10 rounded-full"
                          >
                            <span>{carPresets[index].emoji}</span>
                            <span className="text-sm font-medium">{carPresets[index].name}</span>
                            <button
                              onClick={() => setComparePresets(comparePresets.filter(i => i !== index))}
                              className="w-4 h-4 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Compare Settings */}
                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/50 shadow-xl space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center shadow-lg">
                        <Zap className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">공통 조건 설정</h3>
                        <p className="text-xs text-muted-foreground">모든 차종에 동일하게 적용됩니다</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="compareLoanTerm" className="text-sm font-medium">할부 기간</Label>
                        <div className="relative mt-1.5">
                          <Input
                            id="compareLoanTerm"
                            type="number"
                            value={formData.loanTerm}
                            onChange={(e) => handleInputChange("loanTerm", e.target.value)}
                            className="h-11 pr-12 font-medium border-2 border-transparent focus:border-primary/50 transition-colors bg-slate-50/50"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">개월</span>
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="compareInterestRate" className="text-sm font-medium">할부 금리</Label>
                        <div className="relative mt-1.5">
                          <Input
                            id="compareInterestRate"
                            type="number"
                            step="0.1"
                            value={formData.interestRate}
                            onChange={(e) => handleInputChange("interestRate", e.target.value)}
                            className="h-11 pr-8 font-medium border-2 border-transparent focus:border-primary/50 transition-colors bg-slate-50/50"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="compareMonthlyMileage" className="text-sm font-medium">월 주행거리</Label>
                        <div className="relative mt-1.5">
                          <Input
                            id="compareMonthlyMileage"
                            type="number"
                            value={formData.monthlyMileage}
                            onChange={(e) => handleInputChange("monthlyMileage", e.target.value)}
                            className="h-11 pr-10 font-medium border-2 border-transparent focus:border-primary/50 transition-colors bg-slate-50/50"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">km</span>
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="compareFuelPrice" className="text-sm font-medium">유가</Label>
                        <div className="relative mt-1.5">
                          <Input
                            id="compareFuelPrice"
                            type="number"
                            value={formData.fuelPrice}
                            onChange={(e) => handleInputChange("fuelPrice", e.target.value)}
                            className="h-11 pr-12 font-medium border-2 border-transparent focus:border-primary/50 transition-colors bg-slate-50/50"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">원/L</span>
                        </div>
                      </div>
                    </div>

                    <Button 
                      onClick={handleCompareSubmit}
                      disabled={comparePresets.length < 2}
                      className="w-full h-12 bg-gradient-to-r from-primary to-violet-500 hover:from-primary/90 hover:to-violet-500/90 shadow-lg shadow-primary/25 text-base font-semibold disabled:opacity-50"
                    >
                      <BarChart3 className="w-5 h-5 mr-2" />
                      {comparePresets.length < 2 ? `${2 - comparePresets.length}개 더 선택하세요` : "비교 분석하기"}
                    </Button>
                  </div>
                </div>
              )}

              {/* Single Mode - Car Type Presets */}
              {mode === "single" && showPresets && (
                <div className="space-y-4 animate-fade-in">
                  <div className="text-center">
                    <h2 className="text-lg font-semibold text-foreground mb-1">차종을 선택하세요</h2>
                    <p className="text-sm text-muted-foreground">선택하면 평균값이 자동으로 입력됩니다</p>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {carPresets.map((preset, index) => (
                      <button
                        key={index}
                        onClick={() => handlePresetSelect(index)}
                        className="group relative p-4 bg-white/80 backdrop-blur-sm rounded-2xl border border-white/50 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 text-left overflow-hidden"
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-violet-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="relative">
                          <span className="text-3xl mb-2 block">{preset.emoji}</span>
                          <h3 className="font-semibold text-foreground">{preset.name}</h3>
                          <p className="text-xs text-muted-foreground">{preset.description}</p>
                          <p className="text-xs font-medium text-primary mt-1">
                            ~{formatNumber(preset.carPrice / 10000)}만원
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                  
                  <button
                    onClick={() => setShowPresets(false)}
                    className="w-full py-3 text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1"
                  >
                    직접 입력하기
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Single Mode Form Section */}
              {mode === "single" && !showPresets && (
                <div className="max-w-lg mx-auto">
                  {/* Selected Preset Badge */}
                  {selectedPreset !== null && (
                    <div className="flex items-center justify-center gap-2 animate-fade-in mb-6">
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full border border-white/50 shadow-md">
                        <span className="text-xl">{carPresets[selectedPreset].emoji}</span>
                        <span className="font-medium text-foreground">{carPresets[selectedPreset].name}</span>
                        <button
                          onClick={() => setShowPresets(true)}
                          className="text-xs text-primary hover:underline ml-1"
                        >
                          변경
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Progress Indicator */}
                  <div className="flex items-center justify-center gap-2 px-4 mb-6">
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
                        
                        {/* Car Illustration */}
                        <div className="relative h-24 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl flex items-center justify-center overflow-hidden">
                          <div className="absolute inset-0 opacity-20">
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-blue-500 rounded-full blur-3xl" />
                          </div>
                          <span className="text-6xl animate-bounce" style={{ animationDuration: "2s" }}>
                            {selectedPreset !== null ? carPresets[selectedPreset].emoji : "🚗"}
                          </span>
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

                        {/* Loan Illustration */}
                        <div className="relative h-20 bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl flex items-center justify-center overflow-hidden">
                          <div className="flex items-center gap-4">
                            <span className="text-4xl">💳</span>
                            <div className="flex items-center gap-1">
                              {[...Array(3)].map((_, i) => (
                                <div
                                  key={i}
                                  className="w-8 h-1 bg-violet-500 rounded-full animate-pulse"
                                  style={{ animationDelay: `${i * 0.2}s` }}
                                />
                              ))}
                            </div>
                            <span className="text-4xl">🏦</span>
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

                        {/* Fuel Illustration */}
                        <div className="relative h-20 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl flex items-center justify-center overflow-hidden">
                          <div className="flex items-center gap-3">
                            <span className="text-4xl">⛽</span>
                            <div className="w-24 h-3 bg-amber-100 rounded-full overflow-hidden">
                              <div className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full animate-pulse" style={{ width: "75%" }} />
                            </div>
                            <span className="text-4xl">🛣️</span>
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

                        {/* Insurance Illustration */}
                        <div className="relative h-20 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl flex items-center justify-center overflow-hidden">
                          <div className="relative">
                            <span className="text-5xl">🛡️</span>
                            <span className="absolute -top-1 -right-2 text-2xl animate-bounce" style={{ animationDuration: "1.5s" }}>✨</span>
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
            </div>
          )}

          {step === "loading" && (
            <LoadingScreen onComplete={handleLoadingComplete} />
          )}

          {step === "result" && mode === "compare" && compareResults.length > 0 && (
            <div className="space-y-6">
              {/* Result Hero */}
              <div className="text-center animate-fade-in">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-full text-sm font-medium text-emerald-600 mb-4">
                  <BarChart3 className="w-4 h-4" />
                  비교 분석 완료
                </div>
                <h2 className="text-2xl font-bold text-foreground">
                  차종별 유지비 비교
                </h2>
                <p className="text-muted-foreground mt-1">
                  {compareResults.map(r => r.preset.emoji).join(" vs ")}
                </p>
              </div>

              {/* Compare Chart */}
              <div 
                ref={receiptRef}
                className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/50 shadow-xl animate-fade-in"
                style={{ animationDelay: "0.1s" }}
              >
                <h3 className="font-semibold text-foreground mb-6 text-center">월 유지비 비교</h3>
                
                {/* Bar Chart */}
                <div className="h-64 mb-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={compareChartData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                      <XAxis type="number" tickFormatter={(value) => `${Math.round(value / 10000)}만`} />
                      <YAxis 
                        type="category" 
                        dataKey="name" 
                        width={60}
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip
                        formatter={(value: number, name: string) => [`${formatNumber(value)}원`, name]}
                        contentStyle={{
                          backgroundColor: "rgba(255, 255, 255, 0.95)",
                          borderRadius: "12px",
                          border: "none",
                          boxShadow: "0 10px 40px rgba(0,0,0,0.1)",
                        }}
                      />
                      <Bar dataKey="할부금" stackId="a" fill="#3B82F6" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="유류비" stackId="a" fill="#F59E0B" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="보험료" stackId="a" fill="#10B981" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="자동차세" stackId="a" fill="#8B5CF6" radius={[4, 4, 4, 4]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Legend */}
                <div className="flex flex-wrap justify-center gap-4 mb-6">
                  {[
                    { name: "할부금", color: "#3B82F6" },
                    { name: "유류비", color: "#F59E0B" },
                    { name: "보험료", color: "#10B981" },
                    { name: "자동차세", color: "#8B5CF6" },
                  ].map((item) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-sm text-muted-foreground">{item.name}</span>
                    </div>
                  ))}
                </div>

                {/* Comparison Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {compareResults.map((item, index) => {
                    const isLowest = item.result.totalMonthly === Math.min(...compareResults.map(r => r.result.totalMonthly));
                    return (
                      <div
                        key={index}
                        className={`relative p-4 rounded-xl border-2 transition-all ${
                          isLowest
                            ? "bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-500"
                            : "bg-slate-50 border-slate-200"
                        }`}
                      >
                        {isLowest && (
                          <div className="absolute -top-3 left-4 px-3 py-1 bg-emerald-500 text-white text-xs font-medium rounded-full">
                            최저 유지비 👑
                          </div>
                        )}
                        <div className="flex items-center gap-3 mb-4 mt-1">
                          <span className="text-3xl">{item.preset.emoji}</span>
                          <div>
                            <h4 className="font-semibold text-foreground">{item.preset.name}</h4>
                            <p className="text-xs text-muted-foreground">{item.preset.description}</p>
                          </div>
                        </div>

                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">차량가격</span>
                            <span className="font-medium">{formatNumber(item.preset.carPrice)}원</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">할부금</span>
                            <span className="font-medium">{formatNumber(item.result.monthlyPayment)}원</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">유류비</span>
                            <span className="font-medium">{formatNumber(item.result.monthlyFuel)}원</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">보험료</span>
                            <span className="font-medium">{formatNumber(item.result.monthlyInsurance)}원</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">자동차세</span>
                            <span className="font-medium">{formatNumber(item.result.monthlyTax)}원</span>
                          </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-slate-200">
                          <div className="flex justify-between items-center">
                            <span className="font-semibold text-foreground">월 총 유지비</span>
                            <span className={`text-xl font-bold ${isLowest ? "text-emerald-600" : "text-foreground"}`}>
                              {formatNumber(item.result.totalMonthly)}원
                            </span>
                          </div>
                          <div className="flex justify-between text-xs text-muted-foreground mt-1">
                            <span>연간 유지비</span>
                            <span>{formatNumber(item.result.yearlyTotal)}원</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Summary */}
                <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-primary/5 to-violet-500/5 border border-primary/20">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground mb-1">분석 결과</h4>
                      <p className="text-sm text-muted-foreground">
                        {(() => {
                          const sorted = [...compareResults].sort((a, b) => a.result.totalMonthly - b.result.totalMonthly);
                          const cheapest = sorted[0];
                          const mostExpensive = sorted[sorted.length - 1];
                          const difference = mostExpensive.result.totalMonthly - cheapest.result.totalMonthly;
                          return `${cheapest.preset.name}이(가) 월 ${formatNumber(difference)}원 더 저렴합니다. 연간으로 환산하면 ${formatNumber(difference * 12)}원 절약 가능합니다.`;
                        })()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-3 animate-fade-in" style={{ animationDelay: "0.4s" }}>
                <Button
                  onClick={handleSaveReceipt}
                  className="w-full h-12 bg-gradient-to-r from-primary to-violet-500 hover:from-primary/90 hover:to-violet-500/90 shadow-lg shadow-primary/25"
                >
                  <Download className="w-5 h-5 mr-2" />
                  비교 결과 이미지로 저장
                </Button>
                
                <Button
                  onClick={handleReset}
                  className="w-full h-12"
                  variant="outline"
                >
                  다시 비교하기
                </Button>
              </div>
            </div>
          )}

          {step === "result" && mode === "single" && result && (
            <div className="space-y-6 max-w-lg mx-auto">
              {/* Result Hero */}
              <div className="text-center animate-fade-in">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-full text-sm font-medium text-emerald-600 mb-4">
                  <Sparkles className="w-4 h-4" />
                  분석 완료
                </div>
                <h2 className="text-2xl font-bold text-foreground">
                  월 유지비 분석 결과
                </h2>
                {selectedPreset !== null && (
                  <p className="text-muted-foreground mt-1">
                    {carPresets[selectedPreset].emoji} {carPresets[selectedPreset].name} 기준
                  </p>
                )}
              </div>

              {/* Pie Chart */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/50 shadow-xl animate-fade-in" style={{ animationDelay: "0.1s" }}>
                <h3 className="font-semibold text-foreground mb-4 text-center">비용 구성 비율</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                        animationBegin={0}
                        animationDuration={1000}
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => `${formatNumber(value)}원`}
                        contentStyle={{
                          backgroundColor: "rgba(255, 255, 255, 0.95)",
                          borderRadius: "12px",
                          border: "none",
                          boxShadow: "0 10px 40px rgba(0,0,0,0.1)",
                        }}
                      />
                      <Legend
                        iconType="circle"
                        iconSize={10}
                        formatter={(value) => <span className="text-sm text-foreground">{value}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Cost breakdown bars */}
                <div className="space-y-3 mt-4">
                  {chartData.map((item, index) => {
                    const percentage = (item.value / result.totalMonthly) * 100;
                    return (
                      <div key={index} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                            {item.name}
                          </span>
                          <span className="font-medium">{formatNumber(item.value)}원 ({percentage.toFixed(1)}%)</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-1000 ease-out"
                            style={{
                              width: `${percentage}%`,
                              backgroundColor: item.color,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
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
                  {selectedPreset !== null && (
                    <p className="font-mono text-xs text-primary mt-2">
                      {carPresets[selectedPreset].emoji} {carPresets[selectedPreset].name}
                    </p>
                  )}
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
