import { trpc } from "@/lib/trpc";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import "./index.css";

const queryClient = new QueryClient();

/**
 * Simplified Error Handling (Phase 1)
 * 
 * Removed Manus OAuth redirect.
 * Phase 2 will implement proper JWT-based error handling.
 */
const handleUnauthorizedError = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;
  
  // Phase 1: Log unauthorized errors
  // Phase 2: Redirect to login page
  console.warn("[Auth] Unauthorized:", error.message);
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    handleUnauthorizedError(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    handleUnauthorizedError(error);
    console.error("[API Mutation Error]", error);
  }
});

const getBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  if (typeof window !== "undefined") return window.location.origin;
  return "";
};

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: `${getBaseUrl()}/api/trpc`,
      transformer: superjson,
      headers() {
        // Get access token from localStorage
        const stored = localStorage.getItem("auth-tokens");
        if (stored) {
          try {
            const { accessToken } = JSON.parse(stored);
            if (accessToken) {
              return {
                Authorization: `Bearer ${accessToken}`,
              };
            }
          } catch (e) {
            console.error("Failed to parse stored tokens:", e);
          }
        }
        return {};
      },
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);
