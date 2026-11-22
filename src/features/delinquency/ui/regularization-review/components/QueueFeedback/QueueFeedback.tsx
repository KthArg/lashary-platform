'use client'

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { queueFeedbackStyles as STYLES } from './QueueFeedback.styles'

type Announce = (message: string) => void

const QueueFeedbackContext = createContext<Announce>(() => {})

export function QueueFeedback({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null)
  const announce = useCallback<Announce>((text) => setMessage(text), [])

  return (
    <QueueFeedbackContext.Provider value={announce}>
      <div role="status" aria-live="polite" className={message ? STYLES.alertOk : STYLES.empty}>
        {message && <span>{message}</span>}
      </div>
      {children}
    </QueueFeedbackContext.Provider>
  )
}

export const useQueueFeedback = (): Announce => useContext(QueueFeedbackContext)
