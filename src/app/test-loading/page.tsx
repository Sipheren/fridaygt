'use client'

import { Loading, LoadingSection, LoadingOverlay } from '@/components/ui/loading'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

export default function TestLoadingPage() {
  const [showOverlay, setShowOverlay] = useState(false)

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-12">
      <div className="absolute inset-x-0 top-16 h-0.5 bg-primary"></div>

      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          LOADING ANIMATION TEST
        </h1>
        <p className="text-muted-foreground">
          GT7-inspired racing wheel with burnout smoke effect
        </p>
      </div>

      {/* Different sizes */}
      <div className="space-y-8">
        <div>
          <h2 className="text-xl font-bold mb-4">Small Size</h2>
          <div className="border border-border rounded-lg p-8 bg-card">
            <Loading size="sm" text="Loading..." />
          </div>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-4">Medium Size (Default)</h2>
          <div className="border border-border rounded-lg p-8 bg-card">
            <Loading size="md" text="Loading cars..." />
          </div>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-4">Large Size</h2>
          <div className="border border-border rounded-lg p-8 bg-card">
            <Loading size="lg" text="Loading build data..." />
          </div>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-4">Loading Section</h2>
          <div className="border border-border rounded-lg bg-card">
            <LoadingSection text="Fetching lap times..." />
          </div>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-4">Loading Overlay (Modal)</h2>
          <Button onClick={() => setShowOverlay(true)}>
            Show Loading Overlay
          </Button>
          {showOverlay && (
            <LoadingOverlay text="Saving your build..." />
          )}
          {showOverlay && (
            <button
              onClick={() => setShowOverlay(false)}
              className="fixed top-4 right-4 z-[60] text-white bg-primary px-4 py-2 rounded"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
