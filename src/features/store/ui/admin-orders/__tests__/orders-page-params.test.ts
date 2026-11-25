import { describe, it, expect } from 'vitest'
import { readOrdersPageParams } from '../orders-page-params'

describe('readOrdersPageParams', () => {
  it('sin parámetros, pendientes y página 0', () => {
    expect(readOrdersPageParams({})).toEqual({ tab: 'pendientes', page: 0 })
  })

  it('tab=historial selecciona el historial', () => {
    expect(readOrdersPageParams({ tab: 'historial' })).toEqual({ tab: 'historial', page: 0 })
  })

  it('un tab desconocido cae en pendientes', () => {
    expect(readOrdersPageParams({ tab: 'otra-cosa' })).toEqual({ tab: 'pendientes', page: 0 })
  })

  it('lee la página del historial', () => {
    expect(readOrdersPageParams({ tab: 'historial', page: '2' })).toEqual({ tab: 'historial', page: 2 })
  })

  it('una página inválida o negativa cae en 0', () => {
    expect(readOrdersPageParams({ page: 'no-es-numero' }).page).toBe(0)
    expect(readOrdersPageParams({ page: '-1' }).page).toBe(0)
    expect(readOrdersPageParams({ page: '1.5' }).page).toBe(0)
  })
})
