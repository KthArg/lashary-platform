import { describe, it, expect } from 'vitest'
import { Money } from '@/shared/money'
import { isErr, isOk } from '@/shared/result'
import {
  buildTechnique,
  markTechniqueInactive,
  techniqueToSnapshot,
  type ServiceFamily,
} from '@/features/catalog/domain/techniques/technique'
import { isTechniqueValidationError } from '@/features/catalog/domain/techniques/errors'

const validInput = () => ({
  id: '11111111-1111-1111-1111-111111111111',
  name: 'Set clásico',
  family: 'lash_classic' as const,
  priceFirstTime: Money.fromColones(25000),
  priceRetouch: Money.fromColones(15000),
  durationFirstTimeMin: 120,
  durationRetouchMin: 75,
  bufferMin: 15,
  reapplicationIntervalDays: 21,
  deposit: Money.fromColones(10000),
  aftercareText: 'No mojar por 24 horas.',
})

describe('buildTechnique — invariantes de dominio (DOM-007)', () => {
  it('crea una técnica válida con todos los campos', () => {
    const result = buildTechnique(validInput())
    expect(isOk(result)).toBe(true)
    if (!isOk(result)) return
    expect(result.value.name).toBe('Set clásico')
    expect(result.value.family).toBe('lash_classic')
    expect(result.value.priceFirstTime.colones).toBe(25000)
    expect(result.value.offersRetouch).toBe(true)
    expect(result.value.isActive).toBe(true)
  })

  it('crea una técnica sin retoque (precio y duración de retoque ausentes)', () => {
    const result = buildTechnique({
      ...validInput(),
      priceRetouch: null,
      durationRetouchMin: null,
    })
    expect(isOk(result)).toBe(true)
    if (!isOk(result)) return
    expect(result.value.offersRetouch).toBe(false)
    expect(result.value.priceRetouch).toBeNull()
  })

  it('acepta intervalo de re-aplicación nulo', () => {
    const result = buildTechnique({ ...validInput(), reapplicationIntervalDays: null })
    expect(isOk(result)).toBe(true)
  })

  it('recorta espacios de name y aftercareText', () => {
    const result = buildTechnique({
      ...validInput(),
      name: '  Set clásico  ',
      aftercareText: '  cuidados  ',
    })
    if (!isOk(result)) throw new Error('esperaba ok')
    expect(result.value.name).toBe('Set clásico')
    expect(result.value.aftercareText).toBe('cuidados')
  })

  it('rechaza nombre vacío', () => {
    const result = buildTechnique({ ...validInput(), name: '   ' })
    expect(isErr(result)).toBe(true)
    if (!isErr(result)) return
    expect(isTechniqueValidationError(result.error)).toBe(true)
    expect(result.error.problems.join(' ')).toMatch(/nombre/i)
  })

  it('rechaza texto de cuidados vacío (criterio 6 / D5)', () => {
    const result = buildTechnique({ ...validInput(), aftercareText: '  ' })
    expect(isErr(result)).toBe(true)
  })

  it('rechaza familia inválida', () => {
    const result = buildTechnique({
      ...validInput(),
      family: 'tattoo' as unknown as ServiceFamily,
    })
    expect(isErr(result)).toBe(true)
  })

  it('rechaza precio de primera vez no positivo', () => {
    const result = buildTechnique({ ...validInput(), priceFirstTime: Money.zero() })
    expect(isErr(result)).toBe(true)
  })

  it('rechaza precio de retoque no positivo cuando se da', () => {
    const result = buildTechnique({
      ...validInput(),
      priceRetouch: Money.zero(),
      durationRetouchMin: 60,
    })
    expect(isErr(result)).toBe(true)
  })

  it('rechaza duración de primera vez no entera o no positiva', () => {
    expect(isErr(buildTechnique({ ...validInput(), durationFirstTimeMin: 0 }))).toBe(true)
    expect(isErr(buildTechnique({ ...validInput(), durationFirstTimeMin: 12.5 }))).toBe(true)
  })

  it('acepta buffer_min cero, rechaza negativo', () => {
    expect(isOk(buildTechnique({ ...validInput(), bufferMin: 0 }))).toBe(true)
    expect(isErr(buildTechnique({ ...validInput(), bufferMin: -1 }))).toBe(true)
  })

  it('acepta anticipo cero, rechaza negativo', () => {
    expect(isOk(buildTechnique({ ...validInput(), deposit: Money.zero() }))).toBe(true)
    expect(isErr(buildTechnique({ ...validInput(), deposit: Money.fromColones(-1) }))).toBe(true)
  })

  it('D10 — rechaza precio de retoque sin duración de retoque', () => {
    const result = buildTechnique({ ...validInput(), durationRetouchMin: null })
    expect(isErr(result)).toBe(true)
    if (!isErr(result)) return
    expect(result.error.problems.join(' ')).toMatch(/retoque/i)
  })

  it('D10 — rechaza duración de retoque sin precio de retoque', () => {
    const result = buildTechnique({ ...validInput(), priceRetouch: null })
    expect(isErr(result)).toBe(true)
  })

  it('acumula varios problemas en un solo error', () => {
    const result = buildTechnique({
      ...validInput(),
      name: '',
      aftercareText: '',
      bufferMin: -5,
    })
    expect(isErr(result)).toBe(true)
    if (!isErr(result)) return
    expect(result.error.problems.length).toBeGreaterThanOrEqual(3)
  })
})

describe('funciones de Technique', () => {
  it('markTechniqueInactive devuelve una copia inactive sin mutar la original', () => {
    const result = buildTechnique(validInput())
    if (!isOk(result)) throw new Error('esperaba ok')
    const original = result.value
    const inactive = markTechniqueInactive(original)
    expect(inactive.isActive).toBe(false)
    expect(original.isActive).toBe(true)
    expect(inactive.id).toBe(original.id)
  })

  it('techniqueToSnapshot produce los campos que la cita congela (DOM-002), en colones enteros', () => {
    const result = buildTechnique(validInput())
    if (!isOk(result)) throw new Error('esperaba ok')
    const snapshot = techniqueToSnapshot(result.value)
    expect(snapshot).toEqual({
      techniqueId: '11111111-1111-1111-1111-111111111111',
      name: 'Set clásico',
      family: 'lash_classic',
      priceFirstTime: 25000,
      priceRetouch: 15000,
      durationFirstTimeMin: 120,
      durationRetouchMin: 75,
      bufferMin: 15,
      deposit: 10000,
    })
  })

  it('techniqueToSnapshot deja priceRetouch/durationRetouchMin en null cuando no hay retoque', () => {
    const result = buildTechnique({
      ...validInput(),
      priceRetouch: null,
      durationRetouchMin: null,
    })
    if (!isOk(result)) throw new Error('esperaba ok')
    const snapshot = techniqueToSnapshot(result.value)
    expect(snapshot.priceRetouch).toBeNull()
    expect(snapshot.durationRetouchMin).toBeNull()
  })
})
