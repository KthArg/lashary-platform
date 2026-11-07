import { STUDIO_TIME_ZONE } from '@/shared/studio-time'

export const studioDateFormat = (options: Omit<Intl.DateTimeFormatOptions, 'timeZone'>): Intl.DateTimeFormat =>
  new Intl.DateTimeFormat('es-CR', { ...options, timeZone: STUDIO_TIME_ZONE })
