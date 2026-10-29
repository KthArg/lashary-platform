import { describe, it, expect, vi, beforeEach } from 'vitest'
import { loadTechniqueSelectionPageData } from '../load-technique-selection-page'

const mockGetAuthSession = vi.fn()
const mockListTechniques = vi.fn()

vi.mock('@/features/auth', () => ({
  getAuthSession: () => mockGetAuthSession(),
  AUTH_ROLES: { SUPERADMIN: 'superadmin', ADMIN: 'admin', CLIENTE: 'cliente' },
}))
vi.mock('@/features/catalog', () => ({ listTechniques: (query: unknown) => mockListTechniques(query) }))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('loadTechniqueSelectionPageData', () => {
  it('sin sesión de clienta: forbidden, sin consultar el catálogo', async () => {
    mockGetAuthSession.mockResolvedValue(null)

    const data = await loadTechniqueSelectionPageData()

    expect(data).toEqual({ status: 'forbidden' })
    expect(mockListTechniques).not.toHaveBeenCalled()
  })

  it('sesión de administradora: forbidden (esta ruta es de clientas)', async () => {
    mockGetAuthSession.mockResolvedValue({ user: { id: 'u1' }, role: 'admin' })

    const data = await loadTechniqueSelectionPageData()

    expect(data).toEqual({ status: 'forbidden' })
  })

  it('sesión de clienta: pide técnicas activas y las mapea a id/nombre', async () => {
    mockGetAuthSession.mockResolvedValue({ user: { id: 'u1' }, role: 'cliente' })
    mockListTechniques.mockResolvedValue({
      items: [
        { id: 't1', name: 'Volumen ruso', priceFirstTime: 1, extra: 'ignorado' },
        { id: 't2', name: 'Laminado de cejas' },
      ],
      page: 1,
      pageSize: 100,
      total: 2,
    })

    const data = await loadTechniqueSelectionPageData()

    expect(mockListTechniques).toHaveBeenCalledWith({ activeOnly: true, pageSize: 100 })
    expect(data).toEqual({
      status: 'ok',
      techniques: [
        { id: 't1', name: 'Volumen ruso' },
        { id: 't2', name: 'Laminado de cejas' },
      ],
    })
  })
})
