export const CONTACT_KEY = 'contacto'
export const HOURS_KEY = 'horarios'
export const FAQ_KEY = 'preguntas'

export type ContactSingletonKey = typeof CONTACT_KEY

export const MAX_HOURS = 7
export const MAX_FAQS = 12

export const MAP_EMBED_PREFIX = 'https://www.google.com/maps/embed?'

export type WhatsappLink = {
  number: string
  message: string
  href: string
}

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
