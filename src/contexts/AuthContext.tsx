import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { User } from "@/types";
import { getProfile } from "@/api/users";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SignupData {
  email: string;
  password: string;
  name: string;
  userType: "user" | "organizer" | "vendor" | "influencer";
  orgName?: string;
}

interface TokenStore {
  accessToken: string;
  expiresAt: number; // unix ms
  userID: string;
  userType: string;
  jti: string; // JWT ID — sent on logout so the backend can blacklist this specific token
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  accessToken: string | null;
  signUp: (data: SignupData) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

// ── Token memory store ────────────────────────────────────────────────────────
// Access token lives in memory only — never localStorage, never a cookie.
// The refresh token is httpOnly Secure — the browser holds it, JS never sees it.

let _tokenStore: TokenStore | null = null;
let _refreshPromise: Promise<TokenStore | null> | null = null;

export function getAccessToken(): string | null {
  if (!_tokenStore) return null;
  if (Date.now() > _tokenStore.expiresAt - 30_000) return null; // 30s buffer
  return _tokenStore.accessToken;
}

// Exported for test teardown — prevents module-level state from leaking between Vitest tests.
// In production this is never called; the token lives in memory for the tab's lifetime.
export function clearAuthStore(): void {
  _tokenStore = null;
  _refreshPromise = null;
}

// Decode the JWT payload (base64url) to extract the `jti` claim.
// We never verify the signature here — that's the backend's job.
// We only need the jti to tell the server which token to blacklist on logout.
function extractJti(token: string): string {
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return decoded.jti ?? '';
  } catch {
    return '';
  }
}

// ── API base ──────────────────────────────────────────────────────────────────

import { registerSilentRefresh } from "@/lib/api";

async function apiFetch(path: string, init: RequestInit = {}): Promise<any> {
  const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:8080/api/v1"}${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  const body = await res.json();
  if (!res.ok || body.status === "error") {
    throw new Error(body?.error?.message || "Request failed");
  }
  return body.data;
}

// ── Context ───────────────────────────────────────────────────────────────────

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Schedule a silent token refresh 60s before expiry.
  const scheduleRefresh = (store: TokenStore) => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    const delay = store.expiresAt - Date.now() - 60_000;
    if (delay <= 0) return;
    refreshTimer.current = setTimeout(() => silentRefresh(store.userID), delay);
  };

  const silentRefresh = async (userID: string): Promise<TokenStore | null> => {
    if (_refreshPromise) return _refreshPromise;
    _refreshPromise = apiFetch("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ user_id: userID }),
    })
      .then((data) => {
        const store: TokenStore = {
          accessToken: data.access_token,
          expiresAt: Date.now() + data.expires_in * 1000,
          userID: data.user_id,
          userType: data.user_type,
          jti: extractJti(data.access_token),
        };
        _tokenStore = store;
        scheduleRefresh(store);
        return store;
      })
      .catch(() => {
        _tokenStore = null;
        setUser(null);
        return null;
      })
      .finally(() => { _refreshPromise = null; });
    return _refreshPromise;
  };

  // On mount: register silentRefresh with the api interceptor, then restore session.
  useEffect(() => {
    registerSilentRefresh(silentRefresh);

    const restore = async () => {
      try {
        // We don't know the userID yet — send empty string; the server reads the cookie.
        const store = await silentRefresh("");
        if (store) {
          const profile = await getProfile();
          setUser(profile);
        }
      } catch {
        _tokenStore = null;
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    restore();
    return () => { if (refreshTimer.current) clearTimeout(refreshTimer.current); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const signUp = async (data: SignupData) => {
    setIsLoading(true);
    try {
      const res = await apiFetch("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          password: data.password,
          user_type: data.userType,
          org_name: data.orgName,
        }),
      });
      const store: TokenStore = {
        accessToken: res.access_token,
        expiresAt: Date.now() + res.expires_in * 1000,
        userID: res.user_id,
        userType: res.user_type,
        jti: extractJti(res.access_token),
      };
      _tokenStore = store;
      scheduleRefresh(store);
      const profile = await getProfile();
      setUser(profile);

      const urlParams = new URLSearchParams(window.location.search);
      const redirectTo = urlParams.get("redirect");

      if (redirectTo) {
        navigate(redirectTo);
      } else if (data.userType === "admin") {
        navigate("/admin");
      } else if (data.userType === "organizer") {
        navigate("/dashboard");
      } else if (data.userType === "vendor") {
        navigate("/vendor-dashboard");
      } else if (data.userType === "influencer") {
        navigate("/influencer");
      } else {
        navigate("/app");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      const store: TokenStore = {
        accessToken: res.access_token,
        expiresAt: Date.now() + res.expires_in * 1000,
        userID: res.user_id,
        userType: res.user_type,
        jti: extractJti(res.access_token),
      };
      _tokenStore = store;
      scheduleRefresh(store);
      const profile = await getProfile();
      setUser(profile);

      const urlParams = new URLSearchParams(window.location.search);
      const redirectTo = urlParams.get("redirect");

      if (redirectTo) {
        navigate(redirectTo);
      } else if (res.user_type === "admin") {
        navigate("/admin");
      } else if (res.user_type === "organizer") {
        navigate("/dashboard");
      } else if (res.user_type === "vendor") {
        navigate("/vendor-dashboard");
      } else if (res.user_type === "influencer") {
        navigate("/influencer");
      } else {
        navigate("/app");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    const store = _tokenStore;
    _tokenStore = null;
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    try {
      await apiFetch("/auth/logout", {
        method: "POST",
        body: JSON.stringify({ user_id: store?.userID ?? "", jti: store?.jti ?? "" }),
      });
    } catch { /* best-effort */ }
    setUser(null);
    navigate("/");
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isLoading,
      accessToken: _tokenStore?.accessToken ?? null,
      signUp,
      signIn,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
};
