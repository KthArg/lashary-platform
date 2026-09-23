import { Money } from '@/shared/money'
import { ok, err, isErr, type Result } from '@/shared/result'
import { Technique, type TechniqueView } from '../domain/technique'
import { Package, type PackageView } from '../domain/package'
import {
  TechniqueNameConflict,
  TechniqueNotFound,
  TechniqueValidationError,
  PackageNameConflict,
  PackageNotFound,
  PackageValidationError,
} from '../domain/errors'
import type {
  TechniqueRepository,
  TechniqueWriteModel,
  PackageRepository,
  PackageWriteModel,
} from './ports'
import { commandMessages } from './messages'

// DOM-006: repo.save() lanza TechniqueNameConflict ante catalog_techniques_name_unique — el
// único error de infra que es en realidad un caso de negocio. Se atrapa acá, en el borde de
// application/, y se convierte a Result; cualquier otro throw es una falla de infra real y se
// deja propagar.
async function saveOrConflict(
  repo: TechniqueRepository,
  technique: Technique,
): Promise<Result<void, TechniqueNameConflict>> {
  try {
    await repo.save(technique)
    return ok(undefined)
  } catch (error) {
    if (error instanceof TechniqueNameConflict) return err(error)
    throw error
  }
}

export type CommandDeps = {
  repo: TechniqueRepository
  newId: () => string
}

const toMoney = (value: number): Money | null => {
  try {
    return Money.fromColones(value)
  } catch {
    return null
  }
}

// Construye la entidad desde el modelo del borde: envuelve los montos en Money (rechazando
// no-enteros) y delega el resto de invariantes al constructor de Technique (DOM-007).
function buildTechnique(
  id: string,
  model: TechniqueWriteModel,
  isActive: boolean,
): Result<Technique, TechniqueValidationError> {
  const priceFirstTime = toMoney(model.priceFirstTime)
  const priceRetouch =
    model.priceRetouch === undefined || model.priceRetouch === null
      ? null
      : toMoney(model.priceRetouch)
  const deposit = toMoney(model.deposit)

  const moneyProblems: string[] = []
  if (priceFirstTime === null) {
    moneyProblems.push(commandMessages.invalidPriceFirstTime)
  }
  if (
    model.priceRetouch !== undefined &&
    model.priceRetouch !== null &&
    priceRetouch === null
  ) {
    moneyProblems.push(commandMessages.invalidPriceRetouch)
  }
  if (deposit === null) {
    moneyProblems.push(commandMessages.invalidDeposit)
  }
  if (priceFirstTime === null || deposit === null || moneyProblems.length > 0) {
    return err(new TechniqueValidationError(moneyProblems))
  }

  return Technique.create({
    id,
    name: model.name,
    family: model.family,
    priceFirstTime,
    priceRetouch,
    durationFirstTimeMin: model.durationFirstTimeMin,
    durationRetouchMin: model.durationRetouchMin ?? null,
    bufferMin: model.bufferMin,
    reapplicationIntervalDays: model.reapplicationIntervalDays ?? null,
    deposit,
    aftercareText: model.aftercareText,
    isActive,
  })
}

export const createTechnique =
  (deps: CommandDeps) =>
  async (
    model: TechniqueWriteModel,
  ): Promise<
    Result<TechniqueView, TechniqueValidationError | TechniqueNameConflict>
  > => {
    const built = buildTechnique(deps.newId(), model, true)
    if (isErr(built)) return built
    const saved = await saveOrConflict(deps.repo, built.value)
    if (isErr(saved)) return saved
    return ok(built.value.toView())
  }

export const updateTechnique =
  (deps: CommandDeps) =>
  async (
    id: string,
    model: TechniqueWriteModel,
  ): Promise<
    Result<
      TechniqueView,
      TechniqueNotFound | TechniqueValidationError | TechniqueNameConflict
    >
  > => {
    const existing = await deps.repo.findById(id)
    if (existing === null) return err(new TechniqueNotFound(id))

    const built = buildTechnique(id, model, existing.isActive)
    if (isErr(built)) return built
    const saved = await saveOrConflict(deps.repo, built.value)
    if (isErr(saved)) return saved
    return ok(built.value.toView())
  }

export const deactivateTechnique =
  (deps: CommandDeps) =>
  async (
    id: string,
  ): Promise<Result<TechniqueView, TechniqueNotFound>> => {
    const existing = await deps.repo.findById(id)
    if (existing === null) return err(new TechniqueNotFound(id))

    const deactivated = existing.deactivate()
    await deps.repo.save(deactivated)
    return ok(deactivated.toView())
  }

// ── Paquetes (US-PROD-01) ──────────────────────────────────────────────────

export type PackageCommandDeps = {
  packageRepo: PackageRepository
  techniqueRepo: TechniqueRepository
  newId: () => string
}

async function savePackageOrConflict(
  repo: PackageRepository,
  pkg: Package,
): Promise<Result<void, PackageNameConflict>> {
  try {
    await repo.save(pkg)
    return ok(undefined)
  } catch (error) {
    if (error instanceof PackageNameConflict) return err(error)
    throw error
  }
}

// Criterio 1: las técnicas del paquete deben existir y estar activas — el admin arma el
// paquete a partir de lo que hoy se ofrece. Una sola consulta por lote (PERF-005), nunca una
// por técnica.
async function resolveTechniques(
  techniqueRepo: TechniqueRepository,
  techniqueIds: string[],
): Promise<Result<void, PackageValidationError>> {
  const uniqueIds = Array.from(new Set(techniqueIds))
  const found = await techniqueRepo.findByIds(uniqueIds)
  const foundById = new Map(found.map((t) => [t.id, t]))

  const missing = uniqueIds.filter((id) => !foundById.has(id))
  const inactive = uniqueIds.filter((id) => foundById.get(id)?.isActive === false)

  const problems: string[] = []
  if (missing.length > 0) {
    problems.push(`no existen las técnicas: ${missing.join(', ')}`)
  }
  if (inactive.length > 0) {
    problems.push(`las técnicas no están activas: ${inactive.join(', ')}`)
  }
  if (problems.length > 0) return err(new PackageValidationError(problems))
  return ok(undefined)
}

function buildPackage(
  id: string,
  model: PackageWriteModel,
  isActive: boolean,
): Result<Package, PackageValidationError> {
  let price: Money
  try {
    price = Money.fromColones(model.price)
  } catch {
    return err(new PackageValidationError([commandMessages.invalidPackagePrice]))
  }

  return Package.create({
    id,
    name: model.name,
    techniqueIds: model.techniqueIds,
    price,
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

    const built = buildPackage(deps.newId(), model, true)
    if (isErr(built)) return built
    const saved = await savePackageOrConflict(deps.packageRepo, built.value)
    if (isErr(saved)) return saved
    return ok(built.value.toView())
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
    if (existing === null) return err(new PackageNotFound(id))

    const resolved = await resolveTechniques(deps.techniqueRepo, model.techniqueIds)
    if (isErr(resolved)) return resolved

    const built = buildPackage(id, model, existing.pkg.isActive)
    if (isErr(built)) return built
    const saved = await savePackageOrConflict(deps.packageRepo, built.value)
    if (isErr(saved)) return saved
    return ok(built.value.toView())
  }

export const deactivatePackage =
  (deps: PackageCommandDeps) =>
  async (id: string): Promise<Result<PackageView, PackageNotFound>> => {
    const existing = await deps.packageRepo.findById(id)
    if (existing === null) return err(new PackageNotFound(id))

    const deactivated = existing.pkg.deactivate()
    await deps.packageRepo.save(deactivated)
    return ok(deactivated.toView())
  }
