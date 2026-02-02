/**
 * EmptyNotesState Component
 *
 * Placeholder shown when there are no notes yet.
 * Displays icon, message, and "Create Your First Note" button.
 */

import { StickyNote } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EmptyNotesStateProps {
  onCreateNote?: () => void
}

export function EmptyNotesState({ onCreateNote }: EmptyNotesStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {/* Icon */}
      <div className="mb-4 rounded-full bg-muted p-4">
        <StickyNote className="h-12 w-12 text-muted-foreground" />
      </div>

      {/* Message */}
      <h3 className="text-lg font-semibold mb-2">No notes yet</h3>
      <p className="text-muted-foreground max-w-md mb-6">
        Get started by creating your first sticky note. Share ideas, links, and quick thoughts with the team.
      </p>

      {/* CTA Button */}
      {onCreateNote && (
        <Button onClick={onCreateNote} size="lg" className="min-h-[44px]">
          Create Your First Note
        </Button>
      )}
    </div>
  )
}
