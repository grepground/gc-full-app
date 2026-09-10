"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { apiFetch } from "../services/api";

interface User {
  id: number;
  username: string;
  email: string;
  role: "admin" | "moderator" | "player";

  firstName?: string;
  lastName?: string;
  nickname?: string;
  bio?: string | null;
  chesscomUsername?: string | null;
  lichessUsername?: string | null;
  avatar?: string;
  isActive?: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Module-level cache of the last known session user.
 *
 * `AuthProvider` lives in the root layout, so it keeps its state across
 * client-side navigations — but a full page load (or a hard refresh) starts it
 * empty, which made every route flash its signed-out state while `/auth/me`
 * was in flight. Reading the last result synchronously on the first render
 * removes that flash on repeat visits within the same tab.
 */
let cachedUser: User | null = null;
let hasCachedUser = false;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(cachedUser);
  // Only treat the very first paint as "loading" when we have nothing cached;
  // otherwise the header/pages can render immediately with the known user.
  const [loading, setLoading] = useState<boolean>(!hasCachedUser);

  // Loads and exposes only the logged-in profile. The auth check itself lives
  // in the server (Route Handler under /api/auth/me), so no token is sent.
  async function fetchCurrentUser(): Promise<User | null> {
    try {
      const data = await apiFetch("/auth/me");
      return (data as User | null) ?? null;
    } catch {
      return null; // Clear state if token or session is invalid/expired
    }
  }

  // Requests an up-to-date session view (used by consumers after log-in / edits).
  const refreshUser = useCallback(async () => {
    try {
      const data = await fetchCurrentUser();
      cachedUser = data;
      hasCachedUser = true;
      setUser(data);
    } finally {
      setLoading(false);
    }
  }, []);

  // Gracefully clear server session and client identity state
  const logout = async () => {
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } catch (error) {
      console.error("Logout request failed on server:", error);
    } finally {
      cachedUser = null;
      hasCachedUser = true;
      setUser(null);
      window.location.href = "/auth"; // Hard redirect to clear any residual layout states
    }
  };

  // Initial session load on mount.
  useEffect(() => {
    let active = true;
    void (async () => {
      const data = await fetchCurrentUser();
      if (active) {
        cachedUser = data;
        hasCachedUser = true;
        setUser(data);
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, refreshUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error(
      "useAuth must be executed within an explicit AuthProvider boundary",
    );
  }
  return context;
}
