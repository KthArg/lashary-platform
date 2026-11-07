import { ok, err } from '@/shared/result'
import { channelNotConfigured, channelSendFailed } from '../domain/errors'
import { CONFIRMATION_MESSAGE_TEXTS } from '../domain/confirmation-request'
import { REMINDER_MESSAGE_TEXTS } from '../domain/reminder-message'
import type { MessagePurpose, NotificationChannel } from '../application/ports'
import { CHANNEL_SEND_TIMEOUT_MS } from './send-timeout'

export type ResendEmailConfig = { apiKey: string; fromAddress: string }

const SUBJECTS: Record<MessagePurpose, string> = {
  reminder: REMINDER_MESSAGE_TEXTS.emailSubject,
  appointment_confirmation: CONFIRMATION_MESSAGE_TEXTS.emailSubject,
}

export function readResendEmailConfigFromEnv(env: Record<string, string | undefined>): ResendEmailConfig | null {
  const apiKey = env.RESEND_API_KEY
  const fromAddress = env.RESEND_FROM_ADDRESS
  if (!apiKey || !fromAddress) return null
  return { apiKey, fromAddress }
}

export function resendEmailChannel(config: ResendEmailConfig | null): NotificationChannel {
  return {
    kind: 'email',
    async send({ messageId, purpose, contact, message }) {
      if (config === null) return err(channelNotConfigured('email'))

      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json',
            'Idempotency-Key': `notifications-${purpose}-${messageId}`,
          },
          body: JSON.stringify({
            from: config.fromAddress,
            to: [contact.email],
            subject: SUBJECTS[purpose],
            text: message,
          }),
          signal: AbortSignal.timeout(CHANNEL_SEND_TIMEOUT_MS),
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
