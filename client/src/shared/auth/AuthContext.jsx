import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, clearTokens, getTokens, setTokens } from "../http/api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadMe = useCallback(async () => {
    const { accessToken } = getTokens();
    if (!accessToken) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const res = await api("/api/auth/me");
      setUser(res.user);
    } catch {
      clearTokens();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMe();
  }, [loadMe]);

  const value = useMemo(() => {
    return {
      user,
      loading,
      async loginEmail({ email, password }) {
        const tokens = await api("/api/auth/login", { method: "POST", body: { email, password }, auth: false });
        setTokens(tokens);
        await loadMe();
      },
      async registerEmail({ role, name, email, password, securityCode }) {
        const tokens = await api(
          "/api/auth/register",
          {
            method: "POST",
            body: { role, name, email, password, securityCode },
            auth: false
          }
        );
        setTokens(tokens);
        await loadMe();
      },
      async logout() {
        clearTokens();
        setUser(null);
      },
      async acceptOAuthTokens({ accessToken, refreshToken }) {
        setTokens({ accessToken, refreshToken });
        await loadMe();
      }
    };
  }, [user, loading, loadMe]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

