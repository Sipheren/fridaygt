/**
 * Convert milliseconds to formatted lap time string (mm:ss.sss)
 * @param ms - Time in milliseconds
 * @returns Formatted time string (e.g., "1:23.456")
 */
export function formatLapTime(ms: number): string {
  const totalSeconds = ms / 1000
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = Math.floor(totalSeconds % 60)
  const milliseconds = Math.floor((ms % 1000))

  return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`
}

/**
 * Parse lap time string (mm:ss.sss or ss.sss) to milliseconds
 * @param timeStr - Time string in format "1:23.456" or "23.456"
 * @returns Time in milliseconds, or null if invalid
 */
export function parseLapTime(timeStr: string): number | null {
  const trimmed = timeStr.trim()

  // Match formats: "1:23.456", "1:23.45", "1:23", "23.456", "23.45", "23"
  const match = trimmed.match(/^(?:(\d+):)?(\d+)(?:\.(\d{1,3}))?$/)

  if (!match) {
    return null
  }

  const minutes = match[1] ? parseInt(match[1], 10) : 0
  const seconds = parseInt(match[2], 10)
  const milliseconds = match[3] ? parseInt(match[3].padEnd(3, '0'), 10) : 0

  // Validate ranges
  if (seconds >= 60) {
    return null
  }

  return (minutes * 60 * 1000) + (seconds * 1000) + milliseconds
}

/**
 * Get difference between two lap times in milliseconds
 * @param timeMs1 - First time in milliseconds
 * @param timeMs2 - Second time in milliseconds
 * @returns Formatted difference with + or - prefix (e.g., "+0.123" or "-1.456")
 */
export function getTimeDifference(timeMs1: number, timeMs2: number): string {
  const diff = timeMs1 - timeMs2
  const absDiff = Math.abs(diff)
  const seconds = (absDiff / 1000).toFixed(3)

  if (diff === 0) {
    return '0.000'
  }

  return diff > 0 ? `+${seconds}` : `-${seconds}`
}

/**
 * Validate if a time in milliseconds is reasonable for a lap time
 * @param ms - Time in milliseconds
 * @returns True if valid, false otherwise
 */
export function isValidLapTime(ms: number): boolean {
  // Between 10 seconds and 30 minutes
  return ms >= 10000 && ms <= 1800000
}

/**
 * Format a date string to a localized date format
 * @param dateString - ISO date string
 * @returns Formatted date string (e.g., "Jan 15, 2025")
 */
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}
