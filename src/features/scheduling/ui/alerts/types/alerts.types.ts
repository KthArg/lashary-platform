export type AlertView = {
  id: string
  title: string
  detail: string
  requested: string
  recorded: string
}

export type AlertsViewModel =
  | { status: 'error' }
  | { status: 'empty' }
  | { status: 'ready'; alerts: AlertView[] }
