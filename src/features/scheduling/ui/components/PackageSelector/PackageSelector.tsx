import Link from 'next/link'
import { moneyFromColones, formatMoney } from '@/shared/money'
import { packageOptionKey } from '../../../domain/service-option'
import { calendarHref } from '../../client-calendar/utils/calendar-params'
import { schedulingMessages } from '../../messages'
import { packageSelectorStyles as STYLES } from './PackageSelector.styles'
import type { PackageSelectorProps } from './PackageSelector.types'

const selectorMessages = schedulingMessages.selector
const PACKAGE_SELECTOR_HEADING_ID = 'package-selector-heading'

const money = (colones: number): string => formatMoney(moneyFromColones(colones))

export function PackageSelector({ packages }: PackageSelectorProps) {
  if (packages.length === 0) return null

  return (
    <section className={STYLES.section} aria-labelledby={PACKAGE_SELECTOR_HEADING_ID}>
      <h2 id={PACKAGE_SELECTOR_HEADING_ID} className={STYLES.heading}>
        {selectorMessages.choosePackage}
      </h2>
      {packages.map((servicePackage) => (
        <div key={servicePackage.id} className={STYLES.item}>
          <div className={STYLES.info}>
            <span className={STYLES.name}>{servicePackage.name}</span>
            {servicePackage.discountPercent !== null && (
              <span className={STYLES.badge}>{selectorMessages.packagePromotionBadge}</span>
            )}
          </div>
          {servicePackage.techniqueNames.length > 0 && (
            <span className={STYLES.included}>{selectorMessages.packageIncludes(servicePackage.techniqueNames)}</span>
          )}
          <span className={STYLES.duration}>{selectorMessages.packageDuration(servicePackage.durationTotalMin)}</span>
          {servicePackage.discountPercent !== null && servicePackage.priceDiscounted !== null ? (
            <span className={STYLES.price}>
              {selectorMessages.packagePriceBefore}{' '}
              <s className={STYLES.priceBefore}>{money(servicePackage.price)}</s>{' '}
              {selectorMessages.packagePriceNow}{' '}
              <span className={STYLES.priceNow}>{money(servicePackage.priceDiscounted)}</span>
            </span>
          ) : (
            <span className={STYLES.price}>{money(servicePackage.price)}</span>
          )}
          <Link href={calendarHref({ serviceKey: packageOptionKey(servicePackage.id) })} className={STYLES.link}>
            {selectorMessages.seePackageSlots}
          </Link>
        </div>
      ))}
    </section>
  )
}
