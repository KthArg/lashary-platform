import { describe, it, expect, vi, beforeEach } from 'vitest'
import { loadTechniqueSelectionPageData } from '../load-technique-selection-page'
import { MAX_SELECTION_PAGE_SERVICES } from '../constants'

const mockGetAuthSession = vi.fn()
const mockListTechniques = vi.fn()
const mockListPackages = vi.fn()
const mockListActivePromotions = vi.fn()

vi.mock('@/features/auth', () => ({
  getAuthSession: () => mockGetAuthSession(),
  AUTH_ROLES: { SUPERADMIN: 'superadmin', ADMIN: 'admin', CLIENTE: 'cliente' },
}))
vi.mock('@/features/catalog', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/catalog')>()
  return {
    listTechniques: (query: unknown) => mockListTechniques(query),
    listPackages: (query: unknown) => mockListPackages(query),
    listActivePromotions: (query: unknown) => mockListActivePromotions(query),
    applyDiscount: actual.applyDiscount,
  }
})

beforeEach(() => {
  vi.clearAllMocks()
  mockListPackages.mockResolvedValue({ items: [], page: 1, pageSize: MAX_SELECTION_PAGE_SERVICES, total: 0 })
  mockListActivePromotions.mockResolvedValue({ items: [], page: 1, pageSize: MAX_SELECTION_PAGE_SERVICES, total: 0 })
})

