import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ok, err, isOk, isErr } from '@/shared/result'
import { buildReapplicationDiscoveryDeps, runReapplicationReminderCycle } from '../index'

const mockCreateSystemClient = vi.fn()
const mockCloseSystemClient = vi.fn()
const mockAnticipationDays = vi.fn()
const mockListCandidates = vi.fn()
const mockListTechniques = vi.fn()
const mockStatesFor = vi.fn()
const mockGetContact = vi.fn()
const mockReminderRepo = vi.fn()
const mockDiscover = vi.fn()
const mockSend = vi.fn()

vi.mock('@/shared/lib/supabase/system', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/lib/supabase/system')>()),
  createSystemClient: (...args: unknown[]) => mockCreateSystemClient(...args),
  closeSystemClient: (...args: unknown[]) => mockCloseSystemClient(...args),
}))
vi.mock('../db/reapplication-settings-repository', () => ({
  reapplicationSettingsRepository: () => ({ anticipationDays: () => mockAnticipationDays() }),
}))
vi.mock('../db/reapplication-reminder-repository', () => ({
  reapplicationReminderRepository: (...args: unknown[]) => mockReminderRepo(...args),
}))
vi.mock('../db/delinquency-states-gateway', () => ({
  delinquencyStatesGateway: () => ({ statesFor: (...args: unknown[]) => mockStatesFor(...args) }),
}))
vi.mock('@/features/scheduling', () => ({
  listSchedulingReapplicationCandidates: (...args: unknown[]) => mockListCandidates(...args),
  SCHEDULING_MY_APPOINTMENTS_PATH: '/portal/citas/mis-citas',
}))
vi.mock('@/features/catalog', () => ({
  listTechniquesForReapplication: (...args: unknown[]) => mockListTechniques(...args),
}))
vi.mock('@/features/clients', () => ({
  getClientContactForReminders: (...args: unknown[]) => mockGetContact(...args),
}))
vi.mock('../channels/meta-whatsapp-channel', () => ({
  metaWhatsAppChannel: () => ({ kind: 'whatsapp', send: vi.fn() }),
  readMetaWhatsAppConfigFromEnv: () => null,
}))
vi.mock('../channels/resend-email-channel', () => ({
  resendEmailChannel: () => ({ kind: 'email', send: vi.fn() }),
  readResendEmailConfigFromEnv: () => null,
}))
vi.mock('../application/discover-reapplication-reminders', () => ({
  discoverDueReapplications: (...args: unknown[]) => mockDiscover(...args),
}))
vi.mock('../application/send-due-reapplications', () => ({
  sendDueReapplications: (deps: unknown) => (due: unknown) => mockSend(deps, due),
}))

const FAKE_DB = { fake: 'client' }
const DUE_REMINDERS = [{ clientId: 'client-1', techniqueId: 'tecnica-1', techniqueName: 'Clásico', lastCompletedAt: new Date(), dueAt: new Date() }]
const SEND_SUMMARY = { sent: 1, retried: 0, exhausted: 0, skipped: 0, errored: 0 }

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('NOTIFICATIONS_CRON_EMAIL', 'cron@lashary.example')
  vi.stubEnv('NOTIFICATIONS_CRON_PASSWORD', 'placeholder-clave-de-prueba')
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  mockCreateSystemClient.mockResolvedValue(ok(FAKE_DB))
  mockAnticipationDays.mockResolvedValue(ok(14))
  mockListCandidates.mockResolvedValue(ok([]))
  mockListTechniques.mockResolvedValue({ items: [] })
  mockStatesFor.mockResolvedValue(ok(new Map()))
  mockReminderRepo.mockResolvedValue({ listRecords: vi.fn(), recordSent: vi.fn(), recordFailed: vi.fn() })
  mockDiscover.mockResolvedValue(ok(DUE_REMINDERS))
  mockSend.mockResolvedValue(ok(SEND_SUMMARY))
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('buildReapplicationDiscoveryDeps', () => {
  it('con la anticipación configurada, arma los deps con ese valor', async () => {
    const result = await buildReapplicationDiscoveryDeps(FAKE_DB as never)

    expect(isOk(result)).toBe(true)
    if (isOk(result)) expect(result.value.anticipationDays).toBe(14)
  })

  it('si falla la lectura de la anticipación configurada, aborta en vez de usar el valor por defecto', async () => {
    mockAnticipationDays.mockResolvedValue(err('repository-failed'))

    const result = await buildReapplicationDiscoveryDeps(FAKE_DB as never)

    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error).toBe('repository-failed')
  })

  it('delega listCandidates en la candidatas de scheduling', async () => {
    const result = await buildReapplicationDiscoveryDeps(FAKE_DB as never)
    if (!isOk(result)) return

    await result.value.listCandidates()

    expect(mockListCandidates).toHaveBeenCalledWith(FAKE_DB)
  })
})

describe('runReapplicationReminderCycle', () => {
  it('sin la cuenta de sistema configurada, no entra a la base', async () => {
    vi.stubEnv('NOTIFICATIONS_CRON_EMAIL', '')

    const result = await runReapplicationReminderCycle()

    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error).toBe('system-client-not-configured')
    expect(mockCreateSystemClient).not.toHaveBeenCalled()
  })

  it('si la cuenta de sistema no puede entrar, propaga el error', async () => {
    mockCreateSystemClient.mockResolvedValue(err('system-client-sign-in-failed'))

    const result = await runReapplicationReminderCycle()

    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error).toBe('system-client-sign-in-failed')
  })

  it('si falla la anticipación configurada, aborta antes de descubrir o mandar nada, y cierra la sesión', async () => {
    mockAnticipationDays.mockResolvedValue(err('repository-failed'))

    const result = await runReapplicationReminderCycle()

    expect(isErr(result)).toBe(true)
    expect(mockDiscover).not.toHaveBeenCalled()
    expect(mockSend).not.toHaveBeenCalled()
    expect(mockCloseSystemClient).toHaveBeenCalledTimes(1)
  })

  it('con todo en orden, descubre y manda, y devuelve el resumen del envío', async () => {
    const result = await runReapplicationReminderCycle()

    expect(isOk(result)).toBe(true)
    if (isOk(result)) expect(result.value).toEqual(SEND_SUMMARY)
    expect(mockSend).toHaveBeenCalledWith(expect.anything(), DUE_REMINDERS)
    expect(mockCloseSystemClient).toHaveBeenCalledTimes(1)
  })

  it('si descubrir falla, no manda nada y cierra la sesión igual', async () => {
    mockDiscover.mockResolvedValue(err('repository-failed'))

    const result = await runReapplicationReminderCycle()

    expect(isErr(result)).toBe(true)
    expect(mockSend).not.toHaveBeenCalled()
    expect(mockCloseSystemClient).toHaveBeenCalledTimes(1)
  })
})
