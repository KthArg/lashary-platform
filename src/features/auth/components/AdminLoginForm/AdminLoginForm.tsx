'use client'

import { useAdminLoginForm } from '../../hooks/useAdminLoginForm'
import { AUTH_BUTTON_TEXTS, AUTH_LABELS } from '../../constants/auth-strings'
import { adminLoginFormStyles as s } from './AdminLoginForm.styles'
import type { AdminLoginFormProps } from './AdminLoginForm.types'

export function AdminLoginForm({ className }: AdminLoginFormProps) {
  const { error, isPending, handleSubmit } = useAdminLoginForm()

  return (
    <form onSubmit={handleSubmit} className={className ?? s.form} noValidate>
      {error && <div role="alert" className={s.alert}>{error}</div>}
      <div className={s.field}>
        <label htmlFor="email" className={s.label}>{AUTH_LABELS.emailInput}</label>
        <input id="email" name="email" type="email" autoComplete="email" required placeholder="admin@lashary.com" className={s.input} />
      </div>
      <div className={s.field}>
        <label htmlFor="password" className={s.label}>{AUTH_LABELS.passwordInput}</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required placeholder="••••••••" className={s.input} />
      </div>
      <button type="submit" disabled={isPending} className={s.submitBtn}>
        {isPending ? <><span className={s.spinner} /><span>{AUTH_BUTTON_TEXTS.adminVerifying}</span></> : <span>{AUTH_BUTTON_TEXTS.adminLogin}</span>}
      </button>
    </form>
  )
}
