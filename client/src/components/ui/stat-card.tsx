import * as React from "react";
import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps extends React.ComponentProps<typeof Card> {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: {
    value: string | number;
    isPositive?: boolean;
  };
  iconColor?: string;
}

export function StatCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
  iconColor = "text-primary",
  className,
  ...props
}: StatCardProps) {
  return (
    <Card
      className={cn(
        "group overflow-hidden rounded-xl border border-border bg-card p-6 shadow-2xs hover:shadow-sm hover:border-border/100 transition-all duration-200 cursor-default",
        className
      )}
      {...props}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </p>
        <div
          className={cn(
            "p-2 rounded-lg bg-secondary/50 group-hover:bg-secondary transition-colors duration-150",
            iconColor
          )}
        >
          <Icon className="size-5 shrink-0" />
        </div>
      </div>

      <div className="mt-4 flex items-baseline justify-between">
        <div>
          <h3 className="text-3xl font-bold tracking-tight text-foreground select-all">
            {value}
          </h3>
          {(description || trend) && (
            <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1.5">
              {trend && (
                <span
                  className={cn(
                    "font-semibold",
                    trend.isPositive ? "text-emerald-600" : "text-destructive"
                  )}
                >
                  {trend.value}
                </span>
              )}
              <span>{description}</span>
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
