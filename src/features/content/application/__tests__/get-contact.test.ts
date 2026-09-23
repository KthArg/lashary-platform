import { describe, it, expect } from 'vitest'
import { MAX_FAQS, MAX_HOURS } from '../../domain/contact'
import { faqFallback } from '../fallback-messages'
import { toContactContent, type RawContactContent } from '../get-contact'

// El contacto publicado tal como lo entrega uno-cms (docs/contracts/cms-api.md § `contacto`).
const contacto = (overrides: Record<string, unknown> = {}) => ({
  direccion: '200 m norte de la iglesia',
  ciudad: 'Ciudad Quesada, Alajuela, Costa Rica',
  nota: 'Atención solo con cita reservada.',
  whatsapp: '50688887777',
  mensajeWhatsapp: 'Hola, quiero agendar una cita.',
  instagram: 'https://instagram.com/lashary',
  facebook: 'https://facebook.com/lashary',
  correo: 'hola@lashary.cr',
  mapa: 'https://www.google.com/maps/embed?pb=!1m18',
  mapaEnlace: 'https://maps.app.goo.gl/abc',
  ...overrides,
})

const crudo = (overrides: Partial<RawContactContent> = {}): RawContactContent => ({
  contact: contacto(),
  hours: [],
  faqs: [],
  ...overrides,
})

const contactoDe = (overrides: Record<string, unknown>) =>
  toContactContent(crudo({ contact: contacto(overrides) })).contact

describe('toContactContent — contacto, horario y preguntas desde el CMS', () => {
  it('criterio 1: ubicación y medios de contacto', () => {
    const { contact } = toContactContent(crudo())

    expect(contact).toMatchObject({
      address: '200 m norte de la iglesia',
      city: 'Ciudad Quesada, Alajuela, Costa Rica',
      note: 'Atención solo con cita reservada.',
      email: 'hola@lashary.cr',
      mapLink: 'https://maps.app.goo.gl/abc',
    })
  })

  it('criterio 2: el enlace de WhatsApp lleva el número y el mensaje inicial codificado', () => {
    expect(contactoDe({})?.whatsapp).toEqual({
      number: '50688887777',
      message: 'Hola, quiero agendar una cita.',
      href: 'https://wa.me/50688887777?text=Hola%2C%20quiero%20agendar%20una%20cita.',
    })
  })

  it('un número con espacios, signos o letras no arma el botón de WhatsApp', () => {
    expect(contactoDe({ whatsapp: '+506 8888 7777' })?.whatsapp).toBeNull()
    expect(contactoDe({ whatsapp: '506-88887777' })?.whatsapp).toBeNull()
    expect(contactoDe({ whatsapp: '1234' })?.whatsapp).toBeNull()
  })

  it('criterio 3: las redes sociales, solo con https', () => {
    const contact = contactoDe({ tiktok: 'http://tiktok.com/@lashary', facebook: '/facebook' })

    expect(contact?.instagram).toBe('https://instagram.com/lashary')
    expect(contact?.tiktok).toBeNull()
    expect(contact?.facebook).toBeNull()
  })

  it('el mapa solo acepta la URL de inserción de Google Maps', () => {
    expect(contactoDe({})?.mapEmbed).toBe('https://www.google.com/maps/embed?pb=!1m18')
    expect(contactoDe({ mapa: 'https://evil.example/maps/embed?pb=1' })?.mapEmbed).toBeNull()
    expect(contactoDe({ mapa: 'https://www.google.com/maps/place/x' })?.mapEmbed).toBeNull()
  })

  it('un correo mal formado cuenta como ausente', () => {
    expect(contactoDe({ correo: 'no es un correo' })?.email).toBeNull()
  })

  it('sin dirección ni WhatsApp no hay contacto: no se inventa uno', () => {
    expect(contactoDe({ direccion: '', whatsapp: '' })).toBeNull()
    // Con uno de los dos sí hay contacto.
    expect(contactoDe({ direccion: '' })?.whatsapp?.number).toBe('50688887777')
  })

  it('criterio 1: el horario en el orden del editor, hasta el máximo, sin filas incompletas', () => {
    const filas = [
      { dias: 'Lunes a viernes', horas: '9:00 a 18:00' },
      { dias: 'Sábado' },
      ...Array.from({ length: MAX_HOURS }, (_, index) => ({ dias: `Día ${index}`, horas: 'Cerrado' })),
    ]
    const { hours } = toContactContent(crudo({ hours: filas }))

    expect(hours).toHaveLength(MAX_HOURS)
    expect(hours[0]).toEqual({ days: 'Lunes a viernes', hours: '9:00 a 18:00' })
    expect(hours[1]?.days).toBe('Día 0')
  })

  it('las preguntas publicadas, con la respuesta en párrafos, hasta el máximo', () => {
    const preguntas = Array.from({ length: MAX_FAQS + 1 }, (_, index) => ({
      pregunta: `¿Pregunta ${index}?`,
      respuesta: 'Primero.\n\nSegundo.',
    }))
    const { faqs } = toContactContent(crudo({ faqs: preguntas }))

    expect(faqs).toHaveLength(MAX_FAQS)
    expect(faqs[0]).toEqual({ question: '¿Pregunta 0?', paragraphs: ['Primero.', 'Segundo.'] })
  })

  it('sin preguntas válidas se usan las del diseño; sin CMS, además, no hay contacto ni horario', () => {
    expect(toContactContent(crudo({ faqs: [{ pregunta: 'Sin respuesta' }] })).faqs).toEqual(faqFallback)
    expect(toContactContent(null)).toEqual({ contact: null, hours: [], faqs: faqFallback })
  })
})
