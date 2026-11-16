export const ACTIVE_CASES_LIST_LIMIT = 50

// A diferencia de ActiveClient (active-client.ts, agregado por clienta para delinquency_list_active),
// esta es la fila por caso que necesitan los botones de levantar/condonar de US-MOR-05: cada caso se
// decide por separado, con su propio pending y appointmentId.
export interface ActiveCaseItem {
  readonly caseId: string
  readonly clientId: string
  readonly appointmentId: string
  readonly pending: number
  readonly since: Date
}
