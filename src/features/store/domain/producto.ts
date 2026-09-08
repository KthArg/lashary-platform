// Producto de forma pura en dominio (sin acoplamiento a HTTP/UI)
export type ProductoPublico = {
  id: string;
  nombre: string;
  urlImagen: string;
  precioCrc: number;
  activo: boolean;
};

// Producto listo para renderizar en tarjeta
export type TarjetaProductoPublico = {
  id: string;
  nombre: string;
  urlImagen: string;
  etiquetaPrecio: string;
};

// Estados que puede tomar el grid completo
export type EstadoGridProductos =
  | { tipo: 'cargando' }
  | { tipo: 'vacio'; titulo: string; descripcion: string }
  | { tipo: 'error'; titulo: string; descripcion: string; etiquetaReintentar: string }
  | { tipo: 'listo'; tarjetas: TarjetaProductoPublico[] };

// Textos externalizados para i18n (DOM-009)
export type CadenaProductos = {
  tituloVacio: string;
  descripcionVacio: string;
  tituloError: string;
  descripcionError: string;
  etiquetaReintentar: string;
};

// Formatea monto de colones con símbolo de moneda (CRC)
export function formatearPrecioCrc(precioCrc: number): string {
  const formateador = new Intl.NumberFormat('es-CR', {
    style: 'currency',
    currency: 'CRC',
    maximumFractionDigits: 0,
  });

  return formateador.format(precioCrc);
}

// Transforma ProductoPublico → TarjetaProductoPublico (para renderizar)
export function aProductoEnTarjeta(producto: ProductoPublico): TarjetaProductoPublico {
  return {
    id: producto.id,
    nombre: producto.nombre,
    urlImagen: producto.urlImagen,
    etiquetaPrecio: formatearPrecioCrc(producto.precioCrc),
  };
}
