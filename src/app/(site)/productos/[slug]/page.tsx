import type { Metadata } from 'next'
import { ProductDetail, PUBLIC_DETAIL_STRINGS } from '@/features/store'
import { getProductDetail } from './page.data'
import { productDetailPageStyles as STYLES } from './product-detail-page.styles'

type ProductDetailPageProps = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: ProductDetailPageProps): Promise<Metadata> {
  const { slug } = await params
  const detail = await getProductDetail(slug)
  return {
    title: `${detail.name} | ${PUBLIC_DETAIL_STRINGS.pageTitleSuffix}`,
    description: detail.description,
  }
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { slug } = await params
  const detail = await getProductDetail(slug)

  return (
    <main className={STYLES.main}>
      <div className={STYLES.container}>
        <ProductDetail detail={detail} />
      </div>
    </main>
  )
}
