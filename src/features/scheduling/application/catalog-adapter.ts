import { getTechnique } from '@/features/catalog'
import { err, ok } from '@/shared/result'
import { techniqueNotAvailable } from '../domain/errors'
import type { CatalogPort } from './ports'

export const catalogGateway: CatalogPort = {
  async findSelectableTechnique(id) {
    const result = await getTechnique(id)
    if (!result.ok) return err(techniqueNotAvailable(id))

    const technique = result.value
    return ok({
      id: technique.id,
      isActive: technique.isActive,
      durationFirstTimeMin: technique.durationFirstTimeMin,
      durationRetouchMin: technique.durationRetouchMin,
      bufferMin: technique.bufferMin,
    })
  },
}
