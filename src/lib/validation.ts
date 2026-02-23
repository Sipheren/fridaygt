/**
 * Zod Validation Schemas
 *
 * This file contains all Zod schemas for validating API request bodies.
 * Schemas are organized by entity type (Build, Race, LapTime, User, etc.)
 *
 * Debugging Tips:
 * - .transform() runs before validation, modifying input values
 * - .trim() removes leading/trailing whitespace from strings
 * - .optional() = field can be undefined, .nullable() = field can be null
 * - .optional().nullable() = field can be undefined OR null
 * - Use validateBody() helper in API routes for consistent error handling
 */

import { z } from 'zod'

// ============================================
// Build Schemas
// ============================================

export const CreateBuildSchema = z.object({
  carId: z.string().min(1, 'Car ID is required'),
  name: z.string().min(1, 'Build name is required').max(100, 'Build name must be less than 100 characters').transform(val => val.trim()),
  description: z.string().max(500, 'Description must be less than 500 characters').transform(val => val.trim()).optional().nullable(),
  isPublic: z.boolean().optional(),
  userId: z.string().optional().nullable(), // Creator user ID (admins only)
  upgrades: z.array(z.object({
    partId: z.string().optional(),
    category: z.string().optional(),
    part: z.string().optional(),
    value: z.string().optional().nullable(), // nullable for dropdown parts (GT Auto, Custom Parts)
  })).optional(),
  settings: z.array(z.object({
    settingId: z.string().optional(),
    category: z.string().optional(),
    setting: z.string().optional(),
    value: z.string().optional(),
  })).optional(),
  // Gear ratios as direct build fields
  finalDrive: z.string().optional(),
  gear1: z.string().optional(),
  gear2: z.string().optional(),
  gear3: z.string().optional(),
  gear4: z.string().optional(),
  gear5: z.string().optional(),
  gear6: z.string().optional(),
  gear7: z.string().optional(),
  gear8: z.string().optional(),
  gear9: z.string().optional(),
  gear10: z.string().optional(),
  gear11: z.string().optional(),
  gear12: z.string().optional(),
  gear13: z.string().optional(),
  gear14: z.string().optional(),
  gear15: z.string().optional(),
  gear16: z.string().optional(),
  gear17: z.string().optional(),
  gear18: z.string().optional(),
  gear19: z.string().optional(),
  gear20: z.string().optional(),
})

export const QuickBuildSchema = z.object({
  carId: z.string().min(1, 'Car ID is required'),
  name: z.string().min(1, 'Build name is required').max(100, 'Build name must be less than 100 characters').transform(val => val.trim()),
  description: z.string().max(500, 'Description must be less than 500 characters').transform(val => val.trim()).optional().nullable(),
  // Gear ratios as direct build fields
  finalDrive: z.string().optional(),
  gear1: z.string().optional(),
  gear2: z.string().optional(),
  gear3: z.string().optional(),
  gear4: z.string().optional(),
  gear5: z.string().optional(),
  gear6: z.string().optional(),
  gear7: z.string().optional(),
  gear8: z.string().optional(),
  gear9: z.string().optional(),
  gear10: z.string().optional(),
  gear11: z.string().optional(),
  gear12: z.string().optional(),
  gear13: z.string().optional(),
  gear14: z.string().optional(),
  gear15: z.string().optional(),
  gear16: z.string().optional(),
  gear17: z.string().optional(),
  gear18: z.string().optional(),
  gear19: z.string().optional(),
  gear20: z.string().optional(),
})

export const UpdateBuildSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters').transform(val => val.trim()).optional(),
  description: z.string().max(500, 'Description must be less than 500 characters').transform(val => val.trim()).optional().nullable(),
  isPublic: z.boolean().optional(),
  userId: z.string().optional().nullable(), // Creator user ID (admins only)
  upgrades: z.array(z.object({
    partId: z.string().optional(),
    category: z.string().optional(),
    part: z.string().optional(),
    value: z.string().optional().nullable(), // nullable for dropdown parts (GT Auto, Custom Parts)
  })).optional(),
  settings: z.array(z.object({
    settingId: z.string().optional(),
    category: z.string().optional(),
    setting: z.string().optional(),
    value: z.string().optional(),
  })).optional(),
  // Gear ratios as direct build fields
  finalDrive: z.string().optional(),
  gear1: z.string().optional(),
  gear2: z.string().optional(),
  gear3: z.string().optional(),
  gear4: z.string().optional(),
  gear5: z.string().optional(),
  gear6: z.string().optional(),
  gear7: z.string().optional(),
  gear8: z.string().optional(),
  gear9: z.string().optional(),
  gear10: z.string().optional(),
  gear11: z.string().optional(),
  gear12: z.string().optional(),
  gear13: z.string().optional(),
  gear14: z.string().optional(),
  gear15: z.string().optional(),
  gear16: z.string().optional(),
  gear17: z.string().optional(),
  gear18: z.string().optional(),
  gear19: z.string().optional(),
  gear20: z.string().optional(),
}).strict()

