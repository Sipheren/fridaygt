// Design system constants for email templates
// Matching FridayGT design guide

export const colors = {
  primary: '#3B82F6',      // Blue accent
  primaryLight: '#60A5FA', // Lighter blue for hover states
  background: '#09090B',   // Dark background
  foreground: '#FAFAFA',   // Light text
  muted: '#71717A',        // Secondary text
  border: '#27272A',       // Subtle borders
  destructive: '#EF4444',  // Red/pink for errors
  success: '#10B981',      // Green for success
  warning: '#F59E0B',      // Orange/yellow for warnings
} as const

export const fonts = {
  sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  mono: '"SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace',
} as const

export const spacing = {
  xs: '8px',
  sm: '12px',
  md: '16px',
  lg: '24px',
  xl: '32px',
} as const

export const borderRadius = {
  sm: '4px',
  md: '8px',
  lg: '12px',
} as const

export const layout = {
  maxWidth: '600px', // Standard email max-width
  contentWidth: '100%',
} as const
