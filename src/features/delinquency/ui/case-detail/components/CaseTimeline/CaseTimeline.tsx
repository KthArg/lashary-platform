import { formatStudioDateTime } from '@/shared/studio-time'
import { TIMELINE_ACTIONS } from '@/features/delinquency/domain/case-detail'
import type { TimelineEvent } from '@/features/delinquency/domain/case-detail'
import { caseDetailMessages as copy } from '../../constants/case-detail-strings'
import { caseTimelineStyles as STYLES } from './CaseTimeline.styles'
import type { CaseTimelineProps } from './CaseTimeline.types'

const isKnownAction = (action: string): action is keyof typeof copy.timeline.actions =>
  Object.hasOwn(copy.timeline.actions, action)

const actorOf = (action: string): string =>
  action === TIMELINE_ACTIONS.requestSubmitted ? copy.timeline.actors.client : copy.timeline.actors.administration

const descriptionOf = (action: string): string =>
  isKnownAction(action) ? copy.timeline.actions[action] : copy.timeline.unknownAction

const renderEvent = (event: TimelineEvent) => (
  <li key={event.id} className={STYLES.item}>
    <time dateTime={event.createdAt.toISOString()} className={STYLES.date}>
      {formatStudioDateTime(event.createdAt)}
    </time>
    <p className={STYLES.description}>{descriptionOf(event.action)}</p>
    <p className={STYLES.actor}>
      {copy.timeline.actorLabel}
      {actorOf(event.action)}
    </p>
    {isKnownAction(event.action) ? null : <p className={STYLES.rawAction}>{event.action}</p>}
  </li>
)

function TimelineBody({ events, unavailable }: CaseTimelineProps) {
  if (unavailable) {
    return (
      <p role="status" className={STYLES.notice}>
        {copy.timeline.unavailable}
      </p>
    )
  }
  if (events.length === 0) return <p className={STYLES.empty}>{copy.timeline.empty}</p>
  return <ol className={STYLES.list}>{events.map(renderEvent)}</ol>
}

export function CaseTimeline({ events, unavailable }: CaseTimelineProps) {
  return (
    <section aria-labelledby="case-timeline-title" className={STYLES.section}>
      <h2 id="case-timeline-title" className={STYLES.title}>
        {copy.timeline.title}
      </h2>
      <TimelineBody events={events} unavailable={unavailable} />
    </section>
  )
}
