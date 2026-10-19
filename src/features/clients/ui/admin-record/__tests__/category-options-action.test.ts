import { describe, it, expect, vi, beforeEach } from 'vitest'
import { listCategoryOptionsAction } from '../actions/record-actions'
import { RECORD_ERROR_MESSAGES } from '../constants/record-strings'

const mocks = vi.hoisted(() => ({ requireAdminSession: vi.fn(), listPrecautionCategories: vi.fn() }))

vi.mock('@/features/auth', () => ({ requireAdminSession: mocks.requireAdminSession }))
vi.mock('../../../db/record/precaution-category-repository', () => ({
  precautionCategoryLookup: vi.fn(),
  listPrecautionCategories: mocks.listPrecautionCategories,
}))

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireAdminSession.mockResolvedValue({ user: { id: 'admin-1' }, role: 'admin' })
})

describe('listCategoryOptionsAction — el menú de categorías de antecedentes', () => {
  it('devuelve las categorías', async () => {
    mocks.listPrecautionCategories.mockResolvedValue([{ id: 'category-1', name: 'Alergia' }])
    expect(await listCategoryOptionsAction()).toEqual({ ok: true, categories: [{ id: 'category-1', name: 'Alergia' }] })
  })

  it('si la lectura falla, lo avisa en vez de romper la página', async () => {
    mocks.listPrecautionCategories.mockRejectedValue(new Error('caída'))
    expect(await listCategoryOptionsAction()).toEqual({ ok: false, error: RECORD_ERROR_MESSAGES.categoriesUnavailable })
  })
})
