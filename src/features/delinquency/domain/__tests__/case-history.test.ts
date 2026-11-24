import { describe, it, expect } from 'vitest'
import {
  displayedState,
  HISTORY_DEFAULT_PAGE_SIZE,
  HISTORY_FILTERS,
  HISTORY_PAGE_SIZES,
  normalizeHistoryQuery,
} from '../case-history'
import { CASE_STATES } from '../delinquency-case'

describe('displayedState', () => {
  it('una activa con solicitud pendiente se muestra pendiente de aprobación', () => {
    expect(displayedState('active', true)).toBe('pending_approval')
  })

  it('una activa sin solicitud pendiente sigue activa', () => {
    expect(displayedState('active', false)).toBe('active')
  })

  it('los demás estados no cambian aunque haya una solicitud', () => {
    for (const state of CASE_STATES.filter((caseState) => caseState !== 'active')) {
      expect(displayedState(state, true)).toBe(state)
    }
  })
})

describe('normalizeHistoryQuery', () => {
  it('conserva un filtro, una página y un tamaño válidos', () => {
    const pageSize = HISTORY_PAGE_SIZES[0]
    expect(normalizeHistoryQuery({ filter: 'lifted', page: 3, pageSize })).toEqual({ filter: 'lifted', page: 3, pageSize })
  })

  it('acepta todos los filtros de la lista', () => {
    for (const filter of HISTORY_FILTERS) {
      expect(normalizeHistoryQuery({ filter }).filter).toBe(filter)
    }
  })

  it('sin datos usa todas, la primera página y el tamaño por defecto', () => {
    expect(normalizeHistoryQuery({})).toEqual({ filter: 'all', page: 0, pageSize: HISTORY_DEFAULT_PAGE_SIZE })
  })

  it('un filtro desconocido vuelve a todas', () => {
    expect(normalizeHistoryQuery({ filter: 'borradas' }).filter).toBe('all')
  })

  it('una página negativa, decimal o no numérica vuelve a la primera', () => {
    for (const page of [-1, 1.5, Number.NaN]) {
      expect(normalizeHistoryQuery({ page }).page).toBe(0)
    }
  })

  it('un tamaño fuera de la lista vuelve al tamaño por defecto', () => {
    const outsideList = Math.max(...HISTORY_PAGE_SIZES) + 1
    expect(normalizeHistoryQuery({ pageSize: outsideList }).pageSize).toBe(HISTORY_DEFAULT_PAGE_SIZE)
  })
})
