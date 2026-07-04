import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ChartContainerProps extends React.ComponentProps<typeof Card> {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function ChartContainer({
  title,
  description,
  children,
  className,
  ...props
}: ChartContainerProps) {
  return (
    <Card
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-card shadow-2xs",
        className
      )}
      {...props}
    >
      <CardHeader className="px-6 pt-6 pb-4 border-b bg-secondary/10">
        <CardTitle className="text-sm font-bold tracking-tight text-foreground">
          {title}
        </CardTitle>
        {description && (
          <CardDescription className="text-xs text-muted-foreground mt-1">
            {description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="p-6">
        <div className="w-full h-[300px] flex items-center justify-center">
          {children}
        </div>
      </CardContent>
    </Card>
  );
}
