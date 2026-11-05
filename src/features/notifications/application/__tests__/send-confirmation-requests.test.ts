import { describe, expect, it, vi } from 'vitest'
import { err, isOk, ok } from '@/shared/result'
import { fixedClock, fixedDate } from '@/shared/testing/fixed-clock'
import { channelNotConfigured, channelSendFailed } from '../../domain/errors'
import { MAX_REMINDER_ATTEMPTS } from '../../domain/reminder'
import type { ConfirmationRequest } from '../../domain/confirmation-request'
import { sendConfirmationRequests, type SendConfirmationRequestsDeps } from '../send-confirmation-requests'
import type { ConfirmationRequestRepository, NotificationChannel } from '../ports'

const APPOINTMENTS_URL = 'https://lashary.example/portal/citas/mis-citas'
const CONTACT = { phone: '+50688887777', email: 'clienta@example.com' }
const REQUEST: ConfirmationRequest = {
  id: 'solicitud-1',
  appointmentId: 'cita-1',
  clientId: 'clienta-1',
  startsAt: fixedDate('2027-03-10T15:00:00Z'),
  serviceName: 'Clásicas',
  status: 'claimed',
  attempts: 0,
  lastChannel: null,
}

const workingChannel = (kind: 'whatsapp' | 'email') =>
  ({ kind, send: vi.fn(async () => ok(undefined)) }) satisfies NotificationChannel

const failingChannel = (kind: 'whatsapp' | 'email') =>
  ({ kind, send: vi.fn(async () => err(channelSendFailed(kind, 'caído'))) }) satisfies NotificationChannel

const unconfiguredChannel = (kind: 'whatsapp' | 'email') =>
  ({ kind, send: vi.fn(async () => err(channelNotConfigured(kind))) }) satisfies NotificationChannel

function repositoryWith(requests: ConfirmationRequest[]): ConfirmationRequestRepository {
  return {
    claimPending: vi.fn(async () => ok(requests)),
    isStillClaimed: vi.fn(async () => ok(true)),
    releaseToPending: vi.fn(async () => ok(undefined)),
    markSent: vi.fn(async () => ok(undefined)),
    markRetry: vi.fn(async () => ok(undefined)),
    markExhausted: vi.fn(async () => ok(undefined)),
  }
}

const depsWith = (overrides: Partial<SendConfirmationRequestsDeps> = {}): SendConfirmationRequestsDeps => ({
  requests: repositoryWith([REQUEST]),
  getContact: async () => ok(CONTACT),
  primaryChannel: workingChannel('whatsapp'),
  backupChannel: workingChannel('email'),
  appointmentsUrl: APPOINTMENTS_URL,
  clock: fixedClock('2027-03-09T15:00:00Z'),
  ...overrides,
})

