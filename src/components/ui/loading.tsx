import { cn } from '@/lib/utils'

interface LoadingProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  text?: string
}

export function Loading({ size = 'md', className, text }: LoadingProps) {
  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-20 h-20',
    lg: 'w-32 h-32',
  }

  return (
    <div className={cn('flex flex-col items-center justify-center gap-4', className)}>
      <div className="relative overflow-visible">
        {/* Smoke effect */}
        <div className="absolute inset-0 flex items-center justify-center overflow-visible">
          <div className="smoke-particle smoke-1"></div>
          <div className="smoke-particle smoke-2"></div>
          <div className="smoke-particle smoke-3"></div>
        </div>

        {/* Spinning tire/wheel */}
        <div className={cn('relative aspect-square overflow-visible', sizeClasses[size])}>
          <svg
            viewBox="-5 -5 110 110"
            className="tire-spin w-full h-full overflow-visible"
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Outer tire - thicker black rubber */}
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="#1a1a1a"
              strokeWidth="14"
            />

            {/* Dunlop branding on tire */}
            <text
              x="50"
              y="8"
              textAnchor="middle"
              fontSize="5"
              fontWeight="bold"
              fill="#ffffff"
              className="tracking-wider"
            >
              DUNLOP
            </text>
            <text
              x="50"
              y="92"
              textAnchor="middle"
              fontSize="5"
              fontWeight="bold"
              fill="#ffffff"
              className="tracking-wider"
            >
              DUNLOP
            </text>

            {/* Outer rim edge */}
            <circle
              cx="50"
              cy="50"
              r="35"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-muted-foreground opacity-50"
            />

            {/* Racing spokes - 10 thin spokes */}
            {[0, 36, 72, 108, 144, 180, 216, 252, 288, 324].map((angle) => (
              <g key={angle} transform={`rotate(${angle} 50 50)`}>
                {/* Main spoke */}
                <line
                  x1="50"
                  y1="18"
                  x2="50"
                  y2="35"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="text-primary"
                />
                {/* Spoke branches for Y-shape */}
                <line
                  x1="50"
                  y1="25"
                  x2="47"
                  y2="32"
                  stroke="currentColor"
                  strokeWidth="1"
                  className="text-primary"
                />
                <line
                  x1="50"
                  y1="25"
                  x2="53"
                  y2="32"
                  stroke="currentColor"
                  strokeWidth="1"
                  className="text-primary"
                />
              </g>
            ))}

            {/* Center hub */}
            <circle
              cx="50"
              cy="50"
              r="16"
              fill="currentColor"
              className="text-card"
              stroke="currentColor"
              strokeWidth="2"
            />

            {/* Hub detail ring */}
            <circle
              cx="50"
              cy="50"
              r="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              className="text-primary"
            />

            {/* Hub bolt pattern - 5 lug */}
            {[0, 72, 144, 216, 288].map((angle) => (
              <circle
                key={angle}
                cx="50"
                cy="40"
                r="2"
                fill="currentColor"
                className="text-muted-foreground"
                transform={`rotate(${angle} 50 50)`}
              />
            ))}

            {/* Center cap */}
            <circle
              cx="50"
              cy="50"
              r="6"
              fill="currentColor"
              className="text-primary"
            />
          </svg>
        </div>
      </div>

      {/* Loading text */}
      {text && (
        <p className="text-sm font-medium text-muted-foreground animate-pulse">
          {text}
        </p>
      )}
    </div>
  )
}

// Full page loading overlay
export function LoadingOverlay({ text }: { text?: string }) {
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
      <Loading size="lg" text={text} />
    </div>
  )
}

// Inline loading for sections
export function LoadingSection({ text, className }: { text?: string; className?: string }) {
  return (
    <div className={cn('flex items-center justify-center py-12', className)}>
      <Loading size="md" text={text} />
    </div>
  )
}
