import { Money } from '@/shared/money'
import { isOk } from '@/shared/result'
import { Package } from '@/features/catalog/domain/package'

let counter = 0

// Construye un Package válido para los tests; los overrides ajustan lo que importe al caso.
export function makePackage(overrides: Partial<{
  id: string
  name: string
  techniqueIds: string[]
  price: number
  isActive: boolean
}> = {}): Package {
  counter += 1
  const result = Package.create({
    id: overrides.id ?? `p-${counter}`,
    name: overrides.name ?? `Paquete ${counter}`,
    techniqueIds: overrides.techniqueIds ?? [`t-${counter}-1`, `t-${counter}-2`],
    price: Money.fromColones(overrides.price ?? 30000),
    isActive: overrides.isActive ?? true,
  })
  if (!isOk(result)) {
    throw new Error(`fixture inválida: ${result.error.message}`)
  }
  return result.value
}
