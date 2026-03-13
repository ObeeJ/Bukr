/**
 * INFRASTRUCTURE LAYER - Axios HTTP Client
 *
 * High-level: The single HTTP client the entire frontend uses to talk to the Go gateway.
 * Handles auth token injection and response envelope unwrapping automatically,
 * so every API module just calls api.get/post and gets clean typed data back.
 *
 * Low-level:
 * - Request interceptor: reads the active Supabase session and attaches
 *   `Authorization: Bearer <jwt>` to every outgoing request.
 * - Response interceptor: unwraps the `{ status, data, error }` envelope
 *   returned by the backend. On success it strips the wrapper and returns
 *   `response.data = body.data`. On error it extracts the backend message
 *   and rejects with a plain Error so callers get a readable message.
 */
import axios from 'axios';
import { supabase } from './supabase';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach Supabase JWT to every outgoing request.
// Without this, every protected endpoint returns 401.
api.interceptors.request.use(
  async (config) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Unwrap { status, data, error } → data on success.
// On error, surface the backend's human-readable message instead of a generic axios error.
api.interceptors.response.use(
  (response) => {
    const body = response.data;
    // If the response follows our envelope format, unwrap it
    if (body && typeof body === 'object' && 'status' in body) {
      if (body.status === 'error') {
        const message = body.error?.message || 'Request failed';
        return Promise.reject(new Error(message));
      }
      // Return the inner data payload directly
      response.data = body.data;
    }
    return response;
  },
  (error) => {
    // Extract backend error message if available
    const body = error.response?.data;
    if (body?.status === 'error' && body?.error?.message) {
      error.message = body.error.message;
    }
    if (error.response?.status === 401) {
      console.error('Unauthorized access - session may have expired');
    }
    return Promise.reject(error);
  }
);

export default api;

/**
 * snake_case ↔ camelCase mapping utilities
 *
 * High-level: The backend speaks snake_case (Go/Rust convention), the frontend speaks
 * camelCase (JS convention). These two functions bridge that gap recursively so
 * neither side has to care about the other's naming style.
 *
 * Low-level: Both functions walk the object tree. Arrays are mapped element-by-element.
 * Plain objects get their keys transformed. Primitives and Dates pass through unchanged.
 * mapFromApi is called on every API response; mapToApi is called before every POST/PUT/PATCH.
 */
type AnyObject = Record<string, any>;

function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

/**
 * mapFromApi
 * High-level: Converts a raw backend response (snake_case keys) into a camelCase object
 * the frontend TypeScript types expect.
 * Low-level: Recursively walks arrays and objects, applying toCamelCase to every key.
 * Leaves primitives and Date instances untouched.
 */
export function mapFromApi<T = any>(obj: any): T {
  if (Array.isArray(obj)) {
    return obj.map(mapFromApi) as T;
  }
  if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
    const mapped: AnyObject = {};
    for (const [key, value] of Object.entries(obj)) {
      mapped[toCamelCase(key)] = mapFromApi(value);
    }
    return mapped as T;
  }
  return obj;
}

/**
 * mapToApi
 * High-level: Converts a camelCase frontend payload into the snake_case shape the
 * backend expects before sending a POST/PUT/PATCH request.
 * Low-level: Mirror of mapFromApi — same recursive walk, applies toSnakeCase to keys.
 */
export function mapToApi<T = any>(obj: any): T {
  if (Array.isArray(obj)) {
    return obj.map(mapToApi) as T;
  }
  if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
    const mapped: AnyObject = {};
    for (const [key, value] of Object.entries(obj)) {
      mapped[toSnakeCase(key)] = mapToApi(value);
    }
    return mapped as T;
  }
  return obj;
}
