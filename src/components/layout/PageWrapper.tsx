/**
 * Page Wrapper Component
 *
 * Purpose: Standard page container with responsive padding and max-width
 * - Provides consistent page layout across the application
 * - Responsive padding for mobile and desktop
 * - Max-width constraints for readability
 * - Configurable sizes for different page types
 *
 * **Key Features:**
 * - Responsive padding: Mobile (px-4) and desktop (py-8) spacing
 * - Max-width control: Constrains content width for readability
 * - Size variants: standard, narrow, wide
 * - Auto margins: Centers content horizontally
 * - Consistent spacing: space-y-6 for vertical rhythm
 * - Customizable: className prop for additional styling
 *
 * **Size Variants:**
 * - standard: max-w-7xl (default, for listing/detail pages)
 * - narrow: max-w-md (for forms/settings, focused content)
 * - wide: max-w-7xl (for data tables, same as standard per user request)
 *
 * **Responsive Design:**
 * - Mobile: Full width with horizontal padding (px-4)
 * - Desktop: Constrained max-width with auto margins (mx-auto)
 * - Padding: Vertical padding (py-8) for top/bottom spacing
 *
 * **Layout Pattern:**
 * - Container: Centers content with max-width
 * - Spacing: space-y-6 for consistent vertical rhythm
 * - Flexible: Accepts any children content
 *
 * **Common Usage:**
 * ```tsx
 * // Standard listing page
 * <PageWrapper>
 *   <PageHeader title="Builds" icon={Wrench} />
 *   <BuildsList />
 * </PageWrapper>
 *
 * // Narrow form page
 * <PageWrapper size="narrow">
 *   <PageHeader title="Settings" icon={Settings} />
 *   <SettingsForm />
 * </PageWrapper>
 *
 * // With custom className
 * <PageWrapper className="py-4">
 *   <Content />
 * </PageWrapper>
 * ```
 *
 * **Styling:**
 * - mx-auto: Centers content horizontally
 * - px-4: Horizontal padding on mobile
 * - py-8: Vertical padding for breathing room
 * - space-y-6: Vertical spacing between children
 * - max-w-7xl: Standard max-width (1280px)
 * - max-w-md: Narrow max-width (448px)
 *
 * **Performance:**
 * - No re-renders: Simple wrapper component
 * - No state: Pure presentation component
 * - CSS-only: No JavaScript overhead
 *
 * **Accessibility:**
 * - Semantic: Generic div (allows any content)
 * - Spacing: Consistent padding for touch targets
 * - Readability: Max-width prevents overly wide text
 *
 * **Debugging Tips:**
 * - Content not centered: Check mx-auto class is applied
 * - Padding not working: Check parent element doesn't override padding
 * - Max-width not working: Check size prop is correct
 * - Vertical spacing: space-y-6 applies to direct children
 *
 * **Common Issues:**
 * - Layout too narrow: Use size="standard" instead of "narrow"
 * - Padding inconsistent: Check parent/child padding conflicts
 * - Not responsive: Verify px-4 is applied for mobile
 *
 * **Related Files:**
 * - @/components/layout/PageHeader.tsx: Page header component
 * - @/components/layout/EmptyState.tsx: Empty state component
 * - @/components/layout/SearchBar.tsx: Search bar component
 * - @/lib/utils.ts: cn() utility for conditional classes
 */

import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PageWrapperProps {
  children: ReactNode
  size?: 'standard' | 'narrow' | 'wide'
  className?: string
}

export function PageWrapper({ children, size = 'standard', className }: PageWrapperProps) {
  // ============================================================
  // SIZE CLASSES
  // ============================================================
  // Map size prop to Tailwind max-width classes
  // - standard: max-w-7xl (1280px) for listing/detail pages
  // - narrow: max-w-md (448px) for forms/settings
  // - wide: max-w-7xl (1280px) for data tables (same as standard)
  //
  // Why these sizes?
  // - standard: Good balance for most content, readable line length
  // - narrow: Focused content for forms, prevents wide inputs
  // - wide: Same as standard (user requested standardization)
  //
  // Note: wide and standard are both max-w-7xl per user request
  // This prevents layout shifts when switching between pages
  //
  // Debugging Tips:
  // - Width not changing: Check size prop is correct
  // - Too narrow: Use size="standard" instead of "narrow"
  // - Not centered: Check mx-auto class is applied
  // ============================================================

  const sizeClasses = {
    standard: 'max-w-7xl',
    narrow: 'max-w-md',
    wide: 'max-w-7xl',
  }

  // ============================================================
  // RENDER
  // ============================================================
  // mx-auto: Centers content horizontally
  // px-4: Horizontal padding for mobile
  // py-8: Vertical padding for breathing room
  // space-y-6: Vertical spacing between children
  // sizeClasses[size]: Max-width constraint
  // className: Additional custom classes
  //
  // Why this structure?
  // - Consistent: Same padding and spacing across all pages
  // - Responsive: Works on mobile and desktop
  // - Flexible: Can override with className prop
  // - Accessible: Sufficient padding for touch targets
  //
  // Debugging Tips:
  // - Content not centered: Check mx-auto is applied
  // - Padding missing: Check parent doesn't override
  // - Spacing wrong: Check space-y-6 is applying to children
  // ============================================================

  return (
    <div className={cn('mx-auto px-4 py-8 space-y-6', sizeClasses[size], className)}>
      {children}
    </div>
  )
}
