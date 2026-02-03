import { Text } from '@react-email/components'
import { BaseEmail } from './base-email'
import { Card } from './components/card'
import { colors, spacing, fonts } from './constants'

interface UserRemovalEmailProps {
  removedUserEmail: string
  removedBy: string
  removalTime: string
}

export function UserRemovalEmail({ removedUserEmail, removedBy, removalTime }: UserRemovalEmailProps) {
  return (
    <BaseEmail
      previewText={`User account ${removedUserEmail} has been removed`}
      heading="User Account Removed"
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
        A user account has been removed from FridayGT. Here are the details:
      </Text>

      <Card titleColor="destructive" title="Removed Account">
        <Text
          style={{
            color: colors.foreground,
            fontSize: '14px',
            fontFamily: fonts.sans,
            margin: `${spacing.sm} 0`,
          }}
        >
          <strong>Email:</strong> {removedUserEmail}
        </Text>

        <Text
          style={{
            color: colors.muted,
            fontSize: '14px',
            fontFamily: fonts.sans,
            marginTop: spacing.sm,
            marginBottom: 0,
          }}
        >
          <strong>Removed by:</strong> {removedBy}
        </Text>

        <Text
          style={{
            color: colors.muted,
            fontSize: '14px',
            fontFamily: fonts.sans,
            marginTop: spacing.sm,
            marginBottom: 0,
          }}
        >
          <strong>Time:</strong> {removalTime}
        </Text>
      </Card>

      <Text
        style={{
          color: colors.muted,
          fontSize: '13px',
          fontFamily: fonts.sans,
          marginTop: spacing.lg,
          marginBottom: 0,
        }}
      >
        This is an automated notification for administrators. No action is required.
      </Text>
    </BaseEmail>
  )
}
