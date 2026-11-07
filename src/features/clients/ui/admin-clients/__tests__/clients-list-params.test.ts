import { describe, it, expect } from 'vitest'
import { readClientsListParams } from '@/features/clients'

describe('readClientsListParams', () => {
  it('lee la pagina, el tamano, el nombre y el rango de la URL', () => {
    expect(readClientsListParams({
      page: '2', pageSize: '50', name: '  ana  ', visitFrom: '2026-04-01', visitTo: '2026-06-30',
    })).toEqual({ page: 2, pageSize: 50, name: 'ana', visitFrom: '2026-04-01', visitTo: '2026-06-30' })
  })

  it('sin parametros no filtra ni elige pagina', () => {
    expect(readClientsListParams({})).toEqual({ page: undefined, pageSize: undefined, name: '', visitFrom: '', visitTo: '' })
  })

  it('una fecha que no existe no cuenta como filtro aplicado', () => {
    expect(readClientsListParams({ visitFrom: '2026-02-30', visitTo: 'ayer' })).toMatchObject({ visitFrom: '', visitTo: '' })
  })

  it('un parametro repetido en la URL usa el primer valor, no un arreglo', () => {
    expect(readClientsListParams({
      name: ['ana', 'bea'], visitFrom: ['2026-04-01', '2026-05-01'], page: ['3', '4'],
    })).toMatchObject({ name: 'ana', visitFrom: '2026-04-01', page: 3 })
  })

  it('un numero que no se puede leer no elige pagina', () => {
    expect(readClientsListParams({ page: 'tres', pageSize: '' })).toMatchObject({ page: undefined, pageSize: undefined })
  })
})
