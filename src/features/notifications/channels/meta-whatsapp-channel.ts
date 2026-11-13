import { ok, err } from '@/shared/result'
import { channelNotConfigured, channelSendFailed } from '../domain/errors'
import type { MessagePurpose, NotificationChannel } from '../application/ports'
import { CHANNEL_SEND_TIMEOUT_MS } from './send-timeout'

export type MetaWhatsAppConfig = {
  accessToken: string
  phoneNumberId: string
  templateName: string | null
  confirmationTemplateName: string | null
  rescheduleOutcomeTemplateName: string | null
  aftercareTemplateName: string | null
  templateLanguage: string
  graphApiVersion: string
}

const DEFAULT_TEMPLATE_LANGUAGE = 'es'
const DEFAULT_GRAPH_API_VERSION = 'v21.0'

export function readMetaWhatsAppConfigFromEnv(env: Record<string, string | undefined>): MetaWhatsAppConfig | null {
  const accessToken = env.META_WHATSAPP_ACCESS_TOKEN
  const phoneNumberId = env.META_WHATSAPP_PHONE_NUMBER_ID
  if (!accessToken || !phoneNumberId) return null
  return {
    accessToken,
    phoneNumberId,
    templateName: env.META_WHATSAPP_TEMPLATE_NAME ?? null,
    confirmationTemplateName: env.META_WHATSAPP_CONFIRMATION_TEMPLATE_NAME ?? null,
    rescheduleOutcomeTemplateName: env.META_WHATSAPP_RESCHEDULE_OUTCOME_TEMPLATE_NAME ?? null,
    aftercareTemplateName: env.META_WHATSAPP_AFTERCARE_TEMPLATE_NAME ?? null,
    templateLanguage: env.META_WHATSAPP_TEMPLATE_LANGUAGE ?? DEFAULT_TEMPLATE_LANGUAGE,
    graphApiVersion: env.META_WHATSAPP_GRAPH_API_VERSION ?? DEFAULT_GRAPH_API_VERSION,
  }
}

function toMetaPhoneNumber(phone: string): string {
  return phone.replace(/\D/g, '')
}

// Un Record exhaustivo: si se agrega un propósito a MessagePurpose, TypeScript avisa que falta su plantilla.
const templateFor = (config: MetaWhatsAppConfig, purpose: MessagePurpose): string | null => {
  const templates: Record<MessagePurpose, string | null> = {
    reminder: config.templateName,
    appointment_confirmation: config.confirmationTemplateName,
    reschedule_outcome: config.rescheduleOutcomeTemplateName,
    aftercare: config.aftercareTemplateName,
  }
  return templates[purpose]
}

function buildTemplateBody(config: MetaWhatsAppConfig, templateName: string, recipientPhone: string, templateVariables: string[]) {
  return {
    messaging_product: 'whatsapp',
    to: toMetaPhoneNumber(recipientPhone),
    type: 'template',
    template: {
      name: templateName,
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
    async send({ purpose, contact, message, templateVariables }) {
      if (config === null) return err(channelNotConfigured('whatsapp'))
      // Con la plantilla de recordatorio pero sin la del propósito, no sale por WhatsApp y pasa al correo.
      const templateName = templateFor(config, purpose)
      if (templateName === null && config.templateName !== null) return err(channelNotConfigured('whatsapp'))

      const url = `https://graph.facebook.com/${config.graphApiVersion}/${config.phoneNumberId}/messages`
      const requestBody = templateName
        ? buildTemplateBody(config, templateName, contact.phone, templateVariables)
        : buildFreeTextBody(contact.phone, message)

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${config.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
          signal: AbortSignal.timeout(CHANNEL_SEND_TIMEOUT_MS),
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
