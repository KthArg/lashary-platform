'use client'

import { usePhoneRegistration } from '../../hooks/usePhoneRegistration'
import { AUTH_BUTTON_TEXTS, AUTH_LABELS } from '../../../constants/auth-strings'
import { phoneRegistrationModalStyles as STYLES } from './PhoneRegistrationModal.styles'
import type { PhoneRegistrationModalProps } from './PhoneRegistrationModal.types'

export function PhoneRegistrationModal({ isOpen }: PhoneRegistrationModalProps) {
  const { state, formAction, isPending } = usePhoneRegistration()
  if (!isOpen) return null
  return (
    <div className={STYLES.backdrop} role="dialog" aria-modal="true">
      <div className={STYLES.card}>
        <div className={STYLES.header}>
          <h3 className={STYLES.brand}>LASHARY</h3>
          <p className={STYLES.subtitle}>BEAUTY STUDIO</p>
        </div>
        <h2 className={STYLES.title}>{AUTH_LABELS.mandatoryStepTitle}</h2>
        <p className={STYLES.description}>{AUTH_LABELS.mandatoryStepDescription}</p>
        <form action={formAction} className={STYLES.form}>
          <div>
            <label className={STYLES.label} htmlFor="phone-input">{AUTH_LABELS.phoneInput}</label>
            <input id="phone-input" name="phone" type="tel" placeholder="+506 8888 8888" required pattern="[0-9+ ]{8,20}" className={STYLES.input} aria-describedby={state?.error ? 'phone-error' : undefined} autoFocus />
          </div>
          {state?.error && <div id="phone-error" className={STYLES.error} role="alert"><span>{state.error}</span></div>}
          <div className="pt-2">
            <button type="submit" disabled={isPending} className={STYLES.submitBtn}>
              {isPending ? <span className={STYLES.spinner} /> : <span>{AUTH_BUTTON_TEXTS.completeRegistration} &rarr;</span>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
