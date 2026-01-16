import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  iconColor?: string;
  iconBgColor?: string;
  className?: string;
}

/**
 * 재사용 가능한 통계 카드 컴포넌트
 */
export const StatCard = ({
  icon: Icon,
  label,
  value,
  iconColor = "text-primary",
  iconBgColor = "bg-primary/10",
  className,
}: StatCardProps) => {
  return (
    <div className={cn("bg-card rounded-lg border border-border p-6", className)}>
      <div className="flex items-center gap-3 mb-2">
        <div className={cn("p-2 rounded-lg", iconBgColor)}>
          <Icon className={cn("w-5 h-5", iconColor)} />
        </div>
        <span className="text-muted-foreground text-sm">{label}</span>
      </div>
      <p className="text-3xl font-bold text-foreground">
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
    </div>
  );
};
