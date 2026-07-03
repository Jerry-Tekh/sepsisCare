import { createContext, useContext, useEffect, useState, useCallback } from "react";
import * as authApi from "../api/authApi";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // loading:true until we've confirmed whether a valid session exists.
  // ProtectedRoute waits for this before deciding to render or redirect.
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // On every app load, ask the server to validate the httpOnly cookie and
    // return the current user. This is the ONLY way to know if the session
    // is valid — we cannot read the httpOnly cookie from JavaScript.
    //
    // We use the localStorage-cached user as optimistic UI (prevents a flash
    // of the login page on valid sessions), but the /me call is the
    // authoritative check. If /me returns 401, the axiosClient interceptor
    // clears localStorage and redirects to /login.
    const cached = localStorage.getItem("user");
    if (cached) {
      try { setUser(JSON.parse(cached)); } catch { localStorage.removeItem("user"); }
    }

    authApi
      .me()
      .then(({ data }) => {
        setUser(data.user);
        localStorage.setItem("user", JSON.stringify(data.user));
      })
      .catch(() => {
        // 401 = no valid cookie. Clear any stale cached user and let
        // ProtectedRoute redirect to /login.
        setUser(null);
        localStorage.removeItem("user");
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (credentials) => {
    const { data } = await authApi.login(credentials);
    // Server sets the httpOnly cookie. We only store non-sensitive user info.
    localStorage.setItem("user", JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (payload) => {
    const { data } = await authApi.register(payload);
    localStorage.setItem("user", JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      // Tell the server to clear the httpOnly cookie. This is the only way
      // to delete it — JavaScript cannot touch httpOnly cookies.
      await authApi.logout();
    } catch {
      // Even if the server call fails (e.g. network error), clear local state
      // so the user can still navigate away from protected pages.
    } finally {
      localStorage.removeItem("user");
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
