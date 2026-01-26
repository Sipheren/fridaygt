/**
 * Page Header Component
 *
 * Purpose: Standard page header with icon, title, description, and actions
 * - Provides consistent page title layout across the application
 * - Displays page title with optional icon
 * - Shows optional description below title
 * - Actions area for buttons/links on the right
 * - Responsive layout: stacked on mobile, side-by-side on desktop
 *
 * **Key Features:**
 * - Icon support: Optional Lucide icon displayed with title
 * - Title: Large, bold heading (text-3xl)
 * - Description: Optional subtitle below title
 * - Actions: Buttons/links on the right side
 * - Responsive: Stacked on mobile, side-by-side on desktop (sm:)
 * - Flexible: Accepts ReactNode for description and actions
 *
 * **Layout Pattern:**
 * - Desktop (sm:): Flex row with title on left, actions on right
 * - Mobile: Flex column with title above actions
 * - Spacing: gap-4 between title/description and actions
 * - Alignment: items-center on desktop for vertical centering
 *
 * **Title Styling:**
 * - Size: text-3xl (30px, very large)
 * - Weight: font-bold (700)
 * - Tracking: tracking-tight (tighter letter spacing)
 * - Icon: h-8 w-8 (32px, large)
 * - Icon color: text-primary
 * - Icon spacing: gap-3 between icon and text
 *
 * **Description Styling:**
 * - Color: text-muted-foreground (subtle)
 * - Size: Default (base, 16px)
 * - Spacing: mt-1 (margin-top: 4px)
 * - Location: Below title, aligned with title
 *
 * **Actions Styling:**
 * - Layout: Flex row with gap-2 between items
 * - Location: Right side on desktop, below title on mobile
 * - Flexible: Can contain multiple buttons/links
 * - Alignment: items-center for vertical centering
 *
 * **Responsive Design:**
 * - Mobile (< 640px): Flex column, title above actions
 * - Desktop (≥ 640px): Flex row, title left, actions right
 * - Breakpoint: sm: (640px) using Tailwind responsive prefix
 *
 * **Common Usage:**
 * ```tsx
 * // Simple header with icon
 * <PageHeader
 *   title="LAP TIMES"
 *   icon={Clock}
 * />
 *
 * // Header with description and actions
 * <PageHeader
 *   title="BUILDS"
 *   icon={Wrench}
 *   description={`${builds.length} builds created`}
 *   actions={<Button asChild><Link href="/new">Add Build</Link></Button>}
 * />
 *
 * // Header with custom actions (multiple buttons)
 * <PageHeader
 *   title="RACES"
 *   icon={Flag}
 *   actions={
 *     <>
 *       <Button variant="outline">Export</Button>
 *       <Button>Create Race</Button>
 *     </>
 *   }
 * />
 * ```
 *
 * **Accessibility:**
 * - Heading level: h1 (main page heading)
 * - Icon: Decorative (no screen reader text needed)
 * - Actions: Standard button/link accessibility
 * - Spacing: Sufficient gap for touch targets
 *
 * **Performance:**
 * - No re-renders: Simple presentation component
 * - No state: Pure props-based component
 * - Icon rendering: Lucide icons are lightweight
 *
 * **Styling:**
 * - Global classes: None used (component-specific)
 * - Font: System font stack
 * - Colors: Primary color for icon, muted for description
 * - Spacing: Consistent gap-4 and mt-1
 *
 * **Debugging Tips:**
 * - Icon not showing: Check icon prop is LucideIcon component
 * - Title too long: Consider using shorter text or responsive sizing
 * - Actions not aligned: Check items-center is applied on desktop
 * - Description not showing: Check description prop is not null
 *
 * **Common Issues:**
 * - Icon not rendering: Verify icon is from lucide-react
 * - Layout broken: Check parent has sufficient width
 * - Actions overlapping: Use fewer buttons or responsive variants
 * - Wrong heading level: This is always h1 (use h2/h3 in content)
 *
 * **Related Files:**
 * - @/components/layout/PageWrapper.tsx: Page wrapper component
 * - @/components/layout/EmptyState.tsx: Empty state component
 * - @/components/layout/SearchBar.tsx: Search bar component
 * - @/lib/utils.ts: cn() utility for conditional classes
 */

import { ReactNode } from 'react'
import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: string
  icon?: LucideIcon
  description?: string | ReactNode
  actions?: ReactNode
  className?: string
}

export function PageHeader({ title, icon: Icon, description, actions, className }: PageHeaderProps) {
  // ============================================================
  // RENDER
  // ============================================================
  // Layout: Flex container with responsive direction
  // - Mobile (< 640px): Flex column (stacked)
  // - Desktop (≥ 640px): Flex row (side-by-side)
  //
  // Title section:
  // - space-y-1: Spacing between title and description
  // - h1: Main page heading (semantic HTML)
  // - text-3xl: Large heading size (30px)
  // - font-bold: Bold font weight (700)
  // - tracking-tight: Tighter letter spacing for headings
  // - flex items-center gap-3: Icon and title alignment
  // - Icon: h-8 w-8 (32px), text-primary color
  //
  // Description:
  // - text-muted-foreground: Subtle color
  // - mt-1: Small margin below title
  //
  // Actions section:
  // - flex items-center gap-2: Button alignment and spacing
  // - Only rendered if actions prop exists
  //
  // Responsive behavior:
  // - sm:flex-row: Side-by-side on desktop
  // - sm:items-center: Vertical centering on desktop
  // - sm:justify-between: Space between title and actions
  // - Default: Flex column on mobile
  //
  // Debugging Tips:
  // - Icon not showing: Check icon is LucideIcon component
  // - Title wrapping: Consider shorter text or max-width
  // - Actions misaligned: Check items-center on desktop
  // - Description not showing: Verify prop is not null
  // ============================================================

  return (
    <div className={cn('flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4', className)}>
      {/* Title and Description Section */}
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          {/* Optional icon */}
          {/* Only rendered if Icon prop is provided */}
          {/* h-8 w-8: 32px size for visibility */}
          {/* text-primary: Matches brand color */}
          {Icon && <Icon className="h-8 w-8 text-primary" />}
          {/* Page title */}
          {title}
        </h1>
        {/* Optional description */}
        {/* Shown below title with small margin */}
        {/* text-muted-foreground: Subtle color for hierarchy */}
        {description && (
          <p className="text-muted-foreground mt-1">{description}</p>
        )}
      </div>

      {/* Actions Section */}
      {/* Only rendered if actions prop exists */}
      {/* Right side on desktop, below title on mobile */}
      {/* flex items-center gap-2: Button alignment */}
      {actions && (
        <div className="flex items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  )
}
