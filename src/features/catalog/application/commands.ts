import { Money } from '@/shared/money'
import { ok, err, isErr, type Result } from '@/shared/result'
import { Technique, type TechniqueView } from '../domain/technique'
import {
  TechniqueNameConflict,
  TechniqueNotFound,
  TechniqueValidationError,
} from '../domain/errors'
import type { TechniqueRepository, TechniqueWriteModel } from './ports'

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
    moneyProblems.push('el precio de primera vez debe ser un entero de colones')
  }
  if (
    model.priceRetouch !== undefined &&
    model.priceRetouch !== null &&
    priceRetouch === null
  ) {
    moneyProblems.push('el precio de retoque debe ser un entero de colones')
  }
  if (deposit === null) {
    moneyProblems.push('el anticipo debe ser un entero de colones')
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
