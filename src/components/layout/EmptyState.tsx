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

/**
 * EmptyState - Standardized empty state display
 *
 * Usage:
 * <EmptyState
 *   icon={Wrench}
 *   title="No builds found"
 *   description="Create your first build to get started"
 *   actions={<Button asChild><Link href="/new">Create Build</Link></Button>}
 * />
 */
export function EmptyState({ icon: Icon, title, description, actions, className }: EmptyStateProps) {
  return (
    <div className={cn('text-center py-12 border border-border rounded-lg', className)}>
      {Icon && <Icon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />}
      <p className="text-muted-foreground text-lg">{title}</p>
      {description && (
        <p className="text-muted-foreground text-sm mt-2">{description}</p>
      )}
      {actions && <div className="mt-4">{actions}</div>}
    </div>
  )
}
