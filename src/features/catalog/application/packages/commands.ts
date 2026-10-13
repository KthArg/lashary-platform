import { Money } from '@/shared/money'
import { ok, err, isErr, type Result } from '@/shared/result'
import {
  buildPackage,
  markPackageInactive,
  packageToView,
  type Package,
  type PackageView,
} from '../../domain/packages/package'
import {
  packageNotFound,
  packageValidationError,
  type PackageNameConflict,
  type PackageNotFound,
  type PackageValidationError,
} from '../../domain/packages/errors'
import type { TechniqueRepository } from '../techniques/ports'
import type { PackageRepository, PackageWriteModel } from './ports'
import { packageCommandMessages } from './messages'

export type PackageCommandDeps = {
  packageRepo: PackageRepository
  techniqueRepo: TechniqueRepository
  newId: () => string
}

async function resolveTechniques(
  techniqueRepo: TechniqueRepository,
  techniqueIds: string[],
): Promise<Result<void, PackageValidationError>> {
  const uniqueIds = Array.from(new Set(techniqueIds))
  const found = await techniqueRepo.findByIds(uniqueIds)
  const foundById = new Map(found.map((technique) => [technique.id, technique]))

  const missing = uniqueIds.filter((id) => !foundById.has(id))
  const inactive = uniqueIds.filter((id) => foundById.get(id)?.isActive === false)

  const problems: string[] = []
  if (missing.length > 0) {
    problems.push(`no existen las técnicas: ${missing.join(', ')}`)
  }
  if (inactive.length > 0) {
    problems.push(`las técnicas no están activas: ${inactive.join(', ')}`)
  }
  if (problems.length > 0) return err(packageValidationError(problems))
  return ok(undefined)
}

function buildFromModel(
  id: string,
  model: PackageWriteModel,
  isActive: boolean,
): Result<Package, PackageValidationError> {
  let price: Money
  try {
    price = Money.fromColones(model.price)
  } catch {
    return err(packageValidationError([packageCommandMessages.invalidPrice]))
  }
  let deposit: Money
  try {
    deposit = Money.fromColones(model.deposit === undefined ? 0 : model.deposit)
  } catch {
    return err(packageValidationError([packageCommandMessages.invalidDeposit]))
  }

  return buildPackage({
    id,
    name: model.name,
    techniqueIds: model.techniqueIds,
    price,
    deposit,
    isActive,
  })
}

export const createPackage =
  (deps: PackageCommandDeps) =>
  async (
    model: PackageWriteModel,
  ): Promise<
    Result<PackageView, PackageValidationError | PackageNameConflict>
  > => {
    const resolved = await resolveTechniques(deps.techniqueRepo, model.techniqueIds)
    if (isErr(resolved)) return resolved

    const built = buildFromModel(deps.newId(), model, true)
    if (isErr(built)) return built
    const saved = await deps.packageRepo.save(built.value)
    if (isErr(saved)) return saved
    return ok(packageToView(built.value))
  }

export const updatePackage =
  (deps: PackageCommandDeps) =>
  async (
    id: string,
    model: PackageWriteModel,
  ): Promise<
    Result<
      PackageView,
      PackageNotFound | PackageValidationError | PackageNameConflict
    >
  > => {
    const existing = await deps.packageRepo.findById(id)
    if (existing === null) return err(packageNotFound(id))

    const resolved = await resolveTechniques(deps.techniqueRepo, model.techniqueIds)
    if (isErr(resolved)) return resolved

    const built = buildFromModel(id, {
      ...model,
      deposit: model.deposit === undefined ? existing.pkg.deposit.colones : model.deposit,
    }, existing.pkg.isActive)
    if (isErr(built)) return built
    const saved = await deps.packageRepo.save(built.value)
    if (isErr(saved)) return saved
    return ok(packageToView(built.value))
  }

export const deactivatePackage =
  (deps: PackageCommandDeps) =>
  async (id: string): Promise<Result<PackageView, PackageNotFound | PackageNameConflict>> => {
    const existing = await deps.packageRepo.findById(id)
    if (existing === null) return err(packageNotFound(id))

    const deactivated = markPackageInactive(existing.pkg)
    const saved = await deps.packageRepo.save(deactivated)
    if (isErr(saved)) return saved
    return ok(packageToView(deactivated))
  }
