import { ok, err } from '@/shared/result'
import { channelNotConfigured, channelSendFailed } from '../domain/errors'
import type { NotificationChannel } from '../application/ports'

export type MetaWhatsAppConfig = {
  accessToken: string
  phoneNumberId: string
  templateName: string | null
  templateLanguage: string
}

const DEFAULT_TEMPLATE_LANGUAGE = 'es'
const GRAPH_API_VERSION = 'v21.0'

export function readMetaWhatsAppConfigFromEnv(env: Record<string, string | undefined>): MetaWhatsAppConfig | null {
  const accessToken = env.META_WHATSAPP_ACCESS_TOKEN
  const phoneNumberId = env.META_WHATSAPP_PHONE_NUMBER_ID
  if (!accessToken || !phoneNumberId) return null
  return {
    accessToken,
    phoneNumberId,
    templateName: env.META_WHATSAPP_TEMPLATE_NAME ?? null,
    templateLanguage: env.META_WHATSAPP_TEMPLATE_LANGUAGE ?? DEFAULT_TEMPLATE_LANGUAGE,
  }
}

function toMetaPhoneNumber(phone: string): string {
  return phone.replace(/\D/g, '')
}

function buildTemplateBody(config: MetaWhatsAppConfig, recipientPhone: string, templateVariables: string[]) {
  return {
    messaging_product: 'whatsapp',
    to: toMetaPhoneNumber(recipientPhone),
    type: 'template',
    template: {
      name: config.templateName,
      language: { code: config.templateLanguage },
      components: [
        {
          type: 'body',
          parameters: templateVariables.map((value) => ({ type: 'text', text: value })),
        },
      ],
    },
  }
}

function buildFreeTextBody(recipientPhone: string, message: string) {
  return {
    messaging_product: 'whatsapp',
    to: toMetaPhoneNumber(recipientPhone),
    type: 'text',
    text: { body: message },
  }
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: { message?: string } }
    return body.error?.message ?? `Meta respondió ${response.status}`
  } catch {
    return `Meta respondió ${response.status}`
  }
}

export function metaWhatsAppChannel(config: MetaWhatsAppConfig | null): NotificationChannel {
  return {
    kind: 'whatsapp',
    async send({ contact, message, templateVariables }) {
      if (config === null) return err(channelNotConfigured('whatsapp'))

      const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${config.phoneNumberId}/messages`
      const requestBody = config.templateName
        ? buildTemplateBody(config, contact.phone, templateVariables)
        : buildFreeTextBody(contact.phone, message)

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${config.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        })
        if (!response.ok) {
          return err(channelSendFailed('whatsapp', await readErrorMessage(response)))
        }
        return ok(undefined)
      } catch (cause) {
        return err(channelSendFailed('whatsapp', cause instanceof Error ? cause.message : 'error desconocido'))
      }
    },
  }
}
