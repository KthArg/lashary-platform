import { Money } from '@/shared/money'
import { ok, err, type Result } from '@/shared/result'
import { techniqueValidationError, type TechniqueValidationError } from './errors'

export const SERVICE_FAMILIES = [
  'lash_classic',
  'lash_volume',
  'lash_extra_volume',
  'brow_design',
  'brow_lamination',
  'henna',
  'waxing',
  'lips',
] as const

export type ServiceFamily = (typeof SERVICE_FAMILIES)[number]

export type TechniqueView = {
  id: string
  name: string
  family: ServiceFamily
  priceFirstTime: number
  priceRetouch: number | null
  durationFirstTimeMin: number
  durationRetouchMin: number | null
  bufferMin: number
  reapplicationIntervalDays: number | null
  deposit: number
  aftercareText: string
  isActive: boolean
}

export type TechniqueSnapshot = {
  techniqueId: string
  name: string
  family: ServiceFamily
  priceFirstTime: number
  priceRetouch: number | null
  durationFirstTimeMin: number
  durationRetouchMin: number | null
  bufferMin: number
  deposit: number
}

export type TechniqueInput = {
  id: string
  name: string
  family: ServiceFamily
  priceFirstTime: Money
  priceRetouch?: Money | null
  durationFirstTimeMin: number
  durationRetouchMin?: number | null
  bufferMin: number
  reapplicationIntervalDays?: number | null
  deposit: Money
  aftercareText: string
  isActive?: boolean
}

const isPositiveInt = (value: number): boolean => Number.isInteger(value) && value > 0
const isNonNegativeInt = (value: number): boolean => Number.isInteger(value) && value >= 0

const techniqueBrand: unique symbol = Symbol('Technique')

export interface Technique {
  readonly [techniqueBrand]: true
  readonly id: string
  readonly name: string
  readonly family: ServiceFamily
  readonly priceFirstTime: Money
  readonly priceRetouch: Money | null
  readonly durationFirstTimeMin: number
  readonly durationRetouchMin: number | null
  readonly bufferMin: number
  readonly reapplicationIntervalDays: number | null
  readonly deposit: Money
  readonly aftercareText: string
  readonly isActive: boolean
  readonly offersRetouch: boolean
}

export function buildTechnique(
  input: TechniqueInput,
): Result<Technique, TechniqueValidationError> {
  const problems: string[] = []

  const name = input.name.trim()
  if (name.length === 0) problems.push('el nombre no puede estar vacío')

  if (!SERVICE_FAMILIES.includes(input.family)) {
    problems.push(`familia inválida: ${String(input.family)}`)
  }

  if (!input.priceFirstTime.isPositive()) {
    problems.push('el precio de primera vez debe ser mayor que cero')
  }

  const priceRetouch = input.priceRetouch ?? null
  if (priceRetouch !== null && !priceRetouch.isPositive()) {
    problems.push('el precio de retoque debe ser mayor que cero')
  }

  if (!isPositiveInt(input.durationFirstTimeMin)) {
    problems.push('la duración de primera vez debe ser un entero de minutos mayor que cero')
  }

  const durationRetouchMin = input.durationRetouchMin ?? null
  if (durationRetouchMin !== null && !isPositiveInt(durationRetouchMin)) {
    problems.push('la duración de retoque debe ser un entero de minutos mayor que cero')
  }

  if (!isNonNegativeInt(input.bufferMin)) {
    problems.push('el tiempo de preparación y limpieza debe ser un entero de minutos no negativo')
  }

  const reapplicationIntervalDays = input.reapplicationIntervalDays ?? null
  if (reapplicationIntervalDays !== null && !isPositiveInt(reapplicationIntervalDays)) {
    problems.push('el intervalo de re-aplicación debe ser un entero de días mayor que cero')
  }

  if (input.deposit.isNegative()) {
    problems.push('el anticipo no puede ser negativo')
  }

  const aftercareText = input.aftercareText.trim()
  if (aftercareText.length === 0) {
    problems.push('el texto de cuidados posteriores no puede estar vacío')
  }

  if ((priceRetouch === null) !== (durationRetouchMin === null)) {
    problems.push('el retoque requiere precio y duración, o ninguno de los dos')
  }

  if (problems.length > 0) {
    return err(techniqueValidationError(problems))
  }

  return ok({
    [techniqueBrand]: true,
    id: input.id,
    name,
    family: input.family,
    priceFirstTime: input.priceFirstTime,
    priceRetouch,
    durationFirstTimeMin: input.durationFirstTimeMin,
    durationRetouchMin,
    bufferMin: input.bufferMin,
    reapplicationIntervalDays,
    deposit: input.deposit,
    aftercareText,
    isActive: input.isActive ?? true,
    offersRetouch: priceRetouch !== null,
  })
}

export function markTechniqueInactive(technique: Technique): Technique {
  return { ...technique, isActive: false }
}

export function techniqueToView(technique: Technique): TechniqueView {
  return {
    id: technique.id,
    name: technique.name,
    family: technique.family,
    priceFirstTime: technique.priceFirstTime.colones,
    priceRetouch: technique.priceRetouch?.colones ?? null,
    durationFirstTimeMin: technique.durationFirstTimeMin,
    durationRetouchMin: technique.durationRetouchMin,
    bufferMin: technique.bufferMin,
    reapplicationIntervalDays: technique.reapplicationIntervalDays,
    deposit: technique.deposit.colones,
    aftercareText: technique.aftercareText,
    isActive: technique.isActive,
  }
}

export function techniqueToSnapshot(technique: Technique): TechniqueSnapshot {
  return {
    techniqueId: technique.id,
    name: technique.name,
    family: technique.family,
    priceFirstTime: technique.priceFirstTime.colones,
    priceRetouch: technique.priceRetouch?.colones ?? null,
    durationFirstTimeMin: technique.durationFirstTimeMin,
    durationRetouchMin: technique.durationRetouchMin,
    bufferMin: technique.bufferMin,
    deposit: technique.deposit.colones,
  }
}
