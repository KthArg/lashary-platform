'use client'

import { useState, useSyncExternalStore } from 'react'

// Desde este ancho la barra lateral se muestra abierta si nadie la tocó; en un teléfono, cerrada (solo íconos).
export const WIDE_SCREEN_QUERY = '(min-width: 768px)'

// null = «según la pantalla»: hasta que la persona use el botón, el ancho lo deciden las clases responsive, sin
// esperar a que React hidrate (no hay parpadeo en el teléfono). Después manda lo que eligió.
export type SidebarExpansion = boolean | null

export type SidebarMode = 'auto' | 'expanded' | 'collapsed'

export const sidebarMode = (expansion: SidebarExpansion): SidebarMode =>
  expansion === null ? 'auto' : expansion ? 'expanded' : 'collapsed'

function subscribe(onChange: () => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {}
  const query = window.matchMedia(WIDE_SCREEN_QUERY)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

const isWideScreen = (): boolean =>
  typeof window.matchMedia === 'function' ? window.matchMedia(WIDE_SCREEN_QUERY).matches : true

// En el servidor se asume pantalla ancha, como antes: el HTML del servidor y el primer render del cliente coinciden.
const isWideScreenOnServer = (): boolean => true

export function useSidebarExpansion() {
  const [expansion, setExpansion] = useState<SidebarExpansion>(null)
  const wide = useSyncExternalStore(subscribe, isWideScreen, isWideScreenOnServer)
  const isExpanded = expansion ?? wide
  return {
    mode: sidebarMode(expansion),
    isExpanded,
    toggle: () => setExpansion(!isExpanded),
  }
}
