import { EstadoGridProductos } from '../domain/producto';
import { CADENAS_GRID_PRODUCTOS_ES } from './grid-productos-publicos.cadenas.es';

export type OpcionesRenderGridProductos = {
  urlReintento?: string;
};

function escaparHtml(valor: string): string {
  return valor
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function sanitizarUrlImagen(url: string): string {
  const limpia = url.trim();
  if (!limpia) return '';
  if (/^javascript:/i.test(limpia) || /^data:/i.test(limpia)) return '';
  return limpia;
}

function sanitizarUrlReintento(url: string): string {
  const limpia = url.trim();
  if (!limpia) return '';
  if (/^javascript:/i.test(limpia) || /^data:/i.test(limpia)) return '';
  return limpia;
}

// Renderiza una tarjeta de producto individual (UI-001/002/004: componentes, tokens, accesibilidad)
function renderTarjetaProducto(tarjeta: { id: string; nombre: string; urlImagen: string; etiquetaPrecio: string }): string {
  const id = escaparHtml(tarjeta.id);
  const nombre = escaparHtml(tarjeta.nombre);
  const precio = escaparHtml(tarjeta.etiquetaPrecio);
  const urlImagen = escaparHtml(sanitizarUrlImagen(tarjeta.urlImagen));
  const altProducto = escaparHtml(`${CADENAS_GRID_PRODUCTOS_ES.prefijoAltProducto} ${tarjeta.nombre}`);

  return `<article class="card bg-base-100 shadow-sm" data-producto-id="${id}">
    <figure>
      <img src="${urlImagen}" alt="${altProducto}" class="h-56 w-full object-cover" loading="lazy" />
    </figure>
    <div class="card-body">
      <h3 class="card-title text-base-content">${nombre}</h3>
      <p class="text-base font-semibold text-primary">${precio}</p>
    </div>
  </article>`;
}

// Renderiza el grid completo según su estado actual (UI-003: estados vacío, carga, error)
export function renderGridProductosPublicos(
  estado: EstadoGridProductos,
  opciones: OpcionesRenderGridProductos = {}
): string {
  if (estado.tipo === 'cargando') {
    return `<div class="alert" role="status"><span>${escaparHtml(CADENAS_GRID_PRODUCTOS_ES.mensajeCargando)}</span></div>`;
  }

  if (estado.tipo === 'vacio') {
    return `<section class="alert" role="status"><div><h2 class="font-semibold">${escaparHtml(estado.titulo)}</h2><p>${escaparHtml(estado.descripcion)}</p></div></section>`;
  }

  if (estado.tipo === 'error') {
    const urlReintento = opciones.urlReintento ? sanitizarUrlReintento(opciones.urlReintento) : '';
    const accionReintento = urlReintento
      ? `<a href="${escaparHtml(urlReintento)}" class="btn btn-sm btn-outline mt-3" aria-label="${escaparHtml(CADENAS_GRID_PRODUCTOS_ES.ariaBotonReintentar)}">${escaparHtml(estado.etiquetaReintentar)}</a>`
      : `<button type="button" class="btn btn-sm btn-outline mt-3" disabled aria-disabled="true" aria-label="${escaparHtml(CADENAS_GRID_PRODUCTOS_ES.ariaBotonReintentar)}">${escaparHtml(estado.etiquetaReintentar)}</button>`;

    return `<section class="alert alert-error" role="alert"><div><h2 class="font-semibold">${escaparHtml(estado.titulo)}</h2><p>${escaparHtml(estado.descripcion)}</p>${accionReintento}</div></section>`;
  }

  // Estado 'listo': renderizar todas las tarjetas en grid responsivo
  const tarjetas = estado.tarjetas.map(renderTarjetaProducto).join('');
  return `<section aria-label="${escaparHtml(CADENAS_GRID_PRODUCTOS_ES.ariaCatalogoProductos)}" class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">${tarjetas}</section>`;
}
