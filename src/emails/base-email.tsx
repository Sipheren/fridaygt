import { Container, Html, Text, Body, Head, Heading, Preview, Section } from '@react-email/components'
import { colors, fonts, spacing, layout } from './constants'

interface BaseEmailProps {
  previewText: string
  heading: string
  children: React.ReactNode
}

export function BaseEmail({ previewText, heading, children }: BaseEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body
        style={{
          backgroundColor: colors.background,
          fontFamily: fonts.sans,
          color: colors.foreground,
          margin: 0,
          padding: `${spacing.sm} 0`,
        }}
      >
        <Container
          style={{
            maxWidth: layout.maxWidth,
            margin: '0 auto',
            backgroundColor: colors.background,
          }}
        >
          {/* Header */}
          <Section
            style={{
              padding: `${spacing.lg} ${spacing.md}`,
              borderBottom: `1px solid ${colors.border}`,
              textAlign: 'center',
            }}
          >
            <Heading
              style={{
                color: colors.primary,
                fontSize: '24px',
                fontWeight: 'bold',
                margin: 0,
                letterSpacing: '-0.5px',
              }}
            >
              FridayGT
            </Heading>
            <Text
              style={{
                color: colors.muted,
                fontSize: '14px',
                marginTop: spacing.xs,
                margin: 0,
              }}
            >
              Gran Turismo 7 Lap Tracker
            </Text>
          </Section>

          {/* Main Content */}
          <Section
            style={{
              padding: spacing.lg,
            }}
          >
            <Heading
              as="h2"
              style={{
                color: colors.foreground,
                fontSize: '20px',
                fontWeight: 'bold',
                marginTop: 0,
                marginBottom: spacing.md,
              }}
            >
              {heading}
            </Heading>

            {children}
          </Section>

          {/* Footer */}
          <Section
            style={{
              padding: `${spacing.md} ${spacing.lg}`,
              borderTop: `1px solid ${colors.border}`,
              textAlign: 'center',
            }}
          >
            <Text
              style={{
                color: colors.muted,
                fontSize: '12px',
                margin: 0,
              }}
            >
              You received this email because you signed up for FridayGT. If you didn&apos;t request this, please ignore this email.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
