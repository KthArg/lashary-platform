import { describe, it, expect } from 'vitest'
import { Money } from '@/shared/money'
import { isErr, isOk } from '@/shared/result'
import { buildPackage, markPackageInactive, packageToView } from '@/features/catalog/domain/packages/package'
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

describe('buildPackage — invariantes de dominio (DOM-007, criterio 1)', () => {
  it('crea un paquete válido con dos técnicas', () => {
    const result = buildPackage(validInput())
    expect(isOk(result)).toBe(true)
    if (!isOk(result)) return
    expect(result.value.name).toBe('Combo cejas')
    expect(result.value.techniqueIds).toHaveLength(2)
    expect(result.value.price.colones).toBe(30000)
    expect(result.value.isActive).toBe(true)
  })

  it('crea un paquete válido con más de dos técnicas', () => {
    const result = buildPackage({
      ...validInput(),
      techniqueIds: [
        '11111111-1111-1111-1111-111111111111',
        '33333333-3333-3333-3333-333333333333',
        '44444444-4444-4444-4444-444444444444',
      ],
    })
    expect(isOk(result)).toBe(true)
  })

  it('recorta espacios del nombre', () => {
    const result = buildPackage({ ...validInput(), name: '  Combo cejas  ' })
    if (!isOk(result)) throw new Error('esperaba ok')
    expect(result.value.name).toBe('Combo cejas')
  })

  it('rechaza nombre vacío', () => {
    const result = buildPackage({ ...validInput(), name: '   ' })
    expect(isErr(result)).toBe(true)
    if (!isErr(result)) return
    expect(isPackageValidationError(result.error)).toBe(true)
    expect(result.error.problems.join(' ')).toMatch(/nombre/i)
  })

  it('rechaza menos de dos técnicas', () => {
    const result = buildPackage({
      ...validInput(),
      techniqueIds: ['11111111-1111-1111-1111-111111111111'],
    })
    expect(isErr(result)).toBe(true)
    if (!isErr(result)) return
    expect(result.error.problems.join(' ')).toMatch(/al menos dos técnicas/i)
  })

  it('rechaza lista vacía de técnicas', () => {
    const result = buildPackage({ ...validInput(), techniqueIds: [] })
    expect(isErr(result)).toBe(true)
  })

  it('rechaza técnicas repetidas', () => {
    const id = '11111111-1111-1111-1111-111111111111'
    const result = buildPackage({ ...validInput(), techniqueIds: [id, id] })
    expect(isErr(result)).toBe(true)
    if (!isErr(result)) return
    expect(result.error.problems.join(' ')).toMatch(/repetir/i)
  })

  it('rechaza precio no positivo', () => {
    expect(isErr(buildPackage({ ...validInput(), price: Money.zero() }))).toBe(true)
    expect(
      isErr(buildPackage({ ...validInput(), price: Money.fromColones(-1000) })),
    ).toBe(true)
  })

  it('acumula varios problemas en un solo error', () => {
    const result = buildPackage({
      ...validInput(),
      name: '',
      techniqueIds: [],
      price: Money.zero(),
    })
    expect(isErr(result)).toBe(true)
    if (!isErr(result)) return
    expect(result.error.problems.length).toBeGreaterThanOrEqual(3)
  })
})

describe('Package — comportamiento (criterio 3)', () => {
  it('solo buildPackage marca un Package, y markPackageInactive conserva la marca', () => {
    const result = buildPackage(validInput())
    if (!isOk(result)) throw new Error('setup')
    expect(Object.getOwnPropertySymbols(result.value)).toHaveLength(1)
    expect(Object.getOwnPropertySymbols(markPackageInactive(result.value))).toEqual(
      Object.getOwnPropertySymbols(result.value),
    )
  })

  it('markPackageInactive devuelve una copia inactiva sin mutar la original', () => {
    const result = buildPackage(validInput())
    if (!isOk(result)) throw new Error('esperaba ok')
    const original = result.value
    const inactivo = markPackageInactive(original)
    expect(inactivo.isActive).toBe(false)
    expect(original.isActive).toBe(true)
    expect(inactivo.id).toBe(original.id)
  })

  it('packageToView expone el precio en colones enteros y la lista de técnicas', () => {
    const result = buildPackage(validInput())
    if (!isOk(result)) throw new Error('esperaba ok')
    expect(packageToView(result.value)).toEqual({
      id: '22222222-2222-2222-2222-222222222222',
      name: 'Combo cejas',
      techniqueIds: [
        '11111111-1111-1111-1111-111111111111',
        '33333333-3333-3333-3333-333333333333',
      ],
      price: 30000,
      deposit: 0,
      isActive: true,
    })
  })
})
