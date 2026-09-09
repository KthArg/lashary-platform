'use client'
import { useState, useTransition } from 'react'
import { signInAdminAction } from '../actions/auth-actions'

export function useAdminLoginForm() {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    const formData = new FormData(event.currentTarget)
    startTransition(async () => {
      const res = await signInAdminAction(formData)
      if (res?.error) setError(res.error)
    })
  }

  return { error, isPending, handleSubmit }
}
