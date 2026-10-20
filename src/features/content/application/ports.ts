import type { Result } from '@/shared/result'
import type { CmsUnavailable } from '../domain/errors'
import type { LandingContentKey } from '../domain/landing-content'
import type { ContactSingletonKey } from '../domain/contact'
import type { LoyaltySingletonKey } from '../domain/loyalty'
import type { StudioSingletonKey } from '../domain/studio'

export type RawLandingContent = Record<LandingContentKey, unknown>

export interface CmsReader {
  readSingleton(
    key: LandingContentKey | StudioSingletonKey | LoyaltySingletonKey | ContactSingletonKey,
  ): Promise<Result<unknown, CmsUnavailable>>
  readCollection(key: string): Promise<Result<unknown[], CmsUnavailable>>
}
