import { trpc } from "@/lib/trpc";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import "./index.css";

const queryClient = new QueryClient();

/**
 * Error Handling for Unauthorized Requests
 *
 * When a 401 Unauthorized error occurs, clear auth tokens and redirect to login.
 */
const handleUnauthorizedError = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  // Check if this is an authorization error
  if (error.data?.code === "UNAUTHORIZED") {
    console.warn("[Auth] Unauthorized:", error.message);
    // Clear stored tokens
    localStorage.removeItem("auth-tokens");
    localStorage.removeItem("manus-runtime-user-info");
    // Redirect to login only if not on a public path
    const publicPaths = [
      "/",
      "/login",
      "/signup",
      "/forgot-password",
      "/reset-password",
    ];
    if (!publicPaths.includes(window.location.pathname)) {
      window.location.href = "/login";
    }
  }
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
      async fetch(input, init) {
        let response = await globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });

        // Catch 401 Unauthorized and attempt token refresh
        if (
          response.status === 401 &&
          !String(input).includes("auth.refresh")
        ) {
          const stored = localStorage.getItem("auth-tokens");
          if (stored) {
            try {
              const { refreshToken } = JSON.parse(stored);
              if (refreshToken) {
                const refreshResponse = await globalThis.fetch(
                  `${getBaseUrl()}/api/trpc/auth.refresh`,
                  {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      "0": {
                        refreshToken,
                      },
                    }),
                  }
                );

                if (refreshResponse.ok) {
                  const data = await refreshResponse.json();
                  const resultData =
                    data[0]?.result?.data ?? data?.result?.data;
                  if (resultData?.success && resultData?.tokens) {
                    localStorage.setItem(
                      "auth-tokens",
                      JSON.stringify(resultData.tokens)
                    );

                    // Re-try the original request with new Authorization header
                    const newHeaders = { ...(init?.headers ?? {}) } as any;
                    newHeaders["Authorization"] =
                      `Bearer ${resultData.tokens.accessToken}`;

                    response = await globalThis.fetch(input, {
                      ...(init ?? {}),
                      headers: newHeaders,
                      credentials: "include",
                    });
                  }
                }
              }
            } catch (e) {
              console.error("Silent token refresh failed:", e);
            }
          }
        }
        return response;
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
