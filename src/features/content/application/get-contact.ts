import { err, ok, type Result } from '@/shared/result'
import type { CmsUnavailable } from '../domain/errors'
import {
  CONTACT_KEY,
  FAQ_KEY,
  HOURS_KEY,
  MAP_EMBED_PREFIX,
  MAX_FAQS,
  MAX_HOURS,
  type ContactContent,
  type ContactInfo,
  type Faq,
  type OpeningHours,
  type WhatsappLink,
} from '../domain/contact'
import { field, link, paragraphsOf, text } from './cms-values'
import { faqFallback } from './fallback-messages'
import type { CmsReader } from './ports'

// Lo que devolvió el CMS por cada tipo de contacto, sin validar.
export type RawContactContent = {
  contact: unknown
  hours: unknown[]
  faqs: unknown[]
}

// Lee los tres tipos en paralelo. Si uno falla, falla la lectura entera.
export async function readRawContact(
  reader: CmsReader,
): Promise<Result<RawContactContent, CmsUnavailable>> {
  const [contact, hours, faqs] = await Promise.all([
    reader.readSingleton(CONTACT_KEY),
    reader.readCollection(HOURS_KEY),
    reader.readCollection(FAQ_KEY),
  ])
  if (!contact.ok) return err(contact.error)
  if (!hours.ok) return err(hours.error)
  if (!faqs.ok) return err(faqs.error)
  return ok({ contact: contact.value, hours: hours.value, faqs: faqs.value })
}

// Solo https: un perfil social o un enlace de mapa nunca es una ruta interna ni `http:`.
const httpsLink = (value: unknown): string | null => {
  const candidate = link(value)
  return candidate !== null && /^https:\/\//i.test(candidate) ? candidate : null
}

const WHATSAPP_NUMBER = /^\d{8,15}$/
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// El número solo con dígitos y código de país (docs/contracts/cms-api.md § `contacto`).
function toWhatsapp(source: unknown): WhatsappLink | null {
  const number = text(field(source, 'whatsapp'), 15)
  if (number === null || !WHATSAPP_NUMBER.test(number)) return null
  const message = text(field(source, 'mensajeWhatsapp'), 300) ?? ''
  const query = message === '' ? '' : `?text=${encodeURIComponent(message)}`
  return { number, message, href: `https://wa.me/${number}${query}` }
}

function toContact(source: unknown): ContactInfo | null {
  const address = text(field(source, 'direccion'), 160)
  const whatsapp = toWhatsapp(source)
  // Sin dirección ni WhatsApp el contacto no se publicó (docs/contracts/cms-api.md § `contacto`).
  if (address === null && whatsapp === null) return null

  const email = text(field(source, 'correo'), 120)
  const map = httpsLink(field(source, 'mapa'))
  return {
    address,
    city: text(field(source, 'ciudad'), 120),
    note: text(field(source, 'nota'), 120),
    whatsapp,
    instagram: httpsLink(field(source, 'instagram')),
    facebook: httpsLink(field(source, 'facebook')),
    tiktok: httpsLink(field(source, 'tiktok')),
    email: email !== null && EMAIL.test(email) ? email : null,
    mapEmbed: map !== null && map.startsWith(MAP_EMBED_PREFIX) ? map : null,
    mapLink: httpsLink(field(source, 'mapaEnlace')),
  }
}

function toHours(items: unknown[]): OpeningHours[] {
  const hours: OpeningHours[] = []
  for (const item of items) {
    if (hours.length === MAX_HOURS) break
    const days = text(field(item, 'dias'), 40)
    const range = text(field(item, 'horas'), 40)
    if (days !== null && range !== null) hours.push({ days, hours: range })
  }
  return hours
}

function toFaqs(items: unknown[]): Faq[] {
  const faqs: Faq[] = []
  for (const item of items) {
    if (faqs.length === MAX_FAQS) break
    const question = text(field(item, 'pregunta'), 160)
    const answer = text(field(item, 'respuesta'), 800)
    if (question !== null && answer !== null) faqs.push({ question, paragraphs: paragraphsOf(answer) })
  }
  // Las preguntas no quedan vacías: sin ninguna válida, las del diseño.
  return faqs.length > 0 ? faqs : faqFallback
}

// Valida contra el contrato. Contacto y horario no tienen respaldo; las preguntas sí. Con `raw`
// null (CMS no disponible o sin configurar): sin contacto, sin horario y las preguntas del
// diseño. Nunca lanza.
export function toContactContent(raw: RawContactContent | null): ContactContent {
  if (raw === null) return { contact: null, hours: [], faqs: faqFallback }
  return {
    contact: toContact(raw.contact),
    hours: toHours(raw.hours),
    faqs: toFaqs(raw.faqs),
  }
}
