import { describe, expect, it } from 'vitest'
import { buildAppointmentsUrl } from '../appointments-url'

const APPOINTMENTS_PATH = '/portal/citas'

describe('buildAppointmentsUrl', () => {
  it('une el sitio con la ruta de Mis citas', () => {
    expect(buildAppointmentsUrl('https://lashary.example', APPOINTMENTS_PATH)).toBe('https://lashary.example/portal/citas')
  })

  it('tolera la barra final del sitio', () => {
    expect(buildAppointmentsUrl('https://lashary.example/', APPOINTMENTS_PATH)).toBe('https://lashary.example/portal/citas')
  })

  it.each([undefined, '', 'lashary.example', 'ftp://lashary.example'])('sin un sitio absoluto http(s) (%s) no hay enlace', (siteUrl) => {
    expect(buildAppointmentsUrl(siteUrl, APPOINTMENTS_PATH)).toBeNull()
  })
})
