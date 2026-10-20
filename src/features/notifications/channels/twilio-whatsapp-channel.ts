import { ok, err } from '@/shared/result'
import { channelNotConfigured, channelSendFailed } from '../domain/errors'
import type { NotificationChannel } from '../application/ports'

export type TwilioWhatsAppConfig = {
  accountSid: string
  authToken: string
  fromWhatsAppNumber: string
}

export function readTwilioWhatsAppConfigFromEnv(env: Record<string, string | undefined>): TwilioWhatsAppConfig | null {
  const accountSid = env.TWILIO_ACCOUNT_SID
  const authToken = env.TWILIO_AUTH_TOKEN
  const fromWhatsAppNumber = env.TWILIO_WHATSAPP_FROM
  if (!accountSid || !authToken || !fromWhatsAppNumber) return null
  return { accountSid, authToken, fromWhatsAppNumber }
}

export function twilioWhatsAppChannel(config: TwilioWhatsAppConfig | null): NotificationChannel {
  return {
    kind: 'whatsapp',
    async send({ contact, message }) {
      if (config === null) return err(channelNotConfigured('whatsapp'))

      const url = `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`
      const body = new URLSearchParams({
        From: `whatsapp:${config.fromWhatsAppNumber}`,
        To: `whatsapp:${contact.phone}`,
        Body: message,
      })

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Basic ${Buffer.from(`${config.accountSid}:${config.authToken}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body,
        })
        if (!response.ok) {
          return err(channelSendFailed('whatsapp', `Twilio respondió ${response.status}`))
        }
        return ok(undefined)
      } catch (cause) {
        return err(channelSendFailed('whatsapp', cause instanceof Error ? cause.message : 'error desconocido'))
      }
    },
  }
}
