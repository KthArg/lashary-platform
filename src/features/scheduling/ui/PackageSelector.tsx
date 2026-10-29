import Link from 'next/link'
import { packageOptionKey } from '../domain/service-option'
import { calendarHref } from './client-calendar/utils/calendar-params'
import { schedulingMessages } from './messages'
import { techniqueSelectorStyles as STYLES } from './TechniqueSelector.styles'
import type { SelectablePackageOption } from './load-technique-selection-page'

const selectorMessages = schedulingMessages.selector

export function PackageSelector({ packages }: { packages: SelectablePackageOption[] }) {
  if (packages.length === 0) return null

  return (
    <fieldset className={STYLES.fieldset}>
      <legend className={STYLES.legend}>{selectorMessages.choosePackage}</legend>
      {packages.map((pkg) => (
        <div key={pkg.id} className={STYLES.option}>
          <span className={STYLES.optionName}>{pkg.name}</span>
          <span className={STYLES.hint}>{selectorMessages.packageDuration(pkg.durationTotalMin)}</span>
          <Link
            href={calendarHref({ serviceKey: packageOptionKey(pkg.id) })}
            className={STYLES.calendarLink}
          >
            {selectorMessages.seePackageSlots}
          </Link>
        </div>
      ))}
    </fieldset>
  )
}
