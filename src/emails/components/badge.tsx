import { Text } from '@react-email/components'
import { colors, fonts, borderRadius } from '../constants'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'success' | 'destructive' | 'warning' | 'muted'
}

export function Badge({ children, variant = 'muted' }: BadgeProps) {
  const styles = {
    success: {
      backgroundColor: `${colors.success}15`,
      color: colors.success,
      border: `1px solid ${colors.success}30`,
    },
    destructive: {
      backgroundColor: `${colors.destructive}15`,
      color: colors.destructive,
      border: `1px solid ${colors.destructive}30`,
    },
    warning: {
      backgroundColor: `${colors.warning}15`,
      color: colors.warning,
      border: `1px solid ${colors.warning}30`,
    },
    muted: {
      backgroundColor: `${colors.muted}15`,
      color: colors.muted,
      border: `1px solid ${colors.muted}30`,
    },
  }

  const style = styles[variant]

  return (
    <Text
      style={{
        ...style,
        display: 'inline-block',
        padding: '4px 12px',
        borderRadius: borderRadius.md,
        fontSize: '13px',
        fontWeight: '600',
        fontFamily: fonts.sans,
        margin: 0,
      }}
    >
      {children}
    </Text>
  )
}
