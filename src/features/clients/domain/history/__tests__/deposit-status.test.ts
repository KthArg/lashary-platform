import { describe, it, expect } from 'vitest'
import { depositStatusOf } from '../deposit-status'

describe('depositStatusOf — el estado de pago de una cita es el de su anticipo', () => {
  it('una cita sin anticipo requerido es «sin anticipo», aunque no se haya registrado nada', () => {
    expect(depositStatusOf({ depositRequired: 0, depositRegistered: 0 })).toBe('none')
  })

  it('con anticipo requerido y nada registrado, el anticipo está pendiente', () => {
    expect(depositStatusOf({ depositRequired: 10000, depositRegistered: 0 })).toBe('pending')
  })

  it('un anticipo registrado a medias sigue pendiente', () => {
    expect(depositStatusOf({ depositRequired: 10000, depositRegistered: 4000 })).toBe('pending')
  })

  it('con el anticipo completo registrado, está registrado', () => {
    expect(depositStatusOf({ depositRequired: 10000, depositRegistered: 10000 })).toBe('registered')
  })
})
