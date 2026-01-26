/**
 * Layout Components Barrel File
 *
 * Purpose: Centralized exports for all layout components
 * - Provides single import point for layout components
 * - Simplifies imports (don't need to know file paths)
 * - Barrel file pattern for better organization
 * - Re-exports: All layout components from one file
 *
 * **Exported Components:**
 * - PageWrapper: Standard page container with responsive padding
 * - PageHeader: Standard page header with icon, title, description, and actions
 * - EmptyState: Standardized empty state display
 * - SearchBar: Standardized search input with centered icon
 *
 * **Usage Pattern:**
 * - Import from @/components/layout instead of individual files
 * - Cleaner imports: One import statement for all layout components
 * - Consistent: Same import pattern across all files
 *
 * **Common Usage:**
 * ```tsx
 * // Import all layout components from one place
 * import { PageWrapper, PageHeader, EmptyState, SearchBar } from '@/components/layout'
 * import { Wrench, Clock, Search } from 'lucide-react'
 *
 * // Use in component
 * export function MyPage() {
 *   const [search, setSearch] = useState('')
 *   const [items, setItems] = useState([])
 *
 *   return (
 *     <PageWrapper>
 *       <PageHeader
 *         title="MY PAGE"
 *         icon={Clock}
 *         description={`${items.length} items`}
 *       />
 *       <SearchBar
 *         value={search}
 *         onChange={setSearch}
 *         placeholder="Search items..."
 *       />
 *       {items.length === 0 && (
 *         <EmptyState
 *           icon={Wrench}
 *           title="No items found"
 *           description="Create your first item to get started"
 *         />
 *       )}
 *     </PageWrapper>
 *   )
 * }
 * ```
 *
 * **Benefits:**
 * - Cleaner imports: Don't need to know individual file paths
 * - Consistent: Same import pattern across all files
 * - Organized: All layout components in one place
 * - Maintainable: Easy to add/remove exports
 * - Tree-shaking: Bundler can eliminate unused exports
 *
 * **Pattern:**
 * - Barrel file: Re-export from individual files
 * - Named exports: All components exported by name
 * - No default export: Avoids import conflicts
 * - Type-safe: TypeScript preserves component types
 *
 * **Tree-Shaking:**
 * - Modern bundlers (Vite, webpack) can eliminate unused exports
 * - Import only what you need: Bundler includes only used components
 * - No bundle size penalty: Unused components are removed
 *
 * **Debugging Tips:**
 * - Import not working: Check file path is correct (@/components/layout)
 * - Component missing: Verify export statement exists
 * - Type error: Check component export matches import
 *
 * **Common Issues:**
 * - Wrong import: Use @/components/layout not @/components/layout/PageWrapper
 * - Missing export: Check component is exported in source file
 * - TypeScript error: Verify component has export keyword
 *
 * **Related Files:**
 * - @/components/layout/PageWrapper.tsx: Page wrapper source
 * - @/components/layout/PageHeader.tsx: Page header source
 * - @/components/layout/EmptyState.tsx: Empty state source
 * - @/components/layout/SearchBar.tsx: Search bar source
 */

// ============================================================
// COMPONENT EXPORTS
// ============================================================
// Re-export all layout components from individual files
// - Named exports: Import by component name
// - No default exports: Avoids import conflicts
// - Type-safe: TypeScript preserves component types
//
// Why barrel file?
// - Cleaner imports: One import for all layout components
// - Consistent: Same pattern across all files
// - Organized: All layout components in one place
// - Tree-shaking: Bundler removes unused exports
//
// Usage:
// import { PageWrapper, PageHeader, EmptyState, SearchBar } from '@/components/layout'
//
// Debugging Tips:
// - Import not working: Check file path is correct
// - Component missing: Verify export exists in source file
// - Type error: Check component has export keyword
// ============================================================

export { PageWrapper } from './PageWrapper'
export { PageHeader } from './PageHeader'
export { EmptyState } from './EmptyState'
export { SearchBar } from './SearchBar'
