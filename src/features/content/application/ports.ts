import type { Result } from '@/shared/result'
import type { CmsUnavailable } from '../domain/errors'
import type { LandingContentKey } from '../domain/landing-content'
import type { StudioSingletonKey } from '../domain/studio'

// Lo que devolvió el CMS por cada tipo, sin validar (el `data` de GET /api/content/:key).
export type RawLandingContent = Record<LandingContentKey, unknown>

// Puerto de lectura del CMS. La implementación HTTP vive en cms/.
export interface CmsReader {
  readSingleton(key: LandingContentKey | StudioSingletonKey): Promise<Result<unknown, CmsUnavailable>>
  // Una colección responde `{ key, items: [...] }` en el orden del editor
  // (docs/contracts/cms-api.md § Transporte).
  readCollection(key: string): Promise<Result<unknown[], CmsUnavailable>>
}
