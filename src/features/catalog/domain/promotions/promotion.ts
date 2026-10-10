import { ok, err, type Result } from '@/shared/result'
import { promotionValidationError, type PromotionValidationError } from './errors'

// El servicio aplicable (criterio 1): exactamente una técnica o exactamente un paquete, nunca
// ambos ni ninguno — unión discriminada en vez de dos campos nulleables sueltos.
export type PromotionTarget =
  | { type: 'technique'; techniqueId: string }
  | { type: 'package'; packageId: string }

export type PromotionView = {
  id: string
  target: PromotionTarget
  discountPercent: number
  startsAt: string
  endsAt: string
  isActive: boolean
}

export type PromotionInput = {
  id: string
  target: PromotionTarget
  discountPercent: number
  startsAt: Date
  endsAt: Date
  isActive?: boolean
}

const promotionBrand: unique symbol = Symbol('Promotion')

export interface Promotion {
  readonly [promotionBrand]: true
  readonly id: string
  readonly target: PromotionTarget
  readonly discountPercent: number
  readonly startsAt: Date
  readonly endsAt: Date
  readonly isActive: boolean
}

export function buildPromotion(input: PromotionInput): Result<Promotion, PromotionValidationError> {
  const problems: string[] = []

  if (input.target.type === 'technique' && input.target.techniqueId.trim().length === 0) {
    problems.push('la técnica aplicable no puede estar vacía')
  }
  if (input.target.type === 'package' && input.target.packageId.trim().length === 0) {
    problems.push('el paquete aplicable no puede estar vacío')
  }

  if (
    !Number.isInteger(input.discountPercent) ||
    input.discountPercent <= 0 ||
    input.discountPercent > 100
  ) {
    problems.push('el descuento debe ser un entero entre 1 y 100')
  }

  if (!(input.endsAt.getTime() > input.startsAt.getTime())) {
    problems.push('la vigencia debe terminar después de empezar')
  }

  if (problems.length > 0) {
    return err(promotionValidationError(problems))
  }

  return ok({
    [promotionBrand]: true,
    id: input.id,
    target: input.target,
    discountPercent: input.discountPercent,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    isActive: input.isActive ?? true,
  })
}

export function markPromotionInactive(promotion: Promotion): Promotion {
  return { ...promotion, isActive: false }
}

export function promotionToView(promotion: Promotion): PromotionView {
  return {
    id: promotion.id,
    target: promotion.target,
    discountPercent: promotion.discountPercent,
    startsAt: promotion.startsAt.toISOString(),
    endsAt: promotion.endsAt.toISOString(),
    isActive: promotion.isActive,
  }
}

// Criterio 3 — "una promoción vencida deja de aplicarse automáticamente": pura, recibe `now`
// en vez de llamarlo (DOM-004). El llamador (capa de aplicación) inyecta el reloj.
export function isPromotionCurrentlyActive(promotion: Promotion, now: Date): boolean {
  return (
    promotion.isActive &&
    now.getTime() >= promotion.startsAt.getTime() &&
    now.getTime() <= promotion.endsAt.getTime()
  )
}
