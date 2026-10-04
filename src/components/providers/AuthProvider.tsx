"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { ApiClientError, api } from "@/lib/client-api";
import type { AuthProviders, PublicUser } from "@/types";

interface AuthContextValue {
  user: PublicUser | null;
  loading: boolean;
  providers: AuthProviders;
  refresh: () => Promise<void>;
  setUser: (user: PublicUser | null) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export default function AuthProvider({
  children,
  providers,
}: {
  children: ReactNode;
  providers: AuthProviders;
}) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Initial session check. Runs in promise callbacks so no state is set
  // synchronously inside the effect.
  useEffect(() => {
    let cancelled = false;

    api
      .get<PublicUser>("/api/user/me")
      .then((currentUser) => {
        if (!cancelled) setUser(currentUser);
      })
      .catch((error) => {
        if (!(error instanceof ApiClientError) || error.status !== 401) {
          console.error(error);
        }
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const refresh = useCallback(async () => {
    try {
      const currentUser = await api.get<PublicUser>("/api/user/me");
      setUser(currentUser);
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) {
        // A missing session is a valid signed-out state.
        setUser(null);
        return;
      }
      // Transient failures must reach callers instead of looking signed out.
      console.error(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/api/user/logout");
    } finally {
      // Clear local state even when the server could not be reached.
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, providers, refresh, setUser, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider.");
  }
  return context;
}
