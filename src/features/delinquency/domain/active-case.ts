export const ACTIVE_CASES_LIST_LIMIT = 50

export interface ActiveCaseItem {
  readonly caseId: string
  readonly clientId: string
  readonly appointmentId: string
  readonly pending: number
  readonly exceptionAmount: number | null
  readonly since: Date
}
