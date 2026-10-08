import {
  PublicProduct,
  ProductGridState,
  ProductGridStrings,
  toProductCard,
} from '../../domain/product';

export type PublicProductCatalog = {
  listPublicProducts(): Promise<PublicProduct[]>;
};

export function initialProductGridState(): ProductGridState {
  return { tipo: 'cargando' };
}

export async function getProductGridState(
  catalogo: PublicProductCatalog,
  cadenas: ProductGridStrings,
): Promise<ProductGridState> {
  try {
    const productos = await catalogo.listPublicProducts();
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
      tarjetas: productosActivos.map(toProductCard),
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
