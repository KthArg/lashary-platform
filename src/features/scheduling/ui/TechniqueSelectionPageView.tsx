import Link from 'next/link'
import { MY_APPOINTMENTS_PATH } from './my-appointments/constants/my-appointments-strings'
import { schedulingMessages } from './messages'
import { TechniqueSelector } from './TechniqueSelector'
import { PackageSelector } from './components/PackageSelector'
import { clientTechniqueSelectionPageStyles as STYLES } from './ClientTechniqueSelectionPage.styles'
import type { TechniqueSelectionPageData } from './load-technique-selection-page'

const pageMessages = schedulingMessages.page

export function TechniqueSelectionPageView({ data }: { data: TechniqueSelectionPageData }) {
  if (data.status === 'forbidden') {
    return (
      <div role="alert" className={STYLES.errorBox}>
        {schedulingMessages.selector.accessDenied}
      </div>
    )
  }

  return (
    <div className={STYLES.wrapper}>
      <div className={STYLES.header}>
        <div>
          <h1 className={STYLES.title}>{pageMessages.title}</h1>
          <p className={STYLES.subtitle}>{pageMessages.subtitle}</p>
        </div>
        <Link href={MY_APPOINTMENTS_PATH} className={STYLES.myAppointmentsLink}>
          {pageMessages.myAppointments}
        </Link>
      </div>

      {data.techniques.length === 0 ? (
        <div className={STYLES.emptyBox}>{pageMessages.empty}</div>
      ) : (
        <TechniqueSelector techniques={data.techniques} />
      )}
      <PackageSelector packages={data.packages} />
    </div>
  )
}
