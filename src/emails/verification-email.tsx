import { Text } from '@react-email/components'
import { BaseEmail } from './base-email'
import { Button } from './components/button'
import { colors, spacing, fonts } from './constants'

interface VerificationEmailProps {
  verifyUrl: string
}

export function VerificationEmail({ verifyUrl }: VerificationEmailProps) {
  return (
    <BaseEmail
      previewText="Verify your email address to get started with FridayGT"
      heading="Welcome to FridayGT!"
    >
      <Text
        style={{
          color: colors.foreground,
          fontSize: '15px',
          lineHeight: '1.6',
          fontFamily: fonts.sans,
          marginTop: 0,
          marginBottom: spacing.md,
        }}
      >
        Thanks for signing up! To complete your registration and start tracking your Gran Turismo 7 lap times, please verify your email address by clicking the button below.
      </Text>

      <Button href={verifyUrl}>
        Verify Email Address
      </Button>

      <Text
        style={{
          color: colors.muted,
          fontSize: '13px',
          fontFamily: fonts.sans,
          marginTop: spacing.lg,
          marginBottom: spacing.sm,
        }}
      >
        This link will expire in 24 hours.
      </Text>

      <Text
        style={{
          color: colors.muted,
          fontSize: '13px',
          fontFamily: fonts.sans,
          marginTop: 0,
          marginBottom: 0,
        }}
      >
        If you didn&apos;t create an account with FridayGT, you can safely ignore this email.
      </Text>
    </BaseEmail>
  )
}
