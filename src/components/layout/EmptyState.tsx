/**
 * Empty State Component
 *
 * Purpose: Standardized empty state display for when content is not available
 * - Provides consistent empty state UI across the application
 * - Large icon for visual interest
 * - Clear title and optional description
 * - Optional action buttons for next steps
 * - Centered layout with border container
 *
 * **Key Features:**
 * - Icon: Optional Lucide icon (large, centered, muted color)
 * - Title: Main message (e.g., "No builds found")
 * - Description: Optional subtitle with more context
 * - Actions: Optional buttons/links for user actions
 * - Centered: Text and icon are centered
 * - Bordered: Subtle border container for visual separation
 *
 * **Layout Pattern:**
 * - Container: Centered text with border and padding
 * - Icon: Large (h-12 w-12, 48px) centered above title
 * - Title: Large text (text-lg, 18px) for prominence
 * - Description: Smaller text (text-sm, 14px) for details
 * - Actions: Buttons below description (mt-4 spacing)
 *
 * **Icon Styling:**
 * - Size: h-12 w-12 (48px, large for visibility)
 * - Color: text-muted-foreground (subtle, not distracting)
 * - Alignment: mx-auto (horizontal centering)
 * - Spacing: mb-4 (margin-bottom: 16px)
 *
 * **Title Styling:**
 * - Size: text-lg (18px, larger than body text)
 * - Color: text-muted-foreground (subtle)
 * - Alignment: Centered (inherited from parent)
 *
 * **Description Styling:**
 * - Size: text-sm (14px, smaller than title)
 * - Color: text-muted-foreground (same as title)
 * - Spacing: mt-2 (margin-top: 8px)
 * - Alignment: Centered (inherited from parent)
 *
 * **Actions Styling:**
 * - Spacing: mt-4 (margin-top: 16px)
 * - Layout: Can contain single button or multiple
 * - Flex: Can wrap multiple buttons
 *
 * **Container Styling:**
 * - Border: border border-border (subtle border)
 * - Radius: rounded-lg (8px, rounded corners)
 * - Padding: py-12 (48px top/bottom, generous spacing)
 * - Text: text-center (centered alignment)
 *
 * **Common Usage:**
 * ```tsx
 * // Simple empty state with icon
 * <EmptyState
 *   icon={Wrench}
 *   title="No builds found"
 * />
 *
 * // Empty state with description
 * <EmptyState
 *   icon={Clock}
 *   title="No lap times yet"
 *   description="Record your first lap time to get started"
 * />
 *
 * // Empty state with action button
 * <EmptyState
 *   icon={Wrench}
 *   title="No builds found"
 *   description="Create your first build to get started"
 *   actions={<Button asChild><Link href="/new">Create Build</Link></Button>}
 * />
 *
 * // Empty state with multiple actions
 * <EmptyState
 *   icon={Users}
 *   title="No members in this race"
 *   description="Add users to this race to get started"
 *   actions={
 *     <>
 *       <Button variant="outline">Import</Button>
 *       <Button>Add Member</Button>
 *     </>
 *   }
 * />
 * ```
 *
 * **Accessibility:**
 * - Icon: Decorative (no screen reader text needed, title explains context)
 * - Title: Clear, descriptive text
 * - Actions: Standard button/link accessibility
 * - Spacing: Sufficient padding for visual separation
 *
 * **Performance:**
 * - No re-renders: Simple presentation component
 * - No state: Pure props-based component
 * - Icon rendering: Lucide icons are lightweight
 *
 * **Styling:**
 * - Global classes: None used (component-specific)
 * - Border: Subtle border for visual container
 * - Colors: Muted foreground for hierarchy
 * - Spacing: Generous padding (py-12) for breathing room
 *
 * **Debugging Tips:**
 * - Icon not showing: Check icon prop is LucideIcon component
 * - Text not centered: Check text-center class is applied
 * - Border not showing: Check border-border class is applied
 * - Actions not showing: Check actions prop is not null
 *
 * **Common Issues:**
 * - Icon not rendering: Verify icon is from lucide-react
 * - Title too long: Consider shorter text or responsive sizing
 * - Actions not clickable: Check button/Link components are correct
 * - Layout broken: Check parent has sufficient width
 *
 * **Related Files:**
 * - @/components/layout/PageWrapper.tsx: Page wrapper component
 * - @/components/layout/PageHeader.tsx: Page header component
 * - @/components/layout/SearchBar.tsx: Search bar component
 * - @/lib/utils.ts: cn() utility for conditional classes
 */

import { ReactNode } from 'react'
import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  actions?: ReactNode
  className?: string
}

export function EmptyState({ icon: Icon, title, description, actions, className }: EmptyStateProps) {
  // ============================================================
  // RENDER
  // ============================================================
  // Container: Centered text with border and padding
  // - text-center: Center all text and icons
  // - py-12: Generous vertical padding (48px)
  // - border border-border: Subtle border container
  // - rounded-lg: Rounded corners (8px)
  //
  // Icon (optional):
  // - Only rendered if Icon prop is provided
  // - h-12 w-12: Large size (48px) for visibility
  // - text-muted-foreground: Subtle color
  // - mx-auto: Horizontal centering
  // - mb-4: Space below icon (16px)
  //
  // Title:
  // - text-lg: Large text (18px) for prominence
  // - text-muted-foreground: Subtle color
  // - Main message: "No builds found", "No lap times yet", etc.
  //
  // Description (optional):
  // - Only rendered if description prop exists
  // - text-sm: Smaller text (14px) than title
  // - text-muted-foreground: Same color as title
  // - mt-2: Small margin below title (8px)
  //
  // Actions (optional):
  // - Only rendered if actions prop exists
  // - mt-4: Space above buttons (16px)
  // - Can contain: Single button or multiple buttons
  //
  // Why this structure?
  // - Consistent: Same empty state across all pages
  // - Clear: Large icon and title for visibility
  // - Actionable: Buttons guide user to next step
  // - Accessible: Centered, readable, sufficient spacing
  //
  // Debugging Tips:
  // - Icon not showing: Check icon is LucideIcon component
  // - Not centered: Check text-center class is applied
  // - Border missing: Check border-border class
  // - Actions not showing: Verify actions prop is not null
  // ============================================================

  return (
    <div className={cn('text-center py-12 border border-border rounded-lg', className)}>
      {/* Optional icon */}
      {/* Large centered icon for visual interest */}
      {/* Only rendered if Icon prop is provided */}
      {Icon && <Icon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />}

      {/* Title */}
      {/* Main empty state message */}
      {/* Large text for prominence */}
      <p className="text-muted-foreground text-lg">{title}</p>

      {/* Optional description */}
      {/* Additional context or instructions */}
      {/* Smaller text for hierarchy */}
      {description && (
        <p className="text-muted-foreground text-sm mt-2">{description}</p>
      )}

      {/* Optional actions */}
      {/* Buttons/links for user actions */}
      {/* Space above for visual separation */}
      {actions && <div className="mt-4">{actions}</div>}
    </div>
  )
}
