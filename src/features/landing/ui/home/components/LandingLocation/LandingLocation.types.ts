import type { ContactInfo, OpeningHours } from '@/features/content'

export interface LandingLocationProps {
  contact: ContactInfo | null
  hours: readonly OpeningHours[]
}
