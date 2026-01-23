import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PageWrapperProps {
  children: ReactNode
  size?: 'standard' | 'narrow' | 'wide'
  className?: string
}

/**
 * PageWrapper - Standard page container with responsive padding
 *
 * Sizes:
 * - standard: max-w-7xl (default, for listing/detail pages)
 * - narrow: max-w-md (for forms/settings)
 * - wide: max-w-7xl (for data tables - standardized per user request)
 *
 * Usage:
 * <PageWrapper>
 *   <PageHeader title="My Page" icon={Icon} />
 *   {/* content *\/}
 * </PageWrapper>
 */
export function PageWrapper({ children, size = 'standard', className }: PageWrapperProps) {
  const sizeClasses = {
    standard: 'max-w-7xl',
    narrow: 'max-w-md',
    wide: 'max-w-7xl',
  }

  return (
    <div className={cn('mx-auto px-4 py-8 space-y-6', sizeClasses[size], className)}>
      {children}
    </div>
  )
}
