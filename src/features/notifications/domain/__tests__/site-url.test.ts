import { describe, expect, it } from 'vitest'
import { buildSiteUrl } from '../site-url'

const SAMPLE_PATH = '/portal/citas'

describe('buildSiteUrl', () => {
  it('une el sitio con una ruta del portal', () => {
    expect(buildSiteUrl('https://lashary.example', SAMPLE_PATH)).toBe('https://lashary.example/portal/citas')
  })

  it('tolera la barra final del sitio', () => {
    expect(buildSiteUrl('https://lashary.example/', SAMPLE_PATH)).toBe('https://lashary.example/portal/citas')
  })

  it.each([undefined, '', 'lashary.example', 'ftp://lashary.example'])('sin un sitio absoluto http(s) (%s) no hay enlace', (siteUrl) => {
    expect(buildSiteUrl(siteUrl, SAMPLE_PATH)).toBeNull()
  })
})
