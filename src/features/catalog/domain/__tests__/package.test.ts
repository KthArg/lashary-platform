import { describe, it, expect } from 'vitest'
import { Money } from '@/shared/money'
import { isErr, isOk } from '@/shared/result'
import { Package } from '@/features/catalog/domain/package'
import { PackageValidationError } from '@/features/catalog/domain/errors'

const validInput = () => ({
  id: '22222222-2222-2222-2222-222222222222',
  name: 'Combo cejas',
  techniqueIds: [
    '11111111-1111-1111-1111-111111111111',
    '33333333-3333-3333-3333-333333333333',
  ],
  price: Money.fromColones(30000),
})

describe('Package.create — invariantes de dominio (DOM-007, criterio 1)', () => {
  it('crea un paquete válido con dos técnicas', () => {
    const r = Package.create(validInput())
    expect(isOk(r)).toBe(true)
    if (!isOk(r)) return
    expect(r.value.name).toBe('Combo cejas')
    expect(r.value.techniqueIds).toHaveLength(2)
    expect(r.value.price.colones).toBe(30000)
    expect(r.value.isActive).toBe(true) // default
  })

  it('crea un paquete válido con más de dos técnicas', () => {
    const r = Package.create({
      ...validInput(),
      techniqueIds: [
        '11111111-1111-1111-1111-111111111111',
        '33333333-3333-3333-3333-333333333333',
        '44444444-4444-4444-4444-444444444444',
      ],
    })
    expect(isOk(r)).toBe(true)
  })

  it('recorta espacios del nombre', () => {
    const r = Package.create({ ...validInput(), name: '  Combo cejas  ' })
    if (!isOk(r)) throw new Error('esperaba ok')
    expect(r.value.name).toBe('Combo cejas')
  })

  it('rechaza nombre vacío', () => {
    const r = Package.create({ ...validInput(), name: '   ' })
    expect(isErr(r)).toBe(true)
    if (!isErr(r)) return
    expect(r.error).toBeInstanceOf(PackageValidationError)
    expect(r.error.problems.join(' ')).toMatch(/nombre/i)
  })

  it('rechaza menos de dos técnicas', () => {
    const r = Package.create({
      ...validInput(),
      techniqueIds: ['11111111-1111-1111-1111-111111111111'],
    })
    expect(isErr(r)).toBe(true)
    if (!isErr(r)) return
    expect(r.error.problems.join(' ')).toMatch(/al menos dos técnicas/i)
  })

  it('rechaza lista vacía de técnicas', () => {
    const r = Package.create({ ...validInput(), techniqueIds: [] })
    expect(isErr(r)).toBe(true)
  })

  it('rechaza técnicas repetidas', () => {
    const id = '11111111-1111-1111-1111-111111111111'
    const r = Package.create({ ...validInput(), techniqueIds: [id, id] })
    expect(isErr(r)).toBe(true)
    if (!isErr(r)) return
    expect(r.error.problems.join(' ')).toMatch(/repetir/i)
  })

  it('rechaza precio no positivo', () => {
    expect(isErr(Package.create({ ...validInput(), price: Money.zero() }))).toBe(true)
    expect(
      isErr(Package.create({ ...validInput(), price: Money.fromColones(-1000) })),
    ).toBe(true)
  })

  it('acumula varios problemas en un solo error', () => {
    const r = Package.create({
      ...validInput(),
      name: '',
      techniqueIds: [],
      price: Money.zero(),
    })
    expect(isErr(r)).toBe(true)
    if (!isErr(r)) return
    expect(r.error.problems.length).toBeGreaterThanOrEqual(3)
  })
})

describe('Package — comportamiento (criterio 3)', () => {
  it('deactivate devuelve una copia inactiva sin mutar la original', () => {
    const r = Package.create(validInput())
    if (!isOk(r)) throw new Error('esperaba ok')
    const original = r.value
    const inactivo = original.deactivate()
    expect(inactivo.isActive).toBe(false)
    expect(original.isActive).toBe(true)
    expect(inactivo.id).toBe(original.id)
  })

  it('toView expone el precio en colones enteros y la lista de técnicas', () => {
    const r = Package.create(validInput())
    if (!isOk(r)) throw new Error('esperaba ok')
    expect(r.value.toView()).toEqual({
      id: '22222222-2222-2222-2222-222222222222',
      name: 'Combo cejas',
      techniqueIds: [
        '11111111-1111-1111-1111-111111111111',
        '33333333-3333-3333-3333-333333333333',
      ],
      price: 30000,
      isActive: true,
    })
  })
})
