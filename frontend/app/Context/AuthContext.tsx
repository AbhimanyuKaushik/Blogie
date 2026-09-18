"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { User } from "../Types/UserTypes";
import { useRouter } from "next/navigation";

const API_BASE_URL = "http://localhost:8080/api";

type AuthContextType = {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
  refetchUser: () => Promise<User | null>;
};

  const [
    user,
    setUser,
  ] = useState<
    User | null
  >(null);

  const [
    loading,
    setLoading,
  ] = useState(
    true,
  );

  const router = useRouter();

  // ============================================
  // CHECK CURRENT SESSION
  // ============================================

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/auth/me`, {
          credentials: "include",
        });

    const fetchMe =
      async () => {

        try {

          const res =
            await fetch(
              "http://localhost:5000/api/auth/me",
              {
                credentials:
                  "include",
              },
            );

          if (
            !res.ok
          ) {
            setUser(
              null,
            );

            return;
          }

          const data =
            await res.json();

        const data = await res.json();

        if (data.authenticated && data.user) {
          setUser(data.user);
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error("Auth check failed:", err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchMe();

  }, []);

  // ============================================
  // LOGOUT
  // ============================================

  const logout = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) {
        console.error("Logout request failed:", res.status);
        return;
      }

      // Remove user from React state immediately.
      setUser(null);

      // Redirect to homepage.
      router.replace("/");

      // Refresh the Next.js application state.
      router.refresh();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  // ============================================
  // REFRESH AUTHENTICATED USER
  // ============================================

  const refetchUser = async (): Promise<User | null> => {
    try {
      setLoading(true);

      const res = await fetch(`${API_BASE_URL}/auth/me`, {
        credentials: "include",
      });

      if (!res.ok) {
        setUser(null);
        return null;
      }

      const data = await res.json();

      if (data.authenticated && data.user) {
        setUser(data.user);

        // IMPORTANT:
        // Return the user so callers such as AuthModal
        // can immediately use isOnboarded.
        return data.user;
      }

      setUser(null);

      return null;
    } catch (error) {
      console.error("Failed to refetch authenticated user:", error);

      setUser(null);

      return null;
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // PROVIDER
  // ============================================

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        logout,
        refetchUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ============================================
// USE AUTH HOOK
// ============================================

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}