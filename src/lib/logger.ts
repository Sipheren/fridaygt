/**
 * Structured Logging Utility
 *
 * Provides structured logging with automatic PII masking in production.
 * In development, shows full details for debugging.
 * In production, masks sensitive information like emails.
 *
 * @example
 * ```ts
 * import { log } from '@/lib/logger'
 *
 * log({
 *   level: 'info',
 *   message: 'User signed in',
 *   userId: user.id,
 *   email: user.email, // Automatically masked in production
 * })
 * ```
 */

type LogLevel = 'info' | 'warn' | 'error'

interface LogEntry {
  level: LogLevel
  message: string
  userId?: string
  email?: string
  adminId?: string
  [key: string]: any
}

const isProduction = process.env.NODE_ENV === 'production'

/**
 * Main logging function
 * Automatically masks PII in production environments
 */
export function log(entry: LogEntry): void {
  // In production, mask PII
  const safeEntry = isProduction
    ? {
        ...entry,
        email: entry.email ? maskEmail(entry.email) : undefined,
        adminId: entry.adminId ? maskId(entry.adminId) : undefined,
      }
    : entry

  // Use appropriate log level
  const logFn =
    entry.level === 'error'
      ? console.error
      : entry.level === 'warn'
        ? console.warn
        : console.log

  // Output as JSON for structured logging
  logFn(JSON.stringify(safeEntry))
}

/**
 * Mask email address for production logs
 * Shows first character and domain, masks the rest
 *
 * @example
 * maskEmail('david@example.com') // 'd***@e***.com'
 */
export function maskEmail(email: string): string {
  if (!email || typeof email !== 'string') {
    return '***@***'
  }

  const parts = email.split('@')
  if (parts.length !== 2) {
    return '***@***'
  }

  const [local, domain] = parts

  // Mask local part: show first char, rest is ***
  const maskedLocal = local.charAt(0) + '***'

  // Mask domain: show first char of domain name, rest is ***
  const domainParts = domain.split('.')
  if (domainParts.length < 2) {
    return `${maskedLocal}@***`
  }

  const [domainName, ...domainTld] = domainParts
  const maskedDomain = domainName.charAt(0) + '***.' + domainTld.join('.')

  return `${maskedLocal}@${maskedDomain}`
}

/**
 * Mask UUID for production logs
 * Shows first 8 chars, masks the rest
 *
 * @example
 * maskId('550e8400-e29b-41d4-a716-446655440000') // '550e8400***'
 */
export function maskId(id: string): string {
  if (!id || typeof id !== 'string') {
    return '***'
  }

  return id.substring(0, 8) + '***'
}

/**
 * Convenience function for info logs
 */
export function logInfo(message: string, meta: Record<string, any> = {}): void {
  log({ level: 'info', message, ...meta })
}

/**
 * Convenience function for warning logs
 */
export function logWarn(message: string, meta: Record<string, any> = {}): void {
  log({ level: 'warn', message, ...meta })
}

/**
 * Convenience function for error logs
 */
export function logError(message: string, meta: Record<string, any> = {}): void {
  log({ level: 'error', message, ...meta })
}
