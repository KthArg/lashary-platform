import { describe, it, expect } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import { listPromotions, listActivePromotions, getPromotion } from '@/features/catalog/application/promotions/queries'
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '@/features/catalog/application/pagination'
import { isPromotionNotFound } from '@/features/catalog/domain/promotions/errors'
import { createFakePromotionRepository } from './fake-promotion-repository'
import { makePromotion } from './promotion-fixture'

const NOW = new Date('2026-01-15T00:00:00Z')
const PAST = new Date('2027-01-01T00:00:00Z')

describe('listPromotions', () => {
  it('lista todas (vigentes, vencidas y pausadas) con isCurrentlyActive calculado (criterio 3)', async () => {
    const repo = createFakePromotionRepository([
      makePromotion({ id: 'vigente', isActive: true }),
      makePromotion({ id: 'pausada', isActive: false }),
    ])
    const page = await listPromotions(repo)(NOW)()
    expect(page.total).toBe(2)
    const byId = new Map(page.items.map((item) => [item.id, item]))
    expect(byId.get('vigente')?.isCurrentlyActive).toBe(true)
    expect(byId.get('pausada')?.isCurrentlyActive).toBe(false)
  })

  it('una promoción vencida aparece en el listado completo con isCurrentlyActive=false', async () => {
    const repo = createFakePromotionRepository([makePromotion({ id: 'vencida', isActive: true })])
    const page = await listPromotions(repo)(PAST)()
    expect(page.items[0].isCurrentlyActive).toBe(false)
  })

  it('pagina con el tamaño por defecto y respeta el tope', async () => {
    const repo = createFakePromotionRepository(
      Array.from({ length: MAX_PAGE_SIZE + 5 }, (_, i) => makePromotion({ id: `p${i}` })),
    )
    const first = await listPromotions(repo)(NOW)({ page: 1 })
    expect(first.items).toHaveLength(DEFAULT_PAGE_SIZE)
    const capped = await listPromotions(repo)(NOW)({ pageSize: MAX_PAGE_SIZE * 10 })
    expect(capped.pageSize).toBe(MAX_PAGE_SIZE)
  })
})

describe('listActivePromotions — criterios 2 y 3', () => {
  it('solo devuelve promociones vigentes ahora', async () => {
    const repo = createFakePromotionRepository([
      makePromotion({ id: 'vigente', isActive: true }),
      makePromotion({ id: 'pausada', isActive: false }),
    ])
    const page = await listActivePromotions(repo)(NOW)()
    expect(page.items.map((item) => item.id)).toEqual(['vigente'])
  })

  it('una promoción vencida deja de aparecer automáticamente, sin desactivarla a mano', async () => {
    const repo = createFakePromotionRepository([makePromotion({ id: 'ahora-vencida', isActive: true })])

    const whenActive = await listActivePromotions(repo)(NOW)()
    expect(whenActive.items.map((item) => item.id)).toEqual(['ahora-vencida'])

    const whenExpired = await listActivePromotions(repo)(PAST)()
    expect(whenExpired.items).toHaveLength(0)
  })

  it('una promoción aún no vigente (antes de startsAt) no aparece', async () => {
    const repo = createFakePromotionRepository([makePromotion({ id: 'futura', isActive: true })])
    const before = await listActivePromotions(repo)(new Date('2025-01-01T00:00:00Z'))()
    expect(before.items).toHaveLength(0)
  })
})

describe('getPromotion', () => {
  it('devuelve la promoción cuando existe', async () => {
    const repo = createFakePromotionRepository([makePromotion({ id: 'x' })])
    const result = await getPromotion(repo)('x')
    expect(isOk(result)).toBe(true)
    if (isOk(result)) expect(result.value.id).toBe('x')
  })

  it('devuelve PromotionNotFound cuando no existe', async () => {
    const repo = createFakePromotionRepository([])
    const result = await getPromotion(repo)('nope')
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(isPromotionNotFound(result.error)).toBe(true)
      expect(result.error.promotionId).toBe('nope')
    }
  })
})
