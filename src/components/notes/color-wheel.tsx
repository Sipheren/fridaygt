/**
 * ColorWheel Component
 *
 * Custom 6-color radial gradient picker for note colors.
 * Click anywhere on the wheel to select the nearest color.
 *
 * Colors (clockwise from top):
 * - Yellow (#fef08a)
 * - Pink (#fbcfe8)
 * - Blue (#bfdbfe)
 * - Green (#bbf7d0)
 * - Purple (#e9d5ff)
 * - Orange (#fed7aa)
 */

import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'

export interface ColorWheelProps {
  onColorSelect: (color: string) => void
  onClose?: () => void
  className?: string
  isMobile?: boolean
}

const NOTE_COLORS = [
  { hex: '#fef08a', label: 'Yellow' },
  { hex: '#fbcfe8', label: 'Pink' },
  { hex: '#bfdbfe', label: 'Blue' },
  { hex: '#bbf7d0', label: 'Green' },
  { hex: '#e9d5ff', label: 'Purple' },
  { hex: '#fed7aa', label: 'Orange' },
]

export function ColorWheel({ onColorSelect, onClose, className, isMobile = false }: ColorWheelProps) {
  const [hoveredColor, setHoveredColor] = useState<string | null>(null)
  const wheelRef = useRef<HTMLDivElement>(null)

  // Calculate color from click position
  const getColorFromPosition = (clientX: number, clientY: number): string => {
    if (!wheelRef.current) return NOTE_COLORS[0].hex

    const rect = wheelRef.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2

    // Calculate angle (in degrees)
    const dx = clientX - centerX
    const dy = clientY - centerY
    let angle = Math.atan2(dy, dx) * (180 / Math.PI)

    // Normalize to 0-360, rotate so yellow starts at top
    angle = angle + 90
    if (angle < 0) angle += 360
    if (angle >= 360) angle -= 360

    // Each color segment is 60 degrees
    const segmentIndex = Math.floor(angle / 60) % 6
    return NOTE_COLORS[segmentIndex].hex
  }

  // Handle click/tap
  const handleClick = (e: React.MouseEvent | ReactTouchEvent) => {
    e.stopPropagation()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY

    const color = getColorFromPosition(clientX, clientY)
    onColorSelect(color)
  }

  // Handle hover for preview
  const handleMouseMove = (e: React.MouseEvent) => {
    const color = getColorFromPosition(e.clientX, e.clientY)
    setHoveredColor(color)
  }

  // Handle mouse leave
  const handleMouseLeave = () => {
    setHoveredColor(null)
  }

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose?.()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])

  return (
    <div
      className={cn(
        'relative inline-block',
        className
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Color Wheel */}
      <div
        ref={wheelRef}
        className={cn(
          'rounded-full cursor-pointer transition-transform duration-200',
          'hover:scale-105 active:scale-95',
          // Size: 144px diameter (36x36)
          'w-36 h-36',
          // Smooth shadow
          'shadow-lg',
        )}
        style={{
          background: `conic-gradient(
            from 0deg,
            #fef08a 0deg 60deg,
            #fbcfe8 60deg 120deg,
            #bfdbfe 120deg 180deg,
            #bbf7d0 180deg 240deg,
            #e9d5ff 240deg 300deg,
            #fed7aa 300deg 360deg
          )`,
          boxShadow: hoveredColor
            ? `0 0 0 4px ${hoveredColor}, 0 0 0 8px rgba(0,0,0,0.1), 0 8px 16px rgba(0,0,0,0.2)`
            : '0 4px 12px rgba(0,0,0,0.15)',
        }}
        onClick={handleClick}
        onTouchStart={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        role="button"
        tabIndex={0}
        aria-label="Select note color"
      >
        {/* Center white circle with preview */}
        <div className="absolute inset-0 m-auto w-16 h-16 bg-background rounded-full shadow-inner flex items-center justify-center">
          {hoveredColor && (
            <div
              className="w-12 h-12 rounded-full shadow-lg transition-all duration-200"
              style={{ backgroundColor: hoveredColor }}
            />
          )}
          {!hoveredColor && (
            <span className="text-xs text-muted-foreground text-center px-2">
              Pick
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
