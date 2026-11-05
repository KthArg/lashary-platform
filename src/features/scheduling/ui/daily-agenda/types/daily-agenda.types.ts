export type DailyAgendaSearchParams = Record<string, string | string[] | undefined>

export type ClientLinkTargets = { record: string; appointments: string }

export type ClientLinks = (clientId: string) => ClientLinkTargets

export type AgendaDayNav = {
  dayLabel: string
  currentHref: string
  previousHref: string
  nextHref: string
  todayHref: string
  isToday: boolean
}

export type AgendaEntryView = {
  id: string
  time: string
  duration: string
  clientName: string
  technique: string
  visit: string | null
  delinquency: string | null
  payment: string
  status: string
  isPending: boolean
  isRejected: boolean
  links: (ClientLinkTargets & { recordLabel: string; appointmentsLabel: string }) | null
}

export type DailyAgendaViewModel = { nav: AgendaDayNav } & (
  | { status: 'error' }
  | { status: 'empty' }
  | { status: 'ready'; entries: AgendaEntryView[]; truncatedNotice: string | null; delinquencyNotice: string | null }
)

export type ClosingOptionView = { outcome: 'completed' | 'no_show'; label: string; summary: string }

export type ServiceChoiceView = { techniqueId: string; name: string; summary: string }

export type UnclosedItemView = {
  id: string
  when: string
  clientName: string
  technique: string
  dayHref: string
  dayLabel: string
  options: ClosingOptionView[]
  serviceChoices: ServiceChoiceView[]
}

export type UnclosedSectionView =
  | { status: 'error' }
  | { status: 'ready'; items: UnclosedItemView[]; truncatedNotice: string | null }
