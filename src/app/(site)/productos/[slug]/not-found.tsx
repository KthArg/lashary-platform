import Link from 'next/link'
import { PUBLIC_DETAIL_STRINGS, publicDetailRoutes } from '@/features/store/client'
import { productDetailPageStyles as STYLES } from './product-detail-page.styles'

export default function NotFound() {
  return (
    <main className={STYLES.main}>
      <div className={STYLES.container}>
        <div className={STYLES.statusBox}>
          <div>
            <h1 className={STYLES.boxTitle}>{PUBLIC_DETAIL_STRINGS.notFoundTitle}</h1>
            <p>{PUBLIC_DETAIL_STRINGS.notFoundBody}</p>
            <Link href={publicDetailRoutes.catalog} className={STYLES.backLink}>
              {PUBLIC_DETAIL_STRINGS.backToCatalog}
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
