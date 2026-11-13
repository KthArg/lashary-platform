import { describe, expect, it, vi } from 'vitest'
import { err, isOk, ok } from '@/shared/result'
import { fixedClock, fixedDate } from '@/shared/testing/fixed-clock'
import { channelNotConfigured, channelSendFailed } from '../../domain/errors'
import { MAX_REMINDER_ATTEMPTS } from '../../domain/reminder'
import type { AftercareMessage } from '../../domain/aftercare-message'
import { buildAftercareMessage, buildAftercareTemplateVariables } from '../../domain/aftercare-message-text'
import { NO_CONTACT_ERROR, sendAftercareMessages, type SendAftercareMessagesDeps } from '../send-aftercare-messages'
import type { AftercareDeliveryRepository, NotificationChannel } from '../ports'

const APPOINTMENTS_URL = 'https://lashary.example/portal/citas/mis-citas'
const CONTACT = { phone: '+50688887777', email: 'clienta@example.com' }
const NOW = '2027-03-09T15:00:00Z'
const MESSAGE: AftercareMessage = {
  id: 'indicaciones-1',
  appointmentId: 'cita-1',
  clientId: 'clienta-1',
  serviceName: 'Clásicas',
  aftercareText: 'No mojes las pestañas durante 24 horas.',
  clientNote: 'Vuelve en tres semanas para el retoque.',
  attempts: 0,
  createdAt: fixedDate('2027-03-09T14:00:00Z'),
}

const workingChannel = (kind: 'whatsapp' | 'email') =>
  ({ kind, send: vi.fn(async () => ok(undefined)) }) satisfies NotificationChannel

const failingChannel = (kind: 'whatsapp' | 'email') =>
  ({ kind, send: vi.fn(async () => err(channelSendFailed(kind, 'caído'))) }) satisfies NotificationChannel

const unconfiguredChannel = (kind: 'whatsapp' | 'email') =>
  ({ kind, send: vi.fn(async () => err(channelNotConfigured(kind))) }) satisfies NotificationChannel

function repositoryWith(messages: AftercareMessage[]): AftercareDeliveryRepository {
  return {
    claimDue: vi.fn(async () => ok(messages)),
    releaseToPending: vi.fn(async () => ok(undefined)),
    markSent: vi.fn(async () => ok(undefined)),
    markRetry: vi.fn(async () => ok(undefined)),
    markExhausted: vi.fn(async () => ok(undefined)),
  }
}

const depsWith = (overrides: Partial<SendAftercareMessagesDeps> = {}): SendAftercareMessagesDeps => ({
  aftercareMessages: repositoryWith([MESSAGE]),
  getContact: async () => ok(CONTACT),
  primaryChannel: workingChannel('whatsapp'),
  backupChannel: workingChannel('email'),
  appointmentsUrl: APPOINTMENTS_URL,
  clock: fixedClock(NOW),
  ...overrides,
})

