"use client"

import { useState } from 'react'
import { lightenHex } from '@/lib/utils'

// Maps stored note hex → { bg: light mode, primary: dark mode Tailwind-600 }
const NOTE_COLOR_MAP: Record<string, { bg: string; primary: string }> = {
  '#fef08a': { bg: '#fef08a', primary: '#ca8a04' },
  '#fbcfe8': { bg: '#fbcfe8', primary: '#db2777' },
  '#bfdbfe': { bg: '#bfdbfe', primary: '#2563eb' },
  '#bbf7d0': { bg: '#bbf7d0', primary: '#16a34a' },
  '#e9d5ff': { bg: '#e9d5ff', primary: '#9333ea' },
  '#fed7aa': { bg: '#fed7aa', primary: '#ea580c' },
}

const ALT_BLUE = '#6776b5'

const STROKE_STYLE = {
  strokeMiterlimit: 10,
  strokeWidth: '9.7px',
}

interface SvgColors {
  bg: string
  stroke: string
  thumb: string
}

function ThumbUpSvg({ colors, size }: { colors: SvgColors; size: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 250 250"
      width={size}
      height={size}
      style={{ display: 'block', flexShrink: 0 }}
    >
      {/* Background rectangle */}
      <path
        style={{ fill: colors.bg, stroke: colors.stroke, ...STROKE_STYLE }}
        d="M245.4,52v146.1s-165.5,0-165.5,0c-16.1,0-29.2-13.1-29.2-29.2v-87.6c0-16.1,13.1-29.2,29.2-29.2h165.5Z"
      />
      {/* Thumb icon */}
      <path
        style={{ fill: colors.thumb }}
        d="M189.4,142.7c4.8,9.6-3.6,12.9-3.4,14.1s.2.9.5,1.7c1.8,4.7-1.5,11.8-7.2,12.2-9.2.7-18.1.4-27.3.2-8.8-.2-17.2-1.9-25.5-4.9v-48.8s7.6-6.7,7.6-6.7c5-4.4,8.2-9.7,10.3-16,1.1-3.4,2.5-6.6,3.8-9.9,1.1-2.9,3.5-5,6.2-5.4,15.2-2,8.5,23.6,7.1,32.2h21c3.4.2,5.9,2.9,7.2,4.9,2.2,3.4.9,6.9,0,10,2.1,2.6,5.1,5.4,4.2,9.3-.6,2.7-2.4,5.1-4.4,7.2Z"
      />
      <path
        style={{ fill: colors.thumb }}
        d="M104.7,164.8c-1.6,0-2.6-1.4-2.7-2.7v-39.9c0-1.7,1.1-2.9,2.8-2.9h16.3s0,45.5,0,45.5h-16.4Z"
      />
    </svg>
  )
}

function ThumbDownSvg({ colors, size }: { colors: SvgColors; size: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 250 250"
      width={size}
      height={size}
      style={{ display: 'block', flexShrink: 0 }}
    >
      {/* Background rectangle */}
      <path
        style={{ fill: colors.bg, stroke: colors.stroke, ...STROKE_STYLE }}
        d="M4.9,198V52h165.5c16.1,0,29.2,13.1,29.2,29.2v87.6c0,16.1-13.1,29.2-29.2,29.2H4.9Z"
      />
      {/* Thumb icon */}
      <path
        style={{ fill: colors.thumb }}
        d="M60.8,107.3c-4.8-9.6,3.6-12.9,3.4-14.1s-.2-.9-.5-1.7c-1.8-4.7,1.5-11.8,7.2-12.2,9.2-.7,18.1-.4,27.3-.2,8.8.2,17.2,1.9,25.5,4.9v48.8s-7.6,6.7-7.6,6.7c-5,4.4-8.2,9.7-10.3,16-1.1,3.4-2.5,6.6-3.8,9.9-1.1,2.9-3.5,5-6.2,5.4-15.2,2-8.5-23.6-7.1-32.2h-21c-3.4-.2-5.9-2.9-7.2-4.9-2.2-3.4-.9-6.9,0-10-2.1-2.6-5.1-5.4-4.2-9.3.6-2.7,2.4-5.1,4.4-7.2Z"
      />
      <path
        style={{ fill: colors.thumb }}
        d="M145.6,85.2c1.6,0,2.6,1.4,2.7,2.7v39.9c0,1.7-1.1,2.9-2.8,2.9h-16.3s0-45.5,0-45.5h16.4Z"
      />
    </svg>
  )
}

