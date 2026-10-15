'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  approveAppointmentAction,
  rejectAppointmentAction,
} from '../actions/approval-queue-actions'
import type { DecideAppointmentResult } from '../types/approval-queue-action-results'

export function useApprovalQueue() {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [busyAppointmentId, setBusyAppointmentId] = useState<string | null>(null)
  const [rejectingAppointmentId, setRejectingAppointmentId] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const cancelReject = () => {
    setRejectingAppointmentId(null)
    setReason('')
  }

  const decide = (appointmentId: string, action: () => Promise<DecideAppointmentResult>) => {
    setErrorMessage(null)
    setBusyAppointmentId(appointmentId)
    startTransition(async () => {
      const result = await action()
      setBusyAppointmentId(null)
      if (result.ok) cancelReject()
      else setErrorMessage(result.error)
    })
  }

  return {
    busyAppointmentId,
    rejectingAppointmentId,
    reason,
    errorMessage,
    setReason,
    cancelReject,
    approve: (appointmentId: string) => decide(appointmentId, () => approveAppointmentAction(appointmentId)),
    confirmReject: (appointmentId: string) =>
      decide(appointmentId, () => rejectAppointmentAction(appointmentId, reason)),
    startReject: (appointmentId: string) => {
      setErrorMessage(null)
      setReason('')
      setRejectingAppointmentId(appointmentId)
    },
    retry: () => router.refresh(),
  }
}