describe('sendAftercareMessages', () => {
  it('manda por WhatsApp el texto con la nota y las dos variables, y lo marca enviado (US-CLI-06)', async () => {
    const primaryChannel = workingChannel('whatsapp')
    const deps = depsWith({ primaryChannel })

    const result = await sendAftercareMessages(deps)()

    expect(isOk(result) && result.value).toEqual({ sent: 1, retried: 0, exhausted: 0, errored: 0, unconfigured: 0 })
    expect(primaryChannel.send).toHaveBeenCalledWith({
      messageId: MESSAGE.id,
      purpose: 'aftercare',
      contact: CONTACT,
      message: buildAftercareMessage(MESSAGE, APPOINTMENTS_URL),
      templateVariables: buildAftercareTemplateVariables(MESSAGE, APPOINTMENTS_URL),
    })
    const [input] = primaryChannel.send.mock.calls[0] as unknown as [{ message: string; templateVariables: string[] }]
    expect(input.message).toContain(MESSAGE.clientNote)
    expect(input.templateVariables).toEqual([MESSAGE.serviceName, APPOINTMENTS_URL])
    expect(deps.aftercareMessages.claimDue).toHaveBeenCalledWith(fixedDate(NOW))
    expect(deps.aftercareMessages.markSent).toHaveBeenCalledWith(MESSAGE.id, 'whatsapp', fixedDate(NOW))
  })

  it('si WhatsApp falla usa el respaldo por correo (ADR-0006)', async () => {
    const backupChannel = workingChannel('email')
    const deps = depsWith({ primaryChannel: failingChannel('whatsapp'), backupChannel })

    await sendAftercareMessages(deps)()

    expect(backupChannel.send).toHaveBeenCalledWith(expect.objectContaining({ purpose: 'aftercare', messageId: MESSAGE.id }))
    expect(deps.aftercareMessages.markSent).toHaveBeenCalledWith(MESSAGE.id, 'email', fixedDate(NOW))
  })

  it('si fallan los dos canales reintenta y guarda el error', async () => {
    const deps = depsWith({ primaryChannel: failingChannel('whatsapp'), backupChannel: failingChannel('email') })

    const result = await sendAftercareMessages(deps)()

    expect(isOk(result) && result.value.retried).toBe(1)
    expect(deps.aftercareMessages.markRetry).toHaveBeenCalledWith(MESSAGE.id, 1, expect.stringContaining('caído'))
  })

  it('al llegar al máximo de intentos queda agotada', async () => {
    const lastAttempt = { ...MESSAGE, attempts: MAX_REMINDER_ATTEMPTS - 1 }
    const deps = depsWith({
      aftercareMessages: repositoryWith([lastAttempt]),
      primaryChannel: failingChannel('whatsapp'),
      backupChannel: failingChannel('email'),
    })

    const result = await sendAftercareMessages(deps)()

    expect(isOk(result) && result.value.exhausted).toBe(1)
    expect(deps.aftercareMessages.markExhausted).toHaveBeenCalledWith(MESSAGE.id, MAX_REMINDER_ATTEMPTS, expect.any(String))
  })

  it('sin ningún canal configurado la deja pendiente sin gastar un intento', async () => {
    const deps = depsWith({ primaryChannel: unconfiguredChannel('whatsapp'), backupChannel: unconfiguredChannel('email') })

    const result = await sendAftercareMessages(deps)()

    expect(isOk(result) && result.value.unconfigured).toBe(1)
    expect(deps.aftercareMessages.releaseToPending).toHaveBeenCalledWith(MESSAGE.id)
    expect(deps.aftercareMessages.markRetry).not.toHaveBeenCalled()
    expect(deps.aftercareMessages.markExhausted).not.toHaveBeenCalled()
  })

  it('sin contacto registra el fallo y no llama los canales', async () => {
    const primaryChannel = workingChannel('whatsapp')
    const deps = depsWith({ getContact: async () => ok(null), primaryChannel })

    await sendAftercareMessages(deps)()

    expect(deps.aftercareMessages.markRetry).toHaveBeenCalledWith(MESSAGE.id, 1, NO_CONTACT_ERROR)
    expect(primaryChannel.send).not.toHaveBeenCalled()
  })

  it('si no se pudo leer el contacto la libera sin gastar un intento', async () => {
    const deps = depsWith({ getContact: async () => err('repository-failed') })

    const result = await sendAftercareMessages(deps)()

    expect(isOk(result) && result.value.errored).toBe(1)
    expect(deps.aftercareMessages.releaseToPending).toHaveBeenCalledWith(MESSAGE.id)
    expect(deps.aftercareMessages.markRetry).not.toHaveBeenCalled()
  })

  it('si no se pudo reclamar, informa el fallo', async () => {
    const aftercareMessages = { ...repositoryWith([]), claimDue: async () => err('repository-failed' as const) }
    expect(await sendAftercareMessages(depsWith({ aftercareMessages }))()).toEqual(err('repository-failed'))
  })
})
