import { useEffect, useRef, useState } from 'react'

export function useMyAppointmentsNotice() {
  const [notice, setNotice] = useState<string | null>(null)
  const noticeRef = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    if (notice) noticeRef.current?.focus()
  }, [notice])

  return { notice, noticeRef, showNotice: setNotice }
}