function getColors(
  noteColor: string,
  type: 'up' | 'down',
  userVote: 'up' | 'down' | null,
  hovering: boolean
): SvgColors {
  const map = NOTE_COLOR_MAP[noteColor] ?? { bg: '#fef08a', primary: '#ca8a04' }
  const { bg, primary } = map
  const isActive = userVote === type
  const isDeactive = userVote !== null && userVote !== type

  if (isActive) {
    // Hovering over an already-selected button — brighten both bg and thumb slightly
    if (hovering) {
      return { bg: lightenHex(primary, 0.2), stroke: primary, thumb: lightenHex(bg, 0.15) }
    }
    return { bg: primary, stroke: primary, thumb: bg }
  }
  if (isDeactive) {
    return { bg, stroke: ALT_BLUE, thumb: ALT_BLUE }
  }
  if (hovering) {
    return { bg: ALT_BLUE, stroke: primary, thumb: primary }
  }
  // Normal
  return { bg, stroke: primary, thumb: primary }
}

interface ThumbsRatingProps {
  noteColor: string
  upCount: number
  downCount: number
  userVote: 'up' | 'down' | null
  onVote: (type: 'up' | 'down') => void
  disabled?: boolean
}

const THUMB_SIZE = 38

export function ThumbsRating({
  noteColor,
  upCount,
  downCount,
  userVote,
  onVote,
  disabled = false,
}: ThumbsRatingProps) {
  const [hoverUp, setHoverUp] = useState(false)
  const [hoverDown, setHoverDown] = useState(false)

  const handleUp = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (disabled || userVote === 'up') return
    onVote('up')
  }

  const handleDown = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (disabled || userVote === 'down') return
    onVote('down')
  }

  const upColors = getColors(noteColor, 'up', userVote, hoverUp)
  const downColors = getColors(noteColor, 'down', userVote, hoverDown)

  return (
    <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
      {/* Thumbs Up */}
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <button
          onClick={handleUp}
          onMouseEnter={() => setHoverUp(true)}
          onMouseLeave={() => setHoverUp(false)}
          title={`${upCount} thumbs up`}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: disabled || userVote === 'up' ? 'default' : 'pointer',
            display: 'block',
            lineHeight: 0,
          }}
        >
          <ThumbUpSvg colors={upColors} size={THUMB_SIZE} />
        </button>
        {upCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '3px',
            right: '4px',
            fontSize: '9px',
            fontWeight: 700,
            lineHeight: 1,
            color: 'white',
            pointerEvents: 'none',
          }}>
            {upCount}
          </span>
        )}
      </div>

      {/* Thumbs Down */}
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <button
          onClick={handleDown}
          onMouseEnter={() => setHoverDown(true)}
          onMouseLeave={() => setHoverDown(false)}
          title={`${downCount} thumbs down`}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: disabled || userVote === 'down' ? 'default' : 'pointer',
            display: 'block',
            lineHeight: 0,
          }}
        >
          <ThumbDownSvg colors={downColors} size={THUMB_SIZE} />
        </button>
        {downCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '3px',
            right: '4px',
            fontSize: '9px',
            fontWeight: 700,
            lineHeight: 1,
            color: 'white',
            pointerEvents: 'none',
          }}>
            {downCount}
          </span>
        )}
      </div>
    </div>
  )
}
