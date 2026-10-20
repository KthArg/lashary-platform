import { describe, it, expect } from 'vitest'
import { requestedPage } from './page.data'

describe('requestedPage — el número de página de /blog?pagina=', () => {
  it('lee un entero positivo', () => {
    expect(requestedPage('1')).toBe(1)
    expect(requestedPage('12')).toBe(12)
  })

  it('sin parámetro es la primera', () => {
    expect(requestedPage(undefined)).toBe(1)
  })

  it('lo que no es un entero positivo es la primera', () => {
    for (const value of ['0', '-2', '1.5', 'dos', '', ' 3', '3abc', '1e3', '9999999']) {
      expect(requestedPage(value)).toBe(1)
    }
  })

  it('con el parámetro repetido usa el primero', () => {
    expect(requestedPage(['3', '7'])).toBe(3)
  })
})
