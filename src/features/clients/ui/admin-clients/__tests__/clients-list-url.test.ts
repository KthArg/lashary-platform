import { describe, it, expect } from 'vitest'
import { buildClientsListUrl } from '@/features/clients'

const PATH = '/admin/clients'

describe('buildClientsListUrl', () => {
  it('sin consulta que conservar devuelve la ruta sola', () => {
    expect(buildClientsListUrl(PATH, '', {})).toBe(PATH)
    expect(buildClientsListUrl(PATH, 'name=ana', { name: null })).toBe(PATH)
  })

  it('un nombre en blanco no filtra: lo quita de la consulta', () => {
    expect(buildClientsListUrl(PATH, 'name=ana', { name: '   ' })).toBe(PATH)
  })

  it('recorta el nombre antes de escribirlo', () => {
    expect(buildClientsListUrl(PATH, '', { name: '  ana  ' })).toBe(`${PATH}?name=ana`)
  })

  it('filtrar vuelve a la primera pagina y conserva el tamano', () => {
    expect(buildClientsListUrl(PATH, 'page=3&pageSize=50', { name: 'ana', page: null }))
      .toBe(`${PATH}?pageSize=50&name=ana`)
  })

  it('cambiar de pagina conserva el resto de la consulta', () => {
    expect(buildClientsListUrl(PATH, 'name=ana&pageSize=10', { page: 1 }))
      .toBe(`${PATH}?name=ana&pageSize=10&page=1`)
  })

  it('cambiar el tamano vuelve a la primera pagina', () => {
    expect(buildClientsListUrl(PATH, 'page=3', { pageSize: 50, page: null }))
      .toBe(`${PATH}?pageSize=50`)
  })

  it('un parametro ausente en los cambios no se toca', () => {
    expect(buildClientsListUrl(PATH, 'name=ana&page=2', { pageSize: 10 }))
      .toBe(`${PATH}?name=ana&page=2&pageSize=10`)
  })
})
