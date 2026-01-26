/**
 * CREATE NEW LAP TIME PAGE
 *
 * Purpose:
 * Simple page wrapper for the LapTimeForm component to create new lap time records.
 * Displays a page header with icon and contains the form within a styled card.
 *
 * Key Features:
 * - Page header with clock icon and title
 * - Form card with consistent styling
 * - Routes to /lap-times/new
 *
 * Layout Structure:
 * - Top border indicator line (primary color)
 * - Header section with icon and title
 * - Form card container with border and background
 *
 * Data Flow:
 * - This page is a presentational wrapper only
 * - All form logic is handled in the LapTimeForm component
 * - Form submission handled by LapTimeForm's API integration
 *
 * API Integration:
 * - Handled entirely by LapTimeForm component
 * - POST /api/lap-times to create new lap time
 *
 * Styling:
 * - Max width container (max-w-2xl) for readability
 * - Centered layout with padding
 * - Primary color top border for visual hierarchy
 * - Card component for form container
 *
 * Common Issues:
 * - None - this is a simple wrapper component
 *
 * Related Files:
 * - @/components/lap-times/LapTimeForm: Main form component
 * - /api/lap-times/route.ts: Create lap time API endpoint
 * - /lap-times/page.tsx: Lap times listing page
 * - @/components/ui/card: Card UI components
 */

import { LapTimeForm } from '@/components/lap-times/LapTimeForm'
import { Clock } from 'lucide-react'

export default function NewLapTimePage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      <div className="absolute inset-x-0 top-16 h-0.5 bg-primary"></div>

      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Clock className="h-8 w-8 text-primary" />
          ADD LAP TIME
        </h1>
        <p className="text-muted-foreground mt-1">
          Record a new lap time for your racing records
        </p>
      </div>

      <div className="border border-border rounded-lg p-6 bg-card">
        <LapTimeForm />
      </div>
    </div>
  )
}