// ============================================
// Race Schemas
// ============================================

export const CreateRaceSchema = z.object({
  name: z.string().min(1, 'Race name is required').max(100, 'Race name must be less than 100 characters').transform(val => val?.trim?.() || val).optional().nullable(),
  description: z.string().max(500, 'Description must be less than 500 characters').transform(val => val?.trim?.() || val).optional().nullable(),
  trackId: z.string().uuid('Invalid track ID'),
  buildIds: z.array(z.string().min(1, 'Invalid build ID')).min(1, 'At least one build is required'),
  laps: z.number().int().positive('Laps must be a positive integer').optional(),
  weather: z.enum(['dry', 'wet']).optional(),
  isActive: z.boolean().optional(),
})

export const UpdateRaceSchema = z.object({
  name: z.string().min(1).max(100).transform(val => val?.trim?.() || val).optional().nullable(),
  description: z.string().max(500).transform(val => val?.trim?.() || val).optional().nullable(),
  laps: z.number().int().positive().optional(),
  weather: z.enum(['dry', 'wet']).optional(),
  isActive: z.boolean().optional(),
  order: z.number().int().positive().optional(),
  buildIds: z.array(z.string().min(1)).min(1).optional(),
}).strict()

// ============================================
// Lap Time Schemas
// ============================================

export const CreateLapTimeSchema = z.object({
  carId: z.string().uuid('Invalid car ID'),
  trackId: z.string().uuid('Invalid track ID'),
  buildId: z.string().min(1, 'Invalid build ID').optional().nullable(),
  timeMs: z.number()
    .int('Time must be an integer')
    .positive('Time must be a positive number')
    .min(10000, 'Lap time must be at least 10 seconds')
    .max(1800000, 'Lap time must be at most 30 minutes'),
  notes: z.string().max(500, 'Notes must be less than 500 characters').optional().nullable(),
  conditions: z.string().max(200, 'Conditions must be less than 200 characters').optional().nullable(),
  sessionType: z.enum(['Q', 'R']).optional(),
  buildName: z.string().optional().nullable(),
})

// ============================================
// User Profile Schemas
// ============================================

export const UpdateUserProfileSchema = z.object({
  gamertag: z.string()
    .min(3, 'Gamertag must be at least 3 characters')
    .max(20, 'Gamertag must be 20 characters or less')
    .regex(/^[a-zA-Z0-9_\-\s]+$/, 'Gamertag can only contain letters, numbers, spaces, hyphens, and underscores')
    .transform(val => val.trim()) // Trim whitespace from start/end
    .refine(val => val.length > 0, 'Gamertag cannot be empty or only whitespace')
    .optional()
    .nullable(),
  name: z.string()
    .max(100, 'Name must be less than 100 characters')
    .transform(val => val.trim())
    .optional()
    .nullable(),
}).strict()

// ============================================
// Notes Schemas
// ============================================

export const CreateNoteSchema = z.object({
  title: z.string().max(200, 'Title must be less than 200 characters').transform(val => val.trim()).optional(),
  content: z.string().max(10000, 'Content must be less than 10,000 characters').transform(val => val.trim()).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color code').default('#fef08a'),
  positionX: z.number().int().optional().default(0),
  positionY: z.number().int().optional().default(0),
})

export const UpdateNoteSchema = z.object({
  title: z.string().max(200, 'Title must be less than 200 characters').transform(val => val.trim()).optional(),
  content: z.string().max(10000, 'Content must be less than 10,000 characters').transform(val => val.trim()).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color code').optional(),
  positionX: z.number().int().optional(),
  positionY: z.number().int().optional(),
  pinned: z.boolean().optional(),
  tags: z.array(z.string().max(50, 'Tag must be less than 50 characters')).max(10, 'Maximum 10 tags allowed').optional(),
}).strict()

export const VoteNoteSchema = z.object({
  voteType: z.enum(['up', 'down']),
})

// ============================================
// Admin User Schemas
// ============================================

export const UpdateUserRoleSchema = z.object({
  role: z.enum(['PENDING', 'USER', 'ADMIN']),
})

// ============================================
// Validation Error Helpers
// ============================================

function formatValidationError(error: z.ZodError): string {
  const issues = error.issues.map((issue) => {
    const path = issue.path.join('.')
    const message = issue.message
    return path ? `${path}: ${message}` : message
  })
  return issues.join('. ')
}

export type ValidationResult<T> = { success: true; data: T } | { success: false; error: string }

export async function validateBody<T>(schema: z.ZodSchema<T>, body: unknown): Promise<ValidationResult<T>> {
  try {
    const data = await schema.parseAsync(body)
    return { success: true, data }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: formatValidationError(error) }
    }
    return { success: false, error: 'Validation failed' }
  }
}
