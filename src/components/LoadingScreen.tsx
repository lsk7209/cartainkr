import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

const loadingMessages = [
  "전국 연비 데이터 비교 중...",
  "세금 구간 확인 중...",
  "보험료 평균 조회 중...",
  "할부 금리 계산 중...",
  "유지비 분석 중...",
];

interface LoadingScreenProps {
  onComplete: () => void;
}

const LoadingScreen = ({ onComplete }: LoadingScreenProps) => {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const messageInterval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % loadingMessages.length);
    }, 800);

    const completeTimeout = setTimeout(() => {
      onComplete();
    }, 3000);

    return () => {
      clearInterval(messageInterval);
      clearTimeout(completeTimeout);
    };
  }, [onComplete]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
      {/* 광고 영역 placeholder */}
      <div className="w-full max-w-md h-64 bg-muted/50 rounded-lg border-2 border-dashed border-border flex items-center justify-center mb-12">
        <p className="text-muted-foreground text-sm">광고 영역</p>
      </div>

      {/* 로딩 애니메이션 */}
      <div className="flex flex-col items-center gap-6">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        
        <div className="h-6 flex items-center justify-center">
          <p
            key={messageIndex}
            className="text-muted-foreground font-medium animate-fade-up"
          >
            {loadingMessages[messageIndex]}
          </p>
        </div>

        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-primary animate-pulse-dot"
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
