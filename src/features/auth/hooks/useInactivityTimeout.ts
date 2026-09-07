'use client'

import { useEffect, useRef } from 'react'
import { signOutAction } from '../actions/auth-actions'

export interface UseInactivityTimeoutOptions {
  timeoutMs?: number
  checkIntervalMs?: number
  enabled?: boolean
  onTimeout?: () => void | Promise<void>
}

export const DEFAULT_INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000 // 15 minutos de inactividad

export function useInactivityTimeout(options: UseInactivityTimeoutOptions = {}) {
  const {
    timeoutMs = DEFAULT_INACTIVITY_TIMEOUT_MS,
    checkIntervalMs = 30000,
    enabled = true,
    onTimeout,
  } = options

  const lastActivityRef = useRef<number>(Date.now())
  const hasTriggeredRef = useRef<boolean>(false)

  useEffect(() => {
    if (!enabled) return

    const resetActivity = () => {
      lastActivityRef.current = Date.now()
      hasTriggeredRef.current = false
    }

    const events: (keyof WindowEventMap)[] = ['mousemove', 'keydown', 'scroll', 'touchstart', 'click']
    events.forEach((evt) => {
      window.addEventListener(evt, resetActivity, { passive: true })
    })

    const intervalId = setInterval(() => {
      if (hasTriggeredRef.current) return

      const elapsed = Date.now() - lastActivityRef.current
      if (elapsed >= timeoutMs) {
        hasTriggeredRef.current = true
        if (onTimeout) {
          onTimeout()
        } else {
          signOutAction()
        }
      }
    }, checkIntervalMs)

    return () => {
      events.forEach((evt) => {
        window.removeEventListener(evt, resetActivity)
      })
      clearInterval(intervalId)
    }
  }, [enabled, timeoutMs, checkIntervalMs, onTimeout])
}
