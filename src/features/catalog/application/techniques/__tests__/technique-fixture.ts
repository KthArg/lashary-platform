import { moneyFromColones } from '@/shared/money'
import { isOk } from '@/shared/result'
import { buildTechnique, type Technique, type ServiceFamily } from '@/features/catalog/domain/techniques/technique'

let counter = 0

export function makeTechnique(overrides: Partial<{
  id: string
  name: string
  family: ServiceFamily
  priceFirstTime: number
  priceRetouch: number | null
  durationRetouchMin: number | null
  reapplicationIntervalDays: number | null
  isActive: boolean
}> = {}): Technique {
  counter += 1
  const result = buildTechnique({
    id: overrides.id ?? `t-${counter}`,
    name: overrides.name ?? `Técnica ${counter}`,
    family: overrides.family ?? 'lash_classic',
    priceFirstTime: moneyFromColones(overrides.priceFirstTime ?? 25000),
    priceRetouch:
      overrides.priceRetouch === undefined
        ? moneyFromColones(15000)
        : overrides.priceRetouch === null
          ? null
          : moneyFromColones(overrides.priceRetouch),
    durationFirstTimeMin: 120,
    durationRetouchMin:
      overrides.durationRetouchMin === undefined
        ? 75
        : overrides.durationRetouchMin,
    bufferMin: 15,
    reapplicationIntervalDays:
      overrides.reapplicationIntervalDays === undefined
        ? 21
        : overrides.reapplicationIntervalDays,
    deposit: moneyFromColones(10000),
    aftercareText: 'No mojar por 24 horas.',
    isActive: overrides.isActive ?? true,
  })
  if (!isOk(result)) {
    throw new Error(`fixture inválida: ${result.error.message}`)
  }
  return result.value
}