describe('sendConfirmationRequests', () => {
  it('manda por el canal configurado el detalle de la cita y el enlace (criterios 1 y 6)', async () => {
    const primaryChannel = workingChannel('whatsapp')
    const deps = depsWith({ primaryChannel })

    const result = await sendConfirmationRequests(deps)()

    expect(isOk(result) && result.value).toEqual({ sent: 1, retried: 0, exhausted: 0, errored: 0, unconfigured: 0, cancelled: 0 })
    const [input] = primaryChannel.send.mock.calls[0] as unknown as [{ purpose: string; message: string; messageId: string }]
    expect(input.purpose).toBe('appointment_confirmation')
    expect(input.messageId).toBe(REQUEST.id)
    expect(input.message).toContain('Clásicas')
    expect(input.message).toContain(APPOINTMENTS_URL)
    expect(deps.requests.markSent).toHaveBeenCalledWith(REQUEST.id, 'whatsapp', deps.clock())
  })

  it('si WhatsApp falla usa el respaldo por correo (criterio 6)', async () => {
    const deps = depsWith({ primaryChannel: failingChannel('whatsapp') })

    await sendConfirmationRequests(deps)()

    expect(deps.requests.markSent).toHaveBeenCalledWith(REQUEST.id, 'email', deps.clock())
  })

  it('si fallan los dos canales reintenta y guarda el error', async () => {
    const deps = depsWith({ primaryChannel: failingChannel('whatsapp'), backupChannel: failingChannel('email') })

    const result = await sendConfirmationRequests(deps)()

    expect(isOk(result) && result.value.retried).toBe(1)
    expect(deps.requests.markRetry).toHaveBeenCalledWith(REQUEST.id, 1, expect.stringContaining('caído'))
  })

  it('al agotar los intentos queda fallida', async () => {
    const lastAttempt = { ...REQUEST, attempts: MAX_REMINDER_ATTEMPTS - 1 }
    const deps = depsWith({
      requests: repositoryWith([lastAttempt]),
      primaryChannel: failingChannel('whatsapp'),
      backupChannel: failingChannel('email'),
    })

    const result = await sendConfirmationRequests(deps)()

    expect(isOk(result) && result.value.exhausted).toBe(1)
    expect(deps.requests.markExhausted).toHaveBeenCalled()
  })

  it('sin ningún canal configurado la deja pendiente sin gastar un intento', async () => {
    const deps = depsWith({ primaryChannel: unconfiguredChannel('whatsapp'), backupChannel: unconfiguredChannel('email') })

    const result = await sendConfirmationRequests(deps)()

    expect(isOk(result) && result.value.unconfigured).toBe(1)
    expect(deps.requests.releaseToPending).toHaveBeenCalledWith(REQUEST.id)
    expect(deps.requests.markExhausted).not.toHaveBeenCalled()
    expect(deps.requests.markRetry).not.toHaveBeenCalled()
  })

  it('el error del proveedor se guarda sin teléfonos', async () => {
    const leakyChannel = {
      kind: 'whatsapp' as const,
      send: vi.fn(async () => err(channelSendFailed('whatsapp', 'no se pudo entregar a +50688880801'))),
    } satisfies NotificationChannel
    const deps = depsWith({ primaryChannel: leakyChannel, backupChannel: failingChannel('email') })

    await sendConfirmationRequests(deps)()

    const [, , savedError] = (deps.requests.markRetry as ReturnType<typeof vi.fn>).mock.calls[0] as [string, number, string]
    expect(savedError).not.toContain('50688880801')
  })

  it('sin contacto registra el fallo y no llama los canales', async () => {
    const primaryChannel = workingChannel('whatsapp')
    const deps = depsWith({ getContact: async () => ok(null), primaryChannel })

    await sendConfirmationRequests(deps)()

    expect(deps.requests.markRetry).toHaveBeenCalledWith(REQUEST.id, 1, expect.any(String))
    expect(primaryChannel.send).not.toHaveBeenCalled()
  })

  it('si no se pudo leer el contacto la libera sin gastar un intento', async () => {
    const deps = depsWith({ getContact: async () => err('repository-failed') })

    const result = await sendConfirmationRequests(deps)()

    expect(isOk(result) && result.value.errored).toBe(1)
    expect(deps.requests.releaseToPending).toHaveBeenCalledWith(REQUEST.id)
    expect(deps.requests.markRetry).not.toHaveBeenCalled()
  })

  it('si no se pudo reclamar, informa el fallo', async () => {
    const requests = { ...repositoryWith([]), claimPending: async () => err('repository-failed' as const) }
    expect(await sendConfirmationRequests(depsWith({ requests }))()).toEqual(err('repository-failed'))
  })

  it('una solicitud cancelada después de reclamarla no se manda', async () => {
    const requests = repositoryWith([REQUEST])
    requests.isStillClaimed = vi.fn(async () => ok(false))
    const primaryChannel = workingChannel('whatsapp')

    const result = await sendConfirmationRequests(depsWith({ requests, primaryChannel }))()

    expect(primaryChannel.send).not.toHaveBeenCalled()
    expect(isOk(result) && result.value).toEqual({ sent: 0, retried: 0, exhausted: 0, errored: 0, unconfigured: 0, cancelled: 1 })
  })

  it('si no se puede comprobar el estado, no manda y lo cuenta como error', async () => {
    const requests = repositoryWith([REQUEST])
    requests.isStillClaimed = vi.fn(async () => err('repository-failed' as const))
    const primaryChannel = workingChannel('whatsapp')

    const result = await sendConfirmationRequests(depsWith({ requests, primaryChannel }))()

    expect(primaryChannel.send).not.toHaveBeenCalled()
    expect(isOk(result) && result.value.errored).toBe(1)
  })

  it('si se canceló durante el envío, no cuenta como enviada', async () => {
    const requests = repositoryWith([REQUEST])
    requests.markSent = vi.fn(async () => err('not-claimed' as const))

    const result = await sendConfirmationRequests(depsWith({ requests }))()

    expect(isOk(result) && result.value).toEqual({ sent: 0, retried: 0, exhausted: 0, errored: 0, unconfigured: 0, cancelled: 1 })
  })
})
