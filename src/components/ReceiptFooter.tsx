import { QrCode } from "lucide-react";

const ReceiptFooter = () => {
  return (
    <div className="mt-6 pt-6 border-t-2 border-dashed border-receipt-border">
      <div className="flex items-center justify-center gap-4">
        <div className="w-16 h-16 bg-foreground/10 rounded-lg flex items-center justify-center">
          <QrCode className="w-10 h-10 text-foreground/60" />
        </div>
        <div className="text-center">
          <p className="font-mono text-xs text-receipt-muted">카테인</p>
          <p className="font-mono text-xs text-receipt-muted mt-1">cartain.kr</p>
        </div>
      </div>
      <p className="text-center font-mono text-[10px] text-receipt-muted mt-4">
        ※ 본 계산 결과는 참고용이며, 실제와 다를 수 있습니다.
      </p>
    </div>
  );
};

export default ReceiptFooter;
