import { ok, err, type Result } from '@/shared/result'
import {
  toProductDetail,
  type PublicProductDetail,
  type PublicProductDetailSource,
} from '../../domain/product-detail'
import { createPublicProductNotFound, type PublicProductNotFound } from '../../domain/product-errors'

export type PublicProductDetailReader = {
  findBySlug(slug: string): Promise<PublicProductDetailSource | null>
}

export const getPublicProductDetail =
  (reader: PublicProductDetailReader) =>
  async (slug: string): Promise<Result<PublicProductDetail, PublicProductNotFound>> => {
    const source = await reader.findBySlug(slug)
    if (source === null || !source.isActive) return err(createPublicProductNotFound(slug))
    return ok(toProductDetail(source))
  }
