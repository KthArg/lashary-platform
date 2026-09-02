'use client'

import { useActionState } from 'react'
import { updateClientPhoneAction } from '../actions/phone-actions'
import { AUTH_BUTTON_TEXTS, AUTH_LABELS } from '../constants/auth-strings'

export function PhoneRegistrationModal({ isOpen }: { isOpen: boolean }) {
  const [state, formAction, isPending] = useActionState(async (_prev: any, formData: FormData) => updateClientPhoneAction(formData), null)
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-sm bg-white p-8 sm:p-10 shadow-2xl border border-brand-border/40 text-center animate-in fade-in zoom-in-95 duration-200">
        <div className="mb-6">
          <h3 className="font-serif text-lg tracking-widest-plus uppercase text-brand-gold font-medium">LASHARY</h3>
          <p className="text-3xs tracking-super-wide text-brand-gold-light uppercase mt-0.5">BEAUTY STUDIO</p>
        </div>
        <h2 className="font-serif text-xl text-brand-dark font-normal">{AUTH_LABELS.mandatoryStepTitle}</h2>
        <p className="text-xs text-brand-muted mt-1.5 leading-relaxed">{AUTH_LABELS.mandatoryStepDescription}</p>
        <form action={formAction} className="mt-6 space-y-4 text-left">
          <div>
            <label className="block text-3xs uppercase tracking-wider text-brand-muted mb-1.5 font-medium" htmlFor="phone-input">{AUTH_LABELS.phoneInput}</label>
            <input id="phone-input" name="phone" type="tel" placeholder="+506 8888 8888" required pattern="[0-9+ ]{8,20}" className="w-full bg-brand-cream/40 border border-brand-border text-brand-dark text-xs px-3 py-3 focus:outline-none focus:border-brand-gold transition-colors" aria-describedby={state?.error ? 'phone-error' : undefined} autoFocus />
          </div>
          {state?.error && <div id="phone-error" className="text-xs text-error py-1 font-medium" role="alert"><span>{state.error}</span></div>}
          <div className="pt-2">
            <button type="submit" disabled={isPending} className="w-full bg-brand-dark hover:bg-black text-white text-xs tracking-widest uppercase py-3.5 px-4 flex items-center justify-center gap-2 transition-colors font-medium cursor-pointer">
              {isPending ? <span className="loading loading-spinner loading-xs text-white"></span> : <span>{AUTH_BUTTON_TEXTS.completeRegistration} &rarr;</span>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
