import { describe, it, expect } from 'vitest'
import {
  findServiceOption,
  packageOptionKey,
  packageServiceOptionsOf,
  serviceOptionKey,
  serviceOptionsOf,
  type NamedPackage,
  type NamedTechnique,
} from '../service-option'

const technique = (overrides: Partial<NamedTechnique> = {}): NamedTechnique => ({
  id: 't1',
  name: 'Volumen ruso',
  isActive: true,
  durationFirstTimeMin: 120,
  durationRetouchMin: 90,
  bufferMin: 15,
  ...overrides,
})

const pkg = (overrides: Partial<NamedPackage> = {}): NamedPackage => ({
  id: 'p1',
  name: 'Combo clásicas',
  isActive: true,
  durationTotalMin: 110,
  ...overrides,
})

describe('serviceOptionsOf — US-AGE-02, criterio 5', () => {
  it('ofrece primera vez y retoque con la duración más la limpieza', () => {
    expect(serviceOptionsOf([technique()])).toEqual([
      { kind: 'technique', key: 't1', techniqueId: 't1', name: 'Volumen ruso', isFirstTime: true, durationMin: 135 },
      { kind: 'technique', key: 't1.retoque', techniqueId: 't1', name: 'Volumen ruso', isFirstTime: false, durationMin: 105 },
    ])
  })

  it('una técnica sin retoque solo se ofrece en primera vez', () => {
    expect(serviceOptionsOf([technique({ durationRetouchMin: null })]).map((option) => option.key)).toEqual(['t1'])
  })

  it('una técnica inactiva no se ofrece', () => {
    expect(serviceOptionsOf([technique({ isActive: false })])).toEqual([])
  })

  it('la clave de un servicio se encuentra de vuelta', () => {
    const options = serviceOptionsOf([technique(), technique({ id: 't2', name: 'Cejas' })])
    expect(findServiceOption(options, serviceOptionKey('t2', false))?.name).toBe('Cejas')
    expect(findServiceOption(options, 'no-existe')).toBeUndefined()
    expect(findServiceOption(options, undefined)).toBeUndefined()
  })
})

describe('packageServiceOptionsOf — US-AGE-04, criterio 1', () => {
  it('ofrece el paquete con el tiempo total que ya calculó catalog, sin primera vez ni retoque', () => {
    expect(packageServiceOptionsOf([pkg()])).toEqual([
      { kind: 'package', key: 'pkg:p1', packageId: 'p1', name: 'Combo clásicas', durationMin: 110 },
    ])
  })

  it('un paquete desactivado no se ofrece', () => {
    expect(packageServiceOptionsOf([pkg({ isActive: false })])).toEqual([])
  })

  it('la clave de un paquete no choca con la de una técnica', () => {
    const options = [...serviceOptionsOf([technique({ id: 'p1' })]), ...packageServiceOptionsOf([pkg()])]
    expect(findServiceOption(options, packageOptionKey('p1'))).toMatchObject({ kind: 'package', packageId: 'p1' })
    expect(findServiceOption(options, 'p1')).toMatchObject({ kind: 'technique', techniqueId: 'p1' })
  })
})
