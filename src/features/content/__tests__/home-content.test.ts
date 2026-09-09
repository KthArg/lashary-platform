import { describe, expect, it } from 'vitest'
import { parseHomeContent } from '../domain/home-content'

const valid = {
  heroImage: { url: 'https://cms.test/hero.jpg', alt: 'Estudio LASHARY' },
  welcomeText: 'Bienvenida a LASHARY.',
  ctaLabel: 'Agendar cita',
}

describe('parseHomeContent', () => {
  it('acepta una respuesta completa y bien formada', () => {
    expect(parseHomeContent(valid)).toEqual(valid)
  })

  it('acepta alt vacío (imagen decorativa)', () => {
    const out = parseHomeContent({ ...valid, heroImage: { url: valid.heroImage.url, alt: '' } })
    expect(out?.heroImage.alt).toBe('')
  })

  it.each([
    ['no es objeto', 'texto suelto'],
    ['es null', null],
    ['sin heroImage', { welcomeText: 'a', ctaLabel: 'b' }],
    ['heroImage sin url', { ...valid, heroImage: { alt: 'a' } }],
    ['url en blanco', { ...valid, heroImage: { url: '   ', alt: 'a' } }],
    ['alt no es string', { ...valid, heroImage: { url: 'https://x/y', alt: 3 } }],
    ['welcomeText vacío', { ...valid, welcomeText: '' }],
    ['ctaLabel ausente', { heroImage: valid.heroImage, welcomeText: 'a' }],
  ])('descarta la respuesta entera si %s', (_label, input) => {
    expect(parseHomeContent(input)).toBeNull()
  })
})
