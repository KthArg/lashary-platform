import { ok, err, type Result } from '@/shared/result'
import { closedDateInvalid, type ClosedDateInvalid } from './availability-errors'
import { isCalendarDate } from '@/shared/studio-time'

// Día sin disponibilidad (US-AGE-01, criterio 2): un día no laborable que decide el estudio o
// un feriado. date es la fecha de calendario del estudio, AAAA-MM-DD.
export const CLOSED_DATE_KINDS = ['non_working', 'holiday'] as const
export type ClosedDateKind = (typeof CLOSED_DATE_KINDS)[number]

export interface ClosedDate {
  readonly id: string
  readonly resourceId: string
  readonly date: string
  readonly kind: ClosedDateKind
  readonly label: string | null
}

export type ClosedDateInput = Omit<ClosedDate, 'kind' | 'label'> & {
  kind: string
  label?: string | null
}

const isKind = (value: string): value is ClosedDateKind =>
  (CLOSED_DATE_KINDS as readonly string[]).includes(value)

export function createClosedDate(input: ClosedDateInput): Result<ClosedDate, ClosedDateInvalid> {
  const problems: string[] = []
  if (!isCalendarDate(input.date)) problems.push('la fecha no es válida')
  if (!isKind(input.kind)) problems.push('el tipo de día debe ser no laborable o feriado')
  if (problems.length > 0 || !isKind(input.kind)) return err(closedDateInvalid(problems))

  const label = input.label?.trim() || null
  return ok({ id: input.id, resourceId: input.resourceId, date: input.date, kind: input.kind, label })
}
