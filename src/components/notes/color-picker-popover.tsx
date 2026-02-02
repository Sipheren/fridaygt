/**
 * ColorPickerPopover Component
 *
 * Popover wrapper for ColorWheel with smart positioning.
 * Desktop: Positions next to the palette icon button
 * Mobile: Half-screen overlay with wheel centered
 */

import { useRef, useEffect } from 'react'
import { ColorWheel } from './color-wheel'

export interface ColorPickerPopoverProps {
  isOpen: boolean
  onClose: () => void
  onColorSelect: (color: string) => void
  triggerRef: () => { current: HTMLElement | null }
}

export function ColorPickerPopover({
  isOpen,
  onClose,
  onColorSelect,
  triggerRef,
}: ColorPickerPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null)

  // Detect mobile
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768

  // Calculate position
  useEffect(() => {
    const trigger = triggerRef()
    if (!isOpen || !trigger?.current || !popoverRef.current) return

    const button = trigger.current
    const popover = popoverRef.current

    // Double-check refs haven't become null
    if (!button || !popover) return

    const buttonRect = button.getBoundingClientRect()

    if (isMobile) {
      // Mobile: Half-screen overlay, centered
      // We use fixed positioning to cover half the screen
      Object.assign(popover.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        right: isMobile ? '50%' : 'auto',
        bottom: '0',
        width: isMobile ? '50vw' : 'auto',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: '100',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(2px)',
      })
    } else {
      // Desktop: Position next to button
      const popoverRect = popover.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight

      // Position to the right of the button
      let left = buttonRect.right + 12

      // If would overflow right, show to the left
      if (left + popoverRect.width > viewportWidth - 20) {
        left = buttonRect.left - popoverRect.width - 12
      }

      // Vertical alignment - center with button
      let top = buttonRect.top + (buttonRect.height / 2) - (popoverRect.height / 2)

      // Keep within viewport bounds
      if (top < 20) top = 20
      if (top + popoverRect.height > viewportHeight - 20) {
        top = viewportHeight - 20 - popoverRect.height
      }

      Object.assign(popover.style, {
        position: 'fixed',
        top: `${top}px`,
        left: `${left}px`,
        zIndex: '100',
      })
    }
  }, [isOpen, triggerRef, isMobile])

  // Handle backdrop click (desktop only)
  useEffect(() => {
    if (!isOpen) return

    const handleBackdropClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        // Only close on backdrop click for desktop (not mobile - mobile has backdrop)
        if (!isMobile) {
          onClose()
        }
      }
    }

    document.addEventListener('mousedown', handleBackdropClick)
    return () => document.removeEventListener('mousedown', handleBackdropClick)
  }, [isOpen, onClose, isMobile])

  // Handle resize/scroll
  useEffect(() => {
    if (!isOpen) return

    const handleClose = () => onClose()
    window.addEventListener('scroll', handleClose, true)
    window.addEventListener('resize', handleClose)

    return () => {
      window.removeEventListener('scroll', handleClose, true)
      window.removeEventListener('resize', handleClose)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      ref={popoverRef}
      className={isMobile ? 'p-8' : ''}
      onClick={(e) => e.stopPropagation()}
    >
      <ColorWheel
        onColorSelect={(color) => {
          onColorSelect(color)
          onClose()
        }}
        onClose={onClose}
        isMobile={isMobile}
      />
    </div>
  )
}
