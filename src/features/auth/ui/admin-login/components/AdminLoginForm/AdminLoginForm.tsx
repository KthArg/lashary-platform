'use client'

import { useAdminLoginForm } from '../../hooks/useAdminLoginForm'
import { AUTH_BUTTON_TEXTS, AUTH_LABELS } from '../../../constants/auth-strings'
import { adminLoginFormStyles as STYLES } from './AdminLoginForm.styles'
import type { AdminLoginFormProps } from './AdminLoginForm.types'

export function AdminLoginForm({ className }: AdminLoginFormProps) {
  const { error, isPending, handleSubmit } = useAdminLoginForm()

  return (
    <form onSubmit={handleSubmit} className={className ?? STYLES.form} noValidate>
      {error && <div role="alert" className={STYLES.alert}>{error}</div>}
      <div className={STYLES.field}>
        <label htmlFor="email" className={STYLES.label}>{AUTH_LABELS.emailInput}</label>
        <input id="email" name="email" type="email" autoComplete="email" required placeholder="admin@lashary.com" className={STYLES.input} />
      </div>
      <div className={STYLES.field}>
        <label htmlFor="password" className={STYLES.label}>{AUTH_LABELS.passwordInput}</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required placeholder="••••••••" className={STYLES.input} />
      </div>
      <button type="submit" disabled={isPending} className={STYLES.submitBtn}>
        {isPending ? <><span className={STYLES.spinner} /><span>{AUTH_BUTTON_TEXTS.adminVerifying}</span></> : <span>{AUTH_BUTTON_TEXTS.adminLogin}</span>}
      </button>
    </form>
  )
}
