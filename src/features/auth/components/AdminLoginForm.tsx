'use client'

import { useState, useTransition } from 'react'
import { signInAdminAction } from '../actions/auth-actions'
import { AUTH_BUTTON_TEXTS, AUTH_LABELS } from '../constants/auth-strings'

export function AdminLoginForm() {
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

  return (
    <form onSubmit={handleSubmit} className="space-y-5 text-left" noValidate>
      {error && <div role="alert" className="p-3 bg-red-50 border border-red-200 text-error text-xs rounded-none">{error}</div>}
      <div className="space-y-1.5">
        <label htmlFor="email" className="block text-2xs uppercase tracking-widest text-brand-muted font-medium">
          {AUTH_LABELS.emailInput}
        </label>
        <input id="email" name="email" type="email" autoComplete="email" required placeholder="admin@lashary.com" className="w-full bg-white border border-brand-border px-3.5 py-2.5 text-sm text-brand-dark placeholder:text-brand-muted/50 focus:outline-none focus:border-brand-gold transition-colors rounded-none" />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="password" className="block text-2xs uppercase tracking-widest text-brand-muted font-medium">
          {AUTH_LABELS.passwordInput}
        </label>
        <input id="password" name="password" type="password" autoComplete="current-password" required placeholder="••••••••" className="w-full bg-white border border-brand-border px-3.5 py-2.5 text-sm text-brand-dark placeholder:text-brand-muted/50 focus:outline-none focus:border-brand-gold transition-colors rounded-none" />
      </div>
      <button type="submit" disabled={isPending} className="w-full bg-brand-dark hover:bg-black text-white text-xs tracking-widest uppercase py-3.5 px-4 font-medium transition-colors flex items-center justify-center gap-2 mt-2 rounded-none">
        {isPending ? <><span className="loading loading-spinner loading-xs"></span><span>{AUTH_BUTTON_TEXTS.adminVerifying}</span></> : <span>{AUTH_BUTTON_TEXTS.adminLogin}</span>}
      </button>
    </form>
  )
}
