import { PublicProductsGrid } from '@/features/store'
import { productsPageStyles as STYLES } from './productos.styles'

export default function Loading() {
  return (
    <main className={STYLES.main}>
      <div className={STYLES.container}>
        <PublicProductsGrid state={{ kind: 'loading' }} />
      </div>
    </main>
  )
}
