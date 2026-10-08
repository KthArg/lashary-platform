import { describe, expect, it } from 'vitest'
import { Money } from '@/shared/money'
import { isOk, isErr } from '@/shared/result'
import { buildPackage, packageToView } from '../../../domain/packages/package'
import { createPackage, updatePackage, deactivatePackage } from '../commands'
import { getPackage, listPackages } from '../queries'
import { createFakePackageRepository } from './fake-package-repository'
import { FakeTechniqueRepository } from '../../__tests__/fake-repository'
import { makeTechnique } from '../../__tests__/technique-fixture'

const model = { name: 'Paquete con anticipo', techniqueIds: ['t1', 't2'], price: 30000 }
const techniques = new FakeTechniqueRepository([
  makeTechnique({ id: 't1' }),
  makeTechnique({ id: 't2' }),
])
const domainInput = { ...model, id: 'p1', price: Money.fromColones(model.price) }

describe('anticipo propio del paquete (US-AGE-13)', () => {
  it('expone el anticipo elegido y lo conserva al desactivar', async () => {
    const repo = createFakePackageRepository()
    const deps = { packageRepo: repo, techniqueRepo: techniques, newId: () => 'p1' }
    const created = await createPackage(deps)({ ...model, deposit: 9000 })
    expect(created).toMatchObject({ ok: true, value: { deposit: 9000 } })
    expect(await deactivatePackage(deps)('p1')).toMatchObject({
      ok: true, value: { deposit: 9000, isActive: false },
    })
  })

  it('editar cambia el anticipo y las consultas devuelven el monto actualizado', async () => {
    const repo = createFakePackageRepository()
    const deps = { packageRepo: repo, techniqueRepo: techniques, newId: () => 'p1' }
    await createPackage(deps)({ ...model, deposit: 9000 })
    await updatePackage(deps)('p1', { ...model, deposit: 11000 })
    expect(await getPackage(repo)('p1')).toMatchObject({ ok: true, value: { deposit: 11000 } })
    expect((await listPackages(repo)()).items[0].deposit).toBe(11000)
    await updatePackage(deps)('p1', { ...model, price: 32000 })
    expect(await getPackage(repo)('p1')).toMatchObject({ ok: true, value: { deposit: 11000 } })
  })

  it('permite cero y conserva compatibilidad al crear sin anticipo explícito', async () => {
    const built = buildPackage(domainInput)
    if (!isOk(built)) throw new Error('paquete inválido')
    expect(packageToView(built.value).deposit).toBe(0)
    const repo = createFakePackageRepository()
    const deps = { packageRepo: repo, techniqueRepo: techniques, newId: () => 'p1' }
    expect(await createPackage(deps)(model)).toMatchObject({ ok: true, value: { deposit: 0 } })
  })

  it.each([-1, 1.5, NaN])('rechaza el anticipo inválido %s antes de guardar', async (deposit) => {
    const repo = createFakePackageRepository()
    const deps = { packageRepo: repo, techniqueRepo: techniques, newId: () => 'p1' }
    expect(isErr(await createPackage(deps)({ ...model, deposit }))).toBe(true)
    expect(repo.saveCalls).toBe(0)
  })

  it('el dominio rechaza dinero negativo para el anticipo', () => {
    expect(isErr(buildPackage({ ...domainInput, deposit: Money.fromColones(-1) }))).toBe(true)
  })
})
