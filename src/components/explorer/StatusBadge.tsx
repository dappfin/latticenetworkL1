import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: "healthy" | "syncing" | "degraded" | "active" | "inactive" | "success" | "failed" | "soft" | "hard";
  className?: string;
}

const statusConfig = {
  healthy: { label: "Healthy", color: "bg-green-500/20 text-green-400 border-green-500/30" },
  syncing: { label: "Syncing", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  degraded: { label: "Degraded", color: "bg-red-500/20 text-red-400 border-red-500/30" },
  active: { label: "Active", color: "bg-green-500/20 text-green-400 border-green-500/30" },
  inactive: { label: "Inactive", color: "bg-muted text-muted-foreground border-border" },
  success: { label: "Success", color: "bg-green-500/20 text-green-400 border-green-500/30" },
  failed: { label: "Failed", color: "bg-red-500/20 text-red-400 border-red-500/30" },
  soft: { label: "Soft", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  hard: { label: "Hard", color: "bg-green-500/20 text-green-400 border-green-500/30" },
};

export const StatusBadge = ({ status, className }: StatusBadgeProps) => {
  const config = statusConfig[status];
  
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border",
        config.color,
        className
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5" />
      {config.label}
    </span>
  );
};
