import type { Promotion, PromotionTarget } from '../../domain/promotions/promotion'

export type ListPromotionsQuery = {
  page?: number
  pageSize?: number
}

export type PromotionWriteModel = {
  target: PromotionTarget
  discountPercent: number
  startsAt: Date
  endsAt: Date
}

export interface PromotionRepository {
  list(params: { offset: number; limit: number }): Promise<{ items: Promotion[]; total: number }>

  // Criterios 2 y 3: solo promociones activas y dentro de su ventana en `now` (inyectado,
  // DOM-004). El filtro corre en la base, no trayendo todo para filtrar en memoria (PERF-005).
  listActive(
    now: Date,
    params: { offset: number; limit: number },
  ): Promise<{ items: Promotion[]; total: number }>

  findById(id: string): Promise<Promotion | null>

  save(promotion: Promotion): Promise<void>
}
