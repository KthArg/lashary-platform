import type { ContactInfo, OpeningHours } from '@/features/content'
import { landingLocationStyles as styles } from './LandingLocation.styles'
import { landingMessages } from './messages'
import { LOCATION_SECTION } from './sections'

type LandingLocationProps = {
  contact: ContactInfo | null
  hours: readonly OpeningHours[]
}

// Sección "Ubicación" (US-LAND-07): dónde está el estudio, en qué horario atiende y cómo
// contactarlo, con WhatsApp y las redes. Todo sale del CMS; sin contacto ni horario publicados
// muestra su estado vacío (UI-003), porque no se inventa a dónde ir.
export function LandingLocation({ contact, hours }: LandingLocationProps) {
  const copy = landingMessages.location

  return (
    <section id={LOCATION_SECTION.id} className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.heading}>
          <h2 className={styles.title}>{copy.title}</h2>
          <span aria-hidden="true" className={styles.rule} />
          <span aria-hidden="true" className={styles.index}>
            {copy.index}
          </span>
        </div>

        {contact === null && hours.length === 0 ? (
          <p className={styles.empty}>{copy.empty}</p>
        ) : (
          <div className={styles.layout}>
            <div className={styles.details}>
              {contact?.address && <p className={styles.address}>{contact.address}</p>}
              {contact?.city && <p className={styles.city}>{contact.city}</p>}

              {hours.length > 0 && (
                <>
                  <h3 className={styles.groupTitle}>{copy.hours}</h3>
                  <dl className={styles.hours}>
                    {hours.map((row) => (
                      <div key={row.days} className={styles.hoursRow}>
                        <dt className={styles.days}>{row.days}</dt>
                        <dd className={styles.range}>{row.hours}</dd>
                      </div>
                    ))}
                  </dl>
                </>
              )}

              {contact?.note && <p className={styles.note}>{contact.note}</p>}

              {contact && <ContactLinks contact={contact} />}
            </div>

            {contact?.mapEmbed ? (
              <iframe
                src={contact.mapEmbed}
                title={copy.mapTitle}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className={styles.map}
              />
            ) : (
              contact?.mapLink && (
                <ExternalLink href={contact.mapLink} className={styles.mapLink}>
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
      <h3 className={styles.groupTitle}>{copy.contact}</h3>
      <div className={styles.actions}>
        {contact.whatsapp && (
          <ExternalLink href={contact.whatsapp.href} className={styles.whatsapp}>
            {copy.whatsapp}
          </ExternalLink>
        )}
        {socials.map((social) => (
          <ExternalLink key={social.label} href={social.href} className={styles.social}>
            {social.label}
          </ExternalLink>
        ))}
      </div>
      {contact.email && (
        <a href={`mailto:${contact.email}`} className={styles.email}>
          {contact.email}
        </a>
      )}
    </>
  )
}

// Enlace a otro sitio: pestaña nueva, sin `opener` ni referente, y avisado al lector de pantalla.
export function ExternalLink({
  href,
  className,
  children,
}: {
  href: string
  className: string
  children: React.ReactNode
}) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
      <span className={styles.newTab}> {landingMessages.location.newTab}</span>
    </a>
  )
}
