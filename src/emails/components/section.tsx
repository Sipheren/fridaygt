import { Section, Text } from '@react-email/components'
import { spacing } from '../constants'

interface EmailSectionProps {
  children: React.ReactNode
}

export function EmailSection({ children }: EmailSectionProps) {
  return (
    <Section
      style={{
        marginTop: spacing.md,
        marginBottom: spacing.md,
      }}
    >
      {children}
    </Section>
  )
}
