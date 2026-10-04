import { describe, it, expect } from 'vitest'
import { MAX_LOYALTY_LEVELS } from '../../domain/loyalty'
import { EMPTY_LOYALTY, toLoyaltyContent } from '../get-loyalty'

// La fidelidad publicada tal como la entrega uno-cms (docs/contracts/cms-api.md § `fidelidad`).
const programa = {
  texto: 'Cada cita completada suma una visita.\n\nLos beneficios se aplican solos al llegar a cada nivel.',
  nota: 'Los beneficios no son acumulables.',
}

describe('toLoyaltyContent — la mecánica del programa desde el CMS', () => {
  it('criterio 1: el texto en párrafos, la letra chica y los niveles', () => {
    const loyalty = toLoyaltyContent({
      program: programa,
      levels: [
        { visita: 5, beneficio: '10 % de descuento' },
        { visita: 10, beneficio: 'Servicio gratis', detalle: 'En la técnica que elijas.' },
      ],
    })

    expect(loyalty).toEqual({
      paragraphs: [
        'Cada cita completada suma una visita.',
        'Los beneficios se aplican solos al llegar a cada nivel.',
      ],
      note: 'Los beneficios no son acumulables.',
      levels: [
        { visit: 5, benefit: '10 % de descuento', detail: null },
        { visit: 10, benefit: 'Servicio gratis', detail: 'En la técnica que elijas.' },
      ],
    })
  })

  it('ordena los niveles por visita, no por el orden del editor', () => {
    const { levels } = toLoyaltyContent({
      program: programa,
      levels: [
        { visita: 10, beneficio: 'Gratis' },
        { visita: 5, beneficio: '10 %' },
        { visita: 8, beneficio: '15 %' },
      ],
    })

    expect(levels.map((level) => level.visit)).toEqual([5, 8, 10])
  })

  it('de dos niveles con la misma visita vale el primero del editor', () => {
    const { levels } = toLoyaltyContent({
      program: programa,
      levels: [
        { visita: 5, beneficio: 'Primero' },
        { visita: 5, beneficio: 'Segundo' },
      ],
    })

    expect(levels).toEqual([{ visit: 5, benefit: 'Primero', detail: null }])
  })

  it('ignora niveles sin visita válida o sin beneficio, y corta en el máximo', () => {
    const validos = Array.from({ length: MAX_LOYALTY_LEVELS + 2 }, (_, index) => ({
      visita: index + 1,
      beneficio: `Beneficio ${index + 1}`,
    }))
    const { levels } = toLoyaltyContent({
      program: programa,
      levels: [{ visita: 0, beneficio: 'Cero' }, { visita: 2.5, beneficio: 'x' }, { visita: 60, beneficio: 'x' }, { visita: 3 }, ...validos],
    })

    expect(levels).toHaveLength(MAX_LOYALTY_LEVELS)
    expect(levels[0]).toEqual({ visit: 1, benefit: 'Beneficio 1', detail: null })
  })

  it('sin nada publicado todo llega vacío: no se inventan beneficios', () => {
    expect(toLoyaltyContent({ program: { texto: '' }, levels: [] })).toEqual(EMPTY_LOYALTY)
    expect(toLoyaltyContent(null)).toEqual(EMPTY_LOYALTY)
  })
})
