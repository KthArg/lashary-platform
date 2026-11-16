export const REVIEW_LIST_LIMIT = 50

export const ACTIVE_LIST_LIMIT = 50

export interface ActiveClient {
  readonly clientId: string
  readonly pending: number
  readonly since: Date
}
