import type { StudioContent } from '@/features/content'

export interface LandingStudioProps {
  studio: Pick<StudioContent, 'profile' | 'credentials'>
}
