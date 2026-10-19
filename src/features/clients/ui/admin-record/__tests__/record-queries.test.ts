import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ok } from '@/shared/result'
import { readRecord } from '../queries/record-queries'
import { RECORD_ERROR_MESSAGES } from '../constants/record-strings'
import { fakeRecordRepository, initialVersion } from '@/features/clients/application/__tests__/record-fakes'
import { ALLERGY } from '@/features/clients/domain/record/__tests__/record-fixtures'
import type { RecordAuditEvent } from '@/features/clients/application/record/record-ports'

const CLIENT_ID = '11111111-1111-4111-8111-111111111111'
const MISSING_ID = '99999999-9999-4999-8999-999999999999'
const ADMIN_ID = '22222222-2222-4222-8222-222222222222'

const mocks = vi.hoisted(() => ({
  requireAdminSession: vi.fn(),
  auditSucceeds: true,
  auditEvents: [] as unknown[],
  store: null as unknown as ReturnType<typeof fakeRecordRepository>,
}))

vi.mock('@/features/auth', () => ({ requireAdminSession: mocks.requireAdminSession }))
vi.mock('@/features/clients/db/record/record-repository', () => ({ recordRepository: async () => mocks.store.repo }))
vi.mock('@/features/clients/db/record/record-image-storage', () => ({ signRecordImageUrls: async () => ({}) }))
vi.mock('@/features/clients/db/record/precaution-category-repository', () => ({ listPrecautionCategories: async () => [] }))
vi.mock('@/features/clients/db/client-repository', () => ({
  clientRepository: async () => ({ findById: async (id: string) => ok(id === CLIENT_ID ? { id } : null) }),
}))
vi.mock('@/features/clients/http/record/record-gateways', () => ({
  listActiveCatalogTechniques: async () => [],
  auditRecordLog: async (event: RecordAuditEvent) => {
    mocks.auditEvents.push(event)
    return mocks.auditSucceeds
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
  mocks.store = fakeRecordRepository([{ ...initialVersion(), clientId: CLIENT_ID }])
  mocks.auditSucceeds = true
  mocks.auditEvents.length = 0
  mocks.requireAdminSession.mockResolvedValue({ user: { id: ADMIN_ID }, role: 'admin' })
})

describe('readRecord — leer el expediente fuera de las server actions (criterio 3, M6)', () => {
  it('registra el acceso con la admin de la sesión y devuelve datos planos, con el registro inicial', async () => {
    const result = await readRecord(CLIENT_ID)
    if (!result.ok) throw new Error('debería leer')
    expect(mocks.auditEvents).toEqual([{ clientId: CLIENT_ID, actorId: ADMIN_ID, action: 'clients.record.viewed' }])
    expect(result.current?.precautions).toEqual([ALLERGY])
    expect(result.initial?.createdAt).toBe('2026-10-17T15:00:00.000Z')
    expect(Object.getOwnPropertySymbols(result.current)).toEqual([])
  })

  it('si la bitácora falla, muestra el aviso y no el expediente', async () => {
    mocks.auditSucceeds = false
    expect(await readRecord(CLIENT_ID)).toEqual({ ok: false, error: RECORD_ERROR_MESSAGES.auditFailed })
  })

  it('una clienta que no existe da no encontrada sin dejar un acceso en la bitácora', async () => {
    expect(await readRecord(MISSING_ID)).toMatchObject({ ok: false, notFound: true })
    expect(mocks.auditEvents).toEqual([])
  })

  it('un id mal formado da no encontrada sin consultar nada', async () => {
    expect(await readRecord('../otra')).toMatchObject({ ok: false, notFound: true })
    expect(mocks.requireAdminSession).toHaveBeenCalled()
    expect(mocks.auditEvents).toEqual([])
  })

  it('sin sesión de administradora no lee nada', async () => {
    mocks.requireAdminSession.mockRejectedValue(new Error('NEXT_REDIRECT'))
    await expect(readRecord(CLIENT_ID)).rejects.toThrow('NEXT_REDIRECT')
    expect(mocks.auditEvents).toEqual([])
  })
})