describe('loadTechniqueSelectionPageData', () => {
  it('sin sesión de clienta: forbidden, sin consultar el catálogo', async () => {
    mockGetAuthSession.mockResolvedValue(null)

    const data = await loadTechniqueSelectionPageData()

    expect(data).toEqual({ status: 'forbidden' })
    expect(mockListTechniques).not.toHaveBeenCalled()
    expect(mockListPackages).not.toHaveBeenCalled()
    expect(mockListActivePromotions).not.toHaveBeenCalled()
  })

  it('sesión de administradora: forbidden (esta ruta es de clientas)', async () => {
    mockGetAuthSession.mockResolvedValue({ user: { id: 'u1' }, role: 'admin' })

    const data = await loadTechniqueSelectionPageData()

    expect(data).toEqual({ status: 'forbidden' })
  })

  it('sesión de clienta: pide técnicas, paquetes y promociones vigentes, y mapea técnicas', async () => {
    mockGetAuthSession.mockResolvedValue({ user: { id: 'u1' }, role: 'cliente' })
    mockListTechniques.mockResolvedValue({
      items: [
        { id: 't1', name: 'Volumen ruso', priceFirstTime: 1, extra: 'ignorado' },
        { id: 't2', name: 'Laminado de cejas' },
      ],
      page: 1,
      pageSize: MAX_SELECTION_PAGE_SERVICES,
      total: 2,
    })
    mockListPackages.mockResolvedValue({
      items: [{ id: 'p1', name: 'Combo clásicas', durationTotalMin: 110, price: 20000, techniqueIds: [] }],
      page: 1,
      pageSize: MAX_SELECTION_PAGE_SERVICES,
      total: 1,
    })

    const data = await loadTechniqueSelectionPageData()

    expect(mockListTechniques).toHaveBeenCalledWith({ activeOnly: true, pageSize: MAX_SELECTION_PAGE_SERVICES })
    expect(mockListPackages).toHaveBeenCalledWith({ activeOnly: true, pageSize: MAX_SELECTION_PAGE_SERVICES })
    expect(mockListActivePromotions).toHaveBeenCalledWith({ pageSize: MAX_SELECTION_PAGE_SERVICES })
    expect(data).toEqual({
      status: 'ok',
      techniques: [
        { id: 't1', name: 'Volumen ruso', discountPercent: null },
        { id: 't2', name: 'Laminado de cejas', discountPercent: null },
      ],
      packages: [
        {
          id: 'p1',
          name: 'Combo clásicas',
          durationTotalMin: 110,
          techniqueNames: [],
          price: 20000,
          discountPercent: null,
          priceDiscounted: null,
        },
      ],
    })
  })

  it('un paquete resuelve los nombres de sus técnicas incluidas, sin consultas nuevas (PERF-005)', async () => {
    mockGetAuthSession.mockResolvedValue({ user: { id: 'u1' }, role: 'cliente' })
    mockListTechniques.mockResolvedValue({
      items: [
        { id: 't1', name: 'Volumen ruso', discountPercent: null },
        { id: 't2', name: 'Laminado de cejas', discountPercent: null },
      ],
      page: 1,
      pageSize: MAX_SELECTION_PAGE_SERVICES,
      total: 2,
    })
    mockListPackages.mockResolvedValue({
      items: [
        {
          id: 'p1',
          name: 'Combo clásicas',
          durationTotalMin: 110,
          price: 20000,
          techniqueIds: ['t1', 't2'],
        },
      ],
      page: 1,
      pageSize: MAX_SELECTION_PAGE_SERVICES,
      total: 1,
    })

    const data = await loadTechniqueSelectionPageData()

    expect(data).toEqual({
      status: 'ok',
      techniques: [
        { id: 't1', name: 'Volumen ruso', discountPercent: null },
        { id: 't2', name: 'Laminado de cejas', discountPercent: null },
      ],
      packages: [
        {
          id: 'p1',
          name: 'Combo clásicas',
          durationTotalMin: 110,
          techniqueNames: ['Volumen ruso', 'Laminado de cejas'],
          price: 20000,
          discountPercent: null,
          priceDiscounted: null,
        },
      ],
    })
  })

  it('una técnica incluida que ya no está activa no revienta el mapeo: se omite su nombre', async () => {
    mockGetAuthSession.mockResolvedValue({ user: { id: 'u1' }, role: 'cliente' })
    mockListTechniques.mockResolvedValue({
      items: [{ id: 't1', name: 'Volumen ruso' }],
      page: 1,
      pageSize: MAX_SELECTION_PAGE_SERVICES,
      total: 1,
    })
    mockListPackages.mockResolvedValue({
      items: [
        {
          id: 'p1',
          name: 'Combo clásicas',
          durationTotalMin: 110,
          price: 20000,
          techniqueIds: ['t1', 'inactiva'],
        },
      ],
      page: 1,
      pageSize: MAX_SELECTION_PAGE_SERVICES,
      total: 1,
    })

    const data = await loadTechniqueSelectionPageData()

    expect(data.status).toBe('ok')
    if (data.status === 'ok') {
      expect(data.packages[0].techniqueNames).toEqual(['Volumen ruso'])
    }
  })

  it('un paquete con promoción vigente trae el descuento y el precio ya rebajado (D-PROM-3)', async () => {
    mockGetAuthSession.mockResolvedValue({ user: { id: 'u1' }, role: 'cliente' })
    mockListTechniques.mockResolvedValue({ items: [], page: 1, pageSize: MAX_SELECTION_PAGE_SERVICES, total: 0 })
    mockListPackages.mockResolvedValue({
      items: [{ id: 'p1', name: 'Combo clásicas', durationTotalMin: 110, price: 20000, techniqueIds: [] }],
      page: 1,
      pageSize: MAX_SELECTION_PAGE_SERVICES,
      total: 1,
    })
    mockListActivePromotions.mockResolvedValue({
      items: [
        { id: 'a', target: { type: 'package', packageId: 'p1' }, discountPercent: 10 },
        { id: 'b', target: { type: 'package', packageId: 'p1' }, discountPercent: 30 },
        { id: 'c', target: { type: 'technique', techniqueId: 't1' }, discountPercent: 99 },
      ],
      page: 1,
      pageSize: MAX_SELECTION_PAGE_SERVICES,
      total: 3,
    })

    const data = await loadTechniqueSelectionPageData()

    expect(data.status).toBe('ok')
    if (data.status === 'ok') {
      expect(data.packages[0].discountPercent).toBe(30)
      expect(data.packages[0].priceDiscounted).toBe(14000)
    }
  })

  it('el precio rebajado redondea al colón con el applyDiscount real de catalog (DOM-001)', async () => {
    mockGetAuthSession.mockResolvedValue({ user: { id: 'u1' }, role: 'cliente' })
    mockListTechniques.mockResolvedValue({ items: [], page: 1, pageSize: MAX_SELECTION_PAGE_SERVICES, total: 0 })
    mockListPackages.mockResolvedValue({
      items: [{ id: 'p1', name: 'Combo clásicas', durationTotalMin: 110, price: 12345, techniqueIds: [] }],
      page: 1,
      pageSize: MAX_SELECTION_PAGE_SERVICES,
      total: 1,
    })
    mockListActivePromotions.mockResolvedValue({
      items: [{ id: 'a', target: { type: 'package', packageId: 'p1' }, discountPercent: 15 }],
      page: 1,
      pageSize: MAX_SELECTION_PAGE_SERVICES,
      total: 1,
    })

    const data = await loadTechniqueSelectionPageData()

    expect(data.status).toBe('ok')
    if (data.status === 'ok') {
      expect(data.packages[0].priceDiscounted).toBe(10493)
    }
  })

  it('una técnica con promoción vigente trae su descuento; las demás, null (US-PROM-02, criterio 2)', async () => {
    mockGetAuthSession.mockResolvedValue({ user: { id: 'u1' }, role: 'cliente' })
    mockListTechniques.mockResolvedValue({
      items: [
        { id: 't1', name: 'Volumen ruso' },
        { id: 't2', name: 'Laminado de cejas' },
      ],
      page: 1,
      pageSize: MAX_SELECTION_PAGE_SERVICES,
      total: 2,
    })
    mockListActivePromotions.mockResolvedValue({
      items: [
        { id: 'a', target: { type: 'technique', techniqueId: 't1' }, discountPercent: 10 },
        { id: 'b', target: { type: 'technique', techniqueId: 't1' }, discountPercent: 25 },
        { id: 'c', target: { type: 'package', packageId: 't2' }, discountPercent: 50 },
      ],
      page: 1,
      pageSize: MAX_SELECTION_PAGE_SERVICES,
      total: 3,
    })

    const data = await loadTechniqueSelectionPageData()

    expect(data.status).toBe('ok')
    if (data.status === 'ok') {
      expect(data.techniques).toEqual([
        { id: 't1', name: 'Volumen ruso', discountPercent: 25 },
        { id: 't2', name: 'Laminado de cejas', discountPercent: null },
      ])
    }
  })
})
