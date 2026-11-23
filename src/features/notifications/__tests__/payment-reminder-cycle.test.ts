import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ok, err, isOk, isErr } from '@/shared/result'
import { runPaymentReminderCycle } from '../index'

const mockCreateSystemClient = vi.fn()
const mockCloseSystemClient = vi.fn()
const mockFrequencyDays = vi.fn()
const mockReminderLog = vi.fn()
const mockListOwedByClient = vi.fn()
const mockDiscover = vi.fn()
const mockSend = vi.fn()

vi.mock('@/shared/lib/supabase/system', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/lib/supabase/system')>()),
  createSystemClient: (...args: unknown[]) => mockCreateSystemClient(...args),
  closeSystemClient: (...args: unknown[]) => mockCloseSystemClient(...args),
}))
vi.mock('../db/payment-reminder-settings-repository', () => ({
  paymentReminderSettingsRepository: () => ({ frequencyDays: () => mockFrequencyDays() }),
}))
vi.mock('../db/payment-reminder-repository', () => ({
  paymentReminderRepository: (...args: unknown[]) => mockReminderLog(...args),
}))
vi.mock('../db/active-debts-gateway', () => ({
  activeDebtsGateway: () => ({ listOwedByClient: () => mockListOwedByClient() }),
}))
vi.mock('@/features/auth', () => ({ CLIENT_PORTAL_ROUTES: { cuenta: '/portal/cuenta' } }))
vi.mock('@/features/scheduling', () => ({ SCHEDULING_MY_APPOINTMENTS_PATH: '/portal/citas/mis-citas' }))
vi.mock('@/features/catalog', () => ({}))
vi.mock('@/features/clients', () => ({ getClientContactForReminders: vi.fn() }))
vi.mock('../channels/meta-whatsapp-channel', () => ({
  metaWhatsAppChannel: () => ({ kind: 'whatsapp', send: vi.fn() }),
  readMetaWhatsAppConfigFromEnv: () => null,
}))
vi.mock('../channels/resend-email-channel', () => ({
  resendEmailChannel: () => ({ kind: 'email', send: vi.fn() }),
  readResendEmailConfigFromEnv: () => null,
}))
vi.mock('../application/discover-due-payment-reminders', () => ({
  discoverDuePaymentReminders: (...args: unknown[]) => mockDiscover(...args),
}))
vi.mock('../application/send-due-payment-reminders', () => ({
  sendDuePaymentReminders: (deps: unknown) => (due: unknown) => mockSend(deps, due),
}))

const FAKE_DB = { fake: 'client' }
const FREQUENCY_DAYS = 14
const SITE_URL = 'https://lashary.example'
const DUE_REMINDERS = [{ clientId: 'client-1', amountOwed: 18000 }]
const SEND_SUMMARY = { sent: 1, skipped: 0, failed: 0, exhausted: 0, errored: 0 }

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', SITE_URL)
  vi.stubEnv('NOTIFICATIONS_CRON_EMAIL', 'cron@lashary.example')
  vi.stubEnv('NOTIFICATIONS_CRON_PASSWORD', 'placeholder-clave-de-prueba')
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  mockCreateSystemClient.mockResolvedValue(ok(FAKE_DB))
  mockFrequencyDays.mockResolvedValue(ok(FREQUENCY_DAYS))
  mockReminderLog.mockResolvedValue({ lastSentAt: vi.fn(), recordSent: vi.fn() })
  mockDiscover.mockResolvedValue(ok(DUE_REMINDERS))
  mockSend.mockResolvedValue(ok(SEND_SUMMARY))
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('runPaymentReminderCycle', () => {
  it('sin la cuenta de sistema configurada, no entra a la base', async () => {
    vi.stubEnv('NOTIFICATIONS_CRON_EMAIL', '')

    const result = await runPaymentReminderCycle()

    expect(isErr(result) && result.error).toBe('system-client-not-configured')
    expect(mockCreateSystemClient).not.toHaveBeenCalled()
  })

  it('si la cuenta de sistema no puede entrar, propaga el error', async () => {
    mockCreateSystemClient.mockResolvedValue(err('system-client-sign-in-failed'))

    const result = await runPaymentReminderCycle()

    expect(isErr(result) && result.error).toBe('system-client-sign-in-failed')
  })

  it('si falla la lectura de la frecuencia, aborta antes de descubrir o mandar nada y cierra la sesión', async () => {
    mockFrequencyDays.mockResolvedValue(err('repository-failed'))

    const result = await runPaymentReminderCycle()

    expect(isErr(result) && result.error).toBe('repository-failed')
    expect(mockDiscover).not.toHaveBeenCalled()
    expect(mockSend).not.toHaveBeenCalled()
    expect(mockCloseSystemClient).toHaveBeenCalledTimes(1)
  })

  it('con todo en orden, descubre con la frecuencia configurada, manda y devuelve el resumen', async () => {
    const result = await runPaymentReminderCycle()

    expect(isOk(result) && result.value).toEqual(SEND_SUMMARY)
    expect(mockDiscover).toHaveBeenCalledWith(expect.objectContaining({ frequencyDays: FREQUENCY_DAYS }))
    expect(mockSend).toHaveBeenCalledWith(expect.anything(), DUE_REMINDERS)
    expect(mockCloseSystemClient).toHaveBeenCalledTimes(1)
  })

  it('manda con el enlace al estado de cuenta de la clienta para regularizar (criterio 2)', async () => {
    await runPaymentReminderCycle()

    expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({ regularizeUrl: `${SITE_URL}/portal/cuenta` }), DUE_REMINDERS)
  })

  it('sin una URL del sitio válida no manda nada, porque el recordatorio no llevaría enlace', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', '')

    const result = await runPaymentReminderCycle()

    expect(isErr(result) && result.error).toBe('site-url-not-configured')
    expect(mockDiscover).not.toHaveBeenCalled()
    expect(mockSend).not.toHaveBeenCalled()
    expect(mockCloseSystemClient).toHaveBeenCalledTimes(1)
  })

  it('si descubrir falla, no manda nada y cierra la sesión igual', async () => {
    mockDiscover.mockResolvedValue(err('repository-failed'))

    const result = await runPaymentReminderCycle()

    expect(isErr(result)).toBe(true)
    expect(mockSend).not.toHaveBeenCalled()
    expect(mockCloseSystemClient).toHaveBeenCalledTimes(1)
  })
})
