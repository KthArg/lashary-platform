import { PublicProductsGrid } from '@/features/store'
import { getProductsView } from './page.data'
import { productsPageStyles as STYLES } from './productos.styles'

export const metadata = {
  title: 'Productos | LASHARY Beauty Studio',
  description: 'Catálogo público de productos de mantenimiento',
}

export default async function ProductsPage() {
  const state = await getProductsView()

  return (
    <main className={STYLES.main}>
      <div className={STYLES.container}>
        <PublicProductsGrid state={state} />
      </div>
    </main>
  )
}
