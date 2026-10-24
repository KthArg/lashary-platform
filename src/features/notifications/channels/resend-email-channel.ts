import { ok, err } from '@/shared/result'
import { channelNotConfigured, channelSendFailed } from '../domain/errors'
import { REMINDER_MESSAGE_TEXTS } from '../domain/reminder-message'
import type { NotificationChannel } from '../application/ports'

export type ResendEmailConfig = { apiKey: string; fromAddress: string; subject: string }

const SEND_TIMEOUT_MS = 10_000

export function readResendEmailConfigFromEnv(env: Record<string, string | undefined>): ResendEmailConfig | null {
  const apiKey = env.RESEND_API_KEY
  const fromAddress = env.RESEND_FROM_ADDRESS
  if (!apiKey || !fromAddress) return null
  return { apiKey, fromAddress, subject: REMINDER_MESSAGE_TEXTS.emailSubject }
}

export function resendEmailChannel(config: ResendEmailConfig | null): NotificationChannel {
  return {
    kind: 'email',
    async send({ reminderId, contact, message }) {
      if (config === null) return err(channelNotConfigured('email'))

      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json',
            'Idempotency-Key': `notifications-reminder-${reminderId}`,
          },
          body: JSON.stringify({
            from: config.fromAddress,
            to: [contact.email],
            subject: config.subject,
            text: message,
          }),
          signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
        })
        if (!response.ok) {
          return err(channelSendFailed('email', `Resend respondió ${response.status}`))
        }
        return ok(undefined)
      } catch (cause) {
        return err(channelSendFailed('email', cause instanceof Error ? cause.message : 'error desconocido'))
      }
    },
  }
}
