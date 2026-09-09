'use client'

import { usePhoneRegistration } from '../../hooks/usePhoneRegistration'
import { AUTH_BUTTON_TEXTS, AUTH_LABELS } from '../../constants/auth-strings'
import { phoneRegistrationModalStyles as s } from './PhoneRegistrationModal.styles'
import type { PhoneRegistrationModalProps } from './PhoneRegistrationModal.types'

export function PhoneRegistrationModal({ isOpen }: PhoneRegistrationModalProps) {
  const { state, formAction, isPending } = usePhoneRegistration()
  if (!isOpen) return null
  return (
    <div className={s.backdrop} role="dialog" aria-modal="true">
      <div className={s.card}>
        <div className={s.header}>
          <h3 className={s.brand}>LASHARY</h3>
          <p className={s.subtitle}>BEAUTY STUDIO</p>
        </div>
        <h2 className={s.title}>{AUTH_LABELS.mandatoryStepTitle}</h2>
        <p className={s.description}>{AUTH_LABELS.mandatoryStepDescription}</p>
        <form action={formAction} className={s.form}>
          <div>
            <label className={s.label} htmlFor="phone-input">{AUTH_LABELS.phoneInput}</label>
            <input id="phone-input" name="phone" type="tel" placeholder="+506 8888 8888" required pattern="[0-9+ ]{8,20}" className={s.input} aria-describedby={state?.error ? 'phone-error' : undefined} autoFocus />
          </div>
          {state?.error && <div id="phone-error" className={s.error} role="alert"><span>{state.error}</span></div>}
          <div className="pt-2">
            <button type="submit" disabled={isPending} className={s.submitBtn}>
              {isPending ? <span className={s.spinner} /> : <span>{AUTH_BUTTON_TEXTS.completeRegistration} &rarr;</span>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
