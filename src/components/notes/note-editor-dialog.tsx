"use client"

/**
 * NoteEditorDialog Component
 *
 * Dialog for creating/editing notes with title, content, and color picker.
 * Handles both create and edit modes.
 */

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import type { DbNote } from '@/types/database'

interface NoteEditorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (data: { title: string; content: string; color: string }) => Promise<void>
  note?: DbNote | null
}

const NOTE_COLORS = [
  { value: '#fef08a', label: 'Yellow', class: 'bg-yellow-200 dark:bg-yellow-900/30' },
  { value: '#fbcfe8', label: 'Pink', class: 'bg-pink-200 dark:bg-pink-900/30' },
  { value: '#bfdbfe', label: 'Blue', class: 'bg-blue-200 dark:bg-blue-900/30' },
  { value: '#bbf7d0', label: 'Green', class: 'bg-green-200 dark:bg-green-900/30' },
  { value: '#e9d5ff', label: 'Purple', class: 'bg-purple-200 dark:bg-purple-900/30' },
  { value: '#fed7aa', label: 'Orange', class: 'bg-orange-200 dark:bg-orange-900/30' },
]

export function NoteEditorDialog({
  open,
  onOpenChange,
  onSave,
  note,
}: NoteEditorDialogProps) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [color, setColor] = useState('#fef08a')
  const [isSaving, setIsSaving] = useState(false)

  // Reset form when dialog opens or note changes
  useEffect(() => {
    if (note) {
      setTitle(note.title || '')
      setContent(note.content || '')
      setColor(note.color || '#fef08a')
    } else {
      setTitle('')
      setContent('')
      setColor('#fef08a')
    }
  }, [note, open])

  const handleSave = async () => {
    if (isSaving) return

    setIsSaving(true)
    try {
      await onSave({ title, content, color })
      onOpenChange(false)
    } catch (error) {
      console.error('Error saving note:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{note ? 'Edit Note' : 'New Note'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Title */}
          <div className="space-y-2">
            <Input
              placeholder="Title (optional)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              autoFocus={!note}
            />
          </div>

          {/* Content */}
          <div className="space-y-2">
            <Textarea
              placeholder="Write your note here..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={10000}
              rows={8}
              className="resize-none"
            />
            <div className="text-xs text-muted-foreground text-right">
              {content.length.toLocaleString()} / 10,000
            </div>
          </div>

          {/* Color Picker */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Color</label>
            <div className="flex gap-2">
              {NOTE_COLORS.map((colorOption) => (
                <button
                  key={colorOption.value}
                  type="button"
                  onClick={() => setColor(colorOption.value)}
                  className={`
                    h-10 w-10 rounded-md border-2 transition-all
                    ${colorOption.class}
                    ${color === colorOption.value
                      ? 'border-foreground scale-110 shadow-md'
                      : 'border-transparent hover:scale-105'
                    }
                  `}
                  title={colorOption.label}
                  aria-label={`Select ${colorOption.label} color`}
                />
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : note ? 'Save Changes' : 'Create Note'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
