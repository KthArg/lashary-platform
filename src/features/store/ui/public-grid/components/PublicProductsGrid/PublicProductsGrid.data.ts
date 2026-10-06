import { sanitizarUrl } from '../../../../domain/product'

export type BotonReintento = { modo: 'activo'; href: string } | { modo: 'inactivo' }

export function calcularBotonReintento(urlReintento?: string): BotonReintento {
  if (!urlReintento) return { modo: 'inactivo' }
  const href = sanitizarUrl(urlReintento)
  if (!href) return { modo: 'inactivo' }
  return { modo: 'activo', href }
}
