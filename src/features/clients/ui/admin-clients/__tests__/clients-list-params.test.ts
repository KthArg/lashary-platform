import { describe, it, expect } from 'vitest'
import { readClientsListParams, DELINQUENCY_FILTER_VALUES } from '@/features/clients'

describe('readClientsListParams', () => {
  it('lee la pagina, el tamano, el nombre y el rango de la URL', () => {
    expect(readClientsListParams({
      page: '2', pageSize: '50', name: '  ana  ', appointmentFrom: '2026-04-01', appointmentTo: '2026-06-30',
      delinquency: DELINQUENCY_FILTER_VALUES[0],
    })).toEqual({
      page: 2, pageSize: 50, name: 'ana', appointmentFrom: '2026-04-01', appointmentTo: '2026-06-30',
      delinquency: DELINQUENCY_FILTER_VALUES[0],
    })
  })

  it('sin parametros no filtra ni elige pagina', () => {
    expect(readClientsListParams({})).toEqual({
      page: undefined, pageSize: undefined, name: '', appointmentFrom: '', appointmentTo: '', delinquency: '',
    })
  })

  it('lee cada estado de morosidad y descarta lo que no es un estado visible', () => {
    for (const value of DELINQUENCY_FILTER_VALUES) {
      expect(readClientsListParams({ delinquency: value })).toMatchObject({ delinquency: value })
    }
    for (const value of ['dismissed', 'ACTIVE', 'todas', '']) {
      expect(readClientsListParams({ delinquency: value })).toMatchObject({ delinquency: '' })
    }
  })

  it('una fecha que no existe no cuenta como filtro aplicado', () => {
    expect(readClientsListParams({ appointmentFrom: '2026-02-30', appointmentTo: 'ayer' })).toMatchObject({ appointmentFrom: '', appointmentTo: '' })
  })

  it('un parametro repetido en la URL usa el primer valor, no un arreglo', () => {
    expect(readClientsListParams({
      name: ['ana', 'bea'], appointmentFrom: ['2026-04-01', '2026-05-01'], page: ['3', '4'],
      delinquency: [DELINQUENCY_FILTER_VALUES[1], DELINQUENCY_FILTER_VALUES[2]],
    })).toMatchObject({ name: 'ana', appointmentFrom: '2026-04-01', page: 3, delinquency: DELINQUENCY_FILTER_VALUES[1] })
  })

  it('un numero que no se puede leer no elige pagina', () => {
    expect(readClientsListParams({ page: 'tres', pageSize: '' })).toMatchObject({ page: undefined, pageSize: undefined })
  })
})
