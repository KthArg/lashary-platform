import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ok, err } from '@/shared/result'

const mockReminders = vi.fn()
const mockReapplications = vi.fn()

vi.mock('../../index', () => ({
  runNotificationsReminderCycle: () => mockReminders(),
  runReapplicationReminderCycle: () => mockReapplications(),
}))

import { receiveReminderCronRequest } from '../cron-handler'

const SECRET = 'placeholder-secreto-de-prueba'
const REMINDERS_SUMMARY = { sent: 3 }
const REAPPLICATIONS_SUMMARY = { sent: 1 }

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
  })

  it('rechaza con 401 un secreto equivocado', async () => {
    const response = await receiveReminderCronRequest(request('Bearer otro'))

    expect(response.status).toBe(401)
  })

  it('con el secreto correcto corre los dos ciclos y responde los dos resúmenes', async () => {
    const response = await receiveReminderCronRequest(request(`Bearer ${SECRET}`))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ reminders: REMINDERS_SUMMARY, reapplications: REAPPLICATIONS_SUMMARY })
    expect(mockReminders).toHaveBeenCalledTimes(1)
    expect(mockReapplications).toHaveBeenCalledTimes(1)
  })

  it('si falla el de recordatorios, el de re-aplicación corre igual y se reporta con 503', async () => {
    mockReminders.mockResolvedValue(err('system-client-not-configured'))

    const response = await receiveReminderCronRequest(request(`Bearer ${SECRET}`))

    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({
      reminders: { error: 'system-client-not-configured' },
      reapplications: REAPPLICATIONS_SUMMARY,
    })
    expect(mockReapplications).toHaveBeenCalledTimes(1)
  })

  it('si falla el de re-aplicación, el de recordatorios corre igual y se reporta con 503', async () => {
    mockReapplications.mockResolvedValue(err('repository-failed'))

    const response = await receiveReminderCronRequest(request(`Bearer ${SECRET}`))

    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({
      reminders: REMINDERS_SUMMARY,
      reapplications: { error: 'repository-failed' },
    })
    expect(mockReminders).toHaveBeenCalledTimes(1)
  })

  it('una excepción inesperada en un ciclo no tumba al otro', async () => {
    mockReminders.mockRejectedValue(new Error('boom'))

    const response = await receiveReminderCronRequest(request(`Bearer ${SECRET}`))

    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({
      reminders: { error: 'unexpected-error' },
      reapplications: REAPPLICATIONS_SUMMARY,
    })
  })

  it('si los dos fallan, responde 503 con los dos errores', async () => {
    mockReminders.mockResolvedValue(err('system-client-not-configured'))
    mockReapplications.mockResolvedValue(err('system-client-not-configured'))

    const response = await receiveReminderCronRequest(request(`Bearer ${SECRET}`))

    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({
      reminders: { error: 'system-client-not-configured' },
      reapplications: { error: 'system-client-not-configured' },
    })
  })
})
