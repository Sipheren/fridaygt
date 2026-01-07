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
