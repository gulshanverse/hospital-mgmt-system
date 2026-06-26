import React, { createContext, useContext, useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";

export interface AuthUser {
  id: number;
  fullName: string;
  email: string | null;
  role: string;
  phone: string | null;
  isActive?: boolean;
}

export interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  error: Error | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ accessToken: string; refreshToken: string }>;
  register: (fullName: string, email: string, password: string, phone?: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  updateProfile: (data: { fullName?: string; phone?: string; avatar?: string }) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);

  const meQuery = trpc.auth.me.useQuery(undefined, {
    enabled: !!accessToken,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const loginMutation = trpc.auth.login.useMutation();
  const registerMutation = trpc.auth.register.useMutation();
  const logoutMutation = trpc.auth.logout.useMutation();
  const updateProfileMutation = trpc.auth.updateProfile.useMutation();
  const changePasswordMutation = trpc.auth.changePassword.useMutation();
  const refreshMutation = trpc.auth.refresh.useMutation();

  // Initialize from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("auth-tokens");
    if (stored) {
      try {
        const { accessToken: at, refreshToken: rt } = JSON.parse(stored);
        setAccessToken(at);
        setRefreshToken(rt);
      } catch (e) {
        console.error("Failed to parse stored tokens:", e);
        localStorage.removeItem("auth-tokens");
      }
    }
    setLoading(false);
  }, []);

  // Update user when meQuery data changes
  useEffect(() => {
    if (meQuery.data) {
      setUser(meQuery.data);
      setError(null);
    }
  }, [meQuery.data]);

  // Handle meQuery errors
  useEffect(() => {
    if (meQuery.error) {
      const err = meQuery.error as any;
      setError(new Error(err?.message || "Authentication failed"));
      setUser(null);
      setAccessToken(null);
    }
  }, [meQuery.error]);

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      const result = await loginMutation.mutateAsync({ email, password });
      setAccessToken(result.tokens.accessToken);
      setRefreshToken(result.tokens.refreshToken);
      localStorage.setItem(
        "auth-tokens",
        JSON.stringify({
          accessToken: result.tokens.accessToken,
          refreshToken: result.tokens.refreshToken,
        })
      );
      setUser(result.user);
      return result.tokens;
    } catch (err) {
      const error = err instanceof Error ? err : new Error((err as any)?.message || "Login failed");
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (fullName: string, email: string, password: string, phone?: string) => {
    try {
      setLoading(true);
      setError(null);
      const result = await registerMutation.mutateAsync({
        fullName,
        email,
        password,
        phone,
      });
      setAccessToken(result.tokens.accessToken);
      setRefreshToken(result.tokens.refreshToken);
      localStorage.setItem(
        "auth-tokens",
        JSON.stringify({
          accessToken: result.tokens.accessToken,
          refreshToken: result.tokens.refreshToken,
        })
      );
      setUser(result.user);
      return result.user;
    } catch (err) {
      const error = err instanceof Error ? err : new Error((err as any)?.message || "Registration failed");
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      await logoutMutation.mutateAsync();
      setUser(null);
      setAccessToken(null);
      setRefreshToken(null);
      localStorage.removeItem("auth-tokens");
      setError(null);
    } catch (err) {
      console.error("Logout error:", err);
      // Clear local state even if logout fails
      setUser(null);
      setAccessToken(null);
      setRefreshToken(null);
      localStorage.removeItem("auth-tokens");
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    if (!refreshToken) {
      throw new Error("No refresh token available");
    }
    try {
      const result = await refreshMutation.mutateAsync({ refreshToken });
      setAccessToken(result.tokens.accessToken);
      setRefreshToken(result.tokens.refreshToken);
      localStorage.setItem(
        "auth-tokens",
        JSON.stringify({
          accessToken: result.tokens.accessToken,
          refreshToken: result.tokens.refreshToken,
        })
      );
    } catch (err) {
      // If refresh fails, logout
      await logout();
      throw err;
    }
  };

  const updateProfile = async (data: { fullName?: string; phone?: string; avatar?: string }) => {
    try {
      setLoading(true);
      const result = await updateProfileMutation.mutateAsync(data);
      setUser(result.user);
      setError(null);
    } catch (err) {
      const error = err instanceof Error ? err : new Error((err as any)?.message || "Profile update failed");
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    try {
      setLoading(true);
      await changePasswordMutation.mutateAsync({ currentPassword, newPassword });
      setError(null);
    } catch (err) {
      const error = err instanceof Error ? err : new Error((err as any)?.message || "Password change failed");
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        isAuthenticated: !!user && !!accessToken,
        login,
        register,
        logout,
        refresh,
        updateProfile,
        changePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext must be used within AuthProvider");
  }
  return context;
}
