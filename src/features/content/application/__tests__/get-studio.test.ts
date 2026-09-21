import { describe, it, expect } from 'vitest'
import { MAX_CREDENTIALS, MAX_REASONS } from '../../domain/studio'
import { studioFallback } from '../fallback-messages'
import { toStudioContent, type RawStudioContent } from '../get-studio'

// El estudio publicado tal como lo entrega uno-cms (docs/contracts/cms-api.md § `estudio`).
const estudio = (overrides: Record<string, unknown> = {}) => ({
  nombre: 'Ana Rojas',
  rol: 'Lash artist y fundadora',
  retrato: { mediaId: 'm1', url: 'https://cdn.test/ana.jpg', alt: 'Ana en su cabina' },
  texto: 'Abrí el estudio en 2019.\n\nHoy trabajo con una clienta por cita.',
  anosExperiencia: 7,
  ...overrides,
})

const crudo = (overrides: Partial<RawStudioContent> = {}): RawStudioContent => ({
  profile: estudio(),
  credentials: [],
  reasons: [],
  ...overrides,
})

describe('toStudioContent — El estudio desde el CMS', () => {
  it('criterio 1: foto, texto descriptivo y experiencia, con el texto partido en párrafos', () => {
    const { profile } = toStudioContent(crudo(), 'https://cms.test')

    expect(profile).toEqual({
      name: 'Ana Rojas',
      role: 'Lash artist y fundadora',
      portrait: { url: 'https://cdn.test/ana.jpg', alt: 'Ana en su cabina' },
      paragraphs: ['Abrí el estudio en 2019.', 'Hoy trabajo con una clienta por cita.'],
      yearsOfExperience: 7,
    })
  })

  it('criterio 2: la trayectoria trae formación y certificaciones con entidad y año', () => {
    const { credentials } = toStudioContent(
      crudo({
        credentials: [
          { titulo: 'Extensiones clásicas', tipo: 'formacion', entidad: 'Academia X', anio: 2018 },
          { titulo: 'Volumen ruso', tipo: 'certificacion' },
        ],
      }),
      'https://cms.test',
    )

    expect(credentials).toEqual([
      { title: 'Extensiones clásicas', kind: 'formacion', issuer: 'Academia X', year: 2018 },
      { title: 'Volumen ruso', kind: 'certificacion', issuer: null, year: null },
    ])
  })

  it('descarta credenciales sin título o con un tipo fuera del contrato, y corta en el máximo', () => {
    const validas = Array.from({ length: MAX_CREDENTIALS + 2 }, (_, index) => ({
      titulo: `Curso ${index}`,
      tipo: 'formacion',
    }))
    const { credentials } = toStudioContent(
      crudo({ credentials: [{ titulo: '', tipo: 'formacion' }, { titulo: 'X', tipo: 'diploma' }, ...validas] }),
      'https://cms.test',
    )

    expect(credentials).toHaveLength(MAX_CREDENTIALS)
    expect(credentials[0]?.title).toBe('Curso 0')
  })

  it('años fuera del rango o no enteros cuentan como ausentes', () => {
    const conAnos = (anosExperiencia: unknown) =>
      toStudioContent(crudo({ profile: estudio({ anosExperiencia }) }), 'https://cms.test').profile.yearsOfExperience

    expect(conAnos(61)).toBeNull()
    expect(conAnos(2.5)).toBeNull()
    expect(conAnos('7')).toBeNull()
    expect(conAnos(0)).toBe(0)
  })

  it('sin nombre ni texto publicados usa el respaldo entero, que no inventa a la dueña', () => {
    const { profile } = toStudioContent(crudo({ profile: { nombre: '', texto: '', rol: 'x' } }), 'https://cms.test')

    expect(profile).toEqual(studioFallback.profile)
    expect(profile.name).toBeNull()
    expect(profile.portrait).toBeNull()
  })

  it('sin retrato válido muestra el resto igual', () => {
    const { profile } = toStudioContent(crudo({ profile: estudio({ retrato: { url: '', alt: '' } }) }), 'https://cms.test')

    expect(profile.portrait).toBeNull()
    expect(profile.name).toBe('Ana Rojas')
  })

  it('Por qué acá: las razones publicadas, hasta el máximo', () => {
    const razones = Array.from({ length: MAX_REASONS + 1 }, (_, index) => ({
      titulo: `Razón ${index}`,
      texto: `Porque ${index}.`,
    }))
    const { reasons } = toStudioContent(crudo({ reasons: razones }), 'https://cms.test')

    expect(reasons).toHaveLength(MAX_REASONS)
    expect(reasons[0]).toEqual({ title: 'Razón 0', text: 'Porque 0.' })
  })

  it('Por qué acá no queda vacía: sin razones válidas, las del diseño', () => {
    const { reasons } = toStudioContent(crudo({ reasons: [{ titulo: 'Sin texto' }] }), 'https://cms.test')
    expect(reasons).toEqual(studioFallback.reasons)
  })

  it('sin respuesta del CMS sirve el respaldo entero, sin credenciales inventadas', () => {
    expect(toStudioContent(null, 'https://cms.test')).toEqual(studioFallback)
    expect(studioFallback.credentials).toEqual([])
  })
})
