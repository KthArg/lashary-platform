import type {
  ContactContent,
  GalleryPair,
  LandingContent,
  LoyaltyContent,
  StudioContent,
} from '@/features/content'
import type { LandingTechnique } from '../../../technique-view'

export interface LandingHomeProps {
  content: LandingContent
  techniques?: readonly LandingTechnique[]
  studio?: StudioContent
  gallery?: readonly GalleryPair[]
  loyalty?: LoyaltyContent
  contact?: ContactContent
}
