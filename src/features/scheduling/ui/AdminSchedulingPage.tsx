import { listClosedDates, listManualBlocks, listWeeklyAvailability } from '../application/manage-availability'
import { listResources } from '../application/resources'
import { supabaseSchedulingRepository } from '../db/supabase-scheduling-repository'
import { schedulingMessages } from './messages'
import { WeeklyAvailabilityTable } from './WeeklyAvailabilityTable'
import { WeeklyAvailabilityForm } from './WeeklyAvailabilityForm'
import { ClosedDateTable } from './ClosedDateTable'
import { ClosedDateForm } from './ClosedDateForm'
import { ManualBlockTable } from './ManualBlockTable'
import { ManualBlockForm } from './ManualBlockForm'
import { adminSchedulingPageStyles as s } from './AdminSchedulingPage.styles'

const m = schedulingMessages

export async function AdminSchedulingPage() {
  const repo = supabaseSchedulingRepository
  const resources = await listResources(repo)
  const resource = resources[0]

  if (!resource) {
    return (
      <main className={s.main}>
        <div className={s.noResourceBox}>
          <span>{m.shared.noResource}</span>
        </div>
      </main>
    )
  }

  const [weeklyAvailability, closedDates, manualBlocks] = await Promise.all([
    listWeeklyAvailability(repo, resource.id),
    listClosedDates(repo, resource.id),
    listManualBlocks(repo, resource.id),
  ])

  return (
    <main className={s.main}>
      <header className={s.header}>
        <h1 className={s.title}>{m.admin.title}</h1>
        <p className={s.subtitle}>{m.admin.subtitle}</p>
      </header>

      <section className={s.section}>
        <div>
          <h2 className={s.sectionHeading}>{m.weeklyAvailability.heading}</h2>
          <p className={s.sectionDescription}>{m.weeklyAvailability.description}</p>
        </div>
        <WeeklyAvailabilityTable items={weeklyAvailability} />
        <div className={s.divider} />
        <WeeklyAvailabilityForm resourceId={resource.id} />
      </section>

      <section className={s.section}>
        <div>
          <h2 className={s.sectionHeading}>{m.closedDates.heading}</h2>
          <p className={s.sectionDescription}>{m.closedDates.description}</p>
        </div>
        <ClosedDateTable items={closedDates} />
        <div className={s.divider} />
        <ClosedDateForm resourceId={resource.id} />
      </section>

      <section className={s.section}>
        <div>
          <h2 className={s.sectionHeading}>{m.manualBlocks.heading}</h2>
          <p className={s.sectionDescription}>{m.manualBlocks.description}</p>
        </div>
        <ManualBlockTable items={manualBlocks} />
        <div className={s.divider} />
        <ManualBlockForm resourceId={resource.id} />
      </section>
    </main>
  )
}
