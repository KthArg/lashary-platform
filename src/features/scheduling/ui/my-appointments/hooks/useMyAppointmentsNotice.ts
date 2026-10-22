import { useState } from 'react'

export function useMyAppointmentsNotice() {
  const [notice, setNotice] = useState<string | null>(null)
  return { notice, showNotice: setNotice }
}
