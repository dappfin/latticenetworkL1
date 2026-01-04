import { useState, ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExpandableCardProps {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  expandedContent?: ReactNode;
  expandLabel?: string;
  defaultExpanded?: boolean;
  className?: string;
}

export const ExpandableCard = ({
  title,
  icon,
  children,
  expandedContent,
  expandLabel = "View details",
  defaultExpanded = false,
  className,
}: ExpandableCardProps) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <Card className={cn("bg-card/60 backdrop-blur-sm border-border/50", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-medium flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {children}
        
        {expandedContent && (
          <>
            <div className={cn(
              "overflow-hidden transition-all duration-300",
              expanded ? "max-h-[1000px] opacity-100 mt-4" : "max-h-0 opacity-0"
            )}>
              <div className="pt-4 border-t border-border/50">
                {expandedContent}
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              className="mt-4 w-full text-muted-foreground hover:text-foreground"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? "Hide details" : expandLabel}
              <ChevronDown className={cn(
                "ml-2 h-4 w-4 transition-transform",
                expanded && "rotate-180"
              )} />
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};
