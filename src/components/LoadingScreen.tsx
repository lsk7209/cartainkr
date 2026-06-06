import { useState, useEffect } from "react";
import { Car, Fuel, Shield, Calculator, TrendingUp } from "lucide-react";

const loadingSteps = [
  { message: "전국 연비 데이터 비교 중...", icon: Fuel, color: "from-amber-500 to-orange-500" },
  { message: "세금 구간 확인 중...", icon: Calculator, color: "from-violet-500 to-purple-500" },
  { message: "보험료 평균 조회 중...", icon: Shield, color: "from-emerald-500 to-teal-500" },
  { message: "할부 금리 계산 중...", icon: TrendingUp, color: "from-blue-500 to-cyan-500" },
  { message: "유지비 분석 중...", icon: Car, color: "from-primary to-violet-500" },
];

interface LoadingScreenProps {
  onComplete: () => void;
}

const LoadingScreen = ({ onComplete }: LoadingScreenProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const stepDuration = 600;
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) return 100;
        return prev + 2;
      });
    }, 60);

    const stepInterval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= loadingSteps.length - 1) {
          return prev;
        }
        return prev + 1;
      });
    }, stepDuration);

    const completeTimeout = setTimeout(() => {
      onComplete();
    }, 3000);

    return () => {
      clearInterval(progressInterval);
      clearInterval(stepInterval);
      clearTimeout(completeTimeout);
    };
  }, [onComplete]);

  const CurrentIcon = loadingSteps[currentStep].icon;

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md mb-10 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-xs text-muted-foreground">월 유지비</p>
            <p className="mt-1 text-sm font-semibold text-foreground">자동 계산</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">세금/보험</p>
            <p className="mt-1 text-sm font-semibold text-foreground">항목 분리</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">비교 기준</p>
            <p className="mt-1 text-sm font-semibold text-foreground">연간 환산</p>
          </div>
        </div>
      </div>

      {/* 로딩 애니메이션 */}
      <div className="flex flex-col items-center gap-8 w-full max-w-sm">
        {/* Animated Icon */}
        <div className="relative">
          {/* Glow effect */}
          <div className={`absolute inset-0 bg-gradient-to-r ${loadingSteps[currentStep].color} rounded-full blur-xl opacity-50 animate-pulse`} />
          
          {/* Icon container */}
          <div className={`relative w-20 h-20 rounded-2xl bg-gradient-to-br ${loadingSteps[currentStep].color} flex items-center justify-center shadow-2xl transform transition-all duration-500`}>
            <CurrentIcon className="w-10 h-10 text-white animate-pulse" />
          </div>
          
          {/* Orbiting dots */}
          <div className="absolute inset-0 animate-spin" style={{ animationDuration: "3s" }}>
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-white shadow-lg" />
          </div>
          <div className="absolute inset-0 animate-spin" style={{ animationDuration: "3s", animationDelay: "1s" }}>
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-white/80 shadow-lg" />
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full space-y-3">
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div 
              className={`h-full bg-gradient-to-r ${loadingSteps[currentStep].color} transition-all duration-300 ease-out rounded-full`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>분석 중...</span>
            <span>{progress}%</span>
          </div>
        </div>

        {/* Message */}
        <div className="h-8 flex items-center justify-center">
          <p
            key={currentStep}
            className="text-foreground font-medium text-center animate-fade-in"
          >
            {loadingSteps[currentStep].message}
          </p>
        </div>

        {/* Step indicators */}
        <div className="flex gap-2">
          {loadingSteps.map((step, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                i <= currentStep 
                  ? `bg-gradient-to-r ${step.color} scale-110` 
                  : "bg-slate-200"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
