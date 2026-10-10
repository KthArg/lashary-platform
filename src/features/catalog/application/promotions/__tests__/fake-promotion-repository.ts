import type { Promotion } from '@/features/catalog/domain/promotions/promotion'
import { isPromotionCurrentlyActive } from '@/features/catalog/domain/promotions/promotion'
import type { PromotionRepository } from '@/features/catalog/application/promotions/ports'

export function createFakePromotionRepository(
  initial: Promotion[] = [],
): PromotionRepository & { readonly saveCalls: number } {
  const store = new Map<string, Promotion>()
  for (const promotion of initial) store.set(promotion.id, promotion)
  let saveCalls = 0

  return {
    get saveCalls() {
      return saveCalls
    },

    async list(params: { offset: number; limit: number }) {
      const all = [...store.values()].sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime())
      return {
        items: all.slice(params.offset, params.offset + params.limit),
        total: all.length,
      }
    },

    async listActive(now: Date, params: { offset: number; limit: number }) {
      const all = [...store.values()]
        .filter((promotion) => isPromotionCurrentlyActive(promotion, now))
        .sort((a, b) => a.endsAt.getTime() - b.endsAt.getTime())
      return {
        items: all.slice(params.offset, params.offset + params.limit),
        total: all.length,
      }
    },

    async findById(id: string) {
      return store.get(id) ?? null
    },

    async save(promotion: Promotion) {
      saveCalls += 1
      store.set(promotion.id, promotion)
    },
  }
}
