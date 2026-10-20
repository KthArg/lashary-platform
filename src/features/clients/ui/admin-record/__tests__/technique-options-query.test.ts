import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readTechniqueOptions } from '../queries/record-queries'
import { RECORD_ERROR_MESSAGES } from '../constants/record-strings'

const mocks = vi.hoisted(() => ({ requireAdminSession: vi.fn(), listActiveCatalogTechniques: vi.fn() }))

vi.mock('@/features/auth', () => ({ requireAdminSession: mocks.requireAdminSession }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/features/clients/http/record/record-gateways', () => ({
  auditRecordLog: vi.fn(),
  catalogTechniqueLookup: { findActiveTechnique: vi.fn() },
  listActiveCatalogTechniques: mocks.listActiveCatalogTechniques,
}))

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireAdminSession.mockResolvedValue({ user: { id: 'admin-1' }, role: 'admin' })
})

describe('readTechniqueOptions — el menú de técnicas del formulario', () => {
  it('devuelve las técnicas activas', async () => {
    mocks.listActiveCatalogTechniques.mockResolvedValue([{ id: 'technique-1', name: 'Clásicas' }])
    expect(await readTechniqueOptions()).toEqual({ ok: true, techniques: [{ id: 'technique-1', name: 'Clásicas' }] })
  })

  it('si catalog falla, lo avisa en vez de romper la página', async () => {
    mocks.listActiveCatalogTechniques.mockRejectedValue(new Error('caída'))
    expect(await readTechniqueOptions()).toEqual({ ok: false, error: RECORD_ERROR_MESSAGES.techniquesUnavailable })
  })

  it('sin sesión de administradora no lista nada', async () => {
    mocks.requireAdminSession.mockRejectedValue(new Error('NEXT_REDIRECT'))
    await expect(readTechniqueOptions()).rejects.toThrow('NEXT_REDIRECT')
    expect(mocks.listActiveCatalogTechniques).not.toHaveBeenCalled()
  })
})
