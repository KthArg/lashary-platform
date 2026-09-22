// Punto de entrada público de la feature store (ARCH-003).
// Solo se importa a través de este archivo; domain/ no se expone.

export type {
  ProductoPublico,
  TarjetaProductoPublico,
  EstadoGridProductos,
  CadenaProductos,
} from './domain/producto';

export { aProductoEnTarjeta, formatearPrecioCrc } from './domain/producto';

export type { CatalogoProductosPublico } from './application/obtener-grid-productos-publicos';

export {
  estadoGridProductosInicial,
  obtenerEstadoGridProductos,
} from './application/obtener-grid-productos-publicos';


export type { ClienteCms, DtoProductoCms } from './http/catalogo-productos-cms';
export { CatalogoProductosDb } from './db/productos-db';
