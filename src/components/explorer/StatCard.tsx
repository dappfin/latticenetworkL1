import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  subValue?: string;
  className?: string;
}

export const StatCard = ({ label, value, icon, subValue, className }: StatCardProps) => {
  return (
    <div className={cn(
      "bg-card/60 backdrop-blur-sm border border-border/50 rounded-lg p-4",
      className
    )}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold text-foreground mt-1">{value}</p>
          {subValue && (
            <p className="text-xs text-muted-foreground mt-1">{subValue}</p>
          )}
        </div>
        {icon && (
          <div className="text-primary/60">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
};
