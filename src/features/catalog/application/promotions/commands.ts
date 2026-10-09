import { ok, err, isErr, type Result } from '@/shared/result'
import {
  buildPromotion,
  markPromotionInactive,
  promotionToView,
  type Promotion,
  type PromotionView,
} from '../../domain/promotions/promotion'
import {
  promotionNotFound,
  promotionValidationError,
  type PromotionNotFound,
  type PromotionValidationError,
} from '../../domain/promotions/errors'
import type { TechniqueRepository } from '../techniques/ports'
import type { PackageRepository } from '../packages/ports'
import type { PromotionRepository, PromotionWriteModel } from './ports'

export type PromotionCommandDeps = {
  promotionRepo: PromotionRepository
  techniqueRepo: TechniqueRepository
  packageRepo: PackageRepository
  newId: () => string
}

async function resolveTarget(
  deps: PromotionCommandDeps,
  target: PromotionWriteModel['target'],
): Promise<Result<void, PromotionValidationError>> {
  if (target.type === 'technique') {
    const technique = await deps.techniqueRepo.findById(target.techniqueId)
    if (technique === null) {
      return err(promotionValidationError([`no existe la técnica ${target.techniqueId}`]))
    }
    if (!technique.isActive) {
      return err(promotionValidationError([`la técnica ${target.techniqueId} no está activa`]))
    }
    return ok(undefined)
  }

  const pkg = await deps.packageRepo.findById(target.packageId)
  if (pkg === null) {
    return err(promotionValidationError([`no existe el paquete ${target.packageId}`]))
  }
  if (!pkg.pkg.isActive) {
    return err(promotionValidationError([`el paquete ${target.packageId} no está activo`]))
  }
  return ok(undefined)
}

function buildFromModel(
  id: string,
  model: PromotionWriteModel,
  isActive: boolean,
): Result<Promotion, PromotionValidationError> {
  return buildPromotion({
    id,
    target: model.target,
    discountPercent: model.discountPercent,
    startsAt: model.startsAt,
    endsAt: model.endsAt,
    isActive,
  })
}

export const createPromotion =
  (deps: PromotionCommandDeps) =>
  async (model: PromotionWriteModel): Promise<Result<PromotionView, PromotionValidationError>> => {
    const resolved = await resolveTarget(deps, model.target)
    if (isErr(resolved)) return resolved

    const built = buildFromModel(deps.newId(), model, true)
    if (isErr(built)) return built
    await deps.promotionRepo.save(built.value)
    return ok(promotionToView(built.value))
  }

export const updatePromotion =
  (deps: PromotionCommandDeps) =>
  async (
    id: string,
    model: PromotionWriteModel,
  ): Promise<Result<PromotionView, PromotionNotFound | PromotionValidationError>> => {
    const existing = await deps.promotionRepo.findById(id)
    if (existing === null) return err(promotionNotFound(id))

    const resolved = await resolveTarget(deps, model.target)
    if (isErr(resolved)) return resolved

    const built = buildFromModel(id, model, existing.isActive)
    if (isErr(built)) return built
    await deps.promotionRepo.save(built.value)
    return ok(promotionToView(built.value))
  }

export const deactivatePromotion =
  (deps: PromotionCommandDeps) =>
  async (id: string): Promise<Result<PromotionView, PromotionNotFound>> => {
    const existing = await deps.promotionRepo.findById(id)
    if (existing === null) return err(promotionNotFound(id))

    const deactivated = markPromotionInactive(existing)
    await deps.promotionRepo.save(deactivated)
    return ok(promotionToView(deactivated))
  }
