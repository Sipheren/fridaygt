/**
 * Search Bar Component
 *
 * Purpose: Standardized search input with centered search icon
 * - Provides consistent search UI across the application
 * - Search icon positioned on left side
 * - Input padding adjusted to accommodate icon
 * - Controlled component (value and onChange props)
 * - Default placeholder text
 *
 * **Key Features:**
 * - Search icon: Lucide Search icon on left side
 * - Icon positioning: Absolute positioning, vertically centered
 * - Input padding: pl-10 (left padding) to make room for icon
 * - Controlled: Value and onChange props (not uncontrolled)
 * - Placeholder: Default "Search..." text (customizable)
 * - Customizable: className prop for additional styling
 *
 * **Layout Pattern:**
 * - Container: Relative positioning for icon
 * - Icon: Absolute positioned on left
 * - Input: Pl-10 padding to avoid icon overlap
 * - Icon alignment: Vertically centered (top-1/2, -translate-y-1/2)
 * - Icon spacing: left-3 (12px from left edge)
 *
 * **Icon Styling:**
 * - Size: h-4 w-4 (16px, standard icon size)
 * - Color: text-muted-foreground (subtle)
 * - Position: absolute (relative to container)
 * - Left: left-3 (12px from left edge)
 * - Vertical center: top-1/2 transform -translate-y-1/2
 *
 * **Input Styling:**
 * - Type: text (standard text input)
 * - Padding: pl-10 (40px left) to accommodate icon
 * - Component: shadcn Input component
 * - Placeholder: Default "Search..." (customizable)
 *
 * **Component Pattern:**
 * - Controlled: Value and onChange required
 * - Parent manages: Search state in parent component
 * - Callback: onChange receives string value
 * - No state: No local state in this component
 *
 * **Common Usage:**
 * ```tsx
 * // Basic usage with state
 * const [search, setSearch] = useState('')
 * <SearchBar
 *   value={search}
 *   onChange={setSearch}
 * />
 *
 * // Custom placeholder
 * <SearchBar
 *   placeholder="Search builds..."
 *   value={search}
 *   onChange={setSearch}
 * />
 *
 * // With debounce (recommended)
 * const [search, setSearch] = useState('')
 * const [debouncedSearch, setDebouncedSearch] = useState('')
 *
 * useEffect(() => {
 *   const timeout = setTimeout(() => {
 *     setDebouncedSearch(search)
 *   }, 300)
 *   return () => clearTimeout(timeout)
 * }, [search])
 *
 * <SearchBar
 *   value={search}
 *   onChange={setSearch}
 * />
 * // Use debouncedSearch for filtering
 * ```
 *
 * **Debouncing Pattern:**
 * - Why debounce? Prevents excessive filtering on every keystroke
 * - Typical delay: 300ms (balance between responsiveness and efficiency)
 * - Implementation: useEffect with setTimeout cleanup
 * - Benefit: Better performance for large lists
 *
 * **Accessibility:**
 * - Icon: Decorative (no screen reader text needed)
 * - Input: Standard input accessibility (placeholder, type)
 * - Label: Parent should provide label (not included here)
 * - Focus: Default input focus behavior
 *
 * **Performance:**
 * - No re-renders: Only re-renders when props change
 * - No state: Pure presentation component
 * - Lightweight: Simple input with icon
 *
 * **Styling:**
 * - Global classes: None used (component-specific)
 * - Icon color: Muted for subtlety
 * - Input: Uses shadcn Input component styling
 * - Spacing: Consistent icon positioning
 *
 * **Integration:**
 * - Parent state: Search value managed in parent
 * - Filtering: Parent filters list based on search value
 * - Debouncing: Recommended for better performance
 * - Reset: Parent can clear search with setValue('')
 *
 * **Debugging Tips:**
 * - Icon not visible: Check z-index (input may cover icon)
 * - Padding wrong: Verify pl-10 is applied to input
 * - Not updating: Check onChange is being called correctly
 * - Value stuck: Check parent state is being updated
 *
 * **Common Issues:**
 * - Icon overlapping input: Ensure pl-10 is applied to Input
 * - Icon not centered: Check top-1/2 and -translate-y-1/2 classes
 * - Input not working: Verify value and onChange props are correct
 * - Search not filtering: Check parent filtering logic
 *
 * **Related Files:**
 * - @/components/ui/input.tsx: shadcn Input component
 * - @/components/layout/PageWrapper.tsx: Page wrapper component
 * - @/components/layout/PageHeader.tsx: Page header component
 * - @/lib/utils.ts: cn() utility for conditional classes
 */

import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function SearchBar({ value, onChange, placeholder = 'Search...', className }: SearchBarProps) {
  // ============================================================
  // RENDER
  // ============================================================
  // Container: Relative positioning for icon placement
  // - relative: Icon positioning context
  //
  // Search icon:
  // - absolute: Positioned relative to container
  // - left-3: 12px from left edge
  // - top-1/2: Positioned at vertical center
  // - -translate-y-1/2: Adjusted to true center (account for icon height)
  // - h-4 w-4: 16px size
  // - text-muted-foreground: Subtle color
  //
  // Input:
  // - type="text": Standard text input
  // - placeholder: Default "Search..." or custom text
  // - value: Controlled input value
  // - onChange: Updates parent state on input
  // - pl-10: Left padding (40px) to accommodate icon
  // - Prevents: Text from rendering under icon
  //
  // Why pl-10?
  // - Icon width: w-4 (16px)
  // - Icon padding: left-3 (12px)
  // - Icon spacing: ~12px for visual balance
  // - Total: ~40px (pl-10 = 2.5rem = 40px)
  //
  // Why controlled component?
  // - Parent controls search state
  // - Parent can filter list based on value
  // - Parent can reset search with setValue('')
  // - Consistent: Matches other form patterns in app
  //
  // Debugging Tips:
  // - Icon not visible: Check z-index, input may cover
  // - Icon overlapping text: Verify pl-10 on Input
  // - Not updating: Check onChange prop is correct
  // - Value stuck: Check parent state update
  // ============================================================

  return (
    <div className={cn('relative', className)}>
      {/* Search icon */}
      {/* Absolute positioned on left */}
      {/* Vertically centered with transform */}
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />

      {/* Search input */}
      {/* Controlled component (value and onChange required) */}
      {/* pl-10: Left padding to avoid icon overlap */}
      <Input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-10"
      />
    </div>
  )
}
