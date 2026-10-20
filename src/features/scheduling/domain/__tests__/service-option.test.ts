import { describe, it, expect } from 'vitest'
import { findServiceOption, serviceOptionKey, serviceOptionsOf, type NamedTechnique } from '../service-option'

const technique = (overrides: Partial<NamedTechnique> = {}): NamedTechnique => ({
  id: 't1',
  name: 'Volumen ruso',
  isActive: true,
  durationFirstTimeMin: 120,
  durationRetouchMin: 90,
  bufferMin: 15,
  ...overrides,
})

describe('serviceOptionsOf — US-AGE-02, criterio 5', () => {
  it('ofrece primera vez y retoque con la duración más la limpieza', () => {
    expect(serviceOptionsOf([technique()])).toEqual([
      { key: 't1', techniqueId: 't1', name: 'Volumen ruso', isFirstTime: true, durationMin: 135 },
      { key: 't1.retoque', techniqueId: 't1', name: 'Volumen ruso', isFirstTime: false, durationMin: 105 },
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
