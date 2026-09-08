// Punto de entrada público de la feature store (ARCH-003).
// Solo se importa a través de este archivo; domain/ no se expone.

export type {
  ProductoPublico,
  TarjetaProductoPublico,
  EstadoGridProductos,
  CadenaProductos,
} from './domain/producto';

export type { CatalogoProductosPublico } from './application/obtener-grid-productos-publicos';

export {
  estadoGridProductosInicial,
  obtenerEstadoGridProductos,
} from './application/obtener-grid-productos-publicos';

export { CADENAS_GRID_PRODUCTOS_ES } from './ui/grid-productos-publicos.cadenas.es';
export { renderGridProductosPublicos } from './ui/grid-productos-publicos.tsx';

export type { ClienteCms, DtoProductoCms } from './http/catalogo-productos-cms';
export { CatalogoProductosCms } from './http/catalogo-productos-cms';
