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
