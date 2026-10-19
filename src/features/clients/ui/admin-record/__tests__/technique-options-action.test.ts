import { describe, it, expect, vi, beforeEach } from 'vitest'
import { listTechniqueOptionsAction } from '../actions/record-actions'
import { RECORD_ERROR_MESSAGES } from '../constants/record-strings'

const mocks = vi.hoisted(() => ({ requireAdminSession: vi.fn(), listActiveCatalogTechniques: vi.fn() }))

vi.mock('@/features/auth', () => ({ requireAdminSession: mocks.requireAdminSession }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('../../../application/record/record-gateways', () => ({
  auditRecordLog: vi.fn(),
  catalogTechniqueLookup: { findActiveTechnique: vi.fn() },
  listActiveCatalogTechniques: mocks.listActiveCatalogTechniques,
}))

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireAdminSession.mockResolvedValue({ user: { id: 'admin-1' }, role: 'admin' })
})

describe('listTechniqueOptionsAction — el menú de técnicas del formulario', () => {
  it('devuelve las técnicas activas', async () => {
    mocks.listActiveCatalogTechniques.mockResolvedValue([{ id: 'technique-1', name: 'Clásicas' }])
    expect(await listTechniqueOptionsAction()).toEqual({ ok: true, techniques: [{ id: 'technique-1', name: 'Clásicas' }] })
  })

  it('si catalog falla, lo avisa en vez de romper la página', async () => {
    mocks.listActiveCatalogTechniques.mockRejectedValue(new Error('caída'))
    expect(await listTechniqueOptionsAction()).toEqual({ ok: false, error: RECORD_ERROR_MESSAGES.techniquesUnavailable })
  })

  it('sin sesión de administradora no lista nada', async () => {
    mocks.requireAdminSession.mockRejectedValue(new Error('NEXT_REDIRECT'))
    await expect(listTechniqueOptionsAction()).rejects.toThrow('NEXT_REDIRECT')
    expect(mocks.listActiveCatalogTechniques).not.toHaveBeenCalled()
  })
})
