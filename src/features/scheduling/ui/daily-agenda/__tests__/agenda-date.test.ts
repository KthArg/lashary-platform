import { describe, it, expect } from 'vitest'
import { agendaDayHref, readAgendaDate } from '../utils/agenda-date'

const TODAY = '2027-03-10'

describe('readAgendaDate — US-AGE-11', () => {
  it('toma la fecha de ?fecha=, también un día pasado (criterio 4)', () => {
    expect(readAgendaDate({ fecha: '2027-03-11' }, TODAY)).toBe('2027-03-11')
    expect(readAgendaDate({ fecha: '2027-03-01' }, TODAY)).toBe('2027-03-01')
    expect(readAgendaDate({ fecha: ['2027-03-12', '2027-03-13'] }, TODAY)).toBe('2027-03-12')
  })

  it('una fecha ausente, mal escrita o inexistente es hoy', () => {
    for (const fecha of [undefined, '', 'mañana', '2027-02-30', '2027-3-1', '9999-12-31', '0001-01-01']) {
      expect(readAgendaDate({ fecha }, TODAY)).toBe(TODAY)
    }
  })
})

describe('agendaDayHref', () => {
  it('lleva la fecha en la URL de la agenda', () => {
    expect(agendaDayHref('2027-03-11')).toBe('/admin/citas/agenda?fecha=2027-03-11')
  })
})
