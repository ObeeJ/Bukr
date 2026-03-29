/**
 * INFRASTRUCTURE LAYER - Axios HTTP Client
 *
 * Reads the in-memory access token from AuthContext and attaches it to every
 * outgoing request. The refresh token is an httpOnly cookie — the browser
 * sends it automatically on /auth/refresh calls. No Supabase anywhere.
 */
import axios from "axios";
import { getAccessToken } from "@/contexts/AuthContext";

// ── Silent refresh registration ───────────────────────────────────────────────
// AuthContext registers its silentRefresh fn here on mount so the 401 response
// interceptor can trigger a token refresh and retry the original request.
// This avoids a circular import (AuthContext already imports api).

type SilentRefreshFn = (userId: string) => Promise<{ accessToken: string } | null>;
let _silentRefresh: SilentRefreshFn | null = null;

export function registerSilentRefresh(fn: SilentRefreshFn) {
  _silentRefresh = fn;
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8080/api/v1",
  headers: { "Content-Type": "application/json" },
  withCredentials: true, // sends httpOnly refresh cookie on every request
});

// Attach the in-memory access token to every request.
api.interceptors.request.use(async (config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Unwrap { status, data, error } envelope, surface error messages, and retry on 401.
api.interceptors.response.use(
  (response) => {
    const body = response.data;
    if (body && typeof body === "object" && "status" in body) {
      if (body.status === "error") {
        return Promise.reject(new Error(body.error?.message || "Request failed"));
      }
      response.data = body.data;
    }
    return response;
  },
  async (error) => {
    const status = error.response?.status;
    const config = error.config;

    // On 401, attempt one silent refresh then retry the original request.
    // _retried flag prevents infinite loops if refresh itself returns 401.
    if (status === 401 && config && !config._retried && _silentRefresh) {
      config._retried = true;
      const store = await _silentRefresh("").catch(() => null);
      if (store?.accessToken) {
        config.headers.Authorization = `Bearer ${store.accessToken}`;
        return api(config);
      }
    }

    const body = error.response?.data;
    if (body?.status === "error" && body?.error?.message) {
      error.message = body.error.message;
    }
    throw error;
  }
);

export default api;

// ── snake_case ↔ camelCase utilities ─────────────────────────────────────────

type AnyObject = Record<string, any>;

function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, l) => l.toUpperCase());
}

function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (l) => `_${l.toLowerCase()}`);
}

export function mapFromApi<T = any>(obj: any): T {
  if (Array.isArray(obj)) return obj.map(mapFromApi) as T;
  if (obj !== null && typeof obj === "object" && !(obj instanceof Date)) {
    const out: AnyObject = {};
    for (const [k, v] of Object.entries(obj)) out[toCamelCase(k)] = mapFromApi(v);
    return out as T;
  }
  return obj;
}

export function mapToApi<T = any>(obj: any): T {
  if (Array.isArray(obj)) return obj.map(mapToApi) as T;
  if (obj !== null && typeof obj === "object" && !(obj instanceof Date)) {
    const out: AnyObject = {};
    for (const [k, v] of Object.entries(obj)) out[toSnakeCase(k)] = mapToApi(v);
    return out as T;
  }
  return obj;
}
