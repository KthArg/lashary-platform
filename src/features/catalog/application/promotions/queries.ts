import { ok, err, type Result } from '@/shared/result'
import {
  isPromotionCurrentlyActive,
  promotionToView,
  type PromotionView,
} from '../../domain/promotions/promotion'
import { promotionNotFound, type PromotionNotFound } from '../../domain/promotions/errors'
import { clampPage, clampPageSize, type Page } from '../pagination'
import type { ListPromotionsQuery, PromotionRepository } from './ports'

export type PromotionListItem = PromotionView & { isCurrentlyActive: boolean }

// Listado completo para el panel de administración: incluye vencidas y pausadas, con
// `isCurrentlyActive` calculado contra `now` (inyectado por el llamador, DOM-004) para que la
// tabla pueda mostrar "vigente" / "vencida" sin recalcular la fecha ella misma.
export const listPromotions =
  (repo: PromotionRepository) =>
  (now: Date) =>
  async (query: ListPromotionsQuery = {}): Promise<Page<PromotionListItem>> => {
    const page = clampPage(query.page)
    const pageSize = clampPageSize(query.pageSize)
    const { items, total } = await repo.list({
      offset: (page - 1) * pageSize,
      limit: pageSize,
    })
    return {
      items: items.map((promotion) => ({
        ...promotionToView(promotion),
        isCurrentlyActive: isPromotionCurrentlyActive(promotion, now),
      })),
      page,
      pageSize,
      total,
    }
  }

// Criterios 2 (landing / flujo de agendamiento) y 3 (una promoción vencida deja de aplicarse
// automáticamente): solo devuelve lo que está vigente ahora mismo contra `now`, sin que nadie
// tenga que desactivarla a mano cuando pasa su ends_at.
export const listActivePromotions =
  (repo: PromotionRepository) =>
  (now: Date) =>
  async (query: ListPromotionsQuery = {}): Promise<Page<PromotionView>> => {
    const page = clampPage(query.page)
    const pageSize = clampPageSize(query.pageSize)
    const { items, total } = await repo.listActive(now, {
      offset: (page - 1) * pageSize,
      limit: pageSize,
    })
    return { items: items.map(promotionToView), page, pageSize, total }
  }

export const getPromotion =
  (repo: PromotionRepository) =>
  async (id: string): Promise<Result<PromotionView, PromotionNotFound>> => {
    const promotion = await repo.findById(id)
    if (promotion === null) return err(promotionNotFound(id))
    return ok(promotionToView(promotion))
  }
