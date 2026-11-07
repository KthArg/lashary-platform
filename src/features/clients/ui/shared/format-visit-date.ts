import { studioDateFormat } from './studio-date-format'

const VISIT_DATE_FORMAT = studioDateFormat({ dateStyle: 'medium' })

export const formatVisitDate = (visitAtMs: number): string => VISIT_DATE_FORMAT.format(visitAtMs)
