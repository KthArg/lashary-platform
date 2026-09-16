import type { LandingContent } from '../domain/landing-content'

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
