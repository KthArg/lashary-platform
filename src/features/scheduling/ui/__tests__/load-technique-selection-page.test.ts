import { describe, it, expect, vi, beforeEach } from 'vitest'
import { loadTechniqueSelectionPageData } from '../load-technique-selection-page'

const mockGetAuthSession = vi.fn()
const mockListTechniques = vi.fn()
const mockListPackages = vi.fn()

vi.mock('@/features/auth', () => ({
  getAuthSession: () => mockGetAuthSession(),
  AUTH_ROLES: { SUPERADMIN: 'superadmin', ADMIN: 'admin', CLIENTE: 'cliente' },
}))
vi.mock('@/features/catalog', () => ({
  listTechniques: (query: unknown) => mockListTechniques(query),
  listPackages: (query: unknown) => mockListPackages(query),
}))

beforeEach(() => {
  vi.clearAllMocks()
  mockListPackages.mockResolvedValue({ items: [], page: 1, pageSize: 100, total: 0 })
})

describe('loadTechniqueSelectionPageData', () => {
  it('sin sesión de clienta: forbidden, sin consultar el catálogo', async () => {
    mockGetAuthSession.mockResolvedValue(null)

    const data = await loadTechniqueSelectionPageData()

    expect(data).toEqual({ status: 'forbidden' })
    expect(mockListTechniques).not.toHaveBeenCalled()
    expect(mockListPackages).not.toHaveBeenCalled()
  })

  it('sesión de administradora: forbidden (esta ruta es de clientas)', async () => {
    mockGetAuthSession.mockResolvedValue({ user: { id: 'u1' }, role: 'admin' })

    const data = await loadTechniqueSelectionPageData()

    expect(data).toEqual({ status: 'forbidden' })
  })

  it('sesión de clienta: pide técnicas y paquetes activos y los mapea', async () => {
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
    mockListPackages.mockResolvedValue({
      items: [{ id: 'p1', name: 'Combo clásicas', durationTotalMin: 110, price: 1, extra: 'ignorado' }],
      page: 1,
      pageSize: 100,
      total: 1,
    })

    const data = await loadTechniqueSelectionPageData()

    expect(mockListTechniques).toHaveBeenCalledWith({ activeOnly: true, pageSize: 100 })
    expect(mockListPackages).toHaveBeenCalledWith({ activeOnly: true, pageSize: 100 })
    expect(data).toEqual({
      status: 'ok',
      techniques: [
        { id: 't1', name: 'Volumen ruso' },
        { id: 't2', name: 'Laminado de cejas' },
      ],
      packages: [{ id: 'p1', name: 'Combo clásicas', durationTotalMin: 110 }],
    })
  })
})
