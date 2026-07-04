import * as React from "react";
import { AlertCircle, CheckCircle, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useFormContext } from "react-hook-form";

// 1. Form Section Card
interface SectionCardProps extends React.ComponentProps<typeof Card> {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function SectionCard({ title, description, children, className, ...props }: SectionCardProps) {
  return (
    <Card className={cn("overflow-hidden border-border/80", className)} {...props}>
      <CardHeader className="bg-secondary/20 border-b pb-4 px-6">
        <CardTitle className="text-base font-bold tracking-tight text-foreground">{title}</CardTitle>
        {description && <CardDescription className="text-xs mt-1 text-muted-foreground">{description}</CardDescription>}
      </CardHeader>
      <CardContent className="p-6">{children}</CardContent>
    </Card>
  );
}

// 2. Form Required Field Indicator
export function RequiredIndicator() {
  return <span className="text-destructive font-bold ml-0.5" aria-hidden="true">*</span>;
}

// 3. Validation Summary
export function FormValidationSummary() {
  const { formState: { errors } } = useFormContext();
  const errorKeys = Object.keys(errors);

  if (errorKeys.length === 0) return null;

  return (
    <div className="flex gap-3 p-4 border border-destructive/20 bg-destructive/5 rounded-xl text-destructive text-sm animate-in fade-in slide-in-from-top-1 mb-6">
      <AlertCircle className="h-5 w-5 shrink-0 text-destructive mt-0.5" />
      <div className="space-y-1">
        <h4 className="font-semibold leading-none">Please resolve the following errors:</h4>
        <ul className="list-disc pl-4 space-y-0.5 text-xs text-destructive/80 mt-2">
          {errorKeys.map((key) => {
            const error = errors[key];
            const message = error?.message ? String(error.message) : `Invalid field: ${key}`;
            return <li key={key}>{message}</li>;
          })}
        </ul>
      </div>
    </div>
  );
}

// 4. Stepper Support
interface Step {
  id: string;
  title: string;
  description?: string;
}

interface FormStepperProps {
  steps: Step[];
  currentStepIndex: number;
  className?: string;
}

export function FormStepper({ steps, currentStepIndex, className }: FormStepperProps) {
  return (
    <div className={cn("w-full overflow-x-auto pb-4", className)}>
      <div className="flex items-center justify-between min-w-[600px] px-2">
        {steps.map((step, idx) => {
          const isCompleted = idx < currentStepIndex;
          const isActive = idx === currentStepIndex;

          return (
            <React.Fragment key={step.id}>
              {/* Step circle */}
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex size-9 items-center justify-center rounded-full border text-sm font-semibold transition-all duration-150 shadow-2xs",
                    isCompleted && "bg-primary border-primary text-primary-foreground",
                    isActive && "border-primary text-primary ring-2 ring-primary/20 bg-background",
                    !isActive && !isCompleted && "border-border bg-background text-muted-foreground"
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle className="size-5 text-primary-foreground fill-primary" />
                  ) : (
                    <span>{idx + 1}</span>
                  )}
                </div>
                <div className="flex flex-col text-left">
                  <span
                    className={cn(
                      "text-sm font-bold tracking-tight",
                      isActive ? "text-primary" : isCompleted ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {step.title}
                  </span>
                  {step.description && (
                    <span className="text-[10px] text-muted-foreground font-medium max-w-[120px] truncate">
                      {step.description}
                    </span>
                  )}
                </div>
              </div>

              {/* Progress Line Divider */}
              {idx < steps.length - 1 && (
                <div
                  className={cn(
                    "h-0.5 flex-1 mx-4 rounded-full",
                    idx < currentStepIndex ? "bg-primary" : "bg-border"
                  )}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

// 5. Unsaved Changes Detection Hook
export function useUnsavedChanges(isDirty: boolean, message = "You have unsaved changes. Are you sure you want to leave?") {
  React.useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = message;
        return message;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isDirty, message]);
}
