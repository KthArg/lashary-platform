import type { Faq } from '../domain/contact'
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

// Preguntas frecuentes de respaldo (US-LAND-07): las del diseño de referencia. Hablan de la
// técnica en general, no de un dato del negocio, así que pueden mostrarse sin el CMS.
export const faqFallback: Faq[] = [
  {
    question: '¿Cuánto duran las extensiones?',
    paragraphs: [
      'Entre tres y cuatro semanas, según tu ciclo natural de recambio. La pestaña natural se cae y se lleva la extensión con ella, así que el efecto se va aclarando poco a poco en lugar de terminarse de golpe.',
    ],
  },
  {
    question: '¿Cada cuánto hay que retocarlas?',
    paragraphs: [
      'Cada dos o tres semanas. El retoque quita las extensiones ya crecidas y repone las que se cayeron, y toma menos tiempo que una aplicación completa. Si pasan más de cinco semanas, conviene volver a empezar de cero.',
    ],
  },
  {
    question: '¿Dañan la pestaña natural?',
    paragraphs: [
      'No, si el peso y el largo respetan lo que tu pestaña puede sostener y cada extensión queda separada de la siguiente. El daño aparece cuando se aplica material demasiado pesado o cuando varias pestañas quedan pegadas entre sí. Por eso reviso tu pestaña antes de elegir la técnica.',
    ],
  },
  {
    question: '¿Cómo las cuido en casa?',
    paragraphs: [
      'Lavalas todos los días con espuma específica para pestañas y peinalas con el cepillito cuando estén secas. Evitá productos oleosos en el área del ojo, dormir con la cara contra la almohada y las pinzas rizadoras. Nada de máscara sobre las extensiones.',
    ],
  },
  {
    question: '¿Cuánto dura la cita?',
    paragraphs: [
      'Entre una y dos horas y media, según la técnica. Es tiempo con el ojo cerrado y acostada, así que muchas clientas se duermen. Reservá el rato completo sin apuros después.',
    ],
  },
  {
    question: '¿Qué llevo a la primera cita?',
    paragraphs: [
      'Vení sin maquillaje en los ojos y sin cremas en la zona. Si usás lentes de contacto, traé el estuche. Contame si tuviste alergia a algún adhesivo o si estás con tratamiento oftalmológico.',
    ],
  },
]
