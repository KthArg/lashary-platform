import Link from 'next/link'
import { ExternalLink } from '../ExternalLink'
import { landingMessages } from '../../../constants/landing-strings'
import { RESERVE_ROUTE } from '../../../routes'
import { LOCATION_SECTION } from '../../../sections'
import { siteFooterStyles as STYLES } from './SiteFooter.styles'
import type { SiteFooterProps } from './SiteFooter.types'

export function SiteFooter({ contact: { contact, hours }, year }: SiteFooterProps) {
  const copy = landingMessages.footer
  const hasContactLinks = contact !== null && (contact.whatsapp !== null || contact.instagram !== null)

  return (
    <footer aria-label={copy.label} className={STYLES.footer}>
      <div className={STYLES.columns}>
        {hasContactLinks && (
          <div>
            <p className={STYLES.columnTitle}>{copy.contact}</p>
            <div className={STYLES.lines}>
              {contact.whatsapp && (
                <ExternalLink href={contact.whatsapp.href} className={STYLES.link}>
                  {copy.whatsapp}
                </ExternalLink>
              )}
              {contact.instagram && (
                <ExternalLink href={contact.instagram} className={STYLES.link}>
                  {copy.instagram}
                </ExternalLink>
              )}
            </div>
          </div>
        )}

        {hours.length > 0 && (
          <div>
            <p className={STYLES.columnTitle}>{copy.hours}</p>
            <div className={STYLES.lines}>
              {hours.map((row) => (
                <p key={row.days} className={STYLES.hoursRow}>
                  {row.days}: {row.hours}
                </p>
              ))}
            </div>
          </div>
        )}

        <div>
          <p className={STYLES.columnTitle}>{copy.studio}</p>
          <div className={STYLES.lines}>
            {contact?.address && <span>{contact.address}</span>}
            {contact?.city && <span>{contact.city}</span>}
            <a href={`/#${LOCATION_SECTION.id}`} className={STYLES.link}>
              {copy.directions}
            </a>
          </div>
        </div>

        <div>
          <p className={STYLES.columnTitle}>{copy.reservations}</p>
          <Link href={RESERVE_ROUTE} className={STYLES.reserve}>
            {copy.reserve}
          </Link>
        </div>
      </div>

      <div className={STYLES.bottom}>
        <p className={STYLES.brand}>{landingMessages.brand.name}</p>
        <p className={STYLES.rights}>{copy.rights(year)}</p>
      </div>
    </footer>
  )
}
