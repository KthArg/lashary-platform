import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ok, err } from '@/shared/result'
import { delinquencyStorageFailed } from '../../domain/errors'

const mockCreateSystemClient = vi.fn()
const mockCloseSystemClient = vi.fn()
const mockDetect = vi.fn()

vi.mock('@/shared/lib/supabase/system', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/lib/supabase/system')>()),
  createSystemClient: (...args: unknown[]) => mockCreateSystemClient(...args),
  closeSystemClient: (...args: unknown[]) => mockCloseSystemClient(...args),
}))
vi.mock('../../db/detection-repository', () => ({
  detectionRepository: () => ({ detectUnpaid: () => mockDetect() }),
}))

import { receiveDetectionCronRequest } from '../cron-handler'

const SECRET = 'placeholder-secreto-de-prueba'
const request = (authorization?: string) =>
  new Request('http://localhost/api/cron/delinquency-detect', {
    method: 'POST',
    headers: authorization ? { authorization } : {},
  })

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('CRON_SECRET', SECRET)
  vi.stubEnv('NOTIFICATIONS_CRON_EMAIL', 'cron@lashary.example')
  vi.stubEnv('NOTIFICATIONS_CRON_PASSWORD', 'placeholder-clave-de-prueba')
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  mockCreateSystemClient.mockResolvedValue(ok({ fake: 'client' }))
  mockDetect.mockResolvedValue(ok(2))
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('receiveDetectionCronRequest', () => {
  it('rechaza con 401 sin el secreto y no toca la base', async () => {
    const response = await receiveDetectionCronRequest(request())

    expect(response.status).toBe(401)
    expect(mockCreateSystemClient).not.toHaveBeenCalled()
  })

  it('rechaza con 401 un secreto equivocado', async () => {
    const response = await receiveDetectionCronRequest(request('Bearer otro'))

    expect(response.status).toBe(401)
    expect(mockDetect).not.toHaveBeenCalled()
  })

  it('con el secreto correcto corre la detección, responde cuántas generó y cierra la sesión', async () => {
    const response = await receiveDetectionCronRequest(request(`Bearer ${SECRET}`))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ generated: 2 })
    expect(mockCloseSystemClient).toHaveBeenCalledTimes(1)
  })

  it('sin la cuenta de sistema configurada responde 503 sin intentar entrar', async () => {
    vi.stubEnv('NOTIFICATIONS_CRON_EMAIL', '')

    const response = await receiveDetectionCronRequest(request(`Bearer ${SECRET}`))

    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ error: 'system-client-not-configured' })
    expect(mockCreateSystemClient).not.toHaveBeenCalled()
  })

  it('si la cuenta de sistema no puede entrar responde 503', async () => {
    mockCreateSystemClient.mockResolvedValue(err('system-client-sign-in-failed'))

    const response = await receiveDetectionCronRequest(request(`Bearer ${SECRET}`))

    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ error: 'system-client-sign-in-failed' })
  })

  it('si la base falla responde 503 sin filtrar el mensaje y cierra la sesión igual', async () => {
    mockDetect.mockResolvedValue(err(delinquencyStorageFailed('detalle interno de la base')))

    const response = await receiveDetectionCronRequest(request(`Bearer ${SECRET}`))

    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ error: 'storage-failed' })
    expect(mockCloseSystemClient).toHaveBeenCalledTimes(1)
  })

  it('una excepción inesperada responde 500 y cierra la sesión', async () => {
    mockDetect.mockRejectedValue(new Error('boom'))

    const response = await receiveDetectionCronRequest(request(`Bearer ${SECRET}`))

    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: 'unexpected-error' })
    expect(mockCloseSystemClient).toHaveBeenCalledTimes(1)
  })
})
