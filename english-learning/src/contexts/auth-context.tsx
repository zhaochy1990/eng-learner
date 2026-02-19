"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  authLogin,
  authRegister,
  authLogout,
  authRefresh,
  getMe,
  getAccessToken,
  getRefreshToken,
  clearTokens,
  scheduleTokenRefresh,
  stopTokenRefresh,
  type UserProfile,
} from "@/lib/auth-client";

interface AuthContextValue {
  user: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const PUBLIC_PATHS = ["/login", "/register"];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Check auth on mount
  useEffect(() => {
    async function checkAuth() {
      const token = getAccessToken();
      if (!token) {
        setLoading(false);
        if (!PUBLIC_PATHS.includes(pathname)) {
          router.replace("/login");
        }
        return;
      }

      try {
        const profile = await getMe();
        setUser(profile);
        scheduleTokenRefresh();
      } catch {
        // Token might be expired, try refresh
        const refreshToken = getRefreshToken();
        if (refreshToken) {
          try {
            await authRefresh();
            const profile = await getMe();
            setUser(profile);
            scheduleTokenRefresh();
          } catch {
            clearTokens();
            if (!PUBLIC_PATHS.includes(pathname)) {
              router.replace("/login");
            }
          }
        } else {
          clearTokens();
          if (!PUBLIC_PATHS.includes(pathname)) {
            router.replace("/login");
          }
        }
      } finally {
        setLoading(false);
      }
    }

    checkAuth();

    return () => {
      stopTokenRefresh();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      await authLogin(email, password);
      const profile = await getMe();
      setUser(profile);
      scheduleTokenRefresh();
      router.replace("/");
    },
    [router]
  );

  const register = useCallback(
    async (email: string, password: string, name?: string) => {
      await authRegister(email, password, name);
      const profile = await getMe();
      setUser(profile);
      scheduleTokenRefresh();
      router.replace("/");
    },
    [router]
  );

  const logout = useCallback(async () => {
    stopTokenRefresh();
    await authLogout();
    setUser(null);
    router.replace("/login");
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
