import { GridProductosPublicos } from '@/features/store'
import { obtenerVistaProductos } from './page.data'
import { productosPageStyles as s } from './productos.styles'

export const metadata = {
  title: 'Productos | LASHARY Beauty Studio',
  description: 'Catálogo público de productos de mantenimiento',
}

export default async function ProductosPage() {
  const estado = await obtenerVistaProductos()

  return (
    <main className={s.main}>
      <div className={s.container}>
        <GridProductosPublicos estado={estado} />
      </div>
    </main>
  )
}
