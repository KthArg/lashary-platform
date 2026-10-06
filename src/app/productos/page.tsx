import { GridProductosPublicos } from '@/features/store'
import { obtenerVistaProductos } from './page.data'
import { productosPageStyles as STYLES } from './productos.styles'

export const metadata = {
  title: 'Productos | LASHARY Beauty Studio',
  description: 'Catálogo público de productos de mantenimiento',
}

export default async function ProductosPage() {
  const estado = await obtenerVistaProductos()

  return (
    <main className={STYLES.main}>
      <div className={STYLES.container}>
        <GridProductosPublicos estado={estado} />
      </div>
    </main>
  )
}
