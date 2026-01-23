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

/**
 * PageHeader - Standard page header with icon, title, description, and actions
 *
 * Usage:
 * <PageHeader
 *   title="LAP TIMES"
 *   icon={Clock}
 *   description={`${lapTimes.length} laps recorded`}
 *   actions={<Button asChild><Link href="/new">Add Lap Time</Link></Button>}
 * />
 */
export function PageHeader({ title, icon: Icon, description, actions, className }: PageHeaderProps) {
  return (
    <div className={cn('flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4', className)}>
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          {Icon && <Icon className="h-8 w-8 text-primary" />}
          {title}
        </h1>
        {description && (
          <p className="text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  )
}
