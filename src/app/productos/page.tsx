import {
  CADENAS_GRID_PRODUCTOS_ES,
  CatalogoProductosDb,
  obtenerEstadoGridProductos,
  renderGridProductosPublicos,
} from '@/features/store'

export const metadata = {
  title: 'Productos | LASHARY Beauty Studio',
  description: 'Catálogo público de productos de mantenimiento',
}

export default async function ProductosPage() {
  const catalogo = new CatalogoProductosDb()
  const estado = await obtenerEstadoGridProductos(catalogo, CADENAS_GRID_PRODUCTOS_ES)

  return (
    <main className="min-h-screen bg-brand-cream px-4 py-12">
      <div
        className="mx-auto w-full max-w-6xl"
        dangerouslySetInnerHTML={{ __html: renderGridProductosPublicos(estado) }}
      />
    </main>
  )
}
