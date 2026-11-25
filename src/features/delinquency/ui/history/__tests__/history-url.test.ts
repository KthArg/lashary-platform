import { describe, it, expect } from 'vitest'
import { HISTORY_DEFAULT_PAGE_SIZE, HISTORY_PAGE_SIZES } from '@/features/delinquency/domain/case-history'
import { HISTORY_PATH } from '@/features/delinquency/ui/history/constants/history-strings'
import { buildHistoryUrl, readHistoryParams } from '@/features/delinquency/ui/history/utils/history-url'

describe('readHistoryParams', () => {
  it('lee el filtro, la página y el tamaño de la URL', () => {
    expect(readHistoryParams({ filter: 'settled', page: '2', pageSize: '50' })).toEqual({
      filter: 'settled',
      page: 2,
      pageSize: 50,
    })
  })

  it('sin parámetros deja todo sin definir para que el dominio ponga los valores por defecto', () => {
    expect(readHistoryParams({})).toEqual({ filter: undefined, page: undefined, pageSize: undefined })
  })

  it('con un parámetro repetido toma el primero', () => {
    expect(readHistoryParams({ filter: ['lifted', 'settled'], page: ['1', '3'] })).toMatchObject({
      filter: 'lifted',
      page: 1,
    })
  })

  it('una página que no es número no se lee', () => {
    expect(readHistoryParams({ page: 'abc', pageSize: '' })).toMatchObject({ page: undefined, pageSize: undefined })
  })
})

describe('buildHistoryUrl', () => {
  const defaults = { filter: 'all', page: 0, pageSize: HISTORY_DEFAULT_PAGE_SIZE } as const

  it('con los valores por defecto devuelve la ruta sin parámetros', () => {
    expect(buildHistoryUrl(defaults)).toBe(HISTORY_PATH)
  })

  it('arma el filtro, la página y el tamaño cuando no son los por defecto', () => {
    const otherSize = HISTORY_PAGE_SIZES[0]
    expect(buildHistoryUrl({ filter: 'active', page: 2, pageSize: otherSize })).toBe(
      `${HISTORY_PATH}?filter=active&page=2&pageSize=${otherSize}`,
    )
  })

  it('la primera página no lleva el parámetro page', () => {
    expect(buildHistoryUrl({ ...defaults, filter: 'dismissed' })).toBe(`${HISTORY_PATH}?filter=dismissed`)
  })
})
