import { describe, it, expect } from 'vitest'
import { buildClientsListUrl, DELINQUENCY_FILTER_VALUES } from '@/features/clients'

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

  it('escribe el rango de ultima cita y conserva el nombre', () => {
    expect(buildClientsListUrl(PATH, 'name=ana&page=2', { appointmentFrom: '2026-04-01', appointmentTo: '2026-06-30', page: null }))
      .toBe(`${PATH}?name=ana&appointmentFrom=2026-04-01&appointmentTo=2026-06-30`)
  })

  it('un extremo vacio o nulo del rango lo quita de la consulta', () => {
    expect(buildClientsListUrl(PATH, 'appointmentFrom=2026-04-01&appointmentTo=2026-06-30', { appointmentFrom: '', appointmentTo: null }))
      .toBe(PATH)
  })

  it('escribe el filtro de morosidad, conserva el resto y vuelve a la primera pagina', () => {
    expect(buildClientsListUrl(PATH, 'name=ana&appointmentFrom=2026-04-01&page=2', { delinquency: DELINQUENCY_FILTER_VALUES[0], page: null }))
      .toBe(`${PATH}?name=ana&appointmentFrom=2026-04-01&delinquency=${DELINQUENCY_FILTER_VALUES[0]}`)
  })

  it('un filtro de morosidad vacio o nulo lo quita de la consulta', () => {
    const query = `delinquency=${DELINQUENCY_FILTER_VALUES[1]}&name=ana`
    expect(buildClientsListUrl(PATH, query, { delinquency: '' })).toBe(`${PATH}?name=ana`)
    expect(buildClientsListUrl(PATH, query, { delinquency: null })).toBe(`${PATH}?name=ana`)
  })

  it('cambiar el nombre conserva el rango', () => {
    expect(buildClientsListUrl(PATH, 'appointmentFrom=2026-04-01', { name: 'bea', page: null }))
      .toBe(`${PATH}?appointmentFrom=2026-04-01&name=bea`)
  })
})
