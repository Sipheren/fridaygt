import { Section, Text } from '@react-email/components'
import { colors, fonts, spacing, borderRadius } from '../constants'

interface CardProps {
  title?: string
  titleColor?: keyof typeof colors
  children: React.ReactNode
}

export function Card({ title, titleColor = 'primary', children }: CardProps) {
  const headerColor = colors[titleColor]

  return (
    <Section
      style={{
        backgroundColor: '#111111',
        border: `1px solid ${colors.border}`,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginTop: spacing.sm,
        marginBottom: spacing.sm,
      }}
    >
      {title && (
        <Text
          style={{
            color: headerColor,
            fontSize: '16px',
            fontWeight: '600',
            fontFamily: fonts.sans,
            margin: `0 0 ${spacing.md} 0`,
            paddingBottom: spacing.sm,
            borderBottom: `1px solid ${colors.border}`,
          }}
        >
          {title}
        </Text>
      )}

      {children}
    </Section>
  )
}
