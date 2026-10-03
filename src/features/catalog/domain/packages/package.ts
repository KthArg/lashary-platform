import { Money } from '@/shared/money'
import { ok, err, type Result } from '@/shared/result'
import { packageValidationError, type PackageValidationError } from './errors'

export type PackageView = {
  id: string
  name: string
  techniqueIds: string[]
  price: number
  isActive: boolean
}

export type PackageInput = {
  id: string
  name: string
  techniqueIds: string[]
  price: Money
  isActive?: boolean
}

const packageBrand: unique symbol = Symbol('Package')

export interface Package {
  readonly [packageBrand]: true
  readonly id: string
  readonly name: string
  readonly techniqueIds: readonly string[]
  readonly price: Money
  readonly isActive: boolean
}

export function createPackage(input: PackageInput): Result<Package, PackageValidationError> {
  const problems: string[] = []

  const name = input.name.trim()
  if (name.length === 0) problems.push('el nombre no puede estar vacío')

  const uniqueTechniqueIds = Array.from(new Set(input.techniqueIds))
  if (uniqueTechniqueIds.length !== input.techniqueIds.length) {
    problems.push('la lista de técnicas no puede repetir la misma técnica')
  }
  if (uniqueTechniqueIds.length < 2) {
    problems.push('un paquete necesita al menos dos técnicas')
  }

  if (!input.price.isPositive()) {
    problems.push('el precio del paquete debe ser mayor que cero')
  }

  if (problems.length > 0) {
    return err(packageValidationError(problems))
  }

  return ok({
    [packageBrand]: true,
    id: input.id,
    name,
    techniqueIds: uniqueTechniqueIds,
    price: input.price,
    isActive: input.isActive ?? true,
  })
}

export function deactivatePackage(pkg: Package): Package {
  return { ...pkg, isActive: false }
}

export function packageToView(pkg: Package): PackageView {
  return {
    id: pkg.id,
    name: pkg.name,
    techniqueIds: [...pkg.techniqueIds],
    price: pkg.price.colones,
    isActive: pkg.isActive,
  }
}
