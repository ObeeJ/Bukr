/**
 * INFRASTRUCTURE LAYER - Utility Helpers
 *
 * High-level: Shared utility functions used across the entire frontend.
 * Low-level: cn() merges Tailwind class strings safely — clsx handles
 * conditional logic (arrays, objects, falsy values) and twMerge resolves
 * conflicting Tailwind classes (e.g. `p-2 p-4` → `p-4`) so the last
 * class always wins without duplicates.
 */
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * cn
 * High-level: Combine and deduplicate Tailwind CSS class names.
 * Low-level: Passes all inputs through clsx (handles conditionals/arrays),
 * then through twMerge (resolves Tailwind conflicts). Safe to call with
 * undefined, false, or empty strings — they are silently dropped.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

