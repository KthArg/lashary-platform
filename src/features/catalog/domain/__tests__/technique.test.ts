import { describe, it, expect } from 'vitest'
import { Money } from '@/shared/money'
import { isErr, isOk } from '@/shared/result'
import { Technique } from '@/features/catalog/domain/technique'
import { TechniqueValidationError } from '@/features/catalog/domain/errors'

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
    const r = Technique.create(validInput())
    expect(isOk(r)).toBe(true)
    if (!isOk(r)) return
    expect(r.value.name).toBe('Set clásico')
    expect(r.value.family).toBe('lash_classic')
    expect(r.value.priceFirstTime.colones).toBe(25000)
    expect(r.value.offersRetouch).toBe(true)
    expect(r.value.isActive).toBe(true) // default
  })

  it('crea una técnica sin retoque (precio y duración de retoque ausentes)', () => {
    const r = Technique.create({
      ...validInput(),
      priceRetouch: null,
      durationRetouchMin: null,
    })
    expect(isOk(r)).toBe(true)
    if (!isOk(r)) return
    expect(r.value.offersRetouch).toBe(false)
    expect(r.value.priceRetouch).toBeNull()
  })

  it('acepta intervalo de re-aplicación nulo', () => {
    const r = Technique.create({ ...validInput(), reapplicationIntervalDays: null })
    expect(isOk(r)).toBe(true)
  })

  it('recorta espacios de name y aftercareText', () => {
    const r = Technique.create({
      ...validInput(),
      name: '  Set clásico  ',
      aftercareText: '  cuidados  ',
    })
    if (!isOk(r)) throw new Error('esperaba ok')
    expect(r.value.name).toBe('Set clásico')
    expect(r.value.aftercareText).toBe('cuidados')
  })

  it('rechaza nombre vacío', () => {
    const r = Technique.create({ ...validInput(), name: '   ' })
    expect(isErr(r)).toBe(true)
    if (!isErr(r)) return
    expect(r.error).toBeInstanceOf(TechniqueValidationError)
    expect(r.error.problems.join(' ')).toMatch(/nombre/i)
  })

  it('rechaza texto de cuidados vacío (criterio 6 / D5)', () => {
    const r = Technique.create({ ...validInput(), aftercareText: '  ' })
    expect(isErr(r)).toBe(true)
  })

  it('rechaza familia inválida', () => {
    const r = Technique.create({
      ...validInput(),
      // @ts-expect-error — familia fuera del catálogo
      family: 'tattoo',
    })
    expect(isErr(r)).toBe(true)
  })

  it('rechaza precio de primera vez no positivo', () => {
    const r = Technique.create({ ...validInput(), priceFirstTime: Money.zero() })
    expect(isErr(r)).toBe(true)
  })

  it('rechaza precio de retoque no positivo cuando se da', () => {
    const r = Technique.create({
      ...validInput(),
      priceRetouch: Money.zero(),
      durationRetouchMin: 60,
    })
    expect(isErr(r)).toBe(true)
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
    const r = Technique.create({ ...validInput(), durationRetouchMin: null })
    expect(isErr(r)).toBe(true)
    if (!isErr(r)) return
    expect(r.error.problems.join(' ')).toMatch(/retoque/i)
  })

  it('D10 — rechaza duración de retoque sin precio de retoque', () => {
    const r = Technique.create({ ...validInput(), priceRetouch: null })
    expect(isErr(r)).toBe(true)
  })

  it('acumula varios problemas en un solo error', () => {
    const r = Technique.create({
      ...validInput(),
      name: '',
      aftercareText: '',
      bufferMin: -5,
    })
    expect(isErr(r)).toBe(true)
    if (!isErr(r)) return
    expect(r.error.problems.length).toBeGreaterThanOrEqual(3)
  })
})

describe('Technique — comportamiento', () => {
  it('deactivate devuelve una copia inactiva sin mutar la original', () => {
    const r = Technique.create(validInput())
    if (!isOk(r)) throw new Error('esperaba ok')
    const original = r.value
    const inactiva = original.deactivate()
    expect(inactiva.isActive).toBe(false)
    expect(original.isActive).toBe(true)
    expect(inactiva.id).toBe(original.id)
  })

  it('snapshot produce los campos que la cita congela (DOM-002), en colones enteros', () => {
    const r = Technique.create(validInput())
    if (!isOk(r)) throw new Error('esperaba ok')
    const snap = r.value.snapshot()
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
    const r = Technique.create({
      ...validInput(),
      priceRetouch: null,
      durationRetouchMin: null,
    })
    if (!isOk(r)) throw new Error('esperaba ok')
    const snap = r.value.snapshot()
    expect(snap.priceRetouch).toBeNull()
    expect(snap.durationRetouchMin).toBeNull()
  })
})
