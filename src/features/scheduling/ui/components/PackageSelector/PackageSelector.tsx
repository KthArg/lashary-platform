import Link from 'next/link'
import { packageOptionKey } from '../../../domain/service-option'
import { calendarHref } from '../../client-calendar/utils/calendar-params'
import { schedulingMessages } from '../../messages'
import { packageSelectorStyles as STYLES } from './PackageSelector.styles'
import type { PackageSelectorProps } from './PackageSelector.types'

const selectorMessages = schedulingMessages.selector
const PACKAGE_SELECTOR_HEADING_ID = 'package-selector-heading'

export function PackageSelector({ packages }: PackageSelectorProps) {
  if (packages.length === 0) return null

  return (
    <section className={STYLES.section} aria-labelledby={PACKAGE_SELECTOR_HEADING_ID}>
      <h2 id={PACKAGE_SELECTOR_HEADING_ID} className={STYLES.heading}>
        {selectorMessages.choosePackage}
      </h2>
      {packages.map((servicePackage) => (
        <div key={servicePackage.id} className={STYLES.item}>
          <span className={STYLES.name}>{servicePackage.name}</span>
          <span className={STYLES.duration}>{selectorMessages.packageDuration(servicePackage.durationTotalMin)}</span>
          <Link href={calendarHref({ serviceKey: packageOptionKey(servicePackage.id) })} className={STYLES.link}>
            {selectorMessages.seePackageSlots}
          </Link>
        </div>
      ))}
    </section>
  )
}
