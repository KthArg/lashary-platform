import { Money } from '@/shared/money'
import { ok, err, isErr, type Result } from '@/shared/result'
import {
  buildTechnique,
  markTechniqueInactive,
  techniqueToView,
  type Technique,
  type TechniqueView,
} from '../../domain/techniques/technique'
import {
  techniqueNotFound,
  techniqueValidationError,
  type TechniqueNameConflict,
  type TechniqueNotFound,
  type TechniqueValidationError,
} from '../../domain/techniques/errors'
import type { TechniqueRepository, TechniqueWriteModel } from './ports'
import { commandMessages } from './messages'

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

function buildFromModel(
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
    return err(techniqueValidationError(moneyProblems))
  }

  return buildTechnique({
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
    const built = buildFromModel(deps.newId(), model, true)
    if (isErr(built)) return built
    const saved = await deps.repo.save(built.value)
    if (isErr(saved)) return saved
    return ok(techniqueToView(built.value))
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
    if (existing === null) return err(techniqueNotFound(id))

    const built = buildFromModel(id, model, existing.isActive)
    if (isErr(built)) return built
    const saved = await deps.repo.save(built.value)
    if (isErr(saved)) return saved
    return ok(techniqueToView(built.value))
  }

export const deactivateTechnique =
  (deps: CommandDeps) =>
  async (
    id: string,
  ): Promise<Result<TechniqueView, TechniqueNotFound | TechniqueNameConflict>> => {
    const existing = await deps.repo.findById(id)
    if (existing === null) return err(techniqueNotFound(id))

    const deactivated = markTechniqueInactive(existing)
    const saved = await deps.repo.save(deactivated)
    if (isErr(saved)) return saved
    return ok(techniqueToView(deactivated))
  }
