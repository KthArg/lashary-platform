export type {
  ProductoPublico,
  TarjetaProductoPublico,
  EstadoGridProductos,
  CadenaProductos,
} from './domain/producto';

export { aProductoEnTarjeta, formatearPrecioCrc } from './domain/producto';

export type { CatalogoProductosPublico } from './application/obtener-grid-productos-publicos';

export { CADENAS_GRID_PRODUCTOS_ES } from './ui/grid-productos-publicos.cadenas.es';
export type { OpcionesRenderGridProductos } from './ui/grid-productos-publicos';
export { renderGridProductosPublicos } from './ui/grid-productos-publicos';

export {
  estadoGridProductosInicial,
  obtenerEstadoGridProductos,
} from './application/obtener-grid-productos-publicos';

export type { ClienteCms, DtoProductoCms } from './http/catalogo-productos-cms';
export { catalogoProductosCms } from './http/catalogo-productos-cms';
export { catalogoProductosDb } from './db/productos-db';
