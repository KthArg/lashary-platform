import { describe, it, expect } from 'vitest'
import { Money } from '@/shared/money'
import { isErr, isOk } from '@/shared/result'
import { Technique } from '@/features/catalog/domain/techniques/technique'
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

describe('Technique.create — invariantes de dominio (DOM-007)', () => {
  it('crea una técnica válida con todos los campos', () => {
    const result = Technique.create(validInput())
    expect(isOk(result)).toBe(true)
    if (!isOk(result)) return
    expect(result.value.name).toBe('Set clásico')
    expect(result.value.family).toBe('lash_classic')
    expect(result.value.priceFirstTime.colones).toBe(25000)
    expect(result.value.offersRetouch).toBe(true)
    expect(result.value.isActive).toBe(true) // default
  })

  it('crea una técnica sin retoque (precio y duración de retoque ausentes)', () => {
    const result = Technique.create({
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
    const result = Technique.create({ ...validInput(), reapplicationIntervalDays: null })
    expect(isOk(result)).toBe(true)
  })

  it('recorta espacios de name y aftercareText', () => {
    const result = Technique.create({
      ...validInput(),
      name: '  Set clásico  ',
      aftercareText: '  cuidados  ',
    })
    if (!isOk(result)) throw new Error('esperaba ok')
    expect(result.value.name).toBe('Set clásico')
    expect(result.value.aftercareText).toBe('cuidados')
  })

  it('rechaza nombre vacío', () => {
    const result = Technique.create({ ...validInput(), name: '   ' })
    expect(isErr(result)).toBe(true)
    if (!isErr(result)) return
    expect(isTechniqueValidationError(result.error)).toBe(true)
    expect(result.error.problems.join(' ')).toMatch(/nombre/i)
  })

  it('rechaza texto de cuidados vacío (criterio 6 / D5)', () => {
    const result = Technique.create({ ...validInput(), aftercareText: '  ' })
    expect(isErr(result)).toBe(true)
  })

  it('rechaza familia inválida', () => {
    const result = Technique.create({
      ...validInput(),
      // @ts-expect-error — familia fuera del catálogo
      family: 'tattoo',
    })
    expect(isErr(result)).toBe(true)
  })

  it('rechaza precio de primera vez no positivo', () => {
    const result = Technique.create({ ...validInput(), priceFirstTime: Money.zero() })
    expect(isErr(result)).toBe(true)
  })

  it('rechaza precio de retoque no positivo cuando se da', () => {
    const result = Technique.create({
      ...validInput(),
      priceRetouch: Money.zero(),
      durationRetouchMin: 60,
    })
    expect(isErr(result)).toBe(true)
  })

  it('rechaza duración de primera vez no entera o no positiva', () => {
    expect(isErr(Technique.create({ ...validInput(), durationFirstTimeMin: 0 }))).toBe(true)
    expect(isErr(Technique.create({ ...validInput(), durationFirstTimeMin: 12.5 }))).toBe(true)
  })

  it('acepta buffer_min cero, rechaza negativo', () => {
    expect(isOk(Technique.create({ ...validInput(), bufferMin: 0 }))).toBe(true)
    expect(isErr(Technique.create({ ...validInput(), bufferMin: -1 }))).toBe(true)
  })

  it('acepta anticipo cero, rechaza negativo', () => {
    expect(isOk(Technique.create({ ...validInput(), deposit: Money.zero() }))).toBe(true)
    expect(isErr(Technique.create({ ...validInput(), deposit: Money.fromColones(-1) }))).toBe(true)
  })

  it('D10 — rechaza precio de retoque sin duración de retoque', () => {
    const result = Technique.create({ ...validInput(), durationRetouchMin: null })
    expect(isErr(result)).toBe(true)
    if (!isErr(result)) return
    expect(result.error.problems.join(' ')).toMatch(/retoque/i)
  })

  it('D10 — rechaza duración de retoque sin precio de retoque', () => {
    const result = Technique.create({ ...validInput(), priceRetouch: null })
    expect(isErr(result)).toBe(true)
  })

  it('acumula varios problemas en un solo error', () => {
    const result = Technique.create({
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

describe('Technique — comportamiento', () => {
  it('deactivate devuelve una copia inactiva sin mutar la original', () => {
    const result = Technique.create(validInput())
    if (!isOk(result)) throw new Error('esperaba ok')
    const original = result.value
    const inactiva = original.deactivate()
    expect(inactiva.isActive).toBe(false)
    expect(original.isActive).toBe(true)
    expect(inactiva.id).toBe(original.id)
  })

  it('snapshot produce los campos que la cita congela (DOM-002), en colones enteros', () => {
    const result = Technique.create(validInput())
    if (!isOk(result)) throw new Error('esperaba ok')
    const snap = result.value.snapshot()
    expect(snap).toEqual({
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

  it('snapshot deja priceRetouch/durationRetouchMin en null cuando no hay retoque', () => {
    const result = Technique.create({
      ...validInput(),
      priceRetouch: null,
      durationRetouchMin: null,
    })
    if (!isOk(result)) throw new Error('esperaba ok')
    const snap = result.value.snapshot()
    expect(snap.priceRetouch).toBeNull()
    expect(snap.durationRetouchMin).toBeNull()
  })
})
