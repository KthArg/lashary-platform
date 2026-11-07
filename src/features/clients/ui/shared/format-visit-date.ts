import { studioDateFormat } from '@/features/clients/ui/shared/studio-date-format'

const VISIT_DATE_FORMAT = studioDateFormat({ dateStyle: 'medium' })

export const formatVisitDate = (visitAtMs: number): string => VISIT_DATE_FORMAT.format(visitAtMs)
