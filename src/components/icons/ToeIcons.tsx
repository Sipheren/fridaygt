/**
 * Toe Angle Icon Components
 *
 * Purpose: React icon components for toe angle direction indicators
 * - ToeInIcon: Tires rotated inward (positive toe angle values)
 * - ToeOutIcon: Tires rotated outward (negative toe angle values)
 * - ToeStraightIcon: Tires straight (zero toe angle)
 *
 * **Design:**
 * - Based on GT7 in-game UI icons from gt7data/toe-*.svg files
 * - Lucide React pattern: inline SVG with fill="currentColor"
 * - ViewBox: 0 0 512 512 (matches source SVGs)
 * - Left tire: x=66.7, width=112.8, circle at cx=123.1
 * - Right tire: x=332.5, width=112.8, circle at cx=388.9
 * - Tire dimensions: 112.8 x 300.8, rx=41.5 (rounded corners)
 *
 * **Transformations:**
 * - Straight: No rotation (base rect)
 * - Toe In: Left rotated +20deg, Right rotated -20deg
 * - Toe Out: Left rotated -20deg, Right rotated +20deg
 *
 * **Theme Support:**
 * - fill="currentColor" inherits text color from CSS
 * - Works in both light and dark modes automatically
 * - Use text-foreground for default, text-current for custom colors
 *
 * **Usage:**
 * <ToeInIcon size={24} className="text-foreground" />
 * <ToeOutIcon size={16} className="text-current" aria-hidden="true" />
 *
 * **Related Files:**
 * - gt7data/toe-in.svg: Source SVG for toe in icon
 * - gt7data/toe-out.svg: Source SVG for toe out icon
 * - gt7data/toe-straight.svg: Source SVG for straight icon
 * - src/components/builds/ToeAngleInput.tsx: Uses these icons
 * - src/app/builds/[id]/page.tsx: Uses these icons for display
 */

import { SVGProps } from 'react'

// ============================================================
// TYPE DEFINITIONS
// ============================================================

/**
 * Props interface for toe icon components
 * - Extends standard SVG props for full flexibility
 * - size: Optional width/height (default 24px)
 * - className: For Tailwind styling (text-foreground, etc.)
 */
interface IconProps extends SVGProps<SVGSVGElement> {
  size?: number | string
}

// ============================================================
// TOE IN ICON
// ============================================================
// Tires rotated inward (positive toe angle values)
// Left tire: rotate(20deg) - front of tire points right
// Right tire: rotate(-20deg) - front of tire points left
//
// Transform coordinates calculated by Illustrator:
// - Left: translate(95 -26.7) rotate(20)
// - Right: translate(-64.1 148.4) rotate(-20)

/**
 * Toe In Icon Component
 *
 * Displays two tires rotated inward (positive toe angle)
 * Used when toe angle value > 0.0005
 *
 * @param size - Icon width/height in pixels (default: 24)
 * @param className - Tailwind classes for styling
 * @param props - Additional SVG props (aria-hidden, etc.)
 */
export function ToeInIcon({ size = 24, className, ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      width={size}
      height={size}
      fill="currentColor"
      className={className}
      {...props}
    >
      {/* Left tire (rotated in - front points right) */}
      <g>
        <rect x="66.7" y="105.6" width="112.8" height="300.8" rx="41.5" ry="41.5" transform="translate(95 -26.7) rotate(20)"/>
        <circle cx="123.1" cy="256" r="15" fill="currentColor"/>
      </g>
      {/* Right tire (rotated in - front points left) */}
      <g>
        <rect x="332.5" y="105.6" width="112.8" height="300.8" rx="41.5" ry="41.5" transform="translate(-64.1 148.4) rotate(-20)"/>
        <circle cx="388.9" cy="256" r="15" fill="currentColor"/>
      </g>
    </svg>
  )
}

// ============================================================
// TOE OUT ICON
// ============================================================
// Tires rotated outward (negative toe angle values)
// Left tire: rotate(-20deg) - front of tire points left
// Right tire: rotate(20deg) - front of tire points right
//
// Transform coordinates calculated by Illustrator:
// - Left: translate(-80.1 57.6) rotate(-20)
// - Right: translate(111 -117.6) rotate(20)

/**
 * Toe Out Icon Component
 *
 * Displays two tires rotated outward (negative toe angle)
 * Used when toe angle value < -0.0005
 *
 * @param size - Icon width/height in pixels (default: 24)
 * @param className - Tailwind classes for styling
 * @param props - Additional SVG props (aria-hidden, etc.)
 */
export function ToeOutIcon({ size = 24, className, ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      width={size}
      height={size}
      fill="currentColor"
      className={className}
      {...props}
    >
      {/* Left tire (rotated out - front points left) */}
      <g>
        <rect x="66.7" y="105.6" width="112.8" height="300.8" rx="41.5" ry="41.5" transform="translate(-80.1 57.6) rotate(-20)"/>
        <circle cx="123.1" cy="256" r="15" fill="currentColor"/>
      </g>
      {/* Right tire (rotated out - front points right) */}
      <g>
        <rect x="332.5" y="105.6" width="112.8" height="300.8" rx="41.5" ry="41.5" transform="translate(111 -117.6) rotate(20)"/>
        <circle cx="388.9" cy="256" r="15" fill="currentColor"/>
      </g>
    </svg>
  )
}

// ============================================================
// TOE STRAIGHT ICON
// ============================================================
// Tires with no rotation (zero toe angle)
// Both tires point straight ahead
// No transform attribute needed

/**
 * Toe Straight Icon Component
 *
 * Displays two tires pointing straight ahead (zero toe angle)
 * Used when toe angle value is between -0.0005 and +0.0005
 *
 * @param size - Icon width/height in pixels (default: 24)
 * @param className - Tailwind classes for styling
 * @param props - Additional SVG props (aria-hidden, etc.)
 */
export function ToeStraightIcon({ size = 24, className, ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      width={size}
      height={size}
      fill="currentColor"
      className={className}
      {...props}
    >
      {/* Left tire (straight - no rotation) */}
      <g>
        <rect x="66.7" y="105.6" width="112.8" height="300.8" rx="41.5" ry="41.5"/>
        <circle cx="123.1" cy="256" r="15" fill="currentColor"/>
      </g>
      {/* Right tire (straight - no rotation) */}
      <g>
        <rect x="332.5" y="105.6" width="112.8" height="300.8" rx="41.5" ry="41.5"/>
        <circle cx="388.9" cy="256" r="15" fill="currentColor"/>
      </g>
    </svg>
  )
}
