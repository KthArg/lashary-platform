import { cache } from 'react'
import { notFound } from 'next/navigation'
import { isErr } from '@/shared/result'
import {
  getPublicProductDetail,
  publicProductDetailDb,
  type PublicProductDetail,
} from '@/features/store'

export const getProductDetail = cache(async (slug: string): Promise<PublicProductDetail> => {
  const result = await getPublicProductDetail(publicProductDetailDb())(slug)
  if (isErr(result)) notFound()
  return result.value
})
