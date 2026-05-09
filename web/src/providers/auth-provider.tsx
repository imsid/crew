"use client";

import { getMe, loginWithHandle } from "@/lib/api";
import type { AuthState } from "@/lib/types";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type AuthContextValue = {
  auth: AuthState | null;
  isReady: boolean;
  login: (handle: string) => Promise<AuthState>;
  logout: () => void;
  refresh: () => Promise<void>;
};

const STORAGE_KEY = "crew-beta-auth";
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [auth, setAuth] = useState<AuthState | null>(null);
  const [isReady, setIsReady] = useState(false);
  const restoreStartedRef = useRef(false);

  useEffect(() => {
    if (restoreStartedRef.current) return;
    restoreStartedRef.current = true;

    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      setIsReady(true);
      return;
    }

    const parsed = JSON.parse(raw) as AuthState;
    getMe(parsed.token)
      .then(({ user }) => {
        setAuth({ ...parsed, user });
      })
      .catch(() => {
        window.localStorage.removeItem(STORAGE_KEY);
        setAuth(null);
      })
      .finally(() => setIsReady(true));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      auth,
      isReady,
      login: async (handle) => {
        const nextAuth = await loginWithHandle(handle);
        setAuth(nextAuth);
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextAuth));
        return nextAuth;
      },
      logout: () => {
        setAuth(null);
        window.localStorage.removeItem(STORAGE_KEY);
      },
      refresh: async () => {
        if (!auth) return;
        const { user } = await getMe(auth.token);
        const nextAuth = { ...auth, user };
        setAuth(nextAuth);
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextAuth));
      },
    }),
    [auth, isReady],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

export function RequireAuth({ children }: Readonly<{ children: ReactNode }>) {
  const { auth, isReady } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isReady) return;
    if (!auth && pathname !== "/login") {
      router.replace("/login");
    }
  }, [auth, isReady, pathname, router]);

  if (!isReady || (!auth && pathname !== "/login")) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="surface-panel flex w-full max-w-md flex-col gap-3 p-8 text-center">
          <p className="text-sm font-medium text-muted-foreground">Crew Beta</p>
          <h1 className="text-2xl font-semibold">Loading workspace</h1>
          <p className="text-sm text-muted-foreground">
            Restoring your session and connecting the beta workspace.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
