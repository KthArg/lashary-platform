import { describe, it, expect } from 'vitest'
import { Money } from '@/shared/money'
import { isErr, isOk } from '@/shared/result'
import { createPackage, deactivatePackage, packageToView } from '@/features/catalog/domain/packages/package'
import { isPackageValidationError } from '@/features/catalog/domain/packages/errors'

const validInput = () => ({
  id: '22222222-2222-2222-2222-222222222222',
  name: 'Combo cejas',
  techniqueIds: [
    '11111111-1111-1111-1111-111111111111',
    '33333333-3333-3333-3333-333333333333',
  ],
  price: Money.fromColones(30000),
})

describe('createPackage — invariantes de dominio (DOM-007, criterio 1)', () => {
  it('crea un paquete válido con dos técnicas', () => {
    const r = createPackage(validInput())
    expect(isOk(r)).toBe(true)
    if (!isOk(r)) return
    expect(r.value.name).toBe('Combo cejas')
    expect(r.value.techniqueIds).toHaveLength(2)
    expect(r.value.price.colones).toBe(30000)
    expect(r.value.isActive).toBe(true)
  })

  it('crea un paquete válido con más de dos técnicas', () => {
    const r = createPackage({
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
    const r = createPackage({ ...validInput(), name: '  Combo cejas  ' })
    if (!isOk(r)) throw new Error('esperaba ok')
    expect(r.value.name).toBe('Combo cejas')
  })

  it('rechaza nombre vacío', () => {
    const r = createPackage({ ...validInput(), name: '   ' })
    expect(isErr(r)).toBe(true)
    if (!isErr(r)) return
    expect(isPackageValidationError(r.error)).toBe(true)
    expect(r.error.problems.join(' ')).toMatch(/nombre/i)
  })

  it('rechaza menos de dos técnicas', () => {
    const r = createPackage({
      ...validInput(),
      techniqueIds: ['11111111-1111-1111-1111-111111111111'],
    })
    expect(isErr(r)).toBe(true)
    if (!isErr(r)) return
    expect(r.error.problems.join(' ')).toMatch(/al menos dos técnicas/i)
  })

  it('rechaza lista vacía de técnicas', () => {
    const r = createPackage({ ...validInput(), techniqueIds: [] })
    expect(isErr(r)).toBe(true)
  })

  it('rechaza técnicas repetidas', () => {
    const id = '11111111-1111-1111-1111-111111111111'
    const r = createPackage({ ...validInput(), techniqueIds: [id, id] })
    expect(isErr(r)).toBe(true)
    if (!isErr(r)) return
    expect(r.error.problems.join(' ')).toMatch(/repetir/i)
  })

  it('rechaza precio no positivo', () => {
    expect(isErr(createPackage({ ...validInput(), price: Money.zero() }))).toBe(true)
    expect(
      isErr(createPackage({ ...validInput(), price: Money.fromColones(-1000) })),
    ).toBe(true)
  })

  it('acumula varios problemas en un solo error', () => {
    const r = createPackage({
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
  it('solo createPackage marca un Package, y deactivatePackage conserva la marca', () => {
    const r = createPackage(validInput())
    if (!isOk(r)) throw new Error('setup')
    expect(Object.getOwnPropertySymbols(r.value)).toHaveLength(1)
    expect(Object.getOwnPropertySymbols(deactivatePackage(r.value))).toEqual(
      Object.getOwnPropertySymbols(r.value),
    )
  })

  it('deactivatePackage devuelve una copia inactiva sin mutar la original', () => {
    const r = createPackage(validInput())
    if (!isOk(r)) throw new Error('esperaba ok')
    const original = r.value
    const inactivo = deactivatePackage(original)
    expect(inactivo.isActive).toBe(false)
    expect(original.isActive).toBe(true)
    expect(inactivo.id).toBe(original.id)
  })

  it('packageToView expone el precio en colones enteros y la lista de técnicas', () => {
    const r = createPackage(validInput())
    if (!isOk(r)) throw new Error('esperaba ok')
    expect(packageToView(r.value)).toEqual({
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
