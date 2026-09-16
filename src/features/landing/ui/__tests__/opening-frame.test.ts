import { describe, it, expect } from 'vitest'
import { openingFrame } from '../opening-frame'

describe('openingFrame — apertura de la foto del hero', () => {
  it('arriba de todo: la foto está fuera de cuadro y el título se ve entero', () => {
    const f = openingFrame(0, 1280, 800)
    expect(f.translateY).toBeGreaterThan(800 / 2)
    expect(f.typeOpacity).toBe(1)
    expect(f.width).toBeCloseTo(1280 * 0.68)
  })

  it('al final del recorrido: la foto ocupa la pantalla, sin redondeo, y el título ya no se ve', () => {
    const f = openingFrame(1, 1280, 800)
    expect(f.width).toBeCloseTo(1280)
    expect(f.height).toBeCloseTo(800)
    expect(f.translateY).toBeCloseTo(0)
    expect(f.radiusX).toBeCloseTo(0)
    expect(f.typeOpacity).toBe(0)
  })

  it('en pantallas angostas la píldora arranca más ancha', () => {
    expect(openingFrame(0, 375, 667).width).toBeCloseTo(375 * 0.86)
  })

  it('acota el progreso fuera de 0..1', () => {
    expect(openingFrame(-2, 1280, 800)).toEqual(openingFrame(0, 1280, 800))
    expect(openingFrame(5, 1280, 800)).toEqual(openingFrame(1, 1280, 800))
  })
})
