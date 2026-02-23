/**
 * Tailwind CSS Utility Functions
 *
 * Purpose: Provide utility functions for conditional CSS class merging
 * - Combines clsx (conditional classes) and tailwind-merge (Tailwind conflict resolution)
 * - Enables dynamic class names without Tailwind conflicts
 * - Used extensively throughout UI components
 *
 * **What is cn()?**
 * - cn = "conditional classes" + "tailwind merge"
 * - Merges multiple class name strings/objects/arrays
 * - Resolves Tailwind CSS conflicts (later classes override earlier)
 * - Handles conditional logic (truthy/falsy values)
 *
 * **Why This Pattern?**
 * - Tailwind classes can conflict when combined (e.g., "p-4 p-2")
 * - tailwind-merge removes conflicting classes, keeps last one
 * - clsx enables conditional logic and multiple input formats
 * - Together: Safe, conditional Tailwind class composition
 *
 * **Common Use Cases:**
 * - Variant styling (primary, secondary, disabled states)
 * - Conditional classes (active, error, loading)
 * - Merging base styles with override styles
 * - Composing component variants
 *
 * **Example Usage:**
 * ```tsx
 * // Variant styling
 * cn(
 *   "base-class",
 *   isPrimary && "bg-blue-500",
 *   isSecondary && "bg-gray-500",
 *   "p-4" // overrides p-2 from base-class
 * )
 *
 * // Component composition
 * cn(className, "base-styles")
 *
 * // Conditional logic
 * cn("button", isActive && "active", isLoading && "loading")
 * ```
 *
 * **How It Works:**
 * 1. clsx combines all inputs into a single class string
 * 2. twMerge resolves Tailwind conflicts (keeps last occurrence)
 * 3. Returns clean, conflict-free class string
 *
 * **Debugging Tips:**
 * - Classes not applying: Check for typos in class names
 * - Conflicts: Later classes should override earlier ones
 * - Conditional not working: Verify variable is truthy/falsy
 * - Style not resolving: Check Tailwind config includes the class
 *
 * **Related Files:**
 * - All UI components use this for dynamic styling
 * - Variant patterns common in button, input, card components
 */

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Merge Tailwind CSS classes with conflict resolution
 *
 * Combines clsx (conditional classes) and tailwind-merge (Tailwind conflict resolution)
 * - Accepts strings, objects, arrays, and conditional expressions
 * - Resolves Tailwind conflicts by keeping last occurrence
 * - Filters out falsy values (false, null, undefined)
 *
 * @param inputs - Class names in various formats (string, object, array, conditional)
 * @returns Merged class string with conflicts resolved
 *
 * @example
 * ```tsx
 * // Basic usage
 * cn("p-4 bg-white", "bg-black") // "p-4 bg-black"
 *
 * // Conditional classes
 * cn("base-class", isActive && "active")
 *
 * // Object syntax
 * cn({ "bg-blue-500": isPrimary, "bg-gray-500": isSecondary })
 *
 * // Arrays
 * cn(["p-4", isActive && "active"])
 * ```
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * ============================================================================
 * APPLICATION URL UTILITIES
 * ============================================================================
 *
 * Provides environment-aware URL generation for email templates, links,
 * and dynamic URLs throughout the application.
 *
 * **Environment Priority:**
 * 1. NEXT_PUBLIC_APP_URL (manual override for any environment)
 * 2. VERCEL_URL (auto-detected in Vercel production)
 * 3. localhost:3000 (fallback for local development)
 *
 * **Why This Matters:**
 * - Email templates need absolute URLs (e.g., https://fridaygt.com/auth/signin)
 * - Development uses localhost, production uses real domain
 * - Vercel preview deployments use auto-generated URLs
 * - Hardcoded URLs break in different environments
 */

/**
 * Get the base application URL for the current environment
 *
 * @returns Base URL (e.g., "http://localhost:3000" or "https://fridaygt.com")
 *
 * @example
 * ```tsx
 * const appUrl = getAppUrl()
 * // Development: "http://localhost:3000"
 * // Production: "https://fridaygt.com"
 * // Preview: "https://fridaygt-abc123.vercel.app"
 * ```
 */
export function getAppUrl(): string {
  // Manual override (highest priority)
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL
  }

  // Vercel auto-detected URL
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }

  // Local development fallback
  return 'http://localhost:3000'
}

/**
 * Generate a full absolute URL for a given path
 *
 * @param path - Relative path (e.g., "/auth/signin", "/logo-fgt.png")
 * @returns Full absolute URL (e.g., "https://fridaygt.com/auth/signin")
 *
 * @example
 * ```tsx
 * // Email template
 * <a href="${getFullUrl('/auth/signin')}">Sign In</a>
 *
 * // Image source
 * <img src="${getFullUrl('/logo-fgt.png')}" alt="Logo" />
 * ```
 */
export function getFullUrl(path: string): string {
  const baseUrl = getAppUrl()
  // Ensure path starts with / and baseUrl doesn't end with /
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
  return `${cleanBase}${cleanPath}`
}

/**
 * Blend a hex colour toward white by a given amount.
 * amount = 0 → original colour, amount = 1 → pure white (#ffffff)
 *
 * @example lightenHex('#fef08a', 0.3) // 30% lighter
 */
export function lightenHex(hex: string, amount: number): string {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.substring(0, 2), 16)
  const g = parseInt(clean.substring(2, 4), 16)
  const b = parseInt(clean.substring(4, 6), 16)

  const lr = Math.round(r + (255 - r) * amount)
  const lg = Math.round(g + (255 - g) * amount)
  const lb = Math.round(b + (255 - b) * amount)

  return `#${lr.toString(16).padStart(2, '0')}${lg.toString(16).padStart(2, '0')}${lb.toString(16).padStart(2, '0')}`
}
