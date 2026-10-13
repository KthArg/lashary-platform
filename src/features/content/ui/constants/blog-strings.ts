export const BLOG_ROUTE = '/blog'

export const HOME_ROUTE = '/'

export const BLOG_PAGE_PARAM = 'pagina'

export function blogPageRoute(page: number): string {
  return page <= 1 ? BLOG_ROUTE : `${BLOG_ROUTE}?${BLOG_PAGE_PARAM}=${page}`
}

export function blogArticleRoute(slug: string): string {
  return `${BLOG_ROUTE}/${encodeURIComponent(slug)}`
}

export const blogMessages = {
  metadata: {
    title: 'Blog — LASHARY Beauty Studio',
    description:
      'Cuidados, técnicas y novedades del estudio de extensiones de pestañas LASHARY, en Ciudad Quesada.',
  },
  title: 'Blog',
  intro: 'Cuidados, técnicas y novedades del estudio.',
  listLabel: 'Publicaciones',
  empty: 'Todavía no hay publicaciones. Volvé pronto: estamos preparando las primeras.',
  emptyAction: 'Ir al inicio',
  unavailable: 'No pudimos cargar las publicaciones en este momento.',
  retry: 'Volver a intentar',
  loading: 'Cargando publicaciones…',
  error: {
    title: 'No pudimos mostrar el blog',
    body: 'Algo falló al armar esta página.',
    retry: 'Volver a intentar',
  },
  article: {
    back: 'Volver al blog',
    backNav: 'Regreso al listado',
    newTab: '(se abre en una pestaña nueva)',
    unavailable: 'No pudimos cargar esta publicación en este momento.',
    retry: 'Volver a intentar',
    loading: 'Cargando la publicación…',
    notFound: {
      title: 'No encontramos esa publicación',
      body: 'Puede que la dirección esté mal escrita o que la publicación ya no exista.',
    },
    error: {
      title: 'No pudimos mostrar la publicación',
      body: 'Algo falló al armar esta página.',
      retry: 'Volver a intentar',
    },
  },
  pagination: {
    label: 'Páginas del blog',
    newer: 'Más recientes',
    older: 'Más antiguas',
    status: (page: number, pageCount: number) => `Página ${page} de ${pageCount}`,
  },
}
