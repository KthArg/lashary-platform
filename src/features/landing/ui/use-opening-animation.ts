'use client'

import { useEffect, useRef } from 'react'
import { openingFrame } from './opening-frame'

// Conecta el scroll con `openingFrame`. Con `prefers-reduced-motion: reduce` no se registra nada:
// el CSS del hero muestra texto y foto quietos, uno debajo del otro.
export function useOpeningAnimation() {
  const trackRef = useRef<HTMLDivElement>(null)
  const photoRef = useRef<HTMLDivElement>(null)
  const typeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const track = trackRef.current
    const photo = photoRef.current
    const type = typeRef.current
    if (!track || !photo || !type) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let frame = 0
    const paint = () => {
      frame = 0
      const scrollable = track.offsetHeight - window.innerHeight
      const progress = scrollable > 0 ? -track.getBoundingClientRect().top / scrollable : 0
      const f = openingFrame(progress, window.innerWidth, window.innerHeight)
      photo.style.width = `${f.width}px`
      photo.style.height = `${f.height}px`
      photo.style.transform = `translate(-50%, calc(-50% + ${f.translateY}px))`
      photo.style.borderRadius = `${f.radiusX}% / ${f.radiusY}%`
      type.style.opacity = String(f.typeOpacity)
      type.style.transform = `translateY(${f.typeTranslateY}px)`
      // Un título casi transparente no debe seguir recibiendo clics ni foco visual.
      type.style.pointerEvents = f.typeOpacity < 0.6 ? 'none' : 'auto'
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(paint)
    }

    track.dataset.animated = 'true'
    paint()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])

  return { trackRef, photoRef, typeRef }
}
