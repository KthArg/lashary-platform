import { STUDIO_TIME_ZONE } from '@/shared/studio-time'

const VISIT_DATE_FORMAT = new Intl.DateTimeFormat('es-CR', { dateStyle: 'medium', timeZone: STUDIO_TIME_ZONE })

export const formatVisitDate = (visitAtMs: number): string => VISIT_DATE_FORMAT.format(visitAtMs)
