import { describe, it, expect } from 'vitest'
import { readAppointmentDate, readAppointmentRange } from '../appointment-range'

describe('readAppointmentDate', () => {
  it('acepta una fecha real en formato AAAA-MM-DD', () => {
    expect(readAppointmentDate('2026-06-30')).toBe('2026-06-30')
    expect(readAppointmentDate('2028-02-29')).toBe('2028-02-29')
    expect(readAppointmentDate('2000-02-29')).toBe('2000-02-29')
  })

  it('una fecha que no existe en el calendario no filtra', () => {
    for (const impossible of ['2026-02-30', '2027-02-29', '2100-02-29', '2026-13-01', '2026-00-10', '2026-04-31', '2026-01-00']) {
      expect(readAppointmentDate(impossible)).toBeNull()
    }
  })

  it('un texto con otro formato, vacío o que no es texto no filtra', () => {
    for (const value of ['30/06/2026', '2026-6-30', '2026-06-30T00:00', ' 2026-06-30', '', undefined, null, 20260630]) {
      expect(readAppointmentDate(value)).toBeNull()
    }
  })
})

describe('readAppointmentRange', () => {
  it('lee los dos extremos y deja abierto el que falta', () => {
    expect(readAppointmentRange('2026-04-01', '2026-06-30')).toEqual({ ok: true, value: { from: '2026-04-01', to: '2026-06-30' } })
    expect(readAppointmentRange('2026-04-01', undefined)).toEqual({ ok: true, value: { from: '2026-04-01', to: null } })
    expect(readAppointmentRange(undefined, '2026-06-30')).toEqual({ ok: true, value: { from: null, to: '2026-06-30' } })
    expect(readAppointmentRange(undefined, undefined)).toEqual({ ok: true, value: { from: null, to: null } })
  })

  it('el mismo día como desde y hasta es un rango válido', () => {
    expect(readAppointmentRange('2026-06-30', '2026-06-30')).toEqual({ ok: true, value: { from: '2026-06-30', to: '2026-06-30' } })
  })

  it('un desde posterior al hasta es un rango al revés', () => {
    expect(readAppointmentRange('2026-06-30', '2026-04-01')).toEqual({ ok: false, error: 'inverted-appointment-range' })
  })

  it('un extremo inválido se ignora y no cuenta para decidir si el rango está al revés', () => {
    expect(readAppointmentRange('2026-02-30', '2026-01-01')).toEqual({ ok: true, value: { from: null, to: '2026-01-01' } })
  })
})
