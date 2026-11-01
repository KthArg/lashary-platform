export interface AppointmentSummaryInput {
  techniqueName: string
  isFirstTime: boolean | null
  servicePrice: number
  depositRequired: number
}

export interface AppointmentSummaryView {
  service: string
  kind: string | null
  amounts: string | null
}
