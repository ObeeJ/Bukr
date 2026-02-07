import axios from 'axios';
import { supabase } from './supabase';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach Supabase JWT token to every request
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

// Unwrap the API response envelope: { status, data, error } → data
// Also handle error responses from the backend
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

// =====================
// snake_case ↔ camelCase mapping utilities
// =====================

type AnyObject = Record<string, any>;

function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

/** Recursively convert all keys in an object from snake_case to camelCase */
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

/** Recursively convert all keys in an object from camelCase to snake_case */
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
