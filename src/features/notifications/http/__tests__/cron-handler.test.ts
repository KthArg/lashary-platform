import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ok, err } from '@/shared/result'

const mockReminders = vi.fn()
const mockReapplications = vi.fn()
const mockPaymentReminders = vi.fn()

vi.mock('../../index', () => ({
  runNotificationsReminderCycle: () => mockReminders(),
  runReapplicationReminderCycle: () => mockReapplications(),
  runPaymentReminderCycle: () => mockPaymentReminders(),
}))

import { receiveReminderCronRequest } from '../cron-handler'

const SECRET = 'placeholder-secreto-de-prueba'
const REMINDERS_SUMMARY = { sent: 3 }
const REAPPLICATIONS_SUMMARY = { sent: 1 }
const PAYMENT_REMINDERS_SUMMARY = { sent: 2 }
const NOT_CONFIGURED = 'system-client-not-configured'

const request = (authorization?: string) =>
  new Request('http://localhost/api/cron/notifications-reminders', {
    method: 'POST',
    headers: authorization ? { authorization } : {},
  })

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('CRON_SECRET', SECRET)
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  mockReminders.mockResolvedValue(ok(REMINDERS_SUMMARY))
  mockReapplications.mockResolvedValue(ok(REAPPLICATIONS_SUMMARY))
  mockPaymentReminders.mockResolvedValue(ok(PAYMENT_REMINDERS_SUMMARY))
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('receiveReminderCronRequest', () => {
  it('rechaza con 401 sin el secreto y no corre ningún ciclo', async () => {
    const response = await receiveReminderCronRequest(request())

    expect(response.status).toBe(401)
    expect(mockReminders).not.toHaveBeenCalled()
    expect(mockReapplications).not.toHaveBeenCalled()
    expect(mockPaymentReminders).not.toHaveBeenCalled()
  })

  it('rechaza con 401 un secreto equivocado', async () => {
    const response = await receiveReminderCronRequest(request('Bearer otro'))

    expect(response.status).toBe(401)
  })

  it('con el secreto correcto corre los tres ciclos y responde los tres resúmenes', async () => {
    const response = await receiveReminderCronRequest(request(`Bearer ${SECRET}`))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      reminders: REMINDERS_SUMMARY,
      reapplications: REAPPLICATIONS_SUMMARY,
      paymentReminders: PAYMENT_REMINDERS_SUMMARY,
    })
    expect(mockReminders).toHaveBeenCalledTimes(1)
    expect(mockReapplications).toHaveBeenCalledTimes(1)
    expect(mockPaymentReminders).toHaveBeenCalledTimes(1)
  })

  it('si falla el de recordatorios, los otros corren igual y se reporta con 503', async () => {
    mockReminders.mockResolvedValue(err(NOT_CONFIGURED))

    const response = await receiveReminderCronRequest(request(`Bearer ${SECRET}`))

    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({
      reminders: { error: NOT_CONFIGURED },
      reapplications: REAPPLICATIONS_SUMMARY,
      paymentReminders: PAYMENT_REMINDERS_SUMMARY,
    })
    expect(mockReapplications).toHaveBeenCalledTimes(1)
    expect(mockPaymentReminders).toHaveBeenCalledTimes(1)
  })

  it('si falla el de re-aplicación, los otros corren igual y se reporta con 503', async () => {
    mockReapplications.mockResolvedValue(err('repository-failed'))

    const response = await receiveReminderCronRequest(request(`Bearer ${SECRET}`))

    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({
      reminders: REMINDERS_SUMMARY,
      reapplications: { error: 'repository-failed' },
      paymentReminders: PAYMENT_REMINDERS_SUMMARY,
    })
    expect(mockReminders).toHaveBeenCalledTimes(1)
    expect(mockPaymentReminders).toHaveBeenCalledTimes(1)
  })

  it('si falla el del recordatorio de pago, los otros corren igual y se reporta con 503', async () => {
    mockPaymentReminders.mockResolvedValue(err('repository-failed'))

    const response = await receiveReminderCronRequest(request(`Bearer ${SECRET}`))

    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({
      reminders: REMINDERS_SUMMARY,
      reapplications: REAPPLICATIONS_SUMMARY,
      paymentReminders: { error: 'repository-failed' },
    })
    expect(mockReminders).toHaveBeenCalledTimes(1)
    expect(mockReapplications).toHaveBeenCalledTimes(1)
  })

  it('una excepción inesperada en un ciclo no tumba a los otros', async () => {
    mockPaymentReminders.mockRejectedValue(new Error('boom'))

    const response = await receiveReminderCronRequest(request(`Bearer ${SECRET}`))

    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({
      reminders: REMINDERS_SUMMARY,
      reapplications: REAPPLICATIONS_SUMMARY,
      paymentReminders: { error: 'unexpected-error' },
    })
  })

  it('si los tres fallan, responde 503 con los tres errores', async () => {
    mockReminders.mockResolvedValue(err(NOT_CONFIGURED))
    mockReapplications.mockResolvedValue(err(NOT_CONFIGURED))
    mockPaymentReminders.mockResolvedValue(err(NOT_CONFIGURED))

    const response = await receiveReminderCronRequest(request(`Bearer ${SECRET}`))

    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({
      reminders: { error: NOT_CONFIGURED },
      reapplications: { error: NOT_CONFIGURED },
      paymentReminders: { error: NOT_CONFIGURED },
    })
  })
})
