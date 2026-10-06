import { ok, err, type Result } from '@/shared/result'
import { crearProductoInvalido, type ProductoInvalido } from './errores-producto'

export type ProductoPublico = {
  id: string;
  nombre: string;
  urlImagen: string;
  precioCrc: number;
  activo: boolean;
};

export type TarjetaProductoPublico = {
  id: string;
  nombre: string;
  urlImagen: string;
  etiquetaPrecio: string;
};

export type EstadoGridProductos =
  | { tipo: 'cargando' }
  | { tipo: 'vacio'; titulo: string; descripcion: string }
  | { tipo: 'error'; titulo: string; descripcion: string; etiquetaReintentar: string }
  | { tipo: 'listo'; tarjetas: TarjetaProductoPublico[] };

export type CadenaProductos = {
  tituloVacio: string;
  descripcionVacio: string;
  tituloError: string;
  descripcionError: string;
  etiquetaReintentar: string;
  mensajeCargando: string;
  ariaCatalogoProductos: string;
  prefijoAltProducto: string;
  ariaBotonReintentar: string;
};

export function formatearPrecioCrc(precioCrc: number): string {
  const formateador = new Intl.NumberFormat('es-CR', {
    style: 'currency',
    currency: 'CRC',
    maximumFractionDigits: 0,
  });

  return formateador.format(precioCrc);
}

const ESQUEMA_URL_PELIGROSO = /^(javascript|data):/i;

export function sanitizarUrl(url: string): string {
  const limpia = url.trim();
  if (!limpia || ESQUEMA_URL_PELIGROSO.test(limpia)) return '';
  return limpia;
}

export function aProductoEnTarjeta(producto: ProductoPublico): TarjetaProductoPublico {
  return {
    id: producto.id,
    nombre: producto.nombre,
    urlImagen: sanitizarUrl(producto.urlImagen),
    etiquetaPrecio: formatearPrecioCrc(producto.precioCrc),
  };
}

export type ProductoAdminVista = {
  id: string
  slug: string
  nombre: string
  descripcion: string
  urlImagen: string
  precioCrc: number
  activo: boolean
  ordenPresentacion: number
}

export type ProductoEntrada = {
  id: string
  slug: string
  nombre: string
  descripcion: string
  urlImagen: string
  precioCrc: number
  activo?: boolean
  ordenPresentacion: number
}

const esEnteroNoNegativo = (n: number): boolean => Number.isInteger(n) && n >= 0
const esEnteroPositivo = (n: number): boolean => Number.isInteger(n) && n > 0

export function construirProducto(input: ProductoEntrada): Result<ProductoAdminVista, ProductoInvalido> {
  const problems: string[] = []

  const slug = input.slug.trim()
  if (slug.length === 0) problems.push('el slug no puede estar vacío')

  const nombre = input.nombre.trim()
  if (nombre.length === 0) problems.push('el nombre no puede estar vacío')

  const urlImagen = input.urlImagen.trim()
  if (urlImagen.length === 0) problems.push('la URL de la imagen no puede estar vacía')

  if (!esEnteroPositivo(input.precioCrc)) {
    problems.push('el precio debe ser un entero de colones mayor que cero')
  }

  if (!esEnteroNoNegativo(input.ordenPresentacion)) {
    problems.push('el orden de presentación debe ser un entero no negativo')
  }

  if (problems.length > 0) {
    return err(crearProductoInvalido(problems))
  }

  return ok({
    id: input.id,
    slug,
    nombre,
    descripcion: input.descripcion.trim(),
    urlImagen,
    precioCrc: input.precioCrc,
    activo: input.activo ?? true,
    ordenPresentacion: input.ordenPresentacion,
  })
}

export function marcarProductoInactivo(producto: ProductoAdminVista): ProductoAdminVista {
  return { ...producto, activo: false }
}
