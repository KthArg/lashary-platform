'use client'

import { useEffect, useRef } from 'react'

const FOCUSABLE_SELECTOR = [
  'a[href]', 'button:not([disabled])', 'textarea:not([disabled])',
  'input:not([disabled])', 'select:not([disabled])', '[tabindex]:not([tabindex="-1"])',
].join(', ')

/**
 * Confina el foco dentro del contenedor mientras `isActive` (UI-004): sin esto el Tab
 * se escapa del dialogo al resto de la pagina, que queda operable detras del backdrop.
 * NO devuelve el foco al cerrar: eso le toca a quien abrio el dialogo, que es el unico
 * que sabe a que control volver.
 */
export function useFocusTrap<T extends HTMLElement>(isActive: boolean) {
  const containerRef = useRef<T>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!isActive || !container) return

    const focusables = () => Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
    const first = focusables()[0]
    ;(first ?? container).focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return
      const items = focusables()
      if (items.length === 0) return event.preventDefault()

      const edgeForward = items[items.length - 1]
      const edgeBack = items[0]
      const active = document.activeElement
      const escaped = !container.contains(active)

      if (event.shiftKey && (active === edgeBack || escaped)) {
        event.preventDefault()
        edgeForward.focus()
      } else if (!event.shiftKey && (active === edgeForward || escaped)) {
        event.preventDefault()
        edgeBack.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown, true)
    return () => document.removeEventListener('keydown', handleKeyDown, true)
  }, [isActive])

  return containerRef
}
