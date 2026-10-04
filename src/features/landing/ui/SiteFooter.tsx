import Link from 'next/link'
import type { ContactContent } from '@/features/content'
import { ExternalLink } from './ExternalLink'
import { landingMessages } from './messages'
import { RESERVE_ROUTE } from './routes'
import { LOCATION_SECTION } from './sections'
import { siteFooterStyles as styles } from './SiteFooter.styles'

type SiteFooterProps = {
  contact: Pick<ContactContent, 'contact' | 'hours'>
  year: number
}

// Pie de página de todas las páginas públicas (lo monta src/app/(site)/layout.tsx). Repite el
// contacto, el horario y la dirección, y enlaza a Ubicación (criterio 5 de US-LAND-07). Sin
// contacto publicado muestra solo lo que no depende del CMS: Cómo llegar y Reservas.
export function SiteFooter({ contact: { contact, hours }, year }: SiteFooterProps) {
  const copy = landingMessages.footer
  const hasContactLinks = contact !== null && (contact.whatsapp !== null || contact.instagram !== null)

  return (
    <footer aria-label={copy.label} className={styles.footer}>
      <div className={styles.columns}>
        {hasContactLinks && (
          <div>
            <p className={styles.columnTitle}>{copy.contact}</p>
            <div className={styles.lines}>
              {contact.whatsapp && (
                <ExternalLink href={contact.whatsapp.href} className={styles.link}>
                  {copy.whatsapp}
                </ExternalLink>
              )}
              {contact.instagram && (
                <ExternalLink href={contact.instagram} className={styles.link}>
                  {copy.instagram}
                </ExternalLink>
              )}
            </div>
          </div>
        )}

        {hours.length > 0 && (
          <div>
            <p className={styles.columnTitle}>{copy.hours}</p>
            <div className={styles.lines}>
              {hours.map((row) => (
                <p key={row.days} className={styles.hoursRow}>
                  {row.days}: {row.hours}
                </p>
              ))}
            </div>
          </div>
        )}

        <div>
          <p className={styles.columnTitle}>{copy.studio}</p>
          <div className={styles.lines}>
            {contact?.address && <span>{contact.address}</span>}
            {contact?.city && <span>{contact.city}</span>}
            <a href={`/#${LOCATION_SECTION.id}`} className={styles.link}>
              {copy.directions}
            </a>
          </div>
        </div>

        <div>
          <p className={styles.columnTitle}>{copy.reservations}</p>
          <Link href={RESERVE_ROUTE} className={styles.reserve}>
            {copy.reserve}
          </Link>
        </div>
      </div>

      <div className={styles.bottom}>
        <p className={styles.brand}>{landingMessages.brand.name}</p>
        <p className={styles.rights}>{copy.rights(year)}</p>
      </div>
    </footer>
  )
}
