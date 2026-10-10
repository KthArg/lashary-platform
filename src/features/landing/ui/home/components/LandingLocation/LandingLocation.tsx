import type { ContactInfo } from '@/features/content'
import { ExternalLink } from '../../../site-shell/components/ExternalLink'
import { landingLocationStyles as STYLES } from './LandingLocation.styles'
import { landingMessages } from '../../../constants/landing-strings'
import { LOCATION_SECTION } from '../../../sections'
import type { LandingLocationProps } from './LandingLocation.types'

// Sección "Ubicación" (US-LAND-07): dónde está el estudio, en qué horario atiende y cómo
// contactarlo, con WhatsApp y las redes. Todo sale del CMS; sin contacto ni horario publicados
// muestra su estado vacío (UI-003), porque no se inventa a dónde ir.
export function LandingLocation({ contact, hours }: LandingLocationProps) {
  const copy = landingMessages.location

  return (
    <section id={LOCATION_SECTION.id} className={STYLES.section}>
      <div className={STYLES.inner}>
        <div className={STYLES.heading}>
          <h2 className={STYLES.title}>{copy.title}</h2>
          <span aria-hidden="true" className={STYLES.rule} />
          <span aria-hidden="true" className={STYLES.index}>
            {copy.index}
          </span>
        </div>

        {contact === null && hours.length === 0 ? (
          <p className={STYLES.empty}>{copy.empty}</p>
        ) : (
          <div className={STYLES.layout}>
            <div className={STYLES.details}>
              {contact?.address && <p className={STYLES.address}>{contact.address}</p>}
              {contact?.city && <p className={STYLES.city}>{contact.city}</p>}

              {hours.length > 0 && (
                <>
                  <h3 className={STYLES.groupTitle}>{copy.hours}</h3>
                  <dl className={STYLES.hours}>
                    {hours.map((row) => (
                      <div key={row.days} className={STYLES.hoursRow}>
                        <dt className={STYLES.days}>{row.days}</dt>
                        <dd className={STYLES.range}>{row.hours}</dd>
                      </div>
                    ))}
                  </dl>
                </>
              )}

              {contact?.note && <p className={STYLES.note}>{contact.note}</p>}

              {contact && <ContactLinks contact={contact} />}
            </div>

            {contact?.mapEmbed ? (
              <iframe
                src={contact.mapEmbed}
                title={copy.mapTitle}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className={STYLES.map}
              />
            ) : (
              contact?.mapLink && (
                <ExternalLink href={contact.mapLink} className={STYLES.mapLink}>
                  {copy.openMap}
                </ExternalLink>
              )
            )}
          </div>
        )}
      </div>
    </section>
  )
}

// Medios de contacto: WhatsApp como botón principal (criterio 2), Instagram primero entre las
// redes (criterio 3) y el correo si existe.
function ContactLinks({ contact }: { contact: ContactInfo }) {
  const copy = landingMessages.location
  const socials = [
    { href: contact.instagram, label: copy.instagram },
    { href: contact.facebook, label: copy.facebook },
    { href: contact.tiktok, label: copy.tiktok },
  ].filter((social): social is { href: string; label: string } => social.href !== null)

  return (
    <>
      <h3 className={STYLES.groupTitle}>{copy.contact}</h3>
      <div className={STYLES.actions}>
        {contact.whatsapp && (
          <ExternalLink href={contact.whatsapp.href} className={STYLES.whatsapp}>
            {copy.whatsapp}
          </ExternalLink>
        )}
        {socials.map((social) => (
          <ExternalLink key={social.label} href={social.href} className={STYLES.social}>
            {social.label}
          </ExternalLink>
        ))}
      </div>
      {contact.email && (
        <a href={`mailto:${contact.email}`} className={STYLES.email}>
          {contact.email}
        </a>
      )}
    </>
  )
}
