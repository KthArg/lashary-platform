import type { TimelineEvent } from '@/features/delinquency/domain/case-detail'

export interface CaseTimelineProps {
  events: readonly TimelineEvent[]
  unavailable: boolean
}
