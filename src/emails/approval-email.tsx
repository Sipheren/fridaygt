import { Text } from '@react-email/components'
import { BaseEmail } from './base-email'
import { Button } from './components/button'
import { Card } from './components/card'
import { colors, spacing, fonts } from './constants'

interface ApprovalEmailProps {
  approved: boolean
  signInUrl: string
}

export function ApprovalEmail({ approved, signInUrl }: ApprovalEmailProps) {
  return (
    <BaseEmail
      previewText={approved ? 'Your account has been approved' : 'Your account request has been denied'}
      heading={approved ? 'Account Approved!' : 'Account Request Denied'}
    >
      {approved ? (
        <>
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
            Great news! Your FridayGT account has been approved and you can now start tracking your Gran Turismo 7 lap times.
          </Text>

          <Card titleColor="success" title="Status">
            <Text
              style={{
                color: colors.muted,
                fontSize: '14px',
                fontFamily: fonts.sans,
                margin: 0,
              }}
            >
              Your account is now active and ready to use.
            </Text>
          </Card>

          <Button href={signInUrl}>
            Sign In to FridayGT
          </Button>

          <Text
            style={{
              color: colors.muted,
              fontSize: '13px',
              fontFamily: fonts.sans,
              marginTop: spacing.lg,
              marginBottom: 0,
            }}
          >
            If you have any questions, feel free to reach out to the administrator.
          </Text>
        </>
      ) : (
        <>
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
            Your request to join FridayGT has been denied. This could be due to various reasons, such as incomplete information or failure to meet community guidelines.
          </Text>

          <Card titleColor="destructive" title="Status">
            <Text
              style={{
                color: colors.muted,
                fontSize: '14px',
                fontFamily: fonts.sans,
                margin: 0,
              }}
            >
              Your account request was not approved at this time.
            </Text>
          </Card>

          <Text
            style={{
              color: colors.muted,
              fontSize: '13px',
              fontFamily: fonts.sans,
              marginTop: spacing.lg,
              marginBottom: spacing.sm,
            }}
          >
            If you believe this is an error or would like more information, please contact the administrator.
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
            You can submit a new registration request if you&apos;d like to try again.
          </Text>
        </>
      )}
    </BaseEmail>
  )
}
