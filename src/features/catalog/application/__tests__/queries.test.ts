import { describe, it, expect } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import { listTechniques, getTechnique } from '@/features/catalog/application/queries'
import { TechniqueNotFound } from '@/features/catalog/domain/errors'
import { FakeTechniqueRepository } from './fake-repository'
import { makeTechnique } from './technique-fixture'

describe('listTechniques', () => {
  it('devuelve solo activas por defecto, como TechniqueView', async () => {
    const repo = new FakeTechniqueRepository([
      makeTechnique({ id: 'a', name: 'A', isActive: true }),
      makeTechnique({ id: 'b', name: 'B', isActive: false }),
    ])
    const page = await listTechniques(repo)()
    expect(page.items.map((t) => t.id)).toEqual(['a'])
    expect(page.total).toBe(1)
    expect(typeof page.items[0].priceFirstTime).toBe('number')
  })

  it('incluye inactivas cuando activeOnly = false', async () => {
    const repo = new FakeTechniqueRepository([
      makeTechnique({ id: 'a', isActive: true }),
      makeTechnique({ id: 'b', isActive: false }),
    ])
    const page = await listTechniques(repo)({ activeOnly: false })
    expect(page.total).toBe(2)
  })

  it('pagina con tamaño por defecto 50 y tope 100', async () => {
    const repo = new FakeTechniqueRepository(
      Array.from({ length: 120 }, (_, i) =>
        makeTechnique({ id: `t${i}`, name: `T${String(i).padStart(3, '0')}` }),
      ),
    )
    const first = await listTechniques(repo)({ page: 1 })
    expect(first.items).toHaveLength(50)
    expect(first.pageSize).toBe(50)

    const capped = await listTechniques(repo)({ pageSize: 999 })
    expect(capped.pageSize).toBe(100)
    expect(capped.items).toHaveLength(100)

    const second = await listTechniques(repo)({ page: 2, pageSize: 100 })
    expect(second.items).toHaveLength(20)
  })

  it('normaliza page y pageSize inválidos', async () => {
    const repo = new FakeTechniqueRepository([makeTechnique({ id: 'a' })])
    const page = await listTechniques(repo)({ page: 0, pageSize: -5 })
    expect(page.page).toBe(1)
    expect(page.pageSize).toBe(1)
  })
})

describe('getTechnique', () => {
  it('devuelve la técnica cuando existe', async () => {
    const repo = new FakeTechniqueRepository([makeTechnique({ id: 'x' })])
    const result = await getTechnique(repo)('x')
    expect(isOk(result)).toBe(true)
    if (isOk(result)) expect(result.value.id).toBe('x')
  })

  it('devuelve TechniqueNotFound cuando no existe', async () => {
    const repo = new FakeTechniqueRepository([])
    const result = await getTechnique(repo)('nope')
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(TechniqueNotFound)
      expect(result.error.techniqueId).toBe('nope')
    }
  })
})
