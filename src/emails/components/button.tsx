import { Button as EmailButton } from '@react-email/components'
import { colors, fonts, spacing, borderRadius } from '../constants'

interface ButtonProps {
  href: string
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'destructive'
}

export function Button({ href, children, variant = 'primary' }: ButtonProps) {
  const styles = {
    primary: {
      backgroundColor: colors.primary,
      color: '#FFFFFF',
      border: 'none',
    },
    secondary: {
      backgroundColor: 'transparent',
      color: colors.primary,
      border: `1px solid ${colors.primary}`,
    },
    destructive: {
      backgroundColor: colors.destructive,
      color: '#FFFFFF',
      border: 'none',
    },
  }

  const style = styles[variant]

  return (
    <EmailButton
      href={href}
      style={{
        ...style,
        display: 'inline-block',
        padding: `${spacing.sm} ${spacing.lg}`,
        borderRadius: borderRadius.md,
        fontFamily: fonts.sans,
        fontSize: '14px',
        fontWeight: '600',
        textDecoration: 'none',
        textAlign: 'center',
        width: '100%',
      }}
    >
      {children}
    </EmailButton>
  )
}
