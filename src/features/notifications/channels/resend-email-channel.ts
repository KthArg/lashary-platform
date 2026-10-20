import { ok, err } from '@/shared/result'
import { channelNotConfigured, channelSendFailed } from '../domain/errors'
import type { NotificationChannel } from '../application/ports'

// ADR-0006: Resend es el respaldo por email (decisión del PO, 2026-10-20). REST directo (sin
// SDK) por la misma razón que el canal de WhatsApp: una sola llamada no justifica una dependencia.
export type ResendEmailConfig = { apiKey: string; fromAddress: string; subject: string }

export function readResendEmailConfigFromEnv(env: Record<string, string | undefined>): ResendEmailConfig | null {
  const apiKey = env.RESEND_API_KEY
  const fromAddress = env.RESEND_FROM_ADDRESS
  if (!apiKey || !fromAddress) return null
  return { apiKey, fromAddress, subject: 'Recordatorio de tu cita en LASHARY' }
}

export function resendEmailChannel(config: ResendEmailConfig | null): NotificationChannel {
  return {
    kind: 'email',
    async send({ contact, message }) {
      if (config === null) return err(channelNotConfigured('email'))

      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: config.fromAddress,
            to: [contact.email],
            subject: config.subject,
            text: message,
          }),
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
