// Contacto, horario y preguntas frecuentes (docs/contracts/cms-api.md v1.5, US-LAND-07).
export const CONTACT_KEY = 'contacto'
export const HOURS_KEY = 'horarios'
export const FAQ_KEY = 'preguntas'

export type ContactSingletonKey = typeof CONTACT_KEY

export const MAX_HOURS = 7
export const MAX_FAQS = 12

// Única URL de mapa que se acepta: la de inserción de Google Maps. Así el panel no puede meter en
// un iframe de la landing cualquier otro sitio.
export const MAP_EMBED_PREFIX = 'https://www.google.com/maps/embed?'

// El enlace de WhatsApp ya armado (`https://wa.me/<número>?text=<mensaje>`), con su mensaje
// inicial predefinido.
export type WhatsappLink = {
  number: string
  message: string
  href: string
}

// Dónde está el estudio y cómo contactarlo. Sin contacto publicado es null: no hay respaldo,
// porque inventar una dirección o un número mandaría a una clienta a un lugar que no existe.
export type ContactInfo = {
  address: string | null
  city: string | null
  note: string | null
  whatsapp: WhatsappLink | null
  instagram: string | null
  facebook: string | null
  tiktok: string | null
  email: string | null
  mapEmbed: string | null
  mapLink: string | null
}

export type OpeningHours = {
  days: string
  hours: string
}

export type Faq = {
  question: string
  paragraphs: string[]
}

export type ContactContent = {
  contact: ContactInfo | null
  hours: OpeningHours[]
  faqs: Faq[]
}
