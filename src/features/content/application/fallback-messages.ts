import type { LandingContent } from '../domain/landing-content'
import type { StudioContent } from '../domain/studio'

// Contenido de respaldo en código (docs/contracts/cms-api.md § Degradación): lo que se ve si el
// CMS no responde o nunca se publicó. Textos del diseño de referencia, sin imagen (DOM-009).
export const landingFallback: LandingContent = {
  hero: {
    titleLead: 'extensiones de pestañas',
    titleEmphasis: 'una por una.',
    subtitle: 'Estudio en Ciudad Quesada, Costa Rica. Cabina propia y una clienta por cita.',
    ctaLabel: 'Reservar cita',
    secondaryLabel: null,
    secondaryHref: null,
    image: null,
  },
  intro: {
    statement: 'El resultado no depende de la suerte. Depende del tiempo, la luz y el criterio.',
    body: 'Reviso tu pestaña natural antes de elegir la técnica y te digo con honestidad qué le conviene, incluso si es la más simple. Trabajo con adhesivos y fibras de grado profesional, y esterilizo el instrumental entre clientas.',
  },
  closingCta: {
    heading: 'La agenda es de una clienta',
    headingEmphasis: 'a la vez',
    body: 'Elegís día y hora en el sistema de reservas. Si no sabés qué técnica te conviene, lo definimos al inicio de la cita.',
    ctaLabel: 'Reservar cita',
  },
}

// Respaldo de El estudio y Por qué acá (US-LAND-04). Sin nombre ni retrato: no se inventa a la
// dueña. Tampoco hay credenciales de respaldo, por la misma razón. Las razones son las del
// diseño que no dependen de un dato pendiente.
export const studioFallback: StudioContent = {
  profile: {
    name: null,
    role: 'Lash artist y fundadora',
    portrait: null,
    paragraphs: [
      'Abrí LASHARY porque quería trabajar de otra manera. Antes atendía a domicilio, corriendo entre citas, y el resultado terminaba dependiendo de la luz del lugar y del tiempo que quedara.',
      'Hoy tengo espacio propio, camilla, luz controlada y una sola clienta por cita. Si algo no le hace bien a tu pestaña, prefiero no hacerlo.',
    ],
    yearsOfExperience: null,
  },
  credentials: [],
  reasons: [
    {
      title: 'Esterilización en cada cita',
      text: 'Pinzas esterilizadas entre clientas, material desechable de un solo uso y cabina desinfectada antes de que te sentés.',
    },
    {
      title: 'Productos de grado profesional',
      text: 'Adhesivos y fibras de marcas registradas para uso profesional, con fecha de apertura controlada.',
    },
    {
      title: 'Mapeo personalizado',
      text: 'El diseño se define según la forma de tu ojo y el estado de tu pestaña natural. No hay un solo estilo para todas.',
    },
    {
      title: 'Una clienta a la vez',
      text: 'La agenda tiene espacio real entre citas. Nadie espera en la sala y nadie sale con el trabajo apurado.',
    },
  ],
}
