import { cn } from "@/lib/utils";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen p-6 bg-background">
          <div className="flex flex-col items-center w-full max-w-2xl p-8 border rounded-2xl bg-card shadow-lg">
            <div className="flex items-center justify-center size-14 rounded-full bg-destructive/10 text-destructive mb-6">
              <AlertTriangle size={28} />
            </div>

            <h2 className="text-xl font-bold tracking-tight mb-2">
              Something went wrong
            </h2>
            <p className="text-sm text-muted-foreground text-center mb-6">
              An unexpected error occurred in the application. You can reload
              the page or check the technical logs below.
            </p>

            <div className="p-4 w-full rounded-lg border border-border/60 bg-secondary/30 overflow-auto mb-6 max-h-48 text-left">
              <pre className="text-xs font-mono text-muted-foreground whitespace-break-spaces">
                {this.state.error?.message || "Unknown error details"}
              </pre>
            </div>

            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/95 transition-all duration-150 active:scale-[0.98] shadow-sm hover:shadow font-medium text-sm cursor-pointer"
            >
              <RotateCcw size={16} />
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
