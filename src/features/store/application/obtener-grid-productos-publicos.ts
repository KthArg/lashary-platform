import {
  ProductoPublico,
  EstadoGridProductos,
  CadenaProductos,
  aProductoEnTarjeta,
} from '../domain/producto';

export type CatalogoProductosPublico = {
  listarProductosPublicos(): Promise<ProductoPublico[]>;
};

export function estadoGridProductosInicial(): EstadoGridProductos {
  return { tipo: 'cargando' };
}

export async function obtenerEstadoGridProductos(
  catalogo: CatalogoProductosPublico,
  cadenas: CadenaProductos,
): Promise<EstadoGridProductos> {
  try {
    const productos = await catalogo.listarProductosPublicos();
    const productosActivos = productos.filter((p) => p.activo);

    if (productosActivos.length === 0) {
      return {
        tipo: 'vacio',
        titulo: cadenas.tituloVacio,
        descripcion: cadenas.descripcionVacio,
      };
    }

    return {
      tipo: 'listo',
      tarjetas: productosActivos.map(aProductoEnTarjeta),
    };
  } catch {
    return {
      tipo: 'error',
      titulo: cadenas.tituloError,
      descripcion: cadenas.descripcionError,
      etiquetaReintentar: cadenas.etiquetaReintentar,
    };
  }
}
